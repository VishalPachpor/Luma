/**
 * Account Section
 * Full profile editing with Firebase persistence
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { GlossyCard, Button } from '@/components/components/ui';
import { AlertCircle, Loader2, Save, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import ProfileCard from '../components/ProfileCard';
import SocialLinks from '../components/SocialLinks';
import PhoneSection from '../components/PhoneSection';
import SecuritySection from '../components/SecuritySection';
import ThirdPartyAccounts from '../components/ThirdPartyAccounts';
import AccountSyncing from '../components/AccountSyncing';
import ActiveDevices from '../components/ActiveDevices';
import DeleteAccount from '../components/DeleteAccount';
import { SocialLinks as SocialLinksType } from '@/types/settings';
import { updateProfile as updateAuthProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function AccountSection() {
    const { user } = useAuth();
    const { settings, isLoading, error, updateProfile } = useUserSettings();

    // Local state for form
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [socialLinks, setSocialLinks] = useState<SocialLinksType>({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Initialize form from settings
    useEffect(() => {
        if (settings?.profile) {
            setFirstName(settings.profile.firstName || '');
            setLastName(settings.profile.lastName || '');
            setUsername(settings.profile.username || '');
            setBio(settings.profile.bio || '');
            setSocialLinks(settings.profile.socialLinks || {});
        }
    }, [settings]);

    // Check if form has changes
    const hasChanges = useCallback(() => {
        if (!settings?.profile) return false;
        return (
            firstName !== (settings.profile.firstName || '') ||
            lastName !== (settings.profile.lastName || '') ||
            username !== (settings.profile.username || '') ||
            bio !== (settings.profile.bio || '') ||
            JSON.stringify(socialLinks) !== JSON.stringify(settings.profile.socialLinks || {})
        );
    }, [settings, firstName, lastName, username, bio, socialLinks]);

    const handleSave = async () => {
        if (!user || !auth) return;

        setIsSaving(true);
        setSaveError(null);
        setSaveSuccess(false);

        try {
            // Update Firebase Auth display name
            const displayName = `${firstName} ${lastName}`.trim();
            if (displayName && user.displayName !== displayName) {
                await updateAuthProfile(user, { displayName });
            }

            // Update Firestore profile
            await updateProfile({
                firstName,
                lastName,
                username,
                bio,
                socialLinks,
            });

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error('Failed to save profile:', err);
            setSaveError('Failed to save changes. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // Not logged in state
    if (!user) {
        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <GlossyCard className="p-8 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                    <h3 className="text-lg font-bold text-text-primary mb-2">Sign In Required</h3>
                    <p className="text-text-secondary">
                        Please sign in to manage your account.
                    </p>
                </GlossyCard>
            </div>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <GlossyCard className="p-12 flex flex-col items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-accent mb-4" />
                    <p className="text-text-secondary">Loading your profile...</p>
                </GlossyCard>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Error banner */}
            {(error || saveError) && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-sm text-red-400">{saveError || error}</p>
                </div>
            )}

            {/* Success banner */}
            {saveSuccess && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                    <p className="text-sm text-green-400">Changes saved successfully!</p>
                </div>
            )}

            {/* Your Profile Section */}
            <section className="space-y-4">
                <div>
                    <h3 className="text-xl font-bold text-text-primary">Your Profile</h3>
                    <p className="text-sm text-text-secondary mt-1">
                        Choose how you are displayed as a host or guest.
                    </p>
                </div>

                <GlossyCard className="p-6">
                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Profile Picture */}
                        <div className="flex-shrink-0">
                            <ProfileCard
                                avatarUrl={settings?.profile?.avatarUrl}
                                displayName={`${firstName} ${lastName}`.trim() || user.displayName || undefined}
                            />
                        </div>

                        {/* Name Fields */}
                        <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">
                                        First Name
                                    </label>
                                    <input
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="Your first name"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-accent/50 outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-2">
                                        Last Name
                                    </label>
                                    <input
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="Your last name"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-accent/50 outline-none transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Username */}
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Username
                                </label>
                                <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:border-accent/50 transition-colors">
                                    <span className="pl-4 text-text-muted">@</span>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                        placeholder="yourhandle"
                                        className="flex-1 bg-transparent px-2 py-3 text-text-primary placeholder:text-text-muted outline-none"
                                    />
                                </div>
                            </div>

                            {/* Bio */}
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">
                                    Bio
                                </label>
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    placeholder="Share a little about your background and interests."
                                    rows={3}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-accent/50 outline-none transition-colors resize-none"
                                />
                            </div>
                        </div>
                    </div>
                </GlossyCard>
            </section>

            {/* Social Links Section */}
            <section className="space-y-4">
                <GlossyCard className="p-6">
                    <SocialLinks
                        links={socialLinks}
                        onChange={setSocialLinks}
                    />
                </GlossyCard>
            </section>

            {/* Save Button for Profile */}
            <div className="flex justify-end">
                <Button
                    onClick={handleSave}
                    disabled={isSaving || !hasChanges()}
                    className="gap-2 px-8"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" />
                            Save Changes
                        </>
                    )}
                </Button>
            </div>

            {/* Divider */}
            <div className="border-t border-white/10 my-4" />

            {/* Phone Number */}
            <PhoneSection />

            {/* Password & Security */}
            <SecuritySection />

            {/* Third Party Accounts */}
            <ThirdPartyAccounts />

            {/* Account Syncing */}
            <AccountSyncing />

            {/* Active Devices */}
            <ActiveDevices />

            {/* Delete Account */}
            <DeleteAccount />
        </div>
    );
}
