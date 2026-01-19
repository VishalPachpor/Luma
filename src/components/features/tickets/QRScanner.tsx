/**
 * QRScanner Component
 * Camera-based QR scanner for event check-in
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button, GlossyCard } from '@/components/components/ui';

interface QRScannerProps {
    eventId: string;
    onScanSuccess?: (guestInfo: any) => void;
}

type ScanResult = {
    type: 'success' | 'error' | 'already_scanned';
    message: string;
    guestInfo?: any;
};

export default function QRScanner({ eventId, onScanSuccess }: QRScannerProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastResult, setLastResult] = useState<ScanResult | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [scanCount, setScanCount] = useState(0);

    const processQrCode = useCallback(async (qrToken: string) => {
        if (isProcessing) return;

        setIsProcessing(true);
        setLastResult(null);

        try {
            const response = await fetch('/api/checkin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qrToken, eventId }),
            });

            const data = await response.json();

            if (!response.ok) {
                setLastResult({
                    type: 'error',
                    message: data.error || 'Check-in failed',
                });
                return;
            }

            if (data.alreadyScanned) {
                setLastResult({
                    type: 'already_scanned',
                    message: 'Already checked in',
                    guestInfo: data.guest,
                });
            } else {
                setLastResult({
                    type: 'success',
                    message: 'Check-in successful!',
                    guestInfo: data.guest,
                });
                setScanCount(prev => prev + 1);
                onScanSuccess?.(data.guest);
            }
        } catch (error) {
            console.error('Check-in error:', error);
            setLastResult({
                type: 'error',
                message: 'Network error. Please try again.',
            });
        } finally {
            setIsProcessing(false);
        }
    }, [eventId, isProcessing, onScanSuccess]);

    const startScanner = useCallback(async () => {
        try {
            setCameraError(null);
            const scanner = new Html5Qrcode('qr-reader');
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                },
                (decodedText) => {
                    processQrCode(decodedText);
                },
                () => { } // Ignore scan failures
            );

            setIsScanning(true);
        } catch (error: any) {
            console.error('Camera error:', error);
            setCameraError(error.message || 'Failed to access camera');
        }
    }, [processQrCode]);

    const stopScanner = useCallback(async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current = null;
            } catch (error) {
                console.error('Error stopping scanner:', error);
            }
        }
        setIsScanning(false);
    }, []);

    useEffect(() => {
        return () => {
            stopScanner();
        };
    }, [stopScanner]);

    const clearResult = () => {
        setLastResult(null);
    };

    return (
        <div className="space-y-6">
            {/* Scanner Container */}
            <GlossyCard className="overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Camera className="w-5 h-5 text-accent" />
                        <span className="font-medium">Ticket Scanner</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-text-muted">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span>{scanCount} checked in</span>
                    </div>
                </div>

                {/* Camera View */}
                <div className="relative aspect-square max-h-[400px] bg-black">
                    <div id="qr-reader" className="w-full h-full" />

                    {!isScanning && !cameraError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                            <Button onClick={startScanner} variant="primary" size="lg">
                                <Camera className="w-5 h-5 mr-2" />
                                Start Scanning
                            </Button>
                        </div>
                    )}

                    {cameraError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6 text-center">
                            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                            <p className="text-red-400 mb-4">{cameraError}</p>
                            <Button onClick={startScanner} variant="secondary">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Try Again
                            </Button>
                        </div>
                    )}

                    {isProcessing && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                            <Loader2 className="w-12 h-12 text-white animate-spin" />
                        </div>
                    )}
                </div>

                {/* Controls */}
                {isScanning && (
                    <div className="p-4 bg-white/[0.02]">
                        <Button onClick={stopScanner} variant="secondary" fullWidth>
                            Stop Scanner
                        </Button>
                    </div>
                )}
            </GlossyCard>

            {/* Result Display */}
            <AnimatePresence>
                {lastResult && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <GlossyCard
                            className={`p-6 border-2 ${lastResult.type === 'success'
                                    ? 'border-green-500/50 bg-green-500/10'
                                    : lastResult.type === 'already_scanned'
                                        ? 'border-blue-500/50 bg-blue-500/10'
                                        : 'border-red-500/50 bg-red-500/10'
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                {lastResult.type === 'success' ? (
                                    <CheckCircle className="w-8 h-8 text-green-400 shrink-0" />
                                ) : lastResult.type === 'already_scanned' ? (
                                    <AlertCircle className="w-8 h-8 text-blue-400 shrink-0" />
                                ) : (
                                    <XCircle className="w-8 h-8 text-red-400 shrink-0" />
                                )}
                                <div className="flex-1">
                                    <h3 className={`font-bold text-lg ${lastResult.type === 'success'
                                            ? 'text-green-400'
                                            : lastResult.type === 'already_scanned'
                                                ? 'text-blue-400'
                                                : 'text-red-400'
                                        }`}>
                                        {lastResult.message}
                                    </h3>
                                    {lastResult.guestInfo && (
                                        <p className="text-text-muted text-sm mt-1">
                                            Ticket #{lastResult.guestInfo.id?.slice(0, 8).toUpperCase()}
                                        </p>
                                    )}
                                </div>
                                <Button variant="ghost" size="sm" onClick={clearResult}>
                                    ✕
                                </Button>
                            </div>
                        </GlossyCard>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
