'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

const PAYMENT_METHODS = [
  {
    group: 'UPI',
    items: [
      { id: 'gpay', name: 'Google Pay', icon: 'payments', subtext: 'Pay via GPay UPI ID' },
      { id: 'phonepe', name: 'PhonePe', icon: 'phone_iphone', subtext: 'Pay via PhonePe UPI' },
      { id: 'paytm', name: 'Paytm', icon: 'account_balance_wallet', subtext: 'Paytm UPI & Wallet' },
      { id: 'bhim', name: 'BHIM UPI', icon: 'currency_rupee', subtext: 'Any UPI ID' },
    ],
  },
  {
    group: 'Cards',
    items: [
      { id: 'credit', name: 'Credit Card', icon: 'credit_card', subtext: 'Visa, Mastercard, Amex, RuPay' },
      { id: 'debit', name: 'Debit Card', icon: 'credit_score', subtext: 'All major bank debit cards' },
    ],
  },
  {
    group: 'Net Banking',
    items: [
      { id: 'netbanking', name: 'Net Banking', icon: 'account_balance', subtext: 'All major Indian banks supported' },
    ],
  },
  {
    group: 'Buy Now, Pay Later',
    items: [
      { id: 'simpl', name: 'Simpl', icon: 'splitscreen', subtext: 'Pay later in easy installments' },
      { id: 'lazypay', name: 'LazyPay', icon: 'pending_actions', subtext: 'Instant credit line' },
    ],
  },
];

export default function PaymentsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [showComingSoon, setShowComingSoon] = useState(false);

  const handleSelect = (id: string) => {
    setSelected(id);
    setShowComingSoon(true);
    setTimeout(() => setShowComingSoon(false), 2500);
  };

  return (
    <div className="bg-[#131313] min-h-screen text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#131313]/95 backdrop-blur-md border-b border-white/10 flex items-center gap-3 px-5 h-[10vh]">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center text-on-surface-variant hover:text-white transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <Logo showTagline={false} />
        <div className="flex-1" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Payment Methods</span>
      </header>

      <main className="flex-grow px-5 py-6 max-w-lg mx-auto w-full space-y-6">

        {/* Hero */}
        <div className="bg-primary/10 border border-primary/20 rounded-2xl px-5 py-4 flex items-center gap-4">
          <span className="material-symbols-outlined text-primary text-3xl">lock</span>
          <div>
            <p className="text-white font-bold text-sm">Secure Payments</p>
            <p className="text-on-surface-variant text-[11px] mt-0.5 leading-relaxed">All transactions are encrypted end-to-end. We never store your card details.</p>
          </div>
        </div>

        {/* Coming Soon Toast */}
        {showComingSoon && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] bg-[#1a1a1a] border border-primary/30 rounded-2xl px-6 py-3 shadow-2xl flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-base">schedule</span>
            <p className="text-sm font-bold text-white">Payment integration coming soon!</p>
          </div>
        )}

        {/* Method groups */}
        {PAYMENT_METHODS.map(group => (
          <section key={group.group} className="space-y-2">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary border-l-4 border-primary pl-3">{group.group}</h2>
            <div className="space-y-2">
              {group.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full bg-[#1a1a1a] border rounded-xl px-4 py-3.5 flex items-center gap-4 transition-all hover:border-primary/30 active:scale-[0.99] text-left ${
                    selected === item.id ? 'border-primary/40 bg-primary/5' : 'border-white/10'
                  }`}
                >
                  <span className="material-symbols-outlined text-primary text-2xl leading-none">{item.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{item.name}</p>
                    <p className="text-[10px] text-on-surface-variant mt-0.5">{item.subtext}</p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant text-lg">chevron_right</span>
                </button>
              ))}
            </div>
          </section>
        ))}

        {/* Note */}
        <p className="text-[10px] text-on-surface-variant text-center leading-relaxed px-4">
          Payment options will be available when you proceed to book a shipment. Prices are displayed in CAD.
        </p>
      </main>
    </div>
  );
}
