import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Event } from '@/types';
import EventSubmissionMenu from './EventSubmissionMenu';
import ICalTooltip from './ICalTooltip';

interface HostCalendarWidgetProps {
    events: Event[];
    filter: 'upcoming' | 'past';
    onFilterChange: (filter: 'upcoming' | 'past') => void;
}

export default function HostCalendarWidget({ events, filter, onFilterChange }: HostCalendarWidgetProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const monthName = currentDate.toLocaleString('default', { month: 'long' });
    const year = currentDate.getFullYear();

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    // Check if a day has an event
    const hasEvent = (day: number) => {
        return events.some(event => {
            const eventDate = new Date(event.date);
            return (
                eventDate.getDate() === day &&
                eventDate.getMonth() === currentDate.getMonth() &&
                eventDate.getFullYear() === currentDate.getFullYear()
            );
        });
    };

    const isToday = (day: number) => {
        const today = new Date();
        return (
            day === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear()
        );
    };

    return (
        <div className="space-y-6">
            {/* Actions */}
            <div className="flex gap-2 relative z-50">
                <EventSubmissionMenu />
                <ICalTooltip />
            </div>

            {/* Calendar */}
            <div className="bg-[#1E1E1E] rounded-2xl p-4 border border-white/5 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-bold text-base">{monthName}</h3>
                    <div className="flex gap-1">
                        <button onClick={prevMonth} className="p-1 text-white/40 hover:text-white transition-colors">
                            <ChevronLeft size={14} />
                        </button>
                        <button onClick={nextMonth} className="p-1 text-white/40 hover:text-white transition-colors">
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-y-2 gap-x-1 text-center text-[10px] mb-2">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                        <div key={i} className="text-white/30 font-medium pb-2">
                            {day}
                        </div>
                    ))}

                    {Array.from({ length: (firstDayOfMonth + 6) % 7 }).map((_, i) => (
                        <div key={`empty-${i}`} />
                    ))}

                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const hasEventResult = hasEvent(day);
                        const isTodayResult = isToday(day);

                        return (
                            <div key={day} className="flex flex-col items-center gap-0.5 cursor-pointer group">
                                <div
                                    className={`
                                        w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium transition-colors
                                        ${isTodayResult ? 'bg-white text-black' : 'text-white/80 group-hover:bg-white/10'}
                                    `}
                                >
                                    {day}
                                </div>
                                <div className={`w-1 h-1 rounded-full ${hasEventResult ? 'bg-white' : 'bg-transparent'}`} />
                            </div>
                        );
                    })}
                </div>

                {/* Filter Toggle */}
                <div className="flex bg-black/40 p-0.5 rounded-lg mt-4">
                    <button
                        onClick={() => onFilterChange('upcoming')}
                        className={`flex-1 text-[10px] font-semibold py-1.5 rounded-md transition-all ${filter === 'upcoming' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/60'}`}
                    >
                        Upcoming
                    </button>
                    <button
                        onClick={() => onFilterChange('past')}
                        className={`flex-1 text-[10px] font-semibold py-1.5 rounded-md transition-all ${filter === 'past' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/60'}`}
                    >
                        Past
                    </button>
                </div>
            </div>
        </div>
    );
}
