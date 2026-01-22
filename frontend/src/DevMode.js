import { CANDLES as BASE_CANDLES } from "./Candles.js";

export const DEV_MODE = true;

export const candles = (() => {
    const result = [...BASE_CANDLES];

    while (result.length < 375) {
        const last = result[result.length - 1];
        const nextPrice = last.close + (Math.random() - 0.5) * 0.3;

        result.push({
            timestamp: new Date(
                new Date(last.timestamp).getTime() + 60_000
            ).toISOString(),
            open: last.close,
            high: Math.max(last.close, nextPrice) + 0.15,
            low: Math.min(last.close, nextPrice) - 0.15,
            close: nextPrice,
            volume: 120000 + Math.floor(Math.random() * 50000),
            label: 0,
        });
    }

    return result;
})();
