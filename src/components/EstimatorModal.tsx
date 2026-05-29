'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

/* ── Weight matrix ── */
const CATEGORIES = [
  { id: 'clothing', label: 'Clothing',       icon: 'checkroom',   hasAge: true  },
  { id: 'footwear', label: 'Footwear',       icon: 'steps',       hasAge: true  },
  { id: 'bags',     label: 'Bags',           icon: 'work',        hasAge: false },
  { id: 'jewelry',  label: 'Jewelry',        icon: 'diamond',     hasAge: false },
  { id: 'beauty',   label: 'Beauty',         icon: 'face_3',      hasAge: false },
  { id: 'home',     label: 'Home',           icon: 'home',        hasAge: false },
  { id: 'toys',     label: 'Toys',           icon: 'smart_toy',   hasAge: false },
  { id: 'books',    label: 'Books',          icon: 'menu_book',   hasAge: false },
  { id: 'food',     label: 'Food',           icon: 'restaurant',  hasAge: false },
];

const ITEM_TYPES: Record<string, { id: string; label: string; subtext: string; weight: number; isPromo?: boolean; isOversized?: boolean; isFood?: boolean }[]> = {
  clothing: [
    { id: 'light_top',    label: 'Light Topwear',        subtext: 'T-shirts, Shirts, Kurtis',              weight: 200  },
    { id: 'heavy_top',    label: 'Heavy Outerwear',       subtext: 'Jackets, Sweaters, Coats',              weight: 900  },
    { id: 'light_bot',    label: 'Light Bottoms',         subtext: 'Shorts, Leggings, Light Pajamas',       weight: 250  },
    { id: 'heavy_bot',    label: 'Heavy Bottoms',         subtext: 'Jeans, Trousers, Joggers',              weight: 500  },
    { id: 'light_dress',  label: 'Light Dresses & Sets',  subtext: 'Casual Dresses, Rompers, Co-ords',      weight: 400  },
    { id: 'heavy_eth',    label: 'Heavy Ethnic & Party',  subtext: 'Lehengas, Bridal Sarees, Gowns',        weight: 1000 },
    { id: 'heavy_win',    label: 'Heavy Winter Sets',     subtext: 'Tracksuits, Snowsuits',                 weight: 1300 },
    { id: 'accessories',  label: 'Small Cloth Acc.',      subtext: 'Socks, Innerwear, Ties',                weight: 0,   isPromo: true  },
  ],
  footwear: [
    { id: 'light_shoe',   label: 'Light Footwear',        subtext: 'Flip-Flops, Flats, Sandals',           weight: 400  },
    { id: 'heavy_shoe',   label: 'Heavy Footwear',        subtext: 'Sneakers, Boots, Leather Shoes',        weight: 1000 },
  ],
  bags: [
    { id: 'small_bag',    label: 'Small Bags & Wallets',  subtext: 'Wallets, Clutches, Sling Bags',         weight: 300  },
    { id: 'medium_bag',   label: 'Medium / Heavy Bags',   subtext: 'Backpacks, Tote Bags, Duffle',          weight: 800  },
    { id: 'luggage',      label: 'Luggage / Trolleys',    subtext: 'Suitcases, Cabin Bags',                 weight: 3000, isOversized: true },
  ],
  jewelry: [
    { id: 'light_jwl',   label: 'Light Jewelry',          subtext: 'Earrings, Rings, Chains',              weight: 0,   isPromo: true  },
    { id: 'struct_acc',  label: 'Structured Accessories', subtext: 'Watches, Sunglasses, Belts',            weight: 200  },
  ],
  beauty: [
    { id: 'light_cos',   label: 'Light Cosmetics',        subtext: 'Lipsticks, Brushes, Serums',           weight: 80   },
    { id: 'heavy_bath',  label: 'Heavy Bath & Body',      subtext: 'Shampoo, Perfumes, Lotions',            weight: 400  },
  ],
  home: [
    { id: 'light_kit',      label: 'Light Utensils',          subtext: 'Cutlery, Small Bowls',              weight: 400  },
    { id: 'soft_tex',       label: 'Soft Home Textiles',      subtext: 'Bedsheets, Blankets, Towels',       weight: 1000 },
    { id: 'std_cook',       label: 'Cookware & Decor',        subtext: 'Dinner Plates, Pans, Lamps',        weight: 1500 },
    { id: 'heavy_kit',      label: 'Heavy Kitchenware',       subtext: 'Pressure Cookers, Grinders',        weight: 3000 },
    { id: 'oversized_home', label: 'Oversized Home Goods',    subtext: 'Carpets, Floor Lamps, Mirrors',     weight: 5000, isOversized: true },
  ],
  toys: [
    { id: 'small_toy',     label: 'Small Toys',            subtext: 'Action Figures, Plushies',             weight: 300  },
    { id: 'std_toy',       label: 'Boxed Toys',            subtext: 'Board Games, LEGO, RC Cars',           weight: 1200 },
    { id: 'heavy_toy',     label: 'Heavy / Wooden Toys',   subtext: 'Wooden Trains, Large Puzzles',         weight: 2500 },
    { id: 'oversized_toy', label: 'Oversized Toys',        subtext: 'Play Tents, Baby Walkers',             weight: 5000, isOversized: true },
  ],
  books: [
    { id: 'docs',       label: 'Documents & Papers',       subtext: 'Certificates, Planners',               weight: 200  },
    { id: 'light_book', label: 'Light Books',              subtext: 'Paperbacks, Magazines',                weight: 400  },
    { id: 'std_book',   label: 'Hardcovers',               subtext: 'Novels, Cookbooks, Biographies',       weight: 1000 },
    { id: 'heavy_book', label: 'Heavy Books',              subtext: 'Textbooks, Coffee Table Books',         weight: 2500 },
  ],
  food: [
    { id: 'light_snack', label: 'Light Snacks & Spices',   subtext: 'Namkeen, Masalas, Tea, Coffee',        weight: 500, isFood: true },
    { id: 'heavy_groc',  label: 'Sweets & Groceries',      subtext: 'Mithai, Pickles, Lentils',             weight: 1500, isFood: true },
  ],
};

