'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import SmartHaulCard from '@/components/SmartHaulCard';
import EstimatorModal from '@/components/EstimatorModal';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';
import { loadHaulCards, HaulCard } from '@/lib/haul-cards';

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [cards, setCards] = useState<HaulCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showDraftIntercept, setShowDraftIntercept] = useState(false);

  useEffect(() => {
    setCards(loadHaulCards().filter(c => c.status === 'active'));
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const userInitial = user
    ? (user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U').toUpperCase()
    : null;

  const handleLogoClick = (e: React.MouseEvent) => {
    const draft = localStorage.getItem('layo_anon_draft');
    if (draft && modalOpen) {
      e.preventDefault();
      setShowDraftIntercept(true);
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

  return (
    <div className="bg-[#131313] text-on-background min-h-screen flex flex-col overflow-x-hidden">

      {/* ───────────────────────────────────────────
          ZONE A · Minimal Header (fixed, top 10vh)
      ─────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 w-full h-[10vh] z-[100] flex items-center justify-between px-5 md:px-8 transition-all duration-300 ${
          scrolled ? 'bg-[#131313]/95 backdrop-blur-md border-b border-white/10 shadow-xl' : 'bg-transparent'
        }`}
      >
        {/* Left: Hamburger */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>

        {/* Centre: Logo */}
        <div onClick={handleLogoClick} className="cursor-pointer">
          <Logo showTagline={false} />
        </div>

        {/* Right: Shipping box + bell */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => router.push('/dashboard')}
            title="My Shipments"
            className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors relative"
          >
            <span className="material-symbols-outlined text-2xl">package_2</span>
          </button>
          <button className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors relative">
            <span className="material-symbols-outlined text-2xl">notifications</span>
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary" />
          </button>
        </div>
      </header>

      {/* ───────────────────────────────────────────
          Left Sidebar (slide-out)
      ─────────────────────────────────────────── */}
      {/* Backdrop */}
      <div
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 bg-black/60 z-[110] transition-opacity duration-300 ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-[#1a1a1a] z-[120] border-r border-white/10 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <Logo showTagline={false} />
          <button onClick={() => setSidebarOpen(false)} className="text-on-surface-variant hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* User identity */}
        <div className="px-5 py-4 border-b border-white/5">
          {loading ? (
            <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-primary/30 bg-surface-container flex items-center justify-center text-primary font-bold text-sm">
                {userInitial}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{user.user_metadata?.full_name || user.email?.split('@')[0]}</p>
                <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Platinum Member</p>
              </div>
            </div>
          ) : (
            <Link href="/login" onClick={() => setSidebarOpen(false)} className="flex items-center gap-2 text-primary font-bold text-sm hover:underline">
              <span className="material-symbols-outlined text-base">login</span>
              Sign In / Create Account
            </Link>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-grow px-3 py-4 space-y-1">
          {[
            { icon: 'inventory_2', label: 'My Shipments', href: '/dashboard?tab=history' },
            { icon: 'person', label: 'My Profile & Addresses', href: '/profile' },
            { icon: 'payment', label: 'Payment Methods', href: '/payments' },
            { icon: 'lightbulb', label: 'The Layo Logic', href: '/layo-logic' },
            { icon: 'support_agent', label: 'Contact Us', href: '/contact' },
          ].map(item => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-on-surface-variant hover:bg-white/5 hover:text-white transition-all text-sm font-semibold"
            >
              <span className="material-symbols-outlined text-lg leading-none">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-3 pb-6 border-t border-white/5 pt-4">
          {user ? (
            <button
              onClick={() => { supabase.auth.signOut(); setSidebarOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all w-full text-sm font-semibold"
            >
              <span className="material-symbols-outlined text-lg leading-none">logout</span>
              Settings / Log Out
            </button>
          ) : (
            <p className="text-[10px] text-on-surface-variant text-center px-4">Sign in to access your shipments</p>
          )}
        </div>
      </aside>

      {/* ───────────────────────────────────────────
          ZONE B · Discovery Feed (middle 75%)
          pt-[10vh] pb-[15vh] for header/footer
      ─────────────────────────────────────────── */}
      <main className="flex-grow pt-[10vh] pb-[18vh]">

        {/* ── Level 1: The Hook ── */}
        <section className="px-6 md:px-10 pt-10 pb-6">
          <h1
            className="text-[38px] md:text-[54px] font-bold leading-none text-white mb-6"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            Buy Indian.<br />
            <span className="text-primary">Ship Smart.</span>
          </h1>
          {/* Quick-stat row */}
          <div className="flex gap-5 flex-wrap">
            {[
              { value: '↓70%', label: 'vs Canada retail' },
              { value: '$12', label: 'per kg to Canada' },
              { value: '30d', label: 'free hold & combine' },
            ].map(stat => (
              <div key={stat.label} className="flex flex-col">
                <span className="text-[22px] font-black text-primary leading-none">{stat.value}</span>
                <span className="text-[11px] text-on-surface-variant font-semibold mt-0.5">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Level 2: The Proof (Smart Haul Carousel) ── */}
        {cards.length > 0 && (() => {
          const activeIdx = cards.findIndex(c => c.id === (selectedCardId ?? cards[0].id));
          const nextIdx   = (activeIdx + 1) % cards.length;
          const prevIdx   = (activeIdx - 1 + cards.length) % cards.length;
          return (
            <section className="pb-4 px-4 sm:px-6">
              <div className="flex items-center gap-3">
                {/* Prev */}
                <button
                  onClick={() => setSelectedCardId(cards[prevIdx].id)}
                  className="flex-shrink-0 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center transition-all"
                >
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>chevron_left</span>
                </button>

                {/* Cards: 1 on mobile, 2 on sm+, 3 on lg+ */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <SmartHaulCard
                    key={cards[activeIdx].id}
                    card={cards[activeIdx]}
                    selected={true}
                    onSelect={() => {}}
                  />
                  <div className="hidden sm:block">
                    <SmartHaulCard
                      key={cards[nextIdx].id + '-2'}
                      card={cards[nextIdx]}
                      selected={false}
                      onSelect={() => setSelectedCardId(cards[nextIdx].id)}
                    />
                  </div>
                  <div className="hidden lg:block">
                    <SmartHaulCard
                      key={cards[(nextIdx + 1) % cards.length].id + '-3'}
                      card={cards[(nextIdx + 1) % cards.length]}
                      selected={false}
                      onSelect={() => setSelectedCardId(cards[(nextIdx + 1) % cards.length].id)}
                    />
                  </div>
                </div>

                {/* Next */}
                <button
                  onClick={() => setSelectedCardId(cards[nextIdx].id)}
                  className="flex-shrink-0 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center transition-all"
                >
                  <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>chevron_right</span>
                </button>
              </div>

              {/* Dot indicators */}
              <div className="flex justify-center gap-2 mt-4">
                {cards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => setSelectedCardId(card.id)}
                    className={`rounded-full transition-all duration-300 ${card.id === cards[activeIdx].id ? 'w-5 h-2 bg-primary' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`}
                  />
                ))}
              </div>
            </section>
          );
        })()}

      </main>

      {/* ───────────────────────────────────────────
          ZONE C · Sticky Action Bar (bottom 15%)
      ─────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 w-full z-50 px-5 py-4 bg-gradient-to-t from-[#131313] via-[#131313]/95 to-transparent pt-8">
        <div className="flex gap-3 max-w-lg mx-auto">
          {/* Calculate — opens estimator */}
          <button
            onClick={() => setModalOpen(true)}
            className="flex-1 flex items-center justify-center gap-2 bg-white/8 border border-white/15 text-white font-bold text-sm uppercase tracking-widest py-4 rounded-2xl hover:bg-white/12 active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined text-xl leading-none text-primary">calculate</span>
            Calculate
          </button>

          {/* Start Shipping — goes to dashboard */}
          <button
            onClick={() => user ? router.push('/dashboard') : router.push('/signup')}
            className="flex-[2] flex items-center justify-center gap-2 bg-primary text-background font-bold text-sm uppercase tracking-widest py-4 rounded-2xl hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_8px_30px_rgba(242,202,80,0.35)]"
          >
            <span className="material-symbols-outlined text-xl leading-none">local_shipping</span>
            Start Shipping
          </button>
        </div>
      </div>

      {/* ── Estimator Modal ── */}
      <EstimatorModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      {/* ── Draft Intercept Modal ── */}
      {showDraftIntercept && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[300] flex items-center justify-center p-6">
          <div className="bg-[#1a1a1a] border border-white/15 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Save Your Progress?</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              You haven't finished booking. Save these details as a draft?
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={saveDraftAndClose}
                className="w-full py-3 bg-primary text-background font-bold text-xs uppercase tracking-widest rounded-xl hover:brightness-110 transition-all"
              >
                Save to Drafts
              </button>
              <button
                onClick={discardAndClose}
                className="w-full py-3 border border-white/15 text-on-surface-variant text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-white/5 transition-all"
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
