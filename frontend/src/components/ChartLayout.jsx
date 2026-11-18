import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Candle from "./Candle.jsx";
import { useTrainingData } from "../context/TrainingDataContext.js";

const CANDLE_STEP = 15;
const PRICE_STEP_PIXELS = 75;
const PRICE_UNIT_RATIO = 0.001;
const CANDLE_FLOOR = 130;
const TOP_PADDING = 80;
const VOLUME_PANE_HEIGHT = 125;
const VOLUME_BAR_HEIGHT = 100;
const TIME_AXIS_HEIGHT = 25;

const compactVolumeFormatter = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
});
const exactVolumeFormatter = new Intl.NumberFormat("en-IN");

function formatTime(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "--:--";

    return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

function formatVolume(value) {
    const volume = Number(value);
    if (!Number.isFinite(volume)) return "Unavailable";

    return `${compactVolumeFormatter.format(volume).toLowerCase()} (${exactVolumeFormatter.format(volume)})`;
}

export default function ChartLayout() {
    const { candles, entryTypeCandles, setSelectedCandle } = useTrainingData();
    const scrollRef = useRef(null);
    const priceAxisInnerRef = useRef(null);
    const volumeTrackRef = useRef(null);
    const dragInfo = useRef({
        isDragging: false,
        startX: 0,
        startY: 0,
        scrollLeft: 0,
        scrollTop: 0,
        hasMoved: false,
    });
    const [viewport, setViewport] = useState({ width: 0, height: 0 });
    const [hoveredCandle, setHoveredCandle] = useState(null);
    const hasCandles = candles.length > 0;

    useEffect(() => {
        const scrollContainer = scrollRef.current;
        if (!scrollContainer) return undefined;

        const updateViewport = () => {
            const width = scrollContainer.clientWidth;
            const height = scrollContainer.clientHeight;
            setViewport((previous) =>
                previous.width === width && previous.height === height
                    ? previous
                    : { width, height },
            );
        };

        updateViewport();
        const observer = new ResizeObserver(updateViewport);
        observer.observe(scrollContainer);
        return () => observer.disconnect();
    }, [hasCandles]);

    const chart = useMemo(() => {
        if (!candles.length) return null;

        let minPrice = Infinity;
        let maxPrice = -Infinity;
        let averagePrice = 0;
        let highestVolume = 0;

        for (const candle of candles) {
            minPrice = Math.min(minPrice, candle.low);
            maxPrice = Math.max(maxPrice, candle.high);
            averagePrice += (candle.high + candle.low) / 2;

            const volume = Number(candle.volume);
            if (Number.isFinite(volume)) highestVolume = Math.max(highestVolume, volume);
        }

        averagePrice /= candles.length;
        const pricePerUnit = averagePrice * PRICE_UNIT_RATIO;
        const pixelsPerPrice = pricePerUnit > 0
            ? PRICE_STEP_PIXELS / pricePerUnit
            : PRICE_STEP_PIXELS;
        const naturalHeight = Math.ceil(
            CANDLE_FLOOR + (maxPrice - minPrice) * pixelsPerPrice + TOP_PADDING,
        );
        const height = Math.max(viewport.height, naturalHeight);
        const width = Math.max(candles.length * CANDLE_STEP + 30, viewport.width);
        const yForPrice = (price) =>
            height - (CANDLE_FLOOR + (price - minPrice) * pixelsPerPrice);
        const priceForY = (y) =>
            minPrice + ((height - y - CANDLE_FLOOR) / PRICE_STEP_PIXELS) * pricePerUnit;
        const priceSteps = Array.from(
            { length: Math.floor(height / PRICE_STEP_PIXELS) + 1 },
            (_, index) => {
                const bottom = index * PRICE_STEP_PIXELS;
                const price =
                    minPrice + ((bottom - CANDLE_FLOOR) / PRICE_STEP_PIXELS) * pricePerUnit;
                return {
                    y: height - bottom,
                    label: price.toFixed(2),
                };
            },
        );

        return {
            width,
            height,
            yForPrice,
            priceForY,
            priceSteps,
            highestVolume,
        };
    }, [candles, viewport.height, viewport.width]);

    const syncOverlays = useCallback(() => {
        const scrollContainer = scrollRef.current;
        if (!scrollContainer) return;

        if (priceAxisInnerRef.current) {
            priceAxisInnerRef.current.style.transform =
                `translateY(-${scrollContainer.scrollTop}px)`;
        }
        if (volumeTrackRef.current) {
            volumeTrackRef.current.style.transform =
                `translateX(-${scrollContainer.scrollLeft}px)`;
        }
    }, []);

    useEffect(() => {
        syncOverlays();
    }, [chart?.height, chart?.width, syncOverlays]);

    const updateHoveredCandle = useCallback(
        (candle, x, y) => {
            if (!candle || !chart) {
                setHoveredCandle(null);
                return;
            }

            const boundedY = Math.max(0, Math.min(chart.height, Math.round(y)));
            setHoveredCandle((previous) => {
                if (
                    previous?.candle.candleSequence === candle.candleSequence &&
                    previous.x === x &&
                    previous.y === boundedY
                ) {
                    return previous;
                }

                return {
                    candle,
                    x,
                    y: boundedY,
                    price: chart.priceForY(boundedY),
                };
            });
        },
        [chart],
    );

    const handleCandleFocus = useCallback(
        (candle, x) => {
            if (!candle || !chart) {
                setHoveredCandle(null);
                return;
            }
            updateHoveredCandle(candle, x, chart.yForPrice(candle.close));
        },
        [chart, updateHoveredCandle],
    );

    const handleChartMouseMove = useCallback(
        (event) => {
            if (!chart || !candles.length) return;

            const scrollContainer = event.currentTarget;
            const bounds = scrollContainer.getBoundingClientRect();
            const contentX = event.clientX - bounds.left + scrollContainer.scrollLeft;
            const index = Math.max(
                0,
                Math.min(candles.length - 1, Math.round(contentX / CANDLE_STEP) - 1),
            );
            const contentY = event.clientY - bounds.top + scrollContainer.scrollTop;

            updateHoveredCandle(
                candles[index],
                index * CANDLE_STEP + CANDLE_STEP,
                contentY,
            );
        },
        [candles, chart, updateHoveredCandle],
    );

    const clearHoveredCandle = useCallback(() => setHoveredCandle(null), []);

    const handleMouseDown = (event) => {
        if (event.button !== 0 || !scrollRef.current) return;

        dragInfo.current = {
            isDragging: true,
            startX: event.clientX,
            startY: event.clientY,
            scrollLeft: scrollRef.current.scrollLeft,
            scrollTop: scrollRef.current.scrollTop,
            hasMoved: false,
        };
        scrollRef.current.style.cursor = "grabbing";
    };

    const handleMouseMove = (event) => {
        const scrollContainer = scrollRef.current;
        if (!dragInfo.current.isDragging || !scrollContainer) return;

        const deltaX = event.clientX - dragInfo.current.startX;
        const deltaY = event.clientY - dragInfo.current.startY;
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
            dragInfo.current.hasMoved = true;
        }

        if (dragInfo.current.hasMoved) {
            event.preventDefault();
            scrollContainer.scrollLeft = dragInfo.current.scrollLeft - deltaX;
            scrollContainer.scrollTop = dragInfo.current.scrollTop - deltaY;
            syncOverlays();
        }
    };

    const stopDragging = () => {
        if (!dragInfo.current.isDragging) return;

        dragInfo.current.isDragging = false;
        if (scrollRef.current) scrollRef.current.style.cursor = "grab";
        if (dragInfo.current.hasMoved) {
            window.setTimeout(() => {
                dragInfo.current.hasMoved = false;
            }, 0);
        }
    };

    const handleCandleClick = useCallback(
        (candleSequence) => {
            if (dragInfo.current.hasMoved) {
                dragInfo.current.hasMoved = false;
                return;
            }
            setSelectedCandle(candleSequence);
        },
        [setSelectedCandle],
    );

    const labelsBySequence = useMemo(
        () =>
            new Map(
                entryTypeCandles.map(({ candleSequence, label }) => [
                    candleSequence,
                    label,
                ]),
            ),
        [entryTypeCandles],
    );

    const hoveredTime = hoveredCandle
        ? formatTime(hoveredCandle.candle.timestamp)
        : "";

    return (
        <section className="m-2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg shadow-black/5 sm:m-3">
            <div className="flex h-[44px] shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-3 sm:px-4">
                <div className="flex min-w-0 items-center gap-3">
                    <h2 className="m-0 shrink-0 text-[12px] font-semibold text-[var(--text-primary)]">
                        Price action
                    </h2>
                    <span className="hidden truncate text-[9px] text-[var(--text-subtle)] sm:inline">
                        75 px = 5 candles / 5 min · 75 px = 0.1% of average price
                    </span>
                </div>
                <p aria-live="polite" className="m-0 shrink-0 text-[10px] text-[var(--text-muted)]">
                    {hoveredCandle
                        ? `${hoveredTime} · Price ${hoveredCandle.price.toFixed(2)} · Volume ${formatVolume(hoveredCandle.candle.volume)}`
                        : "Hover a candle or volume bar for details"}
                </p>
            </div>

            <div className="flex min-h-0 min-w-0 flex-1">
                {!candles.length ? (
                    <div className="grid min-h-0 flex-1 place-items-center bg-[var(--chart-bg)] px-5 text-center">
                        <div>
                            <h3 className="mb-1.5 mt-0 text-[14px] font-semibold text-[var(--text-primary)]">
                                Your chart is ready
                            </h3>
                            <p className="m-0 text-[11px] leading-5 text-[var(--text-muted)]">
                                Search an NSE instrument and choose a weekday to load its candles.
                            </p>
                        </div>
                    </div>
                ) : chart ? (
                    <>
                        <div
                            className="relative min-h-0 min-w-0 flex-1 cursor-crosshair select-none"
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={stopDragging}
                            onMouseLeave={stopDragging}
                        >
                            <div
                                ref={scrollRef}
                                onScroll={syncOverlays}
                                onMouseMove={handleChartMouseMove}
                                onMouseLeave={clearHoveredCandle}
                                className="absolute inset-0 overflow-auto bg-[var(--chart-bg)] [scrollbar-color:var(--scroll-thumb)_var(--chart-bg)] [scrollbar-width:thin]"
                                style={{
                                    backgroundImage:
                                        "linear-gradient(rgba(99, 121, 115, 0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 121, 115, 0.035) 1px, transparent 1px)",
                                    backgroundSize: `${PRICE_STEP_PIXELS}px ${PRICE_STEP_PIXELS}px`,
                                    backgroundPosition: "left bottom",
                                }}
                            >
                                <svg
                                    className="block"
                                    width={chart.width}
                                    height={chart.height}
                                    role="img"
                                    aria-label="Interactive NSE candlestick chart"
                                >
                                    {chart.priceSteps.map(({ y, label }) =>
                                        y >= 0 && y <= chart.height ? (
                                            <line
                                                key={label}
                                                x1="0"
                                                x2={chart.width}
                                                y1={y}
                                                y2={y}
                                                stroke="var(--chart-grid)"
                                                strokeWidth="1"
                                                strokeDasharray="2 5"
                                            />
                                        ) : null,
                                    )}
                                    {candles.map((candle, index) => (
                                        <Candle
                                            key={candle.candleSequence}
                                            candle={candle}
                                            x={index * CANDLE_STEP + CANDLE_STEP}
                                            xStep={CANDLE_STEP}
                                            yForPrice={chart.yForPrice}
                                            label={labelsBySequence.get(candle.candleSequence) || 0}
                                            isHovered={
                                                hoveredCandle?.candle.candleSequence ===
                                                candle.candleSequence
                                            }
                                            onClick={() =>
                                                handleCandleClick(candle.candleSequence)
                                            }
                                            onHover={handleCandleFocus}
                                        />
                                    ))}
                                    {hoveredCandle && (
                                        <g pointerEvents="none" aria-hidden="true">
                                            <line
                                                x1={hoveredCandle.x}
                                                x2={hoveredCandle.x}
                                                y1="0"
                                                y2={chart.height}
                                                stroke="var(--accent)"
                                                strokeWidth="1"
                                                strokeDasharray="4 4"
                                                opacity="0.9"
                                            />
                                            <line
                                                x1="0"
                                                x2={chart.width}
                                                y1={hoveredCandle.y}
                                                y2={hoveredCandle.y}
                                                stroke="var(--accent)"
                                                strokeWidth="1"
                                                strokeDasharray="4 4"
                                                opacity="0.9"
                                            />
                                            <circle
                                                cx={hoveredCandle.x}
                                                cy={hoveredCandle.y}
                                                r="3"
                                                fill="var(--accent)"
                                            />
                                        </g>
                                    )}
                                </svg>
                            </div>

                            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[125px] overflow-hidden border-t border-[var(--border)] bg-[var(--chart-bg)]/90 backdrop-blur-sm">
                                <div
                                    ref={volumeTrackRef}
                                    className="relative h-full will-change-transform"
                                    style={{ width: chart.width }}
                                >
                                    {hoveredCandle && (
                                        <div
                                            className="pointer-events-none absolute inset-y-0 z-10 border-l border-dashed border-[var(--accent)]"
                                            style={{ left: `${hoveredCandle.x}px` }}
                                        />
                                    )}
                                    <div className="relative h-[100px] w-full">
                                        {candles.map((candle, index) => {
                                            const volume = Number(candle.volume);
                                            const barHeight =
                                                chart.highestVolume > 0 &&
                                                Number.isFinite(volume) &&
                                                volume > 0
                                                    ? Math.max(
                                                        1,
                                                        Math.round(
                                                            (volume / chart.highestVolume) *
                                                                VOLUME_BAR_HEIGHT,
                                                        ),
                                                    )
                                                    : 0;
                                            const bullish = candle.close >= candle.open;
                                            const barTime = formatTime(candle.timestamp);
                                            const barX = index * CANDLE_STEP + CANDLE_STEP;
                                            const isHovered =
                                                hoveredCandle?.candle.candleSequence ===
                                                candle.candleSequence;

                                            return (
                                                <div
                                                    key={candle.candleSequence}
                                                    className={`group pointer-events-auto absolute bottom-0 w-[11px] cursor-crosshair transition focus-visible:outline focus-visible:outline-1 focus-visible:outline-emerald-400 ${
                                                        bullish ? "bg-emerald-400" : "bg-red-400"
                                                    } ${
                                                        isHovered
                                                            ? "z-20 opacity-100"
                                                            : "opacity-75 hover:opacity-100"
                                                    }`}
                                                    style={{
                                                        height: `${barHeight}px`,
                                                        left: `${index * CANDLE_STEP + 10}px`,
                                                    }}
                                                    role="img"
                                                    tabIndex="0"
                                                    aria-label={`${barTime}, volume ${formatVolume(volume)}`}
                                                    title={`${barTime} · Volume ${formatVolume(volume)}`}
                                                    onMouseEnter={() =>
                                                        handleCandleFocus(candle, barX)
                                                    }
                                                    onMouseLeave={clearHoveredCandle}
                                                    onFocus={() =>
                                                        handleCandleFocus(candle, barX)
                                                    }
                                                    onBlur={clearHoveredCandle}
                                                >
                                                    <span
                                                        className={`pointer-events-none absolute bottom-[calc(50%+5px)] left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded bg-[var(--surface-raised)] px-1.5 py-1 text-[9px] text-[var(--text-primary)] shadow transition-opacity ${
                                                            isHovered
                                                                ? "opacity-100"
                                                                : "opacity-0 group-hover:opacity-100 group-focus:opacity-100"
                                                        }`}
                                                    >
                                                        {compactVolumeFormatter
                                                            .format(Number.isFinite(volume) ? volume : 0)
                                                            .toLowerCase()}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="relative h-[25px] w-full border-t border-[var(--border)] bg-[var(--surface)]">
                                        {candles.map((candle, index) => {
                                            if (index % 5 !== 0) return null;

                                            const x = index * CANDLE_STEP + CANDLE_STEP;
                                            return (
                                                <div
                                                    key={candle.candleSequence}
                                                    className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                                                    style={{ left: `${x}px` }}
                                                >
                                                    <span className="h-1.5 w-px bg-[var(--text-subtle)]" />
                                                    <span className="mt-0.5 whitespace-nowrap font-mono text-[9px] leading-none text-[var(--text-muted)]">
                                                        {formatTime(candle.timestamp)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                        {hoveredCandle && (
                                            <div
                                                className="pointer-events-none absolute top-0 z-20 flex h-full -translate-x-1/2 items-center"
                                                style={{ left: `${hoveredCandle.x}px` }}
                                            >
                                                <span className="rounded border border-[var(--accent)] bg-[var(--accent)] px-1.5 py-0.5 font-mono text-[9px] font-semibold text-[var(--page-bg)]">
                                                    {hoveredTime}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <aside className="relative h-full w-[78px] shrink-0 select-none overflow-hidden border-l border-[var(--border)] bg-[var(--surface)]">
                            <div
                                ref={priceAxisInnerRef}
                                className="relative w-full will-change-transform"
                                style={{ height: chart.height }}
                            >
                                {chart.priceSteps.map(({ y, label }) => (
                                    <div
                                        key={`${y}-${label}`}
                                        className="absolute left-0 flex w-full -translate-y-1/2 items-center"
                                        style={{ top: y }}
                                    >
                                        <span className="mr-1.5 h-px w-2 shrink-0 bg-[var(--text-subtle)]" />
                                        <span className="font-mono text-[9px] text-[var(--text-muted)]">
                                            {label}
                                        </span>
                                    </div>
                                ))}
                                {hoveredCandle && (
                                    <div
                                        className="absolute left-0 z-20 flex w-full -translate-y-1/2 items-center rounded bg-[var(--accent)] px-1 py-0.5 text-[var(--page-bg)] shadow"
                                        style={{ top: hoveredCandle.y }}
                                    >
                                        <span className="mr-1 h-px w-2 shrink-0 bg-[var(--page-bg)]" />
                                        <span className="font-mono text-[9px] font-semibold">
                                            {hoveredCandle.price.toFixed(2)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </aside>
                    </>
                ) : (
                    <div className="flex min-h-0 flex-1 items-center justify-center bg-[var(--chart-bg)] text-xs text-[var(--text-muted)]">
                        Preparing chart…
                    </div>
                )}
            </div>
        </section>
    );
}
