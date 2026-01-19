
import { BarChart3 } from 'lucide-react';

export default function InsightsPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 border border-white/10 rounded-xl bg-[#0B1221]">
            <div className="p-4 bg-white/5 rounded-full mb-4">
                <BarChart3 className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Event Insights</h2>
            <p className="text-text-muted max-w-md mb-6">
                Track page views, registration conversion rates, and traffic sources.
            </p>
            <button className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg opacity-50 cursor-not-allowed">
                Coming Soon
            </button>
        </div>
    );
}
