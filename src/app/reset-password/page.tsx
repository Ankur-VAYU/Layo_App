'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabase';

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Listen for auth state change or password recovery event
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        console.log('Password recovery mode active');
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-[90vh] px-4 relative font-sans">
      <div className="bg-surface-container border border-white/10 rounded-2xl w-full max-w-md p-8 shadow-2xl relative space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <Logo showTagline={false} />
          <h1 className="text-2xl font-extrabold text-white mt-4">Set New Password</h1>
          <p className="text-on-surface-variant text-sm">
            Enter your new password below to secure your account.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-bold text-center">
            {error}
          </div>
        )}

        {success ? (
          <div className="space-y-6 text-center">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-xs leading-relaxed font-medium">
              Your password has been successfully updated!
            </div>
            <Link
              href="/login"
              className="block w-full py-4 bg-primary text-background font-bold text-xs uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-[0.98] transition-all text-center"
            >
              Sign In with New Password
            </Link>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleUpdatePassword}>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block">New Password *</label>
              <div className="relative">
                <input 
                  type={showPw ? 'text' : 'password'} 
                  placeholder="Min. 6 characters" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary focus:ring-0 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">{showPw ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block">Confirm New Password *</label>
              <input 
                type={showPw ? 'text' : 'password'} 
                placeholder="Re-enter new password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                  Updating Password...
                </>
              ) : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
