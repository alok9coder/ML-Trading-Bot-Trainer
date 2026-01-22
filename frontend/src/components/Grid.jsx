import Candle from "./Candle.jsx";

export default function Grid({ ohlc, priceToY, candlePitch }) {
    return (
        <div className="absolute inset-0">
            {ohlc.map((candle, i) => (
                <Candle
                    key={i}
                    candle={candle}
                    x={i * candlePitch}
                    priceToY={priceToY}
                    candleWidth={11}
                />
            ))}
        </div>
    );
}
