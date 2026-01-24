'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Loader2, ArrowLeft, Eye, EyeOff, Sparkles } from 'lucide-react';
import { Button, GlossyCard } from '@/components/components/ui';
import { useAuth } from '@/contexts/SupabaseAuthContext';

// Google Icon SVG Component
const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

export default function LoginPage() {
    const router = useRouter();
    const { signInWithGoogle, signInWithEmail, signUpWithEmail, signInWithMagicLink, user, loading } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [useMagicLink, setUseMagicLink] = useState(false);

    // Redirect if already logged in
    useEffect(() => {
        if (user && !loading) {
            router.push('/');
        }
    }, [user, loading, router]);

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        try {
            if (useMagicLink) {
                const { error } = await signInWithMagicLink(email);
                if (error) throw error;
                setSuccess('Check your email for a magic link!');
            } else if (isSignUp) {
                const { error } = await signUpWithEmail(email, password);
                if (error) throw error;
                setSuccess('Check your email for a confirmation link!');
            } else {
                const { error } = await signInWithEmail(email, password);
                if (error) throw error;
                router.push('/');
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        setError('');

        try {
            await signInWithGoogle();
            // Google OAuth redirects, so no need to router.push
        } catch (err: any) {
            setError(err.message || 'Google sign-in failed');
            setIsLoading(false);
        }
    };

    // Loading state while checking auth
    if (loading) {
        return (
            <div className="min-h-screen bg-bg-primary flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg-primary flex flex-col">
            {/* Header */}
            <header className="p-6">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span className="text-sm font-medium">Back</span>
                </Link>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center px-6 pb-20">
                <div className="w-full max-w-md">
                    {/* Logo/Icon */}
                    <div className="flex justify-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center shadow-xl">
                            <span className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                                P
                            </span>
                        </div>
                    </div>

                    {/* Welcome Text */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-text-primary mb-2">
                            Welcome to Lumma
                        </h1>
                        <p className="text-text-secondary">
                            {useMagicLink
                                ? 'Enter your email for a magic link'
                                : isSignUp
                                    ? 'Create your account'
                                    : 'Sign in to continue'}
                        </p>
                    </div>

                    {/* Login Card */}
                    <GlossyCard className="p-8 bg-[#1C1C1E]">
                        <form onSubmit={handleEmailSubmit} className="space-y-4">
                            {/* Email Input */}
                            <div>
                                <label className="text-sm font-medium text-text-primary mb-2 block">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    placeholder="you@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted/50 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    required
                                />
                            </div>

                            {/* Password Input (only for email/password auth) */}
                            {!useMagicLink && (
                                <div>
                                    <label className="text-sm font-medium text-text-primary mb-2 block">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full h-12 px-4 pr-12 bg-white/5 border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted/50 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                            required
                                            minLength={6}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Error/Success Messages */}
                            {error && (
                                <p className="text-sm text-red-400">{error}</p>
                            )}
                            {success && (
                                <p className="text-sm text-green-400">{success}</p>
                            )}

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                size="lg"
                                fullWidth
                                disabled={isLoading}
                                className="h-12 text-base font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50"
                            >
                                {isLoading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : useMagicLink ? (
                                    <>
                                        <Sparkles size={18} className="mr-2" />
                                        Send Magic Link
                                    </>
                                ) : isSignUp ? (
                                    'Create Account'
                                ) : (
                                    'Sign In'
                                )}
                            </Button>

                            {/* Toggle Options */}
                            <div className="flex flex-col gap-2 text-center">
                                {!useMagicLink && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsSignUp(!isSignUp);
                                            setError('');
                                            setSuccess('');
                                        }}
                                        className="text-sm text-text-muted hover:text-text-secondary transition-colors"
                                    >
                                        {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setUseMagicLink(!useMagicLink);
                                        setError('');
                                        setSuccess('');
                                        setPassword('');
                                    }}
                                    className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors flex items-center justify-center gap-1"
                                >
                                    <Mail size={14} />
                                    {useMagicLink ? 'Use password instead' : 'Sign in with magic link'}
                                </button>
                            </div>
                        </form>

                        {/* Divider */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10"></div>
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="px-3 bg-[#1C1C1E] text-text-muted">or</span>
                            </div>
                        </div>

                        {/* Social Login */}
                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={handleGoogleSignIn}
                                disabled={isLoading}
                                className="w-full h-12 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-text-primary font-medium transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                <GoogleIcon />
                                Continue with Google
                            </button>
                        </div>

                        {/* Terms */}
                        <p className="mt-6 text-xs text-text-muted text-center leading-relaxed">
                            By signing in, you agree to our{' '}
                            <Link href="/terms" className="text-text-secondary hover:text-text-primary underline">
                                Terms of Service
                            </Link>{' '}
                            and{' '}
                            <Link href="/privacy" className="text-text-secondary hover:text-text-primary underline">
                                Privacy Policy
                            </Link>
                        </p>
                    </GlossyCard>
                </div>
            </main>
        </div>
    );
}
