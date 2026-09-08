/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities */
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
    } catch (err: any  ) {
      setError(err.message || 'Failed to send password reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-[90vh] px-4 relative font-sans bg-[#F9F7F1]">
      <div className="bg-white border border-black/10 rounded-3xl w-full max-w-md p-8 shadow-sm relative space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <Logo showTagline={false} darkText={true} />
          <h1 className="text-2xl font-extrabold text-[#0E1F38] mt-4">Reset Password</h1>
          <p className="text-[#0E1F38]/60 text-sm">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-bold text-center">
            {error}
          </div>
        )}

        {submitted ? (
          <div className="space-y-5 text-center">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs leading-relaxed text-left space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-950">
                <span className="material-symbols-outlined text-emerald-600 text-base">mail</span>
                <span>Password Reset Email Sent</span>
              </div>
              <p className="text-emerald-800">
                If an account exists for <strong className="text-emerald-950">{email}</strong>, we have sent instructions to reset your password.
              </p>
              <p className="text-[11px] text-emerald-700">
                Please check your inbox, spam, or promotions folder.
              </p>
            </div>

            <div className="p-4 bg-[#FAF8EE] border border-black/5 rounded-2xl text-left space-y-2">
              <p className="text-xs font-bold text-[#0E1F38]">Not receiving any email?</p>
              <p className="text-[11px] text-[#0E1F38]/70 leading-relaxed">
                If you have not registered with this email yet, you can create a new account in seconds.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1 text-xs font-black text-[#FF5A65] hover:underline pt-1"
              >
                Sign Up for a New Account →
              </Link>
            </div>

            <div className="space-y-2 pt-2">
              <Link
                href="/signup"
                className="block w-full py-3.5 bg-[#FF5A65] text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-[0.98] transition-all text-center shadow-md shadow-[#FF5A65]/20"
              >
                Create an Account (Sign Up)
              </Link>
              <Link
                href="/login"
                className="block w-full py-3 bg-black/5 text-[#0E1F38] font-bold text-xs rounded-xl hover:bg-black/10 transition-all text-center"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleReset}>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#0E1F38]/60 block">Email Address</label>
              <input 
                type="email" 
                placeholder="name@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-transparent border border-black/10 rounded-xl px-4 py-3 text-sm text-[#0E1F38] focus:border-[#FF5A65] focus:ring-0 focus:outline-none"
              />
            </div>
            
            <button 
              className="w-full py-4 bg-[#FF5A65] text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2" 
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

            <div className="pt-3 border-t border-black/5 flex justify-between items-center text-xs">
              <Link href="/login" className="text-[#0E1F38]/60 hover:text-[#0E1F38] transition-colors">
                ← Back to Sign In
              </Link>
              <Link href="/signup" className="font-bold text-[#FF5A65] hover:underline">
                Don't have an account? Sign Up
              </Link>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
