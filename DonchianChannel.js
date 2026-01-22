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

    let donchianScoreTrend = null;
    const seek = 5;

    for (let i = 0; i < seek; i++) {
        const tempSlice = series.slice(0, series.length - i - 1);
        const tempPrice = tempSlice[tempSlice.length - 1].close;

        const {
            upperBand: upper,
            middleBand: middle,
            lowerBand: lower,
        } = calculateDonchianChannel(tempSlice, period);

        const score = tempPrice > middle ?
            (tempPrice - middle) / (upper - middle) * 100 :
            (tempPrice < middle ?
                (tempPrice - middle) / (middle - lower) * 100 :
                0
            );
        donchianScoreTrend = donchianScoreTrend === null ?
            score :
            donchianScoreTrend + score;
    }

    const {
        upperBand,
        middleBand,
        lowerBand,
        candleSequence,
    } = calculateDonchianChannel(series, period);

    let donchianScore = null;
    const lastCandle = series[series.length - 1];
    const lastPrice = lastCandle.close;

    const upperRange = upperBand  - middleBand;  // will return a +ve value.
    const lowerRange = middleBand - lowerBand;  // will return a +ve value.

    donchianScore = lastPrice > middleBand ?
        (lastPrice - middleBand) / upperRange * 100 :
        (lastPrice < middleBand ?
            (lastPrice - middleBand) / lowerRange * 100 :
            0
        );
    
    const donchianWidth = (upperBand - lowerBand) / middleBand * 100;
    
    const seriesDelta5 = series.slice(0, -5);
    const DD_5 = calculateDonchianChannel(seriesDelta5, period);
    const donchianWidth5 = (DD_5.upperBand - DD_5.lowerBand) / DD_5.middleBand * 100;
    const donchianWidthDelta5 = donchianWidth - donchianWidth5;

    const seriesDelta10 = series.slice(0, -10);
    const DD_10 = calculateDonchianChannel(seriesDelta10, period);
    const donchianWidth10 = (DD_10.upperBand - DD_10.lowerBand) / DD_10.middleBand * 100;
    const donchianWidthDelta10 = donchianWidth - donchianWidth10;
    
    return {
        donchianScoreTrend,
        donchianWidthDelta5,
        donchianWidthDelta10,
        donchianWidth,
        donchianScore,
        candleSequence,
    }
}
