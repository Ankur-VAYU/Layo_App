'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

export default function TermsPage() {
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
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#5c5752]">Legal</span>
            <h1 className="text-3xl md:text-5xl font-bold text-[#1c1917] mt-2 font-serif-luxury">
              Terms and Conditions
            </h1>
            <p className="text-sm text-[#5c5752] mt-3 leading-relaxed">
              Welcome to Layo. By registering an account, accessing our platform, or using our logistics and package forwarding services, you agree to be bound by the following Terms and Conditions. Please read them carefully.
            </p>
          </div>

          <div className="border-t border-[#e5e0d8] pt-8 space-y-8 text-sm text-[#3a3734] leading-relaxed">
            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#1c1917] flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#f0e9df] text-[#2b2927] text-xs font-black flex items-center justify-center">1</span>
                Account Creation & User Responsibilities
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-[#5c5752]">
                <li>
                  <strong className="text-[#2b2927]">Accurate Information:</strong> To use Layo, you must create an account and provide accurate, current, and complete information. You are responsible for ensuring that your contact details are up-to-date.
                </li>
                <li>
                  <strong className="text-[#2b2927]">Delivery Address Accuracy:</strong> You are strictly responsible for providing a correct and complete final delivery address. If you realize you have provided an incorrect address, you must update it in your account before your items arrive at our warehouse. If a parcel is dispatched to an incorrect address originally provided by you, Layo will not be held liable. We will not issue refunds for the shipping fees or the lost products, nor are we responsible for retrieving or rerouting the package once it has left our facility.
                </li>
                <li>
                  <strong className="text-[#2b2927]">Account Security:</strong> You are responsible for maintaining the confidentiality of your account login credentials. Layo is not liable for any unauthorized access or use of your account resulting from a failure to secure your credentials.
                </li>
                <li>
                  <strong className="text-[#2b2927]">Lawful Use:</strong> You agree to use our platform and warehouse address strictly for lawful purposes. You may not use Layo to facilitate the purchase or transfer of illegal goods, nor use the service in violation of any local, national, or international laws.
                </li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#1c1917] flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#f0e9df] text-[#2b2927] text-xs font-black flex items-center justify-center">2</span>
                Our Logistics Services
              </h2>
              <p>
                Layo operates as a package receiving, consolidation, and forwarding service. We provide you with a central warehouse address to route your online retail purchases or personal packages.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[#5c5752]">
                <li>
                  <strong className="text-[#2b2927]">Holding & Consolidation:</strong> We offer the optional service to hold your items and combine up to three (3) incoming packages into one shipment.
                </li>
                <li>
                  <strong className="text-[#2b2927]">Weight-Free Extras:</strong> Users may include designated lightweight &quot;Extras&quot; to their shipment, which do not impact the core weight class of the finalized parcel, subject to our operational guidelines.
                </li>
                <li>
                  <strong className="text-[#2b2927]">Not a Retailer:</strong> Layo is strictly a logistics provider. We do not sell the products you ship, nor are we responsible for the quality, accuracy, or merchantability of items purchased from third-party retailers.
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#1c1917] flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#f0e9df] text-[#2b2927] text-xs font-black flex items-center justify-center">3</span>
                Weight Estimates, Invoicing & Payments
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-[#5c5752]">
                <li>
                  <strong className="text-[#2b2927]">Smart Estimates:</strong> Our Shipping Calculator and booking system utilize data-driven estimates based on the item categories you select. These estimates are provided to facilitate your initial booking.
                </li>
                <li>
                  <strong className="text-[#2b2927]">Weight Verification:</strong> Upon receiving your items at our warehouse, we verify the actual physical weight of your goods.
                </li>
                <li>
                  <strong className="text-[#2b2927]">Discrepancies:</strong> If the actual weight exceeds the initial estimate, or if unbooked items are discovered, your account will be updated. You will receive an alert detailing the discrepancy and the exact difference owed. Layo will not dispatch the finalized parcel until all outstanding balances are cleared in full.
                </li>
              </ul>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#1c1917] flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#f0e9df] text-[#2b2927] text-xs font-black flex items-center justify-center">4</span>
                Packing & Finalizing Shipments
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-[#5c5752]">
                <li>
                  <strong className="text-[#2b2927]">Optimization:</strong> Layo employs strategic packing techniques to minimize your shipping costs. This may include vacuum-sealing bulky apparel or consolidating items to reduce volumetric weight. By using our service, you authorize our team to repackage your goods as deemed necessary for safe and efficient transit.
                </li>
                <li>
                  <strong className="text-[#2b2927]">Final Consolidation:</strong> Once all expected items for a booked shipment arrive, our team automatically proceeds with packing the final parcel. Once a shipment is consolidated and set for dispatch, it cannot be canceled, halted, or modified.
                </li>
              </ul>
            </section>

            {/* Section 5 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#1c1917] flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#f0e9df] text-[#2b2927] text-xs font-black flex items-center justify-center">5</span>
                Prohibited Items & Unshippable Goods
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-[#5c5752]">
                <li>
                  <strong className="text-[#2b2927]">Restricted Goods:</strong> You are strictly prohibited from shipping hazardous materials, illegal substances, weapons, perishable foods, or items that violate the carrier&apos;s or destination country&apos;s import/export laws.
                </li>
                <li>
                  <strong className="text-[#2b2927]">Fragiles and Liquids:</strong> Layo strongly advises against routing inherently fragile items or items prone to leaking (such as liquids and oils) through our service. We do not accept liability for damages caused to or by these items during transit.
                </li>
                <li>
                  <strong className="text-[#2b2927]">Alternative Pickup:</strong> If we receive an item at our facility that violates these terms or cannot be legally shipped to your destination, it will not be dispatched. You are solely responsible for arranging an alternative local pickup (e.g., via a designated courier or representative) from our warehouse. Layo will not facilitate the delivery or return of prohibited items.
                </li>
              </ul>
            </section>

            {/* Section 6 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#1c1917] flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#f0e9df] text-[#2b2927] text-xs font-black flex items-center justify-center">6</span>
                Returns, Refunds & Cancellations
              </h2>
              <p>
                All refunds related to our logistics fees, as well as the rules governing returns to original retailers, are strictly governed by our official <Link href="/refund-policy" className="text-primary font-bold hover:underline">Returns & Refund Policy</Link>. By agreeing to these Terms and Conditions, you also acknowledge and agree to the stipulations outlined in that policy.
              </p>
              <p className="text-[#5c5752]">
                Layo provides no refunds for the retail products themselves. Layo does not refund shipping fees for finalized shipments or for packages containing retail items damaged during transit.
              </p>
            </section>

            {/* Section 7 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#1c1917] flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#f0e9df] text-[#2b2927] text-xs font-black flex items-center justify-center">7</span>
                Limitation of Liability
              </h2>
              <p>
                To the maximum extent permitted by applicable law, Layo, its founders, and its employees shall not be liable for:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[#5c5752]">
                <li>Any indirect, incidental, or consequential damages arising from the use of our service.</li>
                <li>Delays in delivery caused by third-party courier services, customs clearance, or forces of nature.</li>
                <li>The condition, accuracy, or functionality of the retail products contained within your consolidated shipment.</li>
                <li>Damages resulting from improperly declared, illegal, or prohibited items.</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#1c1917] flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#f0e9df] text-[#2b2927] text-xs font-black flex items-center justify-center">8</span>
                Right to Refuse Service
              </h2>
              <p>
                Layo reserves the right, at our sole discretion, to refuse service, suspend or terminate accounts, or cancel shipments if we suspect fraudulent activity, violation of these Terms and Conditions, or any behavior that compromises the security and integrity of our logistics network.
              </p>
            </section>
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
