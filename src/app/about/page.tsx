'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

export default function AboutPage() {
  const router = useRouter();

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
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#FF5A65]">Our Mission</span>
            <h1 className="text-3xl md:text-5xl font-black text-[#0E1F38] mt-2">
              About <span className="text-[#FF5A65] italic font-serif-luxury font-medium">Layo</span>
            </h1>
            <p className="text-sm md:text-base text-[#0E1F38]/80 mt-4 leading-relaxed font-medium">
              Shipping shouldn&apos;t be a rigid, expensive hurdle. It should adapt to how you actually shop and live.
            </p>
          </div>

          <div className="border-t border-black/5 pt-8 space-y-6 text-sm text-[#0E1F38]/80 leading-relaxed font-light">
            <p>
              At Layo, we&apos;ve built a smart logistics platform designed to give you total control over your shipments.
              Whether you are routing everyday retail essentials, building a seasonal haul, or sending personal
              packages from home, we transform complex international shipping into a simple, stress-free experience.
            </p>
            <p>
              We believe in fair shipping. To keep your deliveries affordable and minimize volumetric weight, we employ
              strategic packing techniques, which includes vacuum-sealing bulky apparel whenever necessary to save
              space.
            </p>
            <p>
              From giving you the power to hold and combine multiple packages to introducing weight-free &quot;Extras,&quot;
              every feature we build is designed to optimize your shipping journey and maximize your value. We don&apos;t
              just move boxes; we optimize them, ensuring you get exactly what you need without paying for wasted
              space.
            </p>
          </div>

          {/* Why Choose Layo? */}
          <div className="border-t border-black/5 pt-8 space-y-6">
            <h2 className="text-2xl font-black text-[#0E1F38] tracking-tight">
              Why Choose Layo?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="p-6 bg-[#FAF8EE] border border-black/5 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-[#FF5A65] font-bold">
                  <span className="material-symbols-outlined text-xl">inventory_2</span>
                  <h3 className="text-base text-[#0E1F38]">Smart Consolidation</h3>
                </div>
                <p className="text-xs text-[#0E1F38]/70 leading-relaxed">
                  Don&apos;t ship box by box. Use our Hold &amp; Combine feature to group your incoming retail and personal packages into one cost-effective shipment.
                </p>
              </div>

              <div className="p-6 bg-[#FAF8EE] border border-black/5 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-[#FF5A65] font-bold">
                  <span className="material-symbols-outlined text-xl">calculate</span>
                  <h3 className="text-base text-[#0E1F38]">Effortless Estimation</h3>
                </div>
                <p className="text-xs text-[#0E1F38]/70 leading-relaxed">
                  We&apos;ve taken the guesswork out of shipping. Instead of stressing over tape measures and scales, simply select your item categories. We use smart, data-driven weight estimates for apparel and goods. When your packages arrive at our warehouse, we verify the exact weight and provide full transparency if any adjustments are needed.
                </p>
              </div>

              <div className="p-6 bg-[#FAF8EE] border border-black/5 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-[#FF5A65] font-bold">
                  <span className="material-symbols-outlined text-xl">swap_horiz</span>
                  <h3 className="text-base text-[#0E1F38]">Total Flexibility</h3>
                </div>
                <p className="text-xs text-[#0E1F38]/70 leading-relaxed">
                  Whether it is a bulk order from your favorite online store or a personal care package from your family, simply send your items to the warehouse address provided to you, and we will handle the rest.
                </p>
              </div>

              <div className="p-6 bg-[#FAF8EE] border border-black/5 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-[#FF5A65] font-bold">
                  <span className="material-symbols-outlined text-xl">verified</span>
                  <h3 className="text-base text-[#0E1F38]">Transparent Value</h3>
                </div>
                <p className="text-xs text-[#0E1F38]/70 leading-relaxed">
                  We believe you shouldn&apos;t be penalized for the small things. That is why we offer &quot;Extras&quot;—unlimited lightweight additions (like accessories and socks) that ship without impacting your weight class.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-black/5 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <Link
              href="/calculator"
              className="px-6 py-3.5 bg-[#FF5A65] hover:bg-[#e24550] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm text-center w-full sm:w-auto"
            >
              Estimate Shipping Now
            </Link>
            <Link
              href="/#how-it-works"
              className="px-6 py-3.5 border border-black/10 hover:bg-black/5 text-[#0E1F38] font-bold text-xs uppercase tracking-wider rounded-xl transition-all text-center w-full sm:w-auto"
            >
              See How It Works
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-black/5 bg-[#ECEAE0] py-6 px-6 text-center text-xs text-[#0E1F38]/60">
        <p>© 2026 Layo Technologies Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
