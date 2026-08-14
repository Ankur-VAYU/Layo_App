'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import EstimatorModal from '@/components/EstimatorModal';

export default function ShippingCalculatorPage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="bg-[#f5f2eb] text-[#2b2927] min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#f5f2eb]/90 backdrop-blur-md border-b border-black/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full border border-black/10 flex items-center justify-center text-[#5c5752] hover:text-[#2b2927] hover:border-black/30 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <Link href="/">
            <Logo showTagline={false} darkText={true} />
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="px-4 py-2 bg-primary text-[#241a00] font-bold text-xs uppercase tracking-wider rounded-full hover:brightness-105 transition-all shadow-sm"
          >
            Sign Up / Log In
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-4xl mx-auto w-full px-6 py-12 space-y-10">
        {/* Banner Card */}
        <div className="bg-white border border-[#e5e0d8] rounded-3xl p-8 md:p-12 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#5c5752]">Upfront Pricing</span>
            <h1 className="text-3xl md:text-5xl font-bold text-[#1c1917] font-serif-luxury">
              Shipping Calculator
            </h1>
            <p className="text-sm text-[#5c5752] leading-relaxed">
              Calculate upfront shipping estimates by item category before you buy in India. No scale required.
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="px-8 py-4 bg-primary text-[#241a00] font-black text-sm uppercase tracking-widest rounded-2xl hover:brightness-105 hover:scale-105 transition-all shadow-md cursor-pointer whitespace-nowrap"
          >
            Launch Calculator
          </button>
        </div>

        {/* Detailed Points matching PDF 1 Page 3 */}
        <div className="bg-white border border-[#e5e0d8] rounded-3xl p-8 md:p-12 shadow-sm space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-[#1c1917]">
              How the Layo Shipping Calculator Works
            </h2>
            <p className="text-sm text-[#5c5752] mt-2 leading-relaxed">
              We&apos;ve eliminated complex volumetric weight formulas so you can estimate shipping costs effortlessly:
            </p>
          </div>

          <div className="space-y-6 text-sm text-[#3a3734] leading-relaxed">
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                1
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#1c1917]">Get Instant Estimates</h3>
                <p className="text-xs text-[#5c5752]">
                  Want to know the shipping cost before you buy? Use our calculator to get a clear, upfront estimate before you begin shopping.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                2
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#1c1917]">Select Your Categories</h3>
                <p className="text-xs text-[#5c5752]">
                  Simply select the categories of the items you plan to purchase. There is no need to worry about exact dimensions or entering physical weights—just choose the relevant categories to receive your estimate.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                3
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#1c1917]">Estimates vs. Actual Weight</h3>
                <p className="text-xs text-[#5c5752]">
                  The calculator provides an estimate used for your initial booking. Once your items arrive at our warehouse, we verify their actual weight. If they weigh more than expected or were categorized differently, there are no penalty fees. To ensure complete transparency, we will never charge you unexpectedly. Instead, we will send you an update detailing the exact difference and provide a <strong>12-hour review window</strong> before any additional charges are processed.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                4
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#1c1917]">Optimize Your Shipment</h3>
                <p className="text-xs text-[#5c5752]">
                  Use the calculator to see how adding various items or combining multiple packages might change your final shipping cost.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                5
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-[#1c1917]">Shop Whenever You’re Ready</h3>
                <p className="text-xs text-[#5c5752]">
                  There is no commitment required. Check your estimated costs today, and route your packages to our warehouse whenever you are ready to complete your purchase.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-[#e5e0d8] pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#5c5752]">
            <p>Ready to calculate your parcel costs?</p>
            <button
              onClick={() => setModalOpen(true)}
              className="px-6 py-3 bg-primary text-[#241a00] font-bold text-xs uppercase tracking-wider rounded-xl hover:brightness-105 transition-all shadow-sm cursor-pointer"
            >
              Open Estimator Modal
            </button>
          </div>
        </div>
      </main>

      {/* Estimator Modal */}
      <EstimatorModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      {/* Footer */}
      <footer className="border-t border-black/5 bg-[#eae7de] py-6 px-6 text-center text-xs text-[#5c5752]">
        <p>© 2026 Layo Technologies Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
