'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { supabase, insertShipment } from '@/lib/supabase';

export default function Checkout() {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderId] = useState(() => `LAYO-${Math.floor(100000000 + Math.random() * 900000000)}`);
  const [orderData, setOrderData] = useState<any>(null);

  useEffect(() => {
    const savedData = localStorage.getItem('layo_pending_shipment');
    if (savedData) {
      setOrderData(JSON.parse(savedData));
    } else {
      // Fallback
      setOrderData({
        weight: "2.75",
        cost: "8,250",
        items: [],
        address: "123 Maple Street, Toronto, ON M5V 2L7",
        mode: "Selection"
      });
    }
  }, []);

  const handlePayment = async () => {
    setIsProcessing(true);
    
    // Simulate Payment
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Save to Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const costCAD = parseFloat(orderData.totalCostCAD || orderData.cost || '0');
      const rate = parseFloat(orderData.exchangeRate || '70.4');
      const totalCostINR = Math.round(costCAD * rate);

      const { error } = await insertShipment({
        user_id: user.id,
        mode: orderData.mode || 'Selection',
        destination_city: orderData.destinationCity || 'Unknown',
        destination_address: orderData.destinationAddress || orderData.address,
        india_warehouse: orderData.indiaWarehouse,
        external_order_id: orderData.orderNumber || orderData.externalOrderId,
        external_tracking: orderData.externalTracking || null,
        total_weight: parseFloat(orderData.totalWeight || orderData.weight || '0'),
        total_cost: totalCostINR,
        items: orderData.items || [],
        status: 'paid',
        payment_method: paymentMethod
      });
      
      if (error) {
        console.error("DB Insert Error:", error);
        throw error;
      }
    } catch (err) {
      console.warn("Supabase insert failed. Error:", err);
    }

    setIsProcessing(false);
    setIsSuccess(true);
    localStorage.removeItem('layo_pending_shipment');
  };

  if (isSuccess) {
    return (
      <main className="min-h-screen bg-background text-on-background flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="bg-surface-container border border-white/10 rounded-2xl w-full max-w-md p-8 shadow-2xl space-y-6 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-2 animate-bounce">
            ✓
          </div>
          <h1 className="text-2xl font-extrabold text-white">Payment Successful!</h1>
          <p className="text-on-surface-variant text-sm">Your shipment locker order has been verified and placed successfully.</p>
          <div className="bg-background border border-white/5 p-4 rounded-xl text-xs space-y-1.5 w-full text-left">
            <p className="text-white"><strong>Order ID:</strong> {orderId}</p>
            <p className="text-on-surface-variant leading-relaxed">
              We have notified our India hubs. Drop-off coordinates and package tagging numbers have been generated.
            </p>
          </div>
          <button 
            className="w-full py-4 bg-primary text-background font-bold text-xs uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-95 transition-all mt-4" 
            onClick={() => router.push('/dashboard')}
          >
            Go to My Shipments
          </button>
        </div>
      </main>
    );
  }

  const costCAD = parseFloat(orderData?.totalCostCAD || orderData?.cost || '0');
  const rate = parseFloat(orderData?.exchangeRate || '70.4');
  const totalCostINR = Math.round(costCAD * rate);

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col font-sans">
      <header className="bg-surface border-b border-white/10 flex justify-between items-center w-full px-6 py-4 sticky top-0 z-50">
        <Logo showTagline={false} />
        <span className="text-on-surface-variant text-xs uppercase tracking-wider font-bold">Secure Checkout</span>
      </header>

      <main className="flex-grow max-w-[1200px] mx-auto px-6 py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <div className="lg:col-span-8 bg-surface-container rounded-2xl p-6 md:p-8 border border-white/10 space-y-6">
            <div>
              <h1 className="text-2xl font-extrabold text-white">Complete Shipment Payment</h1>
              <p className="text-on-surface-variant text-sm mt-1">Review destination details and select payment option.</p>
            </div>

            {/* Delivery address review */}
            <div className="bg-background border border-white/5 rounded-xl p-5 space-y-2">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider">📍 Locker Destination</h3>
              <p className="font-bold text-sm text-white">{orderData?.destinationAddress || orderData?.address}</p>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                Aggregated Express Air Transit: 5-7 Business Days (Insured &amp; Tracked)
              </p>
            </div>

            {/* Payment options */}
            <div className="space-y-4 border-t border-white/5 pt-6">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">💳 Choose Payment Option</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'card', label: 'Credit/Debit', icon: '💳' },
                  { id: 'upi', label: 'UPI / QR', icon: '📱' },
                  { id: 'paypal', label: 'PayPal', icon: '🅿️' }
                ].map(opt => (
                  <button 
                    key={opt.id}
                    onClick={() => setPaymentMethod(opt.id)}
                    className={`py-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === opt.id 
                        ? 'bg-primary/10 border-primary text-primary' 
                        : 'bg-background border-white/5 text-on-surface-variant hover:border-white/15'
                    }`}
                  >
                    <span className="text-lg">{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Card Form */}
              {paymentMethod === 'card' && (
                <div className="space-y-4 border border-white/5 rounded-xl p-5 bg-background animate-in mt-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-on-surface-variant">Cardholder Name</label>
                    <input type="text" placeholder="John Doe" className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-primary focus:ring-0 focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-on-surface-variant">Card Number</label>
                    <input type="text" placeholder="**** **** **** ****" className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-primary focus:ring-0 focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-on-surface-variant">Expiry Date</label>
                      <input type="text" placeholder="MM/YY" className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-primary focus:ring-0 focus:outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-on-surface-variant">Security Code (CVV)</label>
                      <input type="password" placeholder="***" className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-primary focus:ring-0 focus:outline-none" />
                    </div>
                  </div>
                </div>
              )}

              {/* UPI */}
              {paymentMethod === 'upi' && (
                <div className="border border-white/5 rounded-xl p-6 bg-background text-center space-y-4 animate-in mt-4">
                  <div className="w-40 h-40 bg-white mx-auto p-3 rounded-lg flex items-center justify-center font-bold text-xs text-background select-none">
                    [ UPI QR CODE ]
                  </div>
                  <p className="text-xs text-on-surface-variant">Scan the secure QR code using GPay, PhonePe, or BHIM to initiate deposit.</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar checkout summary */}
          <div className="lg:col-span-4 bg-surface-container rounded-2xl p-6 border border-white/10 space-y-6">
            <h3 className="text-lg font-bold text-white">Order Summary</h3>
            
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Shipment Mode</span>
                <span className="text-white font-bold">{orderData?.mode || 'Selection'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Total Weight</span>
                <span className="text-white font-bold">{orderData?.totalWeight || orderData?.weight || '0.00'} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Live Conversion Rate</span>
                <span className="text-white font-bold">1 CAD = ₹{rate.toFixed(2)} INR</span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-3">
                <span className="text-on-surface-variant">Deposit Shipping Fee</span>
                <span className="text-white font-bold">${costCAD.toFixed(2)} CAD</span>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4">
              <div className="flex justify-between items-baseline mb-6">
                <span className="text-sm text-white font-bold">Total Charge</span>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-white">${costCAD.toFixed(2)} <span className="text-xs font-normal text-on-surface-variant">CAD</span></p>
                  <span className="text-[10px] text-primary font-bold uppercase tracking-wider">≈ ₹{totalCostINR.toLocaleString()} INR</span>
                </div>
              </div>

              <button 
                className="w-full py-4 bg-primary text-background font-bold text-xs uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
                onClick={handlePayment}
                disabled={isProcessing}
              >
                {isProcessing ? 'Initiating Transaction...' : `Secure Pay $${costCAD.toFixed(2)} CAD`}
              </button>
            </div>

            <div className="flex flex-col items-center justify-center gap-1.5 text-[10px] text-on-surface-variant opacity-65 pt-2">
              <span>🔒 256-bit SSL Secure Checkout</span>
              <div className="flex gap-2 font-bold tracking-wider">
                <span>VISA</span> • <span>MASTERCARD</span> • <span>STRIPE</span>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
