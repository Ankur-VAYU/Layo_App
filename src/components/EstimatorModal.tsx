'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { calculateLayoDeliveryCost } from '@/lib/delhiveryRates';
import { loadMasterCategories } from '@/lib/categoryMatrix';

/* ── Weight matrix ── */
const CATEGORIES = [
  { id: 'clothing', label: 'Clothing',                   icon: 'checkroom',   hasAge: true  },
  { id: 'footwear', label: 'Footwear',                   icon: 'steps',       hasAge: true  },
  { id: 'bags',     label: 'Bags & Luggage',             icon: 'work',        hasAge: false },
  { id: 'jewelry',  label: 'Jewelry & Accessories',      icon: 'diamond',     hasAge: false },
  { id: 'beauty',   label: 'Beauty & Personal Care',     icon: 'face_3',      hasAge: false },
  { id: 'home',     label: 'Home, Kitchen & Living',     icon: 'home',        hasAge: false },
  { id: 'toys',     label: 'Toys, Games & Kids Gear',    icon: 'smart_toy',   hasAge: false },
  { id: 'books',    label: 'Books, Documents & Media',   icon: 'menu_book',   hasAge: false },
  { id: 'food',     label: 'Food, Snacks & Groceries',   icon: 'restaurant',  hasAge: false },
];

