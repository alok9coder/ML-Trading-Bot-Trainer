import { LABELS } from "../state/labelTypes.js";

export default function Selector({ index, ohlc, setOhlc, close }) {

    function setLabel(label) {
        const copy = [...ohlc];
        copy[index] = {
            ...copy[index],
            label,
        };
        setOhlc(copy);
        close();
    }

    return (
        <div className="absolute left-1/2 top-20 -translate-x-1/2 bg-white border shadow-lg p-3 rounded z-50">
            <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setLabel(LABELS.NONE)}>Nothing</button>
                <button onClick={() => setLabel(LABELS.HOLD)}>Hold</button>

                <button onClick={() => setLabel(LABELS.LONG_ENTRY)}>Long Entry</button>
                <button onClick={() => setLabel(LABELS.SHORT_ENTRY)}>Short Entry</button>

                <button onClick={() => setLabel(LABELS.LONG_EXIT)}>Long Exit</button>
                <button onClick={() => setLabel(LABELS.SHORT_EXIT)}>Short Exit</button>
            </div>
        </div>
    );
}
