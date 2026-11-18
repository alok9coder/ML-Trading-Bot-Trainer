import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import env from "dotenv";
import fs from "node:fs";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";
import { KiteConnect, KiteTicker } from "kiteconnect";
import {
    DEBUG_LOGS,
    INSTRUMENTS,
    OHLC_DATE,
    TARGET_PROFIT,
    CANDLE_START,
} from "./Macros.js"
import { ohlcToFeatures } from "./OHLCToFeatures.js";
import CSVReadWrite from "./CSVReadWrite.js";
import { saveTrainingDatasets } from "./TrainingDataStore.js";

const app  = express();
const port = 8888;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log("Directory Name -> ", __dirname);

env.config();

dayjs.extend(isSameOrBefore);

// Config
const apiKey = process.env.API_KEY;
const apiSecret = process.env.API_SECRET;

// Kite instance (global)
const kc = new KiteConnect({ api_key: apiKey });

const instrumentData = await kc.getInstruments("NSE");

const NSE = {};

// To fetch the trading symbols for all the NSE listed Companies.
instrumentData.filter(
    item => item.exchange === "NSE"
).forEach(
    item => NSE[item.tradingsymbol] = item.instrument_token
);

INSTRUMENTS.NSE = NSE;

console.log(
    Object.keys(INSTRUMENTS.NSE)
        .filter(s => s.startsWith("ONGC"))
);

// HTTPS .key and .cert files
const options = {
    key:  fs.readFileSync("server.key"),
    cert: fs.readFileSync("server.cert"),
};

const server = https.createServer(options, app);

// function token("ONGC"); RETURNS the token of the instrument like "ONGC" in this example.
function token(symbol, exchange = "NSE") {
    const map = INSTRUMENTS?.[exchange];
    const tok = map ? map[symbol] : undefined;
    //if (typeof tok === "number")
    console.log(`Token for Symbol ${symbol} -> ${tok}`);
    return tok;
    //console.warn(`token not found for ${symbol} on ${exchange}`);
    //return undefined;
}

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: {
            maxAge: 1000 * 60 * 60 * 12,
        },
    })
);

app.use(
    express.static(
        path.join(__dirname, "frontend", "dist"),
        { index: false }
    )
);

// To Store Access Token Globally.
let ticker = null;
let accessToken = "";

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: "10mb" }));

// ROOT Route - Serves the foundation to authenticated users
app.get("/", async (req, res) => {
    // If no active session, redirect to login page
    if (!req.session.userID) {
        console.warn("UNAUTHORIZED ACCESS! Redirecting to /login.");
        return res.redirect("/login");
    }

    // Authenticated request
    console.log(`[INFO] Authenticated user: ${req.session.userID}`);

    res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
});

// Serve the Login URL
app.get("/login", (req, res) => {
    // Generate request token manually from login URL
    req.session.loginURL = kc.getLoginURL();
    console.log("Login here: ", req.session.loginURL);
    res.redirect(req.session.loginURL); // Redirect user to Zerodha Login
});

// Zerodha redirects here with? request_token=XXX
app.get("/callback", async (req, res) => {
    const requestToken = req.query.request_token;
    if (!requestToken)
        return res.status(400).send("No request token found!");

    try {
        req.session.SESSION = await kc.generateSession(requestToken, apiSecret);
        console.log("Access Token: ", req.session.SESSION.access_token);

        // Save the access token globally (or better: in DB or cache)
        kc.setAccessToken(req.session.SESSION.access_token);

        // Make accessToken Globally available.
        accessToken = req.session.SESSION.access_token;

        res.send(`
            <h1> Login successful! Access token generated.</h1>
            <h1><strong> Ticker connected!</strong></h1>
            <p> Redirecting in 1 second... </p>
            <script>
                setTimeout(() => {
                    window.location.href = "https://localhost:8888/profile";
                }, 1000);
            </script>
        `);
    } catch (error) {
        console.error("Error generating session: ", error);
        res.status(500).send("Error generating session!");
    }
});

