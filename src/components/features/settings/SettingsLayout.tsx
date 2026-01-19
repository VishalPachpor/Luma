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
        <div className="w-full max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-text-primary mb-2">Settings</h1>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-white/10 mb-8">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-6 py-3 text-sm font-medium transition-all relative ${activeTab === tab.id
                                ? 'text-text-primary'
                                : 'text-text-muted hover:text-text-secondary'
                            }`}
                    >
                        {tab.label}
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-text-primary rounded-t-full" />
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
