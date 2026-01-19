'use client';

import React, { useState, ChangeEvent } from 'react';
import {
    Trash2,
    GripVertical,
    Type,
    AlignLeft,
    List,
    CheckSquare,
    Wallet,
    Twitter,
    Send,
    ChevronUp,
    ChevronDown,
    X
} from 'lucide-react';
import { Button } from '@/components/components/ui';
import type { RegistrationQuestion, QuestionType } from '@/types/event';

interface QuestionBuilderProps {
    questions: RegistrationQuestion[];
    onChange: (questions: RegistrationQuestion[]) => void;
}

const QUESTION_TYPES: { type: QuestionType; label: string; icon: React.ReactNode }[] = [
    { type: 'short_text', label: 'Short Text', icon: <Type size={16} /> },
    { type: 'long_text', label: 'Long Text', icon: <AlignLeft size={16} /> },
    { type: 'single_select', label: 'Single Select', icon: <List size={16} /> },
    { type: 'multi_select', label: 'Multi Select', icon: <CheckSquare size={16} /> },
    { type: 'wallet_address', label: 'Wallet Address', icon: <Wallet size={16} /> },
    { type: 'twitter', label: 'Twitter Handle', icon: <Twitter size={16} /> },
    { type: 'telegram', label: 'Telegram ID', icon: <Send size={16} /> },
];

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        {...props}
        className={`w-full bg-[var(--surface-1)] border border-white/10 rounded-xl px-4 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-[color:var(--accent-glow)] ${props.className || ''}`}
    />
);

