export default function Button({ children, onClick, variant = "default" }) {
    const styles =
        variant === "danger"
            ? "bg-red-500 text-white"
            : "bg-blue-500 text-white";

    return (
        <button
            onClick={onClick}
            className={`px-4 py-2 rounded ${styles}`}
        >
            {children}
        </button>
    );
}
