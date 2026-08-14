'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

export default function PrivacyPolicyPage() {
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
              Privacy Policy
            </h1>
            <p className="text-sm text-[#5c5752] mt-3 leading-relaxed">
              How we collect, protect, and handle your information.
            </p>
          </div>

          <div className="border-t border-[#e5e0d8] pt-8 space-y-8 text-sm text-[#3a3734] leading-relaxed">
            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#1c1917]">Information We Collect</h2>
              <p>
                To provide you with a seamless shipping experience, we collect essential information when you register and use our platform. This includes your name, email address, physical delivery addresses, payment information, and the categories of items you intend to ship through our service.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#1c1917]">How We Use Your Information</h2>
              <p>
                Your data is strictly used to operate and improve your experience with Layo. We use this information to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-[#5c5752]">
                <li>Generate accurate weight estimates and shipping invoices.</li>
                <li>Route, consolidate, and dispatch your parcels to their final destinations.</li>
                <li>Communicate important updates regarding your shipments (such as tracking details and weight discrepancy notices).</li>
                <li>Process secure payments for our logistics services.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#1c1917]">Information Sharing & Third Parties</h2>
              <p>
                We respect your privacy and will never sell your personal information. We only share necessary details (such as your name, final delivery address, and basic package contents) with our trusted third-party courier partners strictly for the purpose of completing the final mile delivery of your shipment. We may also disclose information if required by law or to protect the legal rights and safety of our platform and users.
              </p>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-[#1c1917]">Data Security</h2>
              <p>
                We implement industry-standard security measures to protect your personal information and dashboard data from unauthorized access. While we strive to protect your data, no method of transmission over the internet is 100% secure, and we encourage you to maintain strong account passwords.
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
