export function calculatePriceDerivatives(series, lookback = 10) {
    if (!Array.isArray(series) || series.length < lookback) {
        return {
            velocity: [],
            acceleration: [],
            candleSequence: series[series.length - 1]?.candleSequence ?? null,
        }
    }

    const slice = series.slice(-lookback);
    const velocity = [];
    const acceleration = [];

    // Step 1: Calculate velocity percentage
    for (let i = 0; i < slice.length - 1; i++) {
        if (slice[i] === 0) continue;
        const vel = (slice[i + 1] - slice[i]) / slice[i] * 100;
        velocity.push(vel);
    }

    // Step 2: Calculate acceleration percentage
    for (let i = 0; i < velocity.length - 1; i++) {
        const acc = velocity[i + 1] - velocity[i];
        acceleration.push(acc);
    }

    return {
        velocity,
        acceleration,
        candleSequence: slice[slice.length - 1].candleSequence,
    }
}

export function calculateMeanVelAcc(series, lookback = 10) {
    if (!Array.isArray(series) || series.length < lookback) {
        return {
            avgVelocity: null,
            avgAcceleration: null,
            candleSequence: series[series.length - 1]?.candleSequence ?? null,
        }
    }

    const {
        velocity,
        acceleration,
        candleSequence
    } = calculatePriceDerivatives(series, lookback);

    const avgVelocity = velocity.reduce((a, b) => a + b, 0) / velocity.length;
    const avgAcceleration = acceleration.reduce((a, b) => a + b, 0) / acceleration.length;

    return {
        velocity,
        acceleration,
        avgVelocity,
        avgAcceleration,
        candleSequence,
    }
}
