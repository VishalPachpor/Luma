import { eventRepository } from '@/lib/repositories';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DashboardTabs } from './DashboardTabs';

interface ManageLayoutProps {
    children: React.ReactNode;
    params: Promise<{ id: string }>;
}

export default async function ManageLayout({ children, params }: ManageLayoutProps) {
    const { id } = await params;
    const event = await eventRepository.findById(id);

    if (!event) {
        notFound();
    }

    return (
        <div className="min-h-screen pt-12 bg-[#13151A]">
            {/* Header */}
            <header className="sticky top-12 z-40 pt-6 border-b border-white/5 backdrop-blur-md bg-[#0b0f1a]/50">
                <div className="max-w-[800px] mx-auto px-6">
                    <div className="flex items-center justify-between pb-6">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-1.5 text-[#888888] text-[13px] font-medium animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <Link href="/calendars" className="hover:text-white transition-colors">Personal</Link>
                                <span className="text-[#444444]">›</span>
                            </div>
                            <h1 className="text-3xl font-semibold text-white tracking-tight leading-tight animate-in fade-in slide-in-from-bottom-3 duration-500 delay-75">{event.title}</h1>
                        </div>

                        <div className="flex items-center gap-3 self-end mb-1">
                            <Link
                                href={`/events/${id}`}
                                target="_blank"
                                className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl transition-all shadow-sm group"
                            >
                                Event Page
                                <ArrowLeft className="w-3 h-3 rotate-135 text-[#888888] group-hover:text-white transition-colors" />
                            </Link>
                        </div>
                    </div>


                    {/* Tabs */}
                    <DashboardTabs eventId={id} />
                </div>
            </header>


            {/* Main Content */}
            <main className="max-w-[800px] mx-auto px-6 py-12">
                {children}
            </main>
        </div>
    );
}
