import { useEffect, useState } from "react";
import { useTrainingData } from "../context/TrainingDataContext.js";

const fieldClass =
    "h-9 w-full rounded-md border border-[var(--border-soft)] bg-[var(--surface-input)] px-2.5 text-[12px] text-[var(--input-text)] outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10";

export default function Toolbar({ theme }) {
    const {
        symbol,
        setSymbol,
        selectedDate,
        setSelectedDate,
        loadCandles,
        saveLabels,
        isLoading,
        isSaving,
        isDemoData,
        canSave,
        error,
        saveMessage,
        candles,
        entryCandles,
    } = useTrainingData();
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [dateError, setDateError] = useState("");
    const [searchError, setSearchError] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (query.trim().length < 1) {
            setSuggestions([]);
            setSearchError("");
            return undefined;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            setIsSearching(true);
            setSearchError("");
            try {
                const response = await fetch(
                    `/api/instruments?q=${encodeURIComponent(query.trim())}`,
                    { signal: controller.signal },
                );
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || "Instrument search failed.");
                }
                setSuggestions(result.instruments);
            } catch (requestError) {
                if (requestError.name !== "AbortError") {
                    setSearchError(requestError.message);
                }
            } finally {
                if (!controller.signal.aborted) setIsSearching(false);
            }
        }, 180);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [query]);

    const chooseInstrument = (instrument) => {
        setSymbol(instrument);
        setQuery(instrument);
        setSuggestions([]);
        setSearchError("");
    };

    const handleDateChange = (event) => {
        const value = event.target.value;
        if (!value) {
            setSelectedDate("");
            setDateError("");
            return;
        }

        const day = new Date(`${value}T00:00:00`).getDay();
        if (day === 0 || day === 6) {
            setDateError("Choose a weekday; NSE is closed on Saturday and Sunday.");
            return;
        }

        setSelectedDate(value);
        setDateError("");
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!symbol || !selectedDate || dateError) return;
        await loadCandles(symbol, selectedDate);
    };

    const labeledCount = entryCandles.filter((candle) => candle.label === 1).length;

    return (
        <div className="relative flex min-w-0 flex-1 items-center">
            <form className="flex min-w-0 flex-1 items-center gap-2" onSubmit={handleSubmit}>
                <div className="relative min-w-[100px] flex-1">
                    <input
                        id="instrument-search"
                        className={`${fieldClass} pr-[72px]`}
                        value={query}
                        onChange={(event) => {
                            setQuery(event.target.value.toUpperCase());
                            setSymbol("");
                        }}
                        onFocus={() => setIsOpen(true)}
                        onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
                        placeholder="Search NSE symbol"
                        autoComplete="off"
                        aria-label="Instrument"
                        aria-autocomplete="list"
                        aria-expanded={isOpen && suggestions.length > 0}
                    />
                    {isSearching && (
                        <span className="absolute right-2 top-[11px] text-[9px] text-[var(--text-subtle)]">
                            Searching…
                        </span>
                    )}
                    {isOpen && suggestions.length > 0 && (
                        <ul
                            className="absolute left-0 right-0 top-[calc(100%+5px)] z-50 m-0 max-h-[270px] list-none overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-1 shadow-xl shadow-black/20"
                            role="listbox"
                        >
                            {suggestions.map((instrument) => (
                                <li key={instrument}>
                                    <button
                                        className="flex w-full items-center justify-between rounded px-2.5 py-2.5 text-left text-xs text-[var(--text-primary)] hover:bg-[var(--hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                        type="button"
                                        role="option"
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => chooseInstrument(instrument)}
                                    >
                                        <span>{instrument}</span>
                                        <span className="text-[10px] text-[var(--text-subtle)]">NSE</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <input
                    className={`${fieldClass} w-[124px] shrink-0 sm:w-[145px]`}
                    style={{ colorScheme: theme }}
                    type="date"
                    value={selectedDate}
                    onChange={handleDateChange}
                    aria-label="Trading date"
                    aria-invalid={Boolean(dateError)}
                />

                <button
                    className="h-9 shrink-0 rounded-md border border-emerald-500 bg-emerald-400 px-2.5 text-[11px] font-bold text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:border-[var(--border)] disabled:bg-[var(--hover)] disabled:text-[var(--text-subtle)] sm:px-3"
                    type="submit"
                    disabled={isLoading || isSaving || !symbol || !selectedDate || Boolean(dateError)}
                >
                    {isLoading ? "Loading…" : "Load"}
                </button>
                <button
                    className="h-9 shrink-0 rounded-md border border-indigo-400 bg-indigo-400 px-2.5 text-[11px] font-bold text-indigo-950 transition hover:bg-indigo-300 disabled:cursor-not-allowed disabled:border-[var(--border)] disabled:bg-[var(--hover)] disabled:text-[var(--text-subtle)] sm:px-3"
                    type="button"
                    onClick={saveLabels}
                    disabled={!canSave}
                    title={isDemoData ? "Load a real session before saving sample candles." : "Save the labeled training arrays."}
                >
                    {isSaving ? "Saving…" : "Save"}
                </button>
            </form>

            <div className="ml-3 hidden shrink-0 items-center gap-2 border-l border-[var(--border)] pl-3 text-[10px] text-[var(--text-muted)] 2xl:flex">
                <strong className="max-w-[96px] truncate text-[var(--text-primary)]">
                    {symbol || (isDemoData ? "Development sample" : "No session")}
                </strong>
                <span>{candles.length} candles</span>
                <span>{labeledCount} labeled</span>
                {isDemoData && <span className="font-semibold text-amber-500">DEV</span>}
            </div>

            {(error || dateError || searchError || saveMessage) && (
                <div className="absolute left-0 top-[calc(100%+5px)] z-50 flex max-w-[min(100%,520px)] flex-col gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-[10px] shadow-lg">
                    {error && <p className="m-0 text-rose-500" role="alert">{error}</p>}
                    {dateError && <p className="m-0 text-rose-500" role="alert">{dateError}</p>}
                    {searchError && <p className="m-0 text-rose-500" role="alert">{searchError}</p>}
                    {saveMessage && <p className="m-0 text-emerald-500" role="status">{saveMessage}</p>}
                </div>
            )}
        </div>
    );
}
