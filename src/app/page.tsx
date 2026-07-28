'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import EstimatorModal from '@/components/EstimatorModal';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

// Category item structure for Section 3
interface CategoryItem {
  name: string;
  qty: number;
  icon: string;
}

interface CategoryDetails {
  id: string;
  name: string;
  ageLabel: string;
  description: string;
  items: CategoryItem[];
  canadaCost: number;
  indiaCost: number;
  shippingCost: number;
  savings: number;
  imageUrl: string;
  imageAlt: string;
}

const CATEGORIES_DATA: Record<string, CategoryDetails> = {
  baby: {
    id: 'baby',
    name: 'Baby & Toddler',
    ageLabel: '0-4 years',
    description: 'Toddlers and babies go through essentials fast. You\'ll typically need about 10 items every season. Here\'s what you save shipping Indian products with Layo.',
    items: [
      { name: 'Onesies / Daycare Basics', qty: 6, icon: 'child_care' },
      { name: 'Leggings & Cotton Pants', qty: 4, icon: 'accessibility_new' }
    ],
    canadaCost: 110,
    indiaCost: 35,
    shippingCost: 15,
    savings: 60,
    imageUrl: '/value-goods-3d.png',
    imageAlt: 'Baby and toddler essentials in a shipping box'
  },
  kids: {
    id: 'kids',
    name: 'Kids',
    ageLabel: '5-12 years',
    description: 'Active kids outgrow and wear out play-wear in no time. You\'ll typically need about 8 items every season. Here\'s what you save shipping Indian products with Layo.',
    items: [
      { name: 'Graphic Tees & Tops', qty: 5, icon: 'checkroom' },
      { name: 'Comfort Joggers & Pajamas', qty: 3, icon: 'accessibility' }
    ],
    canadaCost: 140,
    indiaCost: 45,
    shippingCost: 20,
    savings: 75,
    imageUrl: '/apparel-v2.png',
    imageAlt: 'Kids clothing essentials in a shipping box'
  },
  teens: {
    id: 'teens',
    name: 'Teens',
    ageLabel: '13-18 years',
    description: 'Teens go through style trends and sizes fast. You\'ll typically need about 6 items every season. Here\'s what you save shipping Indian products with Layo.',
    items: [
      { name: 'Oversized Tees & Streetwear', qty: 4, icon: 'checkroom' },
      { name: 'Cargo & Denim Pants', qty: 2, icon: 'apparel' }
    ],
    canadaCost: 72,
    indiaCost: 28,
    shippingCost: 14,
    savings: 30,
    imageUrl: '/apparel-3d.png',
    imageAlt: 'Teens dynamic product apparel burst from box'
  },
  home: {
    id: 'home',
    name: 'Home',
    ageLabel: 'Essentials',
    description: 'Setting up a cozy household shouldn\'t cost a fortune. You\'ll typically need blankets, towels, and sheets every year. Here\'s what you save shipping Indian products with Layo.',
    items: [
      { name: 'Premium Bed Sheets & Covers', qty: 2, icon: 'single_bed' },
      { name: 'Cotton Bath Towels', qty: 4, icon: 'texture' }
    ],
    canadaCost: 180,
    indiaCost: 55,
    shippingCost: 25,
    savings: 100,
    imageUrl: '/secure-parcels-3d.png',
    imageAlt: 'Home textiles and essentials in a shipping box'
  }
};