const AGE_MULTIPLIERS: Record<string, number> = {
  'Baby/Toddler (0–4)':    0.4,
  'Growing Kids (5–12)':   0.7,
  'Teens (11–17)':         0.9,
  'Adults (18+)':          1.0,
};
const AGE_OPTIONS = Object.keys(AGE_MULTIPLIERS);

const SHIPPING_BASE    = 12;
const SHIPPING_PER_KG  = 12;
const WEIGHT_FLOOR     = 500;
const INR_TO_CAD       = 0.016;
const CANADA_MULT      = 2.2;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function EstimatorModal({ isOpen, onClose }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const contentRef = useRef<HTMLDivElement>(null);

  /* ── Origin ── */
  const [origin, setOrigin] = useState<'online' | 'personal'>('online');
  const [storeName, setStoreName]     = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [senderName, setSenderName]   = useState('');

  /* ── Item quantities: key = `${catId}-${typeIdx}-${ageGroup}` ── */
  const [qtys, setQtys]           = useState<Record<string, number>>({});
  /* ── Active age tab per category ── */
  const [ageGroups, setAgeGroups] = useState<Record<string, string>>({});
  /* ── Expanded category panels ── */
  const [openCats, setOpenCats]   = useState<string[]>([]);

  /* ── Booking state ── */
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [promoOnlyError,  setPromoOnlyError]  = useState(false);

  /* ── Restore draft on open ── */
  useEffect(() => {
    if (!isOpen) return;
    const saved = localStorage.getItem('layo_anon_draft');
    if (!saved) return;
    try {
      const d = JSON.parse(saved);
      if (d.origin)      setOrigin(d.origin);
      if (d.storeName)   setStoreName(d.storeName);
      if (d.orderNumber) setOrderNumber(d.orderNumber);
      if (d.senderName)  setSenderName(d.senderName);
      if (d.qtys)        setQtys(d.qtys);
      if (d.ageGroups)   setAgeGroups(d.ageGroups);
    } catch { /* ignore */ }
  }, [isOpen]);

  /* ── Persist draft ── */
  useEffect(() => {
    const totalQty = Object.values(qtys).reduce((s, n) => s + n, 0);
    if (totalQty > 0 || storeName || senderName) {
      localStorage.setItem('layo_anon_draft', JSON.stringify({ origin, storeName, orderNumber, senderName, qtys, ageGroups }));
    }
  }, [origin, storeName, orderNumber, senderName, qtys, ageGroups]);

  /* ── Close: reset state and clear draft ── */
  const handleClose = () => {
    setQtys({});
    setAgeGroups({});
    setOpenCats([]);
    setOrigin('online');
    setStoreName('');
    setOrderNumber('');
    setSenderName('');
    setShowLoginPrompt(false);
    setPromoOnlyError(false);
    localStorage.removeItem('layo_anon_draft');
    onClose();
  };

  /* ── Helpers ── */
  // key already includes age: `${catId}-${typeIdx}-${age}`
  const changeQty = (key: string, delta: number) =>
    setQtys(prev => ({ ...prev, [key]: Math.max(0, (prev[key] ?? 0) + delta) }));

  const toggleCat = (catId: string) =>
    setOpenCats(prev => prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]);

  // Count all items across all age groups for a category
  const catItemCount = (catId: string) =>
    Object.entries(qtys)
      .filter(([k, v]) => k.startsWith(catId + '-') && v > 0)
      .reduce((s, [, v]) => s + v, 0);

  const totalItemCount = useMemo(
    () => Object.values(qtys).reduce((s, n) => s + n, 0),
    [qtys]
  );

  /* ── Calculation — iterate per age group per category ── */
  const calc = useMemo(() => {
    const promoCount: Record<string, number> = {};
    let totalWeight = 0;
    let hasNonPromo = false;

    // First pass: detect if any non-promo items exist
    CATEGORIES.forEach(cat => {
      const suffixes = cat.hasAge ? AGE_OPTIONS : ['default'];
      ITEM_TYPES[cat.id].forEach((type, idx) => {
        suffixes.forEach(sfx => {
          const qty = qtys[`${cat.id}-${idx}-${sfx}`] ?? 0;
          if (qty > 0 && !type.isPromo) hasNonPromo = true;
        });
      });
    });

    // Second pass: calculate weight per age group
    CATEGORIES.forEach(cat => {
      const suffixes = cat.hasAge ? AGE_OPTIONS : ['default'];
      ITEM_TYPES[cat.id].forEach((type, idx) => {
        suffixes.forEach(sfx => {
          const qty = qtys[`${cat.id}-${idx}-${sfx}`] ?? 0;
          if (qty <= 0) return;
          const mult = cat.hasAge ? (AGE_MULTIPLIERS[sfx] ?? 1.0) : 1.0;
          for (let i = 0; i < qty; i++) {
            if (type.isPromo) {
              if (hasNonPromo) {
                promoCount[type.id] = (promoCount[type.id] || 0) + 1;
                if (promoCount[type.id] > 5) totalWeight += 50;
              } else {
                totalWeight += 50;
              }
            } else {
              totalWeight += Math.round(type.weight * mult);
            }
          }
        });
      });
    });

    const effectiveWeight = Math.max(totalWeight, totalItemCount > 0 ? WEIGHT_FLOOR : 0);
    const shipping = effectiveWeight > 0 ? SHIPPING_BASE + (effectiveWeight / 1000) * SHIPPING_PER_KG : 0;

    return { totalWeight, effectiveWeight, shipping, netSavings: 0, hasNonPromo };
  }, [qtys, totalItemCount]);

  /* ── Warnings ── */
  const warnings = useMemo(() => {
    const list: string[] = [];
    CATEGORIES.forEach(cat => {
      ITEM_TYPES[cat.id].forEach((type, idx) => {
        const suffixes = cat.hasAge ? AGE_OPTIONS : ['default'];
        const totalQty = suffixes.reduce((s, sfx) => s + (qtys[`${cat.id}-${idx}-${sfx}`] ?? 0), 0);
        if (totalQty <= 0) return;
        if (type.isOversized) list.push(`Oversized: ${type.label} — volumetric check required.`);
        if (type.isFood)      list.push(`Food: ${type.label} — ship sealed commercial goods only.`);
      });
    });
    return list;
  }, [qtys]);

  const handleProceed = () => {
    if (totalItemCount > 0 && !calc.hasNonPromo) { setPromoOnlyError(true); return; }
    if (!user) { setShowLoginPrompt(true); return; }
    localStorage.setItem('layo_pending_shipment_draft', JSON.stringify({ origin, storeName, orderNumber, senderName, qtys, ageGroups, estimatedWeight: calc.effectiveWeight, estimatedCost: calc.shipping }));
    onClose();
    router.push('/dashboard');
  };

  const handlePaste = async () => {
    try { setOrderNumber(await navigator.clipboard.readText()); } catch { /* ignore */ }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative bg-[#131313] rounded-t-2xl border-t border-white/10 w-full max-w-2xl mx-auto flex flex-col" style={{ maxHeight: '92vh' }}>
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mt-3 mb-1 flex-shrink-0" />

        {/* Header */}
        <div className="flex justify-between items-center px-5 py-3 border-b border-white/10 flex-shrink-0">
          <div>
            <h2 className="font-bold text-base text-white">Build Your Layo Box</h2>
            <p className="text-[10px] text-on-surface-variant">Get an instant shipping estimate</p>
          </div>
          <button onClick={handleClose} className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-on-surface-variant hover:text-white transition-all">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Scrollable content */}
        <div ref={contentRef} className="overflow-y-auto flex-grow px-5 py-4 space-y-5">

          {/* ── Origin ── */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Where are your items coming from?</p>
            <div className="grid grid-cols-2 gap-3">
              {(['online', 'personal'] as const).map(o => (
                <button
                  key={o}
                  onClick={() => setOrigin(o)}
                  className={`p-3 rounded-xl border text-left text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2 ${
                    origin === o ? 'border-primary bg-primary/5 text-primary' : 'border-white/10 bg-[#1a1a1a] text-on-surface-variant hover:border-white/20'
                  }`}
                >
                  <span className="material-symbols-outlined text-base leading-none">{o === 'online' ? 'shopping_cart' : 'house'}</span>
                  {o === 'online' ? 'Online Store' : 'Personal / Home'}
                </button>
              ))}
            </div>

            {origin === 'online' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-on-surface-variant block mb-1">Store Name</label>
                  <input placeholder="Amazon, Myntra…" value={storeName} onChange={e => setStoreName(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-primary outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-on-surface-variant block mb-1">Order Number <span className="opacity-50 normal-case">(optional)</span></label>
                  <div className="relative">
                    <input placeholder="Paste your Order ID" value={orderNumber} onChange={e => setOrderNumber(e.target.value)}
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl pl-3 pr-9 py-2.5 text-xs text-white focus:border-primary outline-none" />
                    <button onClick={handlePaste} title="Paste" className="absolute right-2 top-1/2 -translate-y-1/2 text-primary">
                      <span className="material-symbols-outlined text-base leading-none">content_paste</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-[10px] font-bold uppercase text-on-surface-variant block mb-1">Sender Name / Origin City</label>
                <input placeholder="e.g. Priya Sharma / Delhi" value={senderName} onChange={e => setSenderName(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-primary outline-none" />
              </div>
            )}
          </div>

          {/* ── Category Grid ── */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Select Item Categories</p>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map(cat => {
                const count   = catItemCount(cat.id);
                const isOpen  = openCats.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCat(cat.id)}
                    className={`relative rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 h-[76px] border transition-all duration-200 active:scale-95 ${
                      isOpen || count > 0
                        ? 'border-primary bg-primary/5 text-primary shadow-[0_0_12px_rgba(242,202,80,0.12)]'
                        : 'border-white/10 bg-[#1a1a1a] text-on-surface-variant hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-2xl leading-none">{cat.icon}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide">{cat.label}</span>
                    {count > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary text-background text-[9px] font-black flex items-center justify-center leading-none">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Expanded category panels ── */}
          {openCats.map(catId => {
            const cat   = CATEGORIES.find(c => c.id === catId)!;
            const types = ITEM_TYPES[catId];
            const age   = ageGroups[catId] || 'Adults (18+)';

            return (
              <div key={catId} className="bg-[#1a1a1a] border border-primary/20 rounded-2xl overflow-hidden animate-fade-in">
                {/* Panel header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-base leading-none">{cat.icon}</span>
                    <span className="text-xs font-black text-white uppercase tracking-wider">{cat.label}</span>
                  </div>
                  <button onClick={() => toggleCat(catId)} className="text-on-surface-variant hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-base leading-none">expand_less</span>
                  </button>
                </div>

                {/* Age tab selector — each tab has its own independent qty */}
                {cat.hasAge && (
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-[9px] font-bold uppercase text-on-surface-variant mb-2 tracking-widest">Age Group (affects weight)</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {AGE_OPTIONS.map(opt => {
                        const tabTotal = types.reduce((s, _, idx) => s + (qtys[`${catId}-${idx}-${opt}`] ?? 0), 0);
                        const isActive = age === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => setAgeGroups(prev => ({ ...prev, [catId]: opt }))}
                            className={`relative py-1.5 text-[9px] font-bold rounded-lg border transition-all ${
                              isActive
                                ? 'bg-primary text-background border-primary'
                                : 'bg-[#131313] border-white/10 text-on-surface-variant hover:border-white/20'
                            }`}
                          >
                            {opt.split('/')[0].trim()}
                            {tabTotal > 0 && !isActive && (
                              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary/80 text-background text-[8px] font-black flex items-center justify-center">
                                {tabTotal}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Item type rows — qty scoped to active age tab */}
                <div className="px-4 py-3 space-y-2">
                  {types.map((type, idx) => {
                    const key = cat.hasAge ? `${catId}-${idx}-${age}` : `${catId}-${idx}-default`;
                    const qty = qtys[key] ?? 0;
                    return (
                      <div
                        key={type.id}
                        className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all ${
                          qty > 0 ? 'bg-primary/5 border border-primary/15' : 'border border-transparent hover:border-white/5'
                        }`}
                      >
                        <div className="flex-grow min-w-0">
                          <p className="text-xs font-semibold text-white leading-tight">
                            {type.label}
                            {type.isPromo && <span className="ml-1.5 text-[9px] text-primary/70 font-normal">(0g promo)</span>}
                            {type.isOversized && <span className="ml-1.5 text-[9px] text-yellow-400 font-normal">⚠ oversized</span>}
                            {type.isFood && <span className="ml-1.5 text-[9px] text-orange-400 font-normal">⚠ customs</span>}
                          </p>
                          <p className="text-[10px] text-on-surface-variant mt-0.5">{type.subtext}</p>
                        </div>

                        {/* Qty stepper — operates on active age tab only */}
                        <div className="flex items-center gap-2 bg-[#131313] rounded-full px-1.5 py-1 border border-white/10 flex-shrink-0">
                          <button
                            onClick={() => changeQty(key, -1)}
                            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/5 text-white active:scale-90 transition-all"
                          >
                            <span className="material-symbols-outlined text-sm leading-none">remove</span>
                          </button>
                          <span className="w-4 text-center text-sm font-bold text-white">{qty}</span>
                          <button
                            onClick={() => changeQty(key, 1)}
                            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/5 text-white active:scale-90 transition-all"
                          >
                            <span className="material-symbols-outlined text-sm leading-none">add</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* ── Warnings ── */}
          {warnings.length > 0 && (
            <div className="space-y-1.5">
              {warnings.map((w, i) => (
                <p key={i} className="text-[10px] text-yellow-400/80 bg-yellow-400/5 border border-yellow-400/15 rounded-lg px-3 py-2">{w}</p>
              ))}
            </div>
          )}

          {/* ── Promo-only error ── */}
          {promoOnlyError && (
            <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 text-xs text-red-400">
              Add at least one main item (tops, bottoms, shoes…) to activate your zero-weight promo items.
            </div>
          )}

          {/* ── Live estimate strip ── */}
          {totalItemCount > 0 && (
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider">Estimated Shipping</p>
                <p className="text-2xl font-black text-primary font-mono">${calc.shipping.toFixed(2)} <span className="text-xs font-bold text-on-surface-variant">CAD</span></p>
                <p className="text-[10px] text-on-surface-variant/60">{calc.effectiveWeight}g · {totalItemCount} item{totalItemCount !== 1 ? 's' : ''}</p>
              </div>
              <span className="material-symbols-outlined text-5xl text-primary opacity-15">flight</span>
            </div>
          )}

          <div className="h-2" />
        </div>

        {/* Fixed bottom CTA */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-white/10 bg-[#131313]">
          <button
            onClick={handleProceed}
            disabled={totalItemCount === 0}
            className="w-full py-4 bg-primary text-background font-bold text-sm uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-35 disabled:cursor-not-allowed"
          >
            Proceed to Book Shipment
          </button>
        </div>
      </div>

      {/* Login intercept */}
      {showLoginPrompt && (
        <div className="absolute inset-0 flex items-center justify-center p-6 z-10">
          <div className="bg-[#1a1a1a] border border-white/15 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="text-center space-y-1">
              <span className="material-symbols-outlined text-4xl text-primary">lock_open</span>
              <h3 className="text-lg font-bold text-white">Almost there!</h3>
              <p className="text-xs text-on-surface-variant">Create a quick account to save your Layo box and add your shipping address.</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  localStorage.setItem('layo_anon_draft', JSON.stringify({ origin, storeName, orderNumber, senderName, qtys, ageGroups }));
                  onClose();
                  router.push('/login');
                }}
                className="w-full py-3 bg-primary text-background font-bold text-xs uppercase tracking-widest rounded-xl hover:brightness-110 transition-all"
              >
                Sign In / Create Account
              </button>
              <button onClick={() => setShowLoginPrompt(false)}
                className="w-full py-3 border border-white/10 text-on-surface-variant text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-white/5 transition-all">
                Keep Estimating
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
