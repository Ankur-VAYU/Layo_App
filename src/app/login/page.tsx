'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-[90vh] px-4 relative font-sans bg-[#F9F7F1]">
      <div className="bg-white border border-black/10 rounded-3xl w-full max-w-md p-8 shadow-sm relative space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <Logo showTagline={false} darkText={true} />
          <h1 className="text-2xl font-extrabold text-[#0E1F38] mt-4">Welcome</h1>
          <p className="text-[#0E1F38]/60 text-sm font-medium">Sign in to manage your locker shipments</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl font-bold text-center">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleLogin}>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[#0E1F38]/50 block">Email Address</label>
            <input 
              type="email" 
              placeholder="name@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-transparent border border-black/10 rounded-xl px-4 py-3 text-sm text-[#0E1F38] placeholder:text-[#0E1F38]/30 focus:border-[#FF5A65] focus:ring-0 focus:outline-none transition-colors"
            />
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#0E1F38]/50 block">Password</label>
              <Link href="/forgot-password" className="text-[11px] text-[#FF5A65] hover:underline font-bold">
                Forgot password?
              </Link>
            </div>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-transparent border border-black/10 rounded-xl px-4 py-3 text-sm text-[#0E1F38] placeholder:text-[#0E1F38]/30 focus:border-[#FF5A65] focus:ring-0 focus:outline-none transition-colors"
            />
          </div>
          
          <button 
            className="w-full py-4 bg-[#FF5A65] text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-[#ff4754] active:scale-[0.98] transition-all disabled:opacity-50 mt-2 shadow-sm" 
            type="submit" 
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="pt-2 border-t border-black/5 space-y-2 text-center text-xs">
          <p className="text-[#0E1F38]/60 font-medium">
            Don't have an account? 
            <Link href="/signup" className="text-[#FF5A65] font-bold hover:underline ml-1">Create Account</Link>
          </p>
          <div className="pt-1">
            <Link href="/admin/login" className="text-[11px] text-[#0E1F38]/40 hover:text-[#0E1F38] transition-colors flex items-center justify-center gap-1 font-semibold">
              <span className="material-symbols-outlined text-xs">admin_panel_settings</span>
              Staff / Admin Portal Sign In ➔
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
