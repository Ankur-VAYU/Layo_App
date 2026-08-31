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
  } catch (err: any) {
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
        
        // 1. Update shipment status and stage timestamps
        await supabase
          .from('shipments')
          .update({
            status: 'paid',
            payment_method: 'stripe',
            updated_at: nowIso,
          })
          .eq('id', shipmentId);

        // 2. Look up customer_id
        let customerId: string | null = null;
        if (userId) {
          const { data: custRow } = await supabase
            .from('customers')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();
          customerId = custRow?.id || null;
        }

        // 3. Record transaction
        const amountTotal = session.amount_total ? session.amount_total / 100 : 0;
        await supabase.from('transactions').insert({
          shipment_id: shipmentId,
          customer_id: customerId,
          user_id: userId || null,
          amount_cad: amountTotal,
          amount_inr: Math.round(amountTotal * 70.4),
          currency: session.currency?.toUpperCase() || 'CAD',
          exchange_rate: 70.4,
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

        // 4. Log to shipment_activity_logs
        await supabase.from('shipment_activity_logs').insert({
          shipment_id: shipmentId,
          stage: 'paid',
          status_label: 'Payment Completed via Stripe',
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
