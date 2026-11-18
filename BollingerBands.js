export function calculateBollingerBands(series, period = 10, multiplier = 2) {
    if (!Array.isArray(series) || series.length < period) {
        throw new Error(`Not enough candles for Donchian Calculation. Need ${period}, got ${series?.length || 0}`);
    }

    // Extracts only last period length candles.
    const slice = series.slice(-period);

    let upperBand   = null;
    let middleBand  = null;
    let lowerBand   = null;

    let movAvg      = null;
    let stdDev      = null;
    
    for (let i = 0; i < slice.length; i++) {
        movAvg = movAvg === null ?
            slice[i].close :
            slice[i].close + movAvg;
    }
    movAvg = movAvg / slice.length;
    
    let variance = 0;
    for (let i = 0; i < slice.length; i++) {
        const diff = slice[i].close - movAvg;
        variance += Math.pow(diff, 2);
    }
    variance = variance / slice.length;
    stdDev = Math.sqrt(variance) * multiplier;

    upperBand   = movAvg + stdDev;
    middleBand  = movAvg;
    lowerBand   = movAvg - stdDev;
    
    return {
        upperBand,
        middleBand,
        lowerBand,
        candleSequence: slice[slice.length - 1].candleSequence,
    }
}

export function getBollingerScore(series, period = 10, multiplier = 2) {
    if (!Array.isArray(series) || series.length < period) {
        throw new Error(`Not enough candles for Bollinger calculation. Need ${period}, got ${series?.length || 0}`);
    }

    const {
        upperBand,
        middleBand,
        lowerBand,
        candleSequence,
    } = calculateBollingerBands(series, period, multiplier);

    let bollingerScore = null;
    const lastCandle = series[series.length - 1];
    const lastPrice = lastCandle.close;

    const upperRange = upperBand - middleBand;
    const lowerRange = middleBand - lowerBand;

    bollingerScore = lastPrice > middleBand ?
        (lastPrice - middleBand) / upperRange * 100 :
        (lastPrice < middleBand ?
            (lastPrice - middleBand) / lowerRange * 100 :
            0
        );
    
    const bollingerWidths = [];
    const widthLoopback = 6;
    for (let i = 0; i < widthLoopback; i++) {
        const end = series.length - i;
        const slice = series.slice(0, end);
        const BB = calculateBollingerBands(slice, period, multiplier);
        const width = (BB.upperBand - BB.lowerBand) / BB.middleBand * 100;
        bollingerWidths.push(width);
    }
    const bollingerWidth = bollingerWidths[0];

    const bbWidthDeltas = [];
    for (let i = 0; i < bollingerWidths.length - 1; i++) {
        const widthDelta = bollingerWidths[i] - bollingerWidths[i + 1];
        bbWidthDeltas.push(widthDelta);
    }

    const bbWidthDelta5 = bollingerWidths[0] - bollingerWidths[5];

    return {
        bollingerScore,
        bollingerWidth,
        bbWidthDeltas,
        bbWidthDelta5,
        candleSequence,
    }
}
