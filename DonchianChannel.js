export function calculateDonchianChannel(series, period = 20) {
    if (!Array.isArray(series) || series.length < period) {
        throw new Error(`Not enough candles for Donchian Calculation. Need ${period}, got ${series?.length || 0}`);
    }

    // Extracts only last period length candles.
    const slice = series.slice(-period);

    let upperBand   = null;
    let middleBand  = null;
    let lowerBand   = null;
    
    for (let i = 0; i < slice.length; i++) {
        upperBand = upperBand === null ?
            slice[i].high :
            (slice[i].high > upperBand ?
                slice[i].high :
                upperBand
            );
        
        lowerBand = lowerBand === null ?
            slice[i].low :
            (slice[i].low < lowerBand ?
                slice[i].low :
                lowerBand
            )
        
        middleBand = (upperBand + lowerBand) / 2;
    }

    return {
        upperBand,
        middleBand,
        lowerBand,
        candleSequence: slice[slice.length - 1].candleSequence,
    }
}

export function getDonchianScore(series, period = 20) {
    if (!Array.isArray(series) || series.length < period) {
        throw new Error(`Not enough candles for Donchian calculation. Need ${period}, got ${series?.length || 0}`);
    }

    const {
        upperBand,
        middleBand,
        lowerBand,
        candleSequence,
    } = calculateDonchianChannel(series, period);

    let score = null;
    const lastCandle = series[series.length - 1];
    const lastPrice = lastCandle.close;

    const upperRange = upperBand  - middleBand;  // will return a +ve value.
    const lowerRange = middleBand - lowerBand;  // will return a +ve value.

    score = lastPrice > middleBand ?
        (lastPrice - middleBand) / upperRange * 100 :
        (lastPrice < middleBand ?
            (lastPrice - middleBand) / lowerRange * 100 :
            0
        );
    
    return {
        score,
        candleSequence,
    }
}
