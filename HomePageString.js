export const homepage = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Candle Labeling Tool (Sequence Based)</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- Lightweight Charts v4 -->
    <script src="https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js"></script>

    <style>
        body {
            background: #f5f6f8;
            color: #111;
            font-family: system-ui, sans-serif;
            padding: 20px;
        }

        h2 {
            margin-bottom: 10px;
        }

        label {
            font-weight: 600;
            margin-right: 5px;
        }

        input, button {
            padding: 8px 12px;
            margin: 5px 6px 5px 0;
            background: #ffffff;
            color: #111;
            border: 1px solid #ccc;
            border-radius: 4px;
            cursor: pointer;
        }

        button:hover {
            background: #e9eaec;
        }

        #chart {
            width: 100%;
            max-width: 1200px;
            height: 420px;
            background: #ffffff;
            border: 1px solid #ccc;
            margin-top: 10px;
            position: relative;
        }

        #tooltip {
            position: absolute;
            background: #ffffff;
            border: 1px solid #ccc;
            padding: 8px 10px;
            font-size: 12px;
            pointer-events: none;
            display: none;
            box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }
    </style>
</head>
<body>

<h2>📊 Candle Labeling Tool (Sequence Based)</h2>

<label>Symbol:</label>
<input id="symbolInput" value="ONGC">

<label>Date:</label>
<input type="date" id="dateInput">

<button onclick="loadCandles()">GET Candles</button>

<hr>

<div id="chart">
    <div id="tooltip"></div>
</div>

<div style="margin-top:15px;">
    <button onclick="setLabel(1)">BUY</button>
    <button onclick="setLabel(0)">HOLD</button>
    <button onclick="setLabel(-1)">SELL</button>
</div>

<div style="margin-top:20px;">
    <button onclick="dumpLabeledData()">DUMP TO CONSOLE</button>
    <button onclick="resetDay()">RESET</button>
</div>

<script>
    let candles = [];
    let selectedIndex = null;

    const chartContainer = document.getElementById("chart");
    const tooltip = document.getElementById("tooltip");

    const chart = LightweightCharts.createChart(chartContainer, {
        layout: {
            background: { color: "#ffffff" },
            textColor: "#111"
        },
        grid: {
            vertLines: { color: "#e0e0e0" },
            horzLines: { color: "#e0e0e0" }
        },
        timeScale: {
            timeVisible: true,
            secondsVisible: true,
            rightBarStaysOnScroll: true,
            fixLeftEdge: true
        },
        rightPriceScale: {
            borderColor: "#cccccc"
        },
        crosshair: {
            mode: LightweightCharts.CrosshairMode.Normal
        }
    });

    const candleSeries = chart.addCandlestickSeries({
        upColor: "#2ecc71",
        downColor: "#e74c3c",
        borderUpColor: "#27ae60",
        borderDownColor: "#c0392b",
        wickUpColor: "#27ae60",
        wickDownColor: "#c0392b"
    });

    async function loadCandles() {
        const date = document.getElementById("dateInput").value;
        const symbol = document.getElementById("symbolInput").value.trim().toUpperCase();

        if (!date || !symbol) {
            alert("Symbol and Date required");
            return;
        }

        const res = await fetch("/api/ohlc", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbol: symbol, date: date })
        });

        candles = await res.json();
        candles.forEach(function (c) {
            if (c.label === undefined || c.label === null) {
                c.label = 0;
            }
        });

        candleSeries.setData(
            candles.map(function (c) {
                return {
                    time: c.candleSequence,
                    open: c.open,
                    high: c.high,
                    low: c.low,
                    close: c.close
                };
            })
        );

        selectedIndex = null;
        tooltip.style.display = "none";
    }

    chart.subscribeCrosshairMove(function (param) {
        if (!param.time || !param.seriesPrices || !param.seriesPrices.size) {
            tooltip.style.display = "none";
            return;
        }

        const seq = param.time;
        const idx = candles.findIndex(function (c) {
            return c.candleSequence === seq;
        });

        if (idx === -1) return;

        const c = candles[idx];

        tooltip.style.display = "block";
        tooltip.style.left = (param.point.x + 15) + "px";
        tooltip.style.top = (param.point.y + 15) + "px";

        tooltip.innerHTML =
            "<b>" + new Date(c.date).toLocaleString() + "</b><br>" +
            "O: " + c.open + " H: " + c.high + "<br>" +
            "L: " + c.low + " C: " + c.close + "<br>" +
            "Label: " + c.label;
    });

    chart.subscribeClick(function (param) {
        if (!param.time) return;

        selectedIndex = candles.findIndex(function (c) {
            return c.candleSequence === param.time;
        });

        if (selectedIndex !== -1) {
            console.log("Selected candle:", candles[selectedIndex]);
        }
    });

    function setLabel(value) {
        if (selectedIndex === null) {
            alert("Select a candle first");
            return;
        }
        candles[selectedIndex].label = value;
        console.log("Label updated:", candles[selectedIndex]);
    }

    function resetDay() {
        if (!confirm("Reset all labels to HOLD?")) return;
        candles.forEach(function (c) {
            c.label = 0;
        });
        selectedIndex = null;
    }

    function dumpLabeledData() {
        console.table(candles);
    }
