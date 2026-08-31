/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
  }
  return new Stripe(secretKey);
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      amountCAD,
      shipmentId,
      userId,
      userEmail,
      destinationCity = 'Canada',
      destinationAddress = '',
      warehouseName = 'Indian Locker Hub',
      totalWeightKg = 1.0,
      itemCount = 1,
      itemsSummary = 'Layo International Shipping & Locker Dispatch',
    } = body;

    const numAmount = parseFloat(amountCAD);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: 'Invalid or missing amountCAD' }, { status: 400 });
    }

    const stripe = getStripe();

    // Determine base URL for success/cancel redirects
    const host = request.headers.get('host') || 'www.getlayo.com';
    const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const origin = `${proto}://${host}`;

    // Amount in cents for CAD
    const unitAmountCents = Math.round(numAmount * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: userEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: `Layo Locker Dispatch (${totalWeightKg.toFixed(2)} kg)`,
              description: `Destination: ${destinationCity} | Warehouse: ${warehouseName} | ${itemCount} item(s)`,
            },
            unit_amount: unitAmountCents,
          },
          quantity: 1,
        },
      ],
      client_reference_id: shipmentId || (userId ? `user_${userId}` : undefined),
      metadata: {
        shipment_id: shipmentId || '',
        user_id: userId || '',
        user_email: userEmail || '',
        destination_city: destinationCity,
        destination_address: destinationAddress,
        warehouse: warehouseName,
        total_weight_kg: totalWeightKg.toString(),
        total_cad: numAmount.toFixed(2),
        items_summary: itemsSummary.slice(0, 450),
      },
      success_url: `${origin}/dashboard?session_id={CHECKOUT_SESSION_ID}&payment_status=success`,
      cancel_url: `${origin}/dashboard?payment_status=cancelled`,
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (err: any  ) {
    console.error('Stripe create-checkout-session error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to create Stripe checkout session' },
      { status: 500 }
    );
  }
}