app.get("/profile", async (req, res) => {
    try {
        const profile = await kc.getProfile();

        req.session.userID          = profile.user_id;
        req.session.userName        = profile.user_name;
        req.session.userAvatarImg = profile.avatar_url;
        
        console.log(req.session.userID);
        console.log(req.session.userName);
        console.log(req.session.userAvatarImg);

        res.send(`
            <h1> Your Profile data is fetched!</h1>
            <p>${profile.user_id}</p>
            <p>${profile.user_name}</p>
            <p>${profile.avatar_url}</p>
            <br />
            <img
                src="${profile.avatar_url}" 
                alt="Profile Picture" 
                width=100px
                height=100px
            />
            <br />
            <hr />
            <p> Redirecting in 1 second... </p>
            <script>
                setTimeout(() => {
                    window.location.href = "https://localhost:8888/";
                }, 1000);
            </script>
        `);
    } catch (error) {
        console.error("Error fetching profile data: ", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/instruments", (req, res) => {
    const query = typeof req.query.q === "string" ? req.query.q.trim().toUpperCase() : "";
    if (!query) return res.json({ instruments: [] });

    const instruments = Object.keys(INSTRUMENTS.NSE)
        .filter((instrument) => instrument.includes(query))
        .slice(0, 20);
    res.json({ instruments });
});

// Return independent, initially unlabelled datasets for the labeling workspace.
app.post("/api/ohlc", async (req, res) => {
    const symbol = typeof req.body?.symbol === "string"
        ? req.body.symbol.trim().toUpperCase()
        : "";
    const date = typeof req.body?.date === "string" ? req.body.date : "";

    if (!INSTRUMENTS.NSE[symbol]) {
        return res.status(400).json({ error: "Select a valid NSE instrument." });
    }

    const selectedDate = dayjs(date);
    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !selectedDate.isValid() ||
        selectedDate.format("YYYY-MM-DD") !== date
    ) {
        return res.status(400).json({ error: "Provide a valid trading date in YYYY-MM-DD format." });
    }
    if ([0, 6].includes(selectedDate.day())) {
        return res.status(400).json({ error: "Trading data is only available for weekdays." });
    }

    try {
        const historicalData = await fetchHistoricalData(symbol, selectedDate);
        if (historicalData.length === 0) {
            return res.status(404).json({ error: "No candle data was found for that instrument and date." });
        }
        const candles = ohlcToFeatures(historicalData, selectedDate, symbol);

        res.json({
            candles,
            entryCandles: candles.map((candle) => ({ ...candle, label: 0 })),
            entryTypeCandles: candles.map((candle) => ({ ...candle, label: 0 })),
            exitCandles: candles.map((candle) => ({ ...candle, label: 0 })),
        });
    } catch (error) {
        console.error("Failed to fetch OHLC Data: ", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.put("/api/save-labels", async (req, res) => {
    const symbol = typeof req.body?.symbol === "string"
        ? req.body.symbol.trim().toUpperCase()
        : "";
    const date = typeof req.body?.date === "string" ? req.body.date : "";
    const { entryCandles, entryTypeCandles, exitCandles } = req.body ?? {};

    if (!INSTRUMENTS.NSE[symbol]) {
        return res.status(400).json({ error: "Select a valid NSE instrument." });
    }

    const selectedDate = dayjs(date);
    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !selectedDate.isValid() ||
        selectedDate.format("YYYY-MM-DD") !== date ||
        [0, 6].includes(selectedDate.day())
    ) {
        return res.status(400).json({ error: "Provide a valid weekday in YYYY-MM-DD format." });
    }

    const datasets = { entryCandles, entryTypeCandles, exitCandles };
    const rows = Object.values(datasets);
    if (
        rows.some((dataset) => !Array.isArray(dataset) || dataset.length === 0 || dataset.length > 500) ||
        rows.some((dataset) => dataset.length !== entryCandles.length)
    ) {
        return res.status(400).json({ error: "Provide matching, non-empty candle arrays for all training datasets." });
    }

    for (let index = 0; index < entryCandles.length; index++) {
        const sequence = entryCandles[index]?.candleSequence;
        const entryType = entryTypeCandles[index];
        const exit = exitCandles[index];
        if (
            sequence !== index + 1 ||
            entryType?.candleSequence !== sequence ||
            exit?.candleSequence !== sequence ||
            [entryCandles[index], entryType, exit].some((candle) =>
                !candle || candle.instrument !== symbol || !Number.isFinite(candle.label),
            ) ||
            ![0, 1].includes(entryCandles[index].label) ||
            ![-1, 0, 1].includes(entryType.label) ||
            ![0, 1].includes(exit.label)
        ) {
            return res.status(400).json({ error: "Candle rows or labels are invalid." });
        }
    }

    try {
        const saved = await saveTrainingDatasets(
            path.join(__dirname, "Data"),
            symbol,
            date,
            datasets,
        );
        res.json({ message: "Training labels saved successfully.", saved });
    } catch (error) {
        console.error("Failed to save training labels:", error.message);
        res.status(500).json({ error: "Failed to save training labels." });
    }
});

// Backend API endpoint to create CSV Super Cluster for the Selected Symbol.
app.post("/api/symbol-super-cluster-csv", async (req, res) => {
    const { symbol } = req.body;
    console.log(`Symbol -> ${symbol}`);

    try {
        const result = await createSuperClusterCSV(symbol);
        console.log(result);
        res.status(200).json({ message: result });
    } catch (error) {
        console.error("FAILED to Create Super Cluster CSV: ", error.message);
        res.status(500).json(JSON.stringify({ error }));
    }
});

// Backend API endpoint to create CSV for Selected Trend Entry Candles.
app.post("/api/write-entry-candles", async (req, res) => {
    const { entryCandles } = req.body;

    try {
        console.log("ENTEY CANDLES", JSON.stringify(entryCandles[0], null, "\t"));
    } catch (error) {
        console.error(`Error Writing ENTRY Candles! ${error.message}`);
    }
});

// Backend API endpoint to create CSV for Selected Trend Exit Candles.
app.post("/api/write-exit-candles", async (req, res) => {
    const { exitCandles } = req.body;

    try {
        console.log("EXIT CANDLES", JSON.stringify(exitCandles[0], null, "\t"));
    } catch (error) {
        console.error(`Error Writing EXIT Candles! ${error.message}`);
    }
});

server.listen(port, (req, res) => {
    console.log(`HTTPS Server is Listening on port: ${port}`);
});

async function createSuperClusterCSV(symbol) {
    const startDate = OHLC_DATE;
    const today = dayjs();
    let day = dayjs(startDate);

    const MAX_RETRIES_PER_DAY = 3;

    const entrySuperCluster = [];
    const entryTypeSuperCluster = [];
    const exitSuperCluster = [];

    console.log(`Started fetching data and creating Super Clusters for ${symbol} since ${startDate}`);

    while (day.isSameOrBefore(today)) {
        try {
            console.log("Processing date:", day.format("YYYY-MM-DD"));

            let ohlc = await fetchHistoricalData(symbol, day);
            if ([0, 6].includes(day.day()) || ohlc.length === 0) {
                day = day.add(1, "day");
                continue;
            }
            ohlc = ohlcToFeatures(ohlc, day, symbol);
            const entryCluster = await writeEntryCandles(structuredClone(ohlc));
            const entryTypeCluster = await writeEntryTypeCandles(structuredClone(ohlc));
            const exitCluster = await writeExitCandles(structuredClone(ohlc));

            entrySuperCluster.push(...entryCluster);
            entryTypeSuperCluster.push(...entryTypeCluster);
            exitSuperCluster.push(...exitCluster);
            day = day.add(1, "day");
        } catch (error) {
            console.error(`Error Fetching Historical Data and Creating Super Clusters! ${error.message}`);
        }
    }
    
    try {
        const dataFolder = "Data";

        const entryFilePath = path.join(__dirname, dataFolder, `${symbol}_Entry.csv`);
        const entryTypeFilePath = path.join(__dirname, dataFolder, `${symbol}_Entry_Type.csv`);
        const exitFilePath = path.join(__dirname, dataFolder, `${symbol}_Exit.csv`);

        const entryCSV = new CSVReadWrite(entryFilePath);
        const entryTypeCSV = new CSVReadWrite(entryTypeFilePath);
        const exitCSV = new CSVReadWrite(exitFilePath);

        entryCSV.appendCSV(entrySuperCluster, entryFilePath);
        entryTypeCSV.appendCSV(entryTypeSuperCluster, entryTypeFilePath);
        exitCSV.appendCSV(exitSuperCluster, exitFilePath);

        console.log("Writing Super Clusters to CSV Files Successful!");
        return ("Writing Super Clusters to CSV Files Successful!");
    } catch (error) {
        console.error(`Error Writing to Super Clusters to CSV Files! ${error.message}`);
    }

    return ("Something when Writing Super Clusters to CSV, Didn't go right!");
}

async function fetchHistoricalData(symbol, date, days = 3, interval = "minute") {
    let historicalData = [];
    const MAX_RETRIES = 5;

    console.log(`Symbol -> ${symbol}`);
    let fromDate    = dayjs(date);
    let toDate      = dayjs(date);

    for (let i = 0, validDays = 0; validDays < days; i++) {
        fromDate = fromDate.subtract(1, "day");

        if (([0, 6]).includes(fromDate.day()))
            continue;

        validDays++
    }

    const from  = fromDate.format("YYYY-MM-DD");
    const to = toDate.format("YYYY-MM-DD");

    for (let retries = 0; retries < MAX_RETRIES; retries++) {
        try {
            historicalData = await kc.getHistoricalData(
                token(symbol),
                interval,
                from,
                to,
                false,
                false,
            );

            if (historicalData.length) {
                console.log(`📊 Historical sample for ${symbol.toUpperCase()}: ${JSON.stringify(historicalData[0])}`);
                break;
            } else {
                console.warn(`⚠️ No historical data received for ${symbol}, retrying... (${retries + 1})`);
            }
        } catch (error) {
            console.error(`🔁 Retry ${retries + 1} for ${symbol} - Error: ${error.message ?? error}`);
        }
    }

    const candles = historicalData?.candles ?? historicalData ?? [];
    //console.log(`Candles _> ${JSON.stringify(candles[0])}`);

    return candles ?? [];
}

async function writeEntryCandles(ohlc) {
    
    const targetProfit = TARGET_PROFIT;

    let entryPrice = null;
    let exitPrice = null;

    let entered = false;

    let trend = null;

    const len = ohlc.length;

    for (let i = 0; i < len - 2; i++) {
        if (ohlc[i].candleSequence < CANDLE_START) continue;
        entered = false;
        entryPrice = ohlc[i + 1].open;
        //console.log("i_0", i);
        trend = ohlc[i].candleColor;
        exitPrice = trend === "GREEN"
            ? ohlc[i].high
            : (trend === "RED"
                ? ohlc[i].low
                : ohlc[i].close
            );
        
        for (let j = i + 1; j < len - 1; j++) {
            exitPrice = trend === "GREEN"
                ? Math.max(exitPrice, ohlc[j].high)
                : (trend === "RED"
                    ? Math.min(exitPrice, ohlc[j].low)
                    : ohlc[j]
                )
            const priceDiff = (exitPrice - entryPrice) / entryPrice * 100;
            if (
                ohlc[i].candleColor !== ohlc[j].candleColor &&
                priceDiff >= targetProfit &&
                ohlc[i].candleColor === "GREEN" &&
                !entered
            ) {
                entered = true;
                ohlc[i].label = 1;
                ohlc[i + 1].label = 1;
                i = j - 1;
                //console.log("i_1 G", i, "j", j);
                break;
            } else if (
                ohlc[i].candleColor !== ohlc[j].candleColor &&
                priceDiff <= -targetProfit &&
                ohlc[i].candleColor === "RED" &&
                !entered
            ) {
                entered = true;
                ohlc[i].label = 1;
                ohlc[i + 1].label = 1;
                i = j - 1 ;
                //console.log("i_1 R", i, "j", j);
                break;
            }
        } //console.log("i_2", i);
    }

    return ohlc;
}

async function writeEntryTypeCandles(ohlc) {

    const targetProfit = TARGET_PROFIT;

    let entryPrice = null;
    let exitPrice = null;

    let entered = false;

    let trend = null;

    const len = ohlc.length;

    for (let i = 0; i < len - 2; i++) {
        if (ohlc[i].candleSequence < CANDLE_START) continue;
        entered = false;
        entryPrice = ohlc[i + 1].open;
        //console.log("i_0", i);
        trend = ohlc[i].candleColor;
        exitPrice = trend === "GREEN"
            ? ohlc[i].high
            : (trend === "RED"
                ? ohlc[i].low
                : ohlc[i].close
            );
        
        for (let j = i + 1; j < len - 1; j++) {
            exitPrice = trend === "GREEN"
                ? Math.max(exitPrice, ohlc[j].high)
                : (trend === "RED"
                    ? Math.min(exitPrice, ohlc[j].low)
                    : ohlc[j]
                )
            const priceDiff = (exitPrice - entryPrice) / entryPrice * 100;
            if (
                ohlc[i].candleColor !== ohlc[j].candleColor &&
                priceDiff >= targetProfit &&
                ohlc[i].candleColor === "GREEN" &&
                !entered
            ) {
                entered = true;
                ohlc[i].label = 1;
                ohlc[i + 1].label = 1;
                i = j - 1;
                //console.log("i_1 G", i, "j", j);
                break;
            } else if (
                ohlc[i].candleColor !== ohlc[j].candleColor &&
                priceDiff <= -targetProfit &&
                ohlc[i].candleColor === "RED" &&
                !entered
            ) {
                entered = true;
                ohlc[i].label = -1;
                ohlc[i + 1].label = -1;
                i = j - 1 ;
                //console.log("i_1 R", i, "j", j);
                break;
            }
        } //console.log("i_2", i);
    }

    ohlc = ohlc.filter(c => c.label !== 0);

    return ohlc;
}

async function writeExitCandles(ohlc) {
    const targetProfit = TARGET_PROFIT;

    let entryPrice = null;
    let exitPrice = null;

    let entered = false;

    let trend = null;

    const len = ohlc.length;

    for (let i = 0; i < len - 2; i++) {
        if (ohlc[i].candleSequence < CANDLE_START) continue;
        entered = false;
        entryPrice = ohlc[i + 1].open;
        //console.log("i_0", i);
        trend = ohlc[i].candleColor;
        exitPrice = trend === "GREEN"
            ? ohlc[i].high
            : (trend === "RED"
                ? ohlc[i].low
                : ohlc[i].close
            );
        
        for (let j = i + 1; j < len - 1; j++) {
            exitPrice = trend === "GREEN"
                ? Math.max(exitPrice, ohlc[j].high)
                : (trend === "RED"
                    ? Math.min(exitPrice, ohlc[j].low)
                    : ohlc[j]
                )
            const priceDiff = (exitPrice - entryPrice) / entryPrice * 100;
            if (
                ohlc[i].candleColor !== ohlc[j].candleColor &&
                priceDiff >= targetProfit &&
                ohlc[i].candleColor === "GREEN" &&
                !entered
            ) {
                entered = true;
                ohlc[j].label = 1;
                ohlc[j + 1].label = 1;
                i = j - 1;
                //console.log("i_1 G", i, "j", j);
                break;
            } else if (
                ohlc[i].candleColor !== ohlc[j].candleColor &&
                priceDiff <= -targetProfit &&
                ohlc[i].candleColor === "RED" &&
                !entered
            ) {
                entered = true;
                ohlc[j].label = 1;
                ohlc[j + 1].label = 1;
                i = j - 1 ;
                //console.log("i_1 R", i, "j", j);
                break;
            }
        } //console.log("i_2", i);
    }

    //ohlc = ohlc.filter(c => c.label !== 0);

    return ohlc;
}

/*
async function writeEntryCandles__(ohlc) {
    
    const targetProfit = TARGET_PROFIT;

    let entryPrice = null;
    let exitPrice = null;

    let entered = false;

    let trend = null;

    const len = ohlc.length;

    for (let i = 0; i < len - 2; i++) {
        if (ohlc[i].candleSequence < CANDLE_START) continue;
        entered = false;
        entryPrice = ohlc[i + 1].open;
        //console.log("i_0", i);
        trend = ohlc[i].candleColor;
        exitPrice = trend === "GREEN"
            ? ohlc[i].high
            : (trend === "RED"
                ? ohlc[i].low
                : ohlc[i].close
            );
        
        let dipCount = 0;
        let colorFlip = false;
        
        for (let j = i + 1; j < len - 1; j++) {
            exitPrice = trend === "GREEN"
                ? Math.max(exitPrice, ohlc[j].high)
                : (trend === "RED"
                    ? Math.min(exitPrice, ohlc[j].low)
                    : ohlc[j]
                )
            const priceDiff = (exitPrice - entryPrice) / entryPrice * 100;

            if (
                ohlc[i].candleColor !== ohlc[j].candleColor &&
                colorFlip === false
            ) {
                colorFlip = true;
                dipCount++;
            } else if (
                ohlc[i].candleColor === ohlc[j].candleColor &&
                colorFlip === true
            ) {
                colorFlip = false;
            }

            if (dipCount > 2) {
                if (
                    priceDiff >= targetProfit &&
                    ohlc[i].candleColor === "GREEN" &&
                    !entered
                ) {
                    entered = true;
                    ohlc[i].label = 1;
                    //ohlc[i + 1].label = 1;
                    i = j - 1;
                    break
                } else if (
                    priceDiff <= -targetProfit &&
                    ohlc[i].candleColor === "RED" &&
                    !entered
                ) {
                    entered = true;
                    ohlc[i].label = 1;
                    //ohlc[i + 1].label = 1;
                    i = j - 1;
                    break;
                } else {
                    break;
                }
            }
        } //console.log("i_2", i);
    }

    return ohlc;
}
*/
