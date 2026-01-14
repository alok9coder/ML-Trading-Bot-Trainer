import dayjs from "dayjs";
import { throttleHistoricalFetch } from "./ThrottleManager.js";
import { DEBUG_LOGS } from "./Macros.js";

/**
 * Fetches 1-minute historical data for a specific instrument and date.
 * @param {KiteConnect} kc - KiteConnect instance
 * @param {string} symbol - The trading symbol (e.g., "TATAMOTORS")
 * @param {number} instrumentToken - The instrument token for the symbol
 * @param {string} dateStr - Date in "YYYY-MM-DD" format
 * @param {string} interval - Candle interval (default "minute")
 * @returns {Promise<Array>} Array of normalized candles or null if fetch fails
 */
export default async function fetchHistoricalDataForDate(
    kc,
    symbol,
    instrumentToken,
    dateStr,
    interval = "minute"
) {
    try {
        await throttleHistoricalFetch(); // ✅ Global/sec limit

        const token = Number(instrumentToken);
        if (!Number.isFinite(token)) throw new Error(`Invalid instrumentToken: ${instrumentToken}`);

        // Build IST times
        const fromIst = dayjs(`${dateStr} 09:15:00`); 
        const toIst   = dayjs(`${dateStr} 15:30:00`);

        // Convert IST → UTC (+5:30 offset)
        const fromUtc = fromIst.add(5, "hour").add(30, "minute").toDate();
        const toUtc   = toIst.add(5, "hour").add(30, "minute").toDate();

        if (DEBUG_LOGS) console.log(
            `🕰️ ${symbol}: UTC: ${fromUtc.toISOString()} → ${toUtc.toISOString()} |  IST: ${fromIst.format("YYYY-MM-DD HH:mm")} → ${toIst.format("HH:mm")} (${interval})`
        );

        // Request historical candles
        const res = await kc.getHistoricalData(token, interval, fromUtc, toUtc, false, false);

        const rows = Array.isArray(res?.candles) ? res.candles : Array.isArray(res) ? res : [];
        if (!rows.length) {
            console.warn(`⚠️ No candles returned for ${symbol} on ${dateStr}`);
            return null;
        }

        // Normalize output
        return rows.map(r =>
            Array.isArray(r)
                ? { timestamp: r[0], open: r[1], high: r[2], low: r[3], close: r[4], volume: r[5] }
                : { timestamp: r?.date ?? r?.timestamp, open: r?.open, high: r?.high, low: r?.low, close: r?.close, volume: r?.volume ?? r?.volume_traded }
        );
    } catch (err) {
        console.error(`❌ Failed to fetch historical data for ${symbol} on ${dateStr}:`, err?.message || err);
        return null;
    }
}
