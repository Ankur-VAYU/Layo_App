/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: any) => void;
  initialTab?: 'signin' | 'signup';
  title?: string;
  subtitle?: string;
}

function friendlyError(msg: string): string {
  if (!msg) return 'Something went wrong. Please try again.';
  if (msg.includes('email_address_invalid') || msg.includes('invalid'))
    return 'Please enter a valid email address.';
  if (msg.includes('rate limit') || msg.includes('rate_limit'))
    return 'Too many attempts. Please wait a few minutes and try again.';
  if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('unique'))
    return 'An account with this email already exists. Try signing in instead.';
  if (msg.includes('password') && msg.includes('least'))
    return 'Password must be at least 6 characters.';
  if (msg.includes('Invalid login credentials'))
    return 'Invalid email or password. Please try again.';
  return msg;
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  initialTab = 'signin',
  title = 'Save to Your Layo Locker',
  subtitle = 'Sign in or create an account to save your draft shipment and manage your locker.'
}: AuthModalProps) {
  const [tab, setTab] = useState<'signin' | 'signup'>(initialTab);

  // Sign In state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  // Sign Up state
  const [fullName, setFullName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInEmail.trim()) { setSignInError('Please enter your email.'); return; }
    if (!signInPassword) { setSignInError('Please enter your password.'); return; }

    setSignInLoading(true);
    setSignInError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInEmail.trim(),
        password: signInPassword,
      });

      if (error) throw error;

      if (data?.user) {
        if (onSuccess) onSuccess(data.user);
        onClose();
      }
    } catch (err: any) {
      setSignInError(friendlyError(err.message || ''));
    } finally {
      setSignInLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { setSignUpError('Please enter your full name.'); return; }
    if (!signUpEmail.trim()) { setSignUpError('Please enter your email address.'); return; }
    if (signUpPassword.length < 6) { setSignUpError('Password must be at least 6 characters.'); return; }
    if (signUpPassword !== confirmPassword) { setSignUpError('Passwords do not match.'); return; }

    setSignUpLoading(true);
    setSignUpError(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: signUpEmail.trim(),
        password: signUpPassword,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : 'https://www.getlayo.com/dashboard',
          data: {
            full_name: fullName.trim(),
            phone: phone.trim() || undefined,
          },
        },
      });

      if (error) throw error;

      if (data?.session && data?.user) {
        // Direct session without email confirmation
        if (onSuccess) onSuccess(data.user);
        onClose();
        return;
      }

      // Supabase email confirmation required
      setSignUpSuccess(true);
    } catch (err: any) {
      setSignUpError(friendlyError(err.message || ''));
    } finally {
      setSignUpLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-[#FAF8EE] border border-black/10 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative text-[#0E1F38] my-6 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white border border-black/10 flex items-center justify-center text-[#0E1F38]/60 hover:text-[#0E1F38] hover:border-black/30 transition-all cursor-pointer font-bold text-sm shadow-2xs"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-2 mb-6">
          <Logo showTagline={false} darkText={true} />
          <h2 className="text-xl sm:text-2xl font-black text-[#0E1F38] mt-2">
            {title}
          </h2>
          <p className="text-xs text-[#0E1F38]/70 leading-relaxed max-w-xs font-medium">
            {subtitle}
          </p>
        </div>

        {/* Tabs */}
        {!signUpSuccess && (
          <div className="flex bg-black/5 p-1 rounded-2xl mb-5">
            <button
              type="button"
              onClick={() => { setTab('signin'); setSignInError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                tab === 'signin'
                  ? 'bg-white text-[#0E1F38] shadow-xs'
                  : 'text-[#0E1F38]/60 hover:text-[#0E1F38]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setTab('signup'); setSignUpError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                tab === 'signup'
                  ? 'bg-white text-[#0E1F38] shadow-xs'
                  : 'text-[#0E1F38]/60 hover:text-[#0E1F38]'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Sign In Form */}
        {tab === 'signin' && !signUpSuccess && (
          <form onSubmit={handleSignIn} className="space-y-4">
            {signInError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium text-center">
                {signInError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#0E1F38]/60 block">
                Email Address
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                value={signInEmail}
                onChange={(e) => setSignInEmail(e.target.value)}
                required
                className="w-full bg-white border border-black/10 rounded-xl px-3.5 py-2.5 text-xs text-[#0E1F38] placeholder:text-[#0E1F38]/30 focus:border-[#FF5A65] focus:ring-0 focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#0E1F38]/60 block">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  target="_blank"
                  className="text-[11px] text-[#FF5A65] hover:underline font-bold"
                >
                  Forgot?
                </Link>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
                required
                className="w-full bg-white border border-black/10 rounded-xl px-3.5 py-2.5 text-xs text-[#0E1F38] placeholder:text-[#0E1F38]/30 focus:border-[#FF5A65] focus:ring-0 focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={signInLoading}
              className="w-full py-3 bg-[#FF5A65] hover:bg-[#e24550] text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {signInLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In &amp; Continue</span>
              )}
            </button>
          </form>
        )}

        {/* Sign Up Form */}
        {tab === 'signup' && !signUpSuccess && (
          <form onSubmit={handleSignUp} className="space-y-3">
            {signUpError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium text-center">
                {signUpError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#0E1F38]/60 block">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Ankur Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full bg-white border border-black/10 rounded-xl px-3.5 py-2.5 text-xs text-[#0E1F38] placeholder:text-[#0E1F38]/30 focus:border-[#FF5A65] focus:ring-0 focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#0E1F38]/60 block">
                Email Address
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                value={signUpEmail}
                onChange={(e) => setSignUpEmail(e.target.value)}
                required
                className="w-full bg-white border border-black/10 rounded-xl px-3.5 py-2.5 text-xs text-[#0E1F38] placeholder:text-[#0E1F38]/30 focus:border-[#FF5A65] focus:ring-0 focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#0E1F38]/60 block">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-white border border-black/10 rounded-xl px-3.5 py-2.5 text-xs text-[#0E1F38] placeholder:text-[#0E1F38]/30 focus:border-[#FF5A65] focus:ring-0 focus:outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#0E1F38]/60 block">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={signUpPassword}
                  onChange={(e) => setSignUpPassword(e.target.value)}
                  required
                  className="w-full bg-white border border-black/10 rounded-xl px-3.5 py-2.5 text-xs text-[#0E1F38] placeholder:text-[#0E1F38]/30 focus:border-[#FF5A65] focus:ring-0 focus:outline-none transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#0E1F38]/60 block">
                  Confirm
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full bg-white border border-black/10 rounded-xl px-3.5 py-2.5 text-xs text-[#0E1F38] placeholder:text-[#0E1F38]/30 focus:border-[#FF5A65] focus:ring-0 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={signUpLoading}
              className="w-full py-3 bg-[#FF5A65] hover:bg-[#e24550] text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {signUpLoading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Creating Account...</span>
                </>
              ) : (
                <span>Create Account &amp; Save</span>
              )}
            </button>
          </form>
        )}

        {/* Sign Up Success (Verification Email Sent) */}
        {signUpSuccess && (
          <div className="text-center space-y-4 py-2">
            <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
              <span className="material-symbols-outlined text-2xl">mark_email_read</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-[#0E1F38]">Check Your Email</h3>
              <p className="text-xs text-[#0E1F38]/70 leading-relaxed">
                We sent a verification link to <strong className="text-[#0E1F38]">{signUpEmail}</strong>.
              </p>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed font-medium text-left">
              📦 <strong>Your draft is securely saved in your browser.</strong> Click the confirmation link in your email to activate your account and view this shipment in your Locker dashboard!
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-black/5 hover:bg-black/10 text-[#0E1F38] font-bold text-xs rounded-xl border border-black/10 transition-all cursor-pointer"
            >
              Got it, Close
            </button>
          </div>
        )}

        {/* Security / Privacy reassurance footer */}
        <div className="mt-4 pt-4 border-t border-black/5 text-center">
          <p className="text-[10px] text-[#0E1F38]/50 flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-xs text-emerald-600">lock</span>
            Secure Supabase 256-bit encryption · Zero spam guarantee
          </p>
        </div>
      </div>
    </div>
  );
}
