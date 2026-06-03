'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import { supabase, insertShipment } from '@/lib/supabase';

// ── Razorpay global type ──────────────────────────────────────────
declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Checkout() {
  const router = useRouter();
  const [isProcessing, setIsProcessing]   = useState(false);
  const [isSuccess, setIsSuccess]         = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [orderData, setOrderData]         = useState<any>(null);
  const [completedPaymentId, setCompletedPaymentId] = useState<string | null>(null);
  const [completedOrderRef, setCompletedOrderRef]   = useState<string | null>(null);

  // Exchange rate: 1 CAD ≈ 62 INR (update or fetch live as needed)
  const EXCHANGE_RATE = parseFloat(orderData?.exchangeRate || '62');
  const costCAD       = parseFloat(orderData?.totalCostCAD || orderData?.cost || '0');
  const totalINR      = Math.round(costCAD * EXCHANGE_RATE);

  useEffect(() => {
    const saved = localStorage.getItem('layo_pending_shipment');
    if (saved) {
      setOrderData(JSON.parse(saved));
    } else {
      setOrderData({
        totalCostCAD: '25.00',
        totalWeight: '1.00',
        mode: 'Selection',
        destinationAddress: '—',
        exchangeRate: '62',
      });
    }
    loadRazorpayScript();
  }, []);

  // ── Core payment flow ────────────────────────────────────────────
  const handlePayment = async () => {
    setError(null);
    setIsProcessing(true);

    try {
      // 1. Get logged-in user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be signed in to complete checkout.');
        setIsProcessing(false);
        return;
      }

      // 2. Create Razorpay order on server
      const createRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountINR: totalINR,
          receipt: `layo_${user.id.slice(0, 8)}_${Date.now()}`,
          notes: {
            user_id: user.id,
            destination: orderData?.destinationAddress || '',
            weight_kg: orderData?.totalWeight || '',
          },
        }),
      });

      if (!createRes.ok) {
        const errData = await createRes.json();
        throw new Error(errData.error || 'Could not create payment order');
      }

      const { orderId, amount, currency } = await createRes.json();

      // 3. Load Razorpay checkout
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Razorpay failed to load. Check your connection.');

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount,
        currency,
        name: 'Layo',
        description: `Shipment · ${orderData?.totalWeight || '—'} kg to Canada`,
        order_id: orderId,
        prefill: {
          name:  user.user_metadata?.full_name || '',
          email: user.email || '',
          contact: user.user_metadata?.phone || '',
        },
        theme: { color: '#F2CA50' },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            setError('Payment was cancelled.');
          },
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          // 4. Verify signature on server
          const verifyRes = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
          });

          if (!verifyRes.ok) {
            const errData = await verifyRes.json();
            setError(errData.error || 'Payment verification failed. Contact support.');
            setIsProcessing(false);
            return;
          }

          // 5. Save shipment to Supabase
          try {
            await insertShipment({
              user_id: user.id,
              mode: orderData?.mode || 'Selection',
              destination_city: orderData?.destinationCity || '',
              destination_address: orderData?.destinationAddress || '',
              india_warehouse: orderData?.indiaWarehouse || null,
              external_order_id: orderData?.orderNumber || null,
              external_tracking: orderData?.externalTracking || null,
              total_weight: parseFloat(orderData?.totalWeight || '0'),
              total_cost: totalINR,
              items: orderData?.items || [],
              status: 'paid',
              payment_method: 'razorpay',
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
            } as any);
          } catch (dbErr) {
            console.error('Supabase insert failed:', dbErr);
            // Payment succeeded — still show success; shipment can be reconciled
          }

          localStorage.removeItem('layo_pending_shipment');
          setCompletedPaymentId(response.razorpay_payment_id);
          setCompletedOrderRef(orderId);
          setIsProcessing(false);
          setIsSuccess(true);
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (err: any) => {
        setError(`Payment failed: ${err.error?.description || 'Unknown error'}. Please try again.`);
        setIsProcessing(false);
      });
      rzp.open();

    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setIsProcessing(false);
    }
  };

  // ── Success Screen ───────────────────────────────────────────────
  if (isSuccess) {
    return (
      <main className="min-h-screen bg-background text-on-background flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-surface-container border border-white/10 rounded-2xl w-full max-w-md p-8 shadow-2xl space-y-6 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-green-400 text-4xl">check_circle</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-white">Payment Successful!</h1>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              Your shipment has been confirmed. We've notified our India warehouse team.
            </p>
          </div>
          <div className="bg-background border border-white/5 rounded-xl p-4 text-xs w-full text-left space-y-2">
            {completedOrderRef && (
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Order Ref</span>
                <span className="text-white font-mono font-bold">{completedOrderRef.slice(-12).toUpperCase()}</span>
              </div>
            )}
            {completedPaymentId && (
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Payment ID</span>
                <span className="text-white font-mono font-bold">{completedPaymentId}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Amount Paid</span>
              <span className="text-primary font-bold">₹{totalINR.toLocaleString('en-IN')}</span>
            </div>
          </div>
          <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 text-xs text-primary font-semibold leading-relaxed w-full">
            Expected delivery: 5–7 business days after item(s) reach our India hub.
          </div>
          <button
            className="w-full py-4 bg-primary text-background font-bold text-xs uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-95 transition-all"
            onClick={() => router.push('/dashboard')}
          >
            View My Shipments
          </button>
        </div>
      </main>
    );
  }

  // ── Checkout Form ────────────────────────────────────────────────
  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-sans">
      {/* Header */}
      <header className="bg-surface border-b border-white/10 flex items-center gap-3 w-full px-6 py-4 sticky top-0 z-50">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center text-on-surface-variant hover:text-white transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <Logo showTagline={false} />
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant">
          <span className="material-symbols-outlined text-green-400 text-sm">lock</span>
          Secure Checkout
        </div>
      </header>

      <main className="flex-grow max-w-[1100px] mx-auto px-5 py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ── Left: Details ── */}
          <div className="lg:col-span-8 space-y-6">
            <div>
              <h1 className="text-2xl font-extrabold text-white">Confirm Your Shipment</h1>
              <p className="text-on-surface-variant text-sm mt-1">Review the details below before paying.</p>
            </div>

            {/* Destination */}
            <div className="bg-surface-container border border-white/10 rounded-2xl p-5 space-y-3">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary border-l-4 border-primary pl-3">Delivery Destination</h2>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-xl mt-0.5">location_on</span>
                <div>
                  <p className="text-white font-semibold text-sm">{orderData?.destinationAddress || '—'}</p>
                  <p className="text-on-surface-variant text-[11px] mt-1">Express Air · Insured & Tracked · 5–7 Business Days</p>
                </div>
              </div>
            </div>

            {/* Shipment breakdown */}
            <div className="bg-surface-container border border-white/10 rounded-2xl p-5 space-y-3">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary border-l-4 border-primary pl-3">Shipment Summary</h2>
              <div className="space-y-2.5 text-sm">
                {[
                  { label: 'Mode', value: orderData?.mode || '—' },
                  { label: 'Total Weight', value: `${orderData?.totalWeight || '—'} kg` },
                  { label: 'India Warehouse', value: orderData?.indiaWarehouse || 'To be assigned' },
                  { label: 'Items', value: `${(orderData?.items || []).length} item(s)` },
                ].map(row => (
                  <div key={row.label} className="flex justify-between text-xs">
                    <span className="text-on-surface-variant">{row.label}</span>
                    <span className="text-white font-semibold">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment via Razorpay */}
            <div className="bg-surface-container border border-white/10 rounded-2xl p-5 space-y-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary border-l-4 border-primary pl-3">Payment</h2>
              <div className="bg-background border border-white/5 rounded-xl p-4 flex items-center gap-4">
                <span className="material-symbols-outlined text-primary text-2xl">payments</span>
                <div>
                  <p className="text-white font-bold text-sm">Pay via Razorpay</p>
                  <p className="text-on-surface-variant text-[11px] mt-0.5">UPI · Credit / Debit Card · Net Banking · Wallets · EMI</p>
                </div>
                <div className="ml-auto flex gap-1 text-[9px] font-bold text-on-surface-variant">
                  <span className="px-1.5 py-0.5 bg-white/5 rounded">VISA</span>
                  <span className="px-1.5 py-0.5 bg-white/5 rounded">MC</span>
                  <span className="px-1.5 py-0.5 bg-white/5 rounded">UPI</span>
                </div>
              </div>
              <p className="text-[10px] text-on-surface-variant leading-relaxed">
                Clicking "Pay Now" opens the Razorpay secure checkout. Your card details are never stored on Layo's servers.
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2">
                <span className="material-symbols-outlined text-red-400 text-sm mt-0.5 flex-shrink-0">error</span>
                <p className="text-red-400 text-xs font-semibold">{error}</p>
              </div>
            )}
          </div>

          {/* ── Right: Price Summary ── */}
          <div className="lg:col-span-4 bg-surface-container border border-white/10 rounded-2xl p-6 space-y-5 lg:sticky lg:top-[80px]">
            <h2 className="text-lg font-extrabold text-white">Order Total</h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Shipping Fee</span>
                <span className="text-white font-bold">${costCAD.toFixed(2)} CAD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Rate (1 CAD)</span>
                <span className="text-white font-bold">≈ ₹{EXCHANGE_RATE.toFixed(0)}</span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-3">
                <span className="text-on-surface-variant">You Pay (INR)</span>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-white">₹{totalINR.toLocaleString('en-IN')}</p>
                  <p className="text-[9px] text-on-surface-variant">${costCAD.toFixed(2)} CAD equivalent</p>
                </div>
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={isProcessing || !orderData}
              className="w-full py-4 bg-primary text-background font-bold text-sm uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <span className="w-4 h-4 border-2 border-background/40 border-t-background rounded-full animate-spin" />
                  Opening Checkout…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg leading-none">lock</span>
                  Pay ₹{totalINR.toLocaleString('en-IN')}
                </>
              )}
            </button>

            <div className="flex flex-col items-center gap-1 text-[10px] text-on-surface-variant opacity-60">
              <span>🔒 256-bit SSL · Powered by Razorpay</span>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
