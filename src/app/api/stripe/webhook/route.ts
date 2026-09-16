/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not defined');
  return new Stripe(secretKey);
};

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err: any  ) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const shipmentId = session.metadata?.shipment_id;
    const userId = session.metadata?.user_id;

    if (shipmentId) {
      try {
        const nowIso = new Date().toISOString();
        
        // 1. Fetch shipment details to check warehouse action
        const { data: currentShipment } = await supabase
          .from('shipments')
          .select('warehouse_action, hold_group_id')
          .eq('id', shipmentId)
          .maybeSingle();

        const isAdvance = session.metadata?.is_advance !== 'false' && session.metadata?.payment_type !== 'balance';
        const amountTotal = session.amount_total ? session.amount_total / 100 : 0;
        const isHoldShipment = session.metadata?.warehouse_action === 'hold' || currentShipment?.warehouse_action === 'hold';
        const targetStatus = isAdvance ? (isHoldShipment ? 'holding' : 'paid') : 'paid';

        if (!currentShipment) {
          // Shipment does not exist yet! Insert it immediately from Stripe metadata so customer orders are never lost
          const totalWeight = parseFloat(session.metadata?.total_weight_kg || '1.0') || 1.0;
          const totalCadMeta = parseFloat(session.metadata?.total_cad || '0');
          const estCostCAD = totalCadMeta > 0 ? totalCadMeta : (isAdvance ? Math.round(amountTotal * 5 * 100) / 100 : amountTotal);
          const remainingCAD = isAdvance ? Math.max(0, Math.round((estCostCAD - amountTotal) * 100) / 100) : 0;

          await supabase.from('shipments').insert({
            id: shipmentId,
            user_id: userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId) ? userId : null,
            mode: 'Online Retailer',
            status: targetStatus,
            destination_city: session.metadata?.destination_city || 'Toronto (GTA)',
            destination_address: session.metadata?.destination_address || 'Canada',
            total_weight: totalWeight,
            total_cost: Math.round(estCostCAD * 68.0),
            payment_method: 'stripe',
            warehouse_action: isHoldShipment ? 'hold' : 'ship',
            expected_packages: 1,
            items: {
              items: [],
              advance_pct: 20,
              advance_amount_cad: isAdvance ? amountTotal : Math.round(estCostCAD * 0.2 * 100) / 100,
              estimated_weight: totalWeight,
              estimated_cost_cad: estCostCAD,
              remaining_balance_cad: remainingCAD,
              payment_status: isAdvance ? 'advance_paid' : 'completed',
              items_summary: session.metadata?.items_summary || null,
            },
            stage_timestamps: {
              [targetStatus]: nowIso,
              paid: nowIso,
              ...(isAdvance ? { advance_paid: nowIso } : { completed: nowIso }),
            },
            stage_history: [
              {
                stage: targetStatus,
                status_label: isHoldShipment ? 'Hold & Consolidation' : (isAdvance ? '20% Advance Paid • Awaiting Warehouse Arrival' : 'Full Payment Settled'),
                timestamp: nowIso,
                done_by_user_id: userId || null,
                done_by_email: session.customer_details?.email || session.customer_email || null,
                done_by_role: 'customer',
                notes: `${isAdvance ? '20% Advance deposit' : 'Remaining balance payment'} of $${amountTotal.toFixed(2)} CAD confirmed via Stripe webhook`,
              }
            ],
            created_at: nowIso,
            updated_at: nowIso,
          });
        } else if (isAdvance) {
          await supabase
            .from('shipments')
            .update({
              status: targetStatus,
              payment_status: 'advance_paid',
              payment_method: 'stripe',
              updated_at: nowIso,
            })
            .eq('id', shipmentId);
        } else {
          // Final balance payment completed
          const updatePayload: Record<string, any> = {
            payment_status: 'completed',
            remaining_balance_cad: 0,
            payment_method: 'stripe',
            updated_at: nowIso,
          };

          if (currentShipment?.hold_group_id) {
            await supabase
              .from('shipments')
              .update(updatePayload)
              .eq('hold_group_id', currentShipment.hold_group_id);
          } else {
            await supabase
              .from('shipments')
              .update(updatePayload)
              .eq('id', shipmentId);
          }
        }

        // 2. Record transaction
        await supabase.from('transactions').insert({
          shipment_id: shipmentId,
          user_id: userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId) ? userId : null,
          amount_cad: amountTotal,
          amount_inr: Math.round(amountTotal * 68.0),
          currency: session.currency?.toUpperCase() || 'CAD',
          exchange_rate: 68.0,
          payment_method: 'stripe',
          stripe_session_id: session.id,
          stripe_payment_intent_id: (session.payment_intent as string) || null,
          status: 'completed',
          customer_email: session.customer_details?.email || session.customer_email || null,
          customer_name: session.customer_details?.name || null,
          description: `Layo shipment payment (Webhook) — Locker #${shipmentId.slice(0, 8).toUpperCase()}`,
          created_at: nowIso,
          updated_at: nowIso,
        });

        // 3. Log to shipment_activity_logs
        await supabase.from('shipment_activity_logs').insert({
          shipment_id: shipmentId,
          stage: targetStatus,
          status_label: isAdvance ? '20% Advance Paid • Awaiting Warehouse Arrival' : 'Payment Completed via Stripe',
          done_by_user_id: userId || null,
          done_by_email: session.customer_details?.email || session.customer_email || null,
          done_by_role: 'customer',
          notes: `Stripe webhook confirmed payment of $${amountTotal.toFixed(2)} ${session.currency?.toUpperCase()}`,
          metadata: { stripe_session_id: session.id },
          created_at: nowIso,
        });
      } catch (dbErr) {
        console.error('Failed to process shipment webhook:', dbErr);
      }
    }
  }

  return NextResponse.json({ received: true });
}
