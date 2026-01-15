export function calculateAvgTrueRange(series, period = 5) {
    if (!Array.isArray(series) || series.length < period) {
        throw new Error(`Not enough candled for Avg True Range Calculation. Need ${period}, got only${series?.length || 0}`);
    }

    // Slicing Array to only period length for faster calculation loop.
    const slice = series.slice(-period);

    let avgRange = null;

    for (let i = 0; i < slice.length; i++) {
        avgRange = avgRange === null ?
            slice.length[i].high - slice.length[i].low :
            slice.length[i].high - slice.length[i].low + avgRange;
    }

    avgRange = avgRange / slice.length;

    return {
        avgRange,
        candleSequence: slice[slice.length - 1].candleSequence,
    }
}
