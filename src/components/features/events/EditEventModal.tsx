'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/modals/Modal';
import { Button } from '@/components/components/ui';
import { Event } from '@/types';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface EditEventModalProps {
    event: Event | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (id: string, updates: Partial<Event>) => Promise<void>;
}

export default function EditEventModal({ event, open, onOpenChange, onSave }: EditEventModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: '',
        time: '',
        location: '',
        capacity: 0,
        price: 0
    });

    // Populate form when event changes
    useEffect(() => {
        if (event) {
            const dateObj = new Date(event.date);
            // Format YYYY-MM-DD
            const dateStr = dateObj.toISOString().split('T')[0];
            // Format HH:MM
            const timeStr = dateObj.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

            setFormData({
                title: event.title,
                description: event.description,
                date: dateStr,
                time: timeStr,
                location: event.location,
                capacity: event.capacity || 0,
                price: event.price || 0
            });
        }
    }, [event]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!event) return;

        setIsLoading(true);
        try {
            // Reconstruct full date string
            const combinedDate = new Date(`${formData.date}T${formData.time}`);

            await onSave(event.id, {
                title: formData.title,
                description: formData.description,
                location: formData.location,
                date: combinedDate.toISOString(),
                capacity: formData.capacity,
                price: formData.price
            });
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to save:', error);
            toast.error('Failed to update event');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            isOpen={open}
            onClose={() => onOpenChange(false)}
            title="Edit Event"
            maxWidth="max-w-[500px]"
        >
            <form onSubmit={handleSubmit} className="space-y-4 p-6">
                {/* Title */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Event Title</label>
                    <input
                        required
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-accent"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    />
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Date</label>
                        <input
                            type="date"
                            required
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-accent scheme-dark"
                            value={formData.date}
                            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Time</label>
                        <input
                            type="time"
                            required
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-accent scheme-dark"
                            value={formData.time}
                            onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                        />
                    </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Location</label>
                    <input
                        required
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-accent"
                        value={formData.location}
                        onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    />
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400">Description</label>
                    <textarea
                        rows={3}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-accent resize-none"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Capacity</label>
                        <input
                            type="number"
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-accent"
                            value={formData.capacity}
                            onChange={(e) => setFormData(prev => ({ ...prev, capacity: Number(e.target.value) }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-400">Price ($)</label>
                        <input
                            type="number"
                            step="0.01"
                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-accent"
                            value={formData.price}
                            onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
