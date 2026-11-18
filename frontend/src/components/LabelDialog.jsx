import { useTrainingData } from "../context/TrainingDataContext.js";

const switchTrack =
    "relative h-5 w-9 shrink-0 rounded-full border border-[var(--border-soft)] bg-slate-500/25 transition-colors before:absolute before:left-0.5 before:top-0.5 before:h-3.5 before:w-3.5 before:rounded-full before:bg-[var(--knob-bg)] before:transition-transform before:content-[''] peer-checked:before:translate-x-4 peer-checked:before:bg-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-500";

export default function LabelDialog() {
    const { selectedCandle, setSelectedCandle, entryTypeCandles, setEntryType } =
        useTrainingData();

    if (!selectedCandle) return null;

    const candle = entryTypeCandles.find(
        (item) => item.candleSequence === selectedCandle,
    );
    if (!candle) return null;

    const label = candle.label ?? 0;
    const time = new Date(candle.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });

    return (
        <div
            className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 p-5 backdrop-blur-sm"
            onMouseDown={() => setSelectedCandle(null)}
        >
            <section
                className="w-full max-w-[440px] rounded-xl border border-[var(--border)] bg-[var(--dialog-bg)] p-[18px] shadow-2xl shadow-black/30 sm:p-[23px]"
                role="dialog"
                aria-modal="true"
                aria-labelledby="label-dialog-title"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between">
                    <div>
                        <span className="text-[10px] font-bold tracking-[0.14em] text-[var(--accent)]">
                            CANDLE {String(candle.candleSequence).padStart(3, "0")}
                        </span>
                        <h2
                            className="mb-0 mt-2 text-xl font-semibold tracking-tight text-[var(--text-primary)]"
                            id="label-dialog-title"
                        >
                            Set entry label
                        </h2>
                    </div>
                    <button
                        className="grid h-[30px] w-[30px] place-items-center rounded-md border border-[var(--border-soft)] bg-[var(--surface)] text-lg leading-none text-[var(--text-muted)] hover:brightness-110"
                        type="button"
                        aria-label="Close dialog"
                        onClick={() => setSelectedCandle(null)}
                    >
                        ×
                    </button>
                </div>
                <div className="mt-[18px] flex flex-wrap gap-[11px] rounded-md border border-[var(--border)] bg-[var(--surface-details)] px-3 py-3 text-[10px] text-[var(--text-muted)]">
                    <span>{time}</span>
                    <span>O <strong className="font-medium text-[var(--text-primary)]">{candle.open}</strong></span>
                    <span>H <strong className="font-medium text-[var(--text-primary)]">{candle.high}</strong></span>
                    <span>L <strong className="font-medium text-[var(--text-primary)]">{candle.low}</strong></span>
                    <span>C <strong className="font-medium text-[var(--text-primary)]">{candle.close}</strong></span>
                </div>
                <p className="mb-3 mt-[17px] text-[11px] leading-relaxed text-[var(--text-muted)]">
                    Choose one entry direction, or leave both off to label this candle as no entry.
                </p>
                <div className="grid gap-[9px]">
                    <label
                        className={`flex min-h-16 cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${
                            label === 1
                                ? "border-emerald-600/50 bg-emerald-500/10"
                                : "border-[var(--switch-border)] bg-[var(--switch-bg)]"
                        }`}
                    >
                        <span className="flex items-center gap-[11px]">
                            <span className="grid h-[31px] w-[31px] place-items-center rounded-lg bg-emerald-500/15 text-[17px] text-emerald-600">
                                ↗
                            </span>
                            <span>
                                <strong className="block text-xs text-[var(--text-primary)]">Long entry</strong>
                                <small className="mt-1 block text-[10px] text-[var(--text-muted)]">Buy / upward setup</small>
                            </span>
                        </span>
                        <input
                            className="peer sr-only"
                            type="checkbox"
                            checked={label === 1}
                            onChange={(event) =>
                                setEntryType(selectedCandle, event.target.checked ? "long" : null)
                            }
                        />
                        <span
                            className={`${switchTrack} peer-checked:border-emerald-600 peer-checked:bg-emerald-700`}
                            aria-hidden="true"
                        />
                    </label>
                    <label
                        className={`flex min-h-16 cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${
                            label === -1
                                ? "border-amber-600/50 bg-amber-500/10"
                                : "border-[var(--switch-border)] bg-[var(--switch-bg)]"
                        }`}
                    >
                        <span className="flex items-center gap-[11px]">
                            <span className="grid h-[31px] w-[31px] place-items-center rounded-lg bg-amber-500/15 text-[17px] text-amber-700">
                                ↘
                            </span>
                            <span>
                                <strong className="block text-xs text-[var(--text-primary)]">Short entry</strong>
                                <small className="mt-1 block text-[10px] text-[var(--text-muted)]">Sell / downward setup</small>
                            </span>
                        </span>
                        <input
                            className="peer sr-only"
                            type="checkbox"
                            checked={label === -1}
                            onChange={(event) =>
                                setEntryType(selectedCandle, event.target.checked ? "short" : null)
                            }
                        />
                        <span
                            className={`${switchTrack} peer-checked:border-amber-600 peer-checked:bg-amber-700`}
                            aria-hidden="true"
                        />
                    </label>
                </div>
                <div className="mt-4 flex justify-between gap-2 border-t border-[var(--border)] py-3 text-[10px] text-[var(--text-muted)]">
                    <span>
                        Entry label{" "}
                        <strong className="ml-1 font-semibold text-[var(--text-primary)]">
                            {label === 0 ? 0 : 1}
                        </strong>
                    </span>
                    <span>
                        Entry type{" "}
                        <strong className="ml-1 font-semibold text-[var(--text-primary)]">
                            {label === 1 ? "LONG (1)" : label === -1 ? "SHORT (-1)" : "NONE (0)"}
                        </strong>
                    </span>
                </div>
                <button
                    className="mt-2 h-[42px] w-full rounded-md border border-emerald-500 bg-emerald-400 text-xs font-bold text-emerald-950 transition hover:bg-emerald-300"
                    type="button"
                    onClick={() => setSelectedCandle(null)}
                >
                    Done
                </button>
            </section>
        </div>
    );
}
