export default function Crosshair({
    index,
    x,
    y,
    height,
    candle,
    priceToY,
}) {
    const price =
        candle.low +
        ((height - y) / height) *
            (candle.high - candle.low);

    const time = new Date(candle.timestamp).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <>
            {/* Vertical */}
            <div
                className="absolute bg-gray-400"
                style={{
                    left: x,
                    top: 0,
                    width: 1,
                    height,
                }}
            />

            {/* Horizontal */}
            <div
                className="absolute bg-gray-400"
                style={{
                    top: y,
                    left: 0,
                    height: 1,
                    width: "100%",
                }}
            />

            {/* Time Tag */}
            <div
                className="absolute bg-black text-white text-xs px-2 py-1 rounded"
                style={{
                    left: x - 20,
                    top: height + 6,
                }}
            >
                {time}
            </div>

            {/* Price Tag */}
            <div
                className="absolute bg-black text-white text-xs px-2 py-1 rounded"
                style={{
                    right: 4,
                    top: y - 10,
                }}
            >
                {price.toFixed(2)}
            </div>
        </>
    );
}
