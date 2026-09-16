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
    const { shipmentId, externalOrderId, rawDraftId, userId } = await request.json();

    if (!shipmentId && !externalOrderId && !rawDraftId) {
      return NextResponse.json({ error: 'Missing shipmentId or externalOrderId' }, { status: 400 });
    }

    const candidateIds = Array.from(
      new Set([shipmentId, externalOrderId, rawDraftId].filter(Boolean).map(s => String(s).trim()))
    );

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    // 1. Delete from draft_estimates by ID (if UUID) or by external_order_id
    for (const cid of candidateIds) {
      try {
        if (uuidRegex.test(cid)) {
          await supabaseAdmin.from('draft_estimates').delete().eq('id', cid);
        }
        await supabaseAdmin.from('draft_estimates').delete().eq('external_order_id', cid);
      } catch (e) {
        console.warn('draft_estimates deletion error:', e);
      }
    }

    // If userId provided and externalOrderId exists, delete matching user drafts
    if (userId && externalOrderId) {
      try {
        await supabaseAdmin
          .from('draft_estimates')
          .delete()
          .eq('user_id', userId)
          .eq('external_order_id', String(externalOrderId).trim());
      } catch (e) {}
    }

    // 2. Delete from shipments table by ID or external_order_id
    for (const cid of candidateIds) {
      try {
        await supabaseAdmin.from('shipments').delete().eq('id', cid);
        await supabaseAdmin.from('shipments').delete().eq('external_order_id', cid);
      } catch (e) {
        console.warn('shipments deletion error:', e);
      }
    }

    // 3. Delete from shipment_activity_logs
    for (const cid of candidateIds) {
      try {
        await supabaseAdmin.from('shipment_activity_logs').delete().eq('shipment_id', cid);
      } catch (e) {}
    }

    return NextResponse.json({ success: true, deletedCandidates: candidateIds });
  } catch (err: any) {
    console.error('Delete shipment API error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
