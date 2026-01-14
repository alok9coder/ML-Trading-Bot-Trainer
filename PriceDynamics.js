import { DEBUG_LOGS } from "./Macros.js";

/**
 * Smooths a series of { value, timestamp } objects using a simple moving average (SMA)
 * 
 * @param {{ value: number, timestamp: string | null }[]} data - The input series to smooth
 * @param {number} period - Number of periods to use for smoothing (e.g., 2 for a 2-period SMA)
 * @returns {{ value: number, timestamp: string | null }[]} - Smoothed series with preserved timestamps
 */

function roundToTwo(number) {
    return Math.round(number * 100) / 100;
}

function smoothSeries(data, period = 2) {
    const result = [];
    for (let i = 0; i <= data.length - period; i++) {
        const window = data.slice(i, i + period).map(v => v.value);
        const avg = window.reduce((a, b) => a + b, 0) / period;
        result.push({
            value: roundToTwo(avg),
            timestamp: data[i + period - 1].timestamp ?? null,
        });
    }
    return result;
}

/**
 * Calculates normalized velocity and acceleration from a price series with timestamps
 * Velocity is the % change in price from previous, and acceleration is the derivative of that
 * Both are smoothed using a moving average
 * 
 * @param {{ value: number, timestamp: string | null }[]} prices - Array of prices with timestamps
 * @returns {{
 *   normalizedVelocity: { value: number, timestamp: string | null }[],
 *   normalizedAcceleration: { value: number, timestamp: string | null }[]
 * }}
 */

export function calculatePriceDerivatives(prices) {
    if (!Array.isArray(prices) || prices.length < 3) {
        return {
            normalizedVelocity: [],
            normalizedAcceleration: []
        };
    }
    
    const rawNormalizedVelocity = [];

    // Step 1: Calculate raw normalized velocity
    for (let i = 1; i < prices.length; i++) {
        const v = prices[i].value - prices[i - 1].value;

        const nv = prices[i - 1].value !== 0 ? (v / prices[i - 1].value) * 100 * 100 : 0;
        rawNormalizedVelocity.push({
            value: nv,
            timestamp: prices[i].timestamp ?? null,
        });
    }

    // Step 2: Smooth normalized velocity
    const normalizedVelocity = smoothSeries(rawNormalizedVelocity, 2); // use 2

    // Step 3: Calculate acceleration from smoothed normalized velocity
    const normalizedAcceleration = [];
    for (let i = 1; i < normalizedVelocity.length; i++) {
        normalizedAcceleration.push({
            value: roundToTwo(normalizedVelocity[i].value - normalizedVelocity[i - 1].value),
            timestamp: normalizedVelocity[i].timestamp ?? null,
        });
    }

    // Step 4: Return with your expected param names
    if (DEBUG_LOGS) {
        console.log(`🚀 Smoothed Velocity: ${normalizedVelocity.at(-1).value} | Timestamp: ${normalizedVelocity.at(-1).timestamp}`);
        console.log(`💥 Smoothed Acceleration: ${normalizedAcceleration.at(-1).value} | Timestamp: ${normalizedAcceleration.at(-1).timestamp}`);
    }

    return {
        normalizedVelocity,         // smoothed % changes
        normalizedAcceleration      // smoothed derivative of % changes
    };
}
