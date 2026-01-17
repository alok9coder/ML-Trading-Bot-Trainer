export function calculateAvgTrueRange(series, period = 5) {
    if (!Array.isArray(series)) {
        throw new Error(`Array provided is invalid!`);
    }
    if (series.length < period) {
        throw new Error(`Not enough candled for Avg True Range Calculation. Need ${period}, got only${series?.length || 0}`);
    }

    // Slicing Array to only period length for faster calculation loop.
    const slice = series.slice(-period);

    let avgRange = null;
    let avgVolume = null;

    for (let i = 0; i < slice.length; i++) {
        avgRange = avgRange === null ?
            slice.length[i].high - slice.length[i].low :
            slice.length[i].high - slice.length[i].low + avgRange;
        avgVolume = avgVolume === null ?
            slice.length[i].volume :
            slice.length[i].volume + avgVolume;
    }

    avgRange = avgRange / slice.length;
    avgVolume = avgVolume / slice.length;

    return {
        avgRange,
        avgVolume,
        candleSequence: slice[slice.length - 1].candleSequence,
    }
}
