/**
 * Active Devices Component
 * Shows list of devices currently signed in
 */

'use client';

import { GlossyCard } from '@/components/components/ui';
import { Monitor, Smartphone, Tablet } from 'lucide-react';

interface Device {
    id: string;
    name: string;
    location: string;
    isCurrent: boolean;
    type: 'desktop' | 'mobile' | 'tablet';
}

export default function ActiveDevices() {
    // In production, this would come from Firebase Auth or a backend API
    const devices: Device[] = [
        {
            id: '1',
            name: 'Chrome on macOS',
            location: 'Current Location',
            isCurrent: true,
            type: 'desktop',
        },
    ];

    const getDeviceIcon = (type: Device['type']) => {
        switch (type) {
            case 'mobile':
                return <Smartphone className="w-5 h-5" />;
            case 'tablet':
                return <Tablet className="w-5 h-5" />;
            default:
                return <Monitor className="w-5 h-5" />;
        }
    };

    return (
        <section className="space-y-4">
            <div>
                <h3 className="text-xl font-bold text-text-primary">Active Devices</h3>
                <p className="text-sm text-text-secondary mt-1">
                    See the list of devices you are currently signed into Pulse from.
                </p>
            </div>

            <GlossyCard className="divide-y divide-white/5 overflow-hidden">
                {devices.map((device) => (
                    <div key={device.id} className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors">
                        <div className="text-text-muted">
                            {getDeviceIcon(device.type)}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-text-primary">{device.name}</span>
                                {device.isCurrent && (
                                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                                        This Device
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-text-muted">{device.location}</p>
                        </div>
                    </div>
                ))}
            </GlossyCard>
        </section>
    );
}
