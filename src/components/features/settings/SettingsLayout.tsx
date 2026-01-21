/**
 * Settings Layout - Luma-exact styling
 * Tabbed settings interface with Account, Preferences, Payment tabs
 */

'use client';

import { useState } from 'react';
import AccountSection from './sections/AccountSection';
import PreferencesSection from './sections/PreferencesSection';
import PaymentSection from './sections/PaymentSection';

type SettingsTab = 'account' | 'preferences' | 'payment';

export default function SettingsLayout() {
    const [activeTab, setActiveTab] = useState<SettingsTab>('account');

    const tabs: { id: SettingsTab; label: string }[] = [
        { id: 'account', label: 'Account' },
        { id: 'preferences', label: 'Preferences' },
        { id: 'payment', label: 'Payment' },
    ];

    return (
        <div className="w-full max-w-3xl mx-auto">
            {/* Header - Luma Style */}
            <div className="mb-6">
                <h1 className="text-[32px] font-semibold text-white tracking-tight">Settings</h1>
            </div>

            {/* Tabs - Luma Style with underline indicator */}
            <div className="flex items-center gap-0 border-b border-[var(--luma-border)] mb-8">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-3 text-[15px] font-medium transition-all relative ${activeTab === tab.id
                                ? 'text-white'
                                : 'text-[var(--luma-text-muted)] hover:text-white/80'
                            }`}
                    >
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {activeTab === 'account' && <AccountSection />}
                {activeTab === 'preferences' && <PreferencesSection />}
                {activeTab === 'payment' && <PaymentSection />}
            </div>
        </div>
    );
}
