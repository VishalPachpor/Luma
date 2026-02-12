'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { calendarPaymentRepository, CalendarPaymentConfig, Coupon } from '@/lib/repositories/calendar-payment.repository';
import { Wallet, Ticket, Receipt, Ban, History, Plus, X, ChevronRight, Settings, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function CalendarPaymentPage() {
    const params = useParams();
    const calendarId = params.id as string;
    const { user } = useAuth();
    const supabase = createSupabaseBrowserClient();

    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState<CalendarPaymentConfig | null>(null);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);

    // UI State
    const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
    const [isInvoicingModalOpen, setIsInvoicingModalOpen] = useState(false);
    const [invoicingForm, setInvoicingForm] = useState({ seller_name: '', seller_address: '', memo: '' });
    const [newCoupon, setNewCoupon] = useState<{
        code: string;
        type: string;
        value: number;
        max_uses: number | null;
    }>({ code: '', type: 'percent', value: 0, max_uses: null });

    // Fetch Data
    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [fetchedConfig, fetchedCoupons, fetchedTransactions] = await Promise.all([
                calendarPaymentRepository.getConfig(supabase, calendarId),
                calendarPaymentRepository.getCoupons(supabase, calendarId),
                calendarPaymentRepository.getTransactions(supabase, calendarId)
            ]);
            setConfig(fetchedConfig);
            setCoupons(fetchedCoupons);
            setTransactions(fetchedTransactions);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [calendarId, user]);

    // Handlers
    const handleSaveConfig = async (updates: Partial<CalendarPaymentConfig>) => {
        try {
            await calendarPaymentRepository.updateConfig(supabase, calendarId, updates);
            setConfig(prev => ({ ...prev!, ...updates }));
            // toast.success('Saved');
        } catch (err) {
            console.error('Failed to save', err);
        }
    };

    const handleCreateCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await calendarPaymentRepository.createCoupon(supabase, calendarId, {
                code: newCoupon.code,
                type: newCoupon.type as 'percent' | 'fixed',
                value: Number(newCoupon.value),
                max_uses: newCoupon.max_uses ? Number(newCoupon.max_uses) : null,
                active: true,
                starts_at: null,
                expires_at: null,
            });
            setIsCouponModalOpen(false);
            fetchData(); // Refresh list
        } catch (err) {
            console.error(err);
        }
    };

    if (loading && !config) {
        return <div className="p-10 text-white/50">Loading payment settings...</div>;
    }

    return (
        <div className="max-w-[800px] mx-auto text-white space-y-12 pb-20 fade-in">

            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold mb-2">Payments & Earnings</h1>
                <p className="text-white/60">Manage your crypto payouts, coupons, and financial settings.</p>
            </div>

            {/* Crypto Wallet Configuration */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-5 h-5 text-(--accent-solid)" />
                    <h2 className="text-lg font-semibold">Crypto Wallet</h2>
                </div>

                <div className="relative bg-linear-to-br from-surface-1 to-bg-primary border border-white/8 rounded-xl p-6 shadow-xl shadow-black/20 overflow-hidden">
                    {/* Subtle shine overlay */}
                    <div className="absolute inset-0 bg-linear-to-br from-white/3 via-transparent to-transparent pointer-events-none" />
                    <div className="flex flex-col gap-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-base font-medium text-white mb-1">Accept Crypto Payments</h3>
                                <p className="text-sm text-white/50 max-w-md">
                                    Receive payments directly to your wallet.
                                    Supported tokens: {config?.network === 'solana' ? 'SOL, USDC' : 'ETH, USDC'}.
                                </p>
                            </div>
                            <div className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold border",
                                config?.network === 'solana'
                                    ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                    : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            )}>
                                {config?.network === 'solana' ? 'SOLANA' : 'ETHEREUM'}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Network</label>
                                <div className="relative">
                                    <select
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none appearance-none focus:border-(--accent-glow) transition-colors cursor-pointer"
                                        value={config?.network || 'ethereum'}
                                        onChange={(e) => {
                                            const net = e.target.value;
                                            const tokens = net === 'solana' ? ['SOL', 'USDC'] : ['ETH', 'USDC'];
                                            setConfig(curr => ({ ...curr!, network: net, accepted_tokens: tokens }));
                                            handleSaveConfig({ network: net, accepted_tokens: tokens });
                                        }}
                                    >
                                        <option value="ethereum">Ethereum (Mainnet)</option>
                                        <option value="solana">Solana</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                                        <ChevronDown className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Wallet Address</label>
                                <input
                                    type="text"
                                    placeholder={config?.network === 'solana' ? "Solana Wallet (e.g. Phantom)" : "0x..."}
                                    value={config?.wallet_address || ''}
                                    onChange={(e) => setConfig(curr => ({ ...curr!, wallet_address: e.target.value }))}
                                    onBlur={(e) => handleSaveConfig({ wallet_address: e.target.value })}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-sm font-mono text-white focus:border-(--accent-glow) outline-none transition-colors"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Coupons */}
            <section className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Ticket className="w-5 h-5 text-(--accent-solid)" />
                        <h2 className="text-lg font-semibold">Coupons</h2>
                    </div>
                    <button
                        onClick={() => setIsCouponModalOpen(true)}
                        className="text-xs font-bold bg-white text-black px-3 py-1.5 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-1"
                    >
                        <Plus className="w-3 h-3" /> Create
                    </button>
                </div>

                {coupons.length === 0 ? (
                    <div className="bg-bg-elevated border border-white/10 rounded-xl p-8 text-center flex flex-col items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                            <Ticket className="w-5 h-5 text-white/30" />
                        </div>
                        <div>
                            <p className="text-white font-medium">No Coupons</p>
                            <p className="text-white/40 text-sm">Create discount codes for your events.</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {coupons.map(coupon => (
                            <div key={coupon.id} className="bg-bg-elevated border border-white/10 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-(--accent-main)/10 flex items-center justify-center text-(--accent-solid) font-mono font-bold">
                                        %
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-white">{coupon.code}</p>
                                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-white/60 uppercase">
                                                {coupon.type === 'percent' ? `${coupon.value}% OFF` : `$${coupon.value} OFF`}
                                            </span>
                                        </div>
                                        <p className="text-xs text-white/40">
                                            {coupon.used_count} uses {coupon.max_uses ? `/ ${coupon.max_uses}` : '(Unlimited)'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={cn("text-xs font-medium", coupon.active ? "text-green-400" : "text-red-400")}>
                                        {coupon.active ? 'Active' : 'Inactive'}
                                    </span>
                                    <button className="text-white/20 hover:text-white transition-colors">
                                        <Settings className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Invoicing & Tax Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Invoicing */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Receipt className="w-5 h-5 text-white/60" />
                            <h2 className="text-lg font-semibold">Invoicing</h2>
                        </div>
                        <button
                            onClick={() => {
                                setInvoicingForm({
                                    seller_name: config?.seller_name || '',
                                    seller_address: config?.seller_address || '',
                                    memo: config?.memo || ''
                                });
                                setIsInvoicingModalOpen(true);
                            }}
                            className="text-xs text-white/50 hover:text-white transition-colors"
                        >
                            ✏️ Edit
                        </button>
                    </div>
                    <div className="bg-bg-elevated border border-white/10 rounded-xl p-5 space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-white/50">Seller Name</span>
                            <span className="text-sm text-white font-medium">{config?.seller_name || '—'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-white/50">Address</span>
                            <span className="text-sm text-white/70">{config?.seller_address || '—'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-white/50">Memo</span>
                            <span className="text-sm text-white/70">{config?.memo || '—'}</span>
                        </div>
                    </div>
                </section>

                {/* Tax */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Receipt className="w-5 h-5 text-white/60" />
                        <h2 className="text-lg font-semibold">Tax</h2>
                    </div>
                    <div className="bg-bg-elevated border border-white/10 rounded-xl p-5 h-full flex items-center justify-between">
                        <div>
                            <p className="text-sm text-white/70">Calculate and add taxes on top of ticket prices.</p>
                        </div>
                        <button className="text-xs font-bold bg-white/10 text-white px-3 py-1.5 rounded-md hover:bg-white/20 transition-colors whitespace-nowrap">
                            Coming Soon
                        </button>
                    </div>
                </section>
            </div>

            {/* Refund Policy */}
            <section className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Ban className="w-5 h-5 text-white/60" />
                        <h2 className="text-lg font-semibold">Refund Policy</h2>
                    </div>
                    <button className="text-xs font-bold bg-white text-black px-3 py-1.5 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Add
                    </button>
                </div>

                {config?.refund_policy_type === 'no_refund' || !config?.refund_policy_type ? (
                    <div className="bg-bg-elevated border border-white/10 rounded-xl p-6 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                            <Ban className="w-5 h-5 text-white/30" />
                        </div>
                        <div>
                            <p className="text-white font-medium">No Refund Policy</p>
                            <p className="text-white/40 text-sm">Let guests know what your refund policy is.</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-bg-elevated border border-white/10 rounded-xl p-5">
                        <div className="space-y-3">
                            <div
                                onClick={() => handleSaveConfig({ refund_policy_type: 'no_refund' })}
                                className={cn(
                                    "p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between",
                                    config?.refund_policy_type === 'no_refund'
                                        ? "bg-(--accent-main)/10 border-(--accent-solid)"
                                        : "bg-black/20 border-white/5 hover:border-white/20"
                                )}
                            >
                                <span className="text-sm font-medium">No Refunds</span>
                                {config?.refund_policy_type === 'no_refund' && <div className="w-2 h-2 rounded-full bg-(--accent-solid)" />}
                            </div>
                            <div
                                onClick={() => handleSaveConfig({ refund_policy_type: '7_days' })}
                                className={cn(
                                    "p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between",
                                    config?.refund_policy_type === '7_days'
                                        ? "bg-(--accent-main)/10 border-(--accent-solid)"
                                        : "bg-black/20 border-white/5 hover:border-white/20"
                                )}
                            >
                                <span className="text-sm font-medium">Refund up to 7 days</span>
                                {config?.refund_policy_type === '7_days' && <div className="w-2 h-2 rounded-full bg-(--accent-solid)" />}
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* Sales History */}
            <section className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-white/60" />
                        <h2 className="text-lg font-semibold">Sales History</h2>
                    </div>
                    {transactions.length > 0 && (
                        <button
                            onClick={() => {
                                // CSV Export
                                const headers = ['Event', 'User', 'Amount', 'Currency', 'Date'];
                                const rows = transactions.map(tx => [
                                    tx.event?.title || 'Unknown',
                                    tx.user?.display_name || tx.user?.email || 'Unknown',
                                    tx.amount,
                                    tx.currency,
                                    format(new Date(tx.created_at), 'yyyy-MM-dd')
                                ]);
                                const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                                const blob = new Blob([csv], { type: 'text/csv' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `sales_${calendarId}.csv`;
                                a.click();
                            }}
                            className="text-xs font-medium text-white/60 hover:text-white transition-colors flex items-center gap-1"
                        >
                            ⬇️ Download as CSV
                        </button>
                    )}
                </div>

                {transactions.length === 0 ? (
                    <div className="bg-bg-elevated border border-white/10 rounded-xl p-6 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                            <Receipt className="w-5 h-5 text-white/30" />
                        </div>
                        <div>
                            <p className="text-white font-medium">No Transactions</p>
                            <p className="text-white/40 text-sm">You have not made any sales.</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-bg-elevated border border-white/10 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white/5 text-white/60 border-b border-white/5">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Event</th>
                                    <th className="px-4 py-3 font-medium">User</th>
                                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                                    <th className="px-4 py-3 font-medium text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {transactions.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-3 text-white">{tx.event?.title || 'Unknown Event'}</td>
                                        <td className="px-4 py-3 text-white/70">{tx.user?.display_name || tx.user?.email}</td>
                                        <td className="px-4 py-3 text-right font-mono text-(--accent-solid)">
                                            {tx.amount} {tx.currency}
                                        </td>
                                        <td className="px-4 py-3 text-right text-white/40">
                                            {format(new Date(tx.created_at), 'MMM d, yyyy')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Payout History */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-5 h-5 text-white/60" />
                    <h2 className="text-lg font-semibold">Payout History</h2>
                </div>

                <div className="bg-bg-elevated border border-white/10 rounded-xl p-6 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-white/30" />
                    </div>
                    <div>
                        <p className="text-white font-medium">No Payouts</p>
                        <p className="text-white/40 text-sm">Crypto payments are sent directly to your wallet.</p>
                    </div>
                </div>
            </section>

            {/* Coupon Modal */}
            {isCouponModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-bg-elevated border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold">Create Coupon</h3>
                            <button onClick={() => setIsCouponModalOpen(false)}><X className="w-5 h-5 text-white/50" /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1.5 block">Coupon Code</label>
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-lg font-mono font-bold text-white uppercase placeholder:text-white/20 outline-none focus:border-(--accent-solid) focus:ring-1 focus:ring-(--accent-solid)/50 transition-all"
                                    placeholder="SUMMER2025"
                                    autoFocus
                                    value={newCoupon.code}
                                    onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1.5 block">Discount Type</label>
                                    <div className="relative">
                                        <select
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none appearance-none focus:border-white/30 transition-colors cursor-pointer"
                                            value={newCoupon.type}
                                            onChange={(e) => setNewCoupon({ ...newCoupon, type: e.target.value })}
                                        >
                                            <option value="percent">Percentage</option>
                                            <option value="fixed">Fixed Amount</option>
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                                            <ChevronDown className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1.5 block">Value</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-white/30 transition-colors pl-8"
                                            placeholder="20"
                                            value={newCoupon.value || ''}
                                            onChange={(e) => setNewCoupon({ ...newCoupon, value: Number(e.target.value) })}
                                        />
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-bold text-sm">
                                            {newCoupon.type === 'percent' ? '%' : '$'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1.5 block">Usage Limit (Optional)</label>
                                <input
                                    type="number"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-white/30 transition-colors"
                                    placeholder="Unlimited"
                                    value={newCoupon.max_uses || ''}
                                    onChange={(e) => setNewCoupon({ ...newCoupon, max_uses: e.target.value ? Number(e.target.value) : null })}
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={handleCreateCoupon}
                                className="w-full bg-white text-black font-bold text-sm py-3.5 rounded-xl hover:bg-gray-200 transition-colors shadow-lg shadow-white/5"
                            >
                                Create Coupon
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Invoicing Edit Modal */}
            {isInvoicingModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
                    <div className="bg-bg-elevated border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold">Edit Invoicing</h3>
                            <button onClick={() => setIsInvoicingModalOpen(false)}><X className="w-5 h-5 text-white/50" /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1.5 block">Seller Name</label>
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-white/30 transition-colors"
                                    placeholder="Your Name or Company"
                                    value={invoicingForm.seller_name}
                                    onChange={(e) => setInvoicingForm({ ...invoicingForm, seller_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1.5 block">Address</label>
                                <input
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-white/30 transition-colors"
                                    placeholder="123 Main St, City"
                                    value={invoicingForm.seller_address}
                                    onChange={(e) => setInvoicingForm({ ...invoicingForm, seller_address: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1.5 block">Memo</label>
                                <textarea
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-white/30 transition-colors resize-none"
                                    rows={3}
                                    placeholder="Tax ID, Notes, etc."
                                    value={invoicingForm.memo}
                                    onChange={(e) => setInvoicingForm({ ...invoicingForm, memo: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                onClick={async () => {
                                    await handleSaveConfig({
                                        seller_name: invoicingForm.seller_name,
                                        seller_address: invoicingForm.seller_address,
                                        memo: invoicingForm.memo
                                    });
                                    setIsInvoicingModalOpen(false);
                                }}
                                className="w-full bg-white text-black font-bold text-sm py-3.5 rounded-xl hover:bg-gray-200 transition-colors shadow-lg shadow-white/5"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
