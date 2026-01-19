/**
 * Delete Account Component
 * Danger zone for account deletion
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/components/ui';
import { AlertTriangle } from 'lucide-react';

export default function DeleteAccount() {
    const [showConfirm, setShowConfirm] = useState(false);

    return (
        <section className="space-y-4">
            <div>
                <h3 className="text-xl font-bold text-text-primary">Delete Account</h3>
                <p className="text-sm text-text-secondary mt-1">
                    If you no longer wish to use Pulse, you can permanently delete your account.
                </p>
            </div>

            {showConfirm ? (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm text-red-400 font-medium">
                                Are you sure you want to delete your account?
                            </p>
                            <p className="text-xs text-red-400/70 mt-1">
                                This action cannot be undone. All your data, events, and calendars will be permanently deleted.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowConfirm(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            className="bg-red-500 hover:bg-red-600 text-white"
                        >
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Delete My Account
                        </Button>
                    </div>
                </div>
            ) : (
                <Button
                    variant="secondary"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    onClick={() => setShowConfirm(true)}
                >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Delete My Account
                </Button>
            )}
        </section>
    );
}
