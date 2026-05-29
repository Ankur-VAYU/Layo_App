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
      
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-[90vh] px-4 relative font-sans">
      <div className="bg-surface-container border border-white/10 rounded-2xl w-full max-w-md p-8 shadow-2xl relative space-y-6">
        <div className="flex flex-col items-center text-center space-y-3">
          <Logo showTagline={false} />
          <h1 className="text-2xl font-extrabold text-white mt-4">Welcome Back</h1>
          <p className="text-on-surface-variant text-sm">Sign in to manage your locker shipments</p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-bold text-center">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleLogin}>
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
          
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block">Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary focus:ring-0 focus:outline-none"
            />
          </div>
          
          <button 
            className="w-full py-4 bg-primary text-background font-bold text-xs uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 mt-2" 
            type="submit" 
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-xs text-on-surface-variant">
          Don't have an account? 
          <Link href="/signup" className="text-primary font-bold hover:underline ml-1">Create Account</Link>
        </p>
      </div>
    </main>
  );
}
