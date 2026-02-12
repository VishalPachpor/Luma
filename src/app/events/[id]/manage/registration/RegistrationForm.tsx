'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { update } from '@/lib/repositories/event.repository';
import { QuestionBuilder } from '@/components/features/events/QuestionBuilder';
import { RegistrationQuestion } from '@/types/event';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface RegistrationFormProps {
    eventId: string;
    initialQuestions: RegistrationQuestion[];
}

export function RegistrationForm({ eventId, initialQuestions }: RegistrationFormProps) {
    const router = useRouter();
    const [questions, setQuestions] = useState<RegistrationQuestion[]>(initialQuestions);
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleSave = async () => {
        setIsSaving(true);
        setStatus('idle');
        try {
            await update(eventId, { registrationQuestions: questions });
            setStatus('success');
            router.refresh(); // Refresh server data

            // Clear success message after 3 seconds
            setTimeout(() => setStatus('idle'), 3000);
        } catch (error) {
            console.error('Failed to save questions:', error);
            setStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-surface-1 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-white">Registration Questions</h3>
                    <p className="text-sm text-text-muted">Manage the form questions for your event.</p>
                </div>

                <div className="flex items-center gap-3">
                    {status === 'success' && (
                        <div className="flex items-center gap-2 text-green-400 text-sm animate-in fade-in">
                            <CheckCircle2 size={16} />
                            <span>Saved</span>
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="flex items-center gap-2 text-red-400 text-sm animate-in fade-in">
                            <AlertCircle size={16} />
                            <span>Failed to save</span>
                        </div>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <QuestionBuilder
                questions={questions}
                onChange={setQuestions}
            />
        </div>
    );
}
