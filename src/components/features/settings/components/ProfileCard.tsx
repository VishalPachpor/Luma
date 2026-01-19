/**
 * Profile Card Component
 * Displays user avatar with upload functionality
 */

'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Camera, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile as updateAuthProfile } from 'firebase/auth';
import { storage, auth } from '@/lib/firebase';

interface ProfileCardProps {
    avatarUrl?: string;
    displayName?: string;
    onAvatarChange?: (newUrl: string) => void;
}

export default function ProfileCard({ avatarUrl, displayName, onAvatarChange }: ProfileCardProps) {
    const { user } = useAuth();
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const currentAvatar = avatarUrl || user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || user?.displayName || 'User')}&background=random&size=200`;

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || !storage || !auth) return;

        // Validate file
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be less than 5MB');
            return;
        }

        setIsUploading(true);
        setError(null);

        try {
            // Upload to Firebase Storage
            const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);

            // Update Firebase Auth profile
            await updateAuthProfile(user, { photoURL: downloadUrl });

            // Notify parent component
            onAvatarChange?.(downloadUrl);
        } catch (err) {
            console.error('Failed to upload avatar:', err);
            setError('Failed to upload image. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex flex-col items-center">
            <div className="relative group">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 shadow-lg">
                    <Image
                        src={currentAvatar}
                        alt="Profile picture"
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Upload overlay */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                    {isUploading ? (
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                        <Camera className="w-6 h-6 text-white" />
                    )}
                </button>

                {/* Upload badge */}
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-accent rounded-full flex items-center justify-center border-2 border-bg-primary shadow-lg cursor-pointer hover:scale-110 transition-transform"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Camera className="w-4 h-4 text-white" />
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                />
            </div>

            {error && (
                <p className="mt-2 text-xs text-red-400">{error}</p>
            )}

            <p className="mt-3 text-xs text-text-muted">
                Click to upload new photo
            </p>
        </div>
    );
}
