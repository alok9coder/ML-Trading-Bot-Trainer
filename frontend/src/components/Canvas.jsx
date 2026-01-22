import { useState } from "react";
import GridLines from "./GridLines.jsx";
import Grid from "./Grid.jsx";
import Crosshair from "./Crosshair.jsx";

export default function Canvas({
    ohlc,
    priceToY,
    candlePitch,
    candleWidth,
    height,
    bottomPadding,
}) {
    const [cursor, setCursor] = useState(null);

    function handleMouseMove(e) {
        const rect = e.currentTarget.getBoundingClientRect();
        const rawX = e.clientX - rect.left;
        const rawY = e.clientY - rect.top;

        const index = Math.round(rawX / candlePitch);
        if (index < 0 || index >= ohlc.length) return;

        setCursor({
            index,
            x: index * candlePitch,
            y: rawY,
        });
    }

    function handleLeave() {
        setCursor(null);
    }

    return (
        <div
            className="absolute inset-0"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleLeave}
        >
            <GridLines
                ohlc={ohlc}
                candlePitch={candlePitch}
                height={height}
            />

            <Grid
                ohlc={ohlc}
                priceToY={priceToY}
                candlePitch={candlePitch}
                candleWidth={candleWidth}
            />

            {cursor && (
                <Crosshair
                    index={cursor.index}
                    x={cursor.x}
                    y={cursor.y}
                    height={height}
                    candlePitch={candlePitch}
                    candle={ohlc[cursor.index]}
                    priceToY={priceToY}
                />
            )}
        </div>
    );
}