export function QuestionBuilder({ questions, onChange }: QuestionBuilderProps) {
    const [editingId, setEditingId] = useState<string | null>(null);

    const addQuestion = (type: QuestionType) => {
        const newQuestion: RegistrationQuestion = {
            id: crypto.randomUUID(),
            type,
            label: '',
            required: false,
            options: type.includes('select') ? ['Option 1', 'Option 2'] : undefined,
            placeholder: ''
        };
        onChange([...questions, newQuestion]);
        setEditingId(newQuestion.id);
    };

    const updateQuestion = (id: string, updates: Partial<RegistrationQuestion>) => {
        onChange(questions.map(q => q.id === id ? { ...q, ...updates } : q));
    };

    const removeQuestion = (id: string) => {
        onChange(questions.filter(q => q.id !== id));
    };

    const moveQuestion = (id: string, direction: 'up' | 'down') => {
        const index = questions.findIndex(q => q.id === id);
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === questions.length - 1)
        ) return;

        const newQuestions = [...questions];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newQuestions[index], newQuestions[swapIndex]] = [newQuestions[swapIndex], newQuestions[index]];
        onChange(newQuestions);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-text-primary">Registration Questions</h3>
                    <p className="text-sm text-text-muted">Customize what you ask attendees when they register.</p>
                </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
                {questions.map((q, index) => (
                    <div
                        key={q.id}
                        className={`bg-[var(--surface-1)] border rounded-xl overflow-hidden transition-all ${editingId === q.id ? 'border-accent ring-1 ring-accent/20' : 'border-white/10 hover:border-white/20'
                            }`}
                    >
                        {/* Question Header / Summary */}
                        <div
                            className="p-4 flex items-center gap-3 cursor-pointer bg-white/5 hover:bg-white/10 transition-colors"
                            onClick={() => setEditingId(editingId === q.id ? null : q.id)}
                        >
                            <div className="text-text-muted cursor-grab active:cursor-grabbing p-1 hover:text-text-primary">
                                <GripVertical size={16} />
                            </div>

                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-text-primary">
                                {QUESTION_TYPES.find(t => t.type === q.type)?.icon}
                            </div>

                            <div className="flex-1">
                                <span className={`font-medium ${!q.label ? 'text-text-muted italic' : 'text-text-primary'}`}>
                                    {q.label || 'New Question'}
                                </span>
                                {q.required && <span className="ml-2 text-xs text-red-400 font-medium pt-0.5">* Required</span>}
                            </div>

                            <div className="flex items-center gap-1" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                <button
                                    onClick={() => moveQuestion(q.id, 'up')}
                                    disabled={index === 0}
                                    className="p-1.5 text-text-muted hover:text-text-primary hover:bg-white/5 rounded-lg disabled:opacity-30"
                                >
                                    <ChevronUp size={16} />
                                </button>
                                <button
                                    onClick={() => moveQuestion(q.id, 'down')}
                                    disabled={index === questions.length - 1}
                                    className="p-1.5 text-text-muted hover:text-text-primary hover:bg-white/5 rounded-lg disabled:opacity-30"
                                >
                                    <ChevronDown size={16} />
                                </button>
                                <button
                                    onClick={() => removeQuestion(q.id)}
                                    className="p-1.5 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg ml-1"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Edit Mode */}
                        {editingId === q.id && (
                            <div className="p-4 border-t border-white/10 space-y-4 bg-white/5 animate-in slide-in-from-top-2 duration-200">
                                <div className="space-y-3">
                                    <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Question Label</label>
                                    <Input
                                        value={q.label}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateQuestion(q.id, { label: e.target.value })}
                                        placeholder="e.g. What is your company name?"
                                        className="bg-black/20 border-white/10"
                                        autoFocus
                                    />
                                </div>

                                {(q.type === 'single_select' || q.type === 'multi_select') && (
                                    <div className="space-y-3">
                                        <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">Options</label>
                                        <div className="space-y-2">
                                            {q.options?.map((opt, i) => (
                                                <div key={i} className="flex gap-2">
                                                    <Input
                                                        value={opt}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                            const newOptions = [...(q.options || [])];
                                                            newOptions[i] = e.target.value;
                                                            updateQuestion(q.id, { options: newOptions });
                                                        }}
                                                        className="bg-black/20 border-white/10 flex-1"
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            const newOptions = q.options?.filter((_, idx) => idx !== i);
                                                            updateQuestion(q.id, { options: newOptions });
                                                        }}
                                                        className="text-text-muted hover:text-red-400 p-2 h-auto"
                                                    >
                                                        <X size={16} />
                                                    </Button>
                                                </div>
                                            ))}
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => updateQuestion(q.id, { options: [...(q.options || []), `Option ${(q.options?.length || 0) + 1}`] })}
                                                className="w-full border-dashed border-white/20 hover:border-[color:var(--accent-glow)] hover:text-[color:var(--accent-solid)] bg-transparent"
                                            >
                                                Add Option
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-4 pt-2">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div
                                            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${q.required ? 'bg-[image:var(--accent-main)] border-accent text-white' : 'border-white/20 bg-transparent group-hover:border-white/40'
                                                }`}
                                            onClick={() => updateQuestion(q.id, { required: !q.required })}
                                        >
                                            {q.required && <CheckSquare size={12} />}
                                        </div>
                                        <span className="text-sm text-text-secondary select-none">Required field</span>
                                    </label>

                                    <div className="flex-1" />

                                    <Button size="sm" onClick={() => setEditingId(null)}>
                                        Done
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {questions.length === 0 && (
                    <div className="text-center py-12 px-6 border-2 border-dashed border-white/10 rounded-2xl bg-white/5">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-text-muted">
                            <List size={24} />
                        </div>
                        <h4 className="text-text-primary font-medium mb-1">No custom questions</h4>
                        <p className="text-sm text-text-muted">Add questions to gather more info from attendees.</p>
                    </div>
                )}
            </div>

            {/* Add Toolbar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {QUESTION_TYPES.map((t) => (
                    <button
                        key={t.type}
                        onClick={() => addQuestion(t.type)}
                        className="flex items-center gap-2 px-3 py-2.5 bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/5 hover:border-white/10 rounded-lg transition-all text-left group"
                    >
                        <span className="text-text-muted group-hover:text-[color:var(--accent-solid)] transition-colors">{t.icon}</span>
                        <span className="text-xs font-medium text-text-secondary group-hover:text-text-primary transition-colors">{t.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default QuestionBuilder;
