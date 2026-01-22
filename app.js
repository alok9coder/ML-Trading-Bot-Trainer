import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import env from "dotenv";
import fs from "node:fs";
import dayjs from "dayjs";
import { KiteConnect, KiteTicker } from "kiteconnect";
import { DEBUG_LOGS, INSTRUMENTS } from "./Macros.js"
import { ohlcToFeatures } from "./OHLCToFeatures.js";
import CSVReadWrite from "./CSVReadWrite.js";
import { homepage } from "./HomePageString.js";

const app  = express();
const port = 8888;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log("Directory Name -> ", __dirname);

env.config();

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
app.use(bodyParser.json());

// ROOT Route - Serves the foundation to authenticated users
app.get("/", async (req, res) => {
    // If no active session, redirect to login page
    if (!req.session.userID) {
        console.warn("UNAUTHORIZED ACCESS! Redirecting to /login.");
        return res.redirect("/login");
    }

    // Authenticated request
    console.log(`[INFO] Authenticated user: ${req.session.userID}`);

    // Serve React frontend (or static HTML/SPA)
    res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
    //res.send(homepage);
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

// Backend API endpoint to return return OHLC for the requested Date
app.post("/api/ohlc", async (req, res) => {
    console.log(req);
    const { symbol, date } = req.body;
    console.log(`Symbol -> ${symbol} | Date -> ${date}`);
    
    try {
        let ohlc = await fetchHistoricalData(symbol, date);
        ohlc = ohlcToFeatures(ohlc, date, symbol);
        console.log(`ohlc -> ${JSON.stringify(ohlc[0], null, "\t")}`);
        res.json(ohlc);
        //res.json({ response: "WORKING!" });
    } catch (error) {
        console.error("Failed to fetch OHLC Data: ", error);
        res.status(500).json({ error });
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

async function fetchHistoricalData(symbol, date, days = 3, interval = "minute") {
    let ohlc = [];
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

}

async function writeExitCandles(ohlc) {
    
}

