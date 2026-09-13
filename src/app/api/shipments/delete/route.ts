/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hlqeddasjkxweiqadege.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscWVkZGFzamt4d2VpcWFkZWdlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzk1NzIxMSwiZXhwIjoyMDkzNTMzMjExfQ.tkISs8jGp7s-oy9xGKfgF8Z4FNYBwO7pBmlQxpJmFII';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { shipmentId } = await request.json();

    if (!shipmentId) {
      return NextResponse.json({ error: 'Missing shipmentId' }, { status: 400 });
    }

    const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(shipmentId);

    // Delete by shipmentId using service role admin client from shipments
    const { error } = await supabaseAdmin
      .from('shipments')
      .delete()
      .eq('id', shipmentId);

    // Also delete from draft_estimates table
    try {
      if (isValidUuid) {
        await supabaseAdmin.from('draft_estimates').delete().eq('id', shipmentId);
      }
      await supabaseAdmin.from('draft_estimates').delete().eq('external_order_id', shipmentId);
    } catch (e) {
      console.warn('draft_estimates deletion notice:', e);
    }

    // Also clean up activity logs
    try {
      await supabaseAdmin.from('shipment_activity_logs').delete().eq('shipment_id', shipmentId);
    } catch (e) {}

    if (error) {
      console.error('Failed to delete shipment in Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedId: shipmentId });
  } catch (err: any  ) {
    console.error('Delete shipment API error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
