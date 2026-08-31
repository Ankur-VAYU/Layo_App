'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

const ADMIN_EMAILS = ['admin@layo.com', 'ankur@layo.com', 'ankur.iitd.nita@gmail.com'];

export default function AdminLoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in and admin, auto-redirect to /admin
  useEffect(() => {
    if (!loading && user) {
      if (ADMIN_EMAILS.includes(user.email || '')) {
        window.location.href = '/admin';
      }
    }
  }, [user, loading, router]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();

    // Check if whitelisted
    if (!ADMIN_EMAILS.includes(cleanEmail)) {
      setError('This email is not authorized for Administrator access. Please use your registered admin credentials or access the Customer Portal.');
      setIsLoading(false);
      return;
    }

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authError) throw authError;

      window.location.href = '/admin';
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate admin credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen px-4 bg-[#0A111E] text-white font-sans relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#FF5A65]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="bg-[#121B2B] border border-white/10 rounded-3xl w-full max-w-md p-8 sm:p-10 shadow-2xl relative space-y-6">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl font-black tracking-tight text-white">LAYO</span>
            <span className="bg-[#FF5A65]/20 text-[#FF5A65] border border-[#FF5A65]/40 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
              Admin Portal
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-white">Master Console Sign In</h1>
          <p className="text-[#94A3B8] text-xs">
            Restricted access for Layo Operations &amp; Platform Administrators
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/25 text-red-400 text-xs rounded-xl font-medium leading-relaxed text-center">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleAdminLogin}>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8] block">
              Admin Email
            </label>
            <input
              type="email"
              placeholder="admin@layo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-[#0A111E] border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/30 focus:border-[#FF5A65] focus:outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8] block">
                Password
              </label>
            </div>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-[#0A111E] border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/30 focus:border-[#FF5A65] focus:outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-[#FF5A65] hover:bg-[#e24550] text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                <span>Verifying Access...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
                <span>Enter Admin Console</span>
              </>
            )}
          </button>
        </form>

        {/* Alternate Links */}
        <div className="pt-4 border-t border-white/5 flex flex-col gap-2 text-center text-xs text-[#94A3B8]">
          <Link href="/ops/login" className="hover:text-[#8BC34A] transition-colors font-medium text-[11px] flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-sm">warehouse</span>
            Warehouse Floor Staff Login ➔
          </Link>
          <Link href="/login" className="hover:text-white transition-colors text-[11px]">
            Switch to Customer Locker Login
          </Link>
        </div>

      </div>
    </main>
  );
}
