
import { MessageSquare } from 'lucide-react';

export default function BlastsPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 border border-white/10 rounded-xl bg-[#0B1221]">
            <div className="p-4 bg-white/5 rounded-full mb-4">
                <MessageSquare className="w-8 h-8 text-indigo-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Blasts & Communications</h2>
            <p className="text-text-muted max-w-md mb-6">
                Send updates, reminders, and announcements to your guests via email and SMS.
            </p>
            <button className="px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg opacity-50 cursor-not-allowed">
                Coming Soon
            </button>
        </div>
    );
}
