import Input from "./Input.jsx";
import Button from "./Button.jsx";
import { useState } from "react";
import { DEV_MODE, candles } from "../DevMode.js";

export default function Toolbar({ setOhlc, ohlc }) {
    const [symbol, setSymbol] = useState("ONGC");
    const [date, setDate] = useState("");

    // ---------------- FETCH OHLC ----------------
    async function loadData() {
        try {
            let data;

            if (DEV_MODE) {
                // DEV: data already exists
                data = candles;
            } else {
                const res = await fetch(
                    "https://localhost:8888/api/ohlc",
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ symbol, date }),
                    }
                );

                if (!res.ok) {
                    throw new Error("Failed to fetch OHLC data");
                }

                data = await res.json();
            }

            //console.log("Loaded OHLC:", data.length);
            setOhlc(data);

        } catch (error) {
            alert(error.message);
        }
    }

    // ---------------- SAVE LABELS ----------------
    async function saveData() {
        const confirmed = window.confirm(
            "Are you sure you want to SAVE entry and exit candles?"
        );
        if (!confirmed) return;

        const entryCandles = ohlc.filter(c => c.label === 1);
        const exitCandles  = ohlc.filter(c => c.label === -1);

        try {
            if (entryCandles.length > 0) {
                await fetch(
                    "https://localhost:8888/api/write-entry-candles",
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(entryCandles),
                    }
                );
            }

            if (exitCandles.length > 0) {
                await fetch(
                    "https://localhost:8888/api/write-exit-candles",
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(exitCandles),
                    }
                );
            }

            alert("Saved successfully.");
        } catch (error) {
            alert("Failed to save candles.", error);
        }
    }

    // ---------------- RESET ----------------
    function resetData() {
        const confirmed = window.confirm(
            "This will CLEAR all candles. Continue?"
        );
        if (!confirmed) return;

        setOhlc([]);
    }

    return (
        <div className="flex items-center gap-4 p-4 border-b">
            <Input
                label="Symbol"
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
            />

            <Input
                label="Date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
            />

            <Button onClick={loadData}>
                Load Data
            </Button>

            <Button onClick={saveData}>
                Save
            </Button>

            <Button variant="danger" onClick={resetData}>
                Reset
            </Button>
        </div>
    );
}
