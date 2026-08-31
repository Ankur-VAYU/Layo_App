import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { shipmentId } = await request.json();

    if (!shipmentId) {
      return NextResponse.json({ error: 'Missing shipmentId' }, { status: 400 });
    }

    // Delete only by shipmentId — do NOT filter by userId
    // (many rows have NULL user_id due to legacy inserts; filtering by userId
    //  would cause those rows to silently not be deleted)
    const { error } = await supabase
      .from('shipments')
      .delete()
      .eq('id', shipmentId);

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
