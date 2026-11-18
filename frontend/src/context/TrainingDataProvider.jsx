import { useCallback, useState } from "react";
import { DEV_MODE, candles as generatedDevCandles } from "../DevMode.js";
import { TrainingDataContext } from "./TrainingDataContext.js";

const initialDevCandles = DEV_MODE
    ? generatedDevCandles.map((candle, index) => ({
        ...candle,
        instrument: "DEV_MODE",
        candleSequence: index + 1,
        label: 0,
    }))
    : [];

export function TrainingDataProvider({ children, initialDate }) {
    const [symbol, setSymbol] = useState("");
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [loadedSymbol, setLoadedSymbol] = useState("");
    const [loadedDate, setLoadedDate] = useState("");
    const [candles, setCandles] = useState(initialDevCandles);
    const [entryCandles, setEntryCandles] = useState(() =>
        initialDevCandles.map((candle) => ({ ...candle, label: 0 })),
    );
    const [entryTypeCandles, setEntryTypeCandles] = useState(() =>
        initialDevCandles.map((candle) => ({ ...candle, label: 0 })),
    );
    const [exitCandles, setExitCandles] = useState(() =>
        initialDevCandles.map((candle) => ({ ...candle, label: 0 })),
    );
    const [selectedCandle, setSelectedCandle] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDemoData, setIsDemoData] = useState(DEV_MODE);
    const [saveMessage, setSaveMessage] = useState("");
    const [error, setError] = useState("");

    const loadCandles = useCallback(async (nextSymbol, date) => {
        setIsLoading(true);
        setError("");
        setSaveMessage("");
        setSelectedCandle(null);
        try {
            const response = await fetch("/api/ohlc", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ symbol: nextSymbol, date }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "Unable to load session data.");
            }
            if (
                !Array.isArray(result.candles) ||
                !Array.isArray(result.entryCandles) ||
                !Array.isArray(result.entryTypeCandles) ||
                !Array.isArray(result.exitCandles)
            ) {
                throw new Error("The server returned an invalid training-data response.");
            }

            setSymbol(nextSymbol);
            setSelectedDate(date);
            setLoadedSymbol(nextSymbol);
            setLoadedDate(date);
            setCandles(result.candles);
            setEntryCandles(result.entryCandles);
            setEntryTypeCandles(result.entryTypeCandles);
            setExitCandles(result.exitCandles);
            setIsDemoData(false);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const setEntryType = useCallback((candleSequence, type) => {
        const entryTypeLabel = type === "long" ? 1 : type === "short" ? -1 : 0;
        setSaveMessage("");
        setError("");
        setEntryCandles((previous) =>
            previous.map((candle) =>
                candle.candleSequence === candleSequence
                    ? { ...candle, label: entryTypeLabel === 0 ? 0 : 1 }
                    : candle,
            ),
        );
        setEntryTypeCandles((previous) =>
            previous.map((candle) =>
                candle.candleSequence === candleSequence
                    ? { ...candle, label: entryTypeLabel }
                    : candle,
            ),
        );
    }, []);

    const canSave =
        !isDemoData &&
        !isLoading &&
        !isSaving &&
        Boolean(symbol && selectedDate && candles.length) &&
        symbol === loadedSymbol &&
        selectedDate === loadedDate;

    const saveLabels = useCallback(async () => {
        if (!canSave) {
            setError("Load the selected instrument and date before saving labels.");
            return;
        }

        setIsSaving(true);
        setError("");
        setSaveMessage("");
        try {
            const response = await fetch("/api/save-labels", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    symbol,
                    date: selectedDate,
                    entryCandles,
                    entryTypeCandles,
                    exitCandles,
                }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "Unable to save training labels.");
            }
            setSaveMessage(result.message || "Training labels saved successfully.");
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSaving(false);
        }
    }, [canSave, entryCandles, entryTypeCandles, exitCandles, selectedDate, symbol]);

    const value = {
        symbol,
        setSymbol,
        selectedDate,
        setSelectedDate,
        candles,
        entryCandles,
        entryTypeCandles,
        exitCandles,
        isDemoData,
        canSave,
        selectedCandle,
        setSelectedCandle,
        setEntryType,
        loadCandles,
        saveLabels,
        isLoading,
        isSaving,
        saveMessage,
        error,
    };

    return (
        <TrainingDataContext.Provider value={value}>
            {children}
        </TrainingDataContext.Provider>
    );
}
