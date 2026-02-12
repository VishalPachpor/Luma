/**
 * Visibility Toggle Component
 * Dropdown for selecting event visibility (Public/Private)
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Globe, Lock, Check } from 'lucide-react';

export type EventVisibility = 'public' | 'private';

interface VisibilityToggleProps {
    value: EventVisibility;
    onChange: (visibility: EventVisibility) => void;
}

const visibilityOptions: { value: EventVisibility; label: string; icon: typeof Globe; description: string }[] = [
    {
        value: 'public',
        label: 'Public',
        icon: Globe,
        description: 'Anyone can discover and find this event',
    },
    {
        value: 'private',
        label: 'Private',
        icon: Lock,
        description: 'Only people with the link can access',
    },
];

export function VisibilityToggle({ value, onChange }: VisibilityToggleProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selected = visibilityOptions.find((o) => o.value === value) || visibilityOptions[0];
    const Icon = selected.icon;

    return (
        <div ref={dropdownRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-all"
            >
                <Icon size={14} className={value === 'public' ? 'text-green-400' : 'text-yellow-400'} />
                <span className="text-xs font-semibold text-text-primary">{selected.label}</span>
                <ChevronDown size={14} className={`text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-bg-elevated border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 border-b border-white/10">
                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest px-2">
                            Event Visibility
                        </p>
                    </div>

                    <div className="p-1">
                        {visibilityOptions.map((option) => {
                            const OptionIcon = option.icon;
                            const isSelected = value === option.value;

                            return (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-white/5 transition-colors ${isSelected ? 'bg-white/10' : ''
                                        }`}
                                >
                                    <div className={`p-2 rounded-lg ${option.value === 'public'
                                        ? 'bg-green-500/20 text-green-400'
                                        : 'bg-yellow-500/20 text-yellow-400'
                                        }`}>
                                        <OptionIcon size={16} />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-medium text-text-primary flex items-center gap-2">
                                            {option.label}
                                            {isSelected && <Check size={14} className="text-accent" />}
                                        </p>
                                        <p className="text-xs text-text-muted mt-0.5">
                                            {option.description}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {value === 'private' && (
                        <div className="px-4 pb-3">
                            <p className="text-xs text-text-muted bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                                💡 Share the event link directly with people you want to invite.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
