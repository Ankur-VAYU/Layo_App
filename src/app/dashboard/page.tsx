'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { useAuth } from '@/components/AuthProvider';
import { supabase, insertShipment, fetchShipments } from '@/lib/supabase';

interface SubCategoryItem {
  name: string;
  weight: number;
  promo?: boolean;
  oversized?: boolean;
  isRestricted?: boolean;
}

interface CategoryDetail {
  name: string;
  icon: string;
  requiresAge?: boolean;
  isFoodGlobal?: boolean;
  subs: SubCategoryItem[];
}

const categoryData: Record<string, CategoryDetail> = {
  clothing: {
    name: 'Clothing',
    icon: 'checkroom',
    requiresAge: true,
    subs: [
      { name: 'Tops', weight: 450 },
      { name: 'Bottoms', weight: 375 },
      { name: 'Dresses', weight: 700 },
      { name: 'Winter Wear', weight: 1300 },
    ]
  },
  footwear: {
    name: 'Footwear',
    icon: 'steps',
    requiresAge: true,
    subs: [
      { name: 'Light Footwear', weight: 400 },
      { name: 'Heavy Boots', weight: 1000 }
    ]
  },
  bags: {
    name: 'Bags',
    icon: 'work',
    subs: [
      { name: 'Small Bag', weight: 300 },
      { name: 'Medium Bag', weight: 800 },
      { name: 'Luggage', weight: 3000, oversized: true }
    ]
  },
  jewelry: {
    name: 'Jewelry',
    icon: 'diamond',
    subs: [
      { name: 'Structured Jewelry', weight: 200 }
    ]
  },
  beauty: {
    name: 'Beauty',
    icon: 'face_3',
    subs: [
      { name: 'Light Cosmetics', weight: 80 },
      { name: 'Heavy Beauty', weight: 400 }
    ]
  },
  home: {
    name: 'Home',
    icon: 'home',
    subs: [
      { name: 'Utensils', weight: 400 },
      { name: 'Textiles', weight: 1000 },
      { name: 'Decor', weight: 1500 },
      { name: 'Kitchenware', weight: 3000, oversized: true },
      { name: 'Oversized Home', weight: 5000, oversized: true }
    ]
  },
  toys: {
    name: 'Toys',
    icon: 'smart_toy',
    subs: [
      { name: 'Small Toy', weight: 300 },
      { name: 'Standard Toy', weight: 1200 },
      { name: 'Wooden Toy', weight: 2500 },
      { name: 'Oversized Toy', weight: 5000, oversized: true }
    ]
  },
  books: {
    name: 'Books',
    icon: 'menu_book',
    subs: [
      { name: 'Documents', weight: 200 },
      { name: 'Light Book', weight: 400 },
      { name: 'Standard Book', weight: 1000 },
      { name: 'Heavy Book', weight: 2500 }
    ]
  },
  food: {
    name: 'Food',
    icon: 'restaurant',
    isFoodGlobal: true,
    subs: [
      { name: 'Snacks', weight: 500 },
      { name: 'Sweets/Groceries', weight: 1500, isRestricted: true }
    ]
  }
};

const demographicOptions = [
  { label: 'Baby', multiplier: 0.4 },
  { label: 'Kids', multiplier: 0.7 },
  { label: 'Teens', multiplier: 0.9 },
  { label: 'Adult', multiplier: 1.0 }
];

// Maps EstimatorModal's "catId-typeIdx" → dashboard subcategory index
const MODAL_TO_DASH_SUB: Record<string, number> = {
  'clothing-0': 0, 'clothing-1': 0,            // light/heavy top → Tops
  'clothing-2': 1, 'clothing-3': 1,            // light/heavy bottom → Bottoms
  'clothing-4': 2, 'clothing-5': 2,            // dresses/ethnic → Dresses
  'clothing-6': 3,                              // winter sets → Winter Wear
  'clothing-7': 4,                              // accessories → Promo Acc
  'footwear-0': 0, 'footwear-1': 1,
  'bags-0': 0, 'bags-1': 1, 'bags-2': 2,
  'jewelry-0': 0, 'jewelry-1': 1,
  'beauty-0': 0, 'beauty-1': 1,
  'home-0': 0, 'home-1': 1, 'home-2': 2, 'home-3': 3, 'home-4': 4,
  'toys-0': 0, 'toys-1': 1, 'toys-2': 2, 'toys-3': 3,
  'books-0': 0, 'books-1': 1, 'books-2': 2, 'books-3': 3,
  'food-0': 0, 'food-1': 1,
};

// Maps EstimatorModal age labels → dashboard demo labels
const MODAL_AGE_TO_DEMO: Record<string, string> = {
  'Baby/Toddler (0–4)': 'Baby',
  'Growing Kids (5–12)': 'Kids',
  'Teens (11–17)': 'Teens',
  'Adults (18+)': 'Adult',
  'default': 'Adult',
};

