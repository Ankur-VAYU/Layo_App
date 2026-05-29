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
      { name: 'Promo Acc', weight: 25, promo: true }
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
      { name: 'Promo Jewelry', weight: 25, promo: true },
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
          { id: 'wh1', city: 'Delhi', pincode: '110001', address: 'Plot 42, Layo Hub, Okhla Phase 3' },
          { id: 'wh2', city: 'Mumbai', pincode: '400001', address: 'Gala 5, Hub 2, Andheri East' }
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
  const handleQtyChange = (catKey: string, rowKey: string, delta: number) => {
    const demo = activeDemoState[catKey] ?? 'Adult';
    const fullKey = `${rowKey}-${demo}`;
    setQtyState(prev => ({
      ...prev,
      [fullKey]: Math.max(0, (prev[fullKey] ?? 0) + delta)
    }));
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

    const payload = {
      items: activeItems.map(i => ({
        category: i.category,
        subcategory: i.subcategory,
        quantity: i.qty,
        demographic: i.demo,
        weight: i.weightGrams / 1000,
      })),
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

  if (loading || isFetching) {
    return (
      <div className="min-h-screen bg-[#131313] text-on-background flex flex-col justify-center items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-on-surface-variant font-bold text-xs uppercase tracking-widest">Loading My Shipments…</p>
      </div>
    );
  }

  const selectedWarehouseObject = warehouses.find(w => w.id === selectedWarehouse);

  return (
    <div className="bg-[#131313] text-on-background min-h-screen flex flex-col font-sans selection:bg-primary selection:text-on-primary">
      
      {/* ── Top App Bar ── */}
      <header className="bg-surface/85 backdrop-blur border-b border-white/10 flex justify-between items-center w-full px-6 py-4 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Logo showTagline={false} onClick={handleLogoClick} />
        </div>
        <div className="flex items-center gap-6">
          <Link href="/" className="text-on-surface-variant hover:text-primary transition-colors text-sm font-semibold">Home</Link>
          {['admin@layo.com', 'ankur@layo.com'].includes(user?.email || '') && (
            <Link href="/admin" className="text-on-surface-variant hover:text-primary transition-colors text-sm font-semibold">Admin Portal</Link>
          )}
          <button 
            onClick={() => supabase.auth.signOut()} 
            className="text-error/80 hover:text-error text-xs font-bold uppercase tracking-wider border border-error/20 px-4 py-2 rounded-xl transition-all"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* ── Main Panel ── */}
      <main className="flex-grow w-full max-w-[1200px] mx-auto px-6 py-12">
        
        {/* Brand identity / Hero */}
        <div className="mb-12 text-center space-y-2">
          <h2 className="text-6xl font-extrabold tracking-tighter text-primary/10 select-none leading-none">LIO</h2>
          <p className="text-xl md:text-2xl font-bold text-white max-w-xl mx-auto">
            Precision calculation for your most exquisite assets.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex justify-center border-b border-white/10 mb-8 max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('new')}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === 'new' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-white'
            }`}
          >
            New Locker Order
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-white'
            }`}
          >
            My Shipments ({shipments.length})
          </button>
        </div>

        {activeTab === 'history' ? (
          /* ── MY SHIPMENTS / TRACKER TAB ── */
          <div className="space-y-6">
            <h2 className="text-2xl font-extrabold text-white text-center md:text-left">Track Your Shipments</h2>
            {shipments.length === 0 ? (
              <div className="glass-card border border-white/10 rounded-2xl p-12 text-center space-y-4">
                <span className="material-symbols-outlined text-6xl text-on-surface-variant opacity-30">inventory_2</span>
                <h3 className="text-lg font-bold text-white">No shipments yet</h3>
                <p className="text-on-surface-variant text-sm max-w-sm mx-auto">
                  Start generating quotes and book your first virtual locker address to begin international tracking.
                </p>
                <button
                  onClick={() => setActiveTab('new')}
                  className="bg-primary text-background font-bold text-xs uppercase tracking-widest px-6 py-3.5 rounded-xl hover:brightness-110 active:scale-95 transition-all mt-2"
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
                    <div key={s.id} className="glass-card p-6 rounded-2xl border border-white/10 space-y-4 shadow-xl">
                      <div className="flex justify-between items-center">
                        <span
                          className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                          style={{
                            backgroundColor: `${STATUS_COLORS[statusNormalized] ?? '#64748b'}20`,
                            color: STATUS_COLORS[statusNormalized] ?? '#64748b'
                          }}
                        >
                          {s.status || 'Paid'}
                        </span>
                        <span className="text-[11px] text-on-surface-variant opacity-60">
                          {new Date(s.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Stepper tracker */}
                      <div className="relative pt-2">
                        <div className="absolute top-[13px] left-0 right-0 h-[2px] bg-white/5 -z-10"></div>
                        <div className="flex justify-between">
                          {STEPS.map((step, idx) => {
                            const isPassed = idx <= currentIdx;
                            const isCurrent = idx === currentIdx;
                            return (
                              <div key={step} className="flex flex-col items-center gap-1.5 flex-1 relative">
                                <div
                                  className="w-3.5 h-3.5 rounded-full transition-all border-2 border-transparent"
                                  style={{
                                    backgroundColor: isPassed ? STATUS_COLORS[statusNormalized] ?? '#64748b' : '#222',
                                    boxShadow: isCurrent ? `0 0 10px ${STATUS_COLORS[statusNormalized] ?? '#64748b'}` : 'none'
                                  }}
                                />
                                <span 
                                  className={`text-[8px] uppercase tracking-widest font-bold ${
                                    isPassed ? 'text-white' : 'text-on-surface-variant opacity-40'
                                  }`}
                                >
                                  {STEP_LABELS[idx]}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="border-t border-white/5 pt-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-sm text-white">✈ {s.destination_city || 'Canada'}</h3>
                            <p className="text-xs text-on-surface-variant leading-tight opacity-75">{s.destination_address}</p>
                          </div>
                          <div className="text-right text-xs">
                            <p className="font-mono text-white font-bold">{s.total_weight} kg</p>
                            <p className="text-primary font-bold">₹{(s.total_cost || 0).toLocaleString()}</p>
                          </div>
                        </div>
                        {s.external_order_id && (
                          <p className="text-[10px] text-on-surface-variant bg-[#1A1A1A] p-2 rounded border border-white/5 font-mono">
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
            <div className="lg:col-span-8 bg-surface-container rounded-2xl border border-white/10 p-6 md:p-8 space-y-8 shadow-2xl relative">
              
              {/* Process Bar Header */}
              <nav className="border-b border-white/5 pb-6">
                <div className="flex justify-between items-center gap-1.5 max-w-md mx-auto">
                  {stepPills.map(step => {
                    const isPassed = step.id <= currentStep;
                    const isCurrent = step.id === currentStep;
                    return (
                      <button
                        key={step.id}
                        disabled={step.id > currentStep && activeItems.length === 0}
                        onClick={() => setCurrentStep(step.id)}
                        className={`flex flex-col items-center gap-2 flex-1 outline-none focus:outline-none transition-all ${
                          isCurrent ? 'step-active' : ''
                        }`}
                      >
                        <div 
                          className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                            isCurrent
                              ? 'bg-primary border-primary shadow-[0_0_10px_rgba(242,202,80,0.6)]'
                              : isPassed
                              ? 'bg-primary/60 border-primary/60'
                              : 'bg-white/20 border-transparent'
                          }`}
                        />
                        <span 
                          className={`text-[8px] uppercase tracking-widest font-bold text-center block ${
                            isCurrent ? 'text-primary' : isPassed ? 'text-white' : 'text-on-surface-variant opacity-40'
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
                    <h3 className="text-lg font-bold text-white uppercase tracking-wider border-l-4 border-primary pl-3">
                      1. Setup Virtual Address & Origin
                    </h3>
                    <p className="text-on-surface-variant text-xs mt-1">Specify drop-off point and details of incoming items.</p>
                  </div>

                  {/* Radios */}
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setOriginType('online')}
                      className={`p-4 rounded-xl border text-left font-bold text-xs uppercase tracking-wider transition-all flex flex-col gap-1 ${
                        originType === 'online'
                          ? 'border-primary bg-primary/5 text-primary shadow-[0_0_10px_rgba(242,202,80,0.1)]'
                          : 'border-white/10 bg-[#1A1A1A] text-on-surface-variant hover:border-white/20'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">shopping_cart</span>
                      Online Retailer Store
                    </button>
                    <button
                      onClick={() => setOriginType('personal')}
                      className={`p-4 rounded-xl border text-left font-bold text-xs uppercase tracking-wider transition-all flex flex-col gap-1 ${
                        originType === 'personal'
                          ? 'border-primary bg-primary/5 text-primary shadow-[0_0_10px_rgba(242,202,80,0.1)]'
                          : 'border-white/10 bg-[#1A1A1A] text-on-surface-variant hover:border-white/20'
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
                          <label className="text-[10px] uppercase font-bold text-on-surface-variant">Store Name</label>
                          <input
                            type="text"
                            placeholder="Amazon, Myntra, Ajio, etc."
                            value={storeName}
                            onChange={e => setStoreName(e.target.value)}
                            className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-primary focus:ring-0 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1 relative" id="orderNumberField">
                          <label className="text-[10px] uppercase font-bold text-on-surface-variant">Order Number</label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Order ID or Reference ID"
                              value={orderNumber}
                              onChange={e => {
                                setOrderNumber(e.target.value);
                                setShowOrderNumberError(false);
                              }}
                              className={`w-full bg-[#131313] border rounded-xl pl-4 pr-12 py-3 text-xs text-white focus:border-primary focus:ring-0 focus:outline-none ${
                                showOrderNumberError ? 'border-error' : 'border-white/10'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={handlePaste}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-primary hover:opacity-85 text-sm p-1"
                              title="Paste from clipboard"
                            >
                              📋
                            </button>
                          </div>
                          {showOrderNumberError && (
                            <p className="text-[10px] text-error font-semibold mt-1">
                              Please supply your Retailer Order Number so the hub can verify receipt.
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-on-surface-variant">Sender's Full Name</label>
                          <input
                            type="text"
                            placeholder="John Doe"
                            value={senderName}
                            onChange={e => setSenderName(e.target.value)}
                            className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-primary focus:ring-0 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-on-surface-variant">Origin City</label>
                          <input
                            type="text"
                            placeholder="Delhi, Mumbai, Jaipur, etc."
                            value={originCity}
                            onChange={e => setOriginCity(e.target.value)}
                            className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-primary focus:ring-0 focus:outline-none"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* India Warehouse Select */}
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-on-surface-variant">Select India Warehouse Hub</label>
                      <select
                        value={selectedWarehouse}
                        onChange={e => setSelectedWarehouse(e.target.value)}
                        className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-primary focus:ring-0 focus:outline-none"
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
                      <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 space-y-2 animate-fade-in relative overflow-hidden">
                        <span className="material-symbols-outlined absolute top-4 right-4 text-7xl text-primary opacity-5 pointer-events-none">
                          location_on
                        </span>
                        <div className="inline-block text-[9px] uppercase tracking-wider font-bold bg-primary/20 text-primary px-2.5 py-1 rounded">
                          Preview of your Virtual Address
                        </div>
                        <div className="text-xs space-y-1 text-white leading-relaxed pt-1.5">
                          <p><strong>Name:</strong> {user?.user_metadata?.full_name || 'Customer'} / LAYO-{user?.id?.substring(0, 5).toUpperCase() || 'LOCK'}</p>
                          <p><strong>Address:</strong> {selectedWarehouseObject.address}</p>
                          <p><strong>City/Pincode:</strong> {selectedWarehouseObject.city} - {selectedWarehouseObject.pincode || ''}</p>
                        </div>
                        <p className="text-[10px] text-on-surface-variant opacity-60 italic pt-1">
                          Copy coordinates and tags. Full instructions will be shared on successful payment.
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setCurrentStep(2)}
                    disabled={!selectedWarehouse}
                    className="w-full py-4 bg-primary text-background font-bold text-xs uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/10 disabled:opacity-35 disabled:cursor-not-allowed"
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
                      <h3 className="text-lg font-bold text-white uppercase tracking-wider border-l-4 border-primary pl-3">
                        2. Delivery Address in Canada
                      </h3>
                      <p className="text-on-surface-variant text-xs mt-1">Provide drop-off address coordinates inside Canada.</p>
                    </div>
                    <button onClick={() => setCurrentStep(1)} className="text-xs text-primary font-bold hover:underline">
                      Back
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-on-surface-variant">Destination City</label>
                      <select
                        value={destinationCity}
                        onChange={e => setDestinationCity(e.target.value)}
                        className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-primary focus:ring-0 focus:outline-none"
                      >
                        <option value="" disabled>Select Canada region</option>
                        {canadaCities.map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-on-surface-variant">Full Delivery Street Address</label>
                      <input
                        type="text"
                        placeholder="Suite #, Street name, City, Postal Code"
                        value={destinationAddress}
                        onChange={e => setDestinationAddress(e.target.value)}
                        className="w-full bg-[#131313] border border-white/10 rounded-xl px-4 py-3.5 text-xs text-white focus:border-primary focus:ring-0 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => setCurrentStep(3)}
                    disabled={!destinationCity || !destinationAddress}
                    className="w-full py-4 bg-primary text-background font-bold text-xs uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/10 disabled:opacity-35 disabled:cursor-not-allowed"
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
                      <h3 className="text-lg font-bold text-white uppercase tracking-wider border-l-4 border-primary pl-3">
                        3. Item Categories
                      </h3>
                      <p className="text-on-surface-variant text-xs mt-1">Select all categories containing items you wish to calculate.</p>
                    </div>
                    <button onClick={() => setCurrentStep(2)} className="text-xs text-primary font-bold hover:underline">
                      Back
                    </button>
                  </div>

                  {/* 3x3 Luxury Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(categoryData).map(([key, val]) => {
                      const isSelected = selectedCategories.includes(key);
                      return (
                        <button
                          key={key}
                          onClick={() => handleToggleCategory(key)}
                          className={`rounded-xl p-4 flex flex-col items-center justify-center gap-2 relative overflow-hidden h-32 border transition-all duration-300 active:scale-95 ${
                            isSelected
                              ? 'border-primary bg-primary/5 text-primary shadow-[0_0_15px_rgba(242,202,80,0.15)]'
                              : 'border-white/10 bg-[#1A1A1A]/70 text-on-surface-variant hover:border-white/20 hover:text-white'
                          }`}
                        >
                          <span className="material-symbols-outlined text-primary text-4xl leading-none">
                            {val.icon}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-center leading-tight">
                            {val.name}
                          </span>
                          <span className="material-symbols-outlined absolute -bottom-1 -right-1 text-5xl opacity-5 pointer-events-none text-primary">
                            {val.icon}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentStep(4)}
                    disabled={selectedCategories.length === 0}
                    className="w-full py-4 bg-primary text-background font-bold text-xs uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/10 disabled:opacity-35 disabled:cursor-not-allowed"
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
                      <h3 className="text-lg font-bold text-white uppercase tracking-wider border-l-4 border-primary pl-3">
                        4. Item Details & Variables
                      </h3>
                      <p className="text-on-surface-variant text-xs mt-1">Configure subcategory quantity and optional details.</p>
                    </div>
                    <button onClick={() => setCurrentStep(3)} className="text-xs text-primary font-bold hover:underline">
                      Back
                    </button>
                  </div>

                  <div className="space-y-6 divide-y divide-white/5">
                    {selectedCategories.map(catKey => {
                      const cat = categoryData[catKey];
                      const activeDemo = activeDemoState[catKey] ?? 'Adult';
                      return (
                        <div key={catKey} className="pt-6 first:pt-0">
                          {/* Category header */}
                          <div className="flex items-start justify-between mb-4 gap-3">
                            <h4 className="text-xs font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2 pt-0.5">
                              <span className="material-symbols-outlined text-base leading-none">{cat.icon}</span>
                              {cat.name}
                            </h4>

                            {/* Age tabs — one per category, same as estimator */}
                            {cat.requiresAge && (
                              <div className="flex items-center gap-1.5 bg-[#131313] rounded-full p-1 border border-white/10 flex-shrink-0">
                                {demographicOptions.map(opt => {
                                  const tabTotal = cat.subs.reduce((s, _, idx) =>
                                    s + (qtyState[`${catKey}-${idx}-${opt.label}`] ?? 0), 0);
                                  const isActive = activeDemo === opt.label;
                                  return (
                                    <button
                                      key={opt.label}
                                      onClick={() => handleDemoChange(catKey, opt.label)}
                                      className={`relative px-3 py-1.5 text-[9px] font-bold rounded-full transition-all ${
                                        isActive
                                          ? 'bg-primary text-background shadow-sm'
                                          : 'text-on-surface-variant hover:text-white'
                                      }`}
                                    >
                                      {opt.label}
                                      {tabTotal > 0 && !isActive && (
                                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-primary/80 text-background text-[7px] font-black flex items-center justify-center">
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
                                  className={`px-4 py-3.5 rounded-xl border transition-all flex justify-between items-center ${
                                    totalQty > 0
                                      ? 'border-primary/20 bg-surface-container-high border-l-4 border-l-primary'
                                      : 'border-white/10 bg-[#1A1A1A]/70'
                                  }`}
                                >
                                  <div className="flex-grow pr-4">
                                    <p className="font-bold text-sm text-white flex items-center gap-1.5">
                                      {sub.name}
                                      {(sub.oversized || sub.isRestricted || cat.isFoodGlobal) && (
                                        <span
                                          className="material-symbols-outlined text-xs text-primary leading-none cursor-help"
                                          title="Special shipping check required"
                                        >
                                          info
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-[10px] text-on-surface-variant opacity-70 mt-0.5 uppercase tracking-wider font-semibold">
                                      {sub.weight}g
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-3.5 bg-[#131313] rounded-full p-1.5 border border-white/10">
                                    <button
                                      onClick={() => cat.requiresAge
                                        ? handleQtyChange(catKey, rowKey, -1)
                                        : setQtyState(prev => ({ ...prev, [`${rowKey}-default`]: Math.max(0, (prev[`${rowKey}-default`] ?? 0) - 1) }))}
                                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5 text-white transition-all active:scale-90"
                                    >
                                      <span className="material-symbols-outlined text-sm leading-none">remove</span>
                                    </button>
                                    <span className="w-5 text-center font-bold text-sm text-white">{currentQty}</span>
                                    <button
                                      onClick={() => cat.requiresAge
                                        ? handleQtyChange(catKey, rowKey, 1)
                                        : setQtyState(prev => ({ ...prev, [`${rowKey}-default`]: (prev[`${rowKey}-default`] ?? 0) + 1 }))}
                                      className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5 text-white transition-all active:scale-90"
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
                    <div className="space-y-2.5 p-4 rounded-xl bg-primary/10 border border-primary/20">
                      {warnings.map((warn, index) => (
                        <p key={index} className="text-[10px] text-primary uppercase font-bold leading-tight tracking-wide">
                          {warn}
                        </p>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => setCurrentStep(5)}
                    disabled={activeItems.length === 0}
                    className="w-full py-4 bg-primary text-background font-bold text-xs uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/10 disabled:opacity-35 disabled:cursor-not-allowed"
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
                      <h3 className="text-lg font-bold text-white uppercase tracking-wider border-l-4 border-primary pl-3">
                        5. Final Review & Warehouse Actions
                      </h3>
                      <p className="text-on-surface-variant text-xs mt-1">Choose locker dispatch action before booking checkout.</p>
                    </div>
                    <button onClick={() => setCurrentStep(4)} className="text-xs text-primary font-bold hover:underline">
                      Back
                    </button>
                  </div>

                  {/* Shipment Item Breakdown */}
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block">
                      Configured Packages list
                    </label>
                    <div className="space-y-2">
                      {activeItems.map(item => (
                        <div key={item.configKey} className="p-4 rounded-xl border border-white/5 bg-[#1A1A1A] flex justify-between items-center shadow-inner">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[#131313] border border-white/10 flex items-center justify-center text-primary">
                              <span className="material-symbols-outlined text-xl leading-none">
                                {categoryData[item.category].icon}
                              </span>
                            </div>
                            <div>
                              <p className="font-bold text-xs text-white">
                                {item.subcategory} <span className="text-primary ml-1 font-mono">x{item.qty}</span>
                              </p>
                              <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-bold mt-0.5">
                                {item.requiresAge ? `${item.demo} • ` : ''}{(item.weightGrams / 1000).toFixed(2)} kg
                              </p>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => setQtyState(prev => ({ ...prev, [item.demoKey]: 0 }))}
                            className="text-error/60 hover:text-error transition-all p-1"
                            title="Remove subcategory"
                          >
                            <span className="material-symbols-outlined text-lg leading-none">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Warehouse dispatch selector (Free hold and combine) */}
                  <div className="p-5 rounded-xl border border-white/10 bg-[#1A1A1A] space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Free 30-Day Hold & Combine</h4>
                      <p className="text-on-surface-variant text-[11px] leading-relaxed">
                        Shop at multiple stores! We can hold packages in India for up to 30 days and consolidate them to maximize transit savings.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5 pt-2">
                      <button
                        onClick={() => {
                          setWarehouseAction('ship');
                          setMorePackages(null);
                        }}
                        className={`p-3.5 rounded-lg border text-left font-bold text-xs transition-all ${
                          warehouseAction === 'ship'
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-white/5 bg-[#131313] text-on-surface-variant hover:border-white/10'
                        }`}
                      >
                        🚀 Ship immediately
                        <span className="text-[9px] text-on-surface-variant/75 font-normal block pt-1 lowercase leading-tight">
                          forward package as soon as weights are verified at the hub.
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          setWarehouseAction('hold');
                          setMorePackages(1);
                        }}
                        className={`p-3.5 rounded-lg border text-left font-bold text-xs transition-all ${
                          warehouseAction === 'hold'
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-white/5 bg-[#131313] text-on-surface-variant hover:border-white/10'
                        }`}
                      >
                        📦 Hold & Combine
                        <span className="text-[9px] text-on-surface-variant/75 font-normal block pt-1 lowercase leading-tight">
                          wait for incoming packages from other orders before exporting.
                        </span>
                      </button>
                    </div>

                    {/* How many packages expected input */}
                    {warehouseAction === 'hold' && (
                      <div className="pt-3 border-t border-white/5 space-y-2 animate-fade-in">
                        <label className="text-[10px] text-white font-bold uppercase tracking-wider block">
                          How many more packages are you expecting?
                        </label>
                        <div className="flex gap-2">
                          {[1, 2, 3].map(num => (
                            <button
                              key={num}
                              onClick={() => setMorePackages(num)}
                              className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                                morePackages === num
                                  ? 'bg-primary text-background border-primary'
                                  : 'bg-[#131313] border-white/5 text-secondary hover:border-white/10'
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
                  <div className="flex gap-4 pt-4 border-t border-white/5">
                    <button
                      onClick={() => setShowDraftModal(true)}
                      className="flex-1 py-4 border border-white/20 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-white/5 active:scale-95 transition-all"
                    >
                      Save to Drafts
                    </button>
                    <button
                      onClick={handleProceedToCheckout}
                      disabled={activeItems.length === 0 || !selectedWarehouse || !destinationAddress}
                      className="flex-1 py-4 bg-primary text-background font-bold text-xs uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-35 disabled:cursor-not-allowed"
                    >
                      Pay Deposit & Book
                    </button>
                  </div>
                </section>
              )}

            </div>

            {/* Sidebar quote details panel */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Value Reclaimed savings banner */}
              {totals.valueReclaimed > 0 && (
                <div className="p-5 rounded-2xl bg-primary/10 border border-primary/20 text-center space-y-2.5 shadow-xl animate-fade-in relative overflow-hidden">
                  <div className="inline-block text-[9px] uppercase tracking-widest font-black bg-primary text-background px-2.5 py-1 rounded">
                    Arbitrage Advantage
                  </div>
                  <p className="text-sm text-white">
                    Estimated Savings Reclaimed: <strong className="text-primary text-lg">~${totals.valueReclaimed} CAD</strong>!
                  </p>
                  <p className="text-[10px] text-on-surface-variant leading-tight opacity-75">
                    Leveraging localized Indian retail rates against standard Canadian markups.
                  </p>
                </div>
              )}

              {/* Quote card */}
              <div className="glass-card rounded-2xl border border-white/10 p-6 space-y-6 shadow-2xl relative">
                <h3 className="text-base font-bold text-white uppercase tracking-wider border-b border-white/5 pb-3">
                  Shipment Quote Summary
                </h3>

                <div className="space-y-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant font-medium">Total Configured Items</span>
                    <span className="text-white font-bold font-mono">
                      {activeItems.reduce((sum, item) => sum + item.qty, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant font-medium">Total Weight</span>
                    <span className="text-white font-bold font-mono">
                      {activeItems.length === 0 ? '—' : totals.totalWeightGrams >= 1000
                        ? `${totals.totalWeightKg.toFixed(2)} kg`
                        : `${Math.round(totals.totalWeightGrams)} g`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant font-medium">Conversion Index</span>
                    <span className="text-white font-bold font-mono">1 CAD = ₹{cadToInrRate.toFixed(2)} INR</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant font-medium">Base Dispatch Floor</span>
                    <span className="text-white font-semibold">{activeItems.length === 0 ? '—' : '$25.00 CAD'}</span>
                  </div>

                  <div className="h-px bg-white/5 my-2"></div>

                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-white font-bold">Estimated Unified Fee</span>
                    <div className="text-right">
                      {activeItems.length === 0 ? (
                        <p className="text-on-surface-variant text-sm font-semibold">Add items to see quote</p>
                      ) : (
                        <>
                          <p className="text-2xl font-extrabold text-primary font-mono">
                            ${totals.totalPriceCAD.toFixed(2)}
                            <span className="text-xs font-normal text-on-surface-variant ml-1 font-sans">CAD</span>
                          </p>
                          <span className="text-[10px] text-on-surface-variant opacity-60 font-bold font-mono block">
                            ≈ ₹{totals.totalPriceINR.toLocaleString()} INR
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-center text-[10px] text-on-surface-variant bg-[#1A1A1A] p-3 rounded-xl border border-white/5 leading-tight">
                  <span className="material-symbols-outlined text-sm leading-none text-primary">security</span>
                  End-to-End Insured &amp; Encrypted Dispatch
                </div>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* ── Save Draft intercept Dialog Modal ── */}
      {showDraftModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-fade-in relative">
            <button 
              onClick={() => setShowDraftModal(false)}
              className="absolute right-4 top-4 text-on-surface-variant hover:text-white transition-all text-xl"
            >
              ×
            </button>
            <div className="space-y-1">
              <span className="text-[10px] text-primary uppercase font-bold tracking-widest block">Save Progress?</span>
              <h3 className="text-lg font-bold text-white">Save Shipment as Draft</h3>
            </div>
            <p className="text-on-surface-variant text-xs leading-relaxed">
              We detected unsaved locker coordinates and item variables. Would you like to log these details as a draft shipment in your profile for later check?
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={saveDraft}
                className="flex-1 py-3 bg-primary text-background font-bold text-xs uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-95 transition-all shadow shadow-primary/10"
              >
                Save as Draft
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('layo_pending_shipment');
                  setShowDraftModal(false);
                  router.push('/');
                }}
                className="flex-1 py-3 border border-white/20 text-error hover:bg-error/10 font-bold text-xs uppercase tracking-widest rounded-xl transition-all"
              >
                No, Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile representation Bottom Nav Bar ── */}
      <footer className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 bg-surface-container-low border-t border-white/10 rounded-t-xl shadow-[0_-20px_40px_rgba(0,0,0,0.4)]">
        <button onClick={() => router.push('/')} className="flex flex-col items-center justify-center text-on-surface-variant">
          <span className="material-symbols-outlined">home</span>
          <span className="text-[9px] mt-0.5">Home</span>
        </button>
        <button onClick={() => { setActiveTab('new'); setCurrentStep(1); }} className="flex flex-col items-center justify-center text-primary">
          <span className="material-symbols-outlined">calculate</span>
          <span className="text-[9px] mt-0.5">Calculate</span>
        </button>
        <button onClick={() => router.push('/')} className="flex flex-col items-center justify-center text-on-surface-variant">
          <span className="material-symbols-outlined">person</span>
          <span className="text-[9px] mt-0.5">Profile</span>
        </button>
      </footer>

    </div>
  );
}
