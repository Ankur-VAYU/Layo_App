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

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const shipmentId = session.metadata?.shipment_id;

    if (shipmentId) {
      try {
        await supabase
          .from('shipments')
          .update({
            status: 'paid',
            payment_method: 'stripe',
            updated_at: new Date().toISOString(),
          })
          .eq('id', shipmentId);
      } catch (dbErr) {
        console.error('Failed to update shipment on webhook:', dbErr);
      }
    }
  }

  return NextResponse.json({ received: true });
}
