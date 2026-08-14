'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

export default function ShippingPolicyPage() {
  const router = useRouter();

  return (
    <div className="bg-[#f5f2eb] text-[#2b2927] min-h-screen flex flex-col">
      {/* Navigation Header */}
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
            href="/calculator"
            className="hidden sm:inline-block text-xs font-bold uppercase tracking-wider text-[#5c5752] hover:text-black transition-colors"
          >
            Calculator
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 bg-primary text-[#241a00] font-bold text-xs uppercase tracking-wider rounded-full hover:brightness-105 transition-all shadow-sm"
          >
            Sign Up / Log In
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-4xl mx-auto w-full px-6 py-12">
        <div className="bg-white border border-[#e5e0d8] rounded-3xl p-8 md:p-12 shadow-sm space-y-10">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#5c5752]">Official Policy</span>
            <h1 className="text-3xl md:text-5xl font-bold text-[#1c1917] mt-2 font-serif-luxury">
              Shipping Policy
            </h1>
            <p className="text-sm text-[#5c5752] mt-3 leading-relaxed">
              Transparent, reliable, and predictable parcel forwarding guidelines.
            </p>
          </div>

          <div className="border-t border-[#e5e0d8] pt-8 space-y-8 text-sm text-[#3a3734] leading-relaxed">
            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#1c1917] flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#f0e9df] text-[#2b2927] text-xs font-black flex items-center justify-center">1</span>
                Processing & Consolidation Times
              </h2>
              <p>
                Once all your expected items have arrived at our central warehouse, our team gets to work verifying the weights and consolidating your final parcel.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[#5c5752]">
                <li>
                  <strong className="text-[#2b2927]">Packing Time:</strong> Parcels are typically processed, packed, and ready for dispatch within <strong>1 to 2 business days</strong> after your final payment is cleared.
                </li>
                <li>
                  <strong className="text-[#2b2927]">Adding Extras:</strong> If you choose to include weight-free &quot;Extras&quot; in your smart haul, they will be seamlessly packed into this final box during this processing window.
                </li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#1c1917] flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#f0e9df] text-[#2b2927] text-xs font-black flex items-center justify-center">2</span>
                Shipping Rates & Estimates
              </h2>
              <p>
                Shipping costs are determined by the final verified weight of your consolidated parcel and its destination.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[#5c5752]">
                <li>
                  You can always use our <Link href="/calculator" className="text-primary font-bold hover:underline">Shipping Calculator</Link> to get a smart, data-driven estimate before you shop or book a shipment.
                </li>
                <li>
                  If the actual physical weight differs from your initial estimate, you will receive an update. We provide a <strong>12-hour review window</strong> before finalizing any outstanding balances, ensuring you are never charged unexpectedly.
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#1c1917] flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#f0e9df] text-[#2b2927] text-xs font-black flex items-center justify-center">3</span>
                Delivery Timelines & Couriers
              </h2>
              <p>
                Once dispatched from our central warehouse, delivery times vary based on your final destination address.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[#5c5752]">
                <li>
                  <strong className="text-[#2b2927]">Transit Time:</strong> Standard delivery typically takes <strong>3 to 7 business days</strong>.
                </li>
                <li>
                  <strong className="text-[#2b2927]">Our Partners:</strong> We partner with trusted local and international couriers to ensure the final leg of your delivery is handled quickly and securely.
                </li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#1c1917] flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#f0e9df] text-[#2b2927] text-xs font-black flex items-center justify-center">4</span>
                Customs, Duties, and Taxes
              </h2>
              <p>
                Layo&apos;s shipping fees strictly cover the logistics, consolidation, and transit of your parcel.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[#5c5752]">
                <li>
                  Depending on your final destination, your shipment may be subject to local import duties, customs taxes, or carrier handling fees upon arrival.
                </li>
                <li>
                  <strong className="text-[#2b2927]">The customer is solely responsible for paying any applicable customs fees or import taxes.</strong> Layo does not cover these charges, nor will we issue shipping refunds for parcels delayed or rejected by local customs authorities.
                </li>
              </ul>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#1c1917] flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#f0e9df] text-[#2b2927] text-xs font-black flex items-center justify-center">5</span>
                Address Accuracy
              </h2>
              <p>
                You are responsible for providing a correct and complete final delivery address.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[#5c5752]">
                <li>
                  If you realize you have provided an incorrect address, you must update it in your account <em>before</em> your items arrive at our warehouse.
                </li>
                <li>
                  We cannot reroute packages or issue refunds for deliveries sent to an incorrect address originally provided by you once the parcel has left our facility.
                </li>
              </ul>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#1c1917] flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#f0e9df] text-[#2b2927] text-xs font-black flex items-center justify-center">6</span>
                Tracking Your Parcel
              </h2>
              <p>
                Once your finalized parcel is fully packed and dispatched, a unique tracking ID is generated. You can monitor the real-time status of your delivery directly through your account dashboard or our dedicated <Link href="/tracking" className="text-primary font-bold hover:underline">Tracking page</Link>, from the moment it leaves our warehouse to the moment it reaches your doorstep.
              </p>
            </section>
          </div>

          <div className="border-t border-[#e5e0d8] pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#5c5752]">
            <p>Have questions about your shipment?</p>
            <Link
              href="/#contact"
              className="px-5 py-2.5 bg-[#eae7de] hover:bg-[#dfdbc9] text-[#2b2927] font-bold uppercase tracking-wider rounded-xl transition-all"
            >
              Get In Touch With Us
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-black/5 bg-[#eae7de] py-6 px-6 text-center text-xs text-[#5c5752]">
        <p>© 2026 Layo Technologies Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
