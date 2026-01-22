export default function Candle({ candle, x, priceToY }) {
    const { open, high, low, close } = candle;

    const yOpen = priceToY(open);
    const yClose = priceToY(close);
    const yHigh = priceToY(high);
    const yLow = priceToY(low);

    const bodyTop = Math.min(yOpen, yClose);
    const bodyHeight = Math.max(1, Math.abs(yOpen - yClose));

    const colorClass =
        close > open
            ? "bg-green-500"
            : close < open
                ? "bg-red-500"
                : "bg-black";

    return (
        <div
            className="absolute"
            style={{ left: x }}
        >
            {/* Wick */}
            <div
                className={`absolute ${colorClass}`}
                style={{
                    left: 0,                 // center wick
                    top: yHigh,
                    width: 1,
                    height: yLow - yHigh,
                }}
            />

            {/* Body */}
            <div
                className={colorClass}
                style={{
                    position: "absolute",
                    left: -5, 
                    top: bodyTop,
                    width: 11,
                    height: bodyHeight,
                }}
            />
        </div>
    );
}
