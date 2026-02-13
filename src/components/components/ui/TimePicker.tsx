'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, Clock } from 'lucide-react';

interface TimePickerProps {
    value: string; // "HH:mm" format
    onChange: (value: string) => void;
    label?: string;
}

export default function TimePicker({ value, onChange, label, themeColor = '#FFFFFF', className }: TimePickerProps & { themeColor?: string, className?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Parse current value
    const [hours, minutes] = value ? value.split(':').map(Number) : [12, 0];
    const isPM = hours >= 12;
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const setTime = (h: number, m: number, pm: boolean) => {
        let h24 = h;
        if (pm && h !== 12) h24 = h + 12;
        if (!pm && h === 12) h24 = 0;
        onChange(`${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    };

    const incrementHour = () => {
        const newHour = displayHour >= 12 ? 1 : displayHour + 1;
        const newPM = displayHour === 11 ? !isPM : isPM;
        setTime(newHour, minutes, newPM);
    };

    const decrementHour = () => {
        const newHour = displayHour <= 1 ? 12 : displayHour - 1;
        const newPM = displayHour === 12 ? !isPM : isPM;
        setTime(newHour, minutes, newPM);
    };

    const incrementMinute = () => {
        const newMin = (minutes + 15) % 60;
        if (newMin < minutes) incrementHour();
        else setTime(displayHour, newMin, isPM);
    };

    const decrementMinute = () => {
        const newMin = minutes === 0 ? 45 : minutes - 15;
        if (newMin > minutes) decrementHour();
        else setTime(displayHour, newMin, isPM);
    };

    const toggleAMPM = () => {
        setTime(displayHour, minutes, !isPM);
    };

    const displayTime = value
        ? new Date('2000-01-01T' + value).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        })
        : 'Select time';

    return (
        <div ref={containerRef} className={`relative ${className || 'w-full'}`}>
            {/* Trigger */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="bg-white/10 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-white/15 transition-colors select-none whitespace-nowrap"
            >
                <span className="text-[13px] text-white font-medium">{displayTime}</span>
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full mt-2 z-50 bg-[#1a1c1e] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                    style={{ minWidth: 180 }}
                >
                    <div className="flex items-center justify-center gap-1 p-4">
                        {/* Hour */}
                        <div className="flex flex-col items-center">
                            <button
                                onClick={incrementHour}
                                style={{ color: themeColor }}
                                className="p-1 opacity-50 hover:opacity-100 transition-opacity"
                            >
                                <ChevronUp size={16} />
                            </button>
                            <div className="w-12 h-10 flex items-center justify-center bg-white/8 rounded-lg">
                                <span className="text-xl font-semibold text-white tabular-nums">
                                    {String(displayHour).padStart(2, '0')}
                                </span>
                            </div>
                            <button
                                onClick={decrementHour}
                                style={{ color: themeColor }}
                                className="p-1 opacity-50 hover:opacity-100 transition-opacity"
                            >
                                <ChevronDown size={16} />
                            </button>
                        </div>

                        <span className="text-xl font-semibold text-white/40 mx-0.5">:</span>

                        {/* Minute */}
                        <div className="flex flex-col items-center">
                            <button
                                onClick={incrementMinute}
                                style={{ color: themeColor }}
                                className="p-1 opacity-50 hover:opacity-100 transition-opacity"
                            >
                                <ChevronUp size={16} />
                            </button>
                            <div className="w-12 h-10 flex items-center justify-center bg-white/8 rounded-lg">
                                <span className="text-xl font-semibold text-white tabular-nums">
                                    {String(minutes).padStart(2, '0')}
                                </span>
                            </div>
                            <button
                                onClick={decrementMinute}
                                style={{ color: themeColor }}
                                className="p-1 opacity-50 hover:opacity-100 transition-opacity"
                            >
                                <ChevronDown size={16} />
                            </button>
                        </div>

                        {/* AM/PM */}
                        <div className="flex flex-col items-center ml-2">
                            <button
                                onClick={toggleAMPM}
                                style={{ color: themeColor }}
                                className="p-1 opacity-50 hover:opacity-100 transition-opacity"
                            >
                                <ChevronUp size={16} />
                            </button>
                            <div
                                onClick={toggleAMPM}
                                className="w-12 h-10 flex items-center justify-center bg-white/8 rounded-lg cursor-pointer hover:bg-white/12 transition-colors relative overflow-hidden"
                            >
                                <span className="text-sm font-semibold text-white relative z-10">
                                    {isPM ? 'PM' : 'AM'}
                                </span>
                                {/* Active indicator stripe */}
                                <div
                                    className="absolute bottom-0 left-0 right-0 h-1 transition-all"
                                    style={{ backgroundColor: themeColor }}
                                />
                            </div>
                            <button
                                onClick={toggleAMPM}
                                style={{ color: themeColor }}
                                className="p-1 opacity-50 hover:opacity-100 transition-opacity"
                            >
                                <ChevronDown size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Quick select */}
                    <div className="border-t border-white/8 px-3 py-2 flex flex-wrap gap-1">
                        {['09:00', '12:00', '14:00', '17:00', '19:00', '21:00'].map((t) => {
                            const d = new Date('2000-01-01T' + t);
                            const label = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                            const isSelected = value === t;
                            return (
                                <button
                                    key={t}
                                    onClick={() => { onChange(t); setIsOpen(false); }}
                                    className="text-[11px] px-2 py-1 rounded-md transition-all"
                                    style={{
                                        backgroundColor: isSelected ? themeColor : 'transparent',
                                        color: isSelected ? '#000' : 'rgba(255,255,255,0.5)',
                                        fontWeight: isSelected ? 600 : 400
                                    }}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
