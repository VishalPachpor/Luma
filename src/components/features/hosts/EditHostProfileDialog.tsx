import { useState } from 'react';
import { User } from '@/types';
import Modal from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import * as userRepo from '@/lib/repositories/user.repository';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

interface EditHostProfileDialogProps {
    host: User;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (updatedHost: User) => void;
}

export default function EditHostProfileDialog({ host, isOpen, onClose, onUpdate }: EditHostProfileDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: host.name,
        bio: host.bio || '',
        location: host.location || '',
        website: host.website || '',
        twitterHandle: host.twitterHandle || '',
        coverImage: host.coverImage || '',
        avatar: host.avatar || ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const updatedUser = await userRepo.update(host.id, formData);
            if (updatedUser) {
                onUpdate(updatedUser);
                onClose();
            }
        } catch (error) {
            console.error('Failed to update host:', error);
            // Ideally show toast error
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Cover Image URL */}
                <div className="space-y-2">
                    <Label htmlFor="coverImage" className="text-text-secondary">Cover Image URL</Label>
                    <Input
                        id="coverImage"
                        name="coverImage"
                        value={formData.coverImage}
                        onChange={handleChange}
                        className="bg-white/5 border-white/10 text-white"
                        placeholder="https://..."
                    />
                    {formData.coverImage && (
                        <div className="relative w-full h-24 rounded-lg overflow-hidden border border-white/10">
                            <Image src={formData.coverImage} alt="Cover Preview" fill className="object-cover" />
                        </div>
                    )}
                </div>

                {/* Avatar URL */}
                <div className="space-y-2">
                    <Label htmlFor="avatar" className="text-text-secondary">Avatar URL</Label>
                    <div className="flex gap-4 items-center">
                        <Input
                            id="avatar"
                            name="avatar"
                            value={formData.avatar}
                            onChange={handleChange}
                            className="bg-white/5 border-white/10 text-white"
                            placeholder="https://..."
                        />
                        {formData.avatar && (
                            <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0">
                                <Image src={formData.avatar} alt="Avatar Preview" fill className="object-cover" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Name */}
                <div className="space-y-2">
                    <Label htmlFor="name" className="text-text-secondary">Display Name</Label>
                    <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="bg-white/5 border-white/10 text-white"
                        required
                    />
                </div>

                {/* Bio */}
                <div className="space-y-2">
                    <Label htmlFor="bio" className="text-text-secondary">Bio</Label>
                    <Textarea
                        id="bio"
                        name="bio"
                        value={formData.bio}
                        onChange={handleChange}
                        className="bg-white/5 border-white/10 text-white min-h-[100px]"
                        placeholder="Tell us about yourself..."
                    />
                </div>

                {/* Location */}
                <div className="space-y-2">
                    <Label htmlFor="location" className="text-text-secondary">Location</Label>
                    <Input
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        className="bg-white/5 border-white/10 text-white"
                        placeholder="e.g. San Francisco, CA"
                    />
                </div>

                {/* Links */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="website" className="text-text-secondary">Website</Label>
                        <Input
                            id="website"
                            name="website"
                            value={formData.website}
                            onChange={handleChange}
                            className="bg-white/5 border-white/10 text-white"
                            placeholder="https://..."
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="twitterHandle" className="text-text-secondary">Twitter Handle</Label>
                        <Input
                            id="twitterHandle"
                            name="twitterHandle"
                            value={formData.twitterHandle}
                            onChange={handleChange}
                            className="bg-white/5 border-white/10 text-white"
                            placeholder="@username"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading} className="bg-white text-black hover:bg-white/90">
                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
