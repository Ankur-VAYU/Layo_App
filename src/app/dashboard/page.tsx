/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities, @next/next/no-img-element */
'use client';

// ── Imports ──────────────────────────────────────────────────────────────
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/components/AuthProvider';
import { supabase, insertShipment, fetchShipments, parseShipment, updateShipmentStage, clearUserSession, saveDraftEstimate, deleteDraftEstimate, fetchDraftEstimates, stringToUuid, isValidUuid } from '@/lib/supabase';
import { calculateLayoDeliveryCost, getPricingSettings, fetchLiveCadToInrRate, getActiveConversionRate } from '@/lib/delhiveryRates';
import { formatShipmentId, formatTransactionId, formatUserId, formatWarehouseId } from '@/lib/idGenerator';
import { loadMasterCategories } from '@/lib/categoryMatrix';

export const normalizeHoldGroupId = (raw: any): string => {
  if (!raw) return '';
  let str = String(raw).trim();
  while (str.startsWith('#') || str.toUpperCase().startsWith('HOLD-') || str.toUpperCase().startsWith('HOLD_')) {
    if (str.startsWith('#')) str = str.slice(1).trim();
    if (str.toUpperCase().startsWith('HOLD-')) str = str.slice(5).trim();
    if (str.toUpperCase().startsWith('HOLD_')) str = str.slice(5).trim();
  }
  str = str.toUpperCase().trim();
  if (!str) return '';
  return `HOLD-${str}`;
};

export const formatBoxDimensions = (raw: any): string => {
  if (!raw) return 'Standard Layo Green Box';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw !== null) {
    const l = raw.length ?? raw.l;
    const w = raw.width ?? raw.w;
    const h = raw.height ?? raw.h;
    if (l !== undefined && w !== undefined && h !== undefined) {
      return `${l} × ${w} × ${h} cm (Layo Box)`;
    }
    const vals = Object.values(raw).filter(v => typeof v === 'string' || typeof v === 'number');
    if (vals.length > 0) return `${vals.join(' × ')} cm`;
  }
  return 'Standard Layo Green Box';
};

export const getShipmentEstimatedWeight = (s: any): number => {
  if (!s) return 1.0;
  if (Array.isArray(s.shipments) && s.shipments.length > 0) {
    const groupSum = s.shipments.reduce((sum: number, it: any) => sum + getShipmentEstimatedWeight(it), 0);
    if (groupSum > 0) return Number(groupSum.toFixed(2));
  }
  const itemMeta = !Array.isArray(s.items) && typeof s.items === 'object' && s.items !== null ? s.items : null;
  const itemsList = Array.isArray(s.items) ? s.items : (Array.isArray(itemMeta?.items) ? itemMeta.items : []);
  if (itemsList.length > 0) {
    const declaredSum = itemsList.reduce((sum: number, it: any) => {
      const w = Number(it.weight) || 0;
      const q = Number(it.quantity) || 1;
      return sum + (w * q);
    }, 0);
    if (declaredSum > 0) return Number(declaredSum.toFixed(2));
  }
  if (itemMeta && itemMeta.estimated_weight !== undefined && itemMeta.estimated_weight !== null && Number(itemMeta.estimated_weight) > 0) {
    return Number(Number(itemMeta.estimated_weight).toFixed(2));
  }
  if (s.estimated_weight !== undefined && s.estimated_weight !== null && Number(s.estimated_weight) > 0) {
    return Number(Number(s.estimated_weight).toFixed(2));
  }
  if (s.total_weight !== undefined && s.total_weight !== null && Number(s.total_weight) > 0) {
    return Number(Number(s.total_weight).toFixed(2));
  }
  return 1.0;
};

export const getHoldGroupKey = (s: any): string | null => {
  if (!s) return null;
  const st = String(s.status || '').toLowerCase();

  const rawHold = s.raw_hold_group_id || s.stage_timestamps?.raw_hold_group_id || s.items?.raw_hold_group_id;
  if (rawHold && String(rawHold).trim()) {
    return normalizeHoldGroupId(rawHold);
  }

  if (s.hold_group_id) {
    const holdStr = String(s.hold_group_id).trim();
    if (holdStr) {
      if (holdStr.toUpperCase().includes('HOLD-')) {
        return normalizeHoldGroupId(holdStr);
      }
      return `HOLD-${formatShipmentId(holdStr)}`;
    }
  }

  const isHold = s.warehouse_action === 'hold' || st === 'holding' || (s.hold_group_id && String(s.hold_group_id).trim() !== '');
  if (!isHold) return null;

  const extId = s.id ? formatShipmentId(s.id) : (s.external_order_id ? String(s.external_order_id).trim() : null);
  if (!extId) return null;
  return normalizeHoldGroupId(extId);
};

// ── Types & Interfaces ───────────────────────────────────────────────────────