const CONVEYOR_ITEMS = [
  { id: 'baby', name: 'Baby & Toddler', age: '(0-4 years)' },
  { id: 'kids', name: 'Kids', age: '(5-12 years)' },
  { id: 'teens', name: 'Teens', age: '(13-18 years)' },
  { id: 'home', name: 'Home', age: '(Essentials)' }
];

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  
  // Navigation & Modals state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showDraftIntercept, setShowDraftIntercept] = useState(false);
  
  // Selected category index in Section 3 (defaults to Teens in the first group, i.e., index 2)
  const [selectedConveyorIndex, setSelectedConveyorIndex] = useState<number>(2);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Ref scroll anchors
  const heroRef = useRef<HTMLDivElement>(null);
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);
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

  const handleLogoClick = (e: React.MouseEvent) => {
    const draft = localStorage.getItem('layo_anon_draft');
    if (draft && modalOpen) {
      e.preventDefault();
      setShowDraftIntercept(true);
    } else {
      scrollToSection(heroRef);
    }
  };

  const saveDraftAndClose = () => {
    setShowDraftIntercept(false);
    setModalOpen(false);
  };

  const discardAndClose = () => {
    localStorage.removeItem('layo_anon_draft');
    setShowDraftIntercept(false);
    setModalOpen(false);
  };

  // Repeated list of 4 items repeated 4 times (16 items total).
  // This allows seamless loop with translateX(-25%).
  const conveyorList = [
    ...CONVEYOR_ITEMS,
    ...CONVEYOR_ITEMS,
    ...CONVEYOR_ITEMS,
    ...CONVEYOR_ITEMS
  ];

  const activeCategory = conveyorList[selectedConveyorIndex]?.id || 'teens';
  const currentDetails = CATEGORIES_DATA[activeCategory];

  // custom SVG seal icon for savings badge
  const DollarSeal = () => (
    <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#3b4a2c] fill-current">
      <path d="M50 5 L57 16 L70 11 L71 24 L84 22 L80 35 L91 38 L83 49 L91 60 L80 63 L84 76 L71 74 L70 87 L57 82 L50 93 L43 82 L30 87 L29 74 L16 76 L20 63 L9 60 L17 49 L9 38 L20 35 L16 22 L29 24 L30 11 L43 16 Z" className="opacity-95" />
      <circle cx="50" cy="50" r="28" className="text-[#e2e8dd] fill-current" />
      <text x="50" y="58" fontSize="28" fontWeight="black" textAnchor="middle" fill="#3b4a2c">$</text>
    </svg>
  );

  return (
    <div className="bg-[#f5f2eb] text-[#2b2927] min-h-screen flex flex-col overflow-x-hidden relative">

      {/* ───────────────────────────────────────────
          PERSISTENT HEADER (Slide 1 Style Navigation)
      ─────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 w-full h-[10vh] z-[100] flex items-center justify-between px-5 md:px-12 transition-all duration-300 ${
          scrolled ? 'bg-[#f5f2eb]/90 backdrop-blur-md border-b border-black/5 shadow-md' : 'bg-transparent'
        }`}
      >
        {/* Left: Hamburger + Logo */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-10 h-10 flex items-center justify-center text-[#5c5752] hover:text-[#2b2927] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
          <div onClick={handleLogoClick} className="cursor-pointer">
            <Logo showTagline={false} />
          </div>
        </div>

        {/* Right: Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          <button
            onClick={() => scrollToSection(howItWorksRef)}
            className="text-xs font-bold tracking-widest text-[#2b2927] hover:text-primary transition-colors uppercase cursor-pointer"
          >
            How it Works
          </button>
          <button
            onClick={() => scrollToSection(pricingRef)}
            className="text-xs font-bold tracking-widest text-[#2b2927] hover:text-primary transition-colors uppercase cursor-pointer"
          >
            Shipping Policy
          </button>
          {loading ? (
            <div className="w-20 h-4 bg-black/5 rounded animate-pulse" />
          ) : user ? (
            <Link
              href="/dashboard"
              className="text-xs font-bold tracking-widest text-[#2b2927] hover:text-primary transition-colors uppercase"
            >
              My Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-xs font-bold tracking-widest text-[#2b2927] hover:text-primary transition-colors uppercase"
            >
              Sign Up / Log In
            </Link>
          )}
        </nav>
      </header>

      {/* ───────────────────────────────────────────
          LEFT SIDEBAR (Slide-out navigation menu)
      ─────────────────────────────────────────── */}
      <div
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 bg-black/40 z-[110] transition-opacity duration-300 ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-[#fcfaf7] z-[120] border-r border-black/5 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-black/5">
          <Logo showTagline={false} />
          <button onClick={() => setSidebarOpen(false)} className="text-[#5c5752] hover:text-black transition-colors cursor-pointer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="px-5 py-4 border-b border-black/5">
          {loading ? (
            <div className="h-10 bg-black/5 rounded-xl animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-primary/30 bg-[#f5f2eb] flex items-center justify-center text-primary font-bold text-sm">
                {userInitial}
              </div>
              <div>
                <p className="text-sm font-bold text-[#2b2927]">{user.user_metadata?.full_name || user.email?.split('@')[0]}</p>
                <p className="text-[10px] text-[#504130] font-bold uppercase tracking-widest">Layo Member</p>
              </div>
            </div>
          ) : (
            <Link href="/login" onClick={() => setSidebarOpen(false)} className="flex items-center gap-2 text-primary font-bold text-sm hover:underline">
              <span className="material-symbols-outlined text-base">login</span>
              Sign In / Create Account
            </Link>
          )}
        </div>

        <nav className="flex-grow px-3 py-4 space-y-1">
          <button
            onClick={() => { scrollToSection(heroRef); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#5c5752] hover:bg-black/5 hover:text-black transition-all text-sm font-semibold text-left cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg leading-none">home</span>
            Home
          </button>
          <button
            onClick={() => { scrollToSection(howItWorksRef); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#5c5752] hover:bg-black/5 hover:text-black transition-all text-sm font-semibold text-left cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg leading-none">info</span>
            How Layo Works
          </button>
          <button
            onClick={() => { scrollToSection(pricingRef); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#5c5752] hover:bg-black/5 hover:text-black transition-all text-sm font-semibold text-left cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg leading-none">calculate</span>
            Cost Estimator
          </button>
          <button
            onClick={() => { scrollToSection(contactRef); setSidebarOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#5c5752] hover:bg-black/5 hover:text-black transition-all text-sm font-semibold text-left cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg leading-none">support_agent</span>
            Contact Us
          </button>
          
          <div className="h-px bg-black/5 my-4" />
          
          {[
            { icon: 'inventory_2', label: 'My Shipments', href: '/dashboard?tab=history' },
            { icon: 'person', label: 'My Profile & Addresses', href: '/profile' },
            { icon: 'payment', label: 'Payment Methods', href: '/payments' },
          ].map(item => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#5c5752] hover:bg-black/5 hover:text-black transition-all text-sm font-semibold"
            >
              <span className="material-symbols-outlined text-lg leading-none">{item.icon}</span>
              {item.label}
            </Link>
          ))}
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
            <p className="text-[10px] text-[#5c5752] text-center px-4">Sign in to access premium options</p>
          )}
        </div>
      </aside>

      {/* ───────────────────────────────────────────
          SECTION 1: HERO SECTION (Slide 1 Top)
      ─────────────────────────────────────────── */}
      <section
        ref={heroRef}
        id="hero"
        className="min-h-screen relative flex flex-col justify-center items-center px-6 text-center pt-[10vh] overflow-hidden"
      >
        {/* Floating background shapes - Light Theme style */}
        <div className="absolute top-[20%] left-[10%] w-36 h-12 bg-white/40 border border-[#e6e1da] rounded-lg animate-float-1 pointer-events-none shadow-sm" />
        <div className="absolute top-[15%] right-[15%] w-24 h-24 bg-white/40 border border-[#e6e1da] rounded-full animate-float-2 pointer-events-none shadow-sm" />
        <div className="absolute bottom-[25%] left-[12%] w-20 h-20 bg-primary/10 border border-primary/20 rounded-full animate-float-3 pointer-events-none shadow-sm" />
        <div className="absolute bottom-[30%] right-[10%] w-44 h-16 bg-primary/10 border border-primary/20 rounded-lg animate-float-1 pointer-events-none shadow-sm" />
        <div className="absolute top-[50%] left-[45%] w-16 h-16 bg-white/40 border border-[#e6e1da] rotate-45 animate-float-2 pointer-events-none shadow-sm" />

        {/* Content Container */}
        <div className="max-w-3xl z-10 space-y-6">
          <h1 className="text-6xl md:text-8xl font-medium tracking-tight text-[#1c1917] font-serif-luxury leading-tight">
            Bringing<br />
            India Closer.
          </h1>
          <p className="text-lg md:text-xl text-[#57534e] max-w-xl mx-auto font-sans font-light leading-relaxed">
            We ship your favourite Indian buys straight to your door abroad. Packed together, priced fair & delivered fast.
          </p>
          
          <div className="pt-6">
            <button
              onClick={() => user ? router.push('/dashboard') : router.push('/signup')}
              className="px-8 py-4 bg-primary text-[#241a00] font-black text-sm uppercase tracking-widest rounded-full hover:bg-primary-fixed hover:scale-105 active:scale-98 transition-all shadow-[0_8px_30px_rgba(242,202,80,0.25)] cursor-pointer"
            >
              Start Shipping with Layo
            </button>
          </div>
        </div>

        {/* Down Arrow scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <button
            onClick={() => scrollToSection(howItWorksRef)}
            className="w-10 h-10 rounded-full border border-black/10 flex items-center justify-center text-[#5c5752] hover:text-black hover:border-black/30 transition-colors animate-bounce cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">arrow_downward</span>
          </button>
        </div>
      </section>

      {/* ───────────────────────────────────────────
          SECTION 2: HOW IT WORKS (Slide 1 Bottom)
      ─────────────────────────────────────────── */}
      <section
        ref={howItWorksRef}
        id="how-it-works"
        className="min-h-screen relative flex flex-col justify-center items-center px-6 md:px-12 py-20 bg-[#eae7de] border-y border-black/5 overflow-hidden"
      >
        {/* Floating design lines */}
        <div className="absolute top-[10%] left-[5%] w-72 h-16 bg-white/40 rotate-12 rounded pointer-events-none shadow-sm" />
        <div className="absolute bottom-[10%] right-[5%] w-96 h-24 bg-primary/10 -rotate-12 rounded pointer-events-none shadow-sm" />

        <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center z-10">
          
          {/* Isometric Open Cardboard Box Vector Drawing - Adapted for light theme */}
          <div className="flex justify-center items-center relative">
            <div className="w-full max-w-[360px] aspect-square relative text-[#2b2927] animate-float-3">
              <svg viewBox="0 0 400 400" className="w-full h-full fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {/* Back flap */}
                <path d="M 200,80 L 260,110 L 200,140 L 140,110 Z" className="opacity-25" />
                
                {/* Back box edges */}
                <path d="M 140,110 L 140,240" className="opacity-25" />
                <path d="M 260,110 L 260,240" className="opacity-25" />
                
                {/* Open Box Front/Sides */}
                <path d="M 80,180 L 200,240 L 320,180 L 200,120 Z" strokeWidth="3" />
                <path d="M 80,180 L 80,300 L 200,360 L 200,240" strokeWidth="3" />
                <path d="M 320,180 L 320,300 L 200,360" strokeWidth="3" />
                
                {/* Flaps */}
                {/* Left Flap */}
                <path d="M 80,180 L 30,130 L 150,70 L 200,120" strokeWidth="2.5" />
                {/* Right Flap */}
                <path d="M 320,180 L 370,130 L 250,70 L 200,120" strokeWidth="2.5" />
                {/* Front Left Flap hanging down */}
                <path d="M 80,180 L 40,240 L 160,300 L 200,240" strokeWidth="2" className="opacity-60" />
                {/* Front Right Flap hanging down */}
                <path d="M 320,180 L 360,240 L 240,300 L 200,240" strokeWidth="2" className="opacity-60" />

                {/* Internal dashed partition / hanger lines */}
                <line x1="200" y1="120" x2="200" y2="240" strokeDasharray="5,5" className="opacity-40" />
                <line x1="80" y1="180" x2="260" y2="180" strokeDasharray="5,5" className="opacity-20" />
                <line x1="320" y1="180" x2="140" y2="180" strokeDasharray="5,5" className="opacity-20" />

                {/* Floating packages going into box */}
                <path d="M 180,60 L 210,45 L 230,55 L 200,70 Z" className="text-primary fill-primary/10" strokeWidth="1.5" />
                <path d="M 180,60 L 180,72 L 200,82 L 200,70" className="text-[#2b2927]" strokeWidth="1.5" />
                <path d="M 230,55 L 230,67 L 200,82" className="text-[#2b2927]" strokeWidth="1.5" />
              </svg>
              
              {/* Labels with lines */}
              <div className="absolute top-[10%] left-[-10px] bg-white border border-[#e6e1da] px-3 py-1.5 rounded-lg text-xs shadow-md flex items-center gap-1.5 font-semibold text-[#2b2927]">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" /> Combine Orders
              </div>
              <div className="absolute bottom-[20%] right-[-20px] bg-white border border-[#e6e1da] px-3 py-1.5 rounded-lg text-xs shadow-md flex items-center gap-1.5 font-semibold text-[#2b2927]">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" /> Safe Locker
              </div>
            </div>
          </div>

          {/* Text and actions */}
          <div className="space-y-6">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-[#1c1917] leading-tight">
              Indian buys consolidated, packed & sent whenever you want.
            </h2>
            <p className="text-base md:text-lg text-[#5c5752] font-light leading-relaxed">
              Every order you place in India lands safely in your own Layo warehouse locker — ready to combine, pack, and send whenever you are.
            </p>
            <div className="pt-2">
              <button
                onClick={() => scrollToSection(pricingRef)}
                className="px-6 py-3.5 bg-transparent border border-black/20 hover:border-[#2b2927] text-[#2b2927] font-bold text-sm uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-2"
              >
                Show Me How
                <span className="material-symbols-outlined text-sm">arrow_downward</span>
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* ───────────────────────────────────────────
          SECTION 3: CONVEYOR BELT & CATEGORY CARDS (Slide 2 & 3)
      ─────────────────────────────────────────── */}
      <section
        ref={pricingRef}
        id="pricing"
        className="min-h-screen py-24 px-6 md:px-12 bg-[#f5f2eb] flex flex-col justify-center items-center border-b border-black/5 relative"
      >
        <div className="max-w-5xl w-full space-y-12 z-10">
          
          {/* Section Header */}
          <div className="text-center space-y-4">
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#5c5752]">Essentials Calculator</span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-[#1c1917]">
              Every stage of life has its essentials.
            </h2>
          </div>

          {/* ───────────────────────────────────────────
              CONVEYOR BELT EFFECT (Slide 2 Category Roller)
          ─────────────────────────────────────────── */}
          <div 
            className="relative w-full py-12 overflow-hidden border-y border-black/10 bg-white/35 rounded-2xl group/conveyor shadow-sm"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Play/Pause Button Overlay */}
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="absolute top-2 right-4 text-[10px] font-bold text-[#2b2927] flex items-center gap-1 bg-white border border-[#e6e1da] px-3 py-1 rounded-full z-20 hover:bg-[#faf8f5] transition-all cursor-pointer uppercase tracking-wider shadow-sm"
              title={isPaused ? "Resume Conveyor Belt" : "Pause Conveyor Belt"}
            >
              <span className="material-symbols-outlined text-xs" style={{ fontSize: 12 }}>
                {isPaused ? 'play_arrow' : 'pause'}
              </span>
              {isPaused ? 'Resume Belt' : 'Pause Belt'}
            </button>

            {/* Conveyor Belt Tracks - Light Theme style */}
            <div className="absolute top-4 left-0 w-full h-[2px] bg-black/5" />
            <div className="absolute bottom-4 left-0 w-full h-[2px] bg-black/5" />
            
            {/* Moving track of packages */}
            <div 
              className="flex w-max animate-conveyor"
              style={{
                animationPlayState: (isPaused || isHovered) ? 'paused' : 'running'
              }}
            >
              {conveyorList.map((item, idx) => {
                const isSelected = selectedConveyorIndex === idx;
                return (
                  <div
                    key={`${item.id}-${idx}`}
                    onClick={() => {
                      setSelectedConveyorIndex(idx);
                      setIsPaused(true); // Pause it on click so they can examine details
                    }}
                    className="flex flex-col items-center mx-10 cursor-pointer group select-none relative"
                  >
                    {/* Floating Speech Popup above the box */}
                    <div className={`mb-3 px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-300 ${
                      isSelected 
                        ? 'bg-primary text-[#241a00] shadow-md scale-105 border border-primary/20' 
                        : 'bg-white text-[#2b2927] border border-[#e6e1da] shadow-sm group-hover:border-primary/50'
                    }`}>
                      {item.name} <span className="opacity-70 text-[10px] font-normal">{item.age}</span>
                    </div>
                    {/* Little triangle for speech popup */}
                    <div className={`w-2 h-2 rotate-45 -mt-4 mb-2 transition-all duration-300 ${
                      isSelected ? 'bg-primary' : 'bg-white border-r border-b border-[#e6e1da]'
                    }`} />

                    {/* Industrial Rollers / Conveyor Box Icon */}
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center border transition-all duration-300 relative ${
                      isSelected 
                        ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(242,202,80,0.15)] scale-110' 
                        : 'bg-[#faf8f5] border-[#e6e1da] group-hover:border-primary/30 group-hover:bg-[#ffffff]'
                    }`}>
                      {/* Box silhouette or standard icon */}
                      <span className={`material-symbols-outlined text-3xl transition-colors ${
                        isSelected ? 'text-primary' : 'text-[#888] group-hover:text-primary/70'
                      }`}>
                        inventory_2
                      </span>
                      {/* Small scanner laser light when active */}
                      {isSelected && (
                        <div className="absolute top-1/2 left-0 w-full h-[2px] bg-primary animate-pulse" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Visual Rotating Gears/Pulleys Under the Conveyor Belt */}
            <div className="absolute bottom-1 left-0 w-full overflow-hidden h-4 flex justify-around px-4 pointer-events-none select-none opacity-20">
              {Array.from({ length: 15 }).map((_, i) => (
                <span
                  key={i}
                  className="material-symbols-outlined text-[10px] text-[#2b2927] animate-spin"
                  style={{
                    animationDuration: '3s',
                    animationPlayState: (isPaused || isHovered) ? 'paused' : 'running',
                    animationTimingFunction: 'linear'
                  }}
                >
                  settings
                </span>
              ))}
            </div>

          </div>

          {/* ───────────────────────────────────────────
              STOCKED CATEGORY DETAILS CARD (Slide 3)
          ─────────────────────────────────────────── */}
          <div className="flex items-stretch w-full gap-2">
            
            {/* Left side vertical stack tracker indicators (Slide 3 Left margin) */}
            <div className="hidden md:flex flex-col items-center gap-3 mr-6 justify-center select-none">
              {['baby', 'kids', 'teens', 'home'].map((catId, index) => {
                const isCurrent = activeCategory === catId;
                return (
                  <button
                    key={catId}
                    onClick={() => {
                      const listIndex = CONVEYOR_ITEMS.findIndex(c => c.id === catId);
                      setSelectedConveyorIndex(listIndex);
                      setIsPaused(true);
                    }}
                    className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      isCurrent ? 'h-8 bg-[#5c5752]' : 'bg-[#e5e0d8] hover:bg-[#b0aaa2]'
                    }`}
                    title={`View ${catId} details`}
                  />
                );
              })}
            </div>

            {/* Card stack with offset backsheets */}
            <div className="flex-1 relative">
              {/* Stack effect card sheets */}
              <div className="absolute top-[-16px] left-[2%] right-[2%] h-12 bg-white/60 border border-[#e5e0d8] rounded-t-3xl shadow-sm z-0 pointer-events-none" />
              <div className="absolute top-[-8px] left-[1%] right-[1%] h-12 bg-white/80 border border-[#e5e0d8] rounded-t-3xl shadow-sm z-0 pointer-events-none" />

              {/* Main Active Card */}
              <div 
                className="relative bg-white border border-[#e5e0d8] rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[480px] shadow-lg z-10 transition-all duration-500 animate-fade-in" 
                key={activeCategory}
              >
                
                {/* Left Content Column (7 cols) */}
                <div className="lg:col-span-7 p-8 md:p-12 flex flex-col justify-between space-y-8">
                  
                  {/* Card Header details */}
                  <div className="space-y-4">
                    {/* Header Package Badge + Title */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#f0e9df] flex items-center justify-center text-[#504130] select-none">
                        <span className="material-symbols-outlined text-xl">inventory_2</span>
                      </div>
                      <h3 className="text-3xl font-extrabold text-[#2b2927]">
                        {currentDetails.name} <span className="text-xl font-normal text-[#5c5752]">({currentDetails.ageLabel})</span>
                      </h3>
                    </div>

                    {/* Description Paragraph */}
                    <p className="text-sm md:text-base text-[#5c5752] leading-relaxed font-light">
                      {currentDetails.description}
                    </p>

                    <div className="border-t border-[#e5e0d8] my-4" />

                    {/* Replacement list formatting matching the slide style list */}
                    <div className="space-y-3 font-sans">
                      {currentDetails.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm text-[#2b2927]">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#5c5752] text-lg select-none">{item.icon}</span>
                            <span>{item.name}</span>
                          </div>
                          <span className="font-extrabold font-mono text-[#2b2927]">×{item.qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Costing comparison table and SAVINGS block */}
                  <div className="space-y-5">
                    <div className="grid grid-cols-3 gap-2 border-t border-[#e5e0d8] pt-5">
                      
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-[#5c5752] uppercase tracking-wider block leading-tight">Canada Mall Cost</span>
                        <span className="text-base font-extrabold text-[#5c5752]/60 line-through font-mono">${currentDetails.canadaCost} CAD</span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-[#2b2927] uppercase tracking-wider block leading-tight">Indian Price</span>
                        <span className="text-base font-extrabold text-[#2b2927] font-mono">${currentDetails.indiaCost} CAD</span>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider block leading-tight">+ Ship With Layo</span>
                        <span className="text-base font-extrabold text-[#2b2927] font-mono">${currentDetails.shippingCost} CAD</span>
                      </div>

                    </div>

                    {/* YOU SAVE soft green banner with Dollar Seal matching the slide */}
                    <div className="bg-[#e2e8dd] border border-[#cedbc2] rounded-2xl p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <DollarSeal />
                        <div>
                          <span className="text-[10px] font-extrabold text-[#3b4a2c] uppercase tracking-wider block leading-none">You Save</span>
                          <h4 className="text-2xl font-black text-[#3b4a2c] leading-tight">
                            ${currentDetails.savings} <span className="text-sm font-bold opacity-80">WITH LAYO</span>
                          </h4>
                        </div>
                      </div>
                      <button
                        onClick={() => user ? router.push('/dashboard') : router.push('/signup')}
                        className="px-5 py-2.5 bg-[#3b4a2c] hover:bg-[#2d3a22] text-[#e2e8dd] text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer whitespace-nowrap"
                      >
                        Send My Orders Here
                      </button>
                    </div>
                  </div>

                  {/* Disclaimer block */}
                  <p className="text-[9px] text-[#5c5752]/70 leading-relaxed italic">
                    *Disclaimer: Layo is a shipping forwarder, not a retailer. Prices are estimates showing typical savings when you shop your favorite Indian brands and ship with us.
                  </p>
                </div>

                {/* Right Image Column (5 cols) - Styled with light layout and warm pastel shapes behind */}
                <div className="lg:col-span-5 bg-[#eae7de] border-l border-[#e5e0d8] relative min-h-[300px] flex items-center justify-center p-8 overflow-hidden select-none">
                  
                  {/* Pastel Blobs/Shapes behind the box matching the slide */}
                  <div className="absolute top-[10%] left-[20%] w-32 h-32 bg-[#f6ecd2] rounded-full filter blur-2xl opacity-60 pointer-events-none" />
                  <div className="absolute bottom-[20%] right-[15%] w-36 h-36 bg-[#e2e3f5] rounded-full filter blur-2xl opacity-60 pointer-events-none" />
                  
                  {/* Displaying corresponding category image from public directory */}
                  <div className="w-full max-w-[280px] aspect-square relative z-10 flex items-center justify-center">
                    <img
                      src={currentDetails.imageUrl}
                      alt={currentDetails.imageAlt}
                      className="max-w-full max-h-full object-contain rounded-2xl drop-shadow-[0_10px_20px_rgba(92,87,82,0.15)] transform hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Image style reference label */}
                  <div className="absolute bottom-4 right-4 bg-white border border-[#e6e1da] px-3 py-1.5 rounded-lg text-[9px] font-bold text-[#5c5752] tracking-wider uppercase shadow-sm">
                    {currentDetails.id === 'teens' && 'Dynamic product burst'}
                    {currentDetails.id === 'baby' && 'Daily essentials'}
                    {currentDetails.id === 'kids' && 'Daily essentials'}
                    {currentDetails.id === 'home' && 'Seasonal essentials'}
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Category Bottom Sub-actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4 border-t border-black/10">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#5c5752] text-2xl">trending_down</span>
              <span className="text-sm font-semibold text-[#2b2927]">
                Save upto <span className="text-primary text-base font-black">40%</span> when you ship with Layo.
              </span>
            </div>

            <div className="flex gap-4 w-full sm:w-auto">
              <button
                onClick={() => setModalOpen(true)}
                className="flex-1 sm:flex-none px-6 py-3.5 bg-white border border-[#e6e1da] hover:border-primary/50 text-[#2b2927] font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Calculate Shipping
              </button>
              <button
                onClick={() => scrollToSection(howItWorksRef)}
                className="flex-1 sm:flex-none px-6 py-3.5 bg-transparent text-[#5c5752] hover:text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Know More
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* ───────────────────────────────────────────
          SECTION 4: CONTACT & SUPPORT (Slide 4) - Adapted for warm-light layout
      ─────────────────────────────────────────── */}
      <section
        ref={contactRef}
        id="contact"
        className="min-h-[85vh] py-24 px-6 md:px-12 bg-[#eae7de] border-t border-black/5 flex flex-col justify-between"
      >
        <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Grid: Heading & Links (8 cols) */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* Section Header */}
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#5c5752]">Get In Touch</span>
              <h2 className="text-4xl md:text-6xl font-bold text-[#1c1917] mt-2 font-serif-luxury">
                We're here for you!
              </h2>
            </div>

            {/* Quick Links, Support, Legal Blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              
              {/* Quick Links Column */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-[#2b2927] uppercase tracking-wider border-b border-black/10 pb-2">Quick Links</h4>
                <ul className="space-y-2">
                  {[
                    { label: 'About Layo', action: () => scrollToSection(heroRef) },
                    { label: 'How It Works', action: () => scrollToSection(howItWorksRef) },
                    { label: 'Pricing & Savings', action: () => scrollToSection(pricingRef) },
                    { label: 'Shipping Calculator', action: () => setModalOpen(true) },
                    { label: 'Track Shipment', action: () => router.push('/dashboard') }
                  ].map((link, idx) => (
                    <li key={idx}>
                      <button
                        onClick={link.action}
                        className="text-xs text-[#5c5752] hover:text-[#2b2927] transition-colors cursor-pointer text-left"
                      >
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Support Column */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-[#2b2927] uppercase tracking-wider border-b border-black/10 pb-2">Support</h4>
                <ul className="space-y-2">
                  {[
                    { label: 'Help Centre', action: () => router.push('/dashboard') },
                    { label: 'FAQs', action: () => scrollToSection(howItWorksRef) },
                    { label: 'Shipping Policies', action: () => scrollToSection(pricingRef) }
                  ].map((link, idx) => (
                    <li key={idx}>
                      <button
                        onClick={link.action}
                        className="text-xs text-[#5c5752] hover:text-[#2b2927] transition-colors cursor-pointer text-left"
                      >
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Legal & Social Column */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-[#2b2927] uppercase tracking-wider border-b border-black/10 pb-2">Legal</h4>
                  <ul className="space-y-2">
                    {['Privacy Policy', 'Terms & Conditions', 'Refund Policy'].map((legalLabel, idx) => (
                      <li key={idx}>
                        <button
                          onClick={() => scrollToSection(pricingRef)}
                          className="text-xs text-[#5c5752] hover:text-[#2b2927] transition-colors cursor-pointer text-left"
                        >
                          {legalLabel}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Follow Us Circles */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#2b2927] uppercase tracking-wider">Follow Us</h4>
                  <div className="flex gap-3">
                    {['facebook', 'instagram', 'twitter'].map((social, idx) => (
                      <a
                        key={idx}
                        href={`https://${social}.com`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-full bg-white border border-[#e6e1da] hover:border-primary/50 hover:text-primary flex items-center justify-center transition-all cursor-pointer shadow-sm text-[#5c5752]"
                        title={social}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {social === 'facebook' && 'share'}
                          {social === 'instagram' && 'photo_camera'}
                          {social === 'twitter' && 'alternate_email'}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* Right Card: Contact Us (4 cols) */}
          <div className="lg:col-span-4 bg-white border border-[#e5e0d8] rounded-2xl p-6 space-y-6 shadow-md text-[#2b2927]">
            <h4 className="text-lg font-bold text-[#2b2927] border-b border-black/5 pb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">contact_support</span>
              Contact Us
            </h4>
            
            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#5c5752] uppercase tracking-wider block">Email</span>
                <a href="mailto:support@layo.com" className="text-primary hover:underline">support@layo.com</a>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#5c5752] uppercase tracking-wider block">Phone number</span>
                <p className="text-[#2b2927] font-medium">+1 (800) 555-LAYO</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#5c5752] uppercase tracking-wider block">Business hours</span>
                <p className="text-[#2b2927] font-medium">Monday – Friday: 9 AM – 6 PM EST</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#5c5752] uppercase tracking-wider block">Address</span>
                <p className="text-[#5c5752] leading-relaxed">
                  Layo Technologies Inc.,<br />
                  100 Bay Street, Suite 400,<br />
                  Toronto, ON, M5J 2R8, Canada
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Brand Banner */}
        <div className="max-w-5xl w-full mx-auto border-t border-black/10 pt-8 mt-16 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <h3 className="text-2xl font-bold tracking-tight text-[#2b2927] font-serif-luxury leading-none">
              Indian shipping made easy.
            </h3>
            {/* Layo logo circle */}
            <div className="w-10 h-10 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center text-primary font-bold text-sm select-none">
              L
            </div>
          </div>
          
          <p className="text-[10px] text-[#5c5752]/70">
            © 2026 Layo. All rights reserved.
          </p>
        </div>
      </section>

      {/* ───────────────────────────────────────────
          ESTIMATOR MODAL
      ─────────────────────────────────────────── */}
      <EstimatorModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      {/* ───────────────────────────────────────────
          DRAFT INTERCEPT MODAL
      ─────────────────────────────────────────── */}
      {showDraftIntercept && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[300] flex items-center justify-center p-6">
          <div className="bg-white border border-[#e5e0d8] rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-[#2b2927]">Save Your Progress?</h3>
            <p className="text-xs text-[#5c5752] leading-relaxed">
              You haven't finished booking. Save these details as a draft?
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={saveDraftAndClose}
                className="w-full py-3 bg-primary text-[#241a00] font-bold text-xs uppercase tracking-widest rounded-xl hover:brightness-110 transition-all cursor-pointer"
              >
                Save to Drafts
              </button>
              <button
                onClick={discardAndClose}
                className="w-full py-3 border border-[#e5e0d8] text-[#5c5752] text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-black/5 transition-all cursor-pointer"
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
