'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';

const STEPS = [
  {
    icon: 'storefront',
    title: 'You Shop in India',
    body: 'Order from any Indian e-commerce site — Myntra, Amazon.in, Meesho, or even local stores. Have them deliver to your Layo virtual address in India, or drop off items yourself.',
  },
  {
    icon: 'warehouse',
    title: 'We Hold & Combine',
    body: 'Your items arrive at our secure Gurugram or Mumbai facility. We hold them free for up to 30 days so you can consolidate multiple orders into one box — cutting shipping costs dramatically.',
  },
  {
    icon: 'scale',
    title: 'We Weigh & Verify',
    body: 'Each item is weighed, photographed, and logged. You get a final weight-based quote before we ship anything. No surprises at the border.',
  },
  {
    icon: 'flight',
    title: 'We Ship to Canada',
    body: 'Your consolidated parcel ships direct to your Canadian door at ₹12 per kg. We handle customs paperwork, duties guidance, and tracking end-to-end.',
  },
  {
    icon: 'celebration',
    title: 'You Save Up to 70%',
    body: 'Canadian retail prices on Indian brands are 2–3× higher than buying direct. By buying in India and shipping smart, you keep the savings — on clothes, toys, beauty, home goods and more.',
  },
];

const WHY_ITEMS = [
  { icon: 'price_check', title: '↓70% vs Canadian Retail', body: 'Indian-made goods cost a fraction of what Canadian stores charge for the same quality.' },
  { icon: 'inventory_2', title: '30-Day Free Hold', body: 'Consolidate multiple orders into one parcel. Fewer boxes = much lower shipping cost.' },
  { icon: 'verified_user', title: 'Insured & Verified', body: 'Every item is photographed and weighed at our facility. You see what ships before it ships.' },
  { icon: 'support_agent', title: 'Dedicated Support', body: 'Real humans reachable on WhatsApp. We handle customs queries, returns, and delays.' },
  { icon: 'payments', title: 'Transparent Pricing', body: 'Flat ₹2,500/kg shipping, no hidden fees. You approve the quote before we move a single item.' },
];

export default function LayoLogicPage() {
  const router = useRouter();

  return (
    <div className="bg-[#131313] min-h-screen text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#131313]/95 backdrop-blur-md border-b border-white/10 flex items-center gap-3 px-5 h-[10vh]">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center text-on-surface-variant hover:text-white transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <Logo showTagline={false} />
        <div className="flex-1" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">The Layo Logic</span>
      </header>

      <main className="flex-grow max-w-xl mx-auto w-full">

        {/* Hero */}
        <section className="px-6 pt-10 pb-8 text-center">
          <h1 className="text-[36px] font-bold leading-none text-white mb-3" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            Distance<br />
            <span className="text-primary">Decoded.</span>
          </h1>
          <p className="text-on-surface-variant text-sm leading-relaxed max-w-sm mx-auto">
            Layo is a Canada-focused parcel forwarding service. We bridge the gap between Indian shopping and Canadian living — so you get the quality you know, at the price you deserve.
          </p>
        </section>

        {/* How it works */}
        <section className="px-5 pb-8 space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary border-l-4 border-primary pl-3">How It Works</h2>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[22px] top-6 bottom-6 w-0.5 bg-primary/15" />
            <div className="space-y-6">
              {STEPS.map((step, i) => (
                <div key={step.title} className="flex gap-4">
                  <div className="relative flex-shrink-0 w-11 h-11 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center z-10">
                    <span className="material-symbols-outlined text-primary text-lg leading-none">{step.icon}</span>
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-background text-[8px] font-black flex items-center justify-center">{i + 1}</span>
                  </div>
                  <div className="flex-1 pb-2">
                    <p className="font-bold text-white text-sm mb-1">{step.title}</p>
                    <p className="text-on-surface-variant text-xs leading-relaxed">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Layo */}
        <section className="px-5 pb-10 space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary border-l-4 border-primary pl-3">Why Layo?</h2>
          <div className="space-y-3">
            {WHY_ITEMS.map(item => (
              <div key={item.title} className="bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3.5 flex gap-4 items-start">
                <span className="material-symbols-outlined text-primary text-xl leading-none flex-shrink-0 mt-0.5">{item.icon}</span>
                <div>
                  <p className="font-bold text-white text-sm">{item.title}</p>
                  <p className="text-on-surface-variant text-[11px] mt-0.5 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="px-5 pb-12">
          <Link
            href="/signup"
            className="block w-full py-4 bg-primary text-background font-bold text-sm uppercase tracking-widest rounded-2xl hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_8px_30px_rgba(242,202,80,0.25)] text-center"
          >
            Start Shipping
          </Link>
        </section>
      </main>
    </div>
  );
}
