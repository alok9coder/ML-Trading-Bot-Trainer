import dayjs from "dayjs";

/**
 * candleFeatureRow = {
 *      // ---- Metadata (NOT ML features)
 *      instrument: "ONGC",
 *      date_iso: "2026-01-15T09:24:00.000Z",   // candle timestamp (ISO)
 *      candle_sequence: 10,                   // 10th candle of the day
 *
 *      // =========================================================
 *      // ---- Raw OHLCV (current candle t)
 *      open_t: 250.30,
 *      high_t: 251.90,
 *      low_t: 249.80,
 *      close_t: 251.40,
 *      volume_t: 184320,
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
 *      vel_t:   1.20,                         // t   vs t-1
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
 *      mean_vel_10: 0.17,
 *
 *      // =========================================================
 *      // ---- Price acceleration (delta of velocity)
 *      // 9 velocities → 8 accelerations
 *      acc_t:   0.40,                         // vel_t  - vel_t1
 *      acc_t1:  1.20,
 *      acc_t2:  0.50,
 *      acc_t3: -0.20,
 *      acc_t4: -0.10,
 *      acc_t5:  0.30,
 *      acc_t6: -0.15,
 *      acc_t7:  0.15,
 *
 *      // ---- Acceleration summary
 *      mean_acc_10: 0.26,
 *
 *      // =========================================================
 *      // ---- Context / normalization helpers
 *      avg_range_5: 3.60,
 *      range_ratio_t: 1.14,                   // range_hl_t / avg_range_5
 *      volume_ratio_t: 1.32,                  // volume_t / avg_volume_5
 *
 *      // =========================================================
 *      // ---- Structural indicator (context only)
 *      donchian_score: 65,                    // 0–100
 *
 *      // =========================================================
 *      // ---- Target label (SUPERVISED LEARNING)
 *      label: 1                               // BUY=1 | HOLD=0 | SELL=-1
 * }
 */

export function ohlcToFeatures(ohlc, date) {
    if (!Array.isArray(ohlc))
        throw new Error(`OHLC data is Invalid!`);
    if (!date)
        throw new Error(`Date provided is Invalid!`);

    const selectedDay = dayjs(date);
    const selectedDateOHLC = ohlc
        .filter(candle =>
            dayjs(candle.timestamp ?? candle.date).isSame(selectedDay, "day")
        )
        .map((candle, i) => ({
            ...candle,
            candleSequence: i + 1 // 1-based index (9:15 candle = 1)
        }));
    
    // CALCULATE THE FEATURES OF THE CANDLE AND THEN BUILD THE FEATURE OBJECT ARRAY
    
}