</script>

</body>
</html>
`;

const demo = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Candlestick Chart – Lightweight Charts v4 (Stable)</title>

    <!-- ✅ PINNED VERSION (v4.1.x) -->
    <script src="https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js"></script>

    <style>
        body {
            margin: 0;
            background: #ffffff;
            font-family: Arial, sans-serif;
        }

        h2 {
            text-align: center;
            margin: 16px;
            color: #222;
        }

        #chart {
            width: 900px;
            height: 450px;
            margin: 0 auto;
            border: 1px solid #ddd;
        }
    </style>
</head>
<body>

<h2>Candlestick Chart (Light Mode — Stable)</h2>

<div id="chart"></div>

<script>
    const chart = LightweightCharts.createChart(
        document.getElementById('chart'),
        {
            layout: {
                background: { color: '#ffffff' },
                textColor: '#222',
            },
            grid: {
                vertLines: { color: '#e0e0e0' },
                horzLines: { color: '#e0e0e0' },
            },
            rightPriceScale: {
                borderColor: '#cccccc',
            },
            timeScale: {
                borderColor: '#cccccc',
            },
        }
    );

    // ✅ v4 API (WORKS IN STANDALONE)
    const candleSeries = chart.addCandlestickSeries({
        upColor: '#2ecc71',
        downColor: '#e74c3c',
        borderUpColor: '#27ae60',
        borderDownColor: '#c0392b',
        wickUpColor: '#27ae60',
        wickDownColor: '#c0392b',
    });

    candleSeries.setData([
        { time: '2026-01-01', open: 100, high: 120, low: 95,  close: 110 },
        { time: '2026-01-02', open: 110, high: 118, low: 102, close: 105 },
        { time: '2026-01-03', open: 105, high: 130, low: 104, close: 125 },
        { time: '2026-01-04', open: 125, high: 128, low: 110, close: 112 },
        { time: '2026-01-05', open: 112, high: 140, low: 111, close: 138 },
    ]);
</script>

</body>
</html>
`;

export const symbolClusterPage = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Symbol Super Cluster CSV</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <style>
        body {
            background: #f5f6f8;
            font-family: system-ui, sans-serif;
            padding: 40px;
            color: #111;
        }

        h2 {
            margin-bottom: 20px;
        }

        input, button {
            padding: 10px 14px;
            font-size: 14px;
            margin-right: 10px;
            border-radius: 4px;
            border: 1px solid #ccc;
        }

        button {
            cursor: pointer;
            background: #ffffff;
        }

        button:hover {
            background: #e9eaec;
        }

        #status {
            margin-top: 20px;
            font-weight: 600;
        }
    </style>
</head>
<body>

<h2>📦 Super Cluster CSV Generator</h2>

<label>Symbol:</label>
<input id="symbolInput" placeholder="ONGC" />

<button onclick="submitSymbol()">Generate CSV</button>

<div id="status"></div>

<script>
    async function submitSymbol() {
        const symbol = document.getElementById("symbolInput").value.trim().toUpperCase();
        const status = document.getElementById("status");

        if (!symbol) {
            alert("Symbol required");
            return;
        }

        status.innerText = "⏳ Processing...";

        try {
            const res = await fetch("/api/symbol-super-cluster-csv", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ symbol })
            });

            const data = await res.json();

            if (!res.ok) {
                status.innerText = "❌ Error: " + (data.error || "Unknown error");
            } else {
                status.innerText = "✅ CSV generated successfully";
                console.log(data);
            }
        } catch (err) {
            status.innerText = "❌ Request failed";
            console.error(err);
        }
    }
</script>

</body>
</html>
`;
