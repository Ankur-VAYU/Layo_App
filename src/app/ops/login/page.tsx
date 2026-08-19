'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

export default function OpsLoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, auto-redirect to /ops
  useEffect(() => {
    if (!loading && user) {
      router.push('/ops');
    }
  }, [user, loading, router]);

  const handleOpsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) throw authError;

      router.push('/ops');
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate warehouse credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen px-4 bg-[#1B250F] text-white font-sans relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#8BC34A]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="bg-[#243314] border border-[#8BC34A]/20 rounded-3xl w-full max-w-md p-8 sm:p-10 shadow-2xl relative space-y-6">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl font-black tracking-tight text-white">LAYO</span>
            <span className="bg-[#8BC34A]/20 text-[#8BC34A] border border-[#8BC34A]/40 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
              Warehouse Ops
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-white">Hub Staff Sign In</h1>
          <p className="text-[#C5D8B0] text-xs">
            Direct access to Package Inwarding, Photo QC, and Repacking floor tools
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-500/15 border border-red-500/30 text-red-300 text-xs rounded-xl font-medium text-center">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleOpsLogin}>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[#C5D8B0] block">
              Staff Email / ID
            </label>
            <input
              type="email"
              placeholder="ops@layo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-[#17200D] border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/30 focus:border-[#8BC34A] focus:outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[#C5D8B0] block">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-[#17200D] border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/30 focus:border-[#8BC34A] focus:outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-[#8BC34A] hover:bg-[#9ccc65] text-[#1B250F] font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                <span>Opening Ops App...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">warehouse</span>
                <span>Enter Warehouse Floor</span>
              </>
            )}
          </button>
        </form>

        {/* Alternate Links */}
        <div className="pt-4 border-t border-white/10 flex flex-col gap-2 text-center text-xs text-[#C5D8B0]">
          <Link href="/admin/login" className="hover:text-white transition-colors font-medium text-[11px] flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
            Switch to Admin Master Console Login
          </Link>
          <Link href="/login" className="hover:text-white transition-colors text-[11px]">
            Switch to Customer Portal Login
          </Link>
        </div>

      </div>
    </main>
  );
}
