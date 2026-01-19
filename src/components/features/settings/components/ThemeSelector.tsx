/**
 * Theme Selector Component
 * Production-grade theme selector with Firestore persistence
 */

'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { Theme } from '@/types/settings';

export default function ThemeSelector() {
    const { settings, updateTheme } = useUserSettings();
    const currentTheme = settings?.theme ?? 'dark';

    const options: { value: Theme; label: string; icon: typeof Monitor }[] = [
        { value: 'system', label: 'System', icon: Monitor },
        { value: 'light', label: 'Light', icon: Sun },
        { value: 'dark', label: 'Dark', icon: Moon },
    ];

    return (
        <div className="grid grid-cols-3 gap-4">
            {options.map((option) => (
                <button
                    key={option.value}
                    onClick={() => updateTheme(option.value)}
                    className={`
                        relative flex flex-col items-center gap-3 p-4 rounded-xl border transition-all
                        ${currentTheme === option.value
                            ? 'bg-white/10 border-accent text-accent'
                            : 'bg-white/5 border-white/5 text-text-secondary hover:bg-white/10 hover:border-white/10'
                        }
                    `}
                >
                    <option.icon size={24} />
                    <span className="text-sm font-medium">{option.label}</span>
                    {currentTheme === option.value && (
                        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_rgba(235,94,40,0.8)]" />
                    )}
                </button>
            ))}
        </div>
    );
}