const canadaCities = ['Toronto (GTA)', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton', 'Winnipeg'];

const stepPills = [
  { id: 1, label: 'Origin & Warehouse' },
  { id: 2, label: 'Canada Destination' },
  { id: 3, label: 'Select Categories' },
  { id: 4, label: 'Configure Items' },
  { id: 5, label: 'Review & Actions' }
];

export default function Dashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Navigation and view tabs
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'history') setActiveTab('history');
    }
  }, []);
  const [currentStep, setCurrentStep] = useState(1);
  const [isFetching, setIsFetching] = useState(true);

  // Loaded database items
  const [shipments, setShipments] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);

  // Step 1: Origin & Warehouse
  const [originType, setOriginType] = useState<'online' | 'personal'>('online');
  const [storeName, setStoreName] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [senderName, setSenderName] = useState('');
  const [originCity, setOriginCity] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');

  // Step 2: Canada Destination
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');

  // Step 3: Category selection (array of selected keys)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Step 4a: qty keyed by "catKey-subIndex-demo" e.g. "topwear-0-Adult"
  const [qtyState, setQtyState] = useState<Record<string, number>>({});
  // Step 4b: which demo tab is active per row, keyed by "catKey-subIndex"
  const [activeDemoState, setActiveDemoState] = useState<Record<string, string>>({});

  // Step 5: Action Options
  const [warehouseAction, setWarehouseAction] = useState<'ship' | 'hold' | null>(null);
  const [morePackages, setMorePackages] = useState<number | null>(null);

  // Modals & Errors
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [showOrderNumberError, setShowOrderNumberError] = useState(false);
  const [promoQty, setPromoQty] = useState(0);

  // Financial and math helpers
  const [cadToInrRate, setCadToInrRate] = useState(70.4);

  useEffect(() => {
    const fetchExchangeRate = async () => {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/CAD');
        if (res.ok) {
          const data = await res.json();
          if (data && data.rates && data.rates.INR) {
            setCadToInrRate(data.rates.INR);
          }
        }
      } catch (err) {
        console.error('Failed to fetch exchange rate', err);
      }
    };
    fetchExchangeRate();
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      fetchDashboardData(user.id);

      // Restore items from the EstimatorModal if user came via "Proceed to Book"
      const raw = localStorage.getItem('layo_pending_shipment_draft');
      if (raw) {
        try {
          const draft = JSON.parse(raw);
          const modalQtys: Record<string, number> = draft.qtys || {};

          const newQtyState: Record<string, number> = {};
          const newActiveDemoState: Record<string, string> = {};
          const catsWithItems = new Set<string>();

          Object.entries(modalQtys).forEach(([key, qty]) => {
            if (!qty || qty <= 0) return;

            if (key.startsWith('promo-')) {
              setPromoQty(Math.min(5, qty as number));
              return;
            }

            // key format: "catId-typeIdx-ageSuffix"
            const firstDash  = key.indexOf('-');
            const secondDash = key.indexOf('-', firstDash + 1);
            if (firstDash === -1 || secondDash === -1) return;

            const catId    = key.slice(0, firstDash);
            const typeIdx  = key.slice(firstDash + 1, secondDash);
            const ageSuffix = key.slice(secondDash + 1);       // e.g. "Adults (18+)" or "default"

            const dashSubIdx = MODAL_TO_DASH_SUB[`${catId}-${typeIdx}`];
            if (dashSubIdx === undefined || !categoryData[catId]) return;

            const demo    = MODAL_AGE_TO_DEMO[ageSuffix] ?? 'Adult';
            const rowKey  = `${catId}-${dashSubIdx}`;
            const fullKey = `${rowKey}-${demo}`;

            newQtyState[fullKey] = (newQtyState[fullKey] ?? 0) + (qty as number);
            newActiveDemoState[catId] = demo;
            catsWithItems.add(catId);
          });

          if (catsWithItems.size > 0) {
            setQtyState(newQtyState);
            setActiveDemoState(newActiveDemoState);
            setSelectedCategories([...catsWithItems]);
            // Pre-fill origin fields
            if (draft.storeName)   setStoreName(draft.storeName);
            if (draft.senderName)  setSenderName(draft.senderName);
            if (draft.orderNumber) setOrderNumber(draft.orderNumber);
            if (draft.origin)      setOriginType(draft.origin);
            // Start from Step 1 so user fills warehouse + delivery address
            setCurrentStep(1);
          }

          localStorage.removeItem('layo_pending_shipment_draft');
        } catch (e) {
          console.error('Failed to restore estimator draft', e);
        }
      }
    }
  }, [user, loading, router]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDashboardData = async (userId?: string) => {
    setIsFetching(true);
    try {
      const [shipsResult, whs] = await Promise.all([
        fetchShipments(userId),
        supabase.from('warehouses').select('*')
      ]);

      if (shipsResult.data) setShipments(shipsResult.data);
      if (whs.data && whs.data.length > 0) {
        setWarehouses(whs.data);
      } else {
        setWarehouses([
          { id: 'wh1', city: 'Delhi', pincode: '110001', address: 'Plot 42, Layo Hub, Okhla Phase 3', contact: '+91 98100 12345' },
          { id: 'wh2', city: 'Mumbai', pincode: '400001', address: 'Gala 5, Hub 2, Andheri East', contact: '+91 98200 54321' }
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch database information', err);
      setWarehouses([
        { id: 'wh1', city: 'Delhi', pincode: '110001', address: 'Plot 42, Layo Hub, Okhla Phase 3' },
        { id: 'wh2', city: 'Mumbai', pincode: '400001', address: 'Gala 5, Hub 2, Andheri East' }
      ]);
    } finally {
      setIsFetching(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setOrderNumber(text);
      setShowOrderNumberError(false);
    } catch (err) {
      console.error('Failed to read clipboard', err);
    }
  };

  // Toggle Category selection
  const handleToggleCategory = (key: string) => {
    let newCategories = [...selectedCategories];
    if (newCategories.includes(key)) {
      newCategories = newCategories.filter(k => k !== key);
      // Remove all qty and activeDemo entries for this category
      setQtyState(prev => {
        const next = { ...prev };
        categoryData[key].subs.forEach((_, idx) => {
          demographicOptions.forEach(opt => {
            delete next[`${key}-${idx}-${opt.label}`];
          });
        });
        return next;
      });
      setActiveDemoState(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } else {
      newCategories.push(key);
      // Initialize active demo tab to 'Adult' per category
      setActiveDemoState(prev => ({ ...prev, [key]: 'Adult' }));
    }
    setSelectedCategories(newCategories);
  };

  // Adjust qty for the currently active demo tab of a category
  const handleQtyChange = (catKey: string, rowKey: string, delta: number, isPromo?: boolean) => {
    const demo = activeDemoState[catKey] ?? 'Adult';
    const fullKey = `${rowKey}-${demo}`;
    setQtyState(prev => {
      const cur = prev[fullKey] ?? 0;
      let nxt = cur + delta;
      if (isPromo && nxt > 5) nxt = 5;
      nxt = Math.max(0, nxt);
      return {
        ...prev,
        [fullKey]: nxt
      };
    });
  };

  // Switch active demo tab for a category — qty for the new tab is independent
  const handleDemoChange = (catKey: string, demo: string) => {
    setActiveDemoState(prev => ({ ...prev, [catKey]: demo }));
  };

  // Active configurations extractor
  const activeItems = useMemo(() => {
    const list: any[] = [];
    selectedCategories.forEach(catKey => {
      const cat = categoryData[catKey];
      if (!cat) return;
      cat.subs.forEach((sub, idx) => {
        const rowKey = `${catKey}-${idx}`;
        if (cat.requiresAge) {
          demographicOptions.forEach(opt => {
            const qty = qtyState[`${rowKey}-${opt.label}`] ?? 0;
            if (qty > 0) {
              list.push({
                rowKey,
                demoKey: `${rowKey}-${opt.label}`,
                category: catKey,
                categoryName: cat.name,
                subcategory: sub.name,
                qty,
                demo: opt.label,
                requiresAge: true,
                promo: sub.promo,
                oversized: sub.oversized,
                isRestricted: sub.isRestricted || cat.isFoodGlobal,
                weightGrams: sub.weight * opt.multiplier * qty,
              });
            }
          });
        } else {
          const qty = qtyState[`${rowKey}-default`] ?? 0;
          if (qty > 0) {
            list.push({
              rowKey,
              demoKey: `${rowKey}-default`,
              category: catKey,
              categoryName: cat.name,
              subcategory: sub.name,
              qty,
              demo: null,
              requiresAge: false,
              promo: sub.promo,
              oversized: sub.oversized,
              isRestricted: sub.isRestricted || cat.isFoodGlobal,
              weightGrams: sub.weight * qty,
            });
          }
        }
      });
    });
    return list;
  }, [qtyState, selectedCategories]);

  // Unified Totals Engine
  const totals = useMemo(() => {
    let totalWeightGrams = 0;

    activeItems.forEach(item => {
      totalWeightGrams += item.weightGrams;
    });

    const hasItems = totalWeightGrams > 0;
    const displayWeightGrams = hasItems ? Math.max(500, totalWeightGrams) : 0;
    const weightCost = hasItems ? totalWeightGrams * 0.05 : 0;
    const totalPriceCAD = hasItems ? 25.0 + weightCost : 0;
    const valueReclaimed = 0;

    return {
      totalWeightGrams: displayWeightGrams,
      totalWeightKg: displayWeightGrams / 1000,
      totalPriceCAD,
      totalPriceINR: Math.round(totalPriceCAD * cadToInrRate),
      valueReclaimed: Math.round(valueReclaimed)
    };
  }, [activeItems, cadToInrRate]);

  // Warnings checker
  const warnings = useMemo(() => {
    const list: string[] = [];
    let hasMainItem = false;
    let hasPromoOnly = false;

    activeItems.forEach(item => {
      if (item.promo) hasPromoOnly = true;
      else hasMainItem = true;

      if (item.oversized) {
        list.push(`⚠️ Oversized Item (${item.subcategory}): Volumetric weight checks required.`);
      }
      if (item.isRestricted) {
        list.push(`⚠️ Restricted Item (${item.subcategory}): International customs/health regulations apply.`);
      }
    });

    if (hasPromoOnly && !hasMainItem) {
      list.push(`⚠️ Piggyback Rule: Promo (0g) items require at least one main item.`);
    }

    return list;
  }, [activeItems]);

  // Checkout redirect logic
  const handleProceedToCheckout = () => {
    if (originType === 'online' && !orderNumber.trim()) {
      setShowOrderNumberError(true);
      setCurrentStep(1);
      return;
    }

    const itemsPayload = activeItems.map(i => ({
      category: i.category,
      subcategory: i.subcategory,
      quantity: i.qty,
      demographic: i.demo,
      weight: i.weightGrams / 1000,
    }));

    if (promoQty > 0) {
      itemsPayload.push({
        category: 'promo',
        subcategory: 'Free light weight items (max 50 gm)',
        quantity: promoQty,
        demographic: null,
        weight: 0,
      });
    }

    const payload = {
      items: itemsPayload,
      mode: 'Selection',
      originType,
      storeName,
      orderNumber,
      senderName,
      originCity,
      destinationCity,
      destinationAddress,
      indiaWarehouse: selectedWarehouse,
      weight: totals.totalWeightKg,
      cost: totals.totalPriceCAD,
      totalWeight: totals.totalWeightKg,
      totalCostCAD: totals.totalPriceCAD,
      valueReclaimed: totals.valueReclaimed,
      warehouseAction: warehouseAction || 'ship',
      morePackages,
      exchangeRate: cadToInrRate
    };

    localStorage.setItem('layo_pending_shipment', JSON.stringify(payload));
    router.push('/checkout');
  };

  // Intercepting click on Logo to offer Draft Saving
  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const hasProgress =
      activeItems.length > 0 ||
      selectedWarehouse ||
      destinationAddress ||
      storeName ||
      senderName;

    if (hasProgress) {
      e.preventDefault();
      setShowDraftModal(true);
    }
  };

  // Save to drafts in DB
  const saveDraft = async () => {
    try {
      const itemsPayload = activeItems.map(i => ({
        category: i.category,
        subcategory: i.subcategory,
        quantity: i.qty,
        demographic: i.demo,
        weight: i.weightGrams / 1000,
      }));

      if (promoQty > 0) {
        itemsPayload.push({
          category: 'promo',
          subcategory: 'Free light weight items (max 50 gm)',
          quantity: promoQty,
          demographic: null,
          weight: 0,
        });
      }

      await insertShipment({
        user_id: user?.id || '00000000-0000-0000-0000-000000000000',
        mode: 'Selection',
        destination_city: destinationCity || 'Draft City',
        destination_address: destinationAddress || 'Draft Address',
        india_warehouse: selectedWarehouse || null,
        external_order_id: orderNumber || null,
        total_weight: totals.totalWeightKg,
        total_cost: totals.totalPriceINR,
        items: itemsPayload,
        status: 'Draft Estimate',
        payment_method: 'draft'
      });
    } catch (err) {
      console.error('Failed to save draft shipment:', err);
    } finally {
      localStorage.removeItem('layo_pending_shipment');
      setShowDraftModal(false);
      router.push('/');
    }
  };

  if (loading || (isFetching && user)) {
    return (
      <div className="min-h-screen bg-[#FAF8EE] text-[#0E1F38] flex flex-col justify-center items-center gap-4">
        <div className="w-10 h-10 border-4 border-[#FF5A65] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#0E1F38]/70 font-bold text-xs uppercase tracking-widest">Loading My Shipments…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-[#FAF8EE] text-[#0E1F38] min-h-screen flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-white border border-black/10 rounded-3xl w-full max-w-md p-8 shadow-xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[#FF5A65]/10 border border-[#FF5A65]/30 flex items-center justify-center mx-auto text-[#FF5A65]">
            <span className="material-symbols-outlined text-3xl">lock</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-[#0E1F38]">Locker Access Restricted</h2>
            <p className="text-[#0E1F38]/70 text-sm leading-relaxed font-light">
              Locker management and Virtual Indian Addresses are available for registered users only. Please sign in or create an account to access your locker.
            </p>
          </div>
          <div className="space-y-3 pt-2">
            <Link
              href="/login"
              className="block w-full py-4 bg-[#FF5A65] text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-[#e24550] transition-all text-center shadow-md shadow-[#FF5A65]/20"
            >
              Sign In to Access Locker
            </Link>
            <Link
              href="/signup"
              className="block w-full py-3.5 border border-black/10 text-[#0E1F38] font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-black/5 transition-all text-center"
            >
              Create New Account
            </Link>
          </div>
          <Link href="/" className="block text-xs text-[#0E1F38]/60 hover:text-[#0E1F38] pt-2">
            ← Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const selectedWarehouseObject = warehouses.find(w => w.id === selectedWarehouse);

  return (
    <div className="bg-[#FAF8EE] text-[#0E1F38] min-h-screen flex flex-col font-sans selection:bg-[#FF5A65] selection:text-white">
      
      {/* ── Top App Bar ── */}
      <header className="bg-[#FAF8EE]/90 backdrop-blur-md border-b border-black/5 flex justify-between items-center w-full px-6 md:px-16 py-4 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-4">
          <Logo showTagline={false} darkText={true} onClick={handleLogoClick} />
        </div>
        <div className="flex items-center gap-6">
          <Link href="/" className="text-[#0E1F38]/70 hover:text-[#FF5A65] transition-colors text-sm font-semibold">Home</Link>
          {['admin@layo.com', 'ankur@layo.com'].includes(user?.email || '') && (
            <Link href="/admin" className="text-[#0E1F38]/70 hover:text-[#FF5A65] transition-colors text-sm font-semibold">Admin Portal</Link>
          )}
          <button 
            onClick={() => supabase.auth.signOut()} 
            className="text-[#FF5A65] hover:bg-[#FF5A65] hover:text-white text-xs font-bold uppercase tracking-wider border border-[#FF5A65]/30 bg-white px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* ── Main Panel ── */}
      <main className="flex-grow w-full max-w-[1200px] mx-auto px-6 py-12">
        
        {/* Brand identity / Hero */}
        <div className="mb-10 text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#FF5A65]">Member Locker</span>
          <h1 className="text-3xl md:text-5xl font-black text-[#0E1F38] tracking-tight">
            Virtual Indian Locker
          </h1>
          <p className="text-sm md:text-base text-[#0E1F38]/70 max-w-xl mx-auto font-light leading-relaxed">
            Consolidate parcels at our Indian hub and dispatch securely to Canada.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex justify-center border-b border-black/10 mb-8 max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('new')}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === 'new' ? 'border-[#FF5A65] text-[#FF5A65]' : 'border-transparent text-[#0E1F38]/60 hover:text-[#0E1F38]'
            }`}
          >
            New Locker Order
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === 'history' ? 'border-[#FF5A65] text-[#FF5A65]' : 'border-transparent text-[#0E1F38]/60 hover:text-[#0E1F38]'
            }`}
          >
            My Shipments ({shipments.length})
          </button>
        </div>

        {activeTab === 'history' ? (
          /* ── MY SHIPMENTS / TRACKER TAB ── */
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-[#0E1F38] text-center md:text-left">Track Your Shipments</h2>
            {shipments.length === 0 ? (
              <div className="bg-white border border-black/5 rounded-3xl p-12 text-center space-y-4 shadow-sm">
                <span className="material-symbols-outlined text-6xl text-[#0E1F38]/30">inventory_2</span>
                <h3 className="text-lg font-bold text-[#0E1F38]">No shipments yet</h3>
                <p className="text-[#0E1F38]/60 text-sm max-w-sm mx-auto font-light">
                  Start generating quotes and book your first virtual locker address to begin international tracking.
                </p>
                <button
                  onClick={() => setActiveTab('new')}
                  className="bg-[#FF5A65] text-white font-bold text-xs uppercase tracking-widest px-6 py-3.5 rounded-2xl hover:bg-[#e24550] active:scale-95 transition-all shadow-md shadow-[#FF5A65]/20 mt-2 cursor-pointer"
                >
                  Book New Shipment
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {shipments.map(s => {
                  const STEPS = ['draft', 'paid', 'arrived', 'shipped', 'delivered'];
                  const STEP_LABELS = ['Draft Estimate', 'Estimate Paid', 'Received in India', 'Weight Verified', 'Shipped to Canada'];
                  const STATUS_COLORS: Record<string, string> = {
                    draft: '#64748b',
                    paid: '#f59e0b',
                    arrived: '#8b5cf6',
                    shipped: '#3b82f6',
                    delivered: '#10b981'
                  };
                  const statusNormalized = s.status?.toLowerCase() ?? 'paid';
                  const currentIdx = STEPS.indexOf(statusNormalized);

                  return (
                    <div key={s.id} className="bg-white p-6 rounded-3xl border border-black/5 space-y-4 shadow-sm text-[#0E1F38]">
                      <div className="flex justify-between items-center">
                        <span
                          className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                          style={{
                            backgroundColor: `${STATUS_COLORS[statusNormalized] ?? '#64748b'}15`,
                            color: STATUS_COLORS[statusNormalized] ?? '#64748b'
                          }}
                        >
                          {s.status || 'Paid'}
                        </span>
                        <span className="text-[11px] text-[#0E1F38]/50">
                          {new Date(s.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Stepper tracker */}
                      <div className="relative pt-2">
                        <div className="absolute top-[13px] left-0 right-0 h-[2px] bg-black/5 -z-10"></div>
                        <div className="flex justify-between">
                          {STEPS.map((step, idx) => {
                            const isPassed = idx <= currentIdx;
                            const isCurrent = idx === currentIdx;
                            return (
                              <div key={step} className="flex flex-col items-center gap-1.5 flex-1 relative">
                                <div
                                  className="w-3.5 h-3.5 rounded-full transition-all border-2 border-transparent"
                                  style={{
                                    backgroundColor: isPassed ? STATUS_COLORS[statusNormalized] ?? '#64748b' : '#e2e8f0',
                                    boxShadow: isCurrent ? `0 0 10px ${STATUS_COLORS[statusNormalized] ?? '#64748b'}` : 'none'
                                  }}
                                />
                                <span 
                                  className={`text-[8px] uppercase tracking-widest font-bold ${
                                    isPassed ? 'text-[#0E1F38]' : 'text-[#0E1F38]/40'
                                  }`}
                                >
                                  {STEP_LABELS[idx]}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="border-t border-black/5 pt-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-sm text-[#0E1F38]">✈ {s.destination_city || 'Canada'}</h3>
                            <p className="text-xs text-[#0E1F38]/70 leading-tight font-light">{s.destination_address}</p>
                          </div>
                          <div className="text-right text-xs">
                            <p className="font-mono text-[#0E1F38] font-bold">{s.total_weight} kg</p>
                            <p className="text-[#FF5A65] font-bold">₹{(s.total_cost || 0).toLocaleString()}</p>
                          </div>
                        </div>
                        {s.external_order_id && (
                          <p className="text-[10px] text-[#0E1F38]/80 bg-[#FAF8EE] p-2.5 rounded-xl border border-black/5 font-mono">
                            <strong>Reference Order:</strong> {s.external_order_id}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ── NEW LOCKER STEPPER WIZARD TAB ── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Step Content Card */}
            <div className="lg:col-span-8 bg-white rounded-3xl border border-black/5 p-6 md:p-8 space-y-8 shadow-sm relative text-[#0E1F38]">
              
              {/* Process Bar Header */}
              <nav className="border-b border-black/5 pb-6">
                <div className="flex justify-between items-center gap-1.5 max-w-md mx-auto">
                  {stepPills.map(step => {
                    const isPassed = step.id <= currentStep;
                    const isCurrent = step.id === currentStep;
                    return (
                      <button
                        key={step.id}
                        disabled={step.id > currentStep && activeItems.length === 0}
                        onClick={() => setCurrentStep(step.id)}
                        className={`flex flex-col items-center gap-2 flex-1 outline-none focus:outline-none transition-all cursor-pointer ${
                          isCurrent ? 'step-active' : ''
                        }`}
                      >
                        <div 
                          className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                            isCurrent
                              ? 'bg-[#FF5A65] border-[#FF5A65] shadow-[0_0_10px_rgba(255,90,101,0.4)]'
                              : isPassed
                              ? 'bg-[#FF5A65]/60 border-[#FF5A65]/60'
                              : 'bg-black/15 border-transparent'
                          }`}
                        />
                        <span 
                          className={`text-[8px] uppercase tracking-widest font-bold text-center block ${
                            isCurrent ? 'text-[#FF5A65]' : isPassed ? 'text-[#0E1F38]' : 'text-[#0E1F38]/40'
                          }`}
                        >
                          {step.id}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </nav>

              {/* STEP 1: Origin & Warehouse */}
              {currentStep === 1 && (
                <section className="space-y-6 animate-fade-in">
                  <div>
                    <h3 className="text-lg font-black text-[#0E1F38] uppercase tracking-wider border-l-4 border-[#FF5A65] pl-3">
                      1. Setup Virtual Address &amp; Origin
                    </h3>
                    <p className="text-[#0E1F38]/60 text-xs mt-1 font-light">Specify drop-off point and details of incoming items.</p>
                  </div>

                  {/* Radios */}
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setOriginType('online')}
                      className={`p-4 rounded-2xl border text-left font-bold text-xs uppercase tracking-wider transition-all flex flex-col gap-1 cursor-pointer shadow-sm ${
                        originType === 'online'
                          ? 'border-[#FF5A65] bg-[#FF5A65]/10 text-[#FF5A65] ring-2 ring-[#FF5A65]/20'
                          : 'border-black/10 bg-[#FAF8EE] text-[#0E1F38]/70 hover:border-black/20 hover:text-[#0E1F38]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">shopping_cart</span>
                      Online Retailer Store
                    </button>
                    <button
                      onClick={() => setOriginType('personal')}
                      className={`p-4 rounded-2xl border text-left font-bold text-xs uppercase tracking-wider transition-all flex flex-col gap-1 cursor-pointer shadow-sm ${
                        originType === 'personal'
                          ? 'border-[#FF5A65] bg-[#FF5A65]/10 text-[#FF5A65] ring-2 ring-[#FF5A65]/20'
                          : 'border-black/10 bg-[#FAF8EE] text-[#0E1F38]/70 hover:border-black/20 hover:text-[#0E1F38]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">house</span>
                      Personal Courier / Home
                    </button>
                  </div>

                  {/* Form Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {originType === 'online' ? (
                      <>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-[#0E1F38]/60">Store Name</label>
                          <input
                            type="text"
                            placeholder="Amazon, Myntra, Ajio, etc."
                            value={storeName}
                            onChange={e => setStoreName(e.target.value)}
                            className="w-full bg-[#FAF8EE] border border-black/10 rounded-xl px-4 py-3 text-xs text-[#0E1F38] placeholder:text-black/35 focus:border-[#FF5A65] focus:ring-1 focus:ring-[#FF5A65] focus:outline-none transition-all shadow-sm"
                          />
                        </div>
                        <div className="space-y-1 relative" id="orderNumberField">
                          <label className="text-[10px] uppercase font-bold text-[#0E1F38]/60">Order Number</label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Order ID or Reference ID"
                              value={orderNumber}
                              onChange={e => {
                                setOrderNumber(e.target.value);
                                setShowOrderNumberError(false);
                              }}
                              className={`w-full bg-[#FAF8EE] border rounded-xl pl-4 pr-12 py-3 text-xs text-[#0E1F38] placeholder:text-black/35 focus:border-[#FF5A65] focus:ring-1 focus:ring-[#FF5A65] focus:outline-none transition-all shadow-sm ${
                                showOrderNumberError ? 'border-red-500' : 'border-black/10'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={handlePaste}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#FF5A65] hover:text-[#e24550] text-sm p-1 cursor-pointer"
                              title="Paste from clipboard"
                            >
                              📋
                            </button>
                          </div>
                          {showOrderNumberError && (
                            <p className="text-[10px] text-red-500 font-semibold mt-1">
                              Please supply your Retailer Order Number so the hub can verify receipt.
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-[#0E1F38]/60">Sender's Full Name</label>
                          <input
                            type="text"
                            placeholder="John Doe"
                            value={senderName}
                            onChange={e => setSenderName(e.target.value)}
                            className="w-full bg-[#FAF8EE] border border-black/10 rounded-xl px-4 py-3 text-xs text-[#0E1F38] placeholder:text-black/35 focus:border-[#FF5A65] focus:ring-1 focus:ring-[#FF5A65] focus:outline-none transition-all shadow-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-[#0E1F38]/60">Origin City</label>
                          <input
                            type="text"
                            placeholder="Delhi, Mumbai, Jaipur, etc."
                            value={originCity}
                            onChange={e => setOriginCity(e.target.value)}
                            className="w-full bg-[#FAF8EE] border border-black/10 rounded-xl px-4 py-3 text-xs text-[#0E1F38] placeholder:text-black/35 focus:border-[#FF5A65] focus:ring-1 focus:ring-[#FF5A65] focus:outline-none transition-all shadow-sm"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* India Warehouse Select */}
                  <div className="space-y-4 pt-4 border-t border-black/5">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-[#0E1F38]/60">Select India Warehouse Hub</label>
                      <select
                        value={selectedWarehouse}
                        onChange={e => setSelectedWarehouse(e.target.value)}
                        className="w-full bg-[#FAF8EE] border border-black/10 rounded-xl px-4 py-3 text-xs text-[#0E1F38] focus:border-[#FF5A65] focus:ring-1 focus:ring-[#FF5A65] focus:outline-none transition-all shadow-sm cursor-pointer"
                      >
                        <option value="" disabled>Select nearest warehouse</option>
                        {warehouses.map(wh => (
                          <option key={wh.id} value={wh.id}>
                            {wh.city} ({wh.pincode || 'Hub'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Virtual address preview */}
                    {selectedWarehouseObject && (
                      <div className="p-5 rounded-2xl border border-[#FF5A65]/30 bg-[#FAF8EE] space-y-2 animate-fade-in relative overflow-hidden text-[#0E1F38]">
                        <span className="material-symbols-outlined absolute top-4 right-4 text-7xl text-[#FF5A65] opacity-5 pointer-events-none">
                          location_on
                        </span>
                        <div className="inline-block text-[9px] uppercase tracking-wider font-bold bg-[#FF5A65]/15 text-[#FF5A65] px-2.5 py-1 rounded">
                          Preview of your Virtual Address
                        </div>
                        <div className="text-xs space-y-1.5 text-[#0E1F38] leading-relaxed pt-1.5 font-mono">
                          <p><strong>Name:</strong> {user?.user_metadata?.full_name || 'Customer'} / LAYO-{user?.id?.substring(0, 5).toUpperCase() || 'LOCK'}</p>
                          <p><strong>Address:</strong> {selectedWarehouseObject.address}</p>
                          <p><strong>City/Pincode:</strong> {selectedWarehouseObject.city} - {selectedWarehouseObject.pincode || ''}</p>
                          <p><strong>Phone Number:</strong> {selectedWarehouseObject.contact || selectedWarehouseObject.phone || '+91 98100 12345'} <span className="text-[10px] text-[#FF5A65] font-sans font-semibold">(for courier &amp; order updates)</span></p>
                        </div>
                        <p className="text-[10px] text-[#0E1F38]/60 italic pt-1">
                          Copy coordinates and tags. Full instructions will be shared on successful payment.
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setCurrentStep(2)}
                    disabled={!selectedWarehouse}
                    className="w-full py-4 bg-[#FF5A65] text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-[#e24550] active:scale-[0.98] transition-all shadow-md shadow-[#FF5A65]/20 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Continue to Canada Destination
                  </button>
                </section>
              )}

              {/* STEP 2: Canada Destination */}
              {currentStep === 2 && (
                <section className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="text-lg font-black text-[#0E1F38] uppercase tracking-wider border-l-4 border-[#FF5A65] pl-3">
                        2. Delivery Address in Canada
                      </h3>
                      <p className="text-[#0E1F38]/60 text-xs mt-1 font-light">Provide drop-off address coordinates inside Canada.</p>
                    </div>
                    <button onClick={() => setCurrentStep(1)} className="text-xs text-[#FF5A65] font-bold hover:underline cursor-pointer">
                      Back
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-[#0E1F38]/60">Destination City</label>
                      <select
                        value={destinationCity}
                        onChange={e => setDestinationCity(e.target.value)}
                        className="w-full bg-[#FAF8EE] border border-black/10 rounded-xl px-4 py-3 text-xs text-[#0E1F38] focus:border-[#FF5A65] focus:ring-1 focus:ring-[#FF5A65] focus:outline-none transition-all shadow-sm cursor-pointer"
                      >
                        <option value="" disabled>Select Canada region</option>
                        {canadaCities.map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-[#0E1F38]/60">Full Delivery Street Address</label>
                      <input
                        type="text"
                        placeholder="Suite #, Street name, City, Postal Code"
                        value={destinationAddress}
                        onChange={e => setDestinationAddress(e.target.value)}
                        className="w-full bg-[#FAF8EE] border border-black/10 rounded-xl px-4 py-3.5 text-xs text-[#0E1F38] placeholder:text-black/35 focus:border-[#FF5A65] focus:ring-1 focus:ring-[#FF5A65] focus:outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setCurrentStep(3)}
                    disabled={!destinationCity || !destinationAddress}
                    className="w-full py-4 bg-[#FF5A65] text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-[#e24550] active:scale-[0.98] transition-all shadow-md shadow-[#FF5A65]/20 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Continue to Category Selection
                  </button>
                </section>
              )}

              {/* STEP 3: Category Grid Selection */}
              {currentStep === 3 && (
                <section className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="text-lg font-black text-[#0E1F38] uppercase tracking-wider border-l-4 border-[#FF5A65] pl-3">
                        3. Item Categories
                      </h3>
                      <p className="text-[#0E1F38]/60 text-xs mt-1 font-light">Select all categories containing items you wish to calculate.</p>
                    </div>
                    <button onClick={() => setCurrentStep(2)} className="text-xs text-[#FF5A65] font-bold hover:underline cursor-pointer">
                      Back
                    </button>
                  </div>

                  {/* 3x3 Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(categoryData).map(([key, val]) => {
                      const isSelected = selectedCategories.includes(key);
                      return (
                        <button
                          key={key}
                          onClick={() => handleToggleCategory(key)}
                          className={`rounded-2xl p-4 flex flex-col items-center justify-center gap-2 relative overflow-hidden h-32 border transition-all duration-300 active:scale-95 cursor-pointer shadow-sm ${
                            isSelected
                              ? 'border-[#FF5A65] bg-[#FF5A65]/10 text-[#FF5A65] ring-2 ring-[#FF5A65]/20'
                              : 'border-black/10 bg-[#FAF8EE] text-[#0E1F38]/70 hover:border-black/20 hover:text-[#0E1F38]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[#FF5A65] text-4xl leading-none">
                            {val.icon}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-center leading-tight">
                            {val.name}
                          </span>
                          <span className="material-symbols-outlined absolute -bottom-1 -right-1 text-5xl opacity-5 pointer-events-none text-[#FF5A65]">
                            {val.icon}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentStep(4)}
                    disabled={selectedCategories.length === 0}
                    className="w-full py-4 bg-[#FF5A65] text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-[#e24550] active:scale-[0.98] transition-all shadow-md shadow-[#FF5A65]/20 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Continue to Configuration
                  </button>
                </section>
              )}

              {/* STEP 4: Configure Items */}
              {currentStep === 4 && (
                <section className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="text-lg font-black text-[#0E1F38] uppercase tracking-wider border-l-4 border-[#FF5A65] pl-3">
                        4. Item Details &amp; Variables
                      </h3>
                      <p className="text-[#0E1F38]/60 text-xs mt-1 font-light">Configure subcategory quantity and optional details.</p>
                    </div>
                    <button onClick={() => setCurrentStep(3)} className="text-xs text-[#FF5A65] font-bold hover:underline cursor-pointer">
                      Back
                    </button>
                  </div>

                  <div className="space-y-6 divide-y divide-black/5">
                    {/* ── Auto-added Promo Category when items are added in any category ── */}
                    {activeItems.length > 0 && (
                      <div className="bg-[#E8F5E9] border-2 border-[#A5D6A7] rounded-2xl overflow-hidden shadow-sm animate-fade-in space-y-0">
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#C8E6C9] bg-[#DCEDC8]">
                          <div className="flex items-center gap-2.5">
                            <span className="material-symbols-outlined text-[#2E7D32] text-xl leading-none">workspace_premium</span>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-[#1B5E20] uppercase tracking-wider">
                                Free light weight items( max 50 gm)-
                              </span>
                              <span className="text-[9px] text-[#2E7D32] bg-white px-2 py-0.5 rounded-md font-black uppercase tracking-wider border border-[#C8E6C9]">
                                Limit: Max 5 Items
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="px-5 py-3.5 flex items-center justify-between gap-3 bg-white">
                          <div className="flex-grow min-w-0">
                            <p className="font-bold text-sm text-[#0E1F38]">
                              5 Small Cloths or Jewelry (Free)
                            </p>
                            <p className="text-[11px] text-[#0E1F38]/70 mt-0.5 font-light">
                              Socks, ties, handkerchiefs, innerwear, light earrings, chains (up to 50g each). Ships free!
                              {promoQty >= 5 && (
                                <span className="text-[#FF5A65] font-bold ml-1.5">· Limit of 5 reached</span>
                              )}
                            </p>
                          </div>

                          <div className="flex items-center gap-3.5 bg-[#FAF8EE] rounded-full p-1.5 border border-black/10 shadow-sm">
                            <button
                              onClick={() => setPromoQty(prev => Math.max(0, prev - 1))}
                              disabled={promoQty === 0}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                promoQty === 0 ? 'opacity-30 cursor-not-allowed text-[#0E1F38]/40' : 'bg-white hover:bg-black/5 text-[#0E1F38] active:scale-90 cursor-pointer shadow-xs'
                              }`}
                            >
                              <span className="material-symbols-outlined text-sm">remove</span>
                            </button>
                            <span className="w-5 text-center font-bold text-sm text-[#0E1F38]">{promoQty}</span>
                            <button
                              onClick={() => setPromoQty(prev => Math.min(5, prev + 1))}
                              disabled={promoQty >= 5}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                promoQty >= 5 ? 'opacity-30 cursor-not-allowed text-[#0E1F38]/40' : 'bg-white hover:bg-black/5 text-[#0E1F38] active:scale-90 cursor-pointer shadow-xs'
                              }`}
                              title={promoQty >= 5 ? 'Maximum limit of 5 free items reached' : undefined}
                            >
                              <span className="material-symbols-outlined text-sm">add</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedCategories.map(catKey => {
                      const cat = categoryData[catKey];
                      const activeDemo = activeDemoState[catKey] ?? 'Adult';
                      return (
                        <div key={catKey} className="pt-6 first:pt-0">
                          {/* Category header */}
                          <div className="flex items-start justify-between mb-4 gap-3">
                            <h4 className="text-xs font-black text-[#FF5A65] uppercase tracking-[0.2em] flex items-center gap-2 pt-0.5">
                              <span className="material-symbols-outlined text-base leading-none">{cat.icon}</span>
                              {cat.name}
                            </h4>

                            {/* Age tabs — one per category, same as estimator */}
                            {cat.requiresAge && (
                              <div className="flex items-center gap-1.5 bg-[#FAF8EE] rounded-full p-1 border border-black/10 flex-shrink-0">
                                {demographicOptions.map(opt => {
                                  const tabTotal = cat.subs.reduce((s, _, idx) =>
                                    s + (qtyState[`${catKey}-${idx}-${opt.label}`] ?? 0), 0);
                                  const isActive = activeDemo === opt.label;
                                  return (
                                    <button
                                      key={opt.label}
                                      onClick={() => handleDemoChange(catKey, opt.label)}
                                      className={`relative px-3 py-1.5 text-[9px] font-bold rounded-full transition-all cursor-pointer ${
                                        isActive
                                          ? 'bg-[#FF5A65] text-white shadow-sm'
                                          : 'text-[#0E1F38]/60 hover:text-[#0E1F38]'
                                      }`}
                                    >
                                      {opt.label}
                                      {tabTotal > 0 && !isActive && (
                                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#FF5A65] text-white text-[7px] font-black flex items-center justify-center">
                                          {tabTotal}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          <div className="space-y-3">
                            {cat.subs.map((sub, idx) => {
                              const rowKey = `${catKey}-${idx}`;
                              const currentQty = cat.requiresAge
                                ? (qtyState[`${rowKey}-${activeDemo}`] ?? 0)
                                : (qtyState[`${rowKey}-default`] ?? 0);
                              const totalQty = cat.requiresAge
                                ? demographicOptions.reduce((s, o) => s + (qtyState[`${rowKey}-${o.label}`] ?? 0), 0)
                                : currentQty;

                              return (
                                <div
                                  key={sub.name}
                                  className={`px-4 py-3.5 rounded-2xl border transition-all flex justify-between items-center ${
                                    totalQty > 0
                                      ? 'border-[#FF5A65]/30 bg-[#FF5A65]/5 border-l-4 border-l-[#FF5A65] text-[#0E1F38]'
                                      : 'border-black/10 bg-[#FAF8EE] text-[#0E1F38]'
                                  }`}
                                >
                                  <div className="flex-grow pr-4">
                                    <p className="font-bold text-sm text-[#0E1F38] flex items-center gap-1.5">
                                      {sub.name}
                                      {sub.promo && (
                                        <span className="text-[9px] text-[#2E7D32] bg-[#E8F5E9] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                          FREE (Max 50g · Max 5)
                                        </span>
                                      )}
                                      {(sub.oversized || sub.isRestricted || cat.isFoodGlobal) && (
                                        <span
                                          className="material-symbols-outlined text-xs text-[#FF5A65] leading-none cursor-help"
                                          title="Special shipping check required"
                                        >
                                          info
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-[10px] text-[#0E1F38]/60 mt-0.5 uppercase tracking-wider font-semibold">
                                      {sub.weight}g
                                      {sub.promo && currentQty >= 5 && (
                                        <span className="text-[#FF5A65] normal-case ml-1 font-medium">· Max 5 limit reached</span>
                                      )}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-3.5 bg-white rounded-full p-1.5 border border-black/10 shadow-sm">
                                    <button
                                      onClick={() => cat.requiresAge
                                        ? handleQtyChange(catKey, rowKey, -1, sub.promo)
                                        : setQtyState(prev => ({ ...prev, [`${rowKey}-default`]: Math.max(0, (prev[`${rowKey}-default`] ?? 0) - 1) }))}
                                      disabled={currentQty === 0}
                                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                        currentQty === 0 ? 'opacity-30 cursor-not-allowed text-[#0E1F38]/40' : 'hover:bg-black/5 text-[#0E1F38] active:scale-90 cursor-pointer'
                                      }`}
                                    >
                                      <span className="material-symbols-outlined text-sm leading-none">remove</span>
                                    </button>
                                    <span className="w-5 text-center font-bold text-sm text-[#0E1F38]">{currentQty}</span>
                                    <button
                                      onClick={() => {
                                        if (cat.requiresAge) {
                                          handleQtyChange(catKey, rowKey, 1, sub.promo);
                                        } else {
                                          setQtyState(prev => {
                                            const cur = prev[`${rowKey}-default`] ?? 0;
                                            let nxt = cur + 1;
                                            if (sub.promo && nxt > 5) nxt = 5;
                                            return { ...prev, [`${rowKey}-default`]: nxt };
                                          });
                                        }
                                      }}
                                      disabled={sub.promo && currentQty >= 5}
                                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                        sub.promo && currentQty >= 5
                                          ? 'opacity-30 cursor-not-allowed text-[#0E1F38]/40'
                                          : 'hover:bg-black/5 text-[#0E1F38] active:scale-90 cursor-pointer'
                                      }`}
                                      title={sub.promo && currentQty >= 5 ? 'Maximum limit of 5 free promo items reached' : undefined}
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
                  </div>

                  {/* Warnings alert panel */}
                  {warnings.length > 0 && (
                    <div className="space-y-2.5 p-4 rounded-2xl bg-[#FF5A65]/10 border border-[#FF5A65]/20">
                      {warnings.map((warn, index) => (
                        <p key={index} className="text-[10px] text-[#FF5A65] uppercase font-bold leading-tight tracking-wide">
                          {warn}
                        </p>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => setCurrentStep(5)}
                    disabled={activeItems.length === 0}
                    className="w-full py-4 bg-[#FF5A65] text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-[#e24550] active:scale-[0.98] transition-all shadow-md shadow-[#FF5A65]/20 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Continue to Summary
                  </button>
                </section>
              )}

              {/* STEP 5: Summary & Final Actions */}
              {currentStep === 5 && (
                <section className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="text-lg font-black text-[#0E1F38] uppercase tracking-wider border-l-4 border-[#FF5A65] pl-3">
                        5. Final Review &amp; Warehouse Actions
                      </h3>
                      <p className="text-[#0E1F38]/60 text-xs mt-1 font-light">Choose locker dispatch action before booking checkout.</p>
                    </div>
                    <button onClick={() => setCurrentStep(4)} className="text-xs text-[#FF5A65] font-bold hover:underline cursor-pointer">
                      Back
                    </button>
                  </div>

                  {/* Shipment Item Breakdown */}
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-[#0E1F38]/60 block">
                      Configured Packages list
                    </label>
                    <div className="space-y-2">
                      {activeItems.map(item => (
                        <div key={item.configKey} className="p-4 rounded-2xl border border-black/5 bg-[#FAF8EE] flex justify-between items-center shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white border border-black/10 flex items-center justify-center text-[#FF5A65] shadow-sm">
                              <span className="material-symbols-outlined text-xl leading-none">
                                {categoryData[item.category].icon}
                              </span>
                            </div>
                            <div>
                              <p className="font-bold text-xs text-[#0E1F38]">
                                {item.subcategory} <span className="text-[#FF5A65] ml-1 font-mono">x{item.qty}</span>
                              </p>
                              <p className="text-[9px] text-[#0E1F38]/60 uppercase tracking-wider font-bold mt-0.5">
                                {item.requiresAge ? `${item.demo} • ` : ''}{(item.weightGrams / 1000).toFixed(2)} kg
                              </p>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => setQtyState(prev => ({ ...prev, [item.demoKey]: 0 }))}
                            className="text-red-400 hover:text-red-600 transition-all p-1 cursor-pointer"
                            title="Remove subcategory"
                          >
                            <span className="material-symbols-outlined text-lg leading-none">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Warehouse dispatch selector (Free hold and combine) */}
                  <div className="p-5 rounded-2xl border border-black/5 bg-[#FAF8EE] space-y-4 shadow-sm">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-[#0E1F38] uppercase tracking-wider">Free 30-Day Hold &amp; Combine</h4>
                      <p className="text-[#0E1F38]/70 text-[11px] leading-relaxed font-light">
                        Shop at multiple stores! We can hold packages in India for up to 30 days and consolidate them to maximize transit savings.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5 pt-2">
                      <button
                        onClick={() => {
                          setWarehouseAction('ship');
                          setMorePackages(null);
                        }}
                        className={`p-3.5 rounded-xl border text-left font-bold text-xs transition-all cursor-pointer shadow-sm ${
                          warehouseAction === 'ship'
                            ? 'border-[#FF5A65] bg-[#FF5A65]/10 text-[#FF5A65] ring-2 ring-[#FF5A65]/20'
                            : 'border-black/10 bg-white text-[#0E1F38]/70 hover:border-black/20 hover:text-[#0E1F38]'
                        }`}
                      >
                        🚀 Ship immediately
                        <span className="text-[9px] text-[#0E1F38]/60 font-normal block pt-1 lowercase leading-tight">
                          forward package as soon as weights are verified at the hub.
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setWarehouseAction('hold');
                          setMorePackages(1);
                        }}
                        className={`p-3.5 rounded-xl border text-left font-bold text-xs transition-all cursor-pointer shadow-sm ${
                          warehouseAction === 'hold'
                            ? 'border-[#FF5A65] bg-[#FF5A65]/10 text-[#FF5A65] ring-2 ring-[#FF5A65]/20'
                            : 'border-black/10 bg-white text-[#0E1F38]/70 hover:border-black/20 hover:text-[#0E1F38]'
                        }`}
                      >
                        📦 Hold &amp; Combine
                        <span className="text-[9px] text-[#0E1F38]/60 font-normal block pt-1 lowercase leading-tight">
                          wait for incoming packages from other orders before exporting.
                        </span>
                      </button>
                    </div>

                    {/* How many packages expected input */}
                    {warehouseAction === 'hold' && (
                      <div className="pt-3 border-t border-black/5 space-y-2 animate-fade-in">
                        <label className="text-[10px] text-[#0E1F38] font-bold uppercase tracking-wider block">
                          How many more packages are you expecting?
                        </label>
                        <div className="flex gap-2">
                          {[1, 2, 3].map(num => (
                            <button
                              key={num}
                              onClick={() => setMorePackages(num)}
                              className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                morePackages === num
                                  ? 'bg-[#FF5A65] text-white border-[#FF5A65] shadow-sm'
                                  : 'bg-white border-black/10 text-[#0E1F38]/70 hover:border-black/20 hover:text-[#0E1F38]'
                              }`}
                            >
                              {num} package(s)
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Submission and drafts */}
                  <div className="flex gap-4 pt-4 border-t border-black/5">
                    <button
                      onClick={() => setShowDraftModal(true)}
                      className="flex-1 py-4 border border-black/20 text-[#0E1F38] font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-black/5 active:scale-95 transition-all cursor-pointer"
                    >
                      Save to Drafts
                    </button>
                    <button
                      onClick={handleProceedToCheckout}
                      disabled={activeItems.length === 0 || !selectedWarehouse || !destinationAddress}
                      className="flex-1 py-4 bg-[#FF5A65] text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-[#e24550] active:scale-[0.98] transition-all shadow-md shadow-[#FF5A65]/20 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Pay ${totals.totalPriceCAD > 0 ? totals.totalPriceCAD.toFixed(2) : '25.00'} CAD &amp; Book
                    </button>
                  </div>
                </section>
              )}

            </div>

            {/* Sidebar quote details panel */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Value Reclaimed savings banner */}
              {totals.valueReclaimed > 0 && (
                <div className="p-5 rounded-3xl bg-[#FF5A65]/10 border border-[#FF5A65]/25 text-center space-y-2.5 shadow-sm animate-fade-in relative overflow-hidden text-[#0E1F38]">
                  <div className="inline-block text-[9px] uppercase tracking-widest font-black bg-[#FF5A65] text-white px-2.5 py-1 rounded">
                    Arbitrage Advantage
                  </div>
                  <p className="text-sm text-[#0E1F38]">
                    Estimated Savings Reclaimed: <strong className="text-[#FF5A65] text-lg">~${totals.valueReclaimed} CAD</strong>!
                  </p>
                  <p className="text-[10px] text-[#0E1F38]/60 leading-tight font-light">
                    Leveraging localized Indian retail rates against standard Canadian markups.
                  </p>
                </div>
              )}

              {/* Quote card */}
              <div className="bg-white rounded-3xl border border-black/5 p-6 space-y-6 shadow-sm relative text-[#0E1F38]">
                <h3 className="text-base font-black text-[#0E1F38] uppercase tracking-wider border-b border-black/5 pb-3">
                  Shipment Quote Summary
                </h3>

                <div className="space-y-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#0E1F38]/60 font-medium">Total Configured Items</span>
                    <span className="text-[#0E1F38] font-bold font-mono">
                      {activeItems.reduce((sum, item) => sum + item.qty, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#0E1F38]/60 font-medium">Total Weight</span>
                    <span className="text-[#0E1F38] font-bold font-mono">
                      {activeItems.length === 0 ? '—' : totals.totalWeightGrams >= 1000
                        ? `${totals.totalWeightKg.toFixed(2)} kg`
                        : `${Math.round(totals.totalWeightGrams)} g`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#0E1F38]/60 font-medium">Conversion Index</span>
                    <span className="text-[#0E1F38] font-bold font-mono">1 CAD = ₹{cadToInrRate.toFixed(2)} INR</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#0E1F38]/60 font-medium">Base Dispatch Floor</span>
                    <span className="text-[#0E1F38] font-semibold">{activeItems.length === 0 ? '—' : '$25.00 CAD'}</span>
                  </div>

                  <div className="h-px bg-black/5 my-2"></div>

                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-[#0E1F38] font-bold">Estimated Unified Fee</span>
                    <div className="text-right">
                      {activeItems.length === 0 ? (
                        <p className="text-[#0E1F38]/60 text-sm font-semibold">Add items to see quote</p>
                      ) : (
                        <>
                          <p className="text-2xl font-black text-[#FF5A65] font-mono">
                            ${totals.totalPriceCAD.toFixed(2)}
                            <span className="text-xs font-normal text-[#0E1F38]/60 ml-1 font-sans">CAD</span>
                          </p>
                          <span className="text-[10px] text-[#0E1F38]/60 font-bold font-mono block">
                            ≈ ₹{totals.totalPriceINR.toLocaleString()} INR
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-center text-[10px] text-[#0E1F38]/70 bg-[#FAF8EE] p-3 rounded-2xl border border-black/5 leading-tight">
                  <span className="material-symbols-outlined text-sm leading-none text-[#FF5A65]">security</span>
                  End-to-End Insured &amp; Encrypted Dispatch
                </div>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* ── Save Draft intercept Dialog Modal ── */}
      {showDraftModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white border border-black/10 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-fade-in relative text-[#0E1F38]">
            <button 
              onClick={() => setShowDraftModal(false)}
              className="absolute right-4 top-4 text-[#0E1F38]/60 hover:text-[#0E1F38] transition-all text-xl cursor-pointer"
            >
              ×
            </button>
            <div className="space-y-1">
              <span className="text-[10px] text-[#FF5A65] uppercase font-bold tracking-widest block">Save Progress?</span>
              <h3 className="text-lg font-black text-[#0E1F38]">Save Shipment as Draft</h3>
            </div>
            <p className="text-[#0E1F38]/70 text-xs leading-relaxed font-light">
              We detected unsaved locker coordinates and item variables. Would you like to log these details as a draft shipment in your profile for later check?
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={saveDraft}
                className="flex-1 py-3.5 bg-[#FF5A65] text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-[#e24550] active:scale-95 transition-all shadow-md shadow-[#FF5A65]/20 cursor-pointer"
              >
                Save as Draft
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('layo_pending_shipment');
                  setShowDraftModal(false);
                  router.push('/');
                }}
                className="flex-1 py-3.5 border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs uppercase tracking-widest rounded-2xl transition-all cursor-pointer"
              >
                No, Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile representation Bottom Nav Bar ── */}
      <footer className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 bg-[#FAF8EE]/95 backdrop-blur border-t border-black/10 rounded-t-2xl shadow-lg">
        <button onClick={() => router.push('/')} className="flex flex-col items-center justify-center text-[#0E1F38]/70 hover:text-[#0E1F38]">
          <span className="material-symbols-outlined">home</span>
          <span className="text-[9px] mt-0.5 font-medium">Home</span>
        </button>
        <button onClick={() => { setActiveTab('new'); setCurrentStep(1); }} className="flex flex-col items-center justify-center text-[#FF5A65]">
          <span className="material-symbols-outlined">calculate</span>
          <span className="text-[9px] mt-0.5 font-bold">Calculate</span>
        </button>
        <button onClick={() => router.push('/')} className="flex flex-col items-center justify-center text-[#0E1F38]/70 hover:text-[#0E1F38]">
          <span className="material-symbols-outlined">person</span>
          <span className="text-[9px] mt-0.5 font-medium">Profile</span>
        </button>
      </footer>

    </div>
  );
}

