"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";
import * as React from "react";

export function ClerkThemeWrapper({ children }: { children: React.ReactNode }) {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    // Avoid bridge re-mounts by using a stable state until mounted
    const activeTheme = mounted && resolvedTheme === "dark" ? dark : undefined;

    return (
        <ClerkProvider
            appearance={{
                baseTheme: activeTheme,
                elements: {
                    formButtonPrimary: "bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-none",
                    footerActionLink: "text-indigo-600 hover:text-indigo-500 font-medium",
                },
            }}
        >
            {children}
        </ClerkProvider>
    );
}
