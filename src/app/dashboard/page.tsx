'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { useAuth } from '@/components/AuthProvider';
import { supabase, insertShipment, fetchShipments, parseShipment } from '@/lib/supabase';

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
    name: 'Bags & Luggage',
    icon: 'work',
    subs: [
      { name: 'Small Bag', weight: 300 },
      { name: 'Medium Bag', weight: 800 },
      { name: 'Luggage', weight: 3000, oversized: true }
    ]
  },
  jewelry: {
    name: 'Jewelry & Accessories',
    icon: 'diamond',
    subs: [
      { name: 'Structured Jewelry', weight: 200 }
    ]
  },
  beauty: {
    name: 'Beauty & Personal Care',
    icon: 'face_3',
    subs: [
      { name: 'Light Cosmetics', weight: 80 },
      { name: 'Heavy Beauty', weight: 400 }
    ]
  },
  home: {
    name: 'Home, Kitchen & Living',
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
    name: 'Toys, Games & Kids Gear',
    icon: 'smart_toy',
    subs: [
      { name: 'Small Toy', weight: 300 },
      { name: 'Standard Toy', weight: 1200 },
      { name: 'Wooden Toy', weight: 2500 },
      { name: 'Oversized Toy', weight: 5000, oversized: true }
    ]
  },
  books: {
    name: 'Books, Documents & Media',
    icon: 'menu_book',
    subs: [
      { name: 'Documents', weight: 200 },
      { name: 'Light Book', weight: 400 },
      { name: 'Standard Book', weight: 1000 },
      { name: 'Heavy Book', weight: 2500 }
    ]
  },
  food: {
    name: 'Food, Snacks & Groceries',
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
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentBanner, setPaymentBanner] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

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

  // Check for return from Stripe Checkout
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');
      const paymentStatus = params.get('payment_status');

      if (paymentStatus === 'success' && sessionId) {
        // Verify Stripe session with server
        fetch(`/api/stripe/verify-session?session_id=${sessionId}`)
          .then(res => res.json())
          .then(async (data) => {
            if (data.verified) {
              const shipmentId = data.metadata?.shipment_id;
              if (shipmentId) {
                await supabase
                  .from('shipments')
                  .update({
                    status: 'paid',
                    payment_method: 'stripe',
                    stage_timestamps: { paid: new Date().toISOString() },
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', shipmentId);
              }
              localStorage.removeItem('layo_pending_shipment');
              localStorage.removeItem('layo_pending_shipment_draft');
              setPaymentBanner({
                type: 'success',
                message: `Payment of $${data.amountTotal ? data.amountTotal.toFixed(2) : ''} CAD confirmed via Stripe! Your shipment is active and dispatched to our Indian locker hub.`
              });
              setActiveTab('history');
              if (user?.id) fetchDashboardData(user.id);
            } else {
              setPaymentBanner({
                type: 'warning',
                message: 'Stripe payment could not be automatically confirmed. Please contact support if your card was charged.'
              });
            }
          })
          .catch(err => {
            console.error('Failed to verify stripe session:', err);
          })
          .finally(() => {
            window.history.replaceState({}, document.title, window.location.pathname);
          });
      } else if (paymentStatus === 'cancelled') {
        setPaymentBanner({
          type: 'warning',
          message: 'Stripe payment was cancelled. Your locker booking items and address have been preserved in drafts.'
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Reset wizard cleanly when starting a new order
  const handleStartNewOrder = () => {
    setEditingDraftId(null);
    setSelectedCategories([]);
    setQtyState({});
    setActiveDemoState({});
    setPromoQty(0);
    setOrderNumber('');
    setDestinationAddress('');
    setStoreName('');
    setSenderName('');
    setCurrentStep(1);
    setActiveTab('new');
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

  // Checkout & Direct Booking Logic via Stripe
  const handleProceedToCheckout = async () => {
    if (originType === 'online' && !orderNumber.trim()) {
      setShowOrderNumberError(true);
      setCurrentStep(1);
      return;
    }

    if (activeItems.length === 0 || !selectedWarehouse || !destinationAddress) {
      return;
    }

    setIsProcessingPayment(true);

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

    try {
      let targetShipmentId = editingDraftId;

      if (editingDraftId) {
        // Upgrade / sync existing draft
        await supabase
          .from('shipments')
          .update({
            destination_city: destinationCity || 'Toronto (GTA)',
            destination_address: destinationAddress || '',
            india_warehouse: selectedWarehouse || 'Delhi NCR Hub',
            external_order_id: orderNumber || null,
            total_weight: totals.totalWeightKg,
            total_cost: totals.totalPriceINR,
            items: itemsPayload,
            payment_method: 'stripe',
            status: 'Draft Estimate',
            updated_at: new Date().toISOString()
          })
          .eq('id', editingDraftId);
      } else {
        // Create draft shipment linked to this payment
        const { data } = await insertShipment({
          user_id: user?.id,
          mode: originType === 'online' ? 'Online Retailer' : 'Personal Goods',
          destination_city: destinationCity || 'Toronto (GTA)',
          destination_address: destinationAddress || 'Canada',
          india_warehouse: selectedWarehouse || 'Delhi NCR Hub',
          external_order_id: orderNumber || null,
          total_weight: totals.totalWeightKg,
          total_cost: totals.totalPriceINR,
          items: itemsPayload,
          status: 'Draft Estimate',
          payment_method: 'stripe',
        });
        if (data && data[0]) {
          targetShipmentId = data[0].id;
        }
      }

      // Initialize Stripe Checkout Session
      const amountCAD = totals.totalPriceCAD > 0 ? totals.totalPriceCAD : 25.0;
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCAD: amountCAD.toFixed(2),
          shipmentId: targetShipmentId,
          userId: user?.id,
          userEmail: user?.email,
          destinationCity: destinationCity || 'Canada',
          destinationAddress: destinationAddress || '',
          warehouseName: selectedWarehouseObject?.name || selectedWarehouse || 'Indian Locker Hub',
          totalWeightKg: totals.totalWeightKg,
          itemCount: activeItems.reduce((sum, item) => sum + item.qty, 0),
          itemsSummary: activeItems.map(i => `${i.qty}x ${i.subcategory}`).join(', '),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to initialize Stripe checkout');
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned from Stripe');
      }
    } catch (err: any) {
      console.error('Failed to complete Stripe booking initialization:', err);
      alert(`Payment Gateway Error: ${err.message || 'Could not connect to Stripe. Please try again.'}`);
      setIsProcessingPayment(false);
    }
  };

  // Pay existing draft directly via Stripe
  const handlePayDraftWithStripe = async (s: any) => {
    try {
      const approxCAD = s.total_cost && cadToInrRate > 0 ? (s.total_cost / cadToInrRate) : 25.0;
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCAD: approxCAD.toFixed(2),
          shipmentId: s.id,
          userId: user?.id,
          userEmail: user?.email,
          destinationCity: s.destination_city || 'Canada',
          destinationAddress: s.destination_address || '',
          warehouseName: s.india_warehouse || 'Indian Locker Hub',
          totalWeightKg: s.total_weight || 1.0,
          itemCount: Array.isArray(s.items) ? s.items.length : 1,
          itemsSummary: Array.isArray(s.items) ? s.items.map((i: any) => `${i.quantity || 1}x ${i.subcategory || i.category}`).join(', ') : 'Layo Shipment',
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Unable to open Stripe checkout.');
      }
    } catch (err: any) {
      alert(`Failed to start payment: ${err.message}`);
    }
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

  // Edit existing draft
  const handleEditDraft = (s: any) => {
    setEditingDraftId(s.id);
    if (s.destination_city) setDestinationCity(s.destination_city);
    if (s.destination_address) setDestinationAddress(s.destination_address);
    if (s.india_warehouse) setSelectedWarehouse(s.india_warehouse);
    if (s.external_order_id) setOrderNumber(s.external_order_id);

    // Restore items
    if (Array.isArray(s.items)) {
      const newQtyState: Record<string, number> = {};
      const newActiveDemoState: Record<string, string> = {};
      const catsWithItems = new Set<string>();

      s.items.forEach((it: any) => {
        if (it.category === 'promo') {
          setPromoQty(Math.min(5, it.quantity || 1));
          return;
        }
        const catKey = it.category;
        if (catKey && categoryData[catKey]) {
          catsWithItems.add(catKey);
          const subIndex = categoryData[catKey].subs.findIndex(
            (sub: any) => sub.name.toLowerCase() === (it.subcategory || '').toLowerCase()
          );
          const effectiveSubIdx = subIndex >= 0 ? subIndex : 0;
          const demo = it.demographic || 'Adult';
          const key = categoryData[catKey].requiresAge
            ? `${catKey}-${effectiveSubIdx}-${demo}`
            : `${catKey}-${effectiveSubIdx}-default`;
          newQtyState[key] = (newQtyState[key] || 0) + (it.quantity || 1);
          if (categoryData[catKey].requiresAge) {
            newActiveDemoState[catKey] = demo;
          }
        }
      });

      if (catsWithItems.size > 0) {
        setSelectedCategories(Array.from(catsWithItems));
      }
      setQtyState(newQtyState);
      setActiveDemoState(prev => ({ ...prev, ...newActiveDemoState }));
    }

    setActiveTab('new');
    setCurrentStep(4);
  };

  // Delete draft
  const handleDeleteDraft = async (shipmentId: string) => {
    if (!confirm('Are you sure you want to delete this draft shipment?')) return;
    try {
      const { error } = await supabase.from('shipments').delete().eq('id', shipmentId);
      if (error) throw error;
      setShipments(prev => prev.filter(s => s.id !== shipmentId));
    } catch (err: any) {
      alert(`Failed to delete draft: ${err.message}`);
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

      if (editingDraftId) {
        await supabase
          .from('shipments')
          .update({
            destination_city: destinationCity || 'Draft City',
            destination_address: destinationAddress || 'Draft Address',
            india_warehouse: selectedWarehouse || null,
            external_order_id: orderNumber || null,
            total_weight: totals.totalWeightKg,
            total_cost: totals.totalPriceINR,
            items: itemsPayload,
            status: 'Draft Estimate',
            updated_at: new Date().toISOString()
          })
          .eq('id', editingDraftId);

        setShipments(prev =>
          prev.map(s =>
            s.id === editingDraftId
              ? {
                  ...s,
                  destination_city: destinationCity || 'Draft City',
                  destination_address: destinationAddress || 'Draft Address',
                  india_warehouse: selectedWarehouse || null,
                  external_order_id: orderNumber || null,
                  total_weight: totals.totalWeightKg,
                  total_cost: totals.totalPriceINR,
                  items: itemsPayload,
                }
              : s
          )
        );
        setEditingDraftId(null);
      } else {
        const { data } = await insertShipment({
          user_id: user?.id,
          mode: originType === 'online' ? 'Online Retailer' : 'Personal Goods',
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
        if (data && data[0]) {
          const parsed = parseShipment(data[0]);
          setShipments(prev => [parsed, ...prev.filter(x => x.id !== parsed.id)]);
        }
        if (user?.id) {
          fetchDashboardData(user.id);
        }
      }
    } catch (err) {
      console.error('Failed to save draft shipment:', err);
    } finally {
      localStorage.removeItem('layo_pending_shipment');
      setShowDraftModal(false);
      setActiveTab('history');
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
        
        {/* Payment Banner Notice */}
        {paymentBanner && (
          <div className={`mb-6 p-4 rounded-2xl border flex items-center justify-between gap-3 animate-fade-in ${
            paymentBanner.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' :
            paymentBanner.type === 'warning' ? 'bg-amber-50 border-amber-300 text-amber-900' :
            'bg-red-50 border-red-300 text-red-900'
          }`}>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl">
                {paymentBanner.type === 'success' ? 'check_circle' : 'info'}
              </span>
              <p className="text-sm font-semibold leading-snug">{paymentBanner.message}</p>
            </div>
            <button
              onClick={() => setPaymentBanner(null)}
              className="text-xs font-bold uppercase tracking-wider opacity-60 hover:opacity-100 px-2 py-1 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

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
            onClick={handleStartNewOrder}
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
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <h2 className="text-2xl font-black text-[#0E1F38] text-center sm:text-left">Track Your Shipments</h2>
              <button
                onClick={handleStartNewOrder}
                className="self-center sm:self-auto px-5 py-2.5 bg-[#FF5A65] text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-[#e24550] transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Book New Shipment
              </button>
            </div>
            {shipments.length === 0 ? (
              <div className="bg-white border border-black/5 rounded-3xl p-12 text-center space-y-4 shadow-sm">
                <span className="material-symbols-outlined text-6xl text-[#0E1F38]/30">inventory_2</span>
                <h3 className="text-lg font-bold text-[#0E1F38]">No shipments yet</h3>
                <p className="text-[#0E1F38]/60 text-sm max-w-sm mx-auto font-light">
                  Start generating quotes and book your first virtual locker address to begin international tracking.
                </p>
                <button
                  onClick={handleStartNewOrder}
                  className="bg-[#FF5A65] text-white font-bold text-xs uppercase tracking-widest px-6 py-3.5 rounded-2xl hover:bg-[#e24550] active:scale-95 transition-all shadow-md shadow-[#FF5A65]/20 mt-2 cursor-pointer"
                >
                  Book New Shipment
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {shipments.map(s => {
                  const STEPS = ['paid', 'inwarded', 'repacked', 'in_transit', 'received_canada', 'out_for_delivery', 'delivered'];
                  const STEP_LABELS = ['Paid', 'India Hub', 'SOP Repack', 'Airfreight', 'Canada Hub', 'Local Dispatch', 'Delivered'];
                  const STATUS_COLORS: Record<string, string> = {
                    draft: '#64748b',
                    paid: '#f59e0b',
                    inwarded: '#8b5cf6',
                    arrived: '#8b5cf6',
                    qc_verified: '#3b82f6',
                    repacked: '#d97706',
                    bulk_consolidated: '#6366f1',
                    in_transit: '#059669',
                    shipped: '#059669',
                    received_canada: '#0d9488',
                    out_for_delivery: '#0284c7',
                    delivered: '#10b981'
                  };
                  const statusNormalized = s.status?.toLowerCase() ?? 'draft';
                  const isDraft = statusNormalized === 'draft' || statusNormalized === 'draft estimate';
                  
                  let currentIdx = -1;
                  if (!isDraft) {
                    if (STEPS.indexOf(statusNormalized) >= 0) {
                      currentIdx = STEPS.indexOf(statusNormalized);
                    } else if (statusNormalized === 'arrived' || statusNormalized === 'inwarded') {
                      currentIdx = 1;
                    } else if (statusNormalized === 'qc_verified') {
                      currentIdx = 2;
                    } else if (statusNormalized === 'bulk_consolidated' || statusNormalized === 'shipped') {
                      currentIdx = 3;
                    } else {
                      currentIdx = 0;
                    }
                  }

                  const getStageInfo = (st: string) => {
                    switch (st) {
                      case 'paid':
                        return {
                          title: 'Step 1 of 7: Payment Confirmed (Order Active)',
                          desc: 'Please ship your items from Myntra/Amazon/Ajio or local courier to your assigned Layo India Hub address below.',
                          badge: 'Paid · Awaiting India Hub',
                          color: '#f59e0b',
                          bg: '#fffbeb',
                          border: '#fef3c7'
                        };
                      case 'arrived':
                      case 'inwarded':
                        return {
                          title: 'Step 2 of 7: Received at India Hub (Delhi NCR)',
                          desc: 'Your package has arrived safely at our Delhi Hub! Floor associates are matching physical contents against your declared checklist.',
                          badge: 'Received @ India Hub (DEL)',
                          color: '#8b5cf6',
                          bg: '#f5f3ff',
                          border: '#ede9fe'
                        };
                      case 'qc_verified':
                        return {
                          title: 'Step 3 of 7: QC Verified & Unboxing Photographed',
                          desc: 'All items matched against your declaration with zero discrepancies. Unboxing photos logged.',
                          badge: 'QC Matched & Photographed',
                          color: '#3b82f6',
                          bg: '#eff6ff',
                          border: '#dbeafe'
                        };
                      case 'repacked':
                        return {
                          title: 'Step 4 of 7: Layo SOP Repacked',
                          desc: 'Merchant waste boxes removed, folded, and sealed in standard Layo Green Box. Gross scale weight verified.',
                          badge: 'Layo SOP Repacked',
                          color: '#d97706',
                          bg: '#fffbeb',
                          border: '#fef3c7'
                        };
                      case 'bulk_consolidated':
                        return {
                          title: 'Step 4 of 7: Packed into Master Cargo Crate',
                          desc: `Bundled with Canada-bound cargo in Master Box ${s.master_box_id || 'BATCH-CA-801'} for bulk freight savings.`,
                          badge: 'In Master Cargo Box',
                          color: '#6366f1',
                          bg: '#eef2ff',
                          border: '#e0e7ff'
                        };
                      case 'in_transit':
                      case 'shipped':
                        return {
                          title: 'Step 5 of 7: Bulk Airfreight in Flight to Canada',
                          desc: 'Master Air Cargo pallet in flight from Delhi (DEL) to Toronto Pearson Airport (YYZ).',
                          badge: 'Airfreight to Canada',
                          color: '#059669',
                          bg: '#ecfdf5',
                          border: '#d1fae5'
                        };
                      case 'received_canada':
                        return {
                          title: 'Step 6 of 7: Received at Layo Canada Hub (Toronto)',
                          desc: 'Bulk crate de-consolidated and individual customer box sorted for Canadian local delivery.',
                          badge: 'Received @ Canada Hub (YYZ)',
                          color: '#0d9488',
                          bg: '#f0fdfa',
                          border: '#ccfbf1'
                        };
                      case 'out_for_delivery':
                        return {
                          title: 'Step 7 of 7: Out for Local Canadian Delivery',
                          desc: `Dispatched with ${s.canada_local_carrier || 'Canada Post'} · AWB: ${s.canada_local_awb || 'CP-TRACKING'}.`,
                          badge: 'Local Courier Dispatch',
                          color: '#0284c7',
                          bg: '#f0f9ff',
                          border: '#e0f2fe'
                        };
                      case 'delivered':
                        return {
                          title: 'Order Completed: Delivered to Doorstep',
                          desc: 'Your parcel has been delivered to your Canadian address. Thank you for shipping with Layo!',
                          badge: 'Delivered in Canada',
                          color: '#10b981',
                          bg: '#ecfdf5',
                          border: '#d1fae5'
                        };
                      default:
                        return {
                          title: 'Draft Estimate (Awaiting Payment)',
                          desc: 'Your shipment estimate is saved as a draft. Click below to pay and start your shipping journey.',
                          badge: 'Draft Estimate',
                          color: '#64748b',
                          bg: '#f8fafc',
                          border: '#f1f5f9'
                        };
                    }
                  };

                  const stageInfo = getStageInfo(statusNormalized);
                  const matchedHub = warehouses.find(
                    w => w.city?.toLowerCase() === (s.india_warehouse || '').toLowerCase() ||
                         w.address?.toLowerCase().includes((s.india_warehouse || '').toLowerCase())
                  ) || warehouses[0] || { city: 'Delhi NCR Hub', address: 'Plot 42, Udyog Vihar Phase 4, Gurugram', pincode: '122015', contact: '+91 98100 12345' };

                  return (
                    <div key={s.id} className="bg-white p-6 rounded-3xl border border-black/5 space-y-4 shadow-sm text-[#0E1F38]">
                      {/* Top Header */}
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span
                            className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border"
                            style={{
                              backgroundColor: stageInfo.bg,
                              borderColor: stageInfo.border,
                              color: stageInfo.color
                            }}
                          >
                            {stageInfo.badge}
                          </span>
                          <span className="font-mono text-xs font-bold text-[#0E1F38]/60 bg-[#FAF8EE] px-2 py-0.5 rounded">
                            #{s.id ? s.id.slice(0, 8).toUpperCase() : 'LOCKER'}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#0E1F38]/50">
                          {s.created_at ? new Date(s.created_at).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>

                      {/* Stepper tracker */}
                      <div className="relative pt-2">
                        <div className="absolute top-[13px] left-0 right-0 h-[2px] bg-black/5 -z-10"></div>
                        <div className="flex justify-between">
                          {STEPS.map((step, idx) => {
                            const isPassed = !isDraft && idx <= currentIdx;
                            const isCurrent = !isDraft && idx === currentIdx;
                            return (
                              <div key={step} className="flex flex-col items-center gap-1 flex-1 relative">
                                <div
                                  className="w-3.5 h-3.5 rounded-full transition-all border-2 border-transparent"
                                  style={{
                                    backgroundColor: isPassed ? STATUS_COLORS[statusNormalized] ?? '#64748b' : '#e2e8f0',
                                    boxShadow: isCurrent ? `0 0 10px ${STATUS_COLORS[statusNormalized] ?? '#64748b'}` : 'none'
                                  }}
                                />
                                <span 
                                  className={`text-[7px] uppercase tracking-wider font-bold text-center ${
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

                      {/* Current Stage Status Banner */}
                      <div
                        className="p-3.5 rounded-2xl border text-xs space-y-1"
                        style={{ backgroundColor: stageInfo.bg, borderColor: stageInfo.border }}
                      >
                        <p className="font-bold" style={{ color: stageInfo.color }}>
                          {stageInfo.title}
                        </p>
                        <p className="text-[11px] text-[#0E1F38]/75 leading-relaxed">
                          {stageInfo.desc}
                        </p>
                      </div>

                      {/* Declared Items List Breakdown */}
                      {Array.isArray(s.items) && s.items.length > 0 && (
                        <div className="bg-[#FAF8EE] p-3.5 rounded-2xl border border-black/5 space-y-2 text-xs">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-[#0E1F38]/60">
                            <span>📦 Declared Items ({s.items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0)})</span>
                            <span className="bg-white px-2 py-0.5 rounded border border-black/5">{s.mode || 'Online Retailer'}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {s.items.map((it: any, iIdx: number) => (
                              <span key={iIdx} className="px-2.5 py-1 bg-white border border-black/5 rounded-lg text-[11px] font-medium text-[#0E1F38] shadow-2xs">
                                {it.quantity || 1}x {it.subcategory || it.name || it.category} {it.demographic ? `(${it.demographic})` : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Assigned India Hub Address (when Paid or Inwarded) */}
                      {!isDraft && (statusNormalized === 'paid' || statusNormalized === 'inwarded' || statusNormalized === 'arrived') && (
                        <div className="p-3 bg-[#FAF8EE] rounded-2xl border border-black/5 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#0E1F38]/60">
                              📦 Ship Your Packages To:
                            </span>
                            <button
                              onClick={() => {
                                const addr = `Layo Locker (Locker #${s.id ? s.id.slice(0, 8).toUpperCase() : 'USER'})\n${matchedHub.address}\n${matchedHub.city} - ${matchedHub.pincode}\nPhone: ${matchedHub.contact || '+91 98100 12345'}`;
                                navigator.clipboard.writeText(addr);
                                alert('Warehouse Address copied! Paste this as delivery address on Myntra/Amazon.');
                              }}
                              className="text-[10px] bg-[#8BC34A] hover:bg-[#9ccc65] text-[#1B250F] font-black px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                              <span className="material-symbols-outlined text-xs">content_copy</span>
                              Copy Hub Address
                            </button>
                          </div>
                          <p className="font-mono text-[11px] text-[#0E1F38] leading-tight">
                            Layo Locker (Locker #{s.id ? s.id.slice(0, 8).toUpperCase() : ''})<br />
                            {matchedHub.address}, {matchedHub.city} - {matchedHub.pincode}
                          </p>
                        </div>
                      )}

                      {/* Local Carrier Tracking (Canada) */}
                      {(s.canada_local_carrier || s.canada_local_awb) && (
                        <div className="flex items-center justify-between p-3 bg-blue-50/80 rounded-2xl border border-blue-100 text-xs">
                          <div className="flex items-center gap-2 text-blue-950 font-bold">
                            <span className="material-symbols-outlined text-sm text-blue-600">local_shipping</span>
                            <span>{s.canada_local_carrier || 'Canada Local Dispatch'}</span>
                          </div>
                          {s.canada_local_awb && (
                            <span className="font-mono text-xs font-bold text-blue-700 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                              {s.canada_local_awb}
                            </span>
                          )}
                        </div>
                      )}

                      {/* QC Inspection Photos (if verified by warehouse ops) */}
                      {Array.isArray(s.qc_photos) && s.qc_photos.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <p className="text-[10px] font-black uppercase tracking-wider text-[#0E1F38]/60">
                            📸 Warehouse Unboxing Photos:
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {s.qc_photos.map((photo: any, pIdx: number) => (
                              <div key={pIdx} className="aspect-square rounded-xl overflow-hidden border border-black/10 bg-black/5">
                                <img src={photo.url} alt="QC Capture" className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Shipment Summary */}
                      <div className="border-t border-black/5 pt-3 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-sm text-[#0E1F38]">✈ {s.destination_city || 'Toronto (GTA)'}</h3>
                            <p className="text-xs text-[#0E1F38]/70 leading-tight font-light">{s.destination_address || 'Delivery Address on File'}</p>
                          </div>
                          <div className="text-right text-xs">
                            <p className="font-mono text-[#0E1F38] font-bold">{s.total_weight || 1.0} kg</p>
                            <p className="text-[#FF5A65] font-bold">₹{(s.total_cost || 0).toLocaleString()}</p>
                          </div>
                        </div>

                        {s.external_order_id && (
                          <p className="text-[10px] text-[#0E1F38]/80 bg-[#FAF8EE] p-2.5 rounded-xl border border-black/5 font-mono">
                            <strong>Reference Order:</strong> {s.external_order_id}
                          </p>
                        )}

                        {/* Draft Controls */}
                        {isDraft && (
                          <div className="space-y-2 pt-3 border-t border-black/5">
                            <button
                              onClick={() => handlePayDraftWithStripe(s)}
                              className="w-full py-3 bg-[#FF5A65] text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-[#e24550] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-[#FF5A65]/20"
                            >
                              <span className="material-symbols-outlined text-sm">lock</span>
                              Pay ${s.total_cost && cadToInrRate > 0 ? (s.total_cost / cadToInrRate).toFixed(2) : '25.00'} CAD via Stripe &amp; Dispatch
                            </button>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditDraft(s)}
                                className="flex-1 py-2 bg-black/5 hover:bg-black/10 text-[#0E1F38] font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-sm">edit_square</span>
                                Edit Items
                              </button>
                              <button
                                onClick={() => handleDeleteDraft(s.id)}
                                className="p-2 bg-black/5 hover:bg-red-50 text-black/60 hover:text-red-600 font-bold rounded-xl border border-black/5 transition-all flex items-center justify-center cursor-pointer"
                                title="Delete Draft"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                            </div>
                          </div>
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
                      <div className="p-5 rounded-2xl border border-[#FF5A65]/30 bg-[#FAF8EE] space-y-3 animate-fade-in relative overflow-hidden text-[#0E1F38]">
                        <span className="material-symbols-outlined absolute top-4 right-4 text-7xl text-[#FF5A65] opacity-5 pointer-events-none">
                          location_on
                        </span>
                        
                        <div className="flex items-center justify-between gap-2 relative z-10">
                          <div className="inline-block text-[9px] uppercase tracking-wider font-bold bg-[#FF5A65]/15 text-[#FF5A65] px-2.5 py-1 rounded">
                            Preview of your Virtual Address
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              const nameStr = `${user?.user_metadata?.full_name || 'Customer'} / LAYO-${user?.id?.substring(0, 5).toUpperCase() || 'LOCK'}`;
                              const addrStr = `Name: ${nameStr}\nAddress: ${selectedWarehouseObject.address}\nCity/Pincode: ${selectedWarehouseObject.city} - ${selectedWarehouseObject.pincode || ''}\nPhone: ${selectedWarehouseObject.contact || selectedWarehouseObject.phone || '+91 98100 12345'}`;
                              navigator.clipboard.writeText(addrStr);
                              setCopiedAddress(true);
                              setTimeout(() => setCopiedAddress(false), 2000);
                            }}
                            className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                              copiedAddress
                                ? 'bg-green-600 text-white'
                                : 'bg-[#FF5A65] hover:bg-[#e24550] text-white active:scale-95'
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm leading-none">
                              {copiedAddress ? 'check' : 'content_copy'}
                            </span>
                            <span>{copiedAddress ? 'Copied!' : 'Copy Address'}</span>
                          </button>
                        </div>

                        <div className="text-xs space-y-1.5 text-[#0E1F38] leading-relaxed pt-1 font-mono relative z-10">
                          <p><strong>Name:</strong> {user?.user_metadata?.full_name || 'Customer'} / LAYO-{user?.id?.substring(0, 5).toUpperCase() || 'LOCK'}</p>
                          <p><strong>Address:</strong> {selectedWarehouseObject.address}</p>
                          <p><strong>City/Pincode:</strong> {selectedWarehouseObject.city} - {selectedWarehouseObject.pincode || ''}</p>
                          <p><strong>Phone Number:</strong> {selectedWarehouseObject.contact || selectedWarehouseObject.phone || '+91 98100 12345'} <span className="text-[10px] text-[#FF5A65] font-sans font-semibold">(for courier &amp; order updates)</span></p>
                        </div>
                        <p className="text-[10px] text-[#0E1F38]/60 italic pt-1 relative z-10">
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
                              5 Light Weight Items (Free)
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
                      disabled={isProcessingPayment}
                      className="flex-1 py-4 border border-black/20 text-[#0E1F38] font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-black/5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                      Save to Drafts
                    </button>
                    <button
                      onClick={handleProceedToCheckout}
                      disabled={activeItems.length === 0 || !selectedWarehouse || !destinationAddress || isProcessingPayment}
                      className="flex-1 py-4 bg-[#FF5A65] text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-[#e24550] active:scale-[0.98] transition-all shadow-md shadow-[#FF5A65]/20 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                    >
                      {isProcessingPayment ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Redirecting to Stripe…</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">lock</span>
                          <span>Pay ${totals.totalPriceCAD > 0 ? totals.totalPriceCAD.toFixed(2) : '25.00'} CAD &amp; Book</span>
                        </>
                      )}
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

