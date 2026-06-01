'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabase';

function friendlyError(msg: string): string {
  if (!msg) return 'Something went wrong. Please try again.';
  if (msg.includes('email_address_invalid') || msg.includes('invalid'))
    return 'Please enter a valid email address.';
  if (msg.includes('rate limit') || msg.includes('rate_limit'))
    return 'Too many sign-up attempts. Please wait a few minutes and try again.';
  if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('unique'))
    return 'An account with this email already exists. Try signing in instead.';
  if (msg.includes('password') && msg.includes('least'))
    return 'Password must be at least 6 characters.';
  if (msg.includes('Anonymous'))
    return 'Please fill in all fields before submitting.';
  return msg;
}

export default function Signup() {
  const router = useRouter();
  const [fullName, setFullName]       = useState('');
  const [email, setEmail]             = useState('');
  const [phone, setPhone]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirm, setConfirm]         = useState('');
  const [showPw, setShowPw]           = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [success, setSuccess]         = useState(false);

  const validate = (): string | null => {
    if (!fullName.trim()) return 'Please enter your full name.';
    if (!email.trim())    return 'Please enter your email address.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirm)  return 'Passwords do not match.';
    return null;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone || undefined,
          },
        },
      });

      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      setError(friendlyError(err.message || ''));
    } finally {
      setIsLoading(false);
    }
  };

  // ── Success State ──────────────────────────────────────────────
  if (success) {
    return (
      <main className="flex items-center justify-center min-h-[90vh] px-4">
        <div className="bg-surface-container border border-white/10 rounded-2xl w-full max-w-md p-8 shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-green-400 text-3xl">mark_email_read</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Check Your Email</h2>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              We've sent a verification link to <span className="text-white font-semibold">{email}</span>.<br />
              Click the link in the email to activate your account.
            </p>
          </div>
          <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 text-xs text-primary font-semibold leading-relaxed">
            Once verified, come back and sign in to start shipping.
          </div>
          <Link
            href="/login"
            className="block w-full py-3 bg-primary text-background font-bold text-xs uppercase tracking-widest rounded-xl hover:brightness-110 transition-all"
          >
            Go to Sign In
          </Link>
          <p className="text-[10px] text-on-surface-variant">
            Didn't receive it? Check your spam folder or{' '}
            <button
              className="text-primary underline"
              onClick={() => { setSuccess(false); setError(null); }}
            >
              try again
            </button>.
          </p>
        </div>
      </main>
    );
  }

  // ── Sign-up Form ───────────────────────────────────────────────
  return (
    <main className="flex items-center justify-center min-h-[90vh] px-4 relative font-sans">
      <div className="bg-surface-container border border-white/10 rounded-2xl w-full max-w-md p-8 shadow-2xl relative space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <Logo showTagline={false} />
          <h1 className="text-2xl font-extrabold text-white mt-4">Join Layo</h1>
          <p className="text-on-surface-variant text-sm">Start saving on your global locker shipments</p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-bold text-center flex items-start gap-2">
            <span className="material-symbols-outlined text-sm leading-none flex-shrink-0 mt-0.5">error</span>
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSignup}>
          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block">Full Name *</label>
            <input
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary focus:ring-0 focus:outline-none"
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block">Email Address *</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary focus:ring-0 focus:outline-none"
            />
          </div>

          {/* Phone (optional) */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block">
              Phone Number <span className="normal-case font-normal">(optional)</span>
            </label>
            <input
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary focus:ring-0 focus:outline-none"
            />
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block">Password *</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Min. 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm text-white focus:border-primary focus:ring-0 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-lg">{showPw ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block">Confirm Password *</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Re-enter your password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                className={`w-full bg-background border rounded-xl px-4 py-3 text-sm text-white focus:ring-0 focus:outline-none transition-colors ${
                  confirm && confirm !== password ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-primary'
                }`}
              />
              {confirm && confirm !== password && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 text-[10px] font-bold">Mismatch</span>
              )}
              {confirm && confirm === password && (
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-green-400 text-base">check_circle</span>
              )}
            </div>
          </div>

          <button
            className="w-full py-4 bg-primary text-background font-bold text-xs uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-background/40 border-t-background rounded-full animate-spin" />
                Creating Account…
              </>
            ) : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-xs text-on-surface-variant">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-bold hover:underline ml-1">Sign In</Link>
        </p>
      </div>
    </main>
  );
}
