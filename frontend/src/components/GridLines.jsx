export default function GridLines({
    ohlc,
    candlePitch,
    height,
}) {
    return (
        <>
            {ohlc.map((c, i) => {
                const d = new Date(c.timestamp);
                if (d.getMinutes() % 5 !== 0) return null;

                return (
                    <div
                        key={i}
                        className="absolute bg-gray-200"
                        style={{
                            left: i * candlePitch,
                            top: 0,
                            width: 1,
                            height,
                        }}
                    />
                );
            })}
        </>
    );
}
