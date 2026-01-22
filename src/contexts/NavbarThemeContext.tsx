'use client';

/**
 * Navbar Theme Context
 * Allows pages to set the navbar's background color for immersive theming.
 * When a page sets a theme, the navbar's background smoothly transitions to match.
 */

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface NavbarThemeContextType {
    /** Current navbar background color (or undefined for default) */
    navbarBgColor: string | undefined;
    /** Set the navbar background color */
    setNavbarBgColor: (color: string | undefined) => void;
    /** Reset to default navbar styling */
    resetNavbarTheme: () => void;
}

const NavbarThemeContext = createContext<NavbarThemeContextType | undefined>(undefined);

export function NavbarThemeProvider({ children }: { children: ReactNode }) {
    const [navbarBgColor, setNavbarBgColorState] = useState<string | undefined>(undefined);

    const setNavbarBgColor = useCallback((color: string | undefined) => {
        setNavbarBgColorState(color);
    }, []);

    const resetNavbarTheme = useCallback(() => {
        setNavbarBgColorState(undefined);
    }, []);

    return (
        <NavbarThemeContext.Provider value={{ navbarBgColor, setNavbarBgColor, resetNavbarTheme }}>
            {children}
        </NavbarThemeContext.Provider>
    );
}

export const useNavbarTheme = () => {
    const context = useContext(NavbarThemeContext);
    if (context === undefined) {
        throw new Error('useNavbarTheme must be used within a NavbarThemeProvider');
    }
    return context;
};

/**
 * Hook for pages to set immersive navbar theme
 * Usage:
 *   useImmersiveNavbar('#051A10'); // Set forest green background
 *   useImmersiveNavbar(undefined); // Reset to default
 */
export const useImmersiveNavbar = (bgColor: string | undefined) => {
    const { setNavbarBgColor, resetNavbarTheme } = useNavbarTheme();

    React.useEffect(() => {
        setNavbarBgColor(bgColor);
        return () => resetNavbarTheme();
    }, [bgColor, setNavbarBgColor, resetNavbarTheme]);
};
