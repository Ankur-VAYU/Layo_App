import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hlqeddasjkxweiqadege.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscWVkZGFzamt4d2VpcWFkZWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NTcyMTEsImV4cCI6MjA5MzUzMzIxMX0.EJJ_kELoWM2wsQ4GiDkOXSS0Lc5yFQ3Zw-RSIAWMhMA';

const supabase = createClient(supabaseUrl, supabaseKey);

const tables = [
  'customers',
  'shipments',
  'transactions',
  'shipment_activity_logs',
  'boxes',
  'support_tickets'
];

async function backup() {
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const currentBackupDir = path.join(backupDir, `backup_${timestamp}`);
  fs.mkdirSync(currentBackupDir);

  console.log(`Starting backup to ${currentBackupDir}...`);

  for (const table of tables) {
    console.log(`Fetching data from ${table}...`);
    // Note: this fetches up to 1000 rows by default, which is usually enough for a quick dump.
    // For full dumps, pagination would be needed. But as anon key, RLS policies might restrict access.
    const { data, error } = await supabase.from(table).select('*').limit(10000);
    
    if (error) {
      console.error(`Error fetching ${table}:`, error.message);
    } else {
      const filePath = path.join(currentBackupDir, `${table}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`Saved ${data.length} records to ${filePath}`);
    }
  }
  
  console.log('Backup complete!');
}

backup();
