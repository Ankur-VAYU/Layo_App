'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const redirectTo = 'https://www.getlayo.com/reset-password';
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-[90vh] px-4 relative font-sans">
      <div className="bg-surface-container border border-white/10 rounded-2xl w-full max-w-md p-8 shadow-2xl relative space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <Logo showTagline={false} />
          <h1 className="text-2xl font-extrabold text-white mt-4">Reset Password</h1>
          <p className="text-on-surface-variant text-sm">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-bold text-center">
            {error}
          </div>
        )}

        {submitted ? (
          <div className="space-y-6 text-center">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-xs leading-relaxed font-medium">
              We have sent password reset instructions to <strong className="text-white">{email}</strong> if an account exists.
            </div>
            <p className="text-xs text-on-surface-variant">
              Check your inbox and spam folder.
            </p>
            <Link
              href="/login"
              className="block w-full py-4 bg-primary text-background font-bold text-xs uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-[0.98] transition-all text-center"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleReset}>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block">Email Address</label>
              <input 
                type="email" 
                placeholder="name@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary focus:ring-0 focus:outline-none"
              />
            </div>
            
            <button 
              className="w-full py-4 bg-primary text-background font-bold text-xs uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2" 
              type="submit" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-background/40 border-t-background rounded-full animate-spin" />
                  Sending Link...
                </>
              ) : 'Send Reset Link'}
            </button>

            <div className="pt-2 text-center">
              <Link href="/login" className="text-xs text-on-surface-variant hover:text-white transition-colors">
                ← Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
