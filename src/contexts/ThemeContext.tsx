'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme, THEMES, getRandomTheme, ThemeName } from '@/lib/themes';

interface ThemeContextType {
    currentTheme: Theme;
    setThemeByName: (name: ThemeName) => void;
    randomizeTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    // Default to first theme initially to match server render, then randomized on mount
    const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[0]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // "Everytime I click on create events section it appears with new colour theme"
        setMounted(true);
        setCurrentTheme(getRandomTheme());
    }, []);

    const setThemeByName = (name: ThemeName) => {
        const theme = THEMES.find(t => t.name === name);
        if (theme) {
            setCurrentTheme(theme);
        }
    };

    const randomizeTheme = () => {
        let newTheme = getRandomTheme();
        // Try to get a different one
        while (newTheme.name === currentTheme.name && THEMES.length > 1) {
            newTheme = getRandomTheme();
        }
        setCurrentTheme(newTheme);
    };

    // Apply CSS variables to the root or a specific container
    // We apply them to a style object that can be spread onto the container
    const themeStyles = {
        '--accent-main': currentTheme.colors.accentMain,
        '--accent-secondary': currentTheme.colors.accentSecondary,
        '--accent-glow': currentTheme.colors.accentGlow,
        '--bg-glow': currentTheme.colors.bgGlow,
        '--accent-solid': currentTheme.colors.accentSolid,
        '--bg-page': currentTheme.colors.bgPage,
    } as React.CSSProperties;

    return (
        <ThemeContext.Provider value={{ currentTheme, setThemeByName, randomizeTheme }}>
            <div style={themeStyles} className="contents">
                {children}
            </div>
        </ThemeContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
