import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hlqeddasjkxweiqadege.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscWVkZGFzamt4d2VpcWFkZWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NTcyMTEsImV4cCI6MjA5MzUzMzIxMX0.EJJ_kELoWM2wsQ4GiDkOXSS0Lc5yFQ3Zw-RSIAWMhMA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log("🔍 Starting Backend-Database Connection Test...");
  
  // 1. Test Auth Service
  try {
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError) throw authError;
    console.log("✅ [AUTH] Service is reachable.");
  } catch (err) {
    console.error("❌ [AUTH] Failed to reach service:", err.message);
  }

  // 2. Test Table Access (Read)
  try {
    const { data, error } = await supabase.from('shipments').select('*').limit(1);
    if (error) {
       if (error.code === '42P01') {
         console.warn("⚠️ [DB] Table 'shipments' does not exist yet. Please run the SQL script I provided.");
       } else {
         throw error;
       }
    } else {
      console.log("✅ [DB] Table 'shipments' is accessible.");
    }
  } catch (err) {
    console.error("❌ [DB] Query failed:", err.message);
  }

  console.log("🏁 Test completed.");
}

testConnection();
