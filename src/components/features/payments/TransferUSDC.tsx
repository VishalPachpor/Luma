'use client';

import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, encodeFunctionData } from 'viem';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import {
    TOKEN_PROGRAM_ID,
    createTransferInstruction,
    getAssociatedTokenAddress
} from '@solana/spl-token';
import { Loader2, ArrowRight, Wallet, CheckCircle, AlertCircle, Coins } from 'lucide-react';
import { toast } from 'sonner';

// USDC Mint Addresses
const SOLANA_USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"); // Devnet USDC
// const SOLANA_USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"); // Mainnet USDC

// ERC-20 ABI for transfer
const ERC20_ABI = [
    {
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'recipient', type: 'address' },
            { name: 'amount', type: 'uint256' }
        ],
        outputs: [{ name: '', type: 'bool' }]
    }
] as const;

// Sepolia USDC (Testnet)
const ETH_USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';

export default function TransferUSDC() {
    const [network, setNetwork] = useState<'solana' | 'ethereum'>('solana');
    const [amount, setAmount] = useState('');
    const [recipient, setRecipient] = useState('');
    const [loading, setLoading] = useState(false);

    // Solana Hooks
    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();

    // EVM Hooks
    const { address: ethAddress, isConnected: isEthConnected } = useAccount();
    const { writeContractAsync } = useWriteContract();

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (network === 'solana') {
                await transferSolanaUSDC();
            } else {
                await transferEthUSDC();
            }
        } catch (error: any) {
            console.error('Transfer failed:', error);
            toast.error(error.message || 'Transfer failed');
        } finally {
            setLoading(false);
        }
    };

    const transferSolanaUSDC = async () => {
        if (!publicKey) throw new Error('Wallet not connected');

        const recipientPubkey = new PublicKey(recipient);
        const amountUnits = parseFloat(amount) * 1_000_000; // USDC has 6 decimals

        // Get ATA for sender and receiver
        const senderATA = await getAssociatedTokenAddress(SOLANA_USDC_MINT, publicKey);
        const recipientATA = await getAssociatedTokenAddress(SOLANA_USDC_MINT, recipientPubkey);

        const transaction = new Transaction().add(
            createTransferInstruction(
                senderATA,
                recipientATA,
                publicKey,
                BigInt(amountUnits)
            )
        );

        const signature = await sendTransaction(transaction, connection);

        await connection.confirmTransaction(signature, 'confirmed');
        toast.success('USDC Transfer Successful!', {
            description: `Signature: ${signature.slice(0, 8)}...`
        });
    };

    const transferEthUSDC = async () => {
        if (!isEthConnected) throw new Error('Wallet not connected');

        const amountUnits = parseUnits(amount, 6); // USDC has 6 decimals

        const hash = await writeContractAsync({
            address: ETH_USDC_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'transfer',
            args: [recipient as `0x${string}`, amountUnits],
        });

        toast.success('Transaction Sent!', {
            description: `Hash: ${hash.slice(0, 8)}...`
        });
    };

    return (
        <div className="bg-bg-elevated border border-white/10 rounded-xl p-6 max-w-lg w-full">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <Coins className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-white">Transfer USDC</h3>
                    <p className="text-sm text-text-muted">Send USDC via Solana or Ethereum</p>
                </div>
            </div>

            {/* Network Toggle */}
            <div className="grid grid-cols-2 gap-2 mb-6 p-1 bg-black/20 rounded-lg">
                <button
                    onClick={() => setNetwork('solana')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${network === 'solana'
                        ? 'bg-linear-to-r from-[#9945FF] to-[#14F195] text-black shadow-lg'
                        : 'text-text-muted hover:text-white'
                        }`}
                >
                    Solana (SPL)
                </button>
                <button
                    onClick={() => setNetwork('ethereum')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${network === 'ethereum'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-text-muted hover:text-white'
                        }`}
                >
                    Ethereum (ERC-20)
                </button>
            </div>

            <form onSubmit={handleTransfer} className="space-y-4">
                {/* Wallet Connection Status */}
                <div className="flex justify-center mb-4">
                    {network === 'solana' ? (
                        <WalletMultiButton className="bg-[#512da8]! hover:bg-[#452690]! h-10! px-4! text-sm!" />
                    ) : (
                        // Placeholder for RainbowKit/Wagmi connect button
                        <button type="button" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
                            {isEthConnected ? `Connected: ${ethAddress?.slice(0, 6)}...` : 'Connect EVM Wallet'}
                        </button>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-text-muted tracking-wider">
                        Recipient Address
                    </label>
                    <div className="relative">
                        <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                            type="text"
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            placeholder={network === 'solana' ? "Solana Wallet Address" : "0x..."}
                            className="w-full bg-bg-secondary border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white placeholder:text-text-muted focus:border-accent-blue outline-none font-mono text-sm"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-text-muted tracking-wider">
                        Amount (USDC)
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted font-medium">$</span>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            step="0.01"
                            min="0.01"
                            className="w-full bg-bg-secondary border border-white/10 rounded-lg pl-8 pr-4 py-3 text-white placeholder:text-text-muted focus:border-accent-blue outline-none font-mono text-lg"
                            required
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading || (network === 'solana' ? !publicKey : !isEthConnected)}
                    className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mt-4"
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            Transfer USDC <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
