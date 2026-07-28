'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

const AuthContext = createContext<{ user: User | null; loading: boolean }>({ user: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 0. Handle unhandled fetch rejections from offline Supabase client
    const handleRejection = (e: PromiseRejectionEvent) => {
      const msg = e.reason?.message || String(e.reason);
      if (msg && (msg.includes('fetch') || msg.includes('Fetch') || msg.includes('NetworkError'))) {
        console.warn("Caught and muted background network/fetch rejection:", e.reason);
        e.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handleRejection);

    // 1. Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch(err => {
        console.warn("Supabase connection failed. App is running in offline mode.", err);
        setUser(null);
        setLoading(false);
      });

    // 2. Listen for changes
    let subscription: any = null;
    try {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      });
      subscription = data?.subscription;
    } catch (err) {
      console.warn("Supabase auth listener registration failed.", err);
    }

    return () => {
      window.removeEventListener('unhandledrejection', handleRejection);
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
