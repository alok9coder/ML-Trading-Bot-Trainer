// All Macros and function related variables and constants are defined here.

export const MAX_TOTAL_ORDERS = 3000;
export const MAX_BUY_ORDERS = MAX_TOTAL_ORDERS / 2;
export const MAX_SELL_ORDERS = MAX_BUY_ORDERS;
export const MAX_ORDERS_MINUTE = 200;
export const MAX_ORDERS_SECOND = 10;
export const MAX_AMOUNT_ORDER = 20000000;
export const MAX_ORDER_QTY = 100000;
export const MIS_LEVERAGE = 5;
export const HISTORICAL_FETCH_GAP_MS = 400; // ⏱ 400ms delay to prevent rate-limit
export const HISTORICAL_FETCH_SECOND = 3; // Only 3 Historical Data fetch requested in a minute are allowed!


// BUY, SELL, CANCEL, or MODIFY requests are all counted as an order.
// So, each request as above will increment orders.
export const ORDERS = {
    totalBuyOrders: 0, // No. of BUY orders placed are accumulated here.
    totalSellOrders: 0, // No. of SELL orders placed are accumulated here.
    totalCancelOrders: 0, // No. of CANCEL orders placed are accumulated here.
    totalModifyOrders: 0, // No. of MODIFY orders placed are accumulated here.
    totalOrdersThisSecond: 0, // No. of orders placed in this second.
    totalOrdersThisMinute: 0, // No. of orders placed in this minute.
    orderList: [], // Store orders here.
    totalHistoricalReqThisSecond: 0, // No. of Historical Data fetch requested made to the API in this second.
    lastSecondResetTime: 0, // Last tick time when the order was placed is a Second.
    lastMinuteResetTime: 0, // Last tick time when the order was placed in a Minute.
}

export const DEBUG_LOGS = false; // CHANGE! this value to "false" when DEBUGGING NOT REQUIRED!
export const TEST_MODE = false; // CHANGE! this value to "false" when using it in Production Version!
export const TEST_QTY = 10; // 500 Qty roughly equals to ₹25k worth of Money if 1 share is ₹250.00
export const TEST_INSTRUMENT = "ONGC";

export const HISTORICAL_TEST_MODE = true;

export const SCALP_MODE = false; // CHANGE! this value to false if don't want to start with safety.
export const MICRO_SCALP_MODE = false;

export const AVAILABLE_CASH = {
    value: null,
    get buffer() {
        return this.value === null ? 0 : Math.round((this.value * 0.05) * 100) / 100;
    },
    get tradeAble() {
        return this.value === null ? 0 : Math.round((this.value - this.buffer) * 100) / 100;
    },
    allocatedCash: 0,
    get remainingTradeAble() {
        return this.value === null ? 0 : Math.round((this.tradeAble - this.allocatedCash) * 100) / 100;
    }
};

export const INSTRUMENTS = {
    NSE: {},
}

export const TICK_SYMBOLS = [
    "ADANIPOWER",
    "ADANIPORTS",
    "ADANIENT",
    "ASIANPAINT",
    "AXISBANK",
    "BAJAJ-AUTO",
    "BAJAJFINSV",
    "BAJFINANCE",
    "BHARTIARTL",
    "BPCL",
    "BRITANNIA",
    "CIPLA",
    "COALINDIA",
    "DIVISLAB",
    "DRREDDY",
    "EICHERMOT",
    "GAIL",
    "GOLDBEES",
    "GRASIM",
    "HAL",
    "HCLTECH",
    "HDFCBANK",
    "HEROMOTOCO",
    "HINDALCO",
    "HINDUNILVR",
    "ICICIBANK",
    "INDUSINDBK",
    "INFY",
    "IOC",
    "ITC",
    "JSWSTEEL",
    "KOTAKBANK",
    "LT",
    "M&M",
    "MARUTI",
    "NESTLEIND",
    "NTPC",
    "ONGC",
    "POWERGRID",
    "RELIANCE",
    "SBIN",
    "SBILIFE",
    "SHREECEM",
    "SUNPHARMA",
    "TMPV",
    "TMCV",
    "TATASTEEL",
    "TCS",
    "TECHM",
    "TITAN",
    "ULTRACEMCO",
    "UPL",
    "WIPRO",
];