const ITEM_TYPES: Record<string, { id: string; label: string; subtext: string; weight: number; isPromo?: boolean; isOversized?: boolean; isFood?: boolean }[]> = {
  clothing: [
    { id: 'light_top',    label: 'Light Topwear',               subtext: 'T-shirts, Shirts, Kurtis, or similar lightweight tops.',                      weight: 200  },
    { id: 'heavy_top',    label: 'Heavy Topwear & Outerwear',   subtext: 'Jackets, Sweaters, Coats, or any thick winter tops.',                        weight: 900  },
    { id: 'light_bot',    label: 'Light Bottoms',               subtext: 'Shorts, Leggings, Light Pajamas, or thin pants.',                            weight: 250  },
    { id: 'heavy_bot',    label: 'Heavy Bottoms',               subtext: 'Jeans, Trousers, Joggers, or heavy material pants.',                         weight: 500  },
    { id: 'light_dress',  label: 'Light Dresses & Sets',        subtext: 'Casual Dresses, Light Cotton Suits, Daily-Wear Sarees, Rompers or co-ords.', weight: 400  },
    { id: 'heavy_eth',    label: 'Heavy Ethnic & Party',        subtext: 'Heavy Lehengas, Bridal Sarees, Embroidered Suits, Gowns.',                   weight: 1000 },
    { id: 'heavy_win',    label: 'Heavy Winter Sets',           subtext: 'Tracksuits, Snowsuits, or heavy 2-piece winter combos.',                     weight: 1300 },
  ],
  footwear: [
    { id: 'light_shoe',   label: 'Light Footwear',              subtext: "Flip-Flops, Flats, Sandals, Ballet Flats, or kids' shoes.",                  weight: 400  },
    { id: 'heavy_shoe',   label: 'Heavy Footwear',              subtext: 'Sneakers, Running Shoes, Formal Leather Shoes, Boots, or Block Heels.',      weight: 1000 },
  ],
  bags: [
    { id: 'small_bag',    label: 'Small Bags & Wallets',        subtext: 'Wallets, Purses, Clutches, Sling Bags, or Fanny Packs.',                     weight: 300  },
    { id: 'medium_bag',   label: 'Medium/Heavy Bags',           subtext: 'Backpacks, Laptop Bags, Handbags, Tote Bags, or Duffle Bags.',               weight: 800  },
    { id: 'luggage',      label: 'Luggage / Trolleys',          subtext: 'Cabin Luggage, Suitcases, or Check-in Bags.',                                weight: 3000, isOversized: true },
  ],
  jewelry: [
    { id: 'struct_acc',   label: 'Structured Accessories',      subtext: 'Watches, Sunglasses, Leather Belts, or heavy Bridal Jewelry sets.',          weight: 200  },
  ],
  beauty: [
    { id: 'light_cos',    label: 'Light Cosmetics',             subtext: 'Lipsticks, Kajal, Makeup Brushes, Compacts, or small serums.',               weight: 80   },
    { id: 'heavy_bath',   label: 'Heavy Bath & Body',           subtext: 'Shampoo Bottles, Perfumes, Body Lotions, or Skincare Kits.',                 weight: 400  },
  ],
  home: [
    { id: 'light_kit',      label: 'Light Utensils',            subtext: 'Cutlery, Spatulas, Small Steel Bowls, Rolling Pins (Belan), Plastic.',       weight: 400  },
    { id: 'soft_tex',       label: 'Soft Home Textiles',        subtext: 'Bedsheets, Blankets, Towel Sets, Curtains, or Cushion Covers.',              weight: 1000 },
    { id: 'std_cook',       label: 'Standard Cookware & Decor', subtext: 'Dinner Plates, Frying Pans, Tawas, Wall Clocks, Small Rugs, Lamps.',        weight: 1500 },
    { id: 'heavy_kit',      label: 'Heavy Kitchenware',         subtext: 'Pressure Cookers, Mixer Grinders, Heavy Kadhais, or Cast Iron Pans.',        weight: 3000 },
    { id: 'oversized_home', label: 'Oversized Home Goods',      subtext: 'Rugs, Large Carpets, Floor Lamps, Large Mirrors, or Small Furniture.',       weight: 5000, isOversized: true },
  ],
  toys: [
    { id: 'small_toy',     label: 'Small Toys & Activity Kits', subtext: 'Action Figures, Card Games, Small Plushies, Rattles, Stationery Kits.',       weight: 300  },
    { id: 'std_toy',       label: 'Standard Boxed Toys',        subtext: 'Board Games, Building Blocks (LEGO), Remote Control Cars, Doll Sets.',       weight: 1200 },
    { id: 'heavy_toy',     label: 'Heavy / Wooden Toys',        subtext: 'Wooden Train Sets, DIY Science Kits, Large Puzzles, Electronic Toys.',       weight: 2500 },
    { id: 'oversized_toy', label: 'Oversized Toys & Play Gear', subtext: 'Play Tents, Large Dollhouses, Baby Walkers, Ride-on Toys, Play Mats.',       weight: 5000, isOversized: true },
  ],
  books: [
    { id: 'docs',       label: 'Important Documents & Papers',   subtext: 'Visas, Legal Papers, Transcripts, Certificates, Planners, Cards.',           weight: 200  },
    { id: 'light_book', label: 'Light Books & Magazines',       subtext: 'Paperbacks, Comic Books, Children’s Storybooks, or Thin Magazines.',         weight: 400  },
    { id: 'std_book',   label: 'Standard Hardcovers & Books',   subtext: 'Hardcover Novels, Cookbooks, Biographies, or Medium Graphic Novels.',        weight: 1000 },
    { id: 'heavy_book', label: 'Heavy Books & Textbooks',       subtext: 'University Textbooks, Coffee Table Books, Heavy Encyclopedias, Sets.',       weight: 2500 },
  ],
  food: [
    { id: 'light_snack', label: 'Light Snacks & Spices',        subtext: 'Namkeen, Dry Snacks, Spices (Masalas), Tea Leaves, or Coffee Powder.',       weight: 500, isFood: true },
    { id: 'heavy_groc',  label: 'Heavy Sweets & Groceries',     subtext: 'Mithai / Sweets Boxes, Pickles (Glass Jars), Dals, Baking Ingredients.',      weight: 1500, isFood: true },
  ],
  promo: [
    { id: 'free_small_items', label: '5 Light Weight Items (Free)', subtext: 'Socks, Innerwear, Lingerie Sets, Ties, Handkerchiefs, Light Jewelry (up to 50g each). Ships free!', weight: 0, isPromo: true },
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
const WEIGHT_FLOOR     = 50;
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

  // Sync category weights from saved master category matrix
  const [activeItemTypes, setActiveItemTypes] = useState(ITEM_TYPES);

  useEffect(() => {
    try {
      const masterCats = loadMasterCategories();
      const updated = JSON.parse(JSON.stringify(ITEM_TYPES)); // Deep clone
      masterCats.forEach(group => {
        const catKey = group.id; // e.g. 'clothing'
        if (updated[catKey]) {
          group.items.forEach(item => {
            const sub = updated[catKey].find((s: any) => s.label === item.label);
            if (sub) {
              sub.weight = item.weightGrams;
              sub.subtext = item.subtext;
            }
          });
        }
      });
      setActiveItemTypes(updated);
    } catch (e) {
      console.warn("Failed to sync category matrix in EstimatorModal:", e);
    }
  }, [isOpen]);

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

  /* ── Clipboard paste for order number ── */
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setOrderNumber(text.trim());
    } catch { /* clipboard not permitted */ }
  };

  /* ── Quantity helpers ── */
  const changeQty = (key: string, delta: number) => {
    const parts = key.split('-');
    const catId = parts[0];
    const typeIdx = parseInt(parts[1], 10);
    const item = activeItemTypes[catId]?.[typeIdx];
    const isPromo = item?.isPromo;

    setQtys(prev => {
      const cur = prev[key] ?? 0;
      let nxt = cur + delta;
      nxt = Math.max(0, nxt);
      if (nxt === 0) {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      }
      return { ...prev, [key]: nxt };
    });
  };

  /* ── Category helpers ── */
  const catItemCount = (catId: string): number => {
    return Object.entries(qtys).reduce((sum, [key, val]) => {
      return key.startsWith(catId + '-') ? sum + val : sum;
    }, 0);
  };

  const toggleCat = (catId: string) => {
    setOpenCats(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  /* ── Calculation engine ── */
  const calc = useMemo(() => {
    let grossWeight = 0;
    let mainItemCount = 0;
    let promoItemCount = 0;

    Object.entries(qtys).forEach(([key, count]) => {
      if (count <= 0) return;
      const parts = key.split('-');
      const catId = parts[0];
      const typeIdx = parseInt(parts[1], 10);
      const age = parts.slice(2).join('-');

      const item = activeItemTypes[catId]?.[typeIdx];
      if (!item) return;

      if (item.isPromo) {
        promoItemCount += count;
      } else {
        mainItemCount += count;
        const mult = CATEGORIES.find(c => c.id === catId)?.hasAge
          ? (AGE_MULTIPLIERS[age] ?? 1.0)
          : 1.0;
        grossWeight += item.weight * count * mult;
      }
    });

    // 5 Free Essentials dynamic promo weight calculation
    const promoWeightGrams = Math.max(0, promoItemCount - 5) * 50;
    grossWeight += promoWeightGrams;

    const isPromoOnly = mainItemCount === 0 && promoItemCount > 0;
    const effectiveWeight = mainItemCount === 0 ? 0 : Math.max(WEIGHT_FLOOR, grossWeight);
    const chargeableKg = Math.ceil(effectiveWeight / 1000);
    const shipping = effectiveWeight === 0
      ? 0
      : SHIPPING_BASE + (chargeableKg * SHIPPING_PER_KG);

    const indiaRetailCAD = mainItemCount * 30 * INR_TO_CAD * 100;
    const canadaRetailCAD = indiaRetailCAD * CANADA_MULT;
    const totalCAD = indiaRetailCAD + shipping;
    const savingsCAD = Math.max(0, canadaRetailCAD - totalCAD);

    return {
      grossWeight,
      effectiveWeight,
      chargeableKg,
      shipping,
      isPromoOnly,
      mainItemCount,
      promoItemCount,
      savingsCAD,
    };
  }, [qtys]);

  /* ── Delivery Option ── */
  const [deliveryType, setDeliveryType] = useState<'normal' | 'express'>('normal');

  /* ── Delivery Cost Calculation Engine ── */
  const deliveryResult = useMemo(() => {
    const weightKg = calc.effectiveWeight / 1000;
    const isDoc = Object.keys(qtys).some(k => k.startsWith('books-0') && (qtys[k] || 0) > 0);
    return calculateLayoDeliveryCost({
      weightKg,
      deliveryType,
      isDocument: isDoc,
      cadToInrRate: 70.4
    });
  }, [calc.effectiveWeight, deliveryType, qtys]);

  const totalItemCount = Object.values(qtys).reduce((s, n) => s + n, 0);

  /* ── Warnings ── */
  const warnings = useMemo(() => {
    const list: string[] = [];
    Object.entries(qtys).forEach(([key, count]) => {
      if (count <= 0) return;
      const [catId, idxStr] = key.split('-');
      const item = activeItemTypes[catId]?.[parseInt(idxStr, 10)];
      if (item?.isOversized && !list.some(w => w.includes('oversized'))) {
        list.push('Oversized items (luggage/large toys/furniture) may incur additional volumetric weight charges at warehouse verification.');
      }
      if (item?.isFood && !list.some(w => w.includes('Perishable'))) {
        list.push('Perishable or liquid food items may be subject to Canadian customs import restrictions.');
      }
    });
    return list;
  }, [qtys]);

  /* ── Proceed action ── */
  const handleProceed = () => {
    if (calc.isPromoOnly) {
      setPromoOnlyError(true);
      return;
    }
    setPromoOnlyError(false);

    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    const payload = {
      origin,
      storeName,
      orderNumber,
      senderName,
      qtys,
      ageGroups,
      deliveryType,
      effectiveWeight: calc.effectiveWeight,
      shippingEstCAD: deliveryResult.finalPriceCAD,
      totalCostCAD: deliveryResult.finalPriceCAD,
      shippingEstINR: deliveryResult.finalPriceINR,
      totalWeight: calc.effectiveWeight / 1000,
      mode: origin === 'online' ? 'Online Retailer' : 'Personal Goods',
    };
    sessionStorage.setItem('layo_active_booking', JSON.stringify(payload));
    localStorage.setItem('layo_pending_shipment_draft', JSON.stringify(payload));
    localStorage.setItem('layo_pending_shipment', JSON.stringify(payload));
    localStorage.removeItem('layo_anon_draft');
    onClose();
    router.push('/dashboard');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center font-sans">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Sheet / Modal Container */}
      <div className="relative bg-[#FAF8EE] text-[#0E1F38] rounded-t-3xl sm:rounded-3xl border border-black/10 w-full max-w-2xl mx-auto flex flex-col shadow-2xl overflow-hidden" style={{ maxHeight: '92vh' }}>
        
        {/* Drag handle for mobile */}
        <div className="w-10 h-1.5 rounded-full bg-black/15 mx-auto mt-3 mb-1 sm:hidden flex-shrink-0" />

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-black/5 bg-[#FAF8EE] flex-shrink-0">
          <div>
            <h2 className="font-black text-lg text-[#0E1F38] tracking-tight">Build Your Layo Box</h2>
            <p className="text-xs text-[#0E1F38]/60 font-light">Get an instant, data-driven shipping estimate</p>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full border border-black/10 bg-white flex items-center justify-center text-[#0E1F38]/70 hover:text-[#0E1F38] hover:bg-black/5 transition-all cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Scrollable content */}
        <div ref={contentRef} className="overflow-y-auto flex-grow px-6 py-5 space-y-6">

          {/* ── Origin Selection ── */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#0E1F38]/60">Where are your items coming from?</p>
            <div className="grid grid-cols-2 gap-3">
              {(['online', 'personal'] as const).map(o => (
                <button
                  key={o}
                  onClick={() => setOrigin(o)}
                  className={`p-3.5 rounded-2xl border text-left text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2.5 cursor-pointer shadow-sm ${
                    origin === o
                      ? 'border-[#FF5A65] bg-[#FF5A65]/10 text-[#FF5A65] ring-2 ring-[#FF5A65]/20'
                      : 'border-black/10 bg-white text-[#0E1F38]/70 hover:border-black/20 hover:text-[#0E1F38]'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg leading-none">{o === 'online' ? 'shopping_cart' : 'house'}</span>
                  {o === 'online' ? 'Online Store' : 'Personal / Home'}
                </button>
              ))}
            </div>

            {origin === 'online' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#0E1F38]/60 block mb-1.5">Store Name</label>
                  <input
                    placeholder="Amazon, Myntra, Ajio…"
                    value={storeName}
                    onChange={e => setStoreName(e.target.value)}
                    className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-xs text-[#0E1F38] placeholder:text-black/35 focus:border-[#FF5A65] focus:ring-1 focus:ring-[#FF5A65] outline-none transition-all shadow-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#0E1F38]/60 block mb-1.5">Order Number <span className="opacity-50 normal-case font-normal">(optional)</span></label>
                  <div className="relative">
                    <input
                      placeholder="Paste your Order ID"
                      value={orderNumber}
                      onChange={e => setOrderNumber(e.target.value)}
                      className="w-full bg-white border border-black/10 rounded-xl pl-4 pr-10 py-3 text-xs text-[#0E1F38] placeholder:text-black/35 focus:border-[#FF5A65] focus:ring-1 focus:ring-[#FF5A65] outline-none transition-all shadow-sm"
                    />
                    <button onClick={handlePaste} title="Paste" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#FF5A65] hover:text-[#e24550]">
                      <span className="material-symbols-outlined text-lg leading-none">content_paste</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pt-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#0E1F38]/60 block mb-1.5">Sender Name / Origin City</label>
                <input
                  placeholder="e.g. Priya Sharma / Delhi"
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  className="w-full bg-white border border-black/10 rounded-xl px-4 py-3 text-xs text-[#0E1F38] placeholder:text-black/35 focus:border-[#FF5A65] focus:ring-1 focus:ring-[#FF5A65] outline-none transition-all shadow-sm"
                />
              </div>
            )}
          </div>

          {/* ── Category Grid ── */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#0E1F38]/60">Select Item Categories</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIES.map(cat => {
                const count   = catItemCount(cat.id);
                const isOpen  = openCats.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCat(cat.id)}
                    className={`relative rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 h-[84px] border transition-all duration-200 active:scale-95 cursor-pointer shadow-sm ${
                      isOpen || count > 0
                        ? 'border-[#FF5A65] bg-[#FF5A65]/10 text-[#FF5A65] ring-2 ring-[#FF5A65]/20 font-bold'
                        : 'border-black/10 bg-white text-[#0E1F38]/80 hover:border-black/20 hover:text-[#0E1F38]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-2xl leading-none">{cat.icon}</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider">{cat.label}</span>
                    {count > 0 && (
                      <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#FF5A65] text-white text-[10px] font-black flex items-center justify-center leading-none shadow-sm">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Auto-added Promo Category when items are added in any category ── */}
          {calc.mainItemCount > 0 && (
            <div className="bg-[#E8F5E9] border-2 border-[#A5D6A7] rounded-2xl overflow-hidden shadow-sm animate-fade-in space-y-0">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#C8E6C9] bg-[#DCEDC8]">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#2E7D32] text-xl leading-none">workspace_premium</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-[#1B5E20] uppercase tracking-wider">
                      Light Weight Accessories (max 50 gm)-
                    </span>
                    <span className="text-[9px] text-[#2E7D32] bg-white px-2 py-0.5 rounded-md font-black uppercase tracking-wider border border-[#C8E6C9]">
                      First 5 Free
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-5 py-3.5 flex items-center justify-between gap-3 bg-white">
                <div className="flex-grow min-w-0">
                  <p className="text-xs font-bold text-[#0E1F38] leading-tight">
                    Small Cloth &amp; Light Accessories (Max 50g)
                  </p>
                  <p className="text-[11px] text-[#0E1F38]/70 mt-0.5 font-light">
                    Socks, innerwear, ties, handkerchiefs, light earrings, chains (up to 50g each). First 5 items ship free! Additional items add 50g each.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-[#FAF8EE] rounded-full px-2 py-1 border border-black/10 flex-shrink-0 shadow-sm">
                  <button
                    onClick={() => changeQty('promo-0-default', -1)}
                    disabled={(qtys['promo-0-default'] ?? 0) === 0}
                    className={`w-7 h-7 rounded-full flex items-center justify-center bg-white border border-black/5 transition-all ${
                      (qtys['promo-0-default'] ?? 0) === 0 ? 'opacity-30 cursor-not-allowed text-[#0E1F38]/40' : 'hover:bg-black/5 text-[#0E1F38] active:scale-90 cursor-pointer'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm leading-none">remove</span>
                  </button>
                  <span className="w-5 text-center text-xs font-bold text-[#0E1F38]">{qtys['promo-0-default'] ?? 0}</span>
                  <button
                    onClick={() => changeQty('promo-0-default', 1)}
                    className="w-7 h-7 rounded-full flex items-center justify-center bg-white border border-black/5 transition-all hover:bg-black/5 text-[#0E1F38] active:scale-90 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm leading-none">add</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Expanded category panels ── */}
          {openCats.map(catId => {
            const cat   = CATEGORIES.find(c => c.id === catId)!;
            const types = activeItemTypes[catId];
            const age   = ageGroups[catId] || 'Adults (18+)';

            return (
              <div key={catId} className="bg-white border border-black/10 rounded-2xl overflow-hidden shadow-sm animate-fade-in space-y-0">
                {/* Panel header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/5 bg-[#ECEAE0]">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[#FF5A65] text-lg leading-none">{cat.icon}</span>
                    <span className="text-xs font-black text-[#0E1F38] uppercase tracking-wider">{cat.label}</span>
                  </div>
                  <button onClick={() => toggleCat(catId)} className="text-[#0E1F38]/60 hover:text-[#0E1F38] transition-colors cursor-pointer">
                    <span className="material-symbols-outlined text-base leading-none">expand_less</span>
                  </button>
                </div>

                {/* Age tab selector — each tab has its own independent qty */}
                {cat.hasAge && (
                  <div className="px-5 pt-3 pb-2 bg-[#FAF8EE] border-b border-black/5">
                    <p className="text-[10px] font-bold uppercase text-[#0E1F38]/60 mb-2 tracking-widest">Age Group (affects weight)</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {AGE_OPTIONS.map(opt => {
                        const tabTotal = types.reduce((s, _, idx) => s + (qtys[`${catId}-${idx}-${opt}`] ?? 0), 0);
                        const isActive = age === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => setAgeGroups(prev => ({ ...prev, [catId]: opt }))}
                            className={`relative py-2 px-2 text-[10px] font-bold rounded-xl border transition-all cursor-pointer shadow-sm text-center ${
                              isActive
                                ? 'bg-[#FF5A65] text-white border-[#FF5A65]'
                                : 'bg-white border-black/10 text-[#0E1F38]/70 hover:border-black/20 hover:text-[#0E1F38]'
                            }`}
                          >
                            {opt.split('/')[0].trim()}
                            {tabTotal > 0 && !isActive && (
                              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#FF5A65] text-white text-[8px] font-black flex items-center justify-center shadow-sm">
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
                <div className="px-5 py-3 space-y-2">
                  {types.map((type, idx) => {
                    const key = cat.hasAge ? `${catId}-${idx}-${age}` : `${catId}-${idx}-default`;
                    const qty = qtys[key] ?? 0;
                    return (
                      <div
                        key={type.id}
                        className={`flex items-center gap-3 py-3 px-3.5 rounded-xl transition-all ${
                          qty > 0 ? 'bg-[#FF5A65]/5 border border-[#FF5A65]/20' : 'border border-transparent hover:bg-[#FAF8EE]'
                        }`}
                      >
                        <div className="flex-grow min-w-0">
                          <p className="text-xs font-bold text-[#0E1F38] leading-tight">
                            {type.label}
                            {type.isOversized && <span className="ml-1.5 text-[9px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold">⚠ oversized</span>}
                            {type.isFood && <span className="ml-1.5 text-[9px] text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md font-semibold">⚠ customs</span>}
                          </p>
                          <p className="text-[11px] text-[#0E1F38]/60 mt-0.5 font-light">
                            {type.subtext}
                            {type.isPromo && qty >= 5 && <span className="text-[#FF5A65] font-medium ml-1.5">· Max 5 limit reached</span>}
                          </p>
                        </div>

                        {/* Qty stepper — operates on active age tab only */}
                        <div className="flex items-center gap-2 bg-[#FAF8EE] rounded-full px-2 py-1 border border-black/10 flex-shrink-0 shadow-sm">
                          <button
                            onClick={() => changeQty(key, -1)}
                            disabled={qty === 0}
                            className={`w-7 h-7 rounded-full flex items-center justify-center bg-white border border-black/5 transition-all ${
                              qty === 0 ? 'opacity-30 cursor-not-allowed text-[#0E1F38]/40' : 'hover:bg-black/5 text-[#0E1F38] active:scale-90 cursor-pointer'
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm leading-none">remove</span>
                          </button>
                          <span className="w-5 text-center text-xs font-bold text-[#0E1F38]">{qty}</span>
                          <button
                            onClick={() => changeQty(key, 1)}
                            className="w-7 h-7 rounded-full flex items-center justify-center bg-white border border-black/5 transition-all hover:bg-black/5 text-[#0E1F38] active:scale-90 cursor-pointer"
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
            <div className="space-y-2">
              {warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 leading-relaxed font-light">{w}</p>
              ))}
            </div>
          )}

          {/* ── Promo-only error ── */}
          {promoOnlyError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700 font-medium">
              Add at least one main item (tops, bottoms, shoes…) to activate your zero-weight promo items.
            </div>
          )}

          {/* ── Live estimate strip with Normal vs Express toggle ── */}
          {totalItemCount > 0 && (
            <div className="bg-white border border-black/10 rounded-2xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0E1F38] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-[#FF5A65]">local_shipping</span>
                  Delivery Speed Option:
                </span>
                <span className="text-[10px] text-[#0E1F38]/60 font-medium">
                  {calc.effectiveWeight}g · {totalItemCount} item{totalItemCount !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Delivery Type Option Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryType('normal')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    deliveryType === 'normal'
                      ? 'bg-[#1B250F] text-white border-[#1B250F] shadow-sm ring-2 ring-[#8BC34A]/30'
                      : 'bg-[#FAF8EE] text-[#0E1F38] border-black/10 hover:border-black/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black">📦 Normal Delivery</span>
                    {deliveryType === 'normal' && <span className="text-[9px] bg-[#8BC34A] text-[#1B250F] font-black px-1.5 py-0.5 rounded uppercase">Selected</span>}
                  </div>
                  <p className="text-[10px] opacity-70 mt-1">Best Value (Standard Air Cargo)</p>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryType('express')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    deliveryType === 'express'
                      ? 'bg-[#1B250F] text-white border-[#1B250F] shadow-sm ring-2 ring-[#8BC34A]/30'
                      : 'bg-[#FAF8EE] text-[#0E1F38] border-black/10 hover:border-black/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black">⚡ Express Delivery</span>
                    {deliveryType === 'express' && <span className="text-[9px] bg-[#8BC34A] text-[#1B250F] font-black px-1.5 py-0.5 rounded uppercase">Selected</span>}
                  </div>
                  <p className="text-[10px] opacity-70 mt-1">Priority Air Cargo</p>
                </button>
              </div>

              {/* Final Rate Display (Customer View) */}
              <div className="bg-[#FAF8EE] border border-black/5 rounded-xl p-3.5 flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-[#0E1F38]/60 uppercase font-bold tracking-wider">Final Estimate ({deliveryType.toUpperCase()})</p>
                  <p className="text-2xl font-black text-[#FF5A65] font-mono">
                    ${deliveryResult.finalPriceCAD.toFixed(2)} <span className="text-xs font-bold text-[#0E1F38]/70">CAD</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-[#0E1F38]/80">
                    ≈ ₹{deliveryResult.finalPriceINR.toLocaleString('en-IN')} INR
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="h-2" />
        </div>

        {/* Fixed bottom CTA */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-black/5 bg-[#FAF8EE]">
          <button
            onClick={handleProceed}
            disabled={totalItemCount === 0}
            className="w-full py-4 bg-[#FF5A65] text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-[#e24550] active:scale-[0.98] transition-all shadow-md shadow-[#FF5A65]/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            Proceed to Book Shipment
          </button>
        </div>
      </div>

      {/* Login intercept */}
      {showLoginPrompt && (
        <div className="absolute inset-0 flex items-center justify-center p-6 z-10 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-black/10 rounded-3xl p-6 sm:p-8 w-full max-w-sm space-y-5 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#FF5A65]/10 text-[#FF5A65] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-2xl">lock_open</span>
              </div>
              <h3 className="text-lg font-black text-[#0E1F38]">Almost there!</h3>
              <p className="text-xs text-[#0E1F38]/70 font-light leading-relaxed">Create a quick account to save your Layo box and add your shipping address.</p>
            </div>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  localStorage.setItem('layo_anon_draft', JSON.stringify({ origin, storeName, orderNumber, senderName, qtys, ageGroups }));
                  onClose();
                  router.push('/login');
                }}
                className="w-full py-3.5 bg-[#FF5A65] text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-[#e24550] transition-all shadow-sm cursor-pointer"
              >
                Sign In / Create Account
              </button>
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="w-full py-3.5 border border-black/10 text-[#0E1F38]/70 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-black/5 transition-all cursor-pointer"
              >
                Keep Estimating
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
