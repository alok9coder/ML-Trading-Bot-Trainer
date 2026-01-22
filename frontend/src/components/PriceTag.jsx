export default function PriceTag({ price, y, floating }) {
    return (
        <div
            className={`absolute text-xs px-1 rounded border ${
                floating ? "bg-black text-white z-50" : "bg-white text-black"
            }`}
            style={{
                top: y - 10,
                right: 2,
            }}
        >
            {price.toFixed(2)}
        </div>
    );
}
