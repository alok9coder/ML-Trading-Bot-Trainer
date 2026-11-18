import Toolbar from "./Toolbar.jsx";

export default function AppHeader({ theme, onThemeChange }) {
    return (
        <header className="relative z-30 flex h-[72px] w-full shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)]/90 px-3 sm:gap-4 sm:px-5">
            <a
                className="inline-flex shrink-0 items-center gap-[11px] text-[13px] font-bold tracking-[0.12em] text-[var(--text-primary)] no-underline"
                href="/"
                aria-label="Zennith Algo home"
            >
                <span className="grid h-[30px] w-[30px] place-items-center rounded-lg border border-emerald-500/70 text-[17px] tracking-normal text-emerald-500">
                    Z
                </span>
                <span className="hidden 2xl:inline">
                    ZENNITH<span className="font-medium text-[var(--text-subtle)]"> / ALGO LAB</span>
                </span>
            </a>

            <Toolbar theme={theme} />

            <div className="flex shrink-0 items-center gap-2 sm:gap-[18px]">
                <button
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2 text-[10px] font-semibold text-[var(--text-primary)] transition hover:border-emerald-600/60 hover:brightness-105 sm:px-2.5"
                    type="button"
                    aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
                    aria-pressed={theme === "light"}
                    onClick={() => onThemeChange(theme === "dark" ? "light" : "dark")}
                >
                    <span className="text-sm text-amber-500" aria-hidden="true">
                        {theme === "dark" ? "☀" : "☾"}
                    </span>
                    <span className="hidden md:inline">
                        {theme === "dark" ? "Light mode" : "Dark mode"}
                    </span>
                </button>
                <div className="hidden items-center text-[10px] font-bold tracking-[0.13em] text-[var(--text-muted)] xl:flex">
                    <span className="mr-2 inline-block h-[7px] w-[7px] rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(111,218,161,0.7)]" />
                    <span className="hidden xl:inline">MANUAL LABELING</span>
                </div>
            </div>
        </header>
    );
}
