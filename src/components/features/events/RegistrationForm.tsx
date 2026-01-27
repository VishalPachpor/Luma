'use client';

import React, { useState } from 'react';
import {
    Check,
    ChevronRight,
    Wallet,
    Twitter,
    Send
} from 'lucide-react';
import { Button } from '@/components/components/ui';
import type { RegistrationQuestion } from '@/types/event';

interface RegistrationFormProps {
    questions: RegistrationQuestion[];
    onSubmit: (answers: Record<string, string | string[]>) => void;
    onCancel: () => void;
    isSubmitting?: boolean;
    initialAnswers?: Record<string, string | string[]>;
}

export function RegistrationForm({
    questions,
    onSubmit,
    onCancel,
    isSubmitting = false,
    initialAnswers = {}
}: RegistrationFormProps) {
    const [answers, setAnswers] = useState<Record<string, string | string[]>>(initialAnswers);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Safety check: if no questions, don't render the form
    // The parent component should prevent this from being called, but this is a defensive check
    if (!questions || questions.length === 0) {
        return null;
    }

    const handleAnswerChange = (questionId: string, value: string | string[]) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
        // Clear error when user types
        if (errors[questionId]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[questionId];
                return newErrors;
            });
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        let isValid = true;

        questions.forEach(q => {
            if (q.required) {
                const answer = answers[q.id];
                if (!answer || (Array.isArray(answer) && answer.length === 0) || (typeof answer === 'string' && !answer.trim())) {
                    newErrors[q.id] = 'This field is required';
                    isValid = false;
                }
            }
        });

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onSubmit(answers);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-1 mb-6">
                <h3 className="text-xl font-bold text-text-primary">Complete Registration</h3>
                <p className="text-sm text-text-muted">Please answer a few questions to reserve your spot.</p>
            </div>

            <div className="space-y-5">
                {questions.map((q) => (
                    <div key={q.id} className="space-y-2">
                        <label className="block text-sm font-medium text-text-primary">
                            {q.label}
                            {q.required && <span className="text-accent ml-1">*</span>}
                        </label>

                        {q.type === 'short_text' && (
                            <input
                                type="text"
                                value={answers[q.id] as string || ''}
                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                placeholder={q.placeholder || 'Your answer'}
                                className={`w-full bg-black/20 border ${errors[q.id] ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-accent/50'} rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors`}
                            />
                        )}

                        {q.type === 'long_text' && (
                            <textarea
                                value={answers[q.id] as string || ''}
                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                placeholder={q.placeholder || 'Your answer'}
                                rows={3}
                                className={`w-full bg-black/20 border ${errors[q.id] ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-accent/50'} rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors resize-none`}
                            />
                        )}

                        {q.type === 'single_select' && (
                            <div className="space-y-2">
                                {q.options?.map((option) => (
                                    <label
                                        key={option}
                                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${answers[q.id] === option
                                            ? 'bg-accent/10 border-accent/50'
                                            : 'bg-black/20 border-white/5 hover:bg-white/5'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name={q.id}
                                            value={option}
                                            checked={answers[q.id] === option}
                                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                            className="hidden"
                                        />
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${answers[q.id] === option ? 'border-accent' : 'border-text-muted'
                                            }`}>
                                            {answers[q.id] === option && <div className="w-2 h-2 rounded-full bg-accent" />}
                                        </div>
                                        <span className={`text-sm ${answers[q.id] === option ? 'text-text-primary' : 'text-text-secondary'}`}>
                                            {option}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}

                        {q.type === 'multi_select' && (
                            <div className="space-y-2">
                                {q.options?.map((option) => {
                                    const currentAnswers = (answers[q.id] as string[]) || [];
                                    const isSelected = currentAnswers.includes(option);

                                    return (
                                        <label
                                            key={option}
                                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected
                                                ? 'bg-accent/10 border-accent/50'
                                                : 'bg-black/20 border-white/5 hover:bg-white/5'
                                                }`}
                                        >
                                            <input
                                                type="checkbox"
                                                value={option}
                                                checked={isSelected}
                                                onChange={(e) => {
                                                    const newAnswers = e.target.checked
                                                        ? [...currentAnswers, option]
                                                        : currentAnswers.filter(a => a !== option);
                                                    handleAnswerChange(q.id, newAnswers);
                                                }}
                                                className="hidden"
                                            />
                                            <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${isSelected ? 'border-accent bg-accent' : 'border-text-muted'
                                                }`}>
                                                {isSelected && <Check size={10} className="text-white" />}
                                            </div>
                                            <span className={`text-sm ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}>
                                                {option}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}

                        {(q.type === 'wallet_address' || q.type === 'twitter' || q.type === 'telegram') && (
                            <div className="relative">
                                <div className="absolute left-4 top-3 text-text-muted">
                                    {q.type === 'wallet_address' && <Wallet size={16} />}
                                    {q.type === 'twitter' && <Twitter size={16} />}
                                    {q.type === 'telegram' && <Send size={16} />}
                                </div>
                                <input
                                    type="text"
                                    value={answers[q.id] as string || ''}
                                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                    placeholder={q.type === 'wallet_address' ? '0x...' : q.type === 'twitter' ? '@username' : 'username'}
                                    className={`w-full bg-black/20 border ${errors[q.id] ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-accent/50'} rounded-xl pl-11 pr-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors`}
                                />
                            </div>
                        )}

                        {errors[q.id] && (
                            <p className="text-xs text-red-400 pl-1">{errors[q.id]}</p>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex gap-3 pt-4">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    className="flex-1"
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    variant="primary"
                    className="flex-1 min-w-[60%]"
                    style={{ flex: 2 }}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Registering...' : 'Complete Registration'}
                    {!isSubmitting && <ChevronRight size={16} className="ml-1" />}
                </Button>
            </div>
        </form>
    );
}
