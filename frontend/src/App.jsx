import { useEffect, useState } from "react";
import AppHeader from "./components/AppHeader.jsx";
import ChartLayout from "./components/ChartLayout.jsx";
import LabelDialog from "./components/LabelDialog.jsx";
import { TrainingDataProvider } from "./context/TrainingDataProvider.jsx";

const THEME_STYLES = {
    dark: {
        "--page-bg": "#0b1014",
        "--surface": "#11181c",
        "--surface-raised": "#151e21",
        "--surface-input": "#0c1215",
        "--surface-details": "#0e1518",
        "--border": "#222c30",
        "--border-soft": "#303c40",
        "--text": "#e7ecec",
        "--text-primary": "#e7eeea",
        "--text-muted": "#899794",
        "--text-subtle": "#71817e",
        "--accent": "#70cba1",
        "--input-text": "#e6ece9",
        "--hover": "#23332d",
        "--chart-bg": "#0d1417",
        "--chart-grid": "#253034",
        "--dialog-bg": "#121a1e",
        "--switch-bg": "#0f171a",
        "--switch-border": "#29363a",
        "--knob-bg": "#a5b0ab",
        "--scroll-thumb": "#35433e",
    },
    light: {
        "--page-bg": "#f2f6f4",
        "--surface": "#ffffff",
        "--surface-raised": "#ffffff",
        "--surface-input": "#fbfdfc",
        "--surface-details": "#f5f8f6",
        "--border": "#dce5e1",
        "--border-soft": "#cdd9d3",
        "--text": "#1d2b26",
        "--text-primary": "#2b4035",
        "--text-muted": "#697a73",
        "--text-subtle": "#71817a",
        "--accent": "#4c9a70",
        "--input-text": "#263a31",
        "--hover": "#edf5f0",
        "--chart-bg": "#f8fbf9",
        "--chart-grid": "#dfe8e3",
        "--dialog-bg": "#ffffff",
        "--switch-bg": "#f8faf9",
        "--switch-border": "#dce5e1",
        "--knob-bg": "#73847a",
        "--scroll-thumb": "#c4d2ca",
    },
};

function localDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function latestWeekday() {
    const date = new Date();
    while (date.getDay() === 0 || date.getDay() === 6) {
        date.setDate(date.getDate() - 1);
    }
    return localDateString(date);
}

function Workspace({ theme, setTheme }) {
    return (
        <main
            className="flex h-screen w-full flex-col overflow-hidden bg-[var(--page-bg)] text-[var(--text)] transition-colors duration-200"
            data-theme={theme}
            style={{
                ...THEME_STYLES[theme],
                fontFamily:
                    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                backgroundImage:
                    theme === "dark"
                        ? "radial-gradient(ellipse at 82% -15%, rgba(35, 91, 77, 0.18), transparent 38%)"
                        : "radial-gradient(ellipse at 82% -15%, rgba(90, 160, 115, 0.08), transparent 38%)",
            }}
        >
            <AppHeader theme={theme} onThemeChange={setTheme} />
            <ChartLayout />
            <LabelDialog />
        </main>
    );
}

export default function App() {
    const [theme, setTheme] = useState(
        () => localStorage.getItem("zennith-algo-theme") === "light" ? "light" : "dark",
    );

    useEffect(() => {
        localStorage.setItem("zennith-algo-theme", theme);
    }, [theme]);

    return (
        <TrainingDataProvider initialDate={latestWeekday()}>
            <Workspace theme={theme} setTheme={setTheme} />
        </TrainingDataProvider>
    );
}
