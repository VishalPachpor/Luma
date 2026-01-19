/**
 * Theme Definitions (Luma-style)
 * 
 * Defines the accent gradients and distinct characteristics for each theme.
 * The system uses CSS variables to apply these styles dynamically.
 */

export type ThemeName = 'Minimal' | 'Ocean' | 'Sunset' | 'Forest' | 'Midnight';

export interface Theme {
    name: ThemeName;
    label: string;
    colors: {
        accentMain: string;
        accentSecondary: string;
        accentGlow: string;
        bgGlow: string;
        accentSolid: string;
        bgPage: string;          // Immersive page background color
    };
}

export const THEMES: Theme[] = [
    {
        name: 'Minimal',
        label: 'Minimal',
        colors: {
            accentMain: 'linear-gradient(135deg, #FF7A18, #FFB347)',
            accentSecondary: 'linear-gradient(135deg, #FFB347, #FFCC33)',
            accentGlow: 'rgba(255, 122, 24, 0.5)',
            bgGlow: 'rgba(255, 122, 24, 0.05)',
            accentSolid: '#FF7A18',
            bgPage: '#0E0F13', // Standard Dark
        }
    },
    {
        name: 'Ocean',
        label: 'Ocean',
        colors: {
            accentMain: 'linear-gradient(135deg, #00C6FF, #0072FF)',
            accentSecondary: 'linear-gradient(135deg, #4FACFE, #00F2FE)',
            accentGlow: 'rgba(0, 198, 255, 0.5)',
            bgGlow: 'rgba(0, 198, 255, 0.05)',
            accentSolid: '#00C6FF',
            bgPage: '#0F172A', // Deep Slate/Navy
        }
    },
    {
        name: 'Sunset',
        label: 'Sunset',
        colors: {
            accentMain: 'linear-gradient(135deg, #FF512F, #DD2476)',
            accentSecondary: 'linear-gradient(135deg, #FF5F6D, #FFC371)',
            accentGlow: 'rgba(255, 81, 47, 0.5)',
            bgGlow: 'rgba(255, 81, 47, 0.05)',
            accentSolid: '#FF512F',
            bgPage: '#2A0A18', // Deep Plum
        }
    },
    {
        name: 'Forest',
        label: 'Forest',
        colors: {
            accentMain: 'linear-gradient(135deg, #11998e, #38ef7d)',
            accentSecondary: 'linear-gradient(135deg, #D4FC79, #96E6A1)',
            accentGlow: 'rgba(56, 239, 125, 0.5)',
            bgGlow: 'rgba(56, 239, 125, 0.05)',
            accentSolid: '#38ef7d',
            bgPage: '#051A10', // Deep Forest Green
        }
    },
    {
        name: 'Midnight',
        label: 'Midnight',
        colors: {
            accentMain: 'linear-gradient(135deg, #8E2DE2, #4A00E0)',
            accentSecondary: 'linear-gradient(135deg, #c471ed, #f64f59)',
            accentGlow: 'rgba(142, 45, 226, 0.5)',
            bgGlow: 'rgba(142, 45, 226, 0.05)',
            accentSolid: '#8E2DE2',
            bgPage: '#140526', // Deep Violet
        }
    }
];

export const getRandomTheme = (): Theme => {
    const randomIndex = Math.floor(Math.random() * THEMES.length);
    return THEMES[randomIndex];
};
