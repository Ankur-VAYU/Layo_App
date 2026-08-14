'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from '@/components/Logo';

export default function TrackingPage() {
  const router = useRouter();
  const [trackingId, setTrackingId] = useState('');
  const [searchResult, setSearchResult] = useState<null | { id: string; status: string; origin: string; destination: string; eta: string }>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingId.trim()) return;
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      setSearchResult({
        id: trackingId.toUpperCase(),
        status: 'In Transit',
        origin: 'Gurugram Facility, India',
        destination: 'Toronto, ON, Canada',
        eta: '3 business days',
      });
    }, 600);
  };

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
            href="/login"
            className="px-5 py-2.5 bg-[#FF5A65] text-white font-bold text-xs uppercase tracking-wider rounded-full hover:bg-[#e24550] transition-all shadow-sm"
          >
            Sign Up / Log In
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-4xl mx-auto w-full px-6 py-12 space-y-12">
        {/* Track Form Box */}
        <div className="bg-white border border-black/5 rounded-3xl p-8 md:p-12 shadow-sm space-y-6 text-center">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#FF5A65]">Real-Time Logistics</span>
          <h1 className="text-3xl md:text-5xl font-black text-[#0E1F38]">
            Track Shipment
          </h1>
          <p className="text-sm text-[#0E1F38]/70 max-w-lg mx-auto leading-relaxed font-light">
            Enter your unique Layo tracking number below to check the real-time status of your parcel.
          </p>

          <form onSubmit={handleTrack} className="max-w-md mx-auto flex flex-col sm:flex-row gap-3 pt-2">
            <input
              type="text"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              placeholder="e.g. LY-894201-IN"
              className="flex-1 px-4 py-3.5 bg-[#FAF8EE] border border-black/10 rounded-xl text-sm font-mono text-[#0E1F38] placeholder:text-black/40 focus:outline-none focus:border-[#FF5A65]"
              required
            />
            <button
              type="submit"
              disabled={isSearching}
              className="px-6 py-3.5 bg-[#FF5A65] hover:bg-[#e24550] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              {isSearching ? 'Searching...' : 'Track Parcel'}
            </button>
          </form>

          {searchResult && (
            <div className="mt-8 bg-[#FAF8EE] border border-black/5 rounded-2xl p-6 text-left space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-black/10 pb-3">
                <div>
                  <span className="text-[10px] font-bold text-[#0E1F38]/60 uppercase tracking-wider block">Tracking ID</span>
                  <span className="font-mono font-bold text-base text-[#0E1F38]">{searchResult.id}</span>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">
                  {searchResult.status}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-[#0E1F38]/60 block">Origin</span>
                  <span className="font-semibold text-[#0E1F38]">{searchResult.origin}</span>
                </div>
                <div>
                  <span className="text-[#0E1F38]/60 block">Destination</span>
                  <span className="font-semibold text-[#0E1F38]">{searchResult.destination}</span>
                </div>
                <div>
                  <span className="text-[#0E1F38]/60 block">Estimated Delivery</span>
                  <span className="font-semibold text-[#0E1F38]">{searchResult.eta}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Explanation Section matching PDF Page 4 */}
        <div className="bg-white border border-black/5 rounded-3xl p-8 md:p-12 shadow-sm space-y-8">
          <div>
            <h2 className="text-2xl font-black text-[#0E1F38]">
              How to Track Your Layo Shipment
            </h2>
            <p className="text-sm text-[#0E1F38]/70 mt-2 leading-relaxed font-light">
              We believe in keeping you updated every step of the way. Once your parcel is packed and dispatched, tracking its journey is simple:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="p-5 bg-[#FAF8EE] border border-black/5 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-[#FF5A65] font-bold">
                <span className="material-symbols-outlined text-lg">tag</span>
                <h3 className="text-sm text-[#0E1F38]">Find Your Tracking Number</h3>
              </div>
              <p className="text-xs text-[#0E1F38]/70 leading-relaxed font-light">
                Your unique tracking ID is generated and shared once we have received your items, combined your orders (if requested), verified the final weight, and your delivery is ready to ship out to its final destination. You can easily find this anytime in your account dashboard.
              </p>
            </div>

            <div className="p-5 bg-[#FAF8EE] border border-black/5 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-[#FF5A65] font-bold">
                <span className="material-symbols-outlined text-lg">update</span>
                <h3 className="text-sm text-[#0E1F38]">Real-Time Updates</h3>
              </div>
              <p className="text-xs text-[#0E1F38]/70 leading-relaxed font-light">
                Enter your tracking number on this page to see the real-time status of your parcel. You will see exactly when it leaves our warehouse, when it is in transit, and when it is out for delivery in your local area.
              </p>
            </div>

            <div className="p-5 bg-[#FAF8EE] border border-black/5 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-[#FF5A65] font-bold">
                <span className="material-symbols-outlined text-lg">notifications_active</span>
                <h3 className="text-sm text-[#0E1F38]">Status Notifications</h3>
              </div>
              <p className="text-xs text-[#0E1F38]/70 leading-relaxed font-light">
                You don&apos;t have to constantly check the page. We will send you brief, timely updates via email or SMS whenever your delivery reaches a major milestone.
              </p>
            </div>

            <div className="p-5 bg-[#FAF8EE] border border-black/5 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-[#FF5A65] font-bold">
                <span className="material-symbols-outlined text-lg">help</span>
                <h3 className="text-sm text-[#0E1F38]">Need Tracking Help?</h3>
              </div>
              <p className="text-xs text-[#0E1F38]/70 leading-relaxed font-light">
                If your tracking status hasn&apos;t updated in a few days, or if you are having trouble locating your tracking number, our support team is just a click away to help you locate your items.
              </p>
            </div>
          </div>

          <div className="border-t border-black/5 pt-6 flex justify-between items-center text-xs text-[#0E1F38]/70">
            <span>Need assistance with an active parcel?</span>
            <Link href="/know-more#contact" className="text-[#FF5A65] font-bold hover:underline">Contact Support</Link>
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
