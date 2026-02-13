'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday
} from 'date-fns';

interface DatePickerProps {
    value: string; // YYYY-MM-DD format
    onChange: (value: string) => void;
    label?: string;
    themeColor?: string;
}

export default function DatePicker({ value, onChange, label, themeColor = '#FFFFFF', className }: DatePickerProps & { className?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initialize current month from value or today
    const [currentMonth, setCurrentMonth] = useState(() =>
        value ? new Date(value) : new Date()
    );

    // Update current month if value changes externally while open? 
    // Usually better to keep user navigation state, unless value changes to something far away.
    // Let's strictly rely on internal navigation state for the view.

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

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const onDateClick = (day: Date) => {
        onChange(format(day, 'yyyy-MM-dd'));
        setIsOpen(false);
    };

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const formattedDate = value
        ? new Date(value + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        })
        : 'Select date';

    const selectedDate = value ? new Date(value + 'T00:00:00') : null;

    return (
        <div ref={containerRef} className={`relative ${className || 'w-full'}`}>
            {/* Trigger */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="bg-white/10 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-white/15 transition-colors select-none flex items-center gap-2 group whitespace-nowrap"
            >
                {/* <CalendarIcon size={14} className="text-white/50 group-hover:text-white/80 transition-colors" /> */}
                <span className="text-[13px] text-white font-medium truncate">{formattedDate}</span>
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full mb-2 z-50 bg-[#1a1c1e] border border-white/10 rounded-xl shadow-2xl p-4 min-w-[280px]"
                    style={{ marginTop: '8px' }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={prevMonth} className="p-1 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors">
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-sm font-semibold text-white">
                            {format(currentMonth, 'MMMM yyyy')}
                        </span>
                        <button onClick={nextMonth} className="p-1 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors">
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Week Days */}
                    <div className="grid grid-cols-7 mb-2">
                        {weekDays.map((day, i) => (
                            <div key={i} className="text-center text-[11px] font-medium text-white/40">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {days.map((day, i) => {
                            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                            const isCurrentMonth = isSameMonth(day, currentMonth);
                            const isDateToday = isToday(day);

                            return (
                                <button
                                    key={i}
                                    onClick={() => onDateClick(day)}
                                    className={`
                                        h-8 w-8 rounded-lg flex items-center justify-center text-[12px] font-medium transition-all
                                        ${!isCurrentMonth ? 'text-white/20' : 'text-white/90'}
                                        ${!isSelected && isCurrentMonth ? 'hover:bg-white/10' : ''}
                                    `}
                                    style={{
                                        backgroundColor: isSelected ? themeColor : 'transparent',
                                        color: isSelected ? '#000' : undefined,
                                        fontWeight: isSelected ? 600 : undefined,
                                        boxShadow: isDateToday && !isSelected ? `0 0 0 1px ${themeColor}60` : 'none'
                                    }}
                                >
                                    {format(day, dateFormat)}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/10 flex justify-between">
                        <button
                            onClick={() => { onChange(''); setIsOpen(false); }}
                            className="text-[11px] text-white/50 hover:text-white transition-colors"
                        >
                            Clear
                        </button>
                        <button
                            onClick={() => {
                                const today = new Date();
                                onChange(format(today, 'yyyy-MM-dd'));
                                setCurrentMonth(today);
                                // setIsOpen(false); // Keep open or close? Typically keep open allowing to see
                            }}
                            className="text-[11px] font-medium"
                            style={{ color: themeColor }}
                        >
                            Today
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
