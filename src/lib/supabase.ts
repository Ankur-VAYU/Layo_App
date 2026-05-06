import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hlqeddasjkxweiqadege.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscWVkZGFzamt4d2VpcWFkZWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NTcyMTEsImV4cCI6MjA5MzUzMzIxMX0.EJJ_kELoWM2wsQ4GiDkOXSS0Lc5yFQ3Zw-RSIAWMhMA';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Supabase credentials missing! Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
