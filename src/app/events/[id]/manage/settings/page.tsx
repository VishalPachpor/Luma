
import { Settings } from 'lucide-react';

export default function SettingsPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 border border-white/10 rounded-xl bg-[#0B1221]">
            <div className="p-4 bg-white/5 rounded-full mb-4">
                <Settings className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Event Settings</h2>
            <p className="text-text-muted max-w-md mb-6">
                Manage general event details, SEO settings, and advanced configurations.
            </p>
            <button className="px-4 py-2 bg-white/10 text-white text-sm font-medium rounded-lg opacity-50 cursor-not-allowed">
                Coming Soon
            </button>
        </div>
    );
}
