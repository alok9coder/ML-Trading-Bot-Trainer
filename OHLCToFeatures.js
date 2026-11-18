import dayjs from "dayjs";
import { calculateMeanVelAcc } from "./PriceDynamics.js";
import { calculateAvgTrueRange } from "./AvgTrueRange.js";
import { getDonchianScore } from "./DonchianChannel.js";
import { getBollingerScore } from "./BollingerBands.js";

/**
 * candleFeatureRow = {
 *      // ---- Metadata (NOT ML features)
 *      instrument: "ONGC",
 *      date_iso: "2026-01-15T09:24:00.000Z",   // candle timestamp (ISO)
 *      candle_color: "GREEN",                  // just for reference
 *
 *      // =========================================================
 *      // ---- ML Features DOWN Below =============================
 *      candle_sequence: 10,                   // 10th candle of the day
 *
 *      // =========================================================
 *      // ---- Raw OHLCV (current candle t)
 *      open: 250.30,
 *      high: 251.90,
 *      low: 249.80,
 *      close: 251.40,
 *      volume: 184320,
 *
 *      // ---- Candle geometry (t)
 *      range_hl_t: 2.10,                      // high_t - low_t
 *      body_oc_t: 1.10,                       // close_t - open_t
 *      upper_wick_t: 0.50,                    // high_t - max(open_t, close_t)
 *      lower_wick_t: 0.50,                    // min(open_t, close_t) - low_t
 *
 *      // =========================================================
 *      // ---- Price velocity (% change, close-based)
 *      // 10 candles → 9 velocities
 *      vel_t0:  1.20,                         // t-0 vs t-1
 *      vel_t1:  0.80,                         // t-1 vs t-2
 *      vel_t2: -0.40,
 *      vel_t3: -0.90,
 *      vel_t4:  0.30,
 *      vel_t5:  0.10,
 *      vel_t6: -0.20,
 *      vel_t7:  0.05,
 *      vel_t8: -0.10,
 *
 *      // ---- Velocity summary
 *      mean_vel: 0.17,
 *
 *      // =========================================================
 *      // ---- Price acceleration (delta of velocity)
 *      // 9 velocities → 8 accelerations
 *      acc_t0:  0.40,                         // vel_t0  - vel_t1
 *      acc_t1:  1.20,
 *      acc_t2:  0.50,
 *      acc_t3: -0.20,
 *      acc_t4: -0.10,
 *      acc_t5:  0.30,
 *      acc_t6: -0.15,
 *      acc_t7:  0.15,
 *
 *      // ---- Acceleration summary
 *      mean_acc: 0.26,
 *
 *      // =========================================================
 *      // ---- Context / normalization helpers
 *      avg_range_5: 3.60,
 *      range_ratio_t: 1.14,                   // range_hl_t / avg_range_5
 *      volume_ratio_t: 1.32,                  // volume_t / avg_volume_5
 *
 *      // =========================================================
 *      // ---- Structural indicator (Donchian Channel)
 *      donchian_score: 65,                    // Directional position (%)
 *                                           // +ve → above middle band
 *                                           // -ve → below middle band
 *
 *      donchian_width: 3.42,                  // (upper - lower) / middle * 100
 *                                           // Measures range compression / expansion
 *
 *      donchian_width_delta_5: -0.80,         // Width change vs t-5
 *                                           // -ve → squeezing
 *                                           // +ve → expanding
 *
 *      donchian_width_delta_10: -1.45,        // Width change vs t-10
 *                                           // Medium-term regime shift
 *
 *      donchian_score_trend: 180,             // Sum of last 5 Donchian scores
 *                                           // Directional persistence / acceptance
 *
 *      // =========================================================
 *      // ---- Target label (SUPERVISED LEARNING)
 *      label: 1                               // BUY=1 | HOLD=0 | SELL=-1
 * }
**/

