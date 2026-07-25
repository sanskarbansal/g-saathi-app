import React, { createContext, useContext } from "react";

import { theme as defaultTheme, type Theme } from "./tokens";

/**
 * A context-backed theme so components read tokens via `useTheme()`. The theme is
 * currently static (light, field-optimized); the context keeps a future dark or
 * high-contrast mode a drop-in with no component rewrites.
 */
const ThemeContext = createContext<Theme>(defaultTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    return <ThemeContext.Provider value={defaultTheme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
    return useContext(ThemeContext);
}
