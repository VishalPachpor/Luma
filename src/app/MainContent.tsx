'use client';
import { Suspense } from 'react';
import { Settings } from 'lucide-react';
import { Event, Category, FeaturedCalendar } from '@/types';
import { City } from '@/types/city';
import { useStore } from '@/store/useStore';
import { Footer } from '@/components/components/layout';
import EventList from '@/components/features/events/EventList';
import MyEventsList from '@/components/features/events/MyEventsList';
import CalendarView from '@/components/features/calendar/CalendarView';
import CategoryDiscovery from '@/components/features/discovery/CategoryDiscovery';
import FilteredEvents from '@/components/features/discovery/FilteredEvents';
import SettingsLayout from '@/components/features/settings/SettingsLayout';
import { EventDetailModal } from '@/components/modals';

interface MainContentProps {
    events: Event[];
    categories: Category[];
    featuredCalendars: FeaturedCalendar[];
    cities: City[];
}

export default function MainContent({
    events,
    categories,
    featuredCalendars,
    cities,
}: MainContentProps) {
    const { activeTab, searchQuery, selectedCategory } = useStore();

    const renderContent = () => {
        if (searchQuery.length > 0) {
            return <EventList events={events} />;
        }

        switch (activeTab) {
            case 'myevents':
                return <MyEventsList />;
            case 'calendar':
                return <CalendarView />;
            case 'alerts':
                return <EventList events={events} />;
            case 'discovery':
                if (selectedCategory) {
                    return <FilteredEvents events={events} categories={categories} />;
                }
                return (
                    <CategoryDiscovery
                        categories={categories}
                        featuredCalendars={featuredCalendars}
                        cities={cities}
                    />
                );
            case 'settings':
                return <SettingsLayout />;
            default:
                return (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 surface-2 glass-morphism rounded-2xl flex items-center justify-center mb-4">
                            <Settings size={32} className="text-text-muted" />
                        </div>
                        <h3 className="text-xl font-semibold text-text-primary">
                            Under Construction
                        </h3>
                        <p className="text-text-secondary mt-2">
                            This section is coming soon.
                        </p>
                    </div>
                );
        }
    };

    // Page header based on active tab
    const renderHeader = () => {
        const headers: Record<string, { title: string; subtitle: string }> = {
            discovery: {
                title: 'Discover Events',
                subtitle: 'Explore popular events near you, browse by category, or check out some of the great community calendars.',
            },
            myevents: {
                title: 'My Events',
                subtitle: 'Events you\'re hosting or attending.',
            },
            calendar: {
                title: 'Calendars',
                subtitle: 'Subscribe to calendars to stay updated with your favorite communities.',
            },
            settings: {
                title: 'Settings',
                subtitle: 'Manage your account and preferences.',
            },
        };

        const header = headers[activeTab] || headers.discovery;

        return (
            <header className="mb-12">
                <h1 className="text-[2.5rem] font-bold text-text-primary tracking-tight leading-tight">
                    {header.title}
                </h1>
                <p className="text-text-secondary mt-2 max-w-2xl text-base leading-relaxed">
                    {header.subtitle}
                </p>
            </header>
        );
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#0E0F13]">

            {/* Main Content - Centered with generous side spacing like Luma */}
            <main className="flex-1">
                <div className="max-w-[800px] mx-auto px-8 pt-4 pb-10 scroll-mt-16">
                    {renderHeader()}
                    <Suspense fallback={
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="skeleton h-32 rounded-xl" />
                            ))}
                        </div>
                    }>
                        <div>{renderContent()}</div>
                    </Suspense>
                </div>
            </main>

            <Footer />
            <EventDetailModal events={events} />
        </div >
    );
}