interface SubCategoryItem {
  name: string;
  weight: number;
  subtext: string;
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
      { name: 'Light Topwear', weight: 200, subtext: 'T-shirts, Shirts, Kurtis, or similar lightweight tops.' },
      { name: 'Heavy Topwear & Outerwear', weight: 900, subtext: 'Jackets, Sweaters, Coats, or any thick winter tops.' },
      { name: 'Light Bottoms', weight: 250, subtext: 'Shorts, Leggings, Light Pajamas, or thin pants.' },
      { name: 'Heavy Bottoms', weight: 500, subtext: 'Jeans, Trousers, Joggers, or heavy material pants.' },
      { name: 'Light Dresses & Sets', weight: 400, subtext: 'Casual Dresses, Light Cotton Suits, Daily-Wear Sarees, Rompers or 2-piece co-ords.' },
      { name: 'Heavy Ethnic & Party', weight: 1000, subtext: 'Heavy Lehengas, Bridal Sarees, Embroidered Suits, Gowns.' },
      { name: 'Heavy Winter Sets', weight: 1300, subtext: 'Tracksuits, Snowsuits, or heavy 2-piece winter combos.' },
      { name: 'Small Cloth Accessories', weight: 50, subtext: 'Socks, innerwear, ties, handkerchiefs, light earrings, chains (up to 50g each).' }
    ]
  },
  footwear: {
    name: 'Footwear',
    icon: 'steps',
    requiresAge: true,
    subs: [
      { name: 'Light Footwear', weight: 400, subtext: "Flip-Flops, Flats, Sandals, Ballet Flats, or kids' shoes." },
      { name: 'Heavy Footwear', weight: 1000, subtext: 'Sneakers, Running Shoes, Formal Leather Shoes, Boots, or Block Heels.' }
    ]
  },
  bags: {
    name: 'Bags & Luggage',
    icon: 'work',
    subs: [
      { name: 'Small Bags & Wallets', weight: 300, subtext: 'Wallets, Purses, Clutches, Sling Bags, or Fanny Packs.' },
      { name: 'Medium/Heavy Bags', weight: 800, subtext: 'Backpacks, Laptop Bags, Handbags, Tote Bags, or Duffle Bags.' },
      { name: 'Luggage / Trolleys', weight: 3000, oversized: true, subtext: 'Cabin Luggage, Suitcases, or Check-in Bags.' }
    ]
  },
  jewelry: {
    name: 'Jewelry & Accessories',
    icon: 'diamond',
    subs: [
      { name: 'Light Jewelry', weight: 50, subtext: 'Earrings, Rings, Chains, Bracelets, Hair Clips, or similar light items.' },
      { name: 'Structured Accessories', weight: 200, subtext: 'Watches, Sunglasses, Leather Belts, or heavy Bridal Jewelry sets.' }
    ]
  },
  beauty: {
    name: 'Beauty & Personal Care',
    icon: 'face_3',
    subs: [
      { name: 'Light Cosmetics', weight: 80, subtext: 'Lipsticks, Kajal, Makeup Brushes, Compacts, or small serums.' },
      { name: 'Heavy Bath & Body', weight: 400, subtext: 'Shampoo Bottles, Perfumes, Body Lotions, or Skincare Kits.' }
    ]
  },
  home: {
    name: 'Home, Kitchen & Living',
    icon: 'home',
    subs: [
      { name: 'Light Kitchen Utensils', weight: 400, subtext: 'Cutlery, Spatulas, Small Steel Bowls, Rolling Pins (Belan), or Plastic Containers.' },
      { name: 'Soft Home Textiles', weight: 1000, subtext: 'Bedsheets, Blankets, Towel Sets, Curtains, or Cushion Covers.' },
      { name: 'Standard Cookware & Decor', weight: 1500, subtext: 'Dinner Plates, Frying Pans, Tawas, Wall Clocks, Small Rugs, or Table Lamps.' },
      { name: 'Heavy Kitchenware & Appliances', weight: 3000, subtext: 'Pressure Cookers, Mixer Grinders, Heavy Kadhais, or Cast Iron Pans.' },
      { name: 'Oversized Home Goods', weight: 5000, oversized: true, subtext: 'Rugs, Large Carpets, Floor Lamps, Large Mirrors, or Small Furniture.' }
    ]
  },
  toys: {
    name: 'Toys, Games & Kids Gear',
    icon: 'smart_toy',
    subs: [
      { name: 'Small Toys & Activity Kits', weight: 300, subtext: 'Action Figures, Card Games, Small Plushies, Rattles, or Craft & Stationery Kits.' },
      { name: 'Standard Boxed Toys', weight: 1200, subtext: 'Board Games, Building Blocks (LEGO), Remote Control Cars, Doll Sets, or Medium Soft Toys.' },
      { name: 'Heavy / Wooden Toys', weight: 2500, subtext: 'Wooden Train Sets, DIY Science Kits, Large Puzzles, or Electronic Learning Toys.' },
      { name: 'Oversized Toys & Play Gear', weight: 5000, oversized: true, subtext: 'Play Tents, Large Dollhouses, Baby Walkers, Ride-on Toys, or Large Play Mats.' }
    ]
  },
  books: {
    name: 'Books, Documents & Media',
    icon: 'menu_book',
    subs: [
      { name: 'Important Documents & Papers', weight: 200, subtext: 'Visas, Legal Papers, Transcripts, Certificates, Planners, or Greeting Cards.' },
      { name: 'Light Books & Magazines', weight: 400, subtext: 'Paperbacks, Comic Books, Children’s Storybooks, or Thin Magazines.' },
      { name: 'Standard Hardcovers & Medium Books', weight: 1000, subtext: 'Hardcover Novels, Cookbooks, Biographies, or Medium Graphic Novels.' },
      { name: 'Heavy Books & Textbooks', weight: 2500, subtext: 'University Textbooks, Coffee Table Books, Heavy Encyclopedias, or Book Box-Sets.' }
    ]
  },
  food: {
    name: 'Food, Snacks & Groceries',
    icon: 'restaurant',
    isFoodGlobal: true,
    subs: [
      { name: 'Light Snacks & Spices', weight: 500, isRestricted: true, subtext: 'Namkeen, Dry Snacks, Spices (Masalas), Tea Leaves, or Coffee Powder.' },
      { name: 'Heavy Sweets & Groceries', weight: 1500, isRestricted: true, subtext: 'Mithai / Sweets Boxes, Pickles (Glass Jars), Lentils (Dals), or Baking Ingredients.' }
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
  { id: 1, label: 'Select Categories' },
  { id: 2, label: 'Configure Items' },
  { id: 3, label: 'Warehouse Handling' },
  { id: 4, label: 'Origin & Warehouse' },
  { id: 5, label: 'Destination & Payment' }
];

// ── Component ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Auth Pop-Out Modal State for Guest Checkout / Save Draft
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalAction, setAuthModalAction] = useState<'save_draft' | 'proceed_payment' | 'view_tab' | 'signin'>('signin');
  const [authModalTitle, setAuthModalTitle] = useState('Save to Your Layo Locker');
  const [authModalSubtitle, setAuthModalSubtitle] = useState('Sign in or create an account to save your draft shipment.');
  const [targetTabAfterAuth, setTargetTabAfterAuth] = useState<'drafts' | 'hold' | 'dues' | 'history' | null>(null);

  // Navigation and view tabs
  const [activeTab, setActiveTab] = useState<'new' | 'drafts' | 'hold' | 'dues' | 'history'>('new');

  const [deliveryType, setDeliveryType] = useState<'normal' | 'express'>('normal');

  // Dynamic Category Matrix Settings
  const [activeCategoryData, setActiveCategoryData] = useState(categoryData);

  useEffect(() => {
    try {
      const masterCats = loadMasterCategories();
      const updated = JSON.parse(JSON.stringify(categoryData)); // Deep clone
      masterCats.forEach(group => {
        const catKey = group.id; // e.g. 'clothing'
        if (updated[catKey]) {
          group.items.forEach(item => {
            const sub = updated[catKey].subs.find((s: any) => s.name === item.label);
            if (sub) {
              sub.weight = item.weightGrams;
              sub.subtext = item.subtext;
            }
          });
        }
      });
      setActiveCategoryData(updated);
    } catch (e) {
      console.warn("Failed to sync category matrix in dashboard:", e);
    }
  }, []);

  useEffect(() => {
    const handleUrlTab = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const tabParam = params.get('tab');
        if (tabParam === 'drafts') setActiveTab('drafts');
        else if (tabParam === 'hold') setActiveTab('hold');
        else if (tabParam === 'dues' || tabParam === 'remaining' || tabParam === 'payment_dues') setActiveTab('dues');
        else if (tabParam === 'history') setActiveTab('history');
        else if (tabParam === 'new') {
          setActiveTab('new');
          setCurrentStep(1);
          try {
            localStorage.removeItem('layo_dashboard_flow_state');
          } catch (e) {}
        }
      }
    };
    handleUrlTab();
    window.addEventListener('popstate', handleUrlTab);
    return () => window.removeEventListener('popstate', handleUrlTab);
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
  const [selectedHoldGroupId, setSelectedHoldGroupId] = useState<string | null>(null);
  const [holdOptionMode, setHoldOptionMode] = useState<'existing' | 'new'>('existing');

  // Modals & Errors
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any | null>(null);
  const [showOrderNumberError, setShowOrderNumberError] = useState(false);
  const [promoQty, setPromoQty] = useState(0);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentBanner, setPaymentBanner] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);

  // Saved Addresses State & Helpers
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string>('');
  const [showManageAddressesModal, setShowManageAddressesModal] = useState<boolean>(false);
  const [newAddrLabel, setNewAddrLabel] = useState<string>('');
  const [newAddrLine1, setNewAddrLine1] = useState<string>('');
  const [newAddrCity, setNewAddrCity] = useState<string>('Toronto (GTA)');

  const getStorageKey = (uid?: string) => uid ? `layo_profile_${uid}` : 'layo_profile';
  const getAddressesKey = (uid?: string) => uid ? `layo_saved_addresses_${uid}` : 'layo_saved_addresses';
  const getLocalShipmentsKey = (uid?: string) => uid ? `layo_customer_shipments_${uid}` : 'layo_local_shipments';

  const loadSavedAddresses = (uid?: string) => {
    if (typeof window === 'undefined') return;
    try {
      let addrs: any[] = [];
      const currentUid = uid || user?.id;
      const profileKey = getStorageKey(currentUid);
      const addressesKey = getAddressesKey(currentUid);

      if (user?.user_metadata?.saved_addresses && Array.isArray(user.user_metadata.saved_addresses)) {
        addrs = user.user_metadata.saved_addresses;
      }
      if (addrs.length === 0) {
        const rawProfile = localStorage.getItem(profileKey);
        if (rawProfile) {
          const parsed = JSON.parse(rawProfile);
          if (Array.isArray(parsed.addresses)) addrs = parsed.addresses;
        }
      }
      if (addrs.length === 0) {
        const rawSaved = localStorage.getItem(addressesKey);
        if (rawSaved) {
          const parsed = JSON.parse(rawSaved);
          if (Array.isArray(parsed)) addrs = parsed;
        }
      }
      setSavedAddresses(addrs);
    } catch (err) {
      console.error('Failed to load saved addresses:', err);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadSavedAddresses(user.id);
    }
  }, [user?.id]);

  const autoSaveAddress = async (city: string, fullAddress: string) => {
    if (!fullAddress || !fullAddress.trim()) return;
    const trimmedAddr = fullAddress.trim();
    const trimmedCity = city ? city.trim() : 'Toronto (GTA)';

    try {
      const profileKey = getStorageKey(user?.id);
      const addressesKey = getAddressesKey(user?.id);
      const rawProfile = localStorage.getItem(profileKey);
      let profileData: any = rawProfile ? JSON.parse(rawProfile) : { addresses: [] };
      if (!profileData.addresses) profileData.addresses = [];

      const exists = profileData.addresses.some(
        (a: any) =>
          (a.line1 && a.line1.toLowerCase().trim() === trimmedAddr.toLowerCase()) ||
          (a.fullAddress && a.fullAddress.toLowerCase().trim() === trimmedAddr.toLowerCase())
      );

      if (!exists) {
        const newAddr = {
          id: 'addr_' + Date.now(),
          label: `Address ${profileData.addresses.length + 1}`,
          line1: trimmedAddr,
          city: trimmedCity,
          country: 'Canada',
          isDefault: profileData.addresses.length === 0,
        };
        profileData.addresses.push(newAddr);
        localStorage.setItem(profileKey, JSON.stringify(profileData));
        localStorage.setItem(addressesKey, JSON.stringify(profileData.addresses));
        setSavedAddresses(profileData.addresses);
        try {
          await supabase.auth.updateUser({
            data: { saved_addresses: profileData.addresses }
          });
        } catch (e) {}
      }
    } catch (err) {
      console.error('Failed to auto-save address:', err);
    }
  };

  const handleAddNewSavedAddress = async () => {
    if (!newAddrLine1 || !newAddrLine1.trim()) return;
    try {
      const profileKey = getStorageKey(user?.id);
      const addressesKey = getAddressesKey(user?.id);
      const rawProfile = localStorage.getItem(profileKey);
      let profileData: any = rawProfile ? JSON.parse(rawProfile) : { addresses: [] };
      if (!profileData.addresses) profileData.addresses = [];

      const newAddr = {
        id: 'addr_' + Date.now(),
        label: newAddrLabel.trim() || `Address ${profileData.addresses.length + 1}`,
        line1: newAddrLine1.trim(),
        city: newAddrCity || 'Toronto (GTA)',
        country: 'Canada',
        isDefault: profileData.addresses.length === 0,
      };

      profileData.addresses.push(newAddr);
      localStorage.setItem(profileKey, JSON.stringify(profileData));
      localStorage.setItem(addressesKey, JSON.stringify(profileData.addresses));
      setSavedAddresses(profileData.addresses);
      setNewAddrLabel('');
      setNewAddrLine1('');

      try {
        await supabase.auth.updateUser({
          data: { saved_addresses: profileData.addresses }
        });
      } catch (e) {}
    } catch (err) {
      console.error('Failed to add saved address:', err);
    }
  };

  const handleDeleteSavedAddress = async (id: string) => {
    try {
      const profileKey = getStorageKey(user?.id);
      const addressesKey = getAddressesKey(user?.id);
      const rawProfile = localStorage.getItem(profileKey);
      let profileData: any = rawProfile ? JSON.parse(rawProfile) : { addresses: [] };
      if (profileData.addresses) {
        profileData.addresses = profileData.addresses.filter((a: any) => a.id !== id);
        localStorage.setItem(profileKey, JSON.stringify(profileData));
        localStorage.setItem(addressesKey, JSON.stringify(profileData.addresses));
        setSavedAddresses(profileData.addresses);

        try {
          await supabase.auth.updateUser({
            data: { saved_addresses: profileData.addresses }
          });
        } catch (e) {}
      }
    } catch (err) {
      console.error('Failed to delete saved address:', err);
    }
  };

  // Financial and math helpers
  const [cadToInrRate, setCadToInrRate] = useState<number>(() => getActiveConversionRate());

  useEffect(() => {
    fetchLiveCadToInrRate().then(rate => {
      if (rate && rate > 0) {
        setCadToInrRate(rate);
      }
    }).catch(err => {
      console.warn('Could not fetch live CAD to INR rate in dashboard:', err);
    });
  }, []);

  // Load saved flow state from localStorage if exists
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'new') {
        try {
          localStorage.removeItem('layo_dashboard_flow_state');
        } catch (e) {}
        setCurrentStep(1);
        setActiveTab('new');
        return;
      }

      // Prioritize fresh estimator modal drafts over previous flow state
      const hasFreshModalDraft = localStorage.getItem('layo_pending_shipment_draft');
      if (hasFreshModalDraft) {
        localStorage.removeItem('layo_dashboard_flow_state');
        return;
      }

      const saved = localStorage.getItem('layo_dashboard_flow_state');
      if (saved) {
        try {
          const stateObj = JSON.parse(saved);
          // If flow state belonged to a different user, ignore and clear it
          if (stateObj.userId && user?.id && stateObj.userId !== user.id) {
            localStorage.removeItem('layo_dashboard_flow_state');
            return;
          }
          if (stateObj.currentStep) setCurrentStep(stateObj.currentStep);
          if (stateObj.originType) setOriginType(stateObj.originType);
          if (stateObj.storeName !== undefined) setStoreName(stateObj.storeName);
          if (stateObj.orderNumber !== undefined) setOrderNumber(stateObj.orderNumber);
          if (stateObj.senderName !== undefined) setSenderName(stateObj.senderName);
          if (stateObj.originCity !== undefined) setOriginCity(stateObj.originCity);
          if (stateObj.selectedWarehouse !== undefined) setSelectedWarehouse(stateObj.selectedWarehouse);
          if (stateObj.destinationCity !== undefined) setDestinationCity(stateObj.destinationCity);
          if (stateObj.destinationAddress !== undefined) setDestinationAddress(stateObj.destinationAddress);
          if (stateObj.selectedCategories) setSelectedCategories(stateObj.selectedCategories);
          if (stateObj.qtyState) setQtyState(stateObj.qtyState);
          if (stateObj.activeDemoState) setActiveDemoState(stateObj.activeDemoState);
          if (stateObj.promoQty !== undefined) setPromoQty(stateObj.promoQty);
          if (stateObj.warehouseAction !== undefined) setWarehouseAction(stateObj.warehouseAction);
          if (stateObj.morePackages !== undefined) setMorePackages(stateObj.morePackages);
          if (stateObj.deliveryType) setDeliveryType(stateObj.deliveryType);
          if (stateObj.editingDraftId !== undefined) setEditingDraftId(stateObj.editingDraftId);
        } catch (e) {
          console.error("Failed to restore dashboard flow state:", e);
        }
      }
    }
  }, [user?.id]);

  // Auto-save dashboard step flow state to localStorage
  useEffect(() => {
    const hasItems = Object.values(qtyState).some(q => (q || 0) > 0) || promoQty > 0;
    const hasProgress = currentStep > 1 || selectedCategories.length > 0 || storeName || senderName || orderNumber || destinationAddress || hasItems;
    if (hasProgress) {
      const stateObj = {
        userId: user?.id || null,
        currentStep,
        originType,
        storeName,
        orderNumber,
        senderName,
        originCity,
        selectedWarehouse,
        destinationCity,
        destinationAddress,
        selectedCategories,
        qtyState,
        activeDemoState,
        promoQty,
        warehouseAction,
        morePackages,
        deliveryType,
        editingDraftId,
      };
      localStorage.setItem('layo_dashboard_flow_state', JSON.stringify(stateObj));
    } else {
      localStorage.removeItem('layo_dashboard_flow_state');
    }
  }, [
    currentStep, originType, storeName, orderNumber, senderName, originCity,
    selectedWarehouse, destinationCity, destinationAddress, selectedCategories,
    qtyState, activeDemoState, promoQty, warehouseAction, morePackages,
    deliveryType, editingDraftId
  ]);

  // 1. Saved Draft Estimates
  const draftsList = useMemo(() => {
    const raw = shipments.filter(s => {
      if (!s) return false;
      const st = String(s.status || '').toLowerCase();
      return st === 'draft' || st === 'draft estimate';
    });

    const seen = new Set<string>();
    const uniqueList: any[] = [];
    raw.forEach(d => {
      const normId = formatShipmentId(d.external_order_id || d.id || '');
      if (normId && seen.has(normId)) return;

      const itemsSummary = Array.isArray(d.items)
        ? d.items.map((i: any) => `${i.quantity || 1}x${i.subcategory || i.name || i.category}`).sort().join(',')
        : '';
      const dest = String(d.destination_address || d.destination_city || '').trim().toLowerCase();
      const wt = Number(d.total_weight || 0).toFixed(1);
      const contentKey = `DRAFT_${dest}_${wt}_${itemsSummary}`;

      if (contentKey !== 'DRAFT___0.0_' && seen.has(contentKey)) return;

      if (normId) seen.add(normId);
      if (contentKey !== 'DRAFT___0.0_') seen.add(contentKey);
      uniqueList.push(d);
    });

    return uniqueList;
  }, [shipments]);

  // 2. Active Hold & Consolidation Groups
  const holdList = useMemo(() => {
    return shipments.filter(s => {
      if (!s) return false;
      const st = String(s.status || '').toLowerCase();
      if (st === 'draft' || st === 'draft estimate' || st === 'cancelled' || st === 'delivered') return false;
      return s.warehouse_action === 'hold' || st === 'holding' || (s.hold_group_id && String(s.hold_group_id).startsWith('HOLD-'));
    });
  }, [shipments]);

  // Active Hold Groups (Grouped - only OPEN hold groups that are still waiting for additional packages)
  const activeHoldGroups = useMemo(() => {
    const eligible = shipments.filter(s => {
      if (!s) return false;
      const st = String(s.status || '').toLowerCase();
      const paySt = String(s.payment_status || '').toLowerCase();
      if (st === 'draft' || st === 'draft estimate' || st === 'cancelled' || st === 'delivered' || st === 'shipped') return false;
      const isHold = s.warehouse_action === 'hold' || st === 'holding' || (s.hold_group_id && String(s.hold_group_id).trim() !== '');
      if (!isHold) return false;
      const isPostRepack = st === 'repacked' || st === 'bulk_consolidated' || st === 'in_transit' || st === 'received_canada' || st === 'out_for_delivery' || paySt === 'awaiting_balance' || Number(s.actual_weight || 0) > 0 || Boolean(s.stage_timestamps?.repacked);
      if (isPostRepack) return false;
      return true;
    });

    const map = new Map<string, any[]>();
    const seenHoldShipmentIds = new Set<string>();
    eligible.forEach(s => {
      const normShipId = formatShipmentId(s.id);
      if (normShipId && seenHoldShipmentIds.has(normShipId)) return;
      if (normShipId) seenHoldShipmentIds.add(normShipId);

      const key = getHoldGroupKey(s) || (s.id ? `HOLD-${formatShipmentId(s.id)}` : 'HOLD-GROUP');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });

    return Array.from(map.entries())
      .map(([groupKey, items]) => {
        const sortedByDate = [...items].sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
        const primary = sortedByDate[0] || items[0];
        const expectedPackages = items.reduce((max, it) => Math.max(max, Number(it.expected_packages || 0)), 1);
        const totalCapacity = 1 + expectedPackages;
        const currentLinkedCount = items.length;
        const remainingSlots = Math.max(0, totalCapacity - currentLinkedCount);
        const isFullyLinked = currentLinkedCount >= totalCapacity;

        return {
          group_id: groupKey,
          groupKey,
          items,
          shipments: items,
          primaryShipment: primary,
          primary,
          expectedPackages,
          expectedMore: expectedPackages,
          totalCapacity,
          currentLinkedCount,
          remainingSlots,
          isFullyLinked,
          isOpen: !isFullyLinked,
        };
      })
      .filter(grp => grp.isOpen); // Key: Open hold groups waiting for more packages stay here
  }, [shipments]);

  // 3. Payment Dues (Active Bookings after 20% Advance, awaiting Ops Repack Step 3 or remaining 80% balance)
  const pendingDuesShipments = useMemo(() => {
    return shipments.filter(s => {
      if (!s) return false;
      const st = String(s.status || '').toLowerCase();
      const paySt = String(s.payment_status || '').toLowerCase();

      if (st === 'draft' || st === 'draft estimate' || st === 'cancelled') return false;
      if (paySt === 'completed' || paySt === 'fully_paid' || paySt === 'paid_full') return false;

      return paySt === 'awaiting_balance' || st === 'repacked' || st === 'paid' || st === 'advance_paid' || st === 'holding' || st === 'inwarded' || st === 'qc_verified' || Number(s.remaining_balance_cad) > 0;
    });
  }, [shipments]);

  // Grouped list of shipments for Payment Dues tab (Hold group packages combined into single entries)
  const groupedPendingDues = useMemo(() => { try {
    // 1. Filter eligible shipments (not draft, not cancelled, not completed)
    const eligible = shipments.filter(s => {
      if (!s) return false;
      const st = String(s.status || '').toLowerCase();
      const paySt = String(s.payment_status || '').toLowerCase();
      if (st === 'draft' || st === 'draft estimate' || st === 'cancelled') return false;
      if (paySt === 'completed' || paySt === 'fully_paid' || paySt === 'paid_full') return false;

      const isPostRepack = st === 'repacked' || st === 'bulk_consolidated' || st === 'in_transit' || st === 'received_canada' || st === 'out_for_delivery' || st === 'delivered' || paySt === 'awaiting_balance' || Number(s.actual_weight || 0) > 0 || Boolean(s.stage_timestamps?.repacked);

      const isHold = s.warehouse_action === 'hold' || st === 'holding' || (s.hold_group_id && String(s.hold_group_id).trim() !== '');
      if (isHold && !isPostRepack) {
        const holdKey = getHoldGroupKey(s);
        const groupPackages = shipments.filter(x => x && getHoldGroupKey(x) === holdKey);
        const expectedMore = groupPackages.reduce((max, it) => Math.max(max, Number(it.expected_packages || 0)), 1);
        const totalCapacity = 1 + expectedMore;
        const isHoldFullyLinked = groupPackages.length >= totalCapacity;
        if (!isHoldFullyLinked) return false; // Still waiting for packages in Hold & Consolidation tab!
      }

      return paySt === 'awaiting_balance' || isPostRepack || st === 'paid' || st === 'advance_paid' || st === 'holding' || st === 'inwarded' || st === 'qc_verified' || Number(s.remaining_balance_cad) > 0;
    });

    // 2. Group by hold group key or individual shipment ID
    const map = new Map<string, any[]>();
    const seenDuesShipmentIds = new Set<string>();
    eligible.forEach(s => {
      const normShipId = formatShipmentId(s.id);
      if (normShipId && seenDuesShipmentIds.has(normShipId)) return;
      if (normShipId) seenDuesShipmentIds.add(normShipId);

      const isHold = s.warehouse_action === 'hold' || String(s.status || '').toLowerCase() === 'holding' || (s.hold_group_id && String(s.hold_group_id).trim() !== '');
      const holdKey = isHold ? getHoldGroupKey(s) : null;
      const key = holdKey || s.id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });

    return Array.from(map.entries()).map(([groupKey, items]) => {
      const primary = items[0];
      const isHoldGroup = groupKey.startsWith('HOLD-') || items.length > 1;

      const isRepackDone = items.some(it => {
        const st = String(it.status || '').toLowerCase();
        const hasWeight = Number(it.actual_weight || 0) > 0;
        const hasRepackTimestamp = Boolean(it.stage_timestamps?.repacked);
        const isPostRepackStage = ['repacked', 'bulk_consolidated', 'in_transit', 'received_canada', 'out_for_delivery', 'delivered'].includes(st);
        return isPostRepackStage || (hasWeight && Number(it.final_cost_cad || 0) > 0) || hasRepackTimestamp;
      });

      const combinedEstimatedWeight = items.reduce((sum, it) => sum + getShipmentEstimatedWeight(it), 0);
      const opsActualWeight = items.reduce((max, it) => Math.max(max, Number(it.actual_weight || 0)), 0);
      const isWeightVerified = Boolean(isRepackDone && opsActualWeight > 0);
      const combinedActualWeight = isWeightVerified ? opsActualWeight : null;

      const combinedAdvancePaid = items.reduce((sum, it) => {
        const adv = Number(it.advance_amount_cad || 0);
        if (adv > 0) return sum + adv;
        const est = Number(it.estimated_cost_cad || (it.total_cost ? it.total_cost / (cadToInrRate || 68.0) : 0));
        return sum + Math.round(est * 0.20 * 100) / 100;
      }, 0);

      let combinedFinalCost = 0;
      if (isWeightVerified && combinedActualWeight) {
        combinedFinalCost = items.reduce((max, it) => Math.max(max, Number(it.final_cost_cad || 0)), 0);
        if (!combinedFinalCost || combinedFinalCost <= 0) {
          const calc = calculateLayoDeliveryCost({ weightKg: combinedActualWeight, deliveryType: 'normal' });
          combinedFinalCost = calc.finalPriceCAD;
        }
      } else {
        const calc = calculateLayoDeliveryCost({ weightKg: combinedEstimatedWeight, deliveryType: 'normal' });
        combinedFinalCost = calc.finalPriceCAD;
      }

      const combinedRemainingBalance = Math.max(0, Math.round((combinedFinalCost - combinedAdvancePaid) * 100) / 100);

      const boxDimensions = formatBoxDimensions(items.find(it => it.box_dimensions)?.box_dimensions);

      return {
        groupKey,
        isHoldGroup,
        items,
        primary,
        isRepackDone,
        isWeightVerified,
        combinedEstimatedWeight,
        combinedActualWeight,
        combinedFinalCost,
        combinedAdvancePaid,
        combinedRemainingBalance,
        boxDimensions,
      };
    });
  } catch (e) { console.error('groupedPendingDues error:', e); return []; } }, [shipments]);

  // 4. My Shipments (Strictly only shipments whose all final payment has been done and nothing is dues)
  const myShipmentsList = useMemo(() => {
    try {
      const seenSettledIds = new Set<string>();
      // 1. Only include shipments whose all final payment has been done and 0 dues remain
      const settled = shipments.filter(s => {
        if (!s) return false;
        const normId = formatShipmentId(s.id);
        if (normId && seenSettledIds.has(normId)) return false;

        const st = String(s.status || '').toLowerCase();
        const paySt = String(s.payment_status || '').toLowerCase();
        const remaining = Number(s.remaining_balance_cad ?? 0);

        // Filter out drafts, draft estimates, and cancelled
        if (st === 'draft' || st === 'draft estimate' || st === 'cancelled') return false;

        // Any remaining balance means final payment is NOT done (belongs in Payment Dues tab)
        if (remaining > 0) return false;
        if (paySt === 'awaiting_balance' || paySt === 'advance_pending' || paySt === 'pending') return false;

        // Fully settled payments
        if (paySt === 'completed' || paySt === 'fully_paid' || paySt === 'paid_full') {
          if (normId) seenSettledIds.add(normId);
          return true;
        }

        // Post-repack stages with verified 0 balance and completed payment
        if (['repacked', 'bulk_consolidated', 'in_transit', 'shipped', 'received_canada', 'out_for_delivery', 'delivered'].includes(st)) {
          const isEligible = remaining <= 0 && paySt !== 'awaiting_balance';
          if (isEligible && normId) seenSettledIds.add(normId);
          return isEligible;
        }

        return false;
      });

      // 2. Group hold groups together so consolidated shipments share 1 unified tracking card
      const map = new Map<string, any[]>();
      settled.forEach(s => {
        const isHold = s.warehouse_action === 'hold' || (s.hold_group_id && String(s.hold_group_id).trim() !== '');
        const holdKey = isHold ? getHoldGroupKey(s) : null;
        const key = holdKey || s.id;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(s);
      });

      return Array.from(map.entries()).map(([groupKey, items]) => {
        const primary = items[0];
        const isHoldGroup = groupKey.startsWith('HOLD-') || items.length > 1;

        if (!isHoldGroup) {
          return {
            ...primary,
            isHoldGroup: false,
            groupKey,
            itemsCount: items.length,
            allPackages: items,
          };
        }

        const combinedEstimatedWeight = items.reduce((sum, it) => sum + getShipmentEstimatedWeight(it), 0);
        const combinedActualWeight = items.reduce((max, it) => Math.max(max, Number(it.actual_weight || 0)), 0)
          || combinedEstimatedWeight;

        const combinedCost = items.reduce((max, it) => Math.max(max, Number(it.final_cost_cad || 0)), 0)
          || items.reduce((sum, it) => sum + Number(it.total_cost ? it.total_cost / (cadToInrRate || 68.0) : 25.0), 0);

        const allItems = items.flatMap(it => Array.isArray(it.items) ? it.items : []);
        const allPhotos = items.flatMap(it => Array.isArray(it.qc_photos) ? it.qc_photos : []);
        const boxDimensions = items.find(it => it.box_dimensions)?.box_dimensions;

        return {
          ...primary,
          id: groupKey,
          isHoldGroup: true,
          groupKey,
          itemsCount: items.length,
          allPackages: items,
          actual_weight: combinedActualWeight,
          total_weight: combinedEstimatedWeight,
          estimated_weight: combinedEstimatedWeight,
          final_cost_cad: combinedCost,
          amount_cad: combinedCost,
          remaining_balance_cad: 0,
          payment_status: 'completed',
          items: allItems,
          qc_photos: allPhotos,
          box_dimensions: boxDimensions,
          status: items.some(it => ['in_transit', 'shipped', 'received_canada', 'out_for_delivery', 'delivered'].includes(it.status))
            ? (items.find(it => ['in_transit', 'shipped', 'received_canada', 'out_for_delivery', 'delivered'].includes(it.status))?.status || primary.status)
            : primary.status,
        };
      });
    } catch (e) {
      console.error('myShipmentsList error:', e);
      return [];
    }
  }, [shipments]);

  const handlePayRemainingBalance = async (shipment: any) => {
    setIsProcessingPayment(true);
    try {
      const dueCAD = shipment.remaining_balance_cad || Math.max(0, (shipment.final_cost_cad || shipment.total_cost || 0) - (shipment.advance_amount_cad || 0));
      
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCAD: dueCAD,
          shipmentId: shipment.id,
          userId: user?.id,
          userEmail: user?.email,
          isAdvance: false,
          destinationCity: shipment.destination_city || 'Canada',
          destinationAddress: shipment.destination_address || '',
          warehouseName: shipment.india_warehouse || 'Indian Locker Hub',
          totalWeightKg: shipment.actual_weight || shipment.total_weight || 1.0,
          itemsSummary: `Remaining 80% balance payment for Layo Locker #${formatShipmentId(shipment.id)}`,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to initiate Stripe payment');
      }
    } catch (err: any) {
      console.error('Pay balance error:', err);
      alert('Payment error: ' + (err.message || 'Please try again'));
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePayRemainingBalanceGroup = async (grp: any) => {
    setIsProcessingPayment(true);
    try {
      const dueCAD = grp.combinedRemainingBalance || 0;
      const primary = grp.primary || (grp.items && grp.items[0]);
      const targetId = grp.groupKey || primary?.id;

      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCAD: dueCAD.toFixed(2),
          shipmentId: targetId,
          userId: user?.id,
          userEmail: user?.email,
          isAdvance: false,
          destinationCity: primary?.destination_city || 'Canada',
          destinationAddress: primary?.destination_address || '',
          warehouseName: primary?.india_warehouse || 'Indian Locker Hub',
          totalWeightKg: grp.combinedActualWeight || 1.0,
          itemsSummary: `Remaining 80% balance payment for Consolidated Hold Group #${grp.groupKey} (${grp.items?.length || 1} Packages)`,
        }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to initiate Stripe payment');
      }
    } catch (err: any) {
      console.error('Pay group balance error:', err);
      alert('Payment error: ' + (err.message || 'Please try again'));
    } finally {
      setIsProcessingPayment(false);
    }
  };



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
              const targetId = data.metadata?.shipment_id || null;
              const isAdvancePayment = data.metadata?.is_advance === 'true' || data.metadata?.payment_type === 'advance';

              if (!isAdvancePayment && targetId) {
                // Remaining Balance Payment
                const normalizedTargetKey = normalizeHoldGroupId(targetId);
                const matchingShips = shipments.filter(s => (normalizedTargetKey && getHoldGroupKey(s) === normalizedTargetKey) || s.hold_group_id === targetId || s.id === targetId || formatShipmentId(s.id) === formatShipmentId(targetId));
                if (matchingShips.length > 0) {
                  for (const ship of matchingShips) {
                    await updateShipmentStage(
                      ship.id,
                      'repacked',
                      ship.stage_timestamps,
                      {
                        payment_status: 'completed',
                        remaining_balance_cad: 0,
                      },
                      { id: user?.id || null, email: user?.email || data.customerEmail || null, role: 'customer' },
                      `Remaining balance payment of $${data.amountTotal ? data.amountTotal.toFixed(2) : ''} CAD completed via Stripe`
                    );
                  }

                  // Update local storage shipments list
                  try {
                    const localKey = getLocalShipmentsKey(user?.id);
                    const rawLocal = localStorage.getItem(localKey) || localStorage.getItem('layo_local_shipments');
                    if (rawLocal) {
                      const allLocal = JSON.parse(rawLocal);
                      const targetIds = new Set(matchingShips.map(s => s.id));
                      const updated = allLocal.map((s: any) => targetIds.has(s.id) ? { ...s, payment_status: 'completed', remaining_balance_cad: 0 } : s);
                      localStorage.setItem(localKey, JSON.stringify(updated));
                    }
                  } catch (e) {}

                  // Record transaction
                  await supabase.from('transactions').insert({
                    shipment_id: matchingShips[0].id,
                    user_id: user?.id || null,
                    amount_cad: data.amountTotal || 0,
                    amount_inr: data.amountTotal ? Math.round(data.amountTotal * (cadToInrRate || 68.0)) : 0,
                    currency: data.currency?.toUpperCase() || 'CAD',
                    exchange_rate: cadToInrRate || 68.0,
                    payment_method: 'stripe',
                    stripe_session_id: sessionId,
                    stripe_payment_intent_id: data.paymentIntentId || null,
                    status: 'completed',
                    customer_email: data.customerEmail || user?.email || null,
                    customer_name: user?.email || null,
                    description: `Layo balance payment — ${matchingShips.length > 1 ? 'Hold Group #' + targetId : 'Locker #' + formatShipmentId(matchingShips[0].id)}`,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  });

                  setPaymentBanner({
                    type: 'success',
                    message: `Remaining balance payment of $${data.amountTotal ? data.amountTotal.toFixed(2) : ''} CAD confirmed! ${matchingShips.length > 1 ? 'Hold Group #' + targetId : 'Locker #' + formatShipmentId(matchingShips[0].id)} is fully paid and queued for airfreight dispatch.`
                  });
                  setActiveTab('history');
                  if (user?.id) fetchDashboardData(user.id);
                  return;
                }
              }

              // Advance 20% Booking Payment
              const bookingTargetId = (data.metadata?.shipment_id && data.metadata.shipment_id.length === 36)
                ? data.metadata.shipment_id
                : targetId;

              if (bookingTargetId) {
                const { data: currentShip } = await supabase.from('shipments').select('*').eq('id', bookingTargetId).maybeSingle();
                const isHold = currentShip?.warehouse_action === 'hold' || currentShip?.status === 'holding' || data.metadata?.warehouse_action === 'hold';
                const nextStatus = isHold ? 'holding' : 'paid';

                if (!currentShip) {
                  // Fallback creation if client or webhook didn't insert shipment before return
                  const totalWeight = parseFloat(data.metadata?.total_weight_kg || '1.0') || 1.0;
                  const amountTotal = data.amountTotal || 0;
                  const totalCadMeta = parseFloat(data.metadata?.total_cad || '0');
                  const estCostCAD = totalCadMeta > 0 ? totalCadMeta : Math.round(amountTotal * 5 * 100) / 100;
                  const remainingCAD = Math.max(0, Math.round((estCostCAD - amountTotal) * 100) / 100);

                  await supabase.from('shipments').insert({
                    id: bookingTargetId,
                    user_id: user?.id || null,
                    mode: 'Online Retailer',
                    status: nextStatus,
                    destination_city: data.metadata?.destination_city || destinationCity || 'Toronto (GTA)',
                    destination_address: data.metadata?.destination_address || destinationAddress || 'Canada',
                    india_warehouse: selectedWarehouse || null,
                    total_weight: totalWeight,
                    total_cost: Math.round(estCostCAD * (cadToInrRate || 68.0)),
                    payment_method: 'stripe',
                    warehouse_action: isHold ? 'hold' : 'ship',
                    expected_packages: 1,
                    items: {
                      items: [],
                      advance_pct: 20,
                      advance_amount_cad: amountTotal,
                      estimated_weight: totalWeight,
                      estimated_cost_cad: estCostCAD,
                      remaining_balance_cad: remainingCAD,
                      payment_status: 'advance_paid',
                    },
                    stage_timestamps: {
                      [nextStatus]: new Date().toISOString(),
                      paid: new Date().toISOString(),
                      advance_paid: new Date().toISOString(),
                    },
                    stage_history: [
                      {
                        stage: nextStatus,
                        status_label: isHold ? 'Hold & Consolidation' : '20% Advance Paid • Awaiting Warehouse Arrival',
                        timestamp: new Date().toISOString(),
                        done_by_user_id: user?.id || null,
                        done_by_email: user?.email || data.customerEmail || null,
                        done_by_role: 'customer',
                        notes: `20% Advance booking deposit of $${amountTotal.toFixed(2)} CAD confirmed via Stripe`,
                      }
                    ],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  });
                } else {
                  await updateShipmentStage(
                    bookingTargetId,
                    nextStatus,
                    currentShip?.stage_timestamps,
                    {
                      payment_status: 'advance_paid',
                      payment_method: 'stripe',
                    },
                    { id: user?.id || null, email: user?.email || data.customerEmail || null, role: 'customer' },
                    `20% Advance booking deposit of $${data.amountTotal ? data.amountTotal.toFixed(2) : ''} CAD confirmed via Stripe`
                  );
                }

                // Delete any matching draft from draft_estimates now that shipment is confirmed
                try {
                  await deleteDraftEstimate(bookingTargetId);
                } catch (e) {}

                await supabase.from('transactions').insert({
                  shipment_id: bookingTargetId,
                  user_id: user?.id || null,
                  amount_cad: data.amountTotal || 0,
                  amount_inr: data.amountTotal ? Math.round(data.amountTotal * (cadToInrRate || 68.0)) : 0,
                  currency: data.currency?.toUpperCase() || 'CAD',
                  exchange_rate: cadToInrRate || 68.0,
                  payment_method: 'stripe',
                  stripe_session_id: sessionId,
                  stripe_payment_intent_id: data.paymentIntentId || null,
                  status: 'completed',
                  customer_email: data.customerEmail || user?.email || null,
                  customer_name: user?.email || null,
                  description: `20% Advance deposit — Locker #${formatShipmentId(bookingTargetId)}`,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });

                localStorage.removeItem('layo_pending_shipment');
                localStorage.removeItem('layo_pending_shipment_draft');
                localStorage.removeItem('layo_dashboard_flow_state');
                handleStartNewOrder();
                setPaymentBanner({
                  type: 'success',
                  message: isHold
                    ? `20% Advance deposit of $${data.amountTotal ? data.amountTotal.toFixed(2) : ''} CAD confirmed! Package linked to Hold & Combine group.`
                    : `20% Advance deposit of $${data.amountTotal ? data.amountTotal.toFixed(2) : ''} CAD confirmed! Locker space booked.`
                });
                setActiveTab(isHold ? 'hold' : 'dues');
                if (user?.id) fetchDashboardData(user.id);
                return;
              }
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
      if (activeTab !== 'new') {
        router.push('/login');
      } else {
        fetchDashboardData(undefined, true);

        // Restore items from the EstimatorModal if user came via "Proceed to Book" as a guest
        const raw = localStorage.getItem('layo_pending_shipment_draft');
        if (raw) {
          try {
            const draft = JSON.parse(raw);
            const modalQtys: Record<string, number> = draft.qtys || {};

            const newQtyState: Record<string, number> = {};
            const newActiveDemoState: Record<string, string> = {};
            const catsWithItems = new Set<string>();

            Object.entries(modalQtys).forEach(([key, qty]) => {
              if (!qty || (qty as number) <= 0) return;

              if (key.startsWith('promo-')) {
                setPromoQty(qty as number);
                return;
              }

              // key format: "catId-typeIdx-ageSuffix"
              const firstDash  = key.indexOf('-');
              const secondDash = key.indexOf('-', firstDash + 1);
              if (firstDash === -1 || secondDash === -1) return;

              const catId    = key.slice(0, firstDash);
              const typeIdx  = key.slice(firstDash + 1, secondDash);
              const ageSuffix = key.slice(secondDash + 1);

              const dashSubIdx = MODAL_TO_DASH_SUB[`${catId}-${typeIdx}`];
              if (dashSubIdx === undefined || !activeCategoryData[catId]) return;

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
              if (draft.storeName)   setStoreName(draft.storeName);
              if (draft.senderName)  setSenderName(draft.senderName);
              if (draft.orderNumber) setOrderNumber(draft.orderNumber);
              // Start on Step 2 (Configure Items) with preloaded items
              setCurrentStep(2);
            }

            localStorage.removeItem('layo_pending_shipment_draft');
          } catch (e) {
            console.error('Failed to restore estimator draft for guest', e);
          }
        }
      }
    } else if (user) {
      fetchDashboardData(user.id, true);

      // Auto-sync guest draft if user just registered/logged in
      if (typeof window !== 'undefined') {
        const pendingRaw = localStorage.getItem('layo_pending_guest_draft');
        if (pendingRaw) {
          try {
            const pendingData = JSON.parse(pendingRaw);
            localStorage.removeItem('layo_pending_guest_draft');
            insertShipment({
              ...pendingData,
              user_id: user.id,
            }, { id: user.id, email: user.email, role: 'customer' }).then(() => {
              fetchDashboardData(user.id);
              setPaymentBanner({
                type: 'success',
                message: '✓ Welcome to Layo! Your draft estimate has been saved to your locker.'
              });
              setActiveTab('drafts');
            }).catch(err => {
              console.warn('Failed to auto-save guest draft:', err);
            });
          } catch (e) {
            console.warn('Failed to parse guest draft:', e);
          }
        }
      }

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
              setPromoQty(qty as number);
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
            if (dashSubIdx === undefined || !activeCategoryData[catId]) return;

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
            // Start on Step 2 (Configure Items) with preloaded items
            setCurrentStep(2);
          }

          localStorage.removeItem('layo_pending_shipment_draft');
        } catch (e) {
          console.error('Failed to restore estimator draft', e);
        }
      }
    }
  }, [user, loading, router]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Data Fetching ───────────────────────────────────────────────────────
  const fetchDashboardData = async (userId?: string, isInitial = false) => {
    if (isInitial) {
      setIsFetching(true);
    }
    // Strict guard: Customer dashboard must only fetch shipments if a valid user UUID is present
    if (!userId || !isValidUuid(userId)) {
      setShipments([]);
      try {
        const whs = await supabase.from('warehouses').select('*');
        if (whs.data && whs.data.length > 0) {
          setWarehouses(whs.data);
        } else {
          setWarehouses([
            { id: 'wh1', city: 'Delhi', pincode: '110077', address: 'C-N-246, Bamnoli Village, Sector 28 Dwarka, Dwarka, New Delhi', contact: '+91 9321852629' },
            { id: 'wh2', city: 'Mumbai', pincode: '400001', address: 'Gala 5, Hub 2, Andheri East', contact: '+91 98200 54321' }
          ]);
        }
      } catch (e) {
        setWarehouses([
          { id: 'wh1', city: 'Delhi', pincode: '110077', address: 'C-N-246, Bamnoli Village, Sector 28 Dwarka, Dwarka, New Delhi', contact: '+91 9321852629' },
          { id: 'wh2', city: 'Mumbai', pincode: '400001', address: 'Gala 5, Hub 2, Andheri East', contact: '+91 98200 54321' }
        ]);
      }
      if (isInitial) setIsFetching(false);
      return;
    }
    try {
      const [shipsResult, draftsResult, whs] = await Promise.all([
        fetchShipments(userId, { requireUserId: true }),
        fetchDraftEstimates(userId, { requireUserId: true }),
        supabase.from('warehouses').select('*')
      ]);

      const dbShips = shipsResult.data ?? [];

      // Extract all canonical IDs already known to shipments table
      const existingShipKeys = new Set<string>();
      dbShips.forEach((s: any) => {
        if (s?.id) existingShipKeys.add(formatShipmentId(s.id));
        if (s?.external_order_id) existingShipKeys.add(formatShipmentId(s.external_order_id));
      });

      // Filter drafts from draft_estimates: If already present in shipments table, skip to avoid duplicates
      const dbDrafts = (draftsResult.data ?? [])
        .filter((d: any) => {
          const draftExt = d?.external_order_id ? formatShipmentId(d.external_order_id) : '';
          const draftId = d?.id ? formatShipmentId(d.id) : '';
          if (draftExt && existingShipKeys.has(draftExt)) return false;
          if (draftId && existingShipKeys.has(draftId)) return false;
          return true;
        })
        .map((d: any) => parseShipment({
          ...d,
          raw_draft_id: d.id,
          external_order_id: d.external_order_id || null,
          id: d.external_order_id ? formatShipmentId(d.external_order_id) : d.id,
          status: 'Draft Estimate',
          payment_status: 'draft',
          total_weight: d.total_weight || 1.0,
          total_cost: d.total_cost || 0,
          estimated_cost_cad: d.estimated_cost_cad || 0,
          items: d.items || [],
        }));

      // Merge user-scoped local storage drafts — strictly only include shipments belonging to this user
      const userLocalKey = getLocalShipmentsKey(userId);
      let localShips: any[] = [];
      try {
        const rawLocal = localStorage.getItem(userLocalKey) || localStorage.getItem('layo_local_shipments');
        if (rawLocal) {
          const allLocal = JSON.parse(rawLocal);
          if (Array.isArray(allLocal)) {
            localShips = allLocal.filter((s: any) => s && s.user_id === userId && s.payment_method !== 'demo_simulated');
          }
        }
      } catch (e) {}

      // Dual-sync merge with canonical key deduplication: DB records take precedence, local backups fill any gaps
      const mergedMap = new Map<string, any>();
      const getCanonicalKey = (item: any): string => {
        if (!item) return '';
        const ext = item.external_order_id ? formatShipmentId(item.external_order_id) : '';
        const id = item.id ? formatShipmentId(item.id) : '';
        return ext || id;
      };

      localShips.forEach(s => {
        if (s && s.payment_method !== 'demo_simulated') {
          const k = getCanonicalKey(s);
          if (k) mergedMap.set(k, parseShipment(s) || s);
        }
      });
      dbDrafts.forEach((d: any) => {
        if (d && d.payment_method !== 'demo_simulated') {
          const k = getCanonicalKey(d);
          if (k) mergedMap.set(k, d);
        }
      });
      dbShips.forEach(s => {
        if (s && s.payment_method !== 'demo_simulated') {
          const k = getCanonicalKey(s);
          if (k) mergedMap.set(k, s);
        }
      });

      const mergedList = Array.from(mergedMap.values())
        .filter((s: any) => s && (!s.user_id || s.user_id === userId) && s.payment_method !== 'demo_simulated')
        .sort(
          (a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );

      setShipments(mergedList);
      try {
        localStorage.setItem(userLocalKey, JSON.stringify(mergedList));
        localStorage.removeItem('layo_local_shipments');
      } catch (e) {}

      const hasFlowState = typeof window !== 'undefined' ? localStorage.getItem('layo_dashboard_flow_state') : null;
      const hasProgress = currentStep > 1 || selectedCategories.length > 0 || storeName || senderName || orderNumber || destinationAddress || promoQty > 0 || hasFlowState;
      if (isInitial && mergedList.length > 0 && !hasProgress) {
        const settled = mergedList.filter((s: any) => {
          if (!s) return false;
          const st = String(s.status || '').toLowerCase();
          const paySt = String(s.payment_status || '').toLowerCase();
          const remaining = Number(s.remaining_balance_cad ?? 0);
          if (st === 'draft' || st === 'draft estimate' || st === 'cancelled') return false;
          if (remaining > 0) return false;
          if (paySt === 'awaiting_balance' || paySt === 'advance_pending' || paySt === 'pending') return false;
          return paySt === 'completed' || paySt === 'fully_paid' || paySt === 'paid_full' || ['repacked', 'bulk_consolidated', 'in_transit', 'shipped', 'received_canada', 'out_for_delivery', 'delivered'].includes(st);
        });

        const pendingDues = mergedList.filter((s: any) => {
          if (!s) return false;
          const st = String(s.status || '').toLowerCase();
          const paySt = String(s.payment_status || '').toLowerCase();
          if (st === 'draft' || st === 'draft estimate' || st === 'cancelled') return false;
          if (paySt === 'completed' || paySt === 'fully_paid' || paySt === 'paid_full') return false;
          return paySt === 'awaiting_balance' || st === 'repacked' || st === 'paid' || st === 'advance_paid' || st === 'holding' || st === 'inwarded' || st === 'qc_verified' || Number(s.remaining_balance_cad) > 0;
        });

        const holds = mergedList.filter((s: any) => {
          if (!s) return false;
          const st = String(s.status || '').toLowerCase();
          return s.warehouse_action === 'hold' || st === 'holding';
        });

        const drafts = mergedList.filter((s: any) => {
          if (!s) return false;
          const st = String(s.status || '').toLowerCase();
          return st === 'draft' || st === 'draft estimate';
        });

        if (settled.length > 0) {
          setActiveTab('history');
        } else if (pendingDues.length > 0) {
          setActiveTab('dues');
        } else if (holds.length > 0) {
          setActiveTab('hold');
        } else if (drafts.length > 0) {
          setActiveTab('drafts');
        } else {
          setActiveTab('new');
        }
      }

      if (whs.data && whs.data.length > 0) {
        setWarehouses(whs.data);
      } else {
        setWarehouses([
          { id: 'wh1', city: 'Delhi', pincode: '110077', address: 'C-N-246, Bamnoli Village, Sector 28 Dwarka, Dwarka, New Delhi', contact: '+91 9321852629' },
          { id: 'wh2', city: 'Mumbai', pincode: '400001', address: 'Gala 5, Hub 2, Andheri East', contact: '+91 98200 54321' }
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch database information', err);
      setWarehouses([
        { id: 'wh1', city: 'Delhi', pincode: '110077', address: 'C-N-246, Bamnoli Village, Sector 28 Dwarka, Dwarka, New Delhi' },
        { id: 'wh2', city: 'Mumbai', pincode: '400001', address: 'Gala 5, Hub 2, Andheri East' }
      ]);
    } finally {
      setIsFetching(false);
    }
  };

  // ── Event Handlers ──────────────────────────────────────────────────────
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setOrderNumber(text);
      setShowOrderNumberError(false);
    } catch (err) {
      console.error('Failed to read clipboard', err);
    }
  };

  // Reset wizard cleanly when starting a new order or discarding
  const handleStartNewOrder = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('layo_dashboard_flow_state');
      localStorage.removeItem('layo_pending_shipment');
      localStorage.removeItem('layo_pending_shipment_draft');
    }
    setEditingDraftId(null);
    setOriginType('online');
    setStoreName('');
    setOrderNumber('');
    setSenderName('');
    setOriginCity('');
    setSelectedWarehouse('');

    // Preselect verified default address if exists, otherwise clear
    const defaultAddr = savedAddresses.find(a => a.isDefault);
    if (defaultAddr) {
      setDestinationCity(defaultAddr.city || 'Toronto (GTA)');
      setDestinationAddress(defaultAddr.line1 || '');
      setSelectedSavedAddressId(defaultAddr.id);
    } else {
      setDestinationCity('');
      setDestinationAddress('');
      setSelectedSavedAddressId('');
    }

    setSelectedCategories([]);
    setQtyState({});
    setActiveDemoState({});
    setPromoQty(0);
    setWarehouseAction(null);
    setMorePackages(null);
    setSelectedHoldGroupId(null);
    setHoldOptionMode('existing');
    setShowOrderNumberError(false);
    setDeliveryType('normal');
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
        if (activeCategoryData[key]) {
          activeCategoryData[key].subs.forEach((_, idx) => {
            delete next[`${key}-${idx}-default`];
            demographicOptions.forEach(opt => {
              delete next[`${key}-${idx}-${opt.label}`];
            });
          });
        }
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
  // ── Derived State (memoised) ────────────────────────────────────────────
  const activeItems = useMemo(() => {
    const list: any[] = [];
    selectedCategories.forEach(catKey => {
      const cat = activeCategoryData[catKey];
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
    let nonPromoWeightGrams = 0;
    let totalPromoQty = promoQty;
    let isDocument = false;

    activeItems.forEach(item => {
      if (item.category === 'books' && item.subcategory.includes('Document')) {
        isDocument = true;
      }
      if (item.promo) {
        totalPromoQty += item.qty;
      } else {
        nonPromoWeightGrams += item.weightGrams;
      }
    });

    // 5 Free Essentials dynamic promo weight calculation
    const promoWeightGrams = Math.max(0, totalPromoQty - 5) * 50;
    const totalWeightGrams = nonPromoWeightGrams + promoWeightGrams;

    const hasItems = totalWeightGrams > 0 || totalPromoQty > 0;
    const displayWeightGrams = hasItems ? Math.max(50, totalWeightGrams) : 0;
    const weightKg = displayWeightGrams / 1000;

    if (!hasItems) {
      return {
        totalWeightGrams: 0,
        totalWeightKg: 0,
        totalPriceCAD: 0,
        totalPriceINR: 0,
        carrierBaseINR: 0,
        opsFeeINR: 0,
        marginINR: 0,
        valueReclaimed: 0,
      };
    }

    const costCalc = calculateLayoDeliveryCost({
      weightKg,
      deliveryType,
      isDocument,
      cadToInrRate,
    });

    return {
      totalWeightGrams: displayWeightGrams,
      totalWeightKg: weightKg,
      totalPriceCAD: costCalc.finalPriceCAD,
      totalPriceINR: costCalc.finalPriceINR,
      carrierBaseINR: costCalc.carrierBaseINR,
      opsFeeINR: costCalc.opsFeeINR,
      marginINR: costCalc.marginINR,
      valueReclaimed: 0
    };
  }, [activeItems, deliveryType, cadToInrRate]);

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



  // Auto-select hold action and active hold group when entering Step 3 if active hold groups exist
  useEffect(() => {
    if (currentStep === 3 && activeHoldGroups.length > 0 && warehouseAction === null) {
      setWarehouseAction('hold');
      setHoldOptionMode('existing');
      setSelectedHoldGroupId(activeHoldGroups[0].group_id);
    }
  }, [currentStep, activeHoldGroups, warehouseAction]);

  const getGuestDraftPayload = () => {
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

    const advanceCAD = Math.round(totals.totalPriceCAD * 0.20 * 100) / 100;
    const remainingCAD = Math.round((totals.totalPriceCAD - advanceCAD) * 100) / 100;
    const advanceINR = Math.round(totals.totalPriceINR * 0.20);
    const rawHoldGroupId = warehouseAction === 'hold'
      ? (holdOptionMode === 'existing' && selectedHoldGroupId ? normalizeHoldGroupId(selectedHoldGroupId) : normalizeHoldGroupId(`HOLD-${orderNumber || 'LYS' + Math.floor(1000 + Math.random() * 9000)}`))
      : null;
    const uuidHoldGroupId = stringToUuid(rawHoldGroupId);

    return {
      mode: originType === 'online' ? 'Online Retailer' : 'Personal Goods',
      destination_city: destinationCity || 'Toronto (GTA)',
      destination_address: destinationAddress || 'Canada',
      india_warehouse: selectedWarehouse || 'Delhi NCR Hub',
      external_order_id: orderNumber || null,
      total_weight: totals.totalWeightKg,
      total_cost: totals.totalPriceINR,
      items: itemsPayload,
      status: 'Draft Estimate',
      advance_pct: 20,
      advance_amount_cad: advanceCAD,
      advance_paid_inr: advanceINR,
      estimated_weight: totals.totalWeightKg,
      estimated_cost_cad: totals.totalPriceCAD,
      remaining_balance_cad: remainingCAD,
      payment_method: 'draft',
      warehouse_action: warehouseAction || 'ship',
      expected_packages: morePackages || 1,
      hold_group_id: uuidHoldGroupId,
    };
  };

  const handleAuthSuccess = async (authenticatedUser: any) => {
    setAuthModalOpen(false);
    if (authModalAction === 'save_draft') {
      await saveDraft(authenticatedUser);
    } else if (authModalAction === 'proceed_payment') {
      await handleProceedToCheckout(authenticatedUser);
    } else if (authModalAction === 'view_tab' && targetTabAfterAuth) {
      setActiveTab(targetTabAfterAuth);
      setTargetTabAfterAuth(null);
    }
  };

  // Checkout & Direct Booking Logic via Stripe
  const handleProceedToCheckout = async (currentUser?: any) => {
    if (activeItems.length === 0 || !selectedWarehouse || !destinationAddress) {
      return;
    }

    const activeUser = currentUser || user;
    if (!activeUser) {
      try {
        localStorage.setItem('layo_pending_guest_draft', JSON.stringify(getGuestDraftPayload()));
      } catch (e) {}
      setAuthModalAction('proceed_payment');
      setAuthModalTitle('Confirm Your Booking');
      setAuthModalSubtitle('Sign in or create an account to authorize your 20% advance booking.');
      setAuthModalOpen(true);
      return;
    }

    setIsProcessingPayment(true);
    autoSaveAddress(destinationCity, destinationAddress);

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

      const totalCostCAD = totals.totalPriceCAD > 0 ? totals.totalPriceCAD : 25.0;
      const advanceCAD = Math.round(totalCostCAD * 0.20 * 100) / 100;
      const advanceINR = Math.round(totals.totalPriceINR * 0.20);
      const remainingCAD = Math.round((totalCostCAD - advanceCAD) * 100) / 100;

      const resolvedHoldGroupId = warehouseAction === 'hold'
        ? (holdOptionMode === 'existing' && selectedHoldGroupId ? normalizeHoldGroupId(selectedHoldGroupId) : normalizeHoldGroupId(`HOLD-${orderNumber || 'LYS' + Math.floor(1000 + Math.random() * 9000)}`))
        : null;

      // Inherit expected packages from existing hold group so group capacity stays consistent
      let groupExpectedPackages = morePackages || 1;
      if (warehouseAction === 'hold' && holdOptionMode === 'existing' && resolvedHoldGroupId) {
        const existingGroup = activeHoldGroups.find(g => g.group_id === resolvedHoldGroupId || g.groupKey === resolvedHoldGroupId);
        if (existingGroup) {
          groupExpectedPackages = existingGroup.expectedPackages;
        } else {
          const groupShips = shipments.filter(s => getHoldGroupKey(s) === resolvedHoldGroupId);
          groupExpectedPackages = groupShips.reduce((max, it) => Math.max(max, Number(it.expected_packages || 0)), 1);
        }
      }

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
            status: 'advance_pending',
            payment_status: 'advance_pending',
            advance_pct: 20,
            advance_amount_cad: advanceCAD,
            advance_paid_inr: advanceINR,
            estimated_weight: totals.totalWeightKg,
            estimated_cost_cad: totalCostCAD,
            remaining_balance_cad: remainingCAD,
            warehouse_action: warehouseAction || 'ship',
            expected_packages: groupExpectedPackages,
            hold_group_id: resolvedHoldGroupId,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingDraftId);
      } else {
        // Create draft shipment linked to this payment
        const { data } = await insertShipment({
          user_id: activeUser?.id,
          mode: originType === 'online' ? 'Online Retailer' : 'Personal Goods',
          destination_city: destinationCity || 'Toronto (GTA)',
          destination_address: destinationAddress || 'Canada',
          india_warehouse: selectedWarehouse || 'Delhi NCR Hub',
          external_order_id: orderNumber || null,
          total_weight: totals.totalWeightKg,
          total_cost: totals.totalPriceINR,
          items: itemsPayload,
          status: 'advance_pending',
          payment_status: 'advance_pending',
          advance_pct: 20,
          advance_amount_cad: advanceCAD,
          advance_paid_inr: advanceINR,
          estimated_weight: totals.totalWeightKg,
          estimated_cost_cad: totalCostCAD,
          remaining_balance_cad: remainingCAD,
          payment_method: 'stripe',
          warehouse_action: warehouseAction || 'ship',
          expected_packages: groupExpectedPackages,
          hold_group_id: resolvedHoldGroupId,
        }, { id: activeUser?.id, email: activeUser?.email, role: 'customer' });
        if (data && data[0]) {
          targetShipmentId = data[0].id;
        }
      }

      // Initialize Stripe Checkout Session with 20% Advance Amount
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCAD: advanceCAD.toFixed(2),
          totalCostCAD: totalCostCAD.toFixed(2),
          isAdvance: true,
          shipmentId: targetShipmentId,
          userId: activeUser?.id,
          userEmail: activeUser?.email,
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
    } catch (err: any  ) {
      console.error('Failed to complete Stripe booking initialization:', err);
      alert(`Payment Gateway Error: ${err.message || 'Could not connect to Stripe. Please try again.'}`);
      setIsProcessingPayment(false);
    }
  };



  // Pay existing draft directly via Stripe (20% Advance)
  const handlePayDraftWithStripe = async (s: any) => {
    try {
      const inrRate = cadToInrRate > 0 ? cadToInrRate : 68.0;
      const totalINR = Number(s.total_cost) || 0;
      let totalCAD = totalINR > 0 ? Number((totalINR / inrRate).toFixed(2)) : 25.0;
      if (s.estimated_cost_cad && Number(s.estimated_cost_cad) > 0 && Number(s.estimated_cost_cad) < (totalINR > 100 ? totalINR / 10 : 5000)) {
        totalCAD = Number(Number(s.estimated_cost_cad).toFixed(2));
      } else if (s.amount_cad && Number(s.amount_cad) > 0 && Number(s.amount_cad) < (totalINR > 100 ? totalINR / 10 : 5000)) {
        totalCAD = Number(Number(s.amount_cad).toFixed(2));
      }
      const advanceCAD = Number((totalCAD * 0.20).toFixed(2));

      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCAD: advanceCAD.toFixed(2),
          totalCostCAD: totalCAD.toFixed(2),
          isAdvance: true,
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

  // Intercepting click on Logo to cleanly reset order flow to Step 1
  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    handleStartNewOrder();
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
          setPromoQty(it.quantity || 1);
          return;
        }
        const catKey = it.category;
        if (catKey && activeCategoryData[catKey]) {
          catsWithItems.add(catKey);
          const subIndex = activeCategoryData[catKey].subs.findIndex(
            (sub: any) => sub.name.toLowerCase() === (it.subcategory || '').toLowerCase()
          );
          const effectiveSubIdx = subIndex >= 0 ? subIndex : 0;
          const demo = it.demographic || 'Adult';
          const key = activeCategoryData[catKey].requiresAge
            ? `${catKey}-${effectiveSubIdx}-${demo}`
            : `${catKey}-${effectiveSubIdx}-default`;
          newQtyState[key] = (newQtyState[key] || 0) + (it.quantity || 1);
          if (activeCategoryData[catKey].requiresAge) {
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
    setCurrentStep(2);
  };

  // Delete draft or shipment
  const handleDeleteDraft = async (shipmentId: string, externalOrderId?: string, rawDraftId?: string) => {
    if (!confirm('Are you sure you want to delete this draft estimate?')) return;
    try {
      // 1. Delete via server endpoint to guarantee database deletion
      await fetch('/api/shipments/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipmentId,
          externalOrderId: externalOrderId || null,
          rawDraftId: rawDraftId || null,
          userId: user?.id || null,
        })
      });

      // 2. Also try client-side cleanup
      try {
        if (rawDraftId) await deleteDraftEstimate(rawDraftId);
        if (externalOrderId) await deleteDraftEstimate(externalOrderId);
        if (shipmentId) await deleteDraftEstimate(shipmentId);
        await supabase.from('shipments').delete().eq('id', shipmentId);
        if (externalOrderId) {
          await supabase.from('shipments').delete().eq('external_order_id', externalOrderId);
        }
      } catch (e) {}

      // 3. Remove from local storage drafts cache
      try {
        const localKey = getLocalShipmentsKey(user?.id);
        const rawLocal = localStorage.getItem(localKey) || localStorage.getItem('layo_local_shipments');
        if (rawLocal) {
          const parsed = JSON.parse(rawLocal);
          const filtered = parsed.filter((s: any) =>
            s &&
            s.id !== shipmentId &&
            (!rawDraftId || s.id !== rawDraftId) &&
            (!externalOrderId || s.external_order_id !== externalOrderId)
          );
          localStorage.setItem(localKey, JSON.stringify(filtered));
          localStorage.removeItem('layo_local_shipments');
        }
      } catch (e) {}

      // 4. Remove from local React state immediately
      setShipments(prev => prev.filter(s =>
        s.id !== shipmentId &&
        (!rawDraftId || s.id !== rawDraftId) &&
        (!externalOrderId || s.external_order_id !== externalOrderId)
      ));

      // 5. Reset form wizard if this draft was being edited
      if (editingDraftId === shipmentId || (rawDraftId && editingDraftId === rawDraftId)) {
        handleStartNewOrder();
      }

      // 6. Clear any local storage draft items
      localStorage.removeItem('layo_pending_shipment');
      localStorage.removeItem('layo_pending_shipment_draft');
      localStorage.removeItem('layo_dashboard_flow_state');

      // 7. Refresh from database to sync
      if (user?.id) {
        await fetchDashboardData(user.id);
      }
    } catch (err: any) {
      console.error('Delete shipment error:', err);
      alert(`Failed to delete draft: ${err.message}`);
    }
  };

  // Save to drafts in DB
  const saveDraft = async (currentUser?: any) => {
    const activeUser = currentUser || user;
    if (!activeUser) {
      try {
        localStorage.setItem('layo_pending_guest_draft', JSON.stringify(getGuestDraftPayload()));
      } catch (e) {}
      setAuthModalAction('save_draft');
      setAuthModalTitle('Save to Your Layo Locker');
      setAuthModalSubtitle('Sign in or create an account to save this draft estimate to your profile.');
      setAuthModalOpen(true);
      return;
    }

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

      autoSaveAddress(destinationCity, destinationAddress);

      const advanceCAD = Math.round(totals.totalPriceCAD * 0.20 * 100) / 100;
      const remainingCAD = Math.round((totals.totalPriceCAD - advanceCAD) * 100) / 100;
      const advanceINR = Math.round(totals.totalPriceINR * 0.20);
      const rawHoldGroupId = warehouseAction === 'hold'
        ? (holdOptionMode === 'existing' && selectedHoldGroupId ? normalizeHoldGroupId(selectedHoldGroupId) : normalizeHoldGroupId(`HOLD-${orderNumber || 'LYS' + Math.floor(1000 + Math.random() * 9000)}`))
        : null;
      const uuidHoldGroupId = stringToUuid(rawHoldGroupId);

      let groupExpectedPackages = morePackages || 1;
      if (warehouseAction === 'hold' && holdOptionMode === 'existing' && rawHoldGroupId) {
        const existingGroup = activeHoldGroups.find(g => g.group_id === rawHoldGroupId || g.groupKey === rawHoldGroupId);
        if (existingGroup) {
          groupExpectedPackages = existingGroup.expectedPackages;
        } else {
          const groupShips = shipments.filter(s => getHoldGroupKey(s) === rawHoldGroupId);
          groupExpectedPackages = groupShips.reduce((max, it) => Math.max(max, Number(it.expected_packages || 0)), 1);
        }
      }

      // Save to shipments table (which synchronizes with draft_estimates using canonical ID)
      if (editingDraftId) {
        const updatePayload = {
          destination_city: destinationCity || 'Draft City',
          destination_address: destinationAddress || 'Draft Address',
          india_warehouse: selectedWarehouse || null,
          external_order_id: orderNumber || null,
          total_weight: totals.totalWeightKg,
          total_cost: totals.totalPriceINR,
          estimated_cost_cad: totals.totalPriceCAD,
          advance_pct: 20,
          advance_amount_cad: advanceCAD,
          remaining_balance_cad: remainingCAD,
          items: itemsPayload,
          status: 'Draft Estimate',
          warehouse_action: warehouseAction || 'ship',
          expected_packages: groupExpectedPackages,
          hold_group_id: uuidHoldGroupId,
          updated_at: new Date().toISOString()
        };

        await supabase
          .from('shipments')
          .update(updatePayload)
          .eq('id', editingDraftId);

        try {
          await saveDraftEstimate({
            ...updatePayload,
            id: editingDraftId,
            user_id: activeUser?.id || null,
            customer_email: activeUser?.email || null,
            mode: originType === 'online' ? 'Online Retailer' : 'Personal Goods',
            external_order_id: orderNumber || editingDraftId,
          });
        } catch (e) {}

        setShipments(prev => {
          const nextList = prev.map(s =>
            s.id === editingDraftId
              ? { ...s, ...updatePayload }
              : s
          );
          try {
            localStorage.setItem(getLocalShipmentsKey(activeUser?.id), JSON.stringify(nextList));
          } catch (e) {}
          return nextList;
        });
        setEditingDraftId(null);
        if (activeUser?.id) {
          fetchDashboardData(activeUser.id);
        }
      } else {
        const { data } = await insertShipment({
          user_id: activeUser?.id,
          mode: originType === 'online' ? 'Online Retailer' : 'Personal Goods',
          destination_city: destinationCity || 'Draft City',
          destination_address: destinationAddress || 'Draft Address',
          india_warehouse: selectedWarehouse || null,
          external_order_id: orderNumber || null,
          total_weight: totals.totalWeightKg,
          total_cost: totals.totalPriceINR,
          items: itemsPayload,
          status: 'Draft Estimate',
          advance_pct: 20,
          advance_amount_cad: advanceCAD,
          advance_paid_inr: advanceINR,
          estimated_weight: totals.totalWeightKg,
          estimated_cost_cad: totals.totalPriceCAD,
          remaining_balance_cad: remainingCAD,
          payment_method: 'draft',
          warehouse_action: warehouseAction || 'ship',
          expected_packages: groupExpectedPackages,
          hold_group_id: uuidHoldGroupId,
        }, { id: activeUser?.id, email: activeUser?.email, role: 'customer' });
        if (data && data[0]) {
          const parsed = parseShipment(data[0]);
          setShipments(prev => {
            const nextList = [parsed, ...prev.filter(x => x.id !== parsed.id)];
            try {
              localStorage.setItem(getLocalShipmentsKey(activeUser?.id), JSON.stringify(nextList));
            } catch (e) {}
            return nextList;
          });
        }
        if (activeUser?.id) {
          fetchDashboardData(activeUser.id);
        }
      }
    } catch (err) {
      console.error('Failed to save draft shipment:', err);
    } finally {
      localStorage.removeItem('layo_pending_shipment');
      localStorage.removeItem('layo_pending_shipment_draft');
      localStorage.removeItem('layo_dashboard_flow_state');
      handleStartNewOrder();
      setShowDraftModal(false);
      setActiveTab('drafts');
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

  if (!user && activeTab !== 'new') {
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
            <button
              type="button"
              onClick={() => {
                setAuthModalAction('signin');
                setAuthModalTitle('Sign In to Access Locker');
                setAuthModalSubtitle('Access your shipments, forwarding addresses, and dues.');
                setAuthModalOpen(true);
              }}
              className="block w-full py-4 bg-[#FF5A65] text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-[#e24550] transition-all text-center shadow-md shadow-[#FF5A65]/20 cursor-pointer"
            >
              Sign In to Access Locker
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthModalAction('signin');
                setAuthModalTitle('Create New Account');
                setAuthModalSubtitle('Set up your free account to activate your virtual Indian locker.');
                setAuthModalOpen(true);
              }}
              className="block w-full py-3.5 border border-black/10 text-[#0E1F38] font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-black/5 transition-all text-center cursor-pointer"
            >
              Create New Account
            </button>
          </div>
          <button 
            type="button"
            onClick={() => handleStartNewOrder()}
            className="block text-xs text-[#0E1F38]/60 hover:text-[#0E1F38] pt-2 mx-auto cursor-pointer"
          >
            ← Calculate / Start New Order
          </button>
        </div>
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
          title={authModalTitle}
          subtitle={authModalSubtitle}
        />
      </div>
    );
  }

  const selectedWarehouseObject = warehouses.find(w => w.id === selectedWarehouse);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="bg-[#FAF8EE] text-[#0E1F38] min-h-screen flex flex-col font-sans selection:bg-[#FF5A65] selection:text-white">
      
      {/* ── Top App Bar ── */}
      <header className="bg-[#FAF8EE]/90 backdrop-blur-md border-b border-black/5 flex justify-between items-center w-full px-4 sm:px-6 md:px-16 py-3 sm:py-4 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-4">
          <Logo showTagline={false} darkText={true} onClick={handleLogoClick} />
        </div>
        <div className="flex items-center gap-3 sm:gap-6">
          <Link 
            href="/" 
            onClick={() => handleStartNewOrder()}
            className="text-[#0E1F38]/70 hover:text-[#FF5A65] transition-colors text-xs sm:text-sm font-semibold"
          >
            Home
          </Link>
          {['admin@layo.com', 'ankur@layo.com'].includes(user?.email || '') && (
            <Link href="/admin" className="text-[#0E1F38]/70 hover:text-[#FF5A65] transition-colors text-xs sm:text-sm font-semibold">Admin</Link>
          )}
          {user ? (
            <button 
              onClick={async () => {
                await clearUserSession();
                router.push('/login');
              }} 
              className="text-[#FF5A65] hover:bg-[#FF5A65] hover:text-white text-[11px] sm:text-xs font-bold uppercase tracking-wider border border-[#FF5A65]/30 bg-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Sign Out
            </button>
          ) : (
            <button 
              onClick={() => {
                setAuthModalAction('signin');
                setAuthModalTitle('Sign In to Your Locker');
                setAuthModalSubtitle('Access your shipments, forwarding addresses, and dues.');
                setAuthModalOpen(true);
              }}
              className="bg-[#FF5A65] hover:bg-[#e24550] text-white text-[11px] sm:text-xs font-bold uppercase tracking-wider px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Sign In / Register
            </button>
          )}
        </div>
      </header>

      {/* ── Main Panel ── */}
      <main className="flex-grow w-full max-w-[1200px] mx-auto px-3 sm:px-6 py-6 sm:py-12">
        
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
        <div className="flex flex-wrap justify-center border-b border-black/10 mb-8 max-w-4xl mx-auto gap-1 sm:gap-2">
          <button
            onClick={handleStartNewOrder}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === 'new' ? 'border-[#FF5A65] text-[#FF5A65]' : 'border-transparent text-[#0E1F38]/60 hover:text-[#0E1F38]'
            }`}
          >
            New Order
          </button>
          
          <button
            onClick={() => {
              if (!user) {
                setAuthModalAction('view_tab');
                setTargetTabAfterAuth('drafts');
                setAuthModalTitle('Sign In to View Drafts');
                setAuthModalSubtitle('Please sign in or create an account to view your saved draft estimates.');
                setAuthModalOpen(true);
                return;
              }
              setActiveTab('drafts');
            }}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'drafts' ? 'border-[#FF5A65] text-[#FF5A65]' : 'border-transparent text-[#0E1F38]/60 hover:text-[#0E1F38]'
            }`}
          >
            <span>Draft Estimates</span>
            {draftsList.length > 0 && (
              <span className="bg-slate-200 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                {draftsList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              if (!user) {
                setAuthModalAction('view_tab');
                setTargetTabAfterAuth('hold');
                setAuthModalTitle('Sign In to View Hold Shipments');
                setAuthModalSubtitle('Please sign in or create an account to view your consolidated hold groups.');
                setAuthModalOpen(true);
                return;
              }
              setActiveTab('hold');
            }}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'hold' ? 'border-[#FF5A65] text-[#FF5A65]' : 'border-transparent text-[#0E1F38]/60 hover:text-[#0E1F38]'
            }`}
          >
            <span>Hold &amp; Consolidation</span>
            {activeHoldGroups.length > 0 && (
              <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                {activeHoldGroups.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              if (!user) {
                setAuthModalAction('view_tab');
                setTargetTabAfterAuth('dues');
                setAuthModalTitle('Sign In to View Active Orders');
                setAuthModalSubtitle('Please sign in or create an account to view your active shipments and dues.');
                setAuthModalOpen(true);
                return;
              }
              setActiveTab('dues');
            }}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'dues' ? 'border-[#FF5A65] text-[#FF5A65]' : 'border-transparent text-[#0E1F38]/60 hover:text-[#0E1F38]'
            }`}
          >
            <span>💳 Active Orders &amp; Dues</span>
            {groupedPendingDues.length > 0 && (
              <span className="bg-[#FF5A65] text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                {groupedPendingDues.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              if (!user) {
                setAuthModalAction('view_tab');
                setTargetTabAfterAuth('history');
                setAuthModalTitle('Sign In to View Shipments');
                setAuthModalSubtitle('Please sign in or create an account to view your completed shipments.');
                setAuthModalOpen(true);
                return;
              }
              setActiveTab('history');
            }}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === 'history' ? 'border-[#FF5A65] text-[#FF5A65]' : 'border-transparent text-[#0E1F38]/60 hover:text-[#0E1F38]'
            }`}
          >
            My Shipments ({myShipmentsList.length})
          </button>
        </div>

        {activeTab === 'drafts' ? (
          /* ── DRAFT ESTIMATES TAB ── */
          <div className="space-y-6">
            <div className="bg-slate-100 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-3">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-slate-700 text-3xl">edit_note</span>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#0E1F38]">Saved Draft Estimates</h2>
                  <p className="text-xs sm:text-sm text-[#0E1F38]/70 font-medium">
                    Review estimate calculations and pay 20% advance deposit to activate your virtual locker booking.
                  </p>
                </div>
              </div>
            </div>

            {draftsList.length === 0 ? (
              <div className="bg-white border border-black/5 rounded-3xl p-12 text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-600">
                  <span className="material-symbols-outlined text-3xl">draft</span>
                </div>
                <h3 className="text-lg font-bold text-[#0E1F38]">No Saved Draft Estimates</h3>
                <p className="text-[#0E1F38]/60 text-sm max-w-sm mx-auto font-light">
                  You don't have any pending draft estimates right now. Start building a new quote estimate!
                </p>
                <button
                  onClick={handleStartNewOrder}
                  className="bg-[#FF5A65] text-white font-bold text-xs uppercase tracking-widest px-6 py-3.5 rounded-2xl hover:bg-[#e24550] active:scale-95 transition-all shadow-md shadow-[#FF5A65]/20 mt-2 cursor-pointer"
                >
                  Create New Order
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {draftsList.map(s => {
                  const estCost = Number(s.estimated_cost_cad || s.amount_cad || (s.total_cost && cadToInrRate > 0 ? s.total_cost / cadToInrRate : 25.0)) || 25.0;
                  const advanceCAD = Number((estCost * 0.20).toFixed(2));
                  const displayId = formatShipmentId(s.id);

                  return (
                    <div key={s.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all space-y-5 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start border-b border-black/5 pb-4">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                              Draft #{displayId}
                            </span>
                            <h3 className="text-lg font-bold text-[#0E1F38] mt-0.5">
                              {s.external_order_id ? `Ref Order #${s.external_order_id}` : 'Saved Shipping Quote'}
                            </h3>
                          </div>
                          <span className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-slate-200">
                            Draft Estimate
                          </span>
                        </div>

                        <div className="bg-[#FAF8EE] rounded-2xl p-4 border border-black/5 space-y-2 text-xs text-[#0E1F38]">
                          <div className="flex justify-between items-center font-semibold">
                            <span className="text-[#0E1F38]/60">Estimated Total Cost:</span>
                            <span className="text-[#0E1F38] font-bold">${estCost.toFixed(2)} CAD</span>
                          </div>
                          <div className="flex justify-between items-center font-semibold">
                            <span className="text-[#0E1F38]/60">Est. Package Weight:</span>
                            <span className="text-[#0E1F38] font-bold">{getShipmentEstimatedWeight(s).toFixed(2)} kg</span>
                          </div>
                          <div className="flex justify-between items-center font-semibold pt-1 border-t border-black/5">
                            <span className="text-[#0E1F38]/60">Destination:</span>
                            <span className="text-[#0E1F38] truncate max-w-[200px]">
                              {s.destination_city || 'Toronto (GTA)'} ({s.destination_address || 'Canada'})
                            </span>
                          </div>
                        </div>

                        {Array.isArray(s.items) && s.items.length > 0 && (
                          <div className="bg-[#FAF8EE] p-3 rounded-2xl border border-black/5 space-y-1.5 text-xs">
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#0E1F38]/60 block">
                              📦 Declared Items ({s.items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0)} items):
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {s.items.slice(0, 3).map((it: any, iIdx: number) => (
                                <span key={iIdx} className="px-2 py-0.5 bg-white border border-black/5 rounded-lg text-[11px] font-medium text-[#0E1F38]">
                                  {it.quantity || 1}x {it.subcategory || it.name || it.category}
                                </span>
                              ))}
                              {s.items.length > 3 && (
                                <span className="px-2 py-0.5 bg-slate-200/80 rounded-lg text-[10px] font-black text-slate-700">
                                  +{s.items.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex justify-between items-center text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Due Today (20% Advance)</span>
                            <span className="text-sm font-black text-amber-900">${advanceCAD.toFixed(2)} CAD</span>
                          </div>
                          <span className="text-[10px] text-amber-700 font-medium max-w-[140px] text-right">
                            Lock locker space &amp; get hub delivery address
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        <button
                          onClick={async () => {
                            try {
                              setIsProcessingPayment(true);
                              const res = await fetch('/api/stripe/create-checkout-session', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  amountCAD: advanceCAD,
                                  shipmentId: s.id,
                                  userId: user?.id,
                                  userEmail: user?.email,
                                  isAdvance: true,
                                  destinationCity: s.destination_city || 'Toronto (GTA)',
                                  destinationAddress: s.destination_address || '',
                                  warehouseName: s.india_warehouse || 'Indian Locker Hub',
                                  totalWeightKg: s.total_weight || 1.0,
                                  itemsSummary: `20% Advance booking deposit for Layo Locker #${displayId}`,
                                }),
                              });
                              const data = await res.json();
                              if (data.url) window.location.href = data.url;
                              else alert(data.error || 'Failed to initiate payment');
                            } catch (err: any) {
                              alert('Payment error: ' + (err.message || 'Please try again'));
                            } finally {
                              setIsProcessingPayment(false);
                            }
                          }}
                          disabled={isProcessingPayment}
                          className="w-full py-3.5 bg-[#FF5A65] hover:bg-[#e24550] text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-md shadow-[#FF5A65]/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-sm">lock</span>
                          <span>Pay 20% Deposit (${advanceCAD.toFixed(2)} CAD) &amp; Book</span>
                        </button>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setSelectedOrderDetails(s)}
                            className="flex-1 py-2.5 bg-black/5 hover:bg-black/10 text-[#0E1F38] font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <span className="material-symbols-outlined text-sm">visibility</span>
                            <span>View Estimate Details</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditDraft(s)}
                            className="py-2.5 px-3 bg-black/5 hover:bg-black/10 text-[#0E1F38] font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                            title="Edit Draft Items"
                          >
                            <span className="material-symbols-outlined text-sm">edit_square</span>
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDraft(s.id, s.external_order_id, s.raw_draft_id)}
                            className="py-2.5 px-3 bg-black/5 hover:bg-red-50 text-black/60 hover:text-red-600 font-bold rounded-xl border border-black/5 transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                            title="Delete Draft"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
            )}
          </div>
        ) : activeTab === 'hold' ? (
          /* ── HOLD & CONSOLIDATION TAB ── */
          <div className="space-y-6">
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-3xl p-6 sm:p-8 space-y-3">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-indigo-600 text-3xl">inventory_2</span>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#0E1F38]">Hold &amp; Consolidation Hub</h2>
                  <p className="text-xs sm:text-sm text-[#0E1F38]/70 font-medium">
                    Combine multiple packages at our India Hub before airfreight dispatch to maximize bulk savings.
                  </p>
                </div>
              </div>
            </div>

            {activeHoldGroups.length === 0 ? (
              <div className="bg-white border border-black/5 rounded-3xl p-12 text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center mx-auto text-indigo-600">
                  <span className="material-symbols-outlined text-3xl">widgets</span>
                </div>
                <h3 className="text-lg font-bold text-[#0E1F38]">No Open Hold Groups</h3>
                <p className="text-[#0E1F38]/60 text-sm max-w-sm mx-auto font-light">
                  You don't have any open package consolidation hold groups right now. Once all expected packages are added to a hold group, it shifts automatically to Payment Dues.
                </p>
                <button
                  onClick={handleStartNewOrder}
                  className="bg-[#FF5A65] text-white font-bold text-xs uppercase tracking-widest px-6 py-3.5 rounded-2xl hover:bg-[#e24550] active:scale-95 transition-all shadow-md shadow-[#FF5A65]/20 mt-2 cursor-pointer"
                >
                  Create New Order
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeHoldGroups.map(grp => {
                  const primary = grp.primaryShipment;

                  return (
                    <div key={grp.group_id} className="bg-white border-2 border-indigo-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all space-y-5 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start border-b border-black/5 pb-4">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                              Hold Group #{grp.group_id}
                            </span>
                            <h3 className="text-lg font-bold text-[#0E1F38] mt-0.5">
                              Consolidation Hold
                            </h3>
                          </div>
                          <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-indigo-300">
                            Holding @ India Hub
                          </span>
                        </div>

                        <div className="bg-[#FAF8EE] rounded-2xl p-4 border border-black/5 space-y-2 text-xs text-[#0E1F38]">
                          <div className="flex justify-between items-center font-semibold">
                            <span className="text-[#0E1F38]/60">Status:</span>
                            <span className="text-indigo-700 font-bold uppercase">Waiting for Additional Packages</span>
                          </div>
                          <div className="flex justify-between items-center font-semibold">
                            <span className="text-[#0E1F38]/60">Linked Packages Progress:</span>
                            <span className="text-[#0E1F38] font-bold text-sm">
                              {grp.currentLinkedCount} of {grp.totalCapacity} Packages Linked
                            </span>
                          </div>
                          <div className="flex justify-between items-center font-semibold pt-1 border-t border-black/5">
                            <span className="text-[#0E1F38]/60">Destination Address:</span>
                            <span className="text-[#0E1F38] truncate max-w-[200px]">
                              {primary?.destination_city || 'Toronto (GTA)'} ({primary?.destination_address || 'Canada'})
                            </span>
                          </div>
                        </div>

                        {/* Linked packages summary list */}
                        <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100 space-y-1.5 text-xs">
                          <span className="text-[10px] font-black text-indigo-800 uppercase tracking-wider block">Linked Packages in this Group:</span>
                          {grp.shipments.map((s, sIdx) => (
                            <div key={s.id || sIdx} className="flex justify-between items-center text-[11px] bg-white p-2.5 rounded-xl border border-black/5">
                              <div>
                                <span className="font-mono font-bold text-[#0E1F38]">#{formatShipmentId(s.id)}</span>
                                <span className="text-[#0E1F38]/70 font-medium ml-2">{s.external_order_id ? `Ref: #${s.external_order_id}` : `Package ${sIdx + 1}`}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedOrderDetails(s)}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg border border-indigo-200 text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                              >
                                <span className="material-symbols-outlined text-xs">visibility</span>
                                <span>Details</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 space-y-2">
                        <button
                          type="button"
                          onClick={() => {
                            const groupEstimatedWeight = grp.shipments.reduce((sum: number, s: any) => sum + getShipmentEstimatedWeight(s), 0);
                            const groupOpsWeight = grp.shipments.reduce((max: number, s: any) => Math.max(max, Number(s.actual_weight || 0)), 0);
                            const groupRepacked = grp.shipments.some((s: any) => ['repacked', 'bulk_consolidated', 'in_transit', 'received_canada', 'out_for_delivery', 'delivered'].includes(String(s.status || '').toLowerCase()) || Boolean(s.stage_timestamps?.repacked));
                            const groupWeightVerified = groupRepacked && groupOpsWeight > 0;
                            const composite = {
                              ...(grp.primaryShipment || grp.shipments[0] || {}),
                              id: grp.group_id,
                              isHoldGroup: true,
                              status: groupRepacked ? 'repacked' : 'holding',
                              hold_group_id: grp.group_id,
                              items: grp.shipments.flatMap((s: any) => s.items || []),
                              estimated_weight: groupEstimatedWeight,
                              total_weight: groupEstimatedWeight,
                              actual_weight: groupWeightVerified ? groupOpsWeight : null,
                              isWeightVerified: groupWeightVerified,
                              isRepackDone: groupRepacked,
                              total_cost: grp.shipments.reduce((sum: number, s: any) => sum + Number(s.total_cost || 0), 0),
                              advance_amount_cad: grp.shipments.reduce((sum: number, s: any) => sum + Number(s.advance_amount_cad || 0), 0),
                              shipments: grp.shipments,
                            };
                            setSelectedOrderDetails(composite);
                          }}
                          className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold text-xs rounded-xl border border-indigo-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <span className="material-symbols-outlined text-sm">inventory_2</span>
                          <span>View Hold Group &amp; Declared Items Details</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedHoldGroupId(grp.group_id);
                            setHoldOptionMode('existing');
                            setWarehouseAction('hold');
                            if (primary?.destination_city) {
                              setDestinationCity(primary.destination_city);
                            }
                            if (primary?.destination_address) {
                              setDestinationAddress(primary.destination_address);
                            }
                            if (primary?.india_warehouse) {
                              setSelectedWarehouse(primary.india_warehouse);
                            }
                            setActiveTab('new');
                            setCurrentStep(1);
                          }}
                          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">add</span>
                          <span>+ Add Another Package to this Hold Group</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'dues' ? (
          /* ── REMAINING PAYMENT DUES TAB ── */
          <div className="space-y-6">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 sm:p-8 space-y-3">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-amber-600 text-3xl">local_shipping</span>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#0E1F38]">Active Orders &amp; Balance Dues</h2>
                  <p className="text-xs sm:text-sm text-[#0E1F38]/70 font-medium">
                    Track in-progress hub arrivals, SOP repack, digital scale inspection, and settle final payments
                  </p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-[#0E1F38]/70 font-light leading-relaxed">
                Orders with confirmed 20% advance booking are tracked here while traveling to our India Hub. Once our team strips merchant packaging, seals items into standard Layo Green Boxes, and records actual digital scale weight (Step 3), final 80% remaining balance payment unlocks here for international airfreight dispatch to Canada.
              </p>
            </div>

            {groupedPendingDues.length === 0 ? (
              <div className="bg-[#FAF8EE] border border-black/5 rounded-3xl p-12 text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
                  <span className="material-symbols-outlined text-3xl">task_alt</span>
                </div>
                <h3 className="text-lg font-bold text-[#0E1F38]">No Pending Payment Dues</h3>
                <p className="text-[#0E1F38]/60 text-sm max-w-sm mx-auto font-light">
                  You have no outstanding balance payments! All your repacked orders are settled or currently processing.
                </p>
                <button
                  onClick={() => setActiveTab('history')}
                  className="bg-[#0E1F38] text-white font-bold text-xs uppercase tracking-widest px-6 py-3.5 rounded-2xl hover:bg-[#1e3a60] active:scale-95 transition-all shadow-md mt-2 cursor-pointer"
                >
                  View My Shipments ({myShipmentsList.length})
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {groupedPendingDues.map(grp => {
                  const primary = grp.primary;
                  const isRepackDone = grp.isRepackDone;
                  const displayId = grp.isHoldGroup ? grp.groupKey : formatShipmentId(primary?.id);

                  return (
                    <div key={grp.groupKey} className={`bg-white border-2 rounded-3xl p-6 shadow-md hover:shadow-lg transition-all space-y-5 flex flex-col justify-between ${
                      isRepackDone ? 'border-amber-400/60' : 'border-blue-200'
                    }`}>
                      <div className="space-y-4">
                        {/* Card Header */}
                        <div className="flex justify-between items-start border-b border-black/5 pb-4">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#FF5A65]">
                              {grp.isHoldGroup ? `Hold Group #${displayId}` : `Locker Order #${displayId}`}
                            </span>
                            <h3 className="text-lg font-bold text-[#0E1F38] mt-0.5">
                              {grp.isHoldGroup ? `Consolidated Hold Group (${grp.items.length} Packages)` : (primary?.external_order_id ? `Order #${String(primary.external_order_id)}` : 'Standard Parcel Repack')}
                            </h3>
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${
                            grp.isRepackDone && grp.isWeightVerified ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-blue-100 text-blue-800 border-blue-300'
                          }`}>
                            {grp.isRepackDone && grp.isWeightVerified ? 'Repacked & Scale Verified' : 'Step 1-3: India Hub In Progress'}
                          </span>
                        </div>

                        {/* Combined Packages List if Hold Group */}
                        {grp.isHoldGroup && (
                          <div className="bg-indigo-50/60 p-3 rounded-2xl border border-indigo-100 space-y-1.5 text-xs">
                            <span className="text-[10px] font-black text-indigo-800 uppercase tracking-wider block">Combined Packages in this Group:</span>
                            {grp.items.map((it: any, itIdx: number) => (
                              <div key={it.id || itIdx} className="flex justify-between items-center text-[11px] bg-white p-2 rounded-xl border border-black/5">
                                <span className="font-mono font-bold text-[#0E1F38]">#{formatShipmentId(it.id)}</span>
                                <span className="text-[#0E1F38]/70 font-medium">{it.external_order_id ? `Ref: #${String(it.external_order_id)}` : `Package ${itIdx + 1}`}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Ops Repack & Scale Inspection Result */}
                        {grp.isRepackDone && grp.isWeightVerified ? (
                          <div className="bg-[#FAF8EE] rounded-2xl p-4 border border-black/5 space-y-2 text-xs text-[#0E1F38]">
                            <div className="flex justify-between items-center font-semibold">
                              <span className="text-[#0E1F38]/60">Standard Layo Box Size:</span>
                              <span className="text-[#0E1F38] font-bold">{formatBoxDimensions(grp.boxDimensions)}</span>
                            </div>
                            <div className="flex justify-between items-center font-semibold">
                              <span className="text-[#0E1F38]/60">Estimated Declared Weight:</span>
                              <span className="text-[#0E1F38] font-bold">{grp.combinedEstimatedWeight.toFixed(2)} kg</span>
                            </div>
                            <div className="flex justify-between items-center font-semibold">
                              <span className="text-[#0E1F38]/60">Digital Scale Gross Weight:</span>
                              <span className="text-emerald-700 font-black text-sm flex items-center gap-1.5">
                                {(Number(grp.combinedActualWeight) || 1.0).toFixed(2)} kg
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                                  Verified by Ops ✓
                                </span>
                              </span>
                            </div>
                            <div className="flex justify-between items-center font-semibold pt-1 border-t border-black/5">
                              <span className="text-[#0E1F38]/60">Destination:</span>
                              <span className="text-[#0E1F38] truncate max-w-[200px]">
                                {typeof primary?.destination_city === 'string' ? primary.destination_city : 'Toronto (GTA)'} ({typeof primary?.destination_address === 'string' ? primary.destination_address : 'Canada'})
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-blue-50/80 rounded-2xl p-4 border border-blue-100 space-y-3 text-xs text-blue-950">
                            <div className="flex items-center gap-2 font-bold text-blue-900">
                              <span className="material-symbols-outlined text-sm text-amber-600">schedule</span>
                              <span>Awaiting India Hub Arrival, Repack &amp; Digital Scale Weighing</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 bg-white/80 p-2.5 rounded-xl border border-blue-200/60 font-mono text-[11px]">
                              <div>
                                <span className="text-[#0E1F38]/60 block text-[10px] uppercase">Estimated Weight</span>
                                <span className="font-bold text-[#0E1F38]">{grp.combinedEstimatedWeight.toFixed(2)} kg</span>
                              </div>
                              <div>
                                <span className="text-[#0E1F38]/60 block text-[10px] uppercase">Actual Weight (Ops)</span>
                                <span className="font-bold text-amber-700 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs">schedule</span>
                                  Pending Step 3
                                </span>
                              </div>
                            </div>
                            <p className="text-[11px] text-blue-900/80 leading-relaxed font-light">
                              Your 20% advance booking is confirmed! Once our India Hub team inspects arrival, repacks into standard Layo Green Boxes, and weighs on a digital scale (Step 3), final balance payment will unlock right here.
                            </p>

                            {/* Destination & Assigned Locker Address */}
                            <div className="pt-2 border-t border-blue-200/60 space-y-2 text-[11px]">
                              <div className="flex justify-between items-start">
                                <span className="text-blue-900/70 font-medium">Destination:</span>
                                <span className="font-bold text-blue-950 text-right max-w-[240px]">
                                  {typeof primary?.destination_city === 'string' ? primary.destination_city : 'Toronto (GTA)'}
                                  {primary?.destination_address ? ` • ${primary.destination_address}` : ''}
                                </span>
                              </div>
                              {(() => {
                                const whId = primary?.india_warehouse;
                                const wh = warehouses.find(w => w.id === whId || w.city?.toLowerCase() === String(whId || '').toLowerCase()) || warehouses[0];
                                if (!wh) return null;
                                const fullWh = `${wh.address || wh.city}, Pincode: ${wh.pincode || '110077'}${wh.contact ? ', Contact: ' + wh.contact : ''}`;
                                return (
                                  <div className="bg-white/90 p-3 rounded-xl border border-blue-200/80 space-y-1 mt-1 shadow-2xs">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-xs text-[#FF5A65]">warehouse</span>
                                        Layo {wh.city || 'India'} Hub Locker Address:
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard.writeText(fullWh);
                                          alert('Locker Hub Address copied to clipboard!');
                                        }}
                                        className="text-[10px] font-bold text-[#FF5A65] hover:underline cursor-pointer flex items-center gap-0.5"
                                      >
                                        <span className="material-symbols-outlined text-xs">content_copy</span>
                                        Copy Address
                                      </button>
                                    </div>
                                    <p className="text-[10px] text-[#0E1F38]/90 font-mono leading-relaxed">{fullWh}</p>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Financial Breakdown */}
                        <div className="bg-white border border-amber-200 rounded-2xl p-4 space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-[#0E1F38]/70 font-medium">
                              {grp.isRepackDone && grp.isWeightVerified ? 'Verified Shipping Cost:' : 'Estimated Shipping Cost:'}
                            </span>
                            <span className="font-bold text-[#0E1F38]">${(Number(grp.combinedFinalCost) || 0).toFixed(2)} CAD</span>
                          </div>
                          <div className="flex justify-between items-center text-xs text-emerald-700">
                            <span className="font-medium">Total 20% Advance Paid:</span>
                            <span className="font-bold">-${(Number(grp.combinedAdvancePaid) || 0).toFixed(2)} CAD</span>
                          </div>
                          <div className="flex justify-between items-center text-sm pt-2 border-t border-amber-200 font-black text-[#0E1F38]">
                            <span className="text-[#FF5A65]">80% Remaining Balance Due:</span>
                            <span className="text-xl text-[#FF5A65]">${(Number(grp.combinedRemainingBalance) || 0).toFixed(2)} CAD</span>
                          </div>
                        </div>

                        {/* View Details button */}
                        <button
                          type="button"
                          onClick={() => {
                            const primary = grp.primary;
                            const allItems = grp.isHoldGroup
                              ? grp.items.flatMap((it: any) => Array.isArray(it.items) ? it.items : [])
                              : (primary?.items || []);
                            const allPhotos = grp.items.flatMap((it: any) => Array.isArray(it.qc_photos) ? it.qc_photos : []);
                            const detailsItem = {
                              ...(primary || {}),
                              id: grp.isHoldGroup ? grp.groupKey : primary?.id,
                              isHoldGroup: grp.isHoldGroup,
                              isRepackDone: grp.isRepackDone,
                              isWeightVerified: grp.isWeightVerified,
                              status: grp.isRepackDone ? 'repacked' : (primary?.status || 'holding'),
                              payment_status: grp.isRepackDone ? 'awaiting_balance' : (primary?.payment_status || 'paid'),
                              estimated_weight: grp.combinedEstimatedWeight,
                              actual_weight: grp.combinedActualWeight,
                              total_weight: grp.combinedEstimatedWeight,
                              box_dimensions: grp.boxDimensions,
                              final_cost_cad: grp.combinedFinalCost,
                              amount_cad: grp.combinedFinalCost,
                              advance_amount_cad: grp.combinedAdvancePaid,
                              remaining_balance_cad: grp.combinedRemainingBalance,
                              items: allItems,
                              shipments: grp.items,
                              qc_photos: allPhotos,
                            };
                            setSelectedOrderDetails(detailsItem);
                          }}
                          className="w-full py-2.5 bg-black/5 hover:bg-black/10 text-[#0E1F38] font-bold text-xs rounded-xl border border-black/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <span className="material-symbols-outlined text-sm">receipt_long</span>
                          <span>View Statement &amp; Shipment Details</span>
                        </button>
                      </div>

                      {/* Pay Action Button */}
                      {isRepackDone ? (
                        <div className="space-y-2">
                          <button
                            onClick={() => handlePayRemainingBalanceGroup(grp)}
                            disabled={isProcessingPayment}
                            className="w-full py-4 bg-[#FF5A65] hover:bg-[#e24550] text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-md shadow-[#FF5A65]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-sm">lock_open</span>
                            <span>Pay Remaining Balance (${(Number(grp.combinedRemainingBalance) || 0).toFixed(2)} CAD)</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          disabled={true}
                          className="w-full py-4 bg-slate-100 border border-slate-200 text-slate-400 font-bold text-xs uppercase tracking-widest rounded-2xl cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm">lock</span>
                          <span>Payment Locked (Awaiting Ops Step 3 Scale Verification)</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'history' ? (
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
            {myShipmentsList.length === 0 ? (
              groupedPendingDues.length > 0 ? (
                <div className="bg-white border-2 border-blue-200 rounded-3xl p-8 sm:p-12 text-center space-y-5 shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center mx-auto text-blue-600">
                    <span className="material-symbols-outlined text-3xl">local_shipping</span>
                  </div>
                  <div className="space-y-2 max-w-lg mx-auto">
                    <h3 className="text-xl font-black text-[#0E1F38]">
                      You have {groupedPendingDues.length} active order{groupedPendingDues.length > 1 ? 's' : ''} in progress!
                    </h3>
                    <p className="text-[#0E1F38]/70 text-sm font-light leading-relaxed">
                      Your booking is active and being processed at our India Hub. Once packages are verified, repacked, and final balance payment is settled, full overseas dispatch tracking moves here.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-3 pt-2">
                    <button
                      onClick={() => setActiveTab('dues')}
                      className="bg-[#FF5A65] text-white font-bold text-xs uppercase tracking-widest px-6 py-3.5 rounded-2xl hover:bg-[#e24550] active:scale-95 transition-all shadow-md shadow-[#FF5A65]/20 cursor-pointer flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      <span>View Active Order{groupedPendingDues.length > 1 ? 's' : ''} ({groupedPendingDues.length})</span>
                    </button>
                    <button
                      onClick={handleStartNewOrder}
                      className="border border-black/15 text-[#0E1F38] hover:bg-black/5 font-bold text-xs uppercase tracking-widest px-6 py-3.5 rounded-2xl transition-all cursor-pointer"
                    >
                      Book Another Shipment
                    </button>
                  </div>
                </div>
              ) : (
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
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {myShipmentsList.map(s => {
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
                      case 'advance_paid':
                        return {
                          title: 'Step 1 of 7: 20% Advance Paid (Shipment Booked)',
                          desc: 'Your 20% advance booking is confirmed! Please ship your items to your assigned Layo India Hub address below for weighing & QC inspection.',
                          badge: '20% Advance Paid',
                          color: '#3b82f6',
                          bg: '#eff6ff',
                          border: '#dbeafe'
                        };
                      case 'awaiting_balance':
                        return {
                          title: 'Action Required: Weight Verified • Balance Due',
                          desc: 'Our India Hub team verified your actual package weight. Please clear your remaining balance below to dispatch your order overseas.',
                          badge: 'Action Required: Pay Balance',
                          color: '#d97706',
                          bg: '#fffbeb',
                          border: '#fef3c7'
                        };
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
                          title: 'Final Payment Confirmed • Queued for Airfreight',
                          desc: 'All final balance payments completed and gross scale weight verified! Your package is queued for Master Cargo crate staging and direct flight to Canada.',
                          badge: 'Paid in Full · Ready for Flight',
                          color: '#059669',
                          bg: '#ecfdf5',
                          border: '#d1fae5'
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
                          title: 'Draft Estimate (Awaiting Locker Booking)',
                          desc: 'Pay the 20% advance deposit to book your locker and receive your India warehouse forwarding address.',
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
                  ) || warehouses[0] || { city: 'Delhi NCR Hub', address: 'C-N-246, Bamnoli Village, Sector 28 Dwarka, Dwarka, New Delhi', pincode: '110077', contact: '+91 9321852629' };

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
                            {s.isHoldGroup ? `Hold Group #${s.id}` : `#${formatShipmentId(s.id)}`}
                          </span>
                          {s.isHoldGroup && (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                              {s.itemsCount} Packages Consolidated
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#0E1F38]/50">
                          {s.created_at ? new Date(s.created_at).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>

                      {/* Stepper tracker (Only for active / booked shipments) */}
                      {!isDraft && (
                        <div className="relative pt-2">
                          <div className="absolute top-[13px] left-0 right-0 h-[2px] bg-black/5 -z-10"></div>
                          <div className="flex justify-between">
                            {STEPS.map((step, idx) => {
                              const isPassed = idx <= currentIdx;
                              const isCurrent = idx === currentIdx;
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
                      )}

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

                      {/* Consolidated Packages List if Hold Group */}
                      {s.isHoldGroup && Array.isArray(s.allPackages) && s.allPackages.length > 0 && (
                        <div className="bg-indigo-50/60 p-3 rounded-2xl border border-indigo-100 space-y-1.5 text-xs">
                          <div className="flex justify-between items-center text-[10px] font-black text-indigo-800 uppercase tracking-wider">
                            <span>📦 Consolidated Packages in this Layo Box ({s.itemsCount}):</span>
                            <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold">1 Master Box</span>
                          </div>
                          <div className="space-y-1">
                            {s.allPackages.map((pkg: any, pIdx: number) => (
                              <div key={pkg.id || pIdx} className="flex justify-between items-center text-[11px] bg-white p-2 rounded-xl border border-black/5">
                                <span className="font-mono font-bold text-[#0E1F38]">#{formatShipmentId(pkg.id)}</span>
                                <span className="text-[#0E1F38]/70 font-medium">{pkg.external_order_id ? `Ref: #${String(pkg.external_order_id)}` : `Package ${pIdx + 1}`}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

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
                                const addr = `Layo Locker (Locker #${formatShipmentId(s.id)})\n${matchedHub.address}\n${matchedHub.city} - ${matchedHub.pincode}\nPhone: ${matchedHub.contact || '+91 98100 12345'}`;
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
                            Layo Locker (Locker #{formatShipmentId(s.id)})<br />
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

                      {/* Shipment Pricing & Action Controls */}
                      {(() => {
                        const inrRate = cadToInrRate > 0 ? cadToInrRate : 68.0;
                        const totalINR = Number(s.total_cost) || 0;
                        let totalCAD = totalINR > 0 ? Number((totalINR / inrRate).toFixed(2)) : 25.0;
                        if (s.estimated_cost_cad && Number(s.estimated_cost_cad) > 0 && Number(s.estimated_cost_cad) < (totalINR > 100 ? totalINR / 10 : 5000)) {
                          totalCAD = Number(Number(s.estimated_cost_cad).toFixed(2));
                        } else if (s.amount_cad && Number(s.amount_cad) > 0 && Number(s.amount_cad) < (totalINR > 100 ? totalINR / 10 : 5000)) {
                          totalCAD = Number(Number(s.amount_cad).toFixed(2));
                        }
                        const advanceCAD = Number((totalCAD * 0.20).toFixed(2));
                        const remainingCAD = Number((totalCAD - advanceCAD).toFixed(2));

                        return (
                          <div className="border-t border-black/5 pt-3 space-y-3">
                            {/* Route & Pricing Summary Card */}
                            <div className="bg-[#FAF8EE] p-4 rounded-2xl border border-black/5 space-y-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-[10px] font-bold text-[#0E1F38]/50 uppercase tracking-wider">Destination</span>
                                  <h3 className="font-black text-sm text-[#0E1F38] mt-0.5">✈ {s.destination_city || 'Toronto (GTA)'}</h3>
                                  <p className="text-[11px] text-[#0E1F38]/60 font-medium">
                                    {s.actual_weight && Number(s.actual_weight) > 0 
                                      ? `${Number(s.actual_weight).toFixed(2)} kg verified scale weight (Declared: ${getShipmentEstimatedWeight(s).toFixed(2)} kg)` 
                                      : `${getShipmentEstimatedWeight(s).toFixed(2)} kg declared weight`}
                                    {s.box_dimensions ? ` · Box: ${formatBoxDimensions(s.box_dimensions)}` : ''}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Total Paid (CAD)</span>
                                  <p className="font-black text-base text-[#0E1F38] mt-0.5">${totalCAD.toFixed(2)} CAD</p>
                                  <span className="text-[10px] text-[#0E1F38]/50 font-mono block">≈ ₹{totalINR > 0 ? totalINR.toLocaleString() : Math.round(totalCAD * inrRate).toLocaleString()} INR</span>
                                </div>
                              </div>
                            </div>

                            {s.external_order_id && (
                              <p className="text-[10px] text-[#0E1F38]/80 bg-[#FAF8EE] p-2.5 rounded-xl border border-black/5 font-mono">
                                <strong>Reference Order:</strong> {s.external_order_id}
                              </p>
                            )}

                            {/* Settled / Paid in Full Banner */}
                            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 text-emerald-950 font-bold">
                                <span className="material-symbols-outlined text-emerald-600 text-base">verified</span>
                                <span>Final Payment Settled • Nothing Due</span>
                              </div>
                              <span className="px-2.5 py-0.5 bg-emerald-600 text-white rounded-full font-black text-[10px]">
                                $0.00 CAD Due
                              </span>
                            </div>

                            {/* View Full Details Button */}
                            <button
                              type="button"
                              onClick={() => setSelectedOrderDetails(s)}
                              className="w-full py-3 bg-[#0E1F38] hover:bg-[#1e3a60] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <span className="material-symbols-outlined text-sm">visibility</span>
                              <span>View Full Shipment Details</span>
                            </button>
                          </div>
                        );
                      })()}
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
                        disabled={step.id > currentStep && (step.id > 2 ? activeItems.length === 0 : selectedCategories.length === 0)}
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

              {/* STEP 1: Category Grid Selection */}
              {currentStep === 1 && (
                <section className="space-y-6 animate-fade-in">
                  <div>
                    <h3 className="text-lg font-black text-[#0E1F38] uppercase tracking-wider border-l-4 border-[#FF5A65] pl-3">
                      1. Item Categories
                    </h3>
                    <p className="text-[#0E1F38]/60 text-xs mt-1 font-light">Select all categories containing items you wish to calculate.</p>
                  </div>

                  {/* 3x3 Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(activeCategoryData).map(([key, val]) => {
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
                    onClick={() => setCurrentStep(2)}
                    disabled={selectedCategories.length === 0}
                    className="w-full py-4 bg-[#FF5A65] text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-[#e24550] active:scale-[0.98] transition-all shadow-md shadow-[#FF5A65]/20 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Continue to Item Configuration
                  </button>
                </section>
              )}

              {/* STEP 2: Configure Items */}
              {currentStep === 2 && (
                <section className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="text-lg font-black text-[#0E1F38] uppercase tracking-wider border-l-4 border-[#FF5A65] pl-3">
                        2. Item Details &amp; Variables
                      </h3>
                      <p className="text-[#0E1F38]/60 text-xs mt-1 font-light">Configure subcategory quantity and optional details.</p>
                    </div>
                    <button onClick={() => setCurrentStep(1)} className="text-xs text-[#FF5A65] font-bold hover:underline cursor-pointer">
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
                            <p className="font-bold text-sm text-[#0E1F38]">
                              Small Cloth &amp; Light Accessories (Max 50g)
                            </p>
                            <p className="text-[11px] text-[#0E1F38]/70 mt-0.5 font-light">
                              Socks, innerwear, ties, handkerchiefs, light earrings, chains (up to 50g each). First 5 items ship free! Additional items add 50g each.
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
                              onClick={() => setPromoQty(prev => prev + 1)}
                              className="w-8 h-8 rounded-full flex items-center justify-center transition-all bg-white hover:bg-black/5 text-[#0E1F38] active:scale-90 cursor-pointer shadow-xs"
                            >
                              <span className="material-symbols-outlined text-sm">add</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedCategories.map(catKey => {
                      const cat = activeCategoryData[catKey];
                      const activeDemo = activeDemoState[catKey] ?? 'Adult';
                      return (
                        <div key={catKey} className="pt-6 first:pt-0">
                          {/* Category header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
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
                                      {(sub.oversized || sub.isRestricted || cat.isFoodGlobal) && (
                                        <span
                                          className="material-symbols-outlined text-xs text-[#FF5A65] leading-none cursor-help"
                                          title="Special shipping check required"
                                        >
                                          info
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-[11px] text-[#0E1F38]/60 mt-0.5 font-light normal-case">
                                      {sub.subtext}
                                      {sub.promo && (
                                        <span className="text-emerald-600 font-bold ml-1.5">· Promo (First 5 Free)</span>
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
                                            return { ...prev, [`${rowKey}-default`]: cur + 1 };
                                          });
                                        }
                                      }}
                                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-black/5 text-[#0E1F38] active:scale-90 cursor-pointer"
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
                    onClick={() => setCurrentStep(3)}
                    disabled={activeItems.length === 0}
                    className="w-full py-4 bg-[#FF5A65] text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-[#e24550] active:scale-[0.98] transition-all shadow-md shadow-[#FF5A65]/20 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Continue to Warehouse Handling
                  </button>
                </section>
              )}

              {/* STEP 3: Warehouse Handling & Consolidation */}
              {currentStep === 3 && (
                <section className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="text-lg font-black text-[#0E1F38] uppercase tracking-wider border-l-4 border-[#FF5A65] pl-3">
                        3. Warehouse Handling &amp; Consolidation
                      </h3>
                      <p className="text-[#0E1F38]/60 text-xs mt-1 font-light">Choose locker dispatch action before finalizing delivery address.</p>
                    </div>
                    <button onClick={() => setCurrentStep(2)} className="text-xs text-[#FF5A65] font-bold hover:underline cursor-pointer">
                      Back
                    </button>
                  </div>

                  {/* Active Hold Group Notice Banner */}
                  {activeHoldGroups.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
                      <span className="material-symbols-outlined text-blue-600 text-xl mt-0.5 leading-none">inventory_2</span>
                      <div className="space-y-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-blue-900 uppercase tracking-wider">
                            Active Hold Group Found ({activeHoldGroups[0].group_id})
                          </span>
                          <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                            {activeHoldGroups[0].currentLinkedCount}/{activeHoldGroups[0].totalCapacity} Linked • {activeHoldGroups[0].remainingSlots} Slot(s) Left
                          </span>
                        </div>
                        <p className="text-[11px] text-blue-800 leading-relaxed font-normal">
                          You have an active package hold at our hub! Select <strong>📦 Hold &amp; Combine</strong> below to link this package into group <strong>{activeHoldGroups[0].group_id}</strong>.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Shipment Item Breakdown */}
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-[#0E1F38]/60 block">
                      Configured Packages list
                    </label>
                    <div className="space-y-2">
                      {activeItems.map(item => (
                        <div key={item.demoKey || `${item.category}-${item.subcategory}`} className="p-4 rounded-2xl border border-black/5 bg-[#FAF8EE] flex justify-between items-center shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white border border-black/10 flex items-center justify-center text-[#FF5A65] shadow-sm">
                              <span className="material-symbols-outlined text-xl leading-none">
                                {activeCategoryData[item.category]?.icon || 'package_2'}
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
                            title="Remove item"
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
                          if (activeHoldGroups.length > 0) {
                            setHoldOptionMode('existing');
                            setSelectedHoldGroupId(activeHoldGroups[0].group_id);
                          } else {
                            setHoldOptionMode('new');
                            setMorePackages(1);
                          }
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

                    {/* How many packages expected / Hold Group selection */}
                    {warehouseAction === 'hold' && (
                      <div className="pt-3 border-t border-black/5 space-y-4 animate-fade-in">
                        {activeHoldGroups.length > 0 && (
                          <div className="space-y-2">
                            <label className="text-[10px] text-[#0E1F38] font-bold uppercase tracking-wider block">
                              Select Active Hold &amp; Combine Group:
                            </label>
                            <div className="space-y-2">
                              {activeHoldGroups.map((grp) => {
                                const isSelected = selectedHoldGroupId === grp.group_id && holdOptionMode === 'existing';
                                const primaryShipment = grp.shipments[0];
                                const pkgCount = grp.shipments.length;
                                return (
                                  <div
                                    key={grp.group_id}
                                    onClick={() => {
                                      setSelectedHoldGroupId(grp.group_id);
                                      setHoldOptionMode('existing');
                                    }}
                                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                                      isSelected
                                        ? 'border-[#FF5A65] bg-[#FF5A65]/5 ring-2 ring-[#FF5A65]/20'
                                        : 'border-black/10 bg-white hover:border-black/20'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                        isSelected ? 'border-[#FF5A65] bg-[#FF5A65]' : 'border-gray-300'
                                      }`}>
                                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                      </div>
                                      <div>
                                        <div className="text-xs font-bold text-[#0E1F38] flex items-center gap-2">
                                          <span>Group: {grp.group_id}</span>
                                          <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                                            {grp.currentLinkedCount} of {grp.totalCapacity} linked ({grp.remainingSlots} slot{grp.remainingSlots > 1 ? 's' : ''} left)
                                          </span>
                                        </div>
                                        <p className="text-[10px] text-gray-500 mt-0.5">
                                          1st Order: #{primaryShipment.external_order_id || formatShipmentId(primaryShipment.id)} ({primaryShipment.india_warehouse || 'Hub'})
                                        </p>
                                      </div>
                                    </div>
                                    <span className="material-symbols-outlined text-gray-400 text-sm">link</span>
                                  </div>
                                );
                              })}

                              <div
                                onClick={() => {
                                  setHoldOptionMode('new');
                                  setSelectedHoldGroupId(null);
                                  if (!morePackages) setMorePackages(1);
                                }}
                                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                                  holdOptionMode === 'new'
                                    ? 'border-[#FF5A65] bg-[#FF5A65]/5 ring-2 ring-[#FF5A65]/20'
                                    : 'border-black/10 bg-white hover:border-black/20'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                    holdOptionMode === 'new' ? 'border-[#FF5A65] bg-[#FF5A65]' : 'border-gray-300'
                                  }`}>
                                    {holdOptionMode === 'new' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold text-[#0E1F38]">
                                      + Start a New Separate Hold Group
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-0.5">
                                      Create a separate hold box independent of existing active packages
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {(activeHoldGroups.length === 0 || holdOptionMode === 'new') && (
                          <div className="space-y-2">
                            <label className="text-[10px] text-[#0E1F38] font-bold uppercase tracking-wider block">
                              How many additional packages will arrive to combine with this order?
                              <span className="ml-1 text-indigo-600 font-extrabold normal-case">
                                (Total: {(morePackages || 1) + 1} packages in this Hold Group)
                              </span>
                            </label>
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                              {[1, 2, 3, 4, 5].map(num => (
                                <button
                                  type="button"
                                  key={num}
                                  onClick={() => setMorePackages(num)}
                                  className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                                    (morePackages === num || (!morePackages && num === 1))
                                      ? 'bg-[#FF5A65] text-white border-[#FF5A65] shadow-sm'
                                      : 'bg-white border-black/10 text-[#0E1F38]/70 hover:border-black/20 hover:text-[#0E1F38]'
                                  }`}
                                >
                                  +{num} more ({num + 1} total)
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setCurrentStep(4)}
                    disabled={warehouseAction === null}
                    className="w-full py-4 bg-[#FF5A65] text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-[#e24550] active:scale-[0.98] transition-all shadow-md shadow-[#FF5A65]/20 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Continue to Origin &amp; Warehouse
                  </button>
                </section>
              )}

              {/* STEP 4: Origin & Warehouse */}
              {currentStep === 4 && (
                <section className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="text-lg font-black text-[#0E1F38] uppercase tracking-wider border-l-4 border-[#FF5A65] pl-3">
                        4. Setup Virtual Address &amp; Origin
                      </h3>
                      <p className="text-[#0E1F38]/60 text-xs mt-1 font-light">Specify drop-off point and details of incoming items in India.</p>
                    </div>
                    <button onClick={() => setCurrentStep(3)} className="text-xs text-[#FF5A65] font-bold hover:underline cursor-pointer">
                      Back
                    </button>
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
                    onClick={() => setCurrentStep(5)}
                    disabled={!selectedWarehouse}
                    className="w-full py-4 bg-[#FF5A65] text-white font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-[#e24550] active:scale-[0.98] transition-all shadow-md shadow-[#FF5A65]/20 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Continue to Canada Destination &amp; Payment
                  </button>
                </section>
              )}

              {/* STEP 5: Canada Destination & Payment */}
              {currentStep === 5 && (
                <section className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-end">
                    <div>
                      <h3 className="text-lg font-black text-[#0E1F38] uppercase tracking-wider border-l-4 border-[#FF5A65] pl-3">
                        5. Canada Destination &amp; Payment
                      </h3>
                      <p className="text-[#0E1F38]/60 text-xs mt-1 font-light">Provide drop-off address coordinates inside Canada and complete payment.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowManageAddressesModal(true)}
                        className="text-xs text-[#2E7D32] font-bold hover:underline flex items-center gap-1 cursor-pointer bg-[#2E7D32]/10 px-2.5 py-1 rounded-lg border border-[#2E7D32]/20 transition-all"
                      >
                        📍 My Addresses ({savedAddresses.length})
                      </button>
                      <button onClick={() => setCurrentStep(4)} className="text-xs text-[#FF5A65] font-bold hover:underline cursor-pointer">
                        Back
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Saved Addresses Dropdown Selector */}
                    {savedAddresses.length > 0 && (
                      <div className="bg-[#FF5A65]/5 border border-[#FF5A65]/20 p-3.5 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] uppercase font-bold text-[#FF5A65] tracking-wider flex items-center gap-1">
                            <span>📍 Select Saved Address</span>
                          </label>
                          <span className="text-[9px] font-semibold text-[#0E1F38]/60">
                            {savedAddresses.length} address{savedAddresses.length > 1 ? 'es' : ''} saved
                          </span>
                        </div>
                        <select
                          value={selectedSavedAddressId}
                          onChange={e => {
                            const val = e.target.value;
                            setSelectedSavedAddressId(val);
                            if (val === 'new') {
                              setDestinationAddress('');
                            } else {
                              const found = savedAddresses.find(a => a.id === val);
                              if (found) {
                                if (found.city) setDestinationCity(found.city);
                                const fullText = found.line1 + (found.line2 ? `, ${found.line2}` : '') + (found.postal ? ` ${found.postal}` : '');
                                setDestinationAddress(fullText || found.line1);
                              }
                            }
                          }}
                          className="w-full bg-white border border-[#FF5A65]/30 rounded-xl px-4 py-3 text-xs text-[#0E1F38] font-bold focus:border-[#FF5A65] focus:ring-1 focus:ring-[#FF5A65] focus:outline-none transition-all shadow-sm cursor-pointer"
                        >
                          <option value="">-- Select from My Addresses --</option>
                          {savedAddresses.map(addr => {
                            const labelText = addr.label ? `[${addr.label}] ` : '';
                            const detailText = addr.line1 + (addr.city ? `, ${addr.city}` : '');
                            return (
                              <option key={addr.id} value={addr.id}>
                                {labelText}{detailText} {addr.isDefault ? '★ (Default)' : ''}
                              </option>
                            );
                          })}
                          <option value="new">+ Enter A New Address</option>
                        </select>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-[#0E1F38]/60">Destination Region / City</label>
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
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] uppercase font-bold text-[#0E1F38]/60">Full Delivery Street Address</label>
                        {destinationAddress && (
                          <span className="text-[9px] text-[#2E7D32] font-semibold flex items-center gap-0.5">
                            ✓ Auto-saves to My Addresses
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Suite #, Street name, City, Postal Code"
                        value={destinationAddress}
                        onChange={e => {
                          setDestinationAddress(e.target.value);
                          setSelectedSavedAddressId('');
                        }}
                        className="w-full bg-[#FAF8EE] border border-black/10 rounded-xl px-4 py-3.5 text-xs text-[#0E1F38] placeholder:text-black/35 focus:border-[#FF5A65] focus:ring-1 focus:ring-[#FF5A65] focus:outline-none transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  {/* 20% Advance Explanation Banner */}
                  <div className="bg-[#E8F5E9] border border-[#A5D6A7] rounded-2xl p-4 flex items-start gap-3 shadow-xs">
                    <span className="material-symbols-outlined text-[#2E7D32] text-xl mt-0.5 leading-none">payments</span>
                    <div className="space-y-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#1B5E20] uppercase tracking-wider">
                          20% Advance Booking Model Active
                        </span>
                        <span className="bg-[#2E7D32] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                          Pay Only 20% Today
                        </span>
                      </div>
                      <p className="text-[11px] text-[#2E7D32] leading-relaxed font-normal">
                        You pay <strong>20% advance (${(totals.totalPriceCAD * 0.20).toFixed(2)} CAD)</strong> today to book locker space &amp; generate pickup documents. The remaining balance (80%) is billed after scale verification at the India hub.
                      </p>
                    </div>
                  </div>

                  {/* Submission and drafts */}
                  <div className="flex flex-col gap-3 pt-2">
                    <div className="flex flex-col sm:flex-row gap-3">
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
                            <span>Pay 20% Advance (${totals.totalPriceCAD > 0 ? (totals.totalPriceCAD * 0.20).toFixed(2) : '5.00'} CAD) &amp; Book</span>
                          </>
                        )}
                      </button>
                    </div>
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

                  {/* Delivery Option Selector */}
                  <div className="space-y-1.5 pt-2 border-t border-black/5">
                    <label className="text-[10px] uppercase font-bold text-[#0E1F38]/60 block">Delivery Speed</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDeliveryType('normal')}
                        className={`py-2 px-3 rounded-xl border font-bold text-xs flex flex-col items-start justify-center transition-all cursor-pointer ${
                          deliveryType === 'normal'
                            ? 'bg-[#1B250F] text-white border-[#1B250F] shadow-xs ring-1 ring-[#8BC34A]/40'
                            : 'bg-[#FAF8EE] text-[#0E1F38]/70 border-black/10 hover:border-black/20'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>📦 Normal</span>
                          {deliveryType === 'normal' && <span className="text-[8px] bg-[#8BC34A] text-[#1B250F] font-black px-1 rounded">ON</span>}
                        </div>
                        <span className={`text-[10px] font-semibold mt-0.5 ${deliveryType === 'normal' ? 'text-white/80' : 'text-[#0E1F38]/60'}`}>10-12 days*</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryType('express')}
                        className={`py-2 px-3 rounded-xl border font-bold text-xs flex flex-col items-start justify-center transition-all cursor-pointer ${
                          deliveryType === 'express'
                            ? 'bg-[#1B250F] text-white border-[#1B250F] shadow-xs ring-1 ring-[#8BC34A]/40'
                            : 'bg-[#FAF8EE] text-[#0E1F38]/70 border-black/10 hover:border-black/20'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>⚡ Express</span>
                          {deliveryType === 'express' && <span className="text-[8px] bg-[#8BC34A] text-[#1B250F] font-black px-1 rounded">ON</span>}
                        </div>
                        <span className={`text-[10px] font-semibold mt-0.5 ${deliveryType === 'express' ? 'text-white/80' : 'text-[#0E1F38]/60'}`}>7-9 days*</span>
                      </button>
                    </div>
                    <p className="text-[9.5px] text-[#0E1F38]/60 italic pt-1 leading-tight">
                      *- It is tentative days. It may vary in case of unforeseen circumstances.
                    </p>
                  </div>

                  <div className="h-px bg-black/5 my-2"></div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-[#0E1F38]/70 font-semibold">Total Estimated Fee (100%)</span>
                      <span className="font-bold text-[#0E1F38] font-mono text-sm">
                        ${totals.totalPriceCAD.toFixed(2)} CAD
                      </span>
                    </div>

                    {/* Highlighted 20% Advance Box */}
                    <div className="bg-[#FF5A65]/10 border border-[#FF5A65]/30 p-3.5 rounded-2xl space-y-1 text-left">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-[#FF5A65] uppercase tracking-wider">Due Today (20% Advance)</span>
                        <span className="text-2xl font-black text-[#FF5A65] font-mono">
                          ${(totals.totalPriceCAD * 0.20).toFixed(2)}
                          <span className="text-xs font-bold text-[#0E1F38]/70 ml-1 font-sans">CAD</span>
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-[#0E1F38]/70 pt-0.5">
                        <span className="font-medium text-[#2E7D32]">⚡ Pay now to reserve locker</span>
                        <span className="font-bold font-mono">≈ ₹{Math.round(totals.totalPriceINR * 0.20).toLocaleString()} INR</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[11px] bg-[#FAF8EE] p-2.5 rounded-xl border border-black/5">
                      <span className="text-[#0E1F38]/70 font-medium">Remaining Balance (80%)</span>
                      <span className="font-bold font-mono text-[#0E1F38]">
                        ${(totals.totalPriceCAD * 0.80).toFixed(2)} CAD
                      </span>
                    </div>
                    <p className="text-[9px] text-[#0E1F38]/50 text-center font-light">
                      Remaining 80% balance will be billed after package weighing at hub.
                    </p>
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
                  handleStartNewOrder();
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

      {/* ── Order Details Popup Modal ── */}
      {selectedOrderDetails && (() => {
        const inrRate = cadToInrRate > 0 ? cadToInrRate : 68.0;
        const statusNormalized = String(selectedOrderDetails.status || '').toLowerCase();
        const isDraft = statusNormalized === 'draft' || statusNormalized === 'draft estimate';
        const isHold = selectedOrderDetails.isHoldGroup || selectedOrderDetails.warehouse_action === 'hold' || statusNormalized === 'holding';
        const remainingDue = Number(selectedOrderDetails.remaining_balance_cad ?? 0);
        const payStatus = String(selectedOrderDetails.payment_status || '').toLowerCase();
        const hasDues = remainingDue > 0 || payStatus === 'awaiting_balance';
        const isFullySettled = (payStatus === 'completed' || payStatus === 'fully_paid' || payStatus === 'paid_full') && remainingDue <= 0;

        // Pricing calculations
        const totalINR = Number(selectedOrderDetails.total_cost) || 0;
        let totalCAD = totalINR > 0 ? Number((totalINR / inrRate).toFixed(2)) : 25.0;
        if (selectedOrderDetails.final_cost_cad && Number(selectedOrderDetails.final_cost_cad) > 0) {
          totalCAD = Number(Number(selectedOrderDetails.final_cost_cad).toFixed(2));
        } else if (selectedOrderDetails.estimated_cost_cad && Number(selectedOrderDetails.estimated_cost_cad) > 0) {
          totalCAD = Number(Number(selectedOrderDetails.estimated_cost_cad).toFixed(2));
        } else if (selectedOrderDetails.amount_cad && Number(selectedOrderDetails.amount_cad) > 0) {
          totalCAD = Number(Number(selectedOrderDetails.amount_cad).toFixed(2));
        }

        const advanceCAD = selectedOrderDetails.advance_amount_cad !== undefined && Number(selectedOrderDetails.advance_amount_cad) > 0
          ? Number(Number(selectedOrderDetails.advance_amount_cad).toFixed(2))
          : Number((totalCAD * 0.20).toFixed(2));

        const balanceDueCAD = remainingDue > 0 ? remainingDue : Math.max(0, Number((totalCAD - advanceCAD).toFixed(2)));

        // Strict Weight & Ops Verification Calculation:
        const rawEstimatedWeight = selectedOrderDetails.shipments && selectedOrderDetails.shipments.length > 0
          ? selectedOrderDetails.shipments.reduce((sum: number, it: any) => sum + getShipmentEstimatedWeight(it), 0)
          : getShipmentEstimatedWeight(selectedOrderDetails);
        const estimatedWeight = Math.max(0.1, Number(rawEstimatedWeight.toFixed(2)));

        const rawActualWeight = selectedOrderDetails.actual_weight !== undefined && selectedOrderDetails.actual_weight !== null && Number(selectedOrderDetails.actual_weight) > 0
          ? Number(selectedOrderDetails.actual_weight)
          : (selectedOrderDetails.shipments && selectedOrderDetails.shipments.length > 0
            ? selectedOrderDetails.shipments.reduce((max: number, it: any) => Math.max(max, Number(it.actual_weight || 0)), 0)
            : 0);

        const isPostRepackStage = [
          'repacked',
          'bulk_consolidated',
          'in_transit',
          'shipped',
          'received_canada',
          'out_for_delivery',
          'delivered'
        ].includes(statusNormalized) || Boolean(selectedOrderDetails.stage_timestamps?.repacked);

        // Verification condition: Ops has recorded actual weight AND the package has reached/passed repack stage
        const isWeightVerified = Boolean(
          rawActualWeight > 0 && (isPostRepackStage || selectedOrderDetails.isWeightVerified || selectedOrderDetails.isRepackDone)
        );

        const actualWeight = isWeightVerified ? Number(rawActualWeight.toFixed(2)) : null;

        // Stage mapping
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

        const getModalStageInfo = () => {
          if (isDraft) {
            return {
              title: 'Draft Shipping Estimate · Awaiting Booking Deposit',
              desc: 'This shipping estimate is saved in your account. Complete the 20% deposit to assign your Indian forwarding locker address.',
              badge: 'Draft Estimate',
              color: '#64748b',
              bg: '#f8fafc',
              border: '#e2e8f0'
            };
          }
          if (statusNormalized === 'holding' || (isHold && !isWeightVerified && statusNormalized !== 'repacked')) {
            return {
              title: 'India Hub Consolidation Hold Active',
              desc: 'Your parcel is stored safely at our India Hub locker. We are holding dispatch until all expected packages arrive for combined packing.',
              badge: 'Holding @ India Hub',
              color: '#4f46e5',
              bg: '#eef2ff',
              border: '#c7d2fe'
            };
          }
          if (statusNormalized === 'repacked') {
            if (hasDues) {
              return {
                title: 'Layo SOP Repacked & Scale Verified · Final Balance Due',
                desc: 'Floor associates stripped merchant boxes, packed items in standard Layo Green Box, and logged verified scale weight. Pay the remaining balance to authorize airfreight.',
                badge: 'Repacked · Balance Due',
                color: '#d97706',
                bg: '#fffbeb',
                border: '#fde68a'
              };
            }
            return {
              title: 'Final Payment Confirmed · Queued for Airfreight',
              desc: 'All final balance payments completed and verified. Package is staged for bulk master crate consolidation and flight dispatch.',
              badge: 'Paid in Full · Ready for Flight',
              color: '#059669',
              bg: '#ecfdf5',
              border: '#a7f3d0'
            };
          }
          if (statusNormalized === 'paid' || statusNormalized === 'advance_paid') {
            return {
              title: '20% Advance Booking Confirmed (Order Active)',
              desc: 'Please ship your purchases from Amazon/Myntra/Ajio to your assigned India Hub locker forwarding address below.',
              badge: 'Deposit Paid · Awaiting Hub',
              color: '#f59e0b',
              bg: '#fffbeb',
              border: '#fef3c7'
            };
          }
          if (statusNormalized === 'inwarded' || statusNormalized === 'arrived') {
            return {
              title: 'Parcel Received at India Hub (Delhi NCR)',
              desc: 'Your package arrived at our Delhi Hub. Associates are matching physical contents against your declared checklist.',
              badge: 'Received @ India Hub',
              color: '#8b5cf6',
              bg: '#f5f3ff',
              border: '#ddd6fe'
            };
          }
          if (statusNormalized === 'qc_verified') {
            return {
              title: 'QC Verified & Unboxing Photographed',
              desc: 'All items matched declaration with zero discrepancies. Unboxing photos logged and ready for SOP repacking.',
              badge: 'QC Matched & Photographed',
              color: '#3b82f6',
              bg: '#eff6ff',
              border: '#bfdbfe'
            };
          }
          if (statusNormalized === 'bulk_consolidated') {
            return {
              title: 'Packed into Bulk Cargo Master Crate',
              desc: `Consolidated into Canada-bound Master Crate ${selectedOrderDetails.master_box_id || 'BATCH-CA-801'} for bulk freight savings.`,
              badge: 'In Master Cargo Crate',
              color: '#6366f1',
              bg: '#eef2ff',
              border: '#c7d2fe'
            };
          }
          if (statusNormalized === 'in_transit' || statusNormalized === 'shipped') {
            return {
              title: 'Bulk Airfreight in Flight to Canada (DEL → YYZ)',
              desc: 'Master Air Cargo pallet in flight from Delhi Hub to Toronto Pearson International Airport.',
              badge: 'Airfreight in Flight',
              color: '#059669',
              bg: '#ecfdf5',
              border: '#a7f3d0'
            };
          }
          if (statusNormalized === 'received_canada') {
            return {
              title: 'Received at Layo Canada Hub (Toronto GTA)',
              desc: 'Master crate de-consolidated and individual customer parcel sorted for local Canadian courier dispatch.',
              badge: 'Received @ Canada Hub',
              color: '#0d9488',
              bg: '#f0fdfa',
              border: '#99f6e4'
            };
          }
          if (statusNormalized === 'out_for_delivery') {
            return {
              title: 'Out for Local Canadian Delivery',
              desc: `Dispatched with ${selectedOrderDetails.canada_local_carrier || 'Canada Post'} · Tracking: ${selectedOrderDetails.canada_local_awb || 'CP-TRACKING'}. On courier vehicle for delivery.`,
              badge: 'Out for Delivery',
              color: '#0284c7',
              bg: '#f0f9ff',
              border: '#bae6fd'
            };
          }
          if (statusNormalized === 'delivered') {
            return {
              title: 'Delivered to Doorstep in Canada',
              desc: 'Parcel successfully delivered to your Canadian address. Thank you for shipping with Layo!',
              badge: 'Delivered in Canada',
              color: '#10b981',
              bg: '#ecfdf5',
              border: '#a7f3d0'
            };
          }
          return {
            title: `Order Status: ${selectedOrderDetails.status || 'Active'}`,
            desc: 'Your order is progressing through the Layo cross-border pipeline.',
            badge: selectedOrderDetails.status || 'Active',
            color: '#0E1F38',
            bg: '#FAF8EE',
            border: '#e2e8f0'
          };
        };

        const stageInfo = getModalStageInfo();
        const matchedHub = warehouses.find(
          w => w.city?.toLowerCase() === (selectedOrderDetails.india_warehouse || '').toLowerCase() ||
               w.address?.toLowerCase().includes((selectedOrderDetails.india_warehouse || '').toLowerCase())
        ) || warehouses[0] || { city: 'Delhi NCR Hub', address: 'C-N-246, Bamnoli Village, Sector 28 Dwarka, Dwarka, New Delhi', pincode: '110077', contact: '+91 9321852629' };

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#FAF8EE] border border-black/10 rounded-3xl w-full max-w-2xl p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in relative text-[#0E1F38] my-8 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-black/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#FF5A65] block">
                      Order Specification &amp; Live Tracking
                    </span>
                    {selectedOrderDetails.isHoldGroup && (
                      <span className="text-[9px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full border border-indigo-200">
                        Consolidated Hold Group
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#0E1F38] flex items-center gap-2 mt-0.5">
                    {selectedOrderDetails.isHoldGroup ? `Hold Group #${selectedOrderDetails.id}` : `Locker Order #${formatShipmentId(selectedOrderDetails.id)}`}
                  </h2>
                  <p className="text-xs text-[#0E1F38]/60 mt-0.5 font-medium">
                    Created on {selectedOrderDetails.created_at ? new Date(selectedOrderDetails.created_at).toLocaleString() : 'Recent'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrderDetails(null)}
                  className="w-9 h-9 rounded-full bg-white border border-black/10 flex items-center justify-center text-[#0E1F38]/70 hover:text-[#0E1F38] hover:border-black/30 transition-all cursor-pointer font-bold text-lg shadow-2xs"
                >
                  ✕
                </button>
              </div>

              {/* Live Status Stage Banner */}
              <div
                className="p-4 rounded-2xl border text-xs space-y-1.5"
                style={{ backgroundColor: stageInfo.bg, borderColor: stageInfo.border }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border"
                    style={{ backgroundColor: stageInfo.bg, borderColor: stageInfo.border, color: stageInfo.color }}
                  >
                    {stageInfo.badge}
                  </span>
                  <span className="font-bold text-[11px]" style={{ color: stageInfo.color }}>
                    {stageInfo.title}
                  </span>
                </div>
                <p className="text-[11px] text-[#0E1F38]/80 leading-relaxed font-light">
                  {stageInfo.desc}
                </p>
              </div>

              {/* Stepper tracker (for booked / active shipments) */}
              {!isDraft && (
                <div className="bg-white p-4 rounded-2xl border border-black/5 space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-[#0E1F38]/60 pb-1">
                    <span>Live Cross-Border Pipeline</span>
                    <span>Step {Math.max(1, currentIdx + 1)} of 7</span>
                  </div>
                  <div className="relative pt-2">
                    <div className="absolute top-[13px] left-0 right-0 h-[2px] bg-black/5 -z-10"></div>
                    <div className="flex justify-between">
                      {STEPS.map((step, idx) => {
                        const isPassed = idx <= currentIdx;
                        const isCurrent = idx === currentIdx;
                        return (
                          <div key={step} className="flex flex-col items-center gap-1 flex-1 relative">
                            <div
                              className="w-3.5 h-3.5 rounded-full transition-all border-2 border-transparent"
                              style={{
                                backgroundColor: isPassed ? STATUS_COLORS[statusNormalized] ?? '#059669' : '#e2e8f0',
                                boxShadow: isCurrent ? `0 0 10px ${STATUS_COLORS[statusNormalized] ?? '#059669'}` : 'none'
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
                </div>
              )}

              {/* Financial & Weight Overview Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {isDraft ? (
                  <>
                    <div className="bg-white p-3.5 rounded-2xl border border-black/5 space-y-0.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#FF5A65] block">Due Today (20%)</span>
                      <p className="text-lg font-black text-[#FF5A65] font-mono">${advanceCAD.toFixed(2)}</p>
                      <span className="text-[9px] text-[#0E1F38]/60 font-medium block">CAD Advance</span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-black/5 space-y-0.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#0E1F38]/50 block">Remaining (80%)</span>
                      <p className="text-lg font-black text-[#0E1F38] font-mono">${balanceDueCAD.toFixed(2)}</p>
                      <span className="text-[9px] text-[#0E1F38]/60 font-medium block">Billed after Weighing</span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-black/5 space-y-0.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#0E1F38]/50 block">Est. Total Fee</span>
                      <p className="text-lg font-black text-[#0E1F38] font-mono">${totalCAD.toFixed(2)} CAD</p>
                      <span className="text-[9px] text-[#0E1F38]/60 font-medium block">≈ ₹{Math.round(totalCAD * inrRate).toLocaleString()} INR</span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-black/5 space-y-0.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#0E1F38]/50 block">Est. Weight</span>
                      <p className="text-lg font-black text-[#0E1F38] font-mono">{estimatedWeight.toFixed(2)} kg</p>
                      <span className="text-[9px] text-[#0E1F38]/60 font-medium block">Estimated Gross</span>
                    </div>
                  </>
                ) : hasDues ? (
                  <>
                    <div className="bg-white p-3.5 rounded-2xl border-2 border-amber-400 space-y-0.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#FF5A65] block">80% Balance Due</span>
                      <p className="text-lg font-black text-[#FF5A65] font-mono">${balanceDueCAD.toFixed(2)}</p>
                      <span className="text-[9px] text-amber-800 font-bold block">
                        {isWeightVerified ? 'Action Required' : 'Billed after Step 3 Weighing'}
                      </span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-black/5 space-y-0.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#0E1F38]/50 block">
                        {isWeightVerified ? 'Total Verified Fee' : 'Est. Total Fee'}
                      </span>
                      <p className="text-lg font-black text-[#0E1F38] font-mono">${totalCAD.toFixed(2)} CAD</p>
                      <span className="text-[9px] text-[#0E1F38]/60 font-medium block">
                        ≈ ₹{Math.round(totalCAD * inrRate).toLocaleString()} INR {isWeightVerified ? '· Scale Billed' : '· Est.'}
                      </span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-black/5 space-y-0.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 block">20% Deposit Paid</span>
                      <p className="text-lg font-black text-emerald-700 font-mono">-${advanceCAD.toFixed(2)}</p>
                      <span className="text-[9px] text-[#0E1F38]/60 font-medium block">Settled</span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-black/5 space-y-0.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#0E1F38]/50 block">
                        {isWeightVerified ? 'Scale Weight (Ops)' : 'Weight Overview'}
                      </span>
                      <p className={`text-lg font-black font-mono ${isWeightVerified ? 'text-emerald-700' : 'text-[#0E1F38]'}`}>
                        {isWeightVerified ? `${actualWeight?.toFixed(2)} kg` : `${estimatedWeight.toFixed(2)} kg`}
                      </p>
                      <span className="text-[9px] text-[#0E1F38]/60 font-medium block">
                        {isWeightVerified ? `Verified by Ops (Est: ${estimatedWeight.toFixed(2)} kg)` : 'Est. · Awaiting Ops Weighing'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-white p-3.5 rounded-2xl border border-black/5 space-y-0.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 block">Total Paid (CAD)</span>
                      <p className="text-lg font-black text-emerald-700 font-mono">${totalCAD.toFixed(2)}</p>
                      <span className="text-[9px] text-[#0E1F38]/60 font-medium block">≈ ₹{Math.round(totalCAD * inrRate).toLocaleString()} INR</span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-black/5 space-y-0.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 block">Balance Due</span>
                      <p className="text-lg font-black text-emerald-700 font-mono">$0.00 CAD</p>
                      <span className="text-[9px] text-emerald-600 font-bold block">100% Cleared ✓</span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-black/5 space-y-0.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#0E1F38]/50 block">
                        {isWeightVerified ? 'Actual Scale Weight' : 'Gross Weight'}
                      </span>
                      <p className={`text-lg font-black font-mono ${isWeightVerified ? 'text-emerald-700' : 'text-[#0E1F38]'}`}>
                        {(actualWeight ?? estimatedWeight).toFixed(2)} kg
                      </p>
                      <span className="text-[9px] text-[#0E1F38]/60 font-medium block">
                        {isWeightVerified ? 'Verified by Ops' : 'Customer Declared'}
                      </span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-black/5 space-y-0.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-[#0E1F38]/50 block">Payment State</span>
                      <p className="text-xs font-black text-emerald-700 mt-1 truncate">
                        Fully Settled
                      </p>
                      <span className="text-[9px] text-[#0E1F38]/60 font-medium block">Authorized</span>
                    </div>
                  </>
                )}
              </div>

              {/* SOP Box Dimensions & Scale Verification Callout */}
              {(selectedOrderDetails.box_dimensions || selectedOrderDetails.actual_weight || selectedOrderDetails.isHoldGroup || !isDraft) && (
                <div className={`p-4 rounded-2xl border text-xs space-y-2.5 ${
                  isWeightVerified ? 'bg-emerald-50/70 border-emerald-200' : 'bg-amber-50/70 border-amber-200'
                }`}>
                  <div className="flex items-center justify-between font-bold">
                    <span className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-black ${
                      isWeightVerified ? 'text-emerald-950' : 'text-amber-950'
                    }`}>
                      <span className={`material-symbols-outlined text-sm ${isWeightVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                        inventory_2
                      </span>
                      Layo SOP Repack Specification
                    </span>
                    {isWeightVerified ? (
                      <span className="bg-emerald-200 text-emerald-900 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-emerald-700">verified</span>
                        Verified by Ops
                      </span>
                    ) : (
                      <span className="bg-amber-200/80 text-amber-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-amber-700">schedule</span>
                        Awaiting Ops Weighing (Step 3)
                      </span>
                    )}
                  </div>

                  {/* Both Estimated Weight and Actual Weight (Filled by Ops) displayed clearly */}
                  <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl border font-mono bg-white/95 ${
                    isWeightVerified ? 'border-emerald-200/60' : 'border-amber-200/60'
                  }`}>
                    <div>
                      <span className="text-[10px] text-[#0E1F38]/60 block uppercase">Standard Box Size</span>
                      <span className="font-bold text-[#0E1F38] text-xs">
                        {formatBoxDimensions(selectedOrderDetails.box_dimensions)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#0E1F38]/60 block uppercase">Estimated Weight</span>
                      <span className="font-bold text-[#0E1F38] text-xs">
                        {estimatedWeight.toFixed(2)} kg
                      </span>
                      <span className="text-[9px] text-[#0E1F38]/50 block font-sans">Customer Declared</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#0E1F38]/60 block uppercase">Actual Weight (Ops)</span>
                      {isWeightVerified ? (
                        <div>
                          <span className="font-black text-emerald-700 text-xs">
                            {actualWeight?.toFixed(2)} kg
                          </span>
                          <span className="text-[9px] text-emerald-600 block font-sans font-bold">
                            ✓ Digital Scale Gross
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="font-bold text-amber-700 text-xs flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-xs">schedule</span> Pending Ops
                          </span>
                          <span className="text-[9px] text-amber-600/80 block font-sans">
                            Weighed at Hub
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-[#0E1F38]/60 block uppercase">Merchant Waste Stripped</span>
                      <span className="font-bold text-[#0E1F38] text-xs">
                        {isWeightVerified ? 'Yes (Zero Waste)' : 'Scheduled during Repack'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Local Carrier Tracking (Canada) */}
              {(selectedOrderDetails.canada_local_carrier || selectedOrderDetails.canada_local_awb) && (
                <div className="flex items-center justify-between p-4 bg-blue-50/80 rounded-2xl border border-blue-200 text-xs">
                  <div className="flex items-center gap-2.5 text-blue-950 font-bold">
                    <span className="material-symbols-outlined text-base text-blue-600">local_shipping</span>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wider text-blue-800/70 font-black">Canada Local Courier</span>
                      <span className="text-sm font-black">{selectedOrderDetails.canada_local_carrier || 'Canada Local Dispatch'}</span>
                    </div>
                  </div>
                  {selectedOrderDetails.canada_local_awb && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-800 bg-white px-3 py-1.5 rounded-xl border border-blue-200 shadow-2xs">
                        {selectedOrderDetails.canada_local_awb}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedOrderDetails.canada_local_awb);
                          alert('AWB Tracking copied to clipboard!');
                        }}
                        className="p-1.5 bg-white hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-all cursor-pointer"
                        title="Copy AWB Tracking Number"
                      >
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* QC Inspection Photos */}
              {Array.isArray(selectedOrderDetails.qc_photos) && selectedOrderDetails.qc_photos.length > 0 && (
                <div className="space-y-2 bg-white p-4 rounded-2xl border border-black/5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#0E1F38]/60 block">
                    📸 Warehouse Unboxing Photos ({selectedOrderDetails.qc_photos.length})
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedOrderDetails.qc_photos.map((photo: any, pIdx: number) => (
                      <div key={pIdx} className="aspect-square rounded-xl overflow-hidden border border-black/10 bg-black/5">
                        <img src={photo.url} alt="QC Unboxing" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hold Group Breakdown */}
              {Array.isArray(selectedOrderDetails.shipments) && selectedOrderDetails.shipments.length > 1 && (
                <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-indigo-900">
                    <span className="text-[10px] font-black uppercase tracking-wider block">
                      📦 Consolidated Packages in this Hold Group ({selectedOrderDetails.shipments.length})
                    </span>
                    <span className="text-[10px] font-mono font-bold text-indigo-700">
                      Total Est: {estimatedWeight.toFixed(2)} kg
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {selectedOrderDetails.shipments.map((pkg: any, pIdx: number) => {
                      const pkgEstWeight = getShipmentEstimatedWeight(pkg);
                      const pkgActWeight = pkg.actual_weight && Number(pkg.actual_weight) > 0 ? Number(pkg.actual_weight) : null;
                      return (
                        <div key={pkg.id || pIdx} className="flex justify-between items-center text-xs bg-white p-2.5 rounded-xl border border-black/5">
                          <div>
                            <span className="font-mono font-bold text-[#0E1F38]">#{formatShipmentId(pkg.id)}</span>
                            <span className="text-[#0E1F38]/70 font-medium ml-2">{pkg.external_order_id ? `Ref: #${pkg.external_order_id}` : `Package ${pIdx + 1}`}</span>
                          </div>
                          <div className="text-right font-mono text-[11px]">
                            <div className="text-[#0E1F38]/70">
                              Est: <span className="font-bold text-[#0E1F38]">{pkgEstWeight.toFixed(2)} kg</span>
                            </div>
                            <div className="text-[10px]">
                              {pkgActWeight ? (
                                <span className="text-emerald-700 font-bold flex items-center justify-end gap-0.5">
                                  Actual: {pkgActWeight.toFixed(2)} kg ✓
                                </span>
                              ) : (
                                <span className="text-amber-700 font-medium flex items-center justify-end gap-0.5">
                                  <span className="material-symbols-outlined text-[11px]">schedule</span>
                                  Actual (Ops): Pending
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Declared Parcel Items */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-black/5 space-y-3">
                <div className="flex justify-between items-center border-b border-black/5 pb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#0E1F38] flex items-center gap-1.5">
                    <span>📦</span> Declared Items Breakdown ({Array.isArray(selectedOrderDetails.items) ? selectedOrderDetails.items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0) : 0})
                  </h3>
                  <span className="text-[10px] font-bold text-[#0E1F38]/60 bg-[#FAF8EE] px-2 py-0.5 rounded border border-black/5">
                    {selectedOrderDetails.mode || 'Online Retailer'}
                  </span>
                </div>
                {Array.isArray(selectedOrderDetails.items) && selectedOrderDetails.items.length > 0 ? (
                  <div className="divide-y divide-black/5 max-h-56 overflow-y-auto pr-1">
                    {selectedOrderDetails.items.map((it: any, idx: number) => (
                      <div key={idx} className="py-2.5 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-[#0E1F38]">
                            {it.subcategory || it.name || it.category || 'Parcel Item'}
                          </p>
                          <p className="text-[10px] text-[#0E1F38]/60 font-medium">
                            Category: {it.category || 'General'} {it.demographic ? `· ${it.demographic}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="bg-[#FAF8EE] px-2.5 py-1 rounded-lg border border-black/5 font-mono font-bold text-[#0E1F38]">
                            {it.quantity || 1} qty
                          </span>
                          {it.weight && (
                            <span className="text-[10px] text-[#0E1F38]/60 block mt-0.5 font-mono">
                              {it.weight} kg each
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#0E1F38]/60 font-light">No individual item declarations logged.</p>
                )}
              </div>

              {/* Assigned Hub & Destination Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-black/5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-wider text-[#0E1F38]/50 block">🇮🇳 India Forwarding Hub</span>
                    <button
                      onClick={() => {
                        const addr = `Layo Locker (Locker #${formatShipmentId(selectedOrderDetails.id)})\n${matchedHub.address}\n${matchedHub.city} - ${matchedHub.pincode}\nPhone: ${matchedHub.contact || '+91 9321852629'}`;
                        navigator.clipboard.writeText(addr);
                        alert('India Hub delivery address copied to clipboard!');
                      }}
                      className="text-[9px] font-bold bg-[#8BC34A] hover:bg-[#9ccc65] text-[#1B250F] px-2 py-0.5 rounded transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[10px]">content_copy</span>
                      Copy Hub
                    </button>
                  </div>
                  <p className="font-bold text-[#0E1F38]">{matchedHub.city || 'Delhi NCR Hub'}</p>
                  <p className="text-[11px] text-[#0E1F38]/70 font-mono leading-tight">
                    Layo Locker (Locker #{formatShipmentId(selectedOrderDetails.id)})<br />
                    {matchedHub.address}, {matchedHub.city} - {matchedHub.pincode}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-black/5 space-y-2 text-xs">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#0E1F38]/50 block">🇨🇦 Canada Destination</span>
                  <p className="font-bold text-[#0E1F38]">{selectedOrderDetails.destination_city || 'Toronto (GTA)'}</p>
                  <p className="text-[11px] text-[#0E1F38]/70 font-light leading-relaxed">
                    {selectedOrderDetails.destination_address || 'Delivery Address on File'}
                  </p>
                  {selectedOrderDetails.external_order_id && (
                    <p className="text-[10px] font-mono text-[#0E1F38]/70 pt-1">
                      <strong>Ref Order:</strong> {selectedOrderDetails.external_order_id}
                    </p>
                  )}
                </div>
              </div>

              {/* Dynamic Action Buttons */}
              <div className="pt-2 space-y-2">
                {isDraft ? (
                  <button
                    onClick={() => {
                      setSelectedOrderDetails(null);
                      handlePayDraftWithStripe(selectedOrderDetails);
                    }}
                    className="w-full py-4 bg-[#FF5A65] hover:bg-[#e24550] text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-md shadow-[#FF5A65]/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">lock</span>
                    <span>Pay 20% Deposit (${advanceCAD.toFixed(2)} CAD) &amp; Book Shipment</span>
                  </button>
                ) : hasDues && (statusNormalized === 'repacked' || payStatus === 'awaiting_balance') ? (
                  <button
                    onClick={() => {
                      setSelectedOrderDetails(null);
                      if (selectedOrderDetails.isHoldGroup) {
                        handlePayRemainingBalanceGroup(selectedOrderDetails);
                      } else {
                        handlePayRemainingBalance(selectedOrderDetails);
                      }
                    }}
                    className="w-full py-4 bg-[#FF5A65] hover:bg-[#e24550] text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-md shadow-[#FF5A65]/20 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">lock_open</span>
                    <span>Pay Remaining Balance (${balanceDueCAD.toFixed(2)} CAD)</span>
                  </button>
                ) : isHold && (statusNormalized === 'holding' || !selectedOrderDetails.actual_weight) ? (
                  <button
                    onClick={() => {
                      const holdId = selectedOrderDetails.hold_group_id || selectedOrderDetails.id;
                      setSelectedOrderDetails(null);
                      setSelectedHoldGroupId(holdId);
                      setHoldOptionMode('existing');
                      setWarehouseAction('hold');
                      if (selectedOrderDetails.destination_city) setDestinationCity(selectedOrderDetails.destination_city);
                      if (selectedOrderDetails.destination_address) setDestinationAddress(selectedOrderDetails.destination_address);
                      if (selectedOrderDetails.india_warehouse) setSelectedWarehouse(selectedOrderDetails.india_warehouse);
                      setActiveTab('new');
                      setCurrentStep(1);
                    }}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    <span>+ Add Another Package to this Hold Group</span>
                  </button>
                ) : null}

                <button
                  onClick={() => setSelectedOrderDetails(null)}
                  className="w-full py-3 bg-[#1B250F] text-white font-bold text-xs uppercase tracking-wider rounded-2xl hover:bg-[#2c3b19] transition-all cursor-pointer shadow-md"
                >
                  Close Order Details
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Manage My Addresses Popup Modal ── */}
      {showManageAddressesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FAF8EE] border border-black/10 rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in relative text-[#0E1F38] my-8">
            <div className="flex justify-between items-start border-b border-black/10 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#FF5A65] block">
                  Saved Delivery Locations
                </span>
                <h2 className="text-xl font-black text-[#0E1F38] flex items-center gap-2 mt-0.5">
                  📍 My Addresses
                </h2>
              </div>
              <button
                onClick={() => setShowManageAddressesModal(false)}
                className="w-8 h-8 rounded-full bg-white border border-black/10 flex items-center justify-center text-[#0E1F38]/70 hover:text-[#0E1F38] transition-all cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {/* Add New Address Form inside Modal */}
            <div className="bg-white border border-black/10 rounded-2xl p-4 space-y-3 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-[#0E1F38]/60 block">+ Add New Address</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Label (e.g. Home)"
                  value={newAddrLabel}
                  onChange={e => setNewAddrLabel(e.target.value)}
                  className="bg-[#FAF8EE] border border-black/10 rounded-xl px-3 py-2 text-xs text-[#0E1F38] focus:border-[#FF5A65] focus:outline-none"
                />
                <select
                  value={newAddrCity}
                  onChange={e => setNewAddrCity(e.target.value)}
                  className="bg-[#FAF8EE] border border-black/10 rounded-xl px-3 py-2 text-xs text-[#0E1F38] focus:border-[#FF5A65] focus:outline-none"
                >
                  {canadaCities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddNewSavedAddress}
                  disabled={!newAddrLine1.trim()}
                  className="bg-[#FF5A65] text-white font-bold text-xs rounded-xl py-2 hover:bg-[#e24550] disabled:opacity-40 transition-all cursor-pointer"
                >
                  Save Address
                </button>
              </div>
              <input
                type="text"
                placeholder="Full Street Address (Suite #, Street name, City, Postal code)"
                value={newAddrLine1}
                onChange={e => setNewAddrLine1(e.target.value)}
                className="w-full bg-[#FAF8EE] border border-black/10 rounded-xl px-3 py-2 text-xs text-[#0E1F38] focus:border-[#FF5A65] focus:outline-none"
              />
            </div>

            {/* List of Saved Addresses */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {savedAddresses.length === 0 ? (
                <p className="text-xs text-[#0E1F38]/50 italic text-center py-4">No saved addresses yet. Addresses used in orders auto-save here.</p>
              ) : (
                savedAddresses.map(addr => (
                  <div key={addr.id} className="bg-white border border-black/10 rounded-2xl p-3.5 flex justify-between items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#0E1F38]">{addr.label || 'Saved Address'}</span>
                        {addr.isDefault && <span className="text-[8px] bg-[#8BC34A] text-[#1B250F] font-black px-1.5 py-0.5 rounded">Default</span>}
                      </div>
                      <p className="text-xs text-[#0E1F38]/70 mt-0.5">{addr.line1}{addr.city ? `, ${addr.city}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setDestinationCity(addr.city || 'Toronto (GTA)');
                          setDestinationAddress(addr.line1);
                          setSelectedSavedAddressId(addr.id);
                          setShowManageAddressesModal(false);
                        }}
                        className="px-2.5 py-1 bg-[#1B250F] text-white text-[10px] font-bold rounded-lg hover:bg-black transition-all cursor-pointer"
                      >
                        Use
                      </button>
                      <button
                        onClick={() => handleDeleteSavedAddress(addr.id)}
                        className="px-2 py-1 text-red-500 hover:text-red-700 text-[10px] font-bold cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile representation Bottom Nav Bar ── */}
      <footer className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 bg-[#FAF8EE]/95 backdrop-blur border-t border-black/10 rounded-t-2xl shadow-lg">
        <button 
          onClick={() => {
            handleStartNewOrder();
            router.push('/');
          }} 
          className="flex flex-col items-center justify-center text-[#0E1F38]/70 hover:text-[#0E1F38] cursor-pointer"
        >
          <span className="material-symbols-outlined">home</span>
          <span className="text-[9px] mt-0.5 font-medium">Home</span>
        </button>
        <button onClick={handleStartNewOrder} className="flex flex-col items-center justify-center text-[#FF5A65] cursor-pointer">
          <span className="material-symbols-outlined">calculate</span>
          <span className="text-[9px] mt-0.5 font-bold">Calculate</span>
        </button>
        <button onClick={() => router.push('/')} className="flex flex-col items-center justify-center text-[#0E1F38]/70 hover:text-[#0E1F38] cursor-pointer">
          <span className="material-symbols-outlined">person</span>
          <span className="text-[9px] mt-0.5 font-medium">Profile</span>
        </button>
      </footer>

      {/* ── Guest Auth Pop-Out Modal ── */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        title={authModalTitle}
        subtitle={authModalSubtitle}
      />

    </div>
  );
}

