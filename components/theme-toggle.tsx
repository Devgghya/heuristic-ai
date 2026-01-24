"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
    const { theme, resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    // Avoid hydration mismatch by waiting for mount
    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return (
        <div className="p-2.5 w-10 h-10 rounded-xl border border-border-dim bg-foreground/5 animate-pulse" />
    );

    const toggleTheme = () => {
        const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
        console.log(`[ThemeToggle] Current theme: ${theme}, Resolved: ${resolvedTheme} -> Setting to: ${nextTheme}`);
        setTheme(nextTheme);
    };

    return (
        <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-border-dim bg-foreground/5 hover:bg-foreground/10 transition-all duration-300 group relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
            aria-label="Toggle theme"
        >
            <div className="relative z-10">
                {resolvedTheme === "dark" ? (
                    <Sun className="w-5 h-5 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
                ) : (
                    <Moon className="w-5 h-5 text-accent-primary group-hover:-rotate-12 transition-transform duration-300" />
                )}
            </div>
            <div className="absolute inset-0 bg-accent-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
    );
}
