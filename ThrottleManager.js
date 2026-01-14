// ThrottleManager.js
import { ORDERS, HISTORICAL_FETCH_SECOND } from "./Macros.js";
import dayjs from "dayjs";

export function triggerThrottleTimers() {
    if (!ORDERS._secondResetTimer) {
        ORDERS._secondResetTimer = setTimeout(() => {
            ORDERS.totalOrdersThisSecond = 0;
            ORDERS._secondResetTimer = null;
        }, 1000);
    }

    if (!ORDERS._minuteResetTimer) {
        ORDERS._minuteResetTimer = setTimeout(() => {
            ORDERS.totalOrdersThisMinute = 0;
            ORDERS._minuteResetTimer = null;
        }, 60 * 1000);
    }
}

export async function throttleHistoricalFetch() {
    const now = Date.now();
    const secondBucket = Math.floor(now / 1000);

    // Keep a per-second counter
    if (!ORDERS.lastHistoricalSecond || ORDERS.lastHistoricalSecond !== secondBucket) {
        ORDERS.lastHistoricalSecond = secondBucket;
        ORDERS.totalHistoricalReqThisSecond = 0;
    }

    // Wait if limit reached
    if (ORDERS.totalHistoricalReqThisSecond >= HISTORICAL_FETCH_SECOND) {
        const waitMs = 1000 - (now % 1000);
        if (process.env.DEBUG_LOGS) {
            console.warn(`⏳ Historical fetch throttled — waiting ${waitMs}ms...`);
        }
        await new Promise(res => setTimeout(res, waitMs));
        return throttleHistoricalFetch(); // Re-check after waiting
    }

    ORDERS.totalHistoricalReqThisSecond++;
}


/**
 * Resets order counters based on logical tick progression using simulated time.
 * Should be called with the last trade time (orderTimeMs) and the latest tick time (tickTimeMs).
 * 
 * @param {number} orderTimeMs - The last trade/order time in milliseconds (simulated time).
 * @param {number} tickTimeMs - The latest tick last_trade_time in milliseconds.
 */
export function triggerSimulatedThrottleTimers(orderTimeMs, tickTimeMs) {
    const orderTime = dayjs(new Date(orderTimeMs));
    const tickTime  = dayjs(new Date(tickTimeMs));

    if (ORDERS.totalOrdersThisSecond === 0) {
        ORDERS.lastSecondResetTime = orderTime;
    }

    if (ORDERS.totalOrdersThisMinute === 0) {
        ORDERS.lastMinuteResetTime = orderTime;
    }

    //console.log(`orderTimeMs ${orderTimeMs} tickTimeMs ${tickTimeMs}`);
    //console.log(`orderTime ${orderTimeMs} tickTime ${tickTimeMs}`);

    const diffSecond = tickTime.diff(ORDERS.lastSecondResetTime, "millisecond");
    const diffMinute = tickTime.diff(ORDERS.lastMinuteResetTime, "millisecond");

    //console.log(`Time Difference for Orders in a Second ${diffSecond}ms`);
    //console.log(`Time Difference for Orders in a Minute ${diffMinute}ms`);

    // Reset second counter if one second has passed in simulated time
    if (diffSecond >= 1000) {
        ORDERS.totalOrdersThisSecond = 0;
    }

    // Reset minute counter if one minute has passed in simulated time
    if (diffMinute >= 60000) {
        ORDERS.totalOrdersThisMinute = 0;
    }
}


