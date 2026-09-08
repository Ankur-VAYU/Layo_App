import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hlqeddasjkxweiqadege.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscWVkZGFzamt4d2VpcWFkZWdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzk1NzIxMSwiZXhwIjoyMDkzNTMzMjExfQ.tkISs8jGp7s-oy9xGKfgF8Z4FNYBwO7pBmlQxpJmFII';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ exists: false, error: 'Email is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (error) {
      console.error('Error listing users via admin:', error);
      // Fallback to true to allow standard Supabase flow if admin check fails
      return NextResponse.json({ exists: true });
    }

    const userFound = data?.users?.some(
      (u) => u.email && u.email.toLowerCase() === cleanEmail
    );

    return NextResponse.json({ exists: Boolean(userFound) });
  } catch (err: any) {
    console.error('Error in check-user route:', err);
    return NextResponse.json({ exists: true });
  }
}
