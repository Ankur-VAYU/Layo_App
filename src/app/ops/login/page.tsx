/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

const ADMIN_EMAILS = [
  'ankur.iitd.nita@gmail.com',
  'ankur@layo.com',
  'admin@layo.com',
];

export default function OpsLoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hubLocation, setHubLocation] = useState('Delhi NCR Hub');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState(false);

  // If already logged in, check approval status
  useEffect(() => {
    if (!loading && user) {
      checkStaffApprovalAndRedirect(user.email || '');
    }
  }, [user, loading, router]);

  const checkStaffApprovalAndRedirect = async (userEmail: string) => {
    const normalized = userEmail.trim().toLowerCase();
    if (ADMIN_EMAILS.includes(normalized)) {
      router.push('/ops');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('ops_staff')
        .select('*')
        .eq('email', normalized)
        .maybeSingle();

      if (error) throw error;

      if (!data || data.status === 'pending') {
        setPendingApproval(true);
      } else if (data.status === 'approved') {
        router.push('/ops');
      } else if (data.status === 'rejected') {
        setError('Your ops staff access has been rejected or revoked by Admin.');
        await supabase.auth.signOut();
      }
    } catch {
      // Fallback: If table doesn't exist yet, allow admin or redirect
      if (ADMIN_EMAILS.includes(normalized)) {
        router.push('/ops');
      } else {
        setPendingApproval(true);
      }
    }
  };

  const handleOpsAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setPendingApproval(false);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      if (mode === 'signin') {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (authError) throw authError;

        // Check if approved
        if (ADMIN_EMAILS.includes(normalizedEmail)) {
          router.push('/ops');
          return;
        }

        const { data: staffData } = await supabase
          .from('ops_staff')
          .select('*')
          .eq('email', normalizedEmail)
          .maybeSingle();

        if (!staffData || staffData.status === 'pending') {
          setPendingApproval(true);
          await supabase.auth.signOut();
        } else if (staffData.status === 'approved') {
          router.push('/ops');
        } else {
          setError('Your ops staff access request was rejected by Admin.');
          await supabase.auth.signOut();
        }

      } else {
        // Sign up flow
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              full_name: fullName,
              role: 'ops',
              hub_location: hubLocation,
            }
          }
        });

        if (signUpError) throw signUpError;

        // Insert into ops_staff table as pending
        try {
          await supabase.from('ops_staff').upsert([{
            email: normalizedEmail,
            full_name: fullName,
            hub_location: hubLocation,
            status: ADMIN_EMAILS.includes(normalizedEmail) ? 'approved' : 'pending',
            created_at: new Date().toISOString()
          }], { onConflict: 'email' });
        } catch (dbErr) {
          console.warn('Ops staff table record creation fallback:', dbErr);
        }

        if (ADMIN_EMAILS.includes(normalizedEmail)) {
          router.push('/ops');
        } else {
          setPendingApproval(true);
        }
      }
    } catch (err: any  ) {
      setError(err.message || 'Authentication failed.');
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
          <h1 className="text-xl font-extrabold text-white">
            {mode === 'signin' ? 'Hub Staff Sign In' : 'Request Staff Access'}
          </h1>
          <p className="text-[#C5D8B0] text-xs">
            {mode === 'signin'
              ? 'Package Inwarding, Mobile Photo QC & Repacking Floor'
              : 'Submit staff details for Admin Authorization'}
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-[#17200D] p-1 rounded-xl border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(null); setPendingApproval(false); }}
            className={`flex-1 py-2 font-bold rounded-lg transition-all ${
              mode === 'signin' ? 'bg-[#8BC34A] text-[#1B250F] shadow-sm' : 'text-white/60 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); setPendingApproval(false); }}
            className={`flex-1 py-2 font-bold rounded-lg transition-all ${
              mode === 'signup' ? 'bg-[#8BC34A] text-[#1B250F] shadow-sm' : 'text-white/60 hover:text-white'
            }`}
          >
            Request Access
          </button>
        </div>

        {pendingApproval && (
          <div className="p-4 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs rounded-2xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-200">
              <span className="material-symbols-outlined text-base">hourglass_top</span>
              <span>Awaiting Admin Approval</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-300/90">
              Your Ops account request has been registered. An admin will review and approve your floor access shortly.
            </p>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-red-500/15 border border-red-500/30 text-red-300 text-xs rounded-xl font-medium text-center">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleOpsAuth}>
          {mode === 'signup' && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#C5D8B0] block">
                  Staff Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  className="w-full bg-[#17200D] border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/30 focus:border-[#8BC34A] focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#C5D8B0] block">
                  Assigned India Hub Location
                </label>
                <select
                  value={hubLocation}
                  onChange={e => setHubLocation(e.target.value)}
                  className="w-full bg-[#17200D] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-[#8BC34A] focus:outline-none transition-all cursor-pointer"
                >
                  <option value="Delhi NCR Hub">Delhi NCR Hub (Okhla Phase 3)</option>
                  <option value="Mumbai Hub">Mumbai Hub (Bhiwandi)</option>
                  <option value="Bangalore Hub">Bangalore Hub (Whitefield)</option>
                </select>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[#C5D8B0] block">
              Work Email / Staff ID
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
                <span>{mode === 'signin' ? 'Opening Ops App...' : 'Submitting Request...'}</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">
                  {mode === 'signin' ? 'warehouse' : 'send'}
                </span>
                <span>{mode === 'signin' ? 'Enter Warehouse Floor' : 'Submit Access Request'}</span>
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