// Weights that can be modified by the frontend for future updates for tweaking Algorithm.
export const WEIGHTS = {
    trendScoreWt: 0.25,
    bollingerScoreWt: 0.25,
    domScoreWt: 0.25,
    stochRsiScoreWt: 0.25,
};

export const INDICATOR_PERIODS = {
    periodMode: "DYNAMIC", // "STATIC" to use static periods for RSI and StochRSI.
    volatilityPeriod: 10,
    minVolatility: 0.01,
    maxVolatility: 0.5,
    fastPeriod: 20,
    slowPeriod: 60,
    rsiPeriod: 14,
    bollingerStaticPeriod: 20,
    bollingerMultiplier: 2,
    bollingerSmoothing: 2,
    bollingerType: "ema", // "SMA" for Simple Moving Average, "EMA" for Exponential Moving Average.
    stockRsiPeriod: 14,
    adaptivePeriod: 14, // Update function is executed on every tick to update it dynamically.
    minAdaptivePeriod: 7,
    maxAdaptivePeriod: 35,
    smoothPeriod: 2,
    smoothLayerK: "K", // "K" for Single.
    smoothLayerD: "D", // "D" for Double.
    smoothLayerN: "N", // "N" for No layer.
    dayScalpMargin: 75, // 75% of Day's Range.
    dayBuyMargin: 40, // 50% of Day's Range.
    dayBottomMargin: 10, // 10% of Day's Range.
    forceScalpMode: false, // If true forces Scalp Mode to be always true.
};

export const DEFAULT_THRESHOLDS = {
    toggles: {
        // Entry BUY/SELL Functions
        EntryBuy: true,
        EntrySell: true,

        // Exit BUY Functions
        EmergencyBuy: true,
        TrailingSLBuy: true,
        MomentumExitBuy: true,
        VelocityExitBuy: true,
        TemaScalpBuy: true,
        TemaExitBuy: true,

        // Exit SELL Functions
        EmergencySell: true,
        TrailingSLSell: true,
        MomentumExitSell: true,
        VelocityExitSell: true,
        TemaScalpSell: true,
        TemaExitSell: true,
    },
    timeframes: {
        smallCandle: 1,
        largeCandle: 30,
    },
    indicators: {
        ema: false,
        dema: false,
        tema: true,
        
        bollingerBands: false,
        stochasticRsi: false,

        peakValley: false,
    },
    periods: {
        ema: 15,
        dema: 15,
        tema: 35,

        bollingerBands: 14,
        stochasticRsi: 14,
    },
    angles: {
        entryBuyAngle: 60,
        entrySellAngle: -60,

        exitScalpBuyAngle: -15,
        exitScalpSellAngle: 15,

        exitBuyAngle: 30,
        exitSellAngle: -30,
    },
    units: {
        X_UNIT: 1,          // 1 is the interval value for 1-minute.
        Y_UNIT: 0.01,       // 0.01 is 0.01% of roughly the price value.
    },
    price: {
        feed: "OHLCC5",
    },
    priceDerivatives: {
        accelerationMin: -0.01,
        velocityMin: -0.02,
    },
    stochRsiMomentum: {
        minCutoff: 0,
    },
    stopLoss: {
        max: 0.005,
    },
    trailingSL: {
        maxDip: 0.001,
        minProfit: 0.002
    },
    targetProfit: {
        momentumExit: 0.01,
        velocityExit: 0.001,
        temaScalpExit: 0.0005,
    },
    peakValley: {
        velocity: 0.02,
        acceleration: 0.01,
    },
    time: {
        beforeCutoff: "09:20",
        open: "09:15",
        close: "15:30",
        enterMIS: "15:00",
        exitMIS: "15:20",
    },
};

