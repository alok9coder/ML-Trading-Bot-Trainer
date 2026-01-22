function formatIST(ts) {
    return new Date(ts).toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function TimeTag({ timestamp, x, floating }) {
    return (
        <div
            className={`absolute text-xs px-1 rounded ${
                floating ? "z-50 bg-black text-white" : "bg-white text-black"
            }`}
            style={{
                left: x - 18,
                bottom: 2,
            }}
        >
            {formatIST(timestamp)}
        </div>
    );
}
