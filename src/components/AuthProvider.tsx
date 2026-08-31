'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

const AuthContext = createContext<{ user: User | null; loading: boolean }>({ user: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 0. Handle unhandled rejections (e.g. invalid refresh token or network issues)
    const handleRejection = (e: PromiseRejectionEvent) => {
      const msg = e.reason?.message || String(e.reason) || '';
      if (
        msg.includes('Refresh Token') ||
        msg.includes('refresh_token') ||
        msg.includes('Invalid Refresh Token') ||
        msg.includes('fetch') ||
        msg.includes('NetworkError')
      ) {
        console.warn("Muted background auth/network rejection:", e.reason);
        if (msg.includes('Refresh Token') || msg.includes('refresh_token') || msg.includes('Invalid')) {
          supabase.auth.signOut().catch(() => {});
          setUser(null);
        }
        e.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handleRejection);

    // Fetch system settings from Supabase to sync them to localStorage
    const syncSystemSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('*');
        if (data && !error) {
          const pricingRow = data.find(r => r.key === 'pricing_settings');
          const categoryRow = data.find(r => r.key === 'category_matrix');
          if (pricingRow) {
            localStorage.setItem('layo_pricing_settings', JSON.stringify(pricingRow.value));
          }
          if (categoryRow) {
            localStorage.setItem('layo_master_categories', JSON.stringify(categoryRow.value));
          }
        }
      } catch (e) {
        console.warn("Failed to sync system settings from Supabase:", e);
      }
    };
    syncSystemSettings();

    // 1. Get initial session safely
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) {
          if (error.message?.includes('Refresh Token') || error.message?.includes('refresh_token')) {
            supabase.auth.signOut().catch(() => {});
          }
          setUser(null);
        } else {
          setUser(data.session?.user ?? null);
        }
        setLoading(false);
      })
      .catch(err => {
        console.warn("Supabase session check failed, falling back to guest mode:", err);
        supabase.auth.signOut().catch(() => {});
        setUser(null);
        setLoading(false);
      });

    // 2. Listen for auth changes
    let subscription: any = null;
    try {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);

        if (
          event === 'PASSWORD_RECOVERY' ||
          (typeof window !== 'undefined' && (window.location.hash.includes('type=recovery') || window.location.hash.includes('access_token')))
        ) {
          if (window.location.pathname !== '/reset-password') {
            window.location.href = '/reset-password' + window.location.hash;
          }
        }
      });
      subscription = data.subscription;
    } catch (e) {
      console.warn("Failed to subscribe to auth state changes:", e);
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
