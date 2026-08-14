'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

const DEFAULT_WAREHOUSES = [
  {
    id: 'delhi',
    name: 'Delhi NCR Hub (North India)',
    address: 'Plot 42, Udyog Vihar Phase 4, Sector 18, Gurugram, Haryana',
    city: 'Gurugram',
    state: 'Haryana',
    pincode: '122015',
    contact: '+91 98100 12345',
    tag: 'Recommended for Delhi, Punjab, UP & North India sellers',
  },
  {
    id: 'mumbai',
    name: 'Mumbai Hub (West India)',
    address: 'Unit 12, Logistics Park, Mankoli Naka, Bhiwandi, Maharashtra',
    city: 'Mumbai / Thane',
    state: 'Maharashtra',
    pincode: '421302',
    contact: '+91 98200 54321',
    tag: 'Recommended for Maharashtra, Gujarat & West India sellers',
  },
  {
    id: 'bangalore',
    name: 'Bangalore Hub (South India)',
    address: '77, Electronic City Phase 1, Hosur Road, Bangalore, Karnataka',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560100',
    contact: '+91 98450 67890',
    tag: 'Recommended for Karnataka, Tamil Nadu, Kerala & South India sellers',
  },
];

export default function Checkout() {
  const router = useRouter();
  const [isProcessing, setIsProcessing]   = useState(false);
  const [isSuccess, setIsSuccess]         = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [orderData, setOrderData]         = useState<any>(null);
  const [warehouses, setWarehouses]       = useState<any[]>(DEFAULT_WAREHOUSES);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('delhi');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [completedPaymentId, setCompletedPaymentId] = useState<string | null>(null);
  const [completedOrderRef, setCompletedOrderRef]   = useState<string | null>(null);
  const [currentUser, setCurrentUser]     = useState<any>(null);

  // Exchange rate & pricing
  const [cadToInrRate, setCadToInrRate] = useState<number>(70.4);

  useEffect(() => {
    // 1. Fetch live CAD to INR exchange rate
    const fetchRate = async () => {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/CAD');
        if (res.ok) {
          const data = await res.json();
          if (data?.rates?.INR) {
            setCadToInrRate(data.rates.INR);
          }
        }
      } catch (err) {
        console.error('Failed to fetch exchange rate', err);
      }
    };
    fetchRate();

    // 2. Fetch authenticated user
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUser(data.user);
      }
    });

    // 3. Fetch warehouses from Supabase if available
    const fetchWhs = async () => {
      try {
        const { data, error } = await supabase.from('warehouses').select('*');
        if (!error && data && data.length > 0) {
          setWarehouses(data);
        }
      } catch (err) {
        console.warn('Using default warehouses list', err);
      }
    };
    fetchWhs();

    // 4. Restore pending shipment from localStorage
    const saved = localStorage.getItem('layo_pending_shipment');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setOrderData(parsed);
        if (parsed.indiaWarehouse) {
          setSelectedWarehouseId(parsed.indiaWarehouse);
        }
        if (parsed.exchangeRate) {
          setCadToInrRate(parseFloat(parsed.exchangeRate));
        }
      } catch (e) {
        console.error('Error parsing stored shipment', e);
      }
    } else {
      // Fallback initial draft
      setOrderData({
        totalCostCAD: 25.0,
        totalWeight: 1.0,
        mode: 'Selection',
        destinationAddress: '',
        destinationCity: 'Toronto, ON',
        originType: 'online',
        storeName: '',
        orderNumber: '',
        items: [],
        indiaWarehouse: 'delhi',
      });
    }

    loadRazorpayScript();
  }, []);

  // Sync selected warehouse with orderData
  const handleWarehouseChange = (whId: string) => {
    setSelectedWarehouseId(whId);
    if (orderData) {
      const updated = { ...orderData, indiaWarehouse: whId };
      setOrderData(updated);
      localStorage.setItem('layo_pending_shipment', JSON.stringify(updated));
    }
  };

  const selectedWarehouse = warehouses.find(
    (w) => w.id === selectedWarehouseId || w.id === orderData?.indiaWarehouse
  ) || warehouses[0];

  const costCAD = parseFloat(orderData?.totalCostCAD || orderData?.cost || '25.00');
  const totalINR = Math.round(costCAD * (cadToInrRate || 70.4));
  const totalWeightKg = parseFloat(orderData?.totalWeight || orderData?.weight || '1.00');
  const itemsList = orderData?.items || [];

  const handleCopyLockerAddress = () => {
    if (!selectedWarehouse) return;
    const fullAddress = `Layo Locker (User: ${currentUser?.email || 'Valued Customer'})\n${selectedWarehouse.name}\n${selectedWarehouse.address}\n${selectedWarehouse.city}, ${selectedWarehouse.state || ''} - ${selectedWarehouse.pincode}\nPhone: ${selectedWarehouse.contact || '+91 98100 12345'}`;
    navigator.clipboard.writeText(fullAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2500);
  };

  // ── Core payment flow ────────────────────────────────────────────
  const handlePayment = async () => {
    setError(null);
    setIsProcessing(true);

    try {
      // 1. Get logged-in user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Save current progress and direct to login
        localStorage.setItem('layo_pending_shipment', JSON.stringify({
          ...orderData,
          indiaWarehouse: selectedWarehouseId,
          totalCostCAD: costCAD,
          totalWeight: totalWeightKg,
        }));
        router.push('/login?redirect=/checkout');
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
            destination: orderData?.destinationAddress || orderData?.destinationCity || 'Canada',
            weight_kg: totalWeightKg.toString(),
            warehouse: selectedWarehouse?.name || selectedWarehouseId,
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
      if (!loaded) throw new Error('Razorpay failed to load. Please check your internet connection.');

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount,
        currency,
        name: 'Layo',
        description: `Shipment · ${totalWeightKg.toFixed(2)} kg to Canada`,
        order_id: orderId,
        prefill: {
          name:  user.user_metadata?.full_name || '',
          email: user.email || '',
          contact: user.user_metadata?.phone || '',
        },
        theme: { color: '#FF5A65' },
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
            setError(errData.error || 'Payment verification failed. Please contact support.');
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
              india_warehouse: selectedWarehouse?.name || selectedWarehouseId,
              external_order_id: orderData?.orderNumber || null,
              external_tracking: orderData?.externalTracking || null,
              total_weight: totalWeightKg,
              total_cost: totalINR,
              items: itemsList,
              status: 'paid',
              payment_method: 'razorpay',
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
            } as any);
          } catch (dbErr) {
            console.error('Supabase insert error:', dbErr);
          }

          localStorage.removeItem('layo_pending_shipment');
          localStorage.removeItem('layo_pending_shipment_draft');
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
      <main className="min-h-screen bg-[#FAF8EE] text-[#0E1F38] flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-white border border-black/10 rounded-3xl w-full max-w-lg p-8 md:p-10 shadow-xl space-y-6 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600">
            <span className="material-symbols-outlined text-4xl">check_circle</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-black text-[#0E1F38]">Payment Confirmed!</h1>
            <p className="text-[#0E1F38]/70 text-sm leading-relaxed font-light">
              Your locker order is booked. Our warehouse team in India has been alerted to receive and inspect your package.
            </p>
          </div>

          <div className="bg-[#FAF8EE] border border-black/5 rounded-2xl p-5 text-xs w-full text-left space-y-3">
            {completedOrderRef && (
              <div className="flex justify-between items-center">
                <span className="text-[#0E1F38]/60 font-medium">Order Reference</span>
                <span className="text-[#0E1F38] font-mono font-bold">{completedOrderRef.slice(-12).toUpperCase()}</span>
              </div>
            )}
            {completedPaymentId && (
              <div className="flex justify-between items-center">
                <span className="text-[#0E1F38]/60 font-medium">Payment ID</span>
                <span className="text-[#0E1F38] font-mono font-bold">{completedPaymentId}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-[#0E1F38]/60 font-medium">India Warehouse</span>
              <span className="text-[#0E1F38] font-bold">{selectedWarehouse?.name || 'Assigned'}</span>
            </div>
            <div className="flex justify-between items-center border-t border-black/5 pt-2">
              <span className="text-[#0E1F38]/60 font-medium">Total Paid</span>
              <span className="text-[#FF5A65] font-black text-sm">₹{totalINR.toLocaleString('en-IN')} <span className="text-[10px] text-[#0E1F38]/50 font-normal">(${costCAD.toFixed(2)} CAD)</span></span>
            </div>
          </div>

          <div className="bg-[#FF5A65]/10 border border-[#FF5A65]/20 rounded-2xl p-4 text-xs text-[#0E1F38] font-medium leading-relaxed w-full flex items-start gap-2 text-left">
            <span className="material-symbols-outlined text-[#FF5A65] text-lg flex-shrink-0 mt-0.5">local_shipping</span>
            <span>
              Expected delivery: <strong>5–7 business days</strong> after your items arrive at our {selectedWarehouse?.city || 'India'} hub.
            </span>
          </div>

          <div className="w-full flex flex-col sm:flex-row gap-3 pt-2">
            <button
              className="flex-1 py-4 bg-[#FF5A65] text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-[#E24550] active:scale-95 transition-all shadow-md shadow-[#FF5A65]/15"
              onClick={() => router.push('/dashboard')}
            >
              View in My Locker
            </button>
            <button
              className="flex-1 py-4 border border-black/10 text-[#0E1F38] font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-black/5 transition-all"
              onClick={() => router.push('/')}
            >
              Back to Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Checkout Form ────────────────────────────────────────────────
  return (
    <div className="bg-[#FAF8EE] text-[#0E1F38] min-h-screen flex flex-col font-sans">
      {/* Header */}
      <header className="bg-[#FAF8EE]/90 backdrop-blur border-b border-black/10 flex items-center justify-between w-full px-6 py-4 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-10 h-10 rounded-full border border-black/10 bg-white flex items-center justify-center text-[#0E1F38] hover:text-[#FF5A65] hover:border-[#FF5A65] transition-colors shadow-sm cursor-pointer"
            aria-label="Back to dashboard"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </button>
          <Link href="/">
            <Logo showTagline={false} />
          </Link>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-full">
          <span className="material-symbols-outlined text-sm">lock</span>
          256-bit Secure Checkout
        </div>
      </header>

      <main className="flex-grow max-w-[1150px] mx-auto px-5 py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ── Left: Details & Warehouse Selection ── */}
          <div className="lg:col-span-8 space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#FF5A65] mb-1">
                <span>Step 2 of 2</span>
                <span>•</span>
                <span>Order Confirmation</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#0E1F38]">Confirm Your Shipment</h1>
              <p className="text-[#0E1F38]/70 text-sm mt-1 font-light">
                Review your items, copy your India delivery locker address, and pay securely.
              </p>
            </div>

            {/* ── SECTION 1: India Warehouse Hub Selection (CRITICAL) ── */}
            <div className="bg-white border border-black/5 rounded-3xl p-6 md:p-8 space-y-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 pb-4">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-[0.15em] text-[#FF5A65] flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">warehouse</span>
                    1. Select &amp; Share India Warehouse Address
                  </h2>
                  <p className="text-xs text-[#0E1F38]/60 mt-0.5">
                    Share this exact address with your online shopping store (Amazon India, Myntra, etc.) or local sender.
                  </p>
                </div>
                <span className="px-3 py-1 bg-[#FF5A65]/10 text-[#FF5A65] rounded-full text-[11px] font-bold self-start sm:self-auto">
                  Required
                </span>
              </div>

              {/* Warehouse Dropdown */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#0E1F38]">Select Warehouse Location</label>
                <div className="relative">
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => handleWarehouseChange(e.target.value)}
                    className="w-full bg-[#FAF8EE] border border-black/10 rounded-2xl px-4 py-3.5 text-xs text-[#0E1F38] font-bold focus:outline-none focus:border-[#FF5A65] appearance-none cursor-pointer pr-10 shadow-sm"
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        📍 {wh.name} — {wh.city} ({wh.pincode})
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-black/40 pointer-events-none text-xl">
                    expand_more
                  </span>
                </div>
              </div>

              {/* Locker Address Card with One-Click Copy */}
              {selectedWarehouse && (
                <div className="bg-[#FAF8EE] border-2 border-dashed border-[#FF5A65]/30 rounded-2xl p-5 space-y-4 relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 text-xs text-[#0E1F38]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#0E1F38]">{selectedWarehouse.name}</span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">Active Hub</span>
                      </div>
                      <p className="text-xs text-[#0E1F38]/80 leading-relaxed pt-1">
                        <strong>Address:</strong> {selectedWarehouse.address}
                      </p>
                      <p className="text-xs text-[#0E1F38]/80">
                        <strong>City &amp; State:</strong> {selectedWarehouse.city}, {selectedWarehouse.state || ''} — <strong>PIN:</strong> {selectedWarehouse.pincode}
                      </p>
                      <p className="text-xs text-[#0E1F38]/80">
                        <strong>Locker Contact / Phone:</strong> {selectedWarehouse.contact || '+91 98100 12345'}{' '}
                        <span className="text-[10px] text-[#FF5A65] font-semibold">(use for courier SMS updates)</span>
                      </p>
                    </div>

                    <button
                      onClick={handleCopyLockerAddress}
                      className="px-4 py-2.5 bg-[#0E1F38] hover:bg-[#FF5A65] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {copiedAddress ? 'check' : 'content_copy'}
                      </span>
                      {copiedAddress ? 'Copied!' : 'Copy Address'}
                    </button>
                  </div>

                  <div className="text-[11px] text-[#0E1F38]/70 bg-white/70 border border-black/5 rounded-xl p-3 flex items-start gap-2">
                    <span className="material-symbols-outlined text-[#FF5A65] text-sm mt-0.5">info</span>
                    <span>
                      <strong>Pro-tip:</strong> When ordering on Indian websites, enter your name as <code>Your Name (Layo Locker)</code> and set the delivery destination to this warehouse address.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ── SECTION 2: Destination & Origin Details ── */}
            <div className="bg-white border border-black/5 rounded-3xl p-6 md:p-8 space-y-5 shadow-sm">
              <h2 className="text-xs font-black uppercase tracking-[0.15em] text-[#FF5A65] flex items-center gap-2 border-b border-black/5 pb-4">
                <span className="material-symbols-outlined text-lg">local_shipping</span>
                2. Delivery Destination &amp; Order Reference
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="bg-[#FAF8EE] border border-black/5 rounded-2xl p-4 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-[#0E1F38]/50">Destination Address</span>
                  <p className="font-bold text-[#0E1F38] text-sm">
                    {orderData?.destinationAddress || orderData?.destinationCity || 'Canada (Address provided)'}
                  </p>
                  <p className="text-[11px] text-[#0E1F38]/60">Express Air · Insured &amp; Tracked · 5–7 Business Days</p>
                </div>

                <div className="bg-[#FAF8EE] border border-black/5 rounded-2xl p-4 space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-[#0E1F38]/50">Order / Store Details</span>
                  <p className="font-bold text-[#0E1F38] text-sm">
                    {orderData?.storeName ? `Store: ${orderData.storeName}` : 'Indian Online / Offline Store'}
                  </p>
                  <p className="text-[11px] text-[#0E1F38]/60">
                    Order Ref: <strong>{orderData?.orderNumber || 'Pending Courier / Order ID'}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* ── SECTION 3: Itemized Shipment Breakdown ── */}
            <div className="bg-white border border-black/5 rounded-3xl p-6 md:p-8 space-y-5 shadow-sm">
              <div className="flex justify-between items-center border-b border-black/5 pb-4">
                <h2 className="text-xs font-black uppercase tracking-[0.15em] text-[#FF5A65] flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">inventory_2</span>
                  3. Items in this Locker Shipment
                </h2>
                <span className="text-xs font-bold text-[#0E1F38]">
                  {itemsList.length} Item Type{itemsList.length !== 1 ? 's' : ''} ({totalWeightKg.toFixed(2)} kg)
                </span>
              </div>

              {itemsList.length === 0 ? (
                <div className="bg-[#FAF8EE] border border-black/5 rounded-2xl p-6 text-center space-y-3">
                  <span className="material-symbols-outlined text-3xl text-black/30">inventory</span>
                  <p className="text-xs text-[#0E1F38]/70 font-light">
                    No individual items specified yet. Standard custom locker package rate applied (1.00 kg).
                  </p>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="px-5 py-2.5 bg-[#FF5A65] text-white rounded-xl text-xs font-bold hover:bg-[#E24550] transition-colors shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    Customize Items in Locker Wizard
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-black/5">
                  {itemsList.map((item: any, idx: number) => (
                    <div key={idx} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#FF5A65]/10 text-[#FF5A65] font-bold text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-[#0E1F38]">{item.subcategory || item.category || 'Package Item'}</p>
                          <p className="text-[10px] text-[#0E1F38]/60">
                            Category: {item.category} {item.demographic ? `• ${item.demographic}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#0E1F38]">Qty: {item.quantity || item.qty || 1}</p>
                        <p className="text-[10px] text-[#0E1F38]/60">
                          {((item.weight || item.weightGrams / 1000 || 0.25) * (item.quantity || 1)).toFixed(2)} kg
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── SECTION 4: Payment Method Selection ── */}
            <div className="bg-white border border-black/5 rounded-3xl p-6 md:p-8 space-y-4 shadow-sm">
              <h2 className="text-xs font-black uppercase tracking-[0.15em] text-[#FF5A65] flex items-center gap-2 border-b border-black/5 pb-4">
                <span className="material-symbols-outlined text-lg">credit_card</span>
                4. Payment Method
              </h2>

              <div className="bg-[#FAF8EE] border-2 border-[#FF5A65] rounded-2xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#FF5A65]/10 flex items-center justify-center text-[#FF5A65]">
                  <span className="material-symbols-outlined text-xl">payments</span>
                </div>
                <div>
                  <p className="text-[#0E1F38] font-bold text-sm">Pay via Razorpay Secure Gateway</p>
                  <p className="text-[#0E1F38]/60 text-[11px] mt-0.5">
                    UPI (Google Pay, PhonePe, Paytm) · Cards (Visa, Mastercard, RuPay) · Net Banking · Wallets
                  </p>
                </div>
                <div className="ml-auto hidden sm:flex gap-1.5 text-[10px] font-bold text-[#0E1F38]/60">
                  <span className="px-2 py-1 bg-white rounded-md border border-black/5 shadow-xs">UPI</span>
                  <span className="px-2 py-1 bg-white rounded-md border border-black/5 shadow-xs">VISA</span>
                  <span className="px-2 py-1 bg-white rounded-md border border-black/5 shadow-xs">MC</span>
                </div>
              </div>

              <p className="text-[11px] text-[#0E1F38]/60 leading-relaxed font-light">
                Clicking <strong>&ldquo;Pay &amp; Book Shipment&rdquo;</strong> initiates Razorpay&apos;s encrypted 256-bit payment gateway. Your financial credentials are never saved on Layo.
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-2.5">
                <span className="material-symbols-outlined text-red-500 text-lg mt-0.5 flex-shrink-0">error</span>
                <p className="text-red-600 text-xs font-semibold">{error}</p>
              </div>
            )}
          </div>

          {/* ── Right: Sticky Order Total & Pay CTA ── */}
          <div className="lg:col-span-4 bg-white border border-black/5 rounded-3xl p-6 md:p-8 space-y-6 lg:sticky lg:top-[90px] shadow-sm">
            <h2 className="text-xl font-black text-[#0E1F38] border-b border-black/5 pb-4">
              Order Total
            </h2>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#0E1F38]/70">Total Billable Weight</span>
                <span className="text-[#0E1F38] font-bold">{totalWeightKg.toFixed(2)} kg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#0E1F38]/70">Shipping Fee (CAD)</span>
                <span className="text-[#0E1F38] font-bold">${costCAD.toFixed(2)} CAD</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#0E1F38]/70">Live Forex Rate</span>
                <span className="text-[#0E1F38] font-bold">1 CAD ≈ ₹{cadToInrRate.toFixed(1)}</span>
              </div>

              <div className="flex justify-between items-baseline border-t border-black/5 pt-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0E1F38]">You Pay (INR)</span>
                  <p className="text-[10px] text-[#0E1F38]/50 mt-0.5">${costCAD.toFixed(2)} CAD equivalent</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-[#FF5A65]">₹{totalINR.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full py-4 bg-[#FF5A65] text-white font-bold text-sm uppercase tracking-widest rounded-2xl hover:bg-[#E24550] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#FF5A65]/20 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Opening Checkout…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg leading-none">lock</span>
                  Pay ₹{totalINR.toLocaleString('en-IN')}
                </>
              )}
            </button>

            <div className="pt-2 border-t border-black/5 space-y-2 text-[11px] text-[#0E1F38]/60">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-sm">verified_user</span>
                <span>100% Insured &amp; Doorstep Tracked Delivery</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-sm">lock</span>
                <span>Protected by Razorpay &amp; RBI Compliance</span>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
