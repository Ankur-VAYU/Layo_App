/* eslint-disable react/no-unescaped-entities, @next/next/no-img-element */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Logo from '@/components/Logo';
import EstimatorModal from '@/components/EstimatorModal';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { calculateLayoDeliveryCost } from '@/lib/delhiveryRates';

// Define category configuration for the dynamic Essentials stacked card
interface CategoryConfig {
  id: string;
  ageLabel: string;
  tabLabel: string;
  cardTitle: string;
  icons: string[];
  image: string;
  description: string;
  topsUnitRate: number;
  bottomsUnitRate: number;
  defaultTops: number;
  defaultBottoms: number;
  inTopsCost: number;
  inBottomsCost: number;
  caTopsPrice: number;
  caBottomsPrice: number;
  topWeightKg: number;
  bottomWeightKg: number;
  shippingPerKgRate: number;
}

const CATEGORIES_CONFIG: CategoryConfig[] = [
  {
    id: 'baby',
    ageLabel: '0-4 YEARS',
    tabLabel: 'Baby & Toddler',
    cardTitle: 'Baby & Toddler (0-4 years)',
    icons: ['🍼', '🧸'],
    image: '/categories/baby-box.png',
    description: 'Between rapid growth and daily messes, babies need about 14 tops and 10 bottoms every 3-6 months. Parenting is exhausting enough without dragging little ones to the store! Buying their whole wardrobe at once online from India protects both your sanity and your budget.',
    topsUnitRate: 8,
    bottomsUnitRate: 12,
    defaultTops: 14,
    defaultBottoms: 10,
    inTopsCost: 4,
    inBottomsCost: 8,
    caTopsPrice: 14,
    caBottomsPrice: 15,
    topWeightKg: 0.12,
    bottomWeightKg: 0.20,
    shippingPerKgRate: 17.25,
  },
  {
    id: 'kids',
    ageLabel: '5-10 YEARS',
    tabLabel: 'Kids',
    cardTitle: 'Kids (5-10 years)',
    icons: ['🧴', '👟'],
    image: '/categories/kids-box.png',
    description: 'Kids grow fast, letting you trade constant shopping for one big seasonal wardrobe refresh. Stocking up for the school year typically requires about 12 tops and 8 bottoms. Buying this yearly haul from India lets you check everything off your list without overspending.',
    topsUnitRate: 10,
    bottomsUnitRate: 18,
    defaultTops: 12,
    defaultBottoms: 8,
    inTopsCost: 5.5,
    inBottomsCost: 12.5,
    caTopsPrice: 18,
    caBottomsPrice: 21.25,
    topWeightKg: 0.20,
    bottomWeightKg: 0.35,
    shippingPerKgRate: 14.16,
  },
  {
    id: 'teens',
    ageLabel: '11-18 YEARS',
    tabLabel: 'Teens',
    cardTitle: 'Teens (11-18 years)',
    icons: ['🧢', '👕'],
    image: '/categories/teens-box.png',
    description: 'Teens hit unpredictable growth spurts every 6-12 months, and their style quickly shifts to trendy brands. Keeping up with their yearly need of at least 10 tops and 7 bottoms from India lets you match their tastes while protecting your budget.',
    topsUnitRate: 15,
    bottomsUnitRate: 22,
    defaultTops: 10,
    defaultBottoms: 7,
    inTopsCost: 10,
    inBottomsCost: 18.5714,
    caTopsPrice: 30.5,
    caBottomsPrice: 40,
    topWeightKg: 0.28,
    bottomWeightKg: 0.50,
    shippingPerKgRate: 14.42,
  },
  {
    id: 'adults',
    ageLabel: '18+ YEARS',
    tabLabel: 'Adults',
    cardTitle: 'Adults (18 & above)',
    icons: ['👔', '⌚'],
    image: '/categories/adults-box.png',
    description: 'Building your wardrobe is now about upgrading your style, whether refreshing basics or adding premium outfits. Buying elevated pieces from India lets you upgrade your look for a fraction of Canadian retail costs.',
    topsUnitRate: 20,
    bottomsUnitRate: 30,
    defaultTops: 6,
    defaultBottoms: 4,
    inTopsCost: 16,
    inBottomsCost: 30,
    caTopsPrice: 45,
    caBottomsPrice: 77.5,
    topWeightKg: 0.35,
    bottomWeightKg: 0.70,
    shippingPerKgRate: 17,
  },
  {
    id: 'seniors',
    ageLabel: '60+ YEARS',
    tabLabel: 'Seniors',
    cardTitle: 'Seniors (60+ years)',
    icons: ['💊', '👓'],
    image: '/categories/seniors-box.png',
    description: 'Comfortable pure cotton kurtas, ayurvedic wellness essentials, and tailored ethnic apparel for seniors are often 4x more expensive or unavailable in Canada. Stocking up directly from trusted Indian stores brings authentic comfort and massive savings.',
    topsUnitRate: 18,
    bottomsUnitRate: 25,
    defaultTops: 8,
    defaultBottoms: 6,
    inTopsCost: 12,
    inBottomsCost: 20,
    caTopsPrice: 40,
    caBottomsPrice: 65,
    topWeightKg: 0.30,
    bottomWeightKg: 0.55,
    shippingPerKgRate: 15.00,
  }
];

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  
  // Navigation & Modals state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Active Category state for stacked sheets card
  const [activeCatIndex, setActiveCatIndex] = useState(2); // Default to Teens (index 2)
  const activeCategory = CATEGORIES_CONFIG[activeCatIndex] || CATEGORIES_CONFIG[0];

  // Dynamic Quantities state per category
  const [categoryQtys, setCategoryQtys] = useState<Record<string, { tops: number; bottoms: number; extras: number }>>({
    baby:    { tops: 14, bottoms: 10, extras: 5 },
    kids:    { tops: 12, bottoms: 8,  extras: 5 },
    teens:   { tops: 10, bottoms: 7,  extras: 5 },
    adults:  { tops: 6,  bottoms: 4,  extras: 5 },
    seniors: { tops: 8,  bottoms: 6,  extras: 5 },
  });

  const currentQtys = categoryQtys[activeCategory.id] || {
    tops: activeCategory.defaultTops,
    bottoms: activeCategory.defaultBottoms,
    extras: 5,
  };

  const handleUpdateQty = (catId: string, item: 'tops' | 'bottoms' | 'extras', delta: number) => {
    setCategoryQtys((prev) => {
      const cur = prev[catId] || {
        tops: CATEGORIES_CONFIG.find((c) => c.id === catId)?.defaultTops || 10,
        bottoms: CATEGORIES_CONFIG.find((c) => c.id === catId)?.defaultBottoms || 7,
        extras: 5,
      };
      let nxt = cur[item] + delta;
      if (item === 'extras') {
        nxt = Math.max(0, Math.min(5, nxt));
      } else {
        nxt = Math.max(0, nxt);
      }
      return {
        ...prev,
        [catId]: {
          ...cur,
          [item]: nxt,
        },
      };
    });
  };

  const handleResetQty = (catId: string) => {
    const config = CATEGORIES_CONFIG.find((c) => c.id === catId);
    if (!config) return;
    setCategoryQtys((prev) => ({
      ...prev,
      [catId]: {
        tops: config.defaultTops,
        bottoms: config.defaultBottoms,
        extras: 5,
      },
    }));
  };

  // Dynamic Calculations
  const topsQty = currentQtys.tops;
  const bottomsQty = currentQtys.bottoms;
  const extrasQty = currentQtys.extras;

  const indianPrice = Math.round(
    topsQty * activeCategory.inTopsCost + bottomsQty * activeCategory.inBottomsCost
  );

  const canadianPrice = Math.round(
    topsQty * activeCategory.caTopsPrice + bottomsQty * activeCategory.caBottomsPrice
  );

  const extrasWeightKg = Math.max(0, extrasQty - 5) * 0.05;
  const grossWeightKg = topsQty * activeCategory.topWeightKg + bottomsQty * activeCategory.bottomWeightKg + extrasWeightKg;
  const chargeableKg = Math.max(1, Math.ceil(grossWeightKg));

  const costCalc = calculateLayoDeliveryCost({
    weightKg: grossWeightKg,
    deliveryType: 'normal',
    isDocument: false,
    cadToInrRate: 70.4,
  });

  const shippingPrice = topsQty + bottomsQty === 0 ? 0 : Math.round(costCalc.finalPriceCAD);

  const totalPrice = indianPrice + shippingPrice;
  const savings = Math.max(0, canadianPrice - totalPrice);

  // Ref scroll anchors
  const heroRef = useRef<HTMLDivElement>(null);
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const essentialsRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const userInitial = user
    ? (user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U').toUpperCase()
    : null;

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setSidebarOpen(false);
  };

  return (
    <div className="bg-[#FAF8EE] text-[#0E1F38] min-h-screen flex flex-col overflow-x-hidden relative font-sans">

      {/* ───────────────────────────────────────────
          PERSISTENT HEADER (Matching PDF Page 1)
      ─────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 w-full h-[10vh] z-[100] flex items-center justify-between px-6 md:px-16 transition-all duration-300 ${
          scrolled ? 'bg-[#FAF8EE]/90 backdrop-blur-md border-b border-black/5 shadow-sm' : 'bg-transparent'
        }`}
      >
        {/* Left: Logo */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-10 h-10 flex items-center justify-center text-[#0E1F38] hover:text-[#FF5A65] transition-colors cursor-pointer"
            aria-label="Open Menu"
          >
            <span className="material-symbols-outlined text-2xl font-bold">menu</span>
          </button>
          <div onClick={() => scrollToSection(heroRef)} className="cursor-pointer">
            <Logo showTagline={false} darkText={true} />
          </div>
        </div>

        {/* Right: Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 font-semibold text-sm">
          <Link
            href="/know-more"
            className="text-[#0E1F38] hover:text-[#FF5A65] transition-colors"
          >
            How it Works
          </Link>
          <Link
            href="/shipping-policy"
            className="text-[#0E1F38] hover:text-[#FF5A65] transition-colors"
          >
            Shipping Policy
          </Link>
          {loading ? (
            <div className="w-20 h-4 bg-black/5 rounded animate-pulse" />
          ) : user ? (
            <Link
              href="/dashboard"
              className="text-[#0E1F38] hover:text-[#FF5A65] transition-colors"
            >
              My Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-[#0E1F38] hover:text-[#FF5A65] transition-colors"
            >
              Sign Up/Log In
            </Link>
          )}
        </nav>
      </header>

      {/* ───────────────────────────────────────────
          LEFT SIDEBAR MENU
      ─────────────────────────────────────────── */}
      <div
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 bg-black/40 z-[110] transition-opacity duration-300 ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-[#fdfbf7] z-[120] border-r border-black/5 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-black/5">
          <Logo showTagline={false} darkText={true} />
          <button onClick={() => setSidebarOpen(false)} className="text-[#0E1F38] hover:text-[#FF5A65] transition-colors cursor-pointer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="px-5 py-4 border-b border-black/5">
          {loading ? (
            <div className="h-10 bg-black/5 rounded-xl animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-[#FF5A65]/30 bg-[#FAF8EE] flex items-center justify-center text-[#FF5A65] font-bold text-sm">
                {userInitial}
              </div>
              <div>
                <p className="text-sm font-bold text-[#0E1F38]">{user.user_metadata?.full_name || user.email?.split('@')[0]}</p>
                <p className="text-[10px] text-[#FF5A65] font-bold uppercase tracking-widest">Layo Member</p>
              </div>
            </div>
          ) : (
            <Link href="/login" onClick={() => setSidebarOpen(false)} className="flex items-center gap-2 text-[#FF5A65] font-bold text-sm hover:underline">
              <span className="material-symbols-outlined text-base">login</span>
              Sign In / Create Account
            </Link>
          )}
        </div>

        <nav className="flex-grow px-3 py-4 space-y-1 overflow-y-auto">
          <button
            onClick={() => { scrollToSection(heroRef); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#0E1F38]/80 hover:bg-black/5 hover:text-black transition-all text-sm font-semibold text-left cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg leading-none">home</span>
            Home
          </button>
          <Link
            href="/about"
            onClick={() => setSidebarOpen(false)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#0E1F38]/80 hover:bg-black/5 hover:text-black transition-all text-sm font-semibold text-left"
          >
            <span className="material-symbols-outlined text-lg leading-none">corporate_fare</span>
            About Layo
          </Link>
          <Link
            href="/know-more"
            onClick={() => setSidebarOpen(false)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#0E1F38]/80 hover:bg-black/5 hover:text-black transition-all text-sm font-semibold text-left"
          >
            <span className="material-symbols-outlined text-lg leading-none">info</span>
            How It Works
          </Link>
          <Link
            href="/calculator"
            onClick={() => setSidebarOpen(false)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#0E1F38]/80 hover:bg-black/5 hover:text-black transition-all text-sm font-semibold text-left"
          >
            <span className="material-symbols-outlined text-lg leading-none">calculate</span>
            Shipping Calculator
          </Link>
          <Link
            href="/tracking"
            onClick={() => setSidebarOpen(false)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#0E1F38]/80 hover:bg-black/5 hover:text-black transition-all text-sm font-semibold text-left"
          >
            <span className="material-symbols-outlined text-lg leading-none">local_shipping</span>
            Track Shipment
          </Link>
          <Link
            href="/know-more"
            onClick={() => setSidebarOpen(false)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#0E1F38]/80 hover:bg-black/5 hover:text-black transition-all text-sm font-semibold text-left"
          >
            <span className="material-symbols-outlined text-lg leading-none">menu_book</span>
            Know More Guide
          </Link>
          <button
            onClick={() => { scrollToSection(contactRef); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#0E1F38]/80 hover:bg-black/5 hover:text-black transition-all text-sm font-semibold text-left cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg leading-none">support_agent</span>
            Contact Us
          </button>
          
          <div className="h-px bg-black/5 my-4" />

          <span className="px-4 text-[10px] font-bold uppercase tracking-wider text-black/40">Legal &amp; Policies</span>
          
          <Link
            href="/shipping-policy"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[#0E1F38]/70 hover:bg-black/5 hover:text-black transition-all text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-base">local_shipping</span>
            Shipping Policy
          </Link>
          <Link
            href="/privacy"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[#0E1F38]/70 hover:bg-black/5 hover:text-black transition-all text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-base">privacy_tip</span>
            Privacy Policy
          </Link>
          <Link
            href="/refund-policy"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[#0E1F38]/70 hover:bg-black/5 hover:text-black transition-all text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-base">replay</span>
            Returns &amp; Refund Policy
          </Link>
          <Link
            href="/terms"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[#0E1F38]/70 hover:bg-black/5 hover:text-black transition-all text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-base">gavel</span>
            Terms and Conditions
          </Link>
          <Link
            href="/faq"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[#0E1F38]/70 hover:bg-black/5 hover:text-black transition-all text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-base">help_outline</span>
            Frequently Asked Questions
          </Link>
        </nav>

        <div className="px-3 pb-6 border-t border-black/5 pt-4">
          {user ? (
            <button
              onClick={() => { supabase.auth.signOut(); setSidebarOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-500/10 transition-all w-full text-sm font-semibold cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg leading-none">logout</span>
              Log Out
            </button>
          ) : (
            <p className="text-[10px] text-black/55 text-center px-4">Sign in to access dashboard & parcel holds</p>
          )}
        </div>
      </aside>

      {/* ───────────────────────────────────────────
          PAGE 1: HERO SECTION (Matching PDF Page 1)
      ─────────────────────────────────────────── */}
      <section
        ref={heroRef}
        id="hero"
        className="min-h-screen relative flex flex-col justify-between items-center px-6 text-center pt-[15vh] pb-10 overflow-hidden"
      >
        <div className="max-w-4xl w-full flex-grow flex flex-col justify-center items-center space-y-8 z-10">
          {/* Main Title */}
          <h1 className="text-5xl md:text-8xl font-black tracking-tight text-[#0E1F38] leading-tight">
            Bringing<br />
            India <span className="text-[#FF5A65] italic font-serif-luxury font-medium">Closer.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-2xl text-[#0E1F38]/85 max-w-2xl leading-relaxed font-normal">
            Ship your favourite Indian buys straight to your door abroad. Packed together, priced fair & delivered fast.
          </p>

          {/* Start Button */}
          <div className="pt-4">
            <Link
              href="/dashboard"
              className="inline-block px-10 py-5 bg-[#FF5A65] text-white font-bold text-base md:text-lg rounded-full hover:bg-[#E24550] transition-colors shadow-lg shadow-[#FF5A65]/15 cursor-pointer text-center"
            >
              Start Shipping with Layo
            </Link>
          </div>
        </div>

        {/* Down Arrow Indicator */}
        <button
          onClick={() => scrollToSection(howItWorksRef)}
          className="w-12 h-12 rounded-full border-2 border-[#0E1F38] flex items-center justify-center text-[#0E1F38] hover:text-[#FF5A65] hover:border-[#FF5A65] transition-colors z-10 cursor-pointer animate-bounce mt-auto"
          aria-label="Scroll Down"
        >
          <span className="material-symbols-outlined text-2xl font-black">arrow_downward</span>
        </button>
      </section>

      {/* ───────────────────────────────────────────
          PAGE 2: HOW LAYO WORKS (Matching PDF Page 2)
      ─────────────────────────────────────────── */}
      <section
        ref={howItWorksRef}
        id="how-it-works"
        className="min-h-screen py-24 px-6 md:px-16 flex flex-col justify-between items-center relative border-t border-black/5"
      >
        <div className="max-w-6xl w-full mx-auto flex-grow flex flex-col justify-center space-y-16">
          {/* Section Headers */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-black tracking-tight text-[#0E1F38]">
              How <span className="text-[#FF5A65] italic font-serif-luxury font-medium">Layo</span> Works
            </h2>
            <p className="text-base md:text-xl text-[#0E1F38]/70 leading-relaxed font-light">
              Every order you place in India lands safely in your own Layo warehouse locker — ready to combine, pack, and send <span className="font-semibold italic">whenever you are.</span>
            </p>
          </div>

          {/* Grid Layout: Columns left, Box right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Numbered Cards */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Step 01 */}
              <div className="bg-white border border-black/5 rounded-[24px] md:rounded-3xl p-5 md:p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-2 min-w-[32px]">
                    <span className="text-2xl md:text-3xl font-black text-[#7CB342]">01</span>
                    <span className="text-2xl">📍</span>
                  </div>
                  <div className="space-y-1.5 md:space-y-4 pt-1">
                    <h3 className="text-lg md:text-xl font-bold text-[#7CB342]">Route Your Packages</h3>
                    <p className="text-xs md:text-sm text-[#0E1F38]/75 leading-relaxed font-medium">
                      Whether you are shopping online or offline, or receiving a personal package, simply use your provided warehouse address as your delivery destination.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 02 */}
              <div className="bg-white border border-black/5 rounded-[24px] md:rounded-3xl p-5 md:p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-2 min-w-[32px]">
                    <span className="text-2xl md:text-3xl font-black text-[#7CB342]">02</span>
                    <span className="text-2xl">🏷️</span>
                  </div>
                  <div className="space-y-1.5 md:space-y-4 pt-1">
                    <h3 className="text-lg md:text-xl font-bold text-[#7CB342]">Categorize & Customize</h3>
                    <p className="text-xs md:text-sm text-[#0E1F38]/75 leading-relaxed font-medium">
                      Ditch the guesswork by simply categorizing your items for a smart, data-driven weight estimate. Don't forget your lightweight "Extras"!
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 03 */}
              <div className="bg-white border border-black/5 rounded-[24px] md:rounded-3xl p-5 md:p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-2 min-w-[32px]">
                    <span className="text-2xl md:text-3xl font-black text-[#7CB342]">03</span>
                    <span className="text-2xl">🔄</span>
                  </div>
                  <div className="space-y-1.5 md:space-y-4 pt-1">
                    <h3 className="text-lg md:text-xl font-bold text-[#7CB342]">Ship, Hold & Combine</h3>
                    <p className="text-xs md:text-sm text-[#0E1F38]/75 leading-relaxed font-medium">
                      Ship immediately, or optionally choose to hold your items to combine them with up to 3 additional incoming packages.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 04 */}
              <div className="bg-white border border-black/5 rounded-[24px] md:rounded-3xl p-5 md:p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center gap-2 min-w-[32px]">
                    <span className="text-2xl md:text-3xl font-black text-[#7CB342]">04</span>
                    <span className="text-2xl">🚚</span>
                  </div>
                  <div className="space-y-1.5 md:space-y-4 pt-1">
                    <h3 className="text-lg md:text-xl font-bold text-[#7CB342]">Ship & Track</h3>
                    <p className="text-xs md:text-sm text-[#0E1F38]/75 leading-relaxed font-medium">
                      Review your finalized, cost-effective shipment, complete your payment, and track your smart haul right to your doorstep.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: 3D Layo Box Graphic */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center relative mt-6 lg:mt-0">
              <div className="w-full max-w-[480px] relative">
                <Image
                  src="/how-layo-works-box.png"
                  alt="How Layo Works - Combine Orders, Safe In Your Locker, Hold Orders Up To 30 Days"
                  width={1024}
                  height={621}
                  className="w-full h-auto object-contain drop-shadow-md rounded-3xl transition-transform hover:scale-[1.02] duration-300"
                  priority
                />
              </div>
            </div>
          </div>
        </div>

        {/* Down Arrow Indicator */}
        <button
          onClick={() => scrollToSection(essentialsRef)}
          className="w-12 h-12 rounded-full border-2 border-[#0E1F38] flex items-center justify-center text-[#0E1F38] hover:text-[#FF5A65] hover:border-[#FF5A65] transition-colors z-10 cursor-pointer animate-bounce mt-6"
          aria-label="Scroll Down"
        >
          <span className="material-symbols-outlined text-2xl font-black">arrow_downward</span>
        </button>
      </section>

      {/* ───────────────────────────────────────────
          PAGE 3: ESSENTIALS ESTIMATE (Matching PDF Page 3)
      ─────────────────────────────────────────── */}
      <section
        ref={essentialsRef}
        id="essentials"
        className="min-h-screen py-24 px-6 md:px-16 flex flex-col justify-center items-center relative border-t border-black/5"
      >
        <div className="max-w-5xl w-full mx-auto space-y-12">
          {/* Header */}
          <div className="text-left">
            <h2 className="text-3xl md:text-5xl font-black text-[#0E1F38] tracking-tight">
              Every stage of life has it’s <span className="text-[#FF5A65] italic font-serif-luxury font-medium">essentials.</span>
            </h2>
          </div>

          {/* Conveyor Belt Category Selector (Rolling Animation matching Image 1) */}
          <div className="relative w-full bg-[#243015] border-2 border-[#1B250F] rounded-[28px] md:rounded-[36px] py-4 px-3 sm:px-6 shadow-2xl overflow-hidden">
            {/* IN (India) Left Badge with subtle pulsing ring */}
            <div className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center pointer-events-none">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#D25842] text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-lg border-2 border-[#FAF8EE]">
                IN
              </div>
            </div>

            {/* CA (Canada) Right Badge */}
            <div className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center pointer-events-none">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#1B381B] text-white font-black text-xs sm:text-sm flex items-center justify-center shadow-lg border-2 border-[#FAF8EE]">
                CA
              </div>
            </div>

            {/* Left & Right gradient masks for smooth entry/exit */}
            <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-16 bg-gradient-to-r from-[#243015] to-transparent z-20 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-16 bg-gradient-to-l from-[#243015] to-transparent z-20 pointer-events-none" />

            {/* Continuous Rolling Conveyor Packages Track */}
            <div className="overflow-hidden w-full py-2">
              <div className="animate-conveyor-roll flex items-center gap-3 sm:gap-4 pl-4 cursor-pointer">
                {/* 2 Sets of items for infinite seamless rolling loop */}
                {[...CATEGORIES_CONFIG, ...CATEGORIES_CONFIG].map((cat, loopIdx) => {
                  const actualIdx = loopIdx % CATEGORIES_CONFIG.length;
                  const isSelected = activeCatIndex === actualIdx;
                  return (
                    <div
                      key={`${cat.id}-${loopIdx}`}
                      onClick={() => setActiveCatIndex(actualIdx)}
                      className={`group relative flex-shrink-0 w-32 sm:w-40 flex flex-col items-center cursor-pointer transition-all duration-300 ${
                        isSelected
                          ? 'scale-105 z-10'
                          : 'opacity-85 hover:opacity-100 hover:scale-[1.02]'
                      }`}
                    >
                      {/* Parcel Box Image */}
                      <div
                        className={`relative w-full rounded-2xl overflow-hidden transition-all duration-300 shadow-md ${
                          isSelected
                            ? 'ring-3 ring-[#8BC34A] shadow-[#8BC34A]/25 shadow-xl scale-[1.02]'
                            : 'border border-black/15 group-hover:scale-[1.01]'
                        }`}
                      >
                        <img
                          src={cat.image.replace('-box.png', '-conveyor.png')}
                          alt={cat.tabLabel}
                          className="w-full h-auto block object-cover"
                        />
                      </div>

                      {/* tap to compare subtitle */}
                      <span
                        className={`text-[9px] sm:text-[10px] mt-1.5 transition-colors font-medium tracking-tight ${
                          isSelected
                            ? 'text-[#8BC34A] font-bold'
                            : 'text-[#8BC34A]/60 group-hover:text-[#8BC34A]'
                        }`}
                      >
                        {isSelected ? '● selected' : 'tap to compare'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Animated Conveyor Track Treads */}
            <div className="w-full h-2.5 mt-2 border-t border-[#34461F]/60 animate-conveyor-treads opacity-70" />
          </div>

          {/* Physical stacked cards container layout */}
          <div className="relative w-full aspect-auto min-h-[480px]">
            {/* Overlapping back sheet 2 */}
            <div className="absolute inset-0 bg-white border border-black/5 rounded-3xl shadow-sm transform translate-y-4 scale-[0.98] opacity-50 pointer-events-none" />
            
            {/* Overlapping back sheet 1 */}
            <div className="absolute inset-0 bg-white border border-black/5 rounded-3xl shadow-md transform translate-y-2 scale-[0.99] opacity-80 pointer-events-none" />

            {/* Active Card Body */}
            <div className="relative bg-white border border-black/5 rounded-3xl p-6 md:p-12 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              
              {/* Left Column: Details */}
              <div className="lg:col-span-8 flex flex-col justify-between space-y-6">
                
                {/* Header title */}
                <div className="space-y-4">
                  <h3 className="text-2xl md:text-3xl font-black text-[#0E1F38]">
                    {activeCategory.cardTitle}
                  </h3>
                  <div className="flex flex-row items-start gap-4">
                    <p className="text-xs md:text-sm text-[#0E1F38]/70 leading-relaxed font-medium flex-1">
                      {activeCategory.description} Here’s how you can save <span className="font-bold text-[#2E7D32]">${savings} CAD</span> on this haul.
                    </p>
                    {/* Mobile Image Container */}
                    <div className="w-1/3 lg:hidden relative flex items-center justify-center -mt-2">
                      <Image
                        key={activeCategory.id + '-mobile'}
                        src={activeCategory.image}
                        alt={`${activeCategory.cardTitle} curated haul items`}
                        width={200}
                        height={200}
                        className="w-full h-auto object-contain drop-shadow-md"
                      />
                    </div>
                  </div>
                </div>

                {/* Interactive Dynamic Quantities Stepper Bar */}
                <div className="bg-[#FAF8EE] border border-black/5 rounded-2xl p-4 flex flex-col gap-4">
                  {/* Tops Stepper */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl md:text-2xl">👕</span>
                      <div className="flex flex-col">
                        <span className="text-xs md:text-sm font-black text-[#0E1F38] flex flex-col md:flex-row md:items-center gap-0 md:gap-1 leading-tight">
                          Tops / Shirts
                          <span className="text-[10px] font-normal text-[#0E1F38]/60">(from ${activeCategory.topsUnitRate}/pc)</span>
                        </span>
                        <span className="text-[10px] text-[#0E1F38]/50 font-medium">$CAD/pc.</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white rounded-full px-3 py-1.5 border border-black/10 shadow-sm flex-shrink-0">
                      <button
                        onClick={() => handleUpdateQty(activeCategory.id, 'tops', -1)}
                        disabled={topsQty <= 0}
                        className="w-6 h-6 flex items-center justify-center text-[#0E1F38] hover:bg-black/5 rounded-full active:scale-90 transition-all disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
                        aria-label="Decrease tops"
                      >
                        <span className="material-symbols-outlined text-sm font-bold leading-none">remove</span>
                      </button>
                      <span className="w-5 text-center font-bold text-sm text-[#0E1F38]">{topsQty}</span>
                      <button
                        onClick={() => handleUpdateQty(activeCategory.id, 'tops', 1)}
                        className="w-6 h-6 flex items-center justify-center text-[#0E1F38] hover:bg-black/5 rounded-full active:scale-90 transition-all cursor-pointer"
                        aria-label="Increase tops"
                      >
                        <span className="material-symbols-outlined text-sm font-bold leading-none">add</span>
                      </button>
                    </div>
                  </div>

                  {/* Bottoms Stepper */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl md:text-2xl">👖</span>
                      <div className="flex flex-col">
                        <span className="text-xs md:text-sm font-black text-[#0E1F38] flex flex-col md:flex-row md:items-center gap-0 md:gap-1 leading-tight">
                          Bottoms / Pants
                          <span className="text-[10px] font-normal text-[#0E1F38]/60">(from ${activeCategory.bottomsUnitRate}/pc)</span>
                        </span>
                        <span className="text-[10px] text-[#0E1F38]/50 font-medium">$CAD/pc.</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white rounded-full px-3 py-1.5 border border-black/10 shadow-sm flex-shrink-0">
                      <button
                        onClick={() => handleUpdateQty(activeCategory.id, 'bottoms', -1)}
                        disabled={bottomsQty <= 0}
                        className="w-6 h-6 flex items-center justify-center text-[#0E1F38] hover:bg-black/5 rounded-full active:scale-90 transition-all disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
                        aria-label="Decrease bottoms"
                      >
                        <span className="material-symbols-outlined text-sm font-bold leading-none">remove</span>
                      </button>
                      <span className="w-5 text-center font-bold text-sm text-[#0E1F38]">{bottomsQty}</span>
                      <button
                        onClick={() => handleUpdateQty(activeCategory.id, 'bottoms', 1)}
                        className="w-6 h-6 flex items-center justify-center text-[#0E1F38] hover:bg-black/5 rounded-full active:scale-90 transition-all cursor-pointer"
                        aria-label="Increase bottoms"
                      >
                        <span className="material-symbols-outlined text-sm font-bold leading-none">add</span>
                      </button>
                    </div>
                  </div>

                  {/* Reset to Recommended */}
                  {(topsQty !== activeCategory.defaultTops || bottomsQty !== activeCategory.defaultBottoms) && (
                    <div className="flex justify-end mt-1">
                      <button
                        onClick={() => handleResetQty(activeCategory.id)}
                        className="px-3 py-1 bg-white border border-black/10 text-[11px] font-bold text-[#FF5A65] hover:bg-[#FF5A65]/10 rounded-full transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                      >
                        <span className="material-symbols-outlined text-xs">restart_alt</span>
                        Reset
                      </button>
                    </div>
                  )}
                </div>

                {/* Price Comparisons */}
                <div className="space-y-3.5 font-semibold text-xs md:text-sm">
                  {/* Canadian store price */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-[#0E1F38]/60">Estimated cost at a</span>
                      <span className="px-3 py-1.5 bg-[#FAF8EE] border border-black/5 rounded-[8px] font-bold text-[10px] uppercase tracking-wider text-[#0E1F38]">Canadian store</span>
                    </div>
                    <span className="px-4 py-1.5 bg-[#FFD8D8] text-[#C62828] rounded-full font-bold text-xs sm:text-sm text-center inline-flex items-center justify-center">
                      ${canadianPrice}
                    </span>
                  </div>

                  {/* Indian bought products price */}
                  <div className="flex items-center justify-between">
                    <span className="text-[#0E1F38]/60 font-medium">Indian bought products ({topsQty + bottomsQty} items)</span>
                    <span className="text-[#0E1F38] font-black text-sm">
                      ${indianPrice}
                    </span>
                  </div>

                  {/* + Ship With Layo price */}
                  <div className="flex items-center justify-between pb-1 border-b border-black/5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#0E1F38]/60 font-medium">+ Ship With Layo</span>
                      <span className="text-[10px] text-[#0E1F38]/40 font-normal">({chargeableKg} kg volumetric)</span>
                    </div>
                    <span className="text-[#0E1F38] font-black text-sm">
                      ${shippingPrice}
                    </span>
                  </div>

                  {/* Lightweight Extras FREE badge */}
                  <div className="flex items-center justify-between py-1 gap-2">
                    <div className="flex items-start gap-2 px-3 py-2 bg-[#E2E8DD] text-[#3B4A2C] border border-[#C5D3BC] rounded-xl text-[10px] sm:text-[11px] font-bold flex-grow leading-tight">
                      <span className="material-symbols-outlined text-sm leading-none mt-0.5">workspace_premium</span>
                      <span>Light weight items (max 50 gm) <br/><span className="font-medium">- Maximum 5 items can be added</span></span>
                    </div>
                    <span className="text-[#3B4A2C] font-black text-xs sm:text-sm uppercase tracking-wider px-2 text-center leading-tight">MAX<br/>50G</span>
                  </div>

                  {/* Total pricing */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="px-4 py-2 bg-[#E6F4D0] rounded-xl text-[#2B3A1A] font-black text-xs md:text-sm uppercase tracking-wider shadow-sm">
                      YOU SAVE ${savings} CAD!
                    </div>
                    <span className="px-4 py-1.5 bg-[#D6E9C6] text-[#2F4F2F] rounded-full font-bold text-xs sm:text-sm text-center inline-flex items-center justify-center">
                      ${totalPrice}
                    </span>
                  </div>
                </div>

              </div>

              {/* Right Column: Dynamic Category Box (Desktop Only) */}
              <div className="hidden lg:flex lg:col-span-4 flex-col justify-center items-center relative min-h-[280px] lg:border-l lg:border-black/5 lg:pl-8">
                {/* Dynamic Category Box Image */}
                <div className="w-full max-w-[280px] sm:max-w-[300px] relative flex items-center justify-center py-2 transition-all duration-300">
                  <Image
                    key={activeCategory.id + '-desktop'}
                    src={activeCategory.image}
                    alt={`${activeCategory.cardTitle} curated haul items in shipping box`}
                    width={400}
                    height={500}
                    className="w-full h-auto max-h-[340px] object-contain drop-shadow-md transition-all duration-300 hover:scale-105"
                    priority
                  />
                </div>

                {/* Pagination Dots */}
                <div className="absolute lg:-right-10 lg:top-1/2 lg:-translate-y-1/2 bottom-[-16px] left-1/2 -translate-x-1/2 flex lg:flex-col flex-row gap-2.5 items-center z-10">
                  {CATEGORIES_CONFIG.map((_, dotIdx) => (
                    <button
                      key={dotIdx}
                      onClick={() => setActiveCatIndex(dotIdx)}
                      className={`w-3 h-3 rounded-full transition-all cursor-pointer ${
                        activeCatIndex === dotIdx
                          ? 'bg-[#FF5A65] scale-125 ring-2 ring-[#FF5A65]/20'
                          : 'bg-[#0E1F38]/20 hover:bg-[#0E1F38]/50'
                      }`}
                      aria-label={`Select item category ${dotIdx + 1}`}
                    />
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Disclaimer Box */}
          <div className="bg-[#FFF5F5] border border-[#FFCDD2] rounded-3xl p-6 sm:p-7 md:p-8 text-center text-sm sm:text-base md:text-lg font-bold text-[#C62828] leading-relaxed shadow-xs">
            <span className="font-black text-[#B71C1C] mr-1.5">*Disclaimer:</span>
            Layo is a shipping forwarder, not a retailer. Prices are estimates showing typical savings when you shop your favorite Indian brands and ship with us.
          </div>

          {/* Save up to text & Button Actions */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-4">
            <div className="text-center md:text-left space-y-1">
              <h4 className="text-xl font-bold text-[#0E1F38]">Save upto</h4>
              <p className="text-5xl font-black text-[#FF5A65]">
                40% <span className="text-xs md:text-sm font-bold text-[#0E1F38]/60 uppercase tracking-widest">when you ship with Layo</span>
              </p>
            </div>

            <button
              onClick={() => setModalOpen(true)}
              className="w-full md:w-auto px-10 py-4 bg-[#FF5A65] text-white font-bold text-sm uppercase tracking-wider rounded-xl hover:bg-[#E24550] transition-colors shadow-md shadow-[#FF5A65]/10 cursor-pointer"
            >
              Send My Orders Here
            </button>
          </div>

          {/* Bottom calculator links */}
          <div className="flex gap-4 w-full justify-center pt-4">
            <button
              onClick={() => setModalOpen(true)}
              className="px-8 py-3.5 bg-[#0E1F38] text-white hover:bg-[#060D18] font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Calculate Shipping
            </button>
            <Link
              href="/know-more"
              className="px-8 py-3.5 border-2 border-[#0E1F38] text-[#0E1F38] hover:bg-black/5 font-bold text-xs uppercase tracking-wider rounded-xl transition-all text-center"
            >
              Know More
            </Link>
          </div>

        </div>
      </section>

      {/* ───────────────────────────────────────────
          PAGE 4: BRAND FOOTER & CONTACT GRID (Matching PDF Page 4)
      ─────────────────────────────────────────── */}
      <section
        ref={contactRef}
        id="contact-section"
        className="py-24 px-6 md:px-16 bg-[#ECEAE0] border-t border-black/5 flex flex-col justify-between"
      >
        <div className="max-w-6xl w-full mx-auto space-y-16">
          {/* Header */}
          <div className="text-left">
            <h2 className="text-4xl md:text-6xl font-black text-[#0E1F38] tracking-tight">
              We’re here for you!
            </h2>
          </div>

          {/* Support Columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start">
            
            {/* Links and Legal Container (Mobile 2-col) */}
            <div className="md:col-span-6 grid grid-cols-2 gap-4 md:gap-8">
              {/* Quick Links Column */}
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-[#0E1F38]">Quick Links</h3>
                <ul className="space-y-3 font-semibold text-xs md:text-sm text-[#0E1F38]/70">
                  <li><Link href="/about" className="hover:text-[#FF5A65] transition-colors">About Layo</Link></li>
                  <li><Link href="/know-more" className="hover:text-[#FF5A65] transition-colors text-left">How It Works</Link></li>
                  <li><button onClick={() => setModalOpen(true)} className="hover:text-[#FF5A65] transition-colors text-left">Shipping Calculator</button></li>
                  <li><Link href="/tracking" className="hover:text-[#FF5A65] transition-colors">Track Shipment</Link></li>
                </ul>

                {/* Follow Us */}
                <div className="space-y-3 pt-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#0E1F38]">Follow Us</h4>
                  <div className="flex gap-3">
                    <a href="https://www.facebook.com/share/1CAG5D6YaT/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-[#0E1F38] text-white flex items-center justify-center cursor-pointer hover:bg-[#FF5A65] transition-colors" aria-label="Facebook">
                      <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                        <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
                      </svg>
                    </a>
                    <a href="https://www.instagram.com/get_layo?igsi=MTBoZ3VkZ3c1M3dl" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-[#0E1F38] text-white flex items-center justify-center cursor-pointer hover:bg-[#FF5A65] transition-colors" aria-label="Instagram">
                      <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                        <path d="M11.999 7.377a4.623 4.623 0 1 0 0 9.248 4.623 4.623 0 0 0 0-9.248zm0 7.627a3.004 3.004 0 1 1 0-6.008 3.004 3.004 0 0 1 0 6.008z"/>
                        <circle cx="16.806" cy="7.207" r="1.078"/>
                        <path d="M20.533 6.111A4.605 4.605 0 0 0 17.9 3.479a6.606 6.606 0 0 0-2.186-.42c-.963-.042-1.268-.054-3.71-.054s-2.755 0-3.71.054a6.554 6.554 0 0 0-2.184.42 4.6 4.6 0 0 0-2.633 2.632 6.585 6.585 0 0 0-.419 2.186c-.043.962-.056 1.267-.056 3.71 0 2.442 0 2.753.056 3.71.015.748.156 1.486.419 2.187a4.61 4.61 0 0 0 2.634 2.632 6.584 6.584 0 0 0 2.185.45c.963.042 1.268.055 3.71.055s2.755 0 3.71-.055a6.615 6.615 0 0 0 2.186-.419 4.613 4.613 0 0 0 2.633-2.633c.263-.7.404-1.438.419-2.186.043-.962.056-1.267.056-3.71s0-2.753-.056-3.71a6.581 6.581 0 0 0-.421-2.217zm-1.218 9.532a5.043 5.043 0 0 1-.311 1.688 2.987 2.987 0 0 1-1.712 1.711 4.985 4.985 0 0 1-1.67.311c-.95.044-1.218.055-3.654.055-2.438 0-2.687 0-3.655-.055a4.96 4.96 0 0 1-1.669-.311 2.985 2.985 0 0 1-1.719-1.711 5.08 5.08 0 0 1-.311-1.669c-.043-.95-.053-1.218-.053-3.654 0-2.437 0-2.686.053-3.655a5.038 5.038 0 0 1 .311-1.687c.305-.789.93-1.41 1.719-1.712a5.01 5.01 0 0 1 1.669-.311c.951-.043 1.218-.055 3.655-.055s2.687 0 3.654.055a4.96 4.96 0 0 1 1.67.311 2.991 2.991 0 0 1 1.712 1.712 5.08 5.08 0 0 1 .311 1.669c.043.951.054 1.218.054 3.655 0 2.436 0 2.698-.043 3.654h-.011z"/>
                      </svg>
                    </a>
                    <a href="https://www.linkedin.com/company/getlayo/" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-[#0E1F38] text-white flex items-center justify-center cursor-pointer hover:bg-[#FF5A65] transition-colors" aria-label="LinkedIn">
                      <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                        <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z"/>
                      </svg>
                    </a>
                  </div>
                </div>
              </div>

              {/* Legal Column */}
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-[#0E1F38]">Legal</h3>
                <ul className="space-y-3 font-semibold text-xs md:text-sm text-[#0E1F38]/70">
                  <li><Link href="/privacy" className="hover:text-[#FF5A65] transition-colors">Privacy Policy</Link></li>
                  <li><Link href="/refund-policy" className="hover:text-[#FF5A65] transition-colors">Returns & Refund Policy</Link></li>
                  <li><Link href="/terms" className="hover:text-[#FF5A65] transition-colors">Terms & Conditions</Link></li>
                  <li><Link href="/faq" className="hover:text-[#FF5A65] transition-colors">FAQs</Link></li>
                  <li><Link href="/shipping-policy" className="hover:text-[#FF5A65] transition-colors">Shipping Policies</Link></li>
                </ul>
              </div>
            </div>

            {/* Contact Us Card */}
            <div className="md:col-span-6 bg-[#E7F7D3] border border-[#D5E9C0] rounded-3xl p-6 md:p-8 space-y-6 shadow-sm text-[#0E1F38]">
              <h3 className="text-xl font-bold">Contact Us</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs md:text-sm font-semibold">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#0E1F38]/50 block">Email</span>
                  <a href="mailto:layohq@gmail.com" className="text-[#FF5A65] hover:underline font-bold text-sm">layohq@gmail.com</a>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#0E1F38]/50 block">Phone / WhatsApp</span>
                  <a
                    href="https://wa.me/19058070163?text=Hi%20Layo!%20I%20have%20a%20question%20about%20shipping%20from%20India%20to%20Canada."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[#25D366] hover:underline font-bold text-sm"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    +1 9058070163
                  </a>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#0E1F38]/50 block">Business hours</span>
                  <p className="font-medium">Mon – Sat: 10 AM – 7 PM IST</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#0E1F38]/50 block">Address</span>
                  <a
                    href="https://maps.google.com/?q=25+Tindale+Court,+Hamilton,+Ontario+L8K+6C8"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="leading-relaxed font-medium block hover:text-[#FF5A65] transition-colors"
                  >
                    25 Tindale Court,<br />
                    Hamilton, Ontario L8K 6C8,<br />
                    Canada
                  </a>
                </div>
              </div>
            </div>

          </div>

          {/* Large Brand Banner (Coral Background) */}
          <div className="w-full bg-[#FF5A65] rounded-3xl p-8 md:p-12 flex justify-between items-center relative overflow-hidden shadow-lg shadow-[#FF5A65]/15">
            <h3 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight max-w-lg">
              Indian shipping<br />made easy.
            </h3>
            
            {/* Official Pink/Coral 3D Layo Logo */}
            <div className="w-24 h-24 md:w-32 md:h-32 flex items-center justify-center bg-white/95 rounded-3xl p-3 shadow-xl flex-shrink-0 transform rotate-6 hover:rotate-0 transition-transform">
              <Image
                src="/layo-logo.png"
                alt="Layo Official Logo"
                width={120}
                height={120}
                className="w-full h-full object-contain drop-shadow-md"
              />
            </div>
          </div>

          {/* Centered Copyright text */}
          <div className="text-center text-xs text-[#0E1F38]/60 italic font-semibold">
            © 2026 Layo. All rights reserved.
          </div>
        </div>
      </section>

      {/* Estimator Modal */}
      <EstimatorModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

    </div>
  );
}
