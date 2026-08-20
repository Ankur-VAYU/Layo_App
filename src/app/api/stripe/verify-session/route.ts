import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
  }
  return new Stripe(secretKey);
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id parameter' }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const isPaid = session.payment_status === 'paid';

    return NextResponse.json({
      verified: isPaid,
      status: session.status,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_details?.email || session.customer_email,
      amountTotal: session.amount_total ? session.amount_total / 100 : 0,
      currency: session.currency,
      metadata: session.metadata || {},
      paymentIntentId: session.payment_intent,
    });
  } catch (err: any) {
    console.error('Stripe verify-session error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to verify session' },
      { status: 500 }
    );
  }
}
