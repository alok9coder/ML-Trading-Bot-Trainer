import { useState } from "react";
import Toolbar from "./components/Toolbar.jsx";
import ChartLayout from "./components/ChartLayout.jsx";

export default function App() {
    const [ohlc, setOhlc] = useState([]);

    return (
        <div className="h-screen flex flex-col">
            <Toolbar ohlc={ohlc} setOhlc={setOhlc} />
            <ChartLayout ohlc={ohlc} />
        </div>
    );
}
