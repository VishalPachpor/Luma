/**
 * Settings Page
 * User account settings with tabs for Account, Preferences, and Payment
 */

import SettingsLayout from '@/components/features/settings/SettingsLayout';

export const metadata = {
    title: 'Settings - Pulse',
    description: 'Manage your account settings, preferences, and payment methods.',
};

export default function SettingsPage() {
    return (
        <main className="min-h-screen bg-[#1a1a1f] pt-24 pb-16 px-4">
            <SettingsLayout />
        </main>
    );
}