export function ohlcToFeatures(ohlc, date, symbol) {
    if (!Array.isArray(ohlc))
        throw new Error(`OHLC data is Invalid!`);
    if (ohlc.length === 0)
        throw new Error(`OHLC array received is Empty!`);
    if (!date)
        throw new Error(`Date provided is Invalid!`);

    const selectedDay = dayjs(date);
    //console.log(`Selected Day =>>> ${selectedDay}`);
    //console.log(`OHLC Received ===> ${JSON.stringify(ohlc[0])}`);

    const selectedDayOHLC = ohlc.filter(
        (candle) =>
            dayjs(candle.timestamp ?? candle.date).isSame(selectedDay, "day")
    );
    //console.log(`SELECTED Day OHLC -> ${JSON.stringify(selectedDayOHLC[0])}`);
    
    const selectedDateOHLC = selectedDayOHLC.map(
        (candle, i) => ({
            candleColor: (
                candle.close > candle.open ?
                    "GREEN" :
                    (
                        candle.close < candle.open ?
                            "RED" :
                            "DOJI"
                    )
            ),
            ...candle,
            candleSequence: i + 1, // 1-based index (9:15 candle = 1)
        })
    );
    console.log(`SELECTED Date OHLC -> ${JSON.stringify(selectedDateOHLC[0])}`);

    const previousDayOHLC = ohlc.filter(
        (candle) =>
            dayjs(candle.timestamp ?? candle.date).isBefore(selectedDay, "day")
    )
    console.log(`PREVIOUS Day OHLC -> ${JSON.stringify(previousDayOHLC[0])}`);
    
    const previousDateOHLC = previousDayOHLC.map(
        (candle, i) => ({
            candleColor: (
                candle.close > candle.open ?
                    "GREEN" :
                    (
                        candle.close < candle.open ?
                            "RED" :
                            "DOJI"
                    )
            ),
            ...candle,
            candleSequence: i - previousDayOHLC.length, // gives -ve index for previous day candles
        })
    );
    //console.log(`PREVIOUS Date OHLC -> ${JSON.stringify(previousDateOHLC[0])}`);
    
    // CALCULATE THE FEATURES OF THE CANDLE AND THEN BUILD THE FEATURE OBJECT ARRAY
    // velocity, acceleration, mean_velocity, mean_acceleration -> calculateMeanVelAcc()
    // avg_range -> calculateAvgTrueRange()
    // donchian_score -> getDonchianScore()
    // After calculating all, map all of this into selectedDateOHLC again!

    const minLookBack = 100;
    const prevCandles = previousDateOHLC.slice(-minLookBack);
    const seedLength = prevCandles.length;
    const fusedCandles = prevCandles.concat(selectedDateOHLC);

    for (let i = 0; i < selectedDateOHLC.length; i++) {
        const slice = fusedCandles.slice(0, i + 1 + seedLength);
        const candle = selectedDateOHLC[i];
        const prevCandle = i === 0 ?
            candle :
            selectedDateOHLC[i - 1];

        const {
            velocity,
            acceleration,
            avgVelocity,
            avgAcceleration,
        } = calculateMeanVelAcc(slice);

        const {
            avgRange,
            avgVolume,
        } = calculateAvgTrueRange(slice);

        const {
            bollingerScore,
            bollingerWidth,
            bbWidthDeltas,
            bbWidthDelta5,
        } = getBollingerScore(slice);

        const D_60 = getDonchianScore(slice, 60);
        const donchianScore60 = D_60.donchianScore;
        const donchianWidth60 = D_60.donchianWidth;

        const {
            donchianScoreTrend,
            donchianWidthDelta5,
            donchianWidthDelta10,
            donchianWidth,
            donchianScore,
        } = getDonchianScore(slice);

        // MAP the data to the selectedDateOHLC Array.
        // Expand the OHLC object to the various features it should have.
        const featureRow = {
            ...selectedDateOHLC[i],
            
            // Calculated Derivative Features being added below.
            mean_vel: avgVelocity,
            mean_acc: avgAcceleration,
            avg_range: avgRange,
            avg_volume: avgVolume,

            donchian_score: donchianScore,
            donchian_width: donchianWidth,
            donchian_width_delta_5: donchianWidthDelta5,
            donchian_width_delta_10: donchianWidthDelta10,
            donchian_score_trend: donchianScoreTrend,

            donchian_score_60: donchianScore60,
            donchian_width_60: donchianWidth60,

            bollinger_score: bollingerScore,
            bollinger_width: bollingerWidth,
            bollinger_width_delta_5: bbWidthDelta5,
            
            // Some other features directly calculating and appending here.
            // ---- Candle geometry (t0)
            range_hl_t: candle.high - candle.low,
            body_oc_t: candle.close - candle.open,
            upper_wick_t: candle.high - Math.max(candle.open, candle.close),
            lower_wick_t: Math.min(candle.open, candle.close) - candle.low,

            body_oc_t1: prevCandle.close - prevCandle.open,

            // ---- Normalization helpers (t0)
            range_ratio_t: (candle.high - candle.low) / avgRange,
            volume_ratio_t: candle.volume / avgVolume,
        }

        for (let j = 0; j < velocity.length; j++) {
            featureRow[`vel_t${j}`] = velocity[velocity.length - 1 - j];
        }

        for (let j = 0; j < acceleration.length; j++) {
            featureRow[`acc_t${j}`] = acceleration[acceleration.length - 1 - j];
        }

        for (let j = 0; j < bbWidthDeltas.length; j++) {
            featureRow[`bb_width_delta_t${j}`] = bbWidthDeltas[j];
        }

        selectedDateOHLC[i] = {
            instrument: symbol,
            ...featureRow,
            // Target Label (SUPERVISED LEARNING)
            label: 0,       // BUY=1 | HOLD=0 | SELL=-1
        };
    }
    //console.log(`Finalized OHLC -> ${JSON.stringify(selectedDateOHLC[0], null, "\t")}`);

    return selectedDateOHLC;
}
