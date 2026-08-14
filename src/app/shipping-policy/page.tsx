'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

export default function ShippingPolicyPage() {
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
      <main className="flex-grow max-w-4xl mx-auto w-full px-6 py-12">
        <div className="bg-white border border-black/5 rounded-3xl p-8 md:p-14 shadow-sm space-y-10">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#FF5A65]">Official Policy</span>
            <h1 className="text-3xl md:text-5xl font-black text-[#0E1F38] mt-2">
              Shipping Policy
            </h1>
            <p className="text-sm text-[#0E1F38]/70 mt-3 leading-relaxed font-light">
              Transparent, reliable, and predictable parcel forwarding guidelines.
            </p>
          </div>

          <div className="border-t border-black/5 pt-8 space-y-8 text-sm text-[#0E1F38]/80 leading-relaxed font-light">
            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#0E1F38] flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#FAF8EE] text-[#FF5A65] text-xs font-black flex items-center justify-center border border-black/5">1</span>
                Processing &amp; Consolidation Times
              </h2>
              <p>
                Once all your expected items have arrived at our central warehouse, our team gets to work verifying the weights and consolidating your final parcel.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[#0E1F38]/70">
                <li>
                  <strong className="text-[#0E1F38]">Packing Time:</strong> Parcels are typically processed, packed, and ready for dispatch within <strong>1 to 2 business days</strong> after your final payment is cleared.
                </li>
                <li>
                  <strong className="text-[#0E1F38]">Adding Extras:</strong> If you choose to include weight-free &quot;Extras&quot; in your smart haul, they will be seamlessly packed into this final box during this processing window.
                </li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#0E1F38] flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#FAF8EE] text-[#FF5A65] text-xs font-black flex items-center justify-center border border-black/5">2</span>
                Shipping Rates &amp; Estimates
              </h2>
              <p>
                Shipping costs are determined by the final verified weight of your consolidated parcel and its destination.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[#0E1F38]/70">
                <li>
                  You can always use our <Link href="/calculator" className="text-[#FF5A65] font-bold hover:underline">Shipping Calculator</Link> to get a smart, data-driven estimate before you shop or book a shipment.
                </li>
                <li>
                  If the actual physical weight differs from your initial estimate, you will receive an update. We provide a <strong>12-hour review window</strong> before finalizing any outstanding balances, ensuring you are never charged unexpectedly.
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#0E1F38] flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#FAF8EE] text-[#FF5A65] text-xs font-black flex items-center justify-center border border-black/5">3</span>
                Delivery Timelines &amp; Couriers
              </h2>
              <p>
                Once dispatched from our central warehouse, delivery times vary based on your final destination address.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[#0E1F38]/70">
                <li>
                  <strong className="text-[#0E1F38]">Transit Time:</strong> Standard delivery typically takes <strong>3 to 7 business days</strong>.
                </li>
                <li>
                  <strong className="text-[#0E1F38]">Our Partners:</strong> We partner with trusted local and international couriers to ensure the final leg of your delivery is handled quickly and securely.
                </li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#0E1F38] flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#FAF8EE] text-[#FF5A65] text-xs font-black flex items-center justify-center border border-black/5">4</span>
                Customs, Duties, and Taxes
              </h2>
              <p>
                Layo&apos;s shipping fees strictly cover the logistics, consolidation, and transit of your parcel.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[#0E1F38]/70">
                <li>
                  Depending on your final destination, your shipment may be subject to local import duties, customs taxes, or carrier handling fees upon arrival.
                </li>
                <li>
                  <strong className="text-[#0E1F38]">The customer is solely responsible for paying any applicable customs fees or import taxes.</strong> Layo does not cover these charges, nor will we issue shipping refunds for parcels delayed or rejected by local customs authorities.
                </li>
              </ul>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[#0E1F38] flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#FAF8EE] text-[#FF5A65] text-xs font-black flex items-center justify-center border border-black/5">5</span>
                Address Accuracy
              </h2>
              <p>
                You are responsible for providing a correct and complete final delivery address.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[#0E1F38]/70">
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
              <h2 className="text-lg font-bold text-[#0E1F38] flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#FAF8EE] text-[#FF5A65] text-xs font-black flex items-center justify-center border border-black/5">6</span>
                Tracking Your Parcel
              </h2>
              <p>
                Once your finalized parcel is fully packed and dispatched, a unique tracking ID is generated. You can monitor the real-time status of your delivery directly through your account dashboard or our dedicated <Link href="/tracking" className="text-[#FF5A65] font-bold hover:underline">Tracking page</Link>, from the moment it leaves our warehouse to the moment it reaches your doorstep.
              </p>
            </section>
          </div>

          <div className="border-t border-black/5 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#0E1F38]/70">
            <p>Have questions about your shipment?</p>
            <Link
              href="/know-more#contact"
              className="px-5 py-2.5 bg-[#FF5A65] hover:bg-[#e24550] text-white font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm"
            >
              Get In Touch With Us
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
