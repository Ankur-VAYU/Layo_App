import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { shipmentId, userId } = await request.json();

    if (!shipmentId) {
      return NextResponse.json({ error: 'Missing shipmentId' }, { status: 400 });
    }

    // Perform delete in Supabase
    let query = supabase.from('shipments').delete().eq('id', shipmentId);
    if (userId) {
      // Optional extra safety: verify matching user
      query = query.eq('user_id', userId);
    }

    const { error, count } = await query;

    if (error) {
      console.error('Failed to delete shipment in Supabase:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedId: shipmentId });
  } catch (err: any) {
    console.error('Delete shipment API error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
