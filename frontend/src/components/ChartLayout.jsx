import Canvas from "./Canvas.jsx";
import PriceTag from "./PriceTag.jsx";
import TimeTag from "./TimeTag.jsx";

export default function ChartLayout({ ohlc }) {
    if (!ohlc.length) return null;

    /* ====== CONSTANTS ====== */
    const CANDLE_WIDTH = 11;
    const CANDLE_GAP = 5;
    const CANDLE_PITCH = CANDLE_WIDTH + CANDLE_GAP;

    const LEFT_GUTTER = 70;
    const RIGHT_GUTTER = 60;
    const BOTTOM_GUTTER = 36;
    const TOP_OFFSET = 90;

    const chartHeight =
        window.innerHeight - TOP_OFFSET - BOTTOM_GUTTER;

    const chartWidth =
        ohlc.length * CANDLE_PITCH + RIGHT_GUTTER;

    /* ====== PRICE SCALE ====== */
    const prices = ohlc.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    function priceToY(price) {
        return (
            ((maxPrice - price) / (maxPrice - minPrice)) *
            (chartHeight - 20)
        );
    }

    return (
        <div className="relative flex w-full">
            {/* ===== Scrollable Chart Area ===== */}
            <div
                className="relative overflow-x-auto overflow-y-hidden"
                style={{ paddingLeft: LEFT_GUTTER }}
            >
                <div
                    className="relative"
                    style={{
                        width: chartWidth,
                        height: chartHeight + BOTTOM_GUTTER,
                    }}
                >
                    <Canvas
                        ohlc={ohlc}
                        priceToY={priceToY}
                        candlePitch={CANDLE_PITCH}
                        candleWidth={CANDLE_WIDTH}
                        height={chartHeight}
                        bottomPadding={BOTTOM_GUTTER}
                    />

                    {/* ===== Time Axis ===== */}
                    {ohlc.map((c, i) => {
                        const date = new Date(c.timestamp);
                        const isFiveMin = date.getMinutes() % 5 === 0;
                        if (!isFiveMin && i !== 0 && i !== ohlc.length - 1)
                            return null;

                        return (
                            <TimeTag
                                key={i}
                                timestamp={c.timestamp}
                                x={i * CANDLE_PITCH}
                                y={chartHeight + 6}
                            />
                        );
                    })}
                </div>
            </div>

            {/* ===== Fixed Price Axis ===== */}
            <div className="relative w-[64px]">
                {[0.25, 0.5, 0.75].map(f => {
                    const price =
                        minPrice + (maxPrice - minPrice) * (1 - f);

                    return (
                        <PriceTag
                            key={f}
                            price={price}
                            y={priceToY(price)}
                        />
                    );
                })}
            </div>
        </div>
    );
}
