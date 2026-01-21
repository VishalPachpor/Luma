/**
 * Account Section - Luma-exact styling
 * Full profile editing with Supabase persistence
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Loader2, Upload, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import Image from 'next/image';
import SocialLinks from '../components/SocialLinks';
import EmailsSection from '../components/EmailsSection';
import PhoneSection from '../components/PhoneSection';
import SecuritySection from '../components/SecuritySection';
import ThirdPartyAccounts from '../components/ThirdPartyAccounts';
import AccountSyncing from '../components/AccountSyncing';
import ActiveDevices from '../components/ActiveDevices';
import DeleteAccount from '../components/DeleteAccount';
import { SocialLinks as SocialLinksType } from '@/types/settings';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

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
        if (!user) return;

        setIsSaving(true);
        setSaveError(null);
        setSaveSuccess(false);

        try {
            const displayName = `${firstName} ${lastName}`.trim();
            const supabase = createSupabaseBrowserClient();

            // Update Supabase Auth Metadata (Display Name)
            if (displayName && user.displayName !== displayName) {
                const { error: authError } = await supabase.auth.updateUser({
                    data: { display_name: displayName }
                });
                if (authError) throw authError;
            }

            // Update User Profile via Context (uses Supabase now)
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
            <div className="space-y-8">
                <div className="p-8 text-center bg-[var(--luma-bg-card)] rounded-lg border border-[var(--luma-border)]">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                    <h3 className="text-lg font-semibold text-white mb-2">Sign In Required</h3>
                    <p className="text-[var(--luma-text-muted)]">
                        Please sign in to manage your account.
                    </p>
                </div>
            </div>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-8">
                <div className="p-12 flex flex-col items-center justify-center bg-[var(--luma-bg-card)] rounded-lg border border-[var(--luma-border)]">
                    <Loader2 className="w-8 h-8 animate-spin text-white mb-4" />
                    <p className="text-[var(--luma-text-muted)]">Loading your profile...</p>
                </div>
            </div>
        );
    }

    const avatarUrl = settings?.profile?.avatarUrl || user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName || user.displayName || 'U')}&background=random&color=fff&size=96`;

    return (
        <div className="space-y-10">
            {/* Error banner */}
            {(error || saveError) && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-sm text-red-400">{saveError || error}</p>
                </div>
            )}

            {/* Success banner */}
            {saveSuccess && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                    <p className="text-sm text-green-400">Changes saved successfully!</p>
                </div>
            )}

            {/* ============================================
                Your Profile Section - Luma 2-Column Layout
               ============================================ */}
            <section>
                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white">Your Profile</h3>
                    <p className="text-sm text-[var(--luma-text-muted)] mt-1">
                        Choose how you are displayed as a host or guest.
                    </p>
                </div>

                <div className="flex gap-12">
                    {/* Left: Form Fields */}
                    <div className="flex-1 space-y-5">
                        {/* First Name / Last Name Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--luma-text-label)] mb-2">
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    placeholder="Your first name"
                                    className="w-full bg-[var(--luma-bg-input)] border border-[var(--luma-border)] rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-[var(--luma-text-muted)] focus:border-[var(--luma-border-hover)] outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[var(--luma-text-label)] mb-2">
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    placeholder="Your last name"
                                    className="w-full bg-[var(--luma-bg-input)] border border-[var(--luma-border)] rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-[var(--luma-text-muted)] focus:border-[var(--luma-border-hover)] outline-none transition-colors"
                                />
                            </div>
                        </div>

                        {/* Username */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--luma-text-label)] mb-2">
                                Username
                            </label>
                            <div className="flex items-center bg-[var(--luma-bg-input)] border border-[var(--luma-border)] rounded-lg overflow-hidden focus-within:border-[var(--luma-border-hover)] transition-colors">
                                <span className="pl-4 pr-1 text-[var(--luma-text-muted)] text-sm">@</span>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                    placeholder="yourhandle"
                                    className="flex-1 bg-transparent px-2 py-2.5 text-white text-sm placeholder:text-[var(--luma-text-muted)] outline-none"
                                />
                            </div>
                        </div>

                        {/* Bio */}
                        <div>
                            <label className="block text-sm font-medium text-[var(--luma-text-label)] mb-2">
                                Bio
                            </label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="Share a little about your background and interests."
                                rows={3}
                                className="w-full bg-[var(--luma-bg-input)] border border-[var(--luma-border)] rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-[var(--luma-text-muted)] focus:border-[var(--luma-border-hover)] outline-none transition-colors resize-none"
                            />
                        </div>
                    </div>

                    {/* Right: Profile Picture */}
                    <div className="shrink-0">
                        <label className="block text-sm font-medium text-[var(--luma-text-label)] mb-2">
                            Profile Picture
                        </label>
                        <div className="relative">
                            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[var(--luma-border)]">
                                <Image
                                    src={avatarUrl}
                                    alt="Profile"
                                    width={96}
                                    height={96}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            {/* Upload button */}
                            <button className="absolute bottom-0 right-0 w-8 h-8 bg-[var(--luma-bg-input)] border border-[var(--luma-border)] rounded-full flex items-center justify-center hover:bg-[var(--luma-bg-card)] transition-colors">
                                <Upload className="w-4 h-4 text-white" />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Social Links Section */}
            <section>
                <SocialLinks
                    links={socialLinks}
                    onChange={setSocialLinks}
                />
            </section>

            {/* Save Changes Button - Luma Style */}
            <div>
                <button
                    onClick={handleSave}
                    disabled={isSaving || !hasChanges()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--luma-bg-card)] border border-[var(--luma-btn-border)] rounded-lg text-white text-sm font-medium hover:bg-[var(--luma-bg-input)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Upload className="w-4 h-4" />
                            Save Changes
                        </>
                    )}
                </button>
            </div>

            {/* Divider */}
            <div className="border-t border-[var(--luma-border)]" />

            {/* Emails Section */}
            <EmailsSection />

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
