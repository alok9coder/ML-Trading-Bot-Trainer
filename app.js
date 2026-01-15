import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import https from "https";
import env from "dotenv";
import fs from "node:fs";
import { KiteConnect, KiteTicker } from "kiteconnect";
import { DEBUG_LOG, INSTRUMENTS } from "./Macros.js"

const app  = express();
const port = 8888;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log("Directory Name -> ", __dirname);

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

env.config();

// HTTPS .key and .cert files
const options = {
    key: fs.readFileSync("server.key"),
    cert: fs.readFileSync("server.cert"),
};

const server = https.createServer(options, app);

// function token("ONGC"); RETURNS the token of the instrument like "ONGC" in this example.
function token(symbol, exchange = "NSE") {
    const map = INSTRUMENTS?.[exchange];
    const tok = map ? map[symbol] : undefined;
    if (typeof tok === "number") return tok;
    console.warn(`token not found for ${symbol} on ${exchange}`);
    return undefined;
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
});

// Backend API endpoint to return return OHLC for the requested Date
app.post("/api/ohlc", async (req, res) => {
    const { symbol, date } = req.body;
    
    try {

    } catch (error) {
        console.error("Failed to fetch OHLC Data: ", error);
        res.status(500).json({ error });
    }
});





server.listen(port, (req, res) => {
    console.log(`HTTPS Server is Listening on port: ${port}`);
});
