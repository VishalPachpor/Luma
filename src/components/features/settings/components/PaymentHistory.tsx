/**
 * Payment History Component
 * Displays past transactions and receipts
 */

'use client';

import { useState } from 'react';
import { GlossyCard, Button } from '@/components/components/ui';
import { Receipt, Download, ExternalLink, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Transaction {
    id: string;
    date: Date;
    description: string;
    amount: number;
    currency: string;
    status: 'succeeded' | 'pending' | 'failed';
    receiptUrl?: string;
}

export default function PaymentHistory() {
    const { user } = useAuth();
    const [transactions] = useState<Transaction[]>([]);

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }).format(date);
    };

    const formatAmount = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount / 100); // Stripe amounts are in cents
    };

    const getStatusBadge = (status: Transaction['status']) => {
        switch (status) {
            case 'succeeded':
                return (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400">
                        Paid
                    </span>
                );
            case 'pending':
                return (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400">
                        Pending
                    </span>
                );
            case 'failed':
                return (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400">
                        Failed
                    </span>
                );
        }
    };

    if (!user) return null;

    return (
        <section className="space-y-4">
            <div>
                <h3 className="text-xl font-bold text-text-primary">Payment History</h3>
                <p className="text-sm text-text-secondary mt-1">
                    View your past transactions and download receipts.
                </p>
            </div>

            <GlossyCard className="overflow-hidden">
                {transactions.length > 0 ? (
                    <div className="divide-y divide-white/5">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-4 p-4 bg-white/5 text-xs font-semibold text-text-muted uppercase tracking-wider">
                            <div className="col-span-3">Date</div>
                            <div className="col-span-5">Description</div>
                            <div className="col-span-2 text-right">Amount</div>
                            <div className="col-span-2 text-right">Receipt</div>
                        </div>

                        {/* Table Body */}
                        {transactions.map((tx) => (
                            <div
                                key={tx.id}
                                className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors"
                            >
                                <div className="col-span-3 text-sm text-text-secondary">
                                    {formatDate(tx.date)}
                                </div>
                                <div className="col-span-5">
                                    <div className="text-sm text-text-primary">{tx.description}</div>
                                    {getStatusBadge(tx.status)}
                                </div>
                                <div className="col-span-2 text-right text-sm font-medium text-text-primary">
                                    {formatAmount(tx.amount, tx.currency)}
                                </div>
                                <div className="col-span-2 text-right">
                                    {tx.receiptUrl && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => window.open(tx.receiptUrl, '_blank')}
                                            className="gap-1"
                                        >
                                            <Download className="w-3 h-3" />
                                            <span className="sr-only">Download</span>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center">
                        <Receipt className="w-12 h-12 mx-auto mb-4 text-text-muted" />
                        <h4 className="text-lg font-medium text-text-primary mb-2">
                            No transactions yet
                        </h4>
                        <p className="text-sm text-text-secondary max-w-sm mx-auto">
                            When you make purchases or subscribe to Pulse Plus, your transactions will appear here.
                        </p>
                    </div>
                )}
            </GlossyCard>

            {transactions.length > 10 && (
                <div className="text-center">
                    <Button variant="ghost" className="gap-2">
                        <Calendar className="w-4 h-4" />
                        View All Transactions
                        <ExternalLink className="w-3 h-3" />
                    </Button>
                </div>
            )}
        </section>
    );
}
