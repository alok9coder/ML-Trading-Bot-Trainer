export default function Candle({
    candle,
    x,
    xStep,
    yForPrice,
    label,
    onClick,
    onHover,
    isHovered,
}) {
    const yOpen = yForPrice(candle.open);
    const yClose = yForPrice(candle.close);
    const yHigh = yForPrice(candle.high);
    const yLow = yForPrice(candle.low);
    const color = candle.close >= candle.open ? "#63c893" : "#e17975";
    const bodyWidth = Math.min(11, Math.max(2.4, xStep * 0.72));
    const volume = Number(candle.volume);
    const volumeLabel = Number.isFinite(volume) ? volume.toLocaleString("en-IN") : "unavailable";
    const time = new Date(candle.timestamp).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });

    return (
        <g
            className="cursor-pointer outline-none"
            role="button"
            tabIndex="0"
            style={isHovered ? { filter: "brightness(0.72)" } : undefined}
            aria-label={`${time}, open ${candle.open}, close ${candle.close}, volume ${volumeLabel}${label === 1 ? ", long entry" : label === -1 ? ", short entry" : ""}`}
            onClick={onClick}
            onFocus={() => onHover(candle, x)}
            onBlur={() => onHover(null)}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onClick();
                }
            }}
        >
            <title>{`${time} · O ${candle.open} H ${candle.high} L ${candle.low} C ${candle.close} · Volume ${volumeLabel}`}</title>
            <line x1={x} x2={x} y1={yHigh} y2={yLow} stroke={color} strokeWidth="1.2" />
            <rect
                x={x - bodyWidth / 2}
                y={Math.min(yOpen, yClose)}
                width={bodyWidth}
                height={Math.max(1.5, Math.abs(yClose - yOpen))}
                rx="1"
                fill={color}
            />
            {label !== 0 && (
                <circle
                    cx={x}
                    cy={yHigh - 8}
                    r="3.5"
                    fill={label === 1 ? "#83d6a8" : "#e5a56e"}
                    stroke="var(--chart-bg)"
                    strokeWidth="1"
                />
            )}
        </g>
    );
}
