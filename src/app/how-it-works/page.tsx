'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';
import EstimatorModal from '@/components/EstimatorModal';

export default function HowItWorksPage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="bg-[#FAF8EE] text-[#0E1F38] min-h-screen flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-[#FAF8EE]/90 backdrop-blur-md border-b border-black/5 px-6 md:px-16 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full border border-black/10 flex items-center justify-center text-[#0E1F38]/70 hover:text-[#0E1F38] hover:border-black/30 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <Link href="/">
            <Logo showTagline={false} darkText={true} />
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/calculator"
            className="hidden sm:inline-block text-xs font-bold uppercase tracking-wider text-[#0E1F38]/70 hover:text-[#0E1F38] transition-colors"
          >
            Calculator
          </Link>
          <Link
            href="/login"
            className="px-5 py-2.5 bg-[#FF5A65] text-white font-bold text-xs uppercase tracking-wider rounded-full hover:bg-[#e24550] transition-all shadow-sm"
          >
            Sign Up / Log In
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-4xl mx-auto w-full px-6 py-12 space-y-10">
        <div className="bg-white border border-black/5 rounded-3xl p-8 md:p-14 shadow-sm space-y-10">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#FF5A65]">The Process</span>
            <h1 className="text-3xl md:text-5xl font-black text-[#0E1F38] mt-2">
              How <span className="text-[#FF5A65] italic font-serif-luxury font-medium">Layo</span> Works
            </h1>
            <p className="text-sm md:text-base text-[#0E1F38]/70 mt-3 leading-relaxed font-light">
              Every order you place in India lands safely in your own Layo warehouse locker — ready to combine, pack, and send whenever you are.
            </p>
          </div>

          <div className="border-t border-black/5 pt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Step 1 */}
            <div className="p-6 bg-[#FAF8EE] border border-black/5 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#FF5A65] text-white text-xs font-black flex items-center justify-center">01</span>
                <span className="text-xl">📍</span>
                <h2 className="text-lg font-bold text-[#0E1F38]">1. Route Your Packages</h2>
              </div>
              <p className="text-xs text-[#0E1F38]/75 leading-relaxed">
                Whether you are shopping online, buying offline at a local retailer, or receiving a personal package, simply use your provided warehouse address as your delivery destination.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 bg-[#FAF8EE] border border-black/5 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#FF5A65] text-white text-xs font-black flex items-center justify-center">02</span>
                <span className="text-xl">🏷️</span>
                <h2 className="text-lg font-bold text-[#0E1F38]">2. Categorize & Customize</h2>
              </div>
              <p className="text-xs text-[#0E1F38]/75 leading-relaxed">
                Ditch the guesswork by simply categorizing your items for a smart, data-driven weight estimate. Once your items arrive, we verify the exact weight and transparently update you. Don&apos;t forget to add your weight-free &quot;Extras&quot;!
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 bg-[#FAF8EE] border border-black/5 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#FF5A65] text-white text-xs font-black flex items-center justify-center">03</span>
                <span className="text-xl">🔄</span>
                <h2 className="text-lg font-bold text-[#0E1F38]">3. Ship, Hold & Combine (Optional)</h2>
              </div>
              <p className="text-xs text-[#0E1F38]/75 leading-relaxed">
                Ship immediately, or optionally choose to hold your items to combine them with up to 3 additional incoming packages. If you choose to hold, you can update package details and complete your payments later directly from your dashboard.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-6 bg-[#FAF8EE] border border-black/5 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-[#FF5A65] text-white text-xs font-black flex items-center justify-center">04</span>
                <span className="text-xl">🚚</span>
                <h2 className="text-lg font-bold text-[#0E1F38]">4. Ship & Track</h2>
              </div>
              <p className="text-xs text-[#0E1F38]/75 leading-relaxed">
                Review your finalized, cost-effective shipment, complete your payment, and track your smart haul right to your doorstep.
              </p>
            </div>
          </div>

          <div className="border-t border-black/5 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <button
              onClick={() => setModalOpen(true)}
              className="px-6 py-3.5 bg-[#FF5A65] hover:bg-[#e24550] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm text-center w-full sm:w-auto cursor-pointer"
            >
              Calculate Shipping
            </button>
            <Link
              href="/tracking"
              className="px-6 py-3.5 border border-black/10 hover:bg-black/5 text-[#0E1F38] font-bold text-xs uppercase tracking-wider rounded-xl transition-all text-center w-full sm:w-auto"
            >
              Track Active Shipment
            </Link>
          </div>
        </div>
      </main>

      {/* Estimator Modal */}
      <EstimatorModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      {/* Footer */}
      <footer className="border-t border-black/5 bg-[#ECEAE0] py-6 px-6 text-center text-xs text-[#0E1F38]/60">
        <p>© 2026 Layo Technologies Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
