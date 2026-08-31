/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

// Instantiated lazily inside POST to prevent Next.js build-time crashes when env vars are missing
const getRazorpay = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key_id',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_key_secret',
  });
};

export async function POST(request: NextRequest) {
  try {
    const { amountINR, currency = 'INR', receipt, notes } = await request.json();

    if (!amountINR || amountINR <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Razorpay expects amount in smallest currency unit (paise for INR)
    const amountPaise = Math.round(amountINR * 100);

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency,
      receipt: receipt || `layo_${Date.now()}`,
      notes: notes || {},
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
    });
  } catch (err: any  ) {
    console.error('Razorpay create-order error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
