export default function Input({
    label,
    type = "text",
    value,
    onChange,
}) {
    return (
        <div className="flex flex-col">
            <label className="text-xs">{label}</label>
            <input
                type={type}
                value={value}
                onChange={onChange}
                className="border px-2 py-1 rounded"
            />
        </div>
    );
}
