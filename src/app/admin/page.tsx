'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { supabase, fetchShipments, updateShipmentStage } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { loadHaulCards, saveHaulCards, fetchHaulCardsFromDb, saveHaulCardToDb, HaulCard, DEFAULT_HAUL_CARDS } from '@/lib/haul-cards';
import { getPricingSettings, savePricingSettings, calculateLayoDeliveryCost, LayoPricingSettings, getDelhiveryRate } from '@/lib/delhiveryRates';
import { loadMasterCategories, saveMasterCategories, MasterCategoryGroup, DEFAULT_MASTER_CATEGORIES } from '@/lib/categoryMatrix';
import { formatShipmentId, formatTransactionId, formatCustomerId, formatUserId, formatWarehouseId, formatOrderId } from '@/lib/idGenerator';

const STATUS_STEPS = [
  'draft',
  'paid',
  'inwarded',
  'qc_verified',
  'repacked',
  'bulk_consolidated',
  'in_transit',
  'received_canada',
  'out_for_delivery',
  'delivered'
];
const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft Booking',
  paid: 'Paid / Awaiting India Hub',
  inwarded: 'Received @ India Hub (DEL)',
  qc_verified: 'QC Matched & Photographed',
  repacked: 'Layo SOP Repacked',
  bulk_consolidated: 'In Master Cargo Box',
  in_transit: 'Bulk Airfreight to Canada',
  received_canada: 'Received @ Canada Hub (YYZ)',
  out_for_delivery: 'Local Canadian Courier Dispatch',
  delivered: 'Delivered in Canada',
};
const STATUS_COLORS: Record<string, string> = {
  draft: '#64748b',
  paid: '#f59e0b',
  inwarded: '#8b5cf6',
  qc_verified: '#3b82f6',
  repacked: '#d97706',
  bulk_consolidated: '#6366f1',
  in_transit: '#059669',
  received_canada: '#0d9488',
  out_for_delivery: '#0284c7',
  delivered: '#10b981',
};

type AdminTab = 'orders' | 'warehouses' | 'ops_team' | 'analytics' | 'cards' | 'pricing' | 'categories';

const ADMIN_EMAILS = ['admin@layo.com', 'ankur@layo.com', 'ankur.iitd.nita@gmail.com'];

export default function AdminPortal() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>('orders');
  const [shipments, setShipments] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [opsStaffList, setOpsStaffList] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Pricing Settings
  const [pricingSettings, setPricingSettings] = useState<LayoPricingSettings>({
    opsFeeLow: 300,
    opsFeeHigh: 500,
    opsFeeThreshold: 2500,
    grossMarginPercent: 20,
    gstPercent: 18,
  });
  const [pricingSavedNotice, setPricingSavedNotice] = useState(false);

  // Category Matrix Settings
  const [masterCategories, setMasterCategories] = useState<MasterCategoryGroup[]>([]);
  const [categorySavedNotice, setCategorySavedNotice] = useState(false);

  useEffect(() => {
    setPricingSettings(getPricingSettings());
    setMasterCategories(loadMasterCategories());
  }, []);

  const handleSavePricingSettings = async () => {
    savePricingSettings(pricingSettings);
    setPricingSavedNotice(true);
    setTimeout(() => setPricingSavedNotice(false), 3000);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key: 'pricing_settings', value: pricingSettings });
      if (error) throw error;
    } catch (e: any) {
      console.warn("Failed to sync pricing settings to Supabase:", e);
      alert("Pricing settings saved locally, but database sync failed (ensure system_settings table exists): " + e.message);
    }
  };

  const handleSaveCategoryMatrix = async () => {
    saveMasterCategories(masterCategories);
    setCategorySavedNotice(true);
    setTimeout(() => setCategorySavedNotice(false), 3000);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key: 'category_matrix', value: masterCategories });
      if (error) throw error;
    } catch (e: any) {
      console.warn("Failed to sync category matrix to Supabase:", e);
      alert("Weight matrix saved locally, but database sync failed (ensure system_settings table exists): " + e.message);
    }
  };

  const handleResetCategoryMatrix = async () => {
    if (confirm('Reset all categories and item weights to default master matrix?')) {
      setMasterCategories(DEFAULT_MASTER_CATEGORIES);
      saveMasterCategories(DEFAULT_MASTER_CATEGORIES);
      setCategorySavedNotice(true);
      setTimeout(() => setCategorySavedNotice(false), 3000);
      try {
        const { error } = await supabase
          .from('system_settings')
          .upsert({ key: 'category_matrix', value: DEFAULT_MASTER_CATEGORIES });
        if (error) throw error;
      } catch (e: any) {
        console.warn("Failed to sync category matrix to Supabase:", e);
      }
    }
  };

  // Warehouse form
  const [whForm, setWhForm] = useState({ city: '', address: '', pincode: '', contact: '' });
  const [whSaving, setWhSaving] = useState(false);
  const [deletingWH, setDeletingWH] = useState<string | null>(null);

  // Card Builder
  const [haulCards, setHaulCards] = useState<HaulCard[]>([]);
  const [cardForm, setCardForm] = useState<Omit<HaulCard, 'id'>>({
    headline: '',
    ageLabel: '',
    asset1Icon: 'checkroom',
    asset1Label: '',
    asset1Qty: 1,
    asset2Icon: 'category',
    asset2Label: '',
    asset2Qty: 1,
    canadaPrice: 0,
    indiaPrice: 0,
    highlightSubtext: '',
    status: 'active',
  });
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/admin/login');
      } else if (!ADMIN_EMAILS.includes(user.email || '')) {
        setIsAdmin(false);
        const timer = setTimeout(() => {
          router.push('/dashboard');
        }, 4000);
        return () => clearTimeout(timer);
      } else {
        setIsAdmin(true);
        fetchAllData();
        setHaulCards(loadHaulCards());
      }
    }
  }, [user, loading, router]);

  const fetchAllData = async () => {
    setIsFetching(true);
    const [shipsResult, whs, cards, staff] = await Promise.all([
      fetchShipments(),
      supabase.from('warehouses').select('*').order('created_at', { ascending: true }),
      fetchHaulCardsFromDb(),
      supabase.from('ops_staff').select('*').order('created_at', { ascending: false }),
    ]);
    if (shipsResult.data) setShipments(shipsResult.data);
    if (whs.data) setWarehouses(whs.data);
    if (cards) setHaulCards(cards);
    if (staff.data) setOpsStaffList(staff.data);
    setIsFetching(false);
  };

  const handleApproveStaff = async (staffId: string, staffEmail: string) => {
    try {
      const { error } = await supabase
        .from('ops_staff')
        .update({
          status: 'approved',
          approved_by: user?.email || 'admin',
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', staffId);

      if (error) throw error;
      setOpsStaffList(prev => prev.map(s => s.id === staffId ? { ...s, status: 'approved', approved_by: user?.email } : s));
    } catch (err: any) {
      alert(`Failed to approve staff: ${err.message}`);
    }
  };

  const handleRejectStaff = async (staffId: string) => {
    if (!confirm('Reject / Revoke access for this staff member?')) return;
    try {
      const { error } = await supabase
        .from('ops_staff')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', staffId);

      if (error) throw error;
      setOpsStaffList(prev => prev.map(s => s.id === staffId ? { ...s, status: 'rejected' } : s));
    } catch (err: any) {
      alert(`Failed to reject staff: ${err.message}`);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm('Delete this staff record permanently?')) return;
    try {
      const { error } = await supabase.from('ops_staff').delete().eq('id', staffId);
      if (error) throw error;
      setOpsStaffList(prev => prev.filter(s => s.id !== staffId));
    } catch (err: any) {
      alert(`Failed to delete staff: ${err.message}`);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    const currentShipment = shipments.find(s => s.id === id);
    const result = await updateShipmentStage(id, status, currentShipment?.stage_timestamps);
    if (!result.error) {
      setShipments(prev => prev.map(s => s.id === id ? { ...s, status, stage_timestamps: result.updatedTimestamps } : s));
    }
    setUpdatingId(null);
  };

  const addWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setWhSaving(true);
    const { data, error } = await supabase.from('warehouses').insert([whForm]).select();
    if (error) {
      alert('Failed to add warehouse: ' + error.message);
      console.error('Add warehouse error:', error);
    } else if (data) {
      setWarehouses(prev => [...prev, data[0]]);
      setWhForm({ city: '', address: '', pincode: '', contact: '' });
    }
    setWhSaving(false);
  };

  const deleteWarehouse = async (id: string) => {
    if (!confirm('Delete this warehouse? This cannot be undone.')) return;
    setDeletingWH(id);
    const { error } = await supabase.from('warehouses').delete().eq('id', id);
    if (error) {
      alert('Failed to delete warehouse: ' + error.message);
      console.error('Delete warehouse error:', error);
    } else {
      setWarehouses(prev => prev.filter(w => w.id !== id));
    }
    setDeletingWH(null);
  };

  const filteredShipments = useMemo(() => {
    return shipments.filter(s => {
      const matchesSearch =
        !searchQuery ||
        s.destination_city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.destination_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.id?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [shipments, searchQuery, statusFilter]);

  // Analytics
  const stats = useMemo(() => {
    const total = shipments.length;
    const totalWeight = shipments.reduce((s, o) => s + (parseFloat(o.total_weight) || 0), 0);
    const totalRevenue = shipments.reduce((s, o) => s + (parseInt(o.total_cost) || 0), 0);
    const byStatus = STATUS_STEPS.reduce((acc, st) => {
      acc[st] = shipments.filter(s => s.status === st).length;
      return acc;
    }, {} as Record<string, number>);
    return { total, totalWeight, totalRevenue, byStatus };
  }, [shipments]);

  if (loading || isFetching || (user && isAdmin === null)) {
    return (
      <div className="min-h-screen bg-background text-on-background flex flex-col justify-center items-center gap-4 font-sans">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-on-surface-variant font-bold text-xs uppercase tracking-widest">Verifying Admin Credentials…</p>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background text-white text-center p-6 font-sans">
        <div className="bg-surface-container border border-red-500/15 p-10 rounded-2xl max-w-[480px] shadow-2xl space-y-4">
          <span className="text-5xl block mb-2">🚫</span>
          <h1 className="text-2xl font-extrabold text-red-500">Access Denied</h1>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            Your account (<strong>{user?.email}</strong>) does not have administrator privileges.
          </p>
          <p className="text-xs text-red-500 font-bold">
            Only designated admin accounts (e.g. admin@layo.com or ankur@layo.com) are permitted.
          </p>
          <div className="text-xs text-on-surface-variant/70 pt-4 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            Redirecting to customer dashboard...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-on-background font-sans relative">
      
      {/* ── Sidebar Navigation ── */}
      <nav className="w-64 bg-surface border-r border-white/10 flex flex-col justify-between p-6 h-screen sticky top-0">
        <div className="space-y-8">
          <div className="space-y-2">
            <Logo showTagline={false} />
            <span className="inline-block bg-primary/10 text-primary border border-primary/20 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">ADMIN CONTROL</span>
          </div>

          <div className="space-y-1">
            <p className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant mb-3">Main Menu</p>
            {(
              [
                { id: 'orders',     icon: 'package_2',    label: 'Orders' },
                { id: 'pricing',    icon: 'calculate',    label: 'Pricing & Tariff' },
                { id: 'categories', icon: 'category',     label: 'Weight Matrix' },
                { id: 'ops_team',   icon: 'badge',        label: 'Ops Staff' },
                { id: 'warehouses', icon: 'home_storage', label: 'Warehouses' },
                { id: 'analytics',  icon: 'bar_chart',    label: 'Analytics' },
                { id: 'cards',      icon: 'style',        label: 'Haul Cards' },
              ] as { id: AdminTab; icon: string; label: string }[]
            ).map(item => {
              const pendingCount = item.id === 'ops_team' ? opsStaffList.filter(s => s.status === 'pending').length : 0;
              return (
                <button
                  key={item.id}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    activeTab === item.id 
                      ? 'bg-primary text-background' 
                      : 'text-on-surface-variant hover:text-white hover:bg-white/5'
                  }`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-lg">{item.icon}</span>
                    {item.label}
                  </div>
                  {pendingCount > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                      activeTab === item.id ? 'bg-background text-primary' : 'bg-amber-400 text-black'
                    }`}>
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1 border-t border-white/5 pt-6">
          <p className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant mb-3">Quick Links</p>
          <Link href="/ops" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-[#8BC34A] bg-[#8BC34A]/10 border border-[#8BC34A]/20 hover:bg-[#8BC34A]/20 transition-all">
            <span className="material-symbols-outlined text-lg">warehouse</span>
            Warehouse Ops App
          </Link>
          <Link href="/dashboard" className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-on-surface-variant hover:text-white hover:bg-white/5 transition-all">
            <span className="material-symbols-outlined text-lg">dashboard</span>
            Customer Locker
          </Link>
          <button 
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-error/80 hover:text-error hover:bg-error/5 transition-all"
            onClick={() => supabase.auth.signOut()}
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            Sign Out
          </button>
        </div>
      </nav>

      {/* ── Main Content Area ── */}
      <main className="flex-grow p-8 overflow-y-auto space-y-8">
        
        {/* Statistics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Orders', value: stats.total, icon: 'analytics' },
            { label: 'Total Weight', value: `${stats.totalWeight.toFixed(1)} kg`, icon: 'scale' },
            { label: 'Landed Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: 'payments' },
            { label: 'Active Hubs', value: warehouses.length, icon: 'hub' }
          ].map((card, i) => (
            <div key={i} className="bg-surface-container border border-white/5 rounded-2xl p-6 flex flex-col gap-1 relative overflow-hidden group">
              <span className="material-symbols-outlined absolute top-4 right-4 text-4xl text-white/5 group-hover:text-primary/10 transition-colors">{card.icon}</span>
              <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">{card.label}</span>
              <span className="text-3xl font-extrabold text-white mt-2">{card.value}</span>
            </div>
          ))}
        </div>

        {/* ──────────── ORDERS TAB ──────────── */}
        {activeTab === 'orders' && (
          <section className="bg-surface-container border border-white/10 rounded-2xl p-6 md:p-8 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-extrabold text-white">Orders Logs</h2>
                <p className="text-on-surface-variant text-xs mt-1">Manage aggregated cargo items and update locker shipping tracking.</p>
              </div>
              <button className="px-4 py-2 bg-background border border-white/10 text-on-surface-variant hover:text-white rounded-xl text-xs font-bold transition-all" onClick={fetchAllData}>
                ↻ Refresh Logs
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <input
                  placeholder="Search order ID, city, address..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-background border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-primary focus:ring-0 focus:outline-none w-full sm:w-64"
                />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-background border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-primary focus:ring-0 focus:outline-none w-full sm:w-48"
                >
                  <option value="all">All Statuses</option>
                  {STATUS_STEPS.map(s => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">{filteredShipments.length} matching orders</span>
            </div>

            {filteredShipments.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl text-on-surface-variant">
                No orders match filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="py-3 px-4 font-bold text-on-surface-variant border-b border-white/10 uppercase tracking-wider">Date</th>
                      <th className="py-3 px-4 font-bold text-on-surface-variant border-b border-white/10 uppercase tracking-wider">Locker Destination</th>
                      <th className="py-3 px-4 font-bold text-on-surface-variant border-b border-white/10 uppercase tracking-wider">Weight</th>
                      <th className="py-3 px-4 font-bold text-on-surface-variant border-b border-white/10 uppercase tracking-wider">Landed Cost</th>
                      <th className="py-3 px-4 font-bold text-on-surface-variant border-b border-white/10 uppercase tracking-wider">Status</th>
                      <th className="py-3 px-4 font-bold text-on-surface-variant border-b border-white/10 uppercase tracking-wider">Set Tracker</th>
                      <th className="py-3 px-4 border-b border-white/10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredShipments.map(s => (
                      <React.Fragment key={s.id}>
                        <tr className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${expandedRow === s.id ? 'bg-white/[0.01]' : ''}`}>
                          <td className="py-4 px-4 text-white">{new Date(s.created_at).toLocaleDateString('en-IN')}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20">
                                {formatShipmentId(s.id)}
                              </span>
                              {s.user_id && (
                                <span className="font-mono text-[9px] text-on-surface-variant">
                                  ({formatCustomerId(s.user_id)})
                                </span>
                              )}
                            </div>
                            <strong className="text-white text-sm block mt-0.5">{s.destination_city}</strong>
                            <div className="text-[11px] text-on-surface-variant truncate max-w-[240px]">{s.destination_address}</div>
                          </td>
                          <td className="py-4 px-4 text-white font-medium">{s.total_weight} kg</td>
                          <td className="py-4 px-4 text-white font-medium">₹{parseInt(s.total_cost || 0).toLocaleString()}</td>
                          <td className="py-4 px-4">
                            <span
                              className="px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] tracking-wider"
                              style={{ backgroundColor: `${STATUS_COLORS[s.status]}20`, color: STATUS_COLORS[s.status] }}
                            >
                              {STATUS_LABELS[s.status] || s.status}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <select
                              value={s.status}
                              onChange={e => updateStatus(s.id, e.target.value)}
                              disabled={updatingId === s.id}
                              className="bg-background border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white focus:border-primary focus:ring-0 focus:outline-none"
                            >
                              {STATUS_STEPS.map(st => (
                                <option key={st} value={st}>{STATUS_LABELS[st]}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => setExpandedRow(expandedRow === s.id ? null : s.id)}
                              className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white hover:border-primary transition-all"
                            >
                              <span className="material-symbols-outlined text-sm">{expandedRow === s.id ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}</span>
                            </button>
                          </td>
                        </tr>

                        {/* Expanded details row */}
                        {expandedRow === s.id && (
                          <tr>
                            <td colSpan={7} className="py-4 px-6 bg-background/50 border-b border-white/5">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs text-on-surface-variant">
                                
                                {/* Shipment 5-step detailed tracker */}
                                <div className="space-y-4">
                                  <h4 className="font-bold text-white uppercase tracking-wider text-[10px]">Aggregated Cargo Status Tracker</h4>
                                  <div className="flex flex-col gap-2.5">
                                    {STATUS_STEPS.map((st, idx) => {
                                      const currentIdx = STATUS_STEPS.indexOf(s.status);
                                      const isDone = idx <= currentIdx;
                                      const isActive = idx === currentIdx;
                                      const stageIso = s.stage_timestamps?.[st];
                                      const formattedDate = stageIso 
                                        ? new Date(stageIso).toLocaleString('en-IN', {
                                            day: 'numeric',
                                            month: 'numeric',
                                            year: 'numeric',
                                            hour: 'numeric',
                                            minute: '2-digit',
                                            hour12: true
                                          })
                                        : null;

                                      return (
                                        <div key={st} className="flex items-center justify-between gap-3 p-1.5 rounded-lg hover:bg-white/5 transition-all">
                                          <div className="flex items-center gap-3">
                                            <div 
                                              className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] text-background border transition-all"
                                              style={{
                                                backgroundColor: isDone ? STATUS_COLORS[s.status] : 'transparent',
                                                borderColor: isDone ? STATUS_COLORS[s.status] : '#334155',
                                                boxShadow: isActive ? `0 0 10px ${STATUS_COLORS[s.status]}` : 'none'
                                              }}
                                            >
                                              {isDone && '✓'}
                                            </div>
                                            <span className={`font-bold ${isDone ? 'text-white' : 'text-on-surface-variant'}`}>
                                              {STATUS_LABELS[st]}
                                            </span>
                                          </div>

                                          {formattedDate ? (
                                            <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                                              {formattedDate}
                                            </span>
                                          ) : (
                                            <span className="text-[10px] text-white/20 italic">
                                              — Pending
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Order Meta Info */}
                                <div className="space-y-3">
                                  <h4 className="font-bold text-white uppercase tracking-wider text-[10px]">Order Details</h4>
                                  <div className="border border-white/5 rounded-xl p-4 bg-background/60 space-y-2">
                                    <div className="flex justify-between"><span>Supabase ID</span><code className="text-white text-[11px]">{s.id.substr(0,8)}...</code></div>
                                    <div className="flex justify-between"><span>Payment Method</span><span className="text-white uppercase font-bold">{s.payment_method || '—'}</span></div>
                                    <div className="flex justify-between"><span>Locker Hub</span><span className="text-white font-bold">{s.india_warehouse || '—'}</span></div>
                                    <div className="flex justify-between"><span>Store Order ID</span><span className="text-white">{s.external_order_id || '—'}</span></div>
                                    <div className="flex justify-between"><span>Consolidated Tracking</span><span className="text-white font-mono">{s.external_tracking || '—'}</span></div>
                                  </div>
                                </div>

                                {/* Cargo Item lists */}
                                {s.items && s.items.length > 0 && (
                                  <div className="lg:col-span-2 space-y-3">
                                    <h4 className="font-bold text-white uppercase tracking-wider text-[10px]">Locker Contents</h4>
                                    <table className="w-full text-[11px] border border-white/5 rounded-xl overflow-hidden">
                                      <thead>
                                        <tr className="bg-background">
                                          <th className="py-2 px-3 font-bold text-white">Category</th>
                                          <th className="py-2 px-3 font-bold text-white">Subcategory</th>
                                          <th className="py-2 px-3 font-bold text-white">Age Group</th>
                                          <th className="py-2 px-3 font-bold text-white">Qty</th>
                                          <th className="py-2 px-3 font-bold text-white">Weight</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {s.items.map((item: any, idx: number) => (
                                          <tr key={idx} className="border-t border-white/5">
                                            <td className="py-2 px-3">{item.category}</td>
                                            <td className="py-2 px-3 text-white font-medium">{item.subcategory}</td>
                                            <td className="py-2 px-3">{item.ageGroup || '—'}</td>
                                            <td className="py-2 px-3 font-bold text-white">{item.quantity}</td>
                                            <td className="py-2 px-3">{(item.weight || 0.2).toFixed(2)} kg</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ──────────── WAREHOUSES TAB ──────────── */}
        {activeTab === 'warehouses' && (
          <section className="bg-surface-container border border-white/10 rounded-2xl p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-white">Warehouse Network</h2>
              <p className="text-on-surface-variant text-xs mt-1">Configure virtual locker address locations and coordinates.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Add warehouse form */}
              <div className="bg-background border border-white/5 rounded-2xl p-6 space-y-4 h-fit">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Add Locker Hub</h3>
                <form onSubmit={addWarehouse} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-on-surface-variant">City Location</label>
                    <input
                      placeholder="e.g. Pune"
                      value={whForm.city}
                      onChange={e => setWhForm({ ...whForm, city: e.target.value })}
                      required
                      className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-primary focus:ring-0 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-on-surface-variant">Locker Hub Address</label>
                    <input
                      placeholder="Building, Area"
                      value={whForm.address}
                      onChange={e => setWhForm({ ...whForm, address: e.target.value })}
                      required
                      className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-primary focus:ring-0 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-on-surface-variant">Pincode</label>
                    <input
                      placeholder="e.g. 411057"
                      value={whForm.pincode}
                      onChange={e => setWhForm({ ...whForm, pincode: e.target.value })}
                      required
                      className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-primary focus:ring-0 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-on-surface-variant">Contact Hotline</label>
                    <input
                      placeholder="e.g. +91 99887 76655"
                      value={whForm.contact}
                      onChange={e => setWhForm({ ...whForm, contact: e.target.value })}
                      required
                      className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-primary focus:ring-0 focus:outline-none"
                    />
                  </div>
                  <button type="submit" disabled={whSaving} className="w-full py-3 bg-primary text-background font-bold text-xs uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-95 transition-all mt-2">
                    {whSaving ? 'Adding...' : '+ Add Hub'}
                  </button>
                </form>
              </div>

              {/* Warehouse cards */}
              <div className="lg:col-span-2 space-y-4">
                {warehouses.length === 0 ? (
                  <div className="py-16 text-center text-on-surface-variant bg-background/30 rounded-2xl border border-dashed border-white/10">No locker hubs defined.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {warehouses.map(wh => (
                      <div key={wh.id} className="bg-background border border-white/5 rounded-2xl p-5 space-y-3 relative hover:border-white/10 transition-all flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-extrabold text-sm text-white">{wh.city} Hub</h4>
                              <span className="font-mono text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 inline-block mt-0.5">
                                {formatWarehouseId(wh.id)}
                              </span>
                            </div>
                            <button
                              onClick={() => deleteWarehouse(wh.id)}
                              disabled={deletingWH === wh.id}
                              className="text-error/60 hover:text-error transition-all"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </div>
                          <p className="text-[11px] text-on-surface-variant leading-relaxed">{wh.address}</p>
                        </div>
                        <div className="border-t border-white/5 pt-3 flex justify-between text-[10px] text-on-surface-variant font-semibold">
                          <span>📍 {wh.pincode}</span>
                          <span>📞 {wh.contact}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </section>
        )}

        {/* ──────────── ANALYTICS TAB ──────────── */}
        {activeTab === 'analytics' && (
          <section className="bg-surface-container border border-white/10 rounded-2xl p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-white">Aggregated Analytics</h2>
              <p className="text-on-surface-variant text-xs mt-1">Detailed metric visualizations and activity logs.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Status Breakdown */}
              <div className="bg-background border border-white/5 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Orders by Status</h3>
                <div className="space-y-3.5">
                  {STATUS_STEPS.map(st => {
                    const count = stats.byStatus[st] || 0;
                    const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                    return (
                      <div key={st} className="space-y-1 text-xs">
                        <div className="flex justify-between font-bold">
                          <span className="text-on-surface-variant">{STATUS_LABELS[st]}</span>
                          <span style={{ color: STATUS_COLORS[st] }}>{count}</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[st] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Destinations */}
              <div className="bg-background border border-white/5 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Top Destinations</h3>
                <div className="space-y-3 text-xs">
                  {(() => {
                    const counts: Record<string, number> = {};
                    shipments.forEach(s => {
                      if (s.destination_city) counts[s.destination_city] = (counts[s.destination_city] || 0) + 1;
                    });
                    return Object.entries(counts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 6)
                      .map(([city, count]) => (
                        <div key={city} className="flex justify-between items-center py-2 border-b border-white/5 last:border-b-0">
                          <span className="text-white font-bold">{city}</span>
                          <span className="text-primary font-bold">{count} shipments</span>
                        </div>
                      ));
                  })()}
                </div>
              </div>

              {/* Recent Activity List */}
              <div className="bg-background border border-white/5 rounded-2xl p-6 space-y-4 md:col-span-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Recent Activity Logs</h3>
                <div className="space-y-3 text-xs">
                  {shipments.slice(0, 10).map(s => (
                    <div key={s.id} className="flex justify-between items-center border-b border-white/5 pb-2 last:border-b-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: STATUS_COLORS[s.status] || '#64748b' }}
                        />
                        <span className="text-white">
                          Order to <strong className="text-primary">{s.destination_city}</strong> — {s.total_weight}kg
                        </span>
                      </div>
                      <div className="flex gap-4 items-center">
                        <span 
                          className="font-bold text-[10px] uppercase tracking-wider"
                          style={{ color: STATUS_COLORS[s.status] || '#64748b' }}
                        >
                          {STATUS_LABELS[s.status]}
                        </span>
                        <span className="text-on-surface-variant text-[11px]">{new Date(s.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </section>
        )}

        {/* ──────────── OPS STAFF & APPROVALS TAB ──────────── */}
        {activeTab === 'ops_team' && (
          <section className="space-y-6">
            <div className="bg-surface-container border border-white/10 rounded-2xl p-6 md:p-8 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">badge</span>
                    Warehouse Floor Ops Personnel &amp; Approvals
                  </h2>
                  <p className="text-on-surface-variant text-xs mt-1">
                    Review staff sign-up requests, authorize floor access to /ops, and manage India Hub assignments.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl font-mono text-white">
                    Total Staff: {opsStaffList.length}
                  </span>
                  <span className="text-xs bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-xl font-mono text-amber-400 font-bold">
                    Pending: {opsStaffList.filter(s => s.status === 'pending').length}
                  </span>
                </div>
              </div>
            </div>

            {/* Pending Requests Section */}
            <div className="bg-surface-container border border-white/10 rounded-2xl p-6 md:p-8 space-y-4">
              <div className="flex items-center gap-2 text-amber-400">
                <span className="material-symbols-outlined">hourglass_top</span>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Pending Floor Approvals ({opsStaffList.filter(s => s.status === 'pending').length})</h3>
              </div>

              {opsStaffList.filter(s => s.status === 'pending').length === 0 ? (
                <div className="py-10 text-center text-on-surface-variant text-xs bg-background/30 rounded-xl border border-dashed border-white/10">
                  <span className="material-symbols-outlined text-3xl mb-1 text-primary/60">check_circle</span>
                  <p className="font-bold">No pending staff authorizations</p>
                  <p className="text-[11px] text-white/40">When new warehouse staff sign up at /ops/login, their requests will appear here for 1-click approval.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {opsStaffList.filter(s => s.status === 'pending').map(staff => (
                    <div key={staff.id} className="bg-background border border-amber-400/30 rounded-2xl p-5 space-y-4 shadow-lg">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <h4 className="font-bold text-white text-sm">{staff.full_name || 'Staff Member'}</h4>
                          <p className="text-xs text-primary font-mono">{staff.email}</p>
                          <p className="text-[11px] text-on-surface-variant flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">location_on</span>
                            {staff.hub_location || 'Delhi NCR Hub'}
                          </p>
                        </div>
                        <span className="bg-amber-400/10 text-amber-400 border border-amber-400/30 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                          Pending
                        </span>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-white/5">
                        <button
                          onClick={() => handleRejectStaff(staff.id)}
                          className="flex-1 py-2.5 bg-white/5 hover:bg-error/10 text-on-surface-variant hover:text-error text-xs font-bold rounded-xl border border-white/10 transition-all cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApproveStaff(staff.id, staff.email)}
                          className="flex-1 py-2.5 bg-[#8BC34A] hover:bg-[#9ccc65] text-[#1B250F] text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">check</span>
                          Approve Staff
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Approved Active Staff List */}
            <div className="bg-surface-container border border-white/10 rounded-2xl p-6 md:p-8 space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-white">All Registered Warehouse Associates ({opsStaffList.length})</h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-on-surface-variant">
                  <thead className="bg-background/40 uppercase tracking-widest text-[9px] font-black text-white/60 border-b border-white/5">
                    <tr>
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Assigned Hub</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Approved By</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium">
                    {opsStaffList.map(staff => (
                      <tr key={staff.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="text-white font-bold">{staff.full_name || 'Staff'}</p>
                          <p className="text-[11px] font-mono text-on-surface-variant">{staff.email}</p>
                        </td>
                        <td className="py-3.5 px-4 text-white">
                          {staff.hub_location || 'Delhi NCR Hub'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            staff.status === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : staff.status === 'rejected'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                              : 'bg-amber-400/10 text-amber-400 border border-amber-400/30'
                          }`}>
                            {staff.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-white/50 text-[11px]">
                          {staff.approved_by || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          {staff.status !== 'approved' ? (
                            <button
                              onClick={() => handleApproveStaff(staff.id, staff.email)}
                              className="px-3 py-1 bg-primary text-background font-bold text-[10px] uppercase rounded-lg hover:brightness-110 cursor-pointer"
                            >
                              Approve
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRejectStaff(staff.id)}
                              className="px-3 py-1 bg-white/5 text-amber-400 border border-amber-400/20 font-bold text-[10px] uppercase rounded-lg hover:bg-amber-400/10 cursor-pointer"
                            >
                              Revoke
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteStaff(staff.id)}
                            className="p-1 text-error/60 hover:text-error transition-all inline-flex items-center cursor-pointer"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ──────────── HAUL CARDS TAB ──────────── */}
        {activeTab === 'cards' && (
          <section className="bg-surface-container border border-white/10 rounded-2xl p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-white">Haul Card Builder</h2>
              <p className="text-on-surface-variant text-xs mt-1">Create and manage Smart Haul savings cards shown on the landing page.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

              {/* Card form */}
              <div className="bg-background border border-white/5 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {editingCardId ? 'Edit Card' : 'New Card'}
                </h3>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-on-surface-variant">Card Headline</label>
                  <input placeholder="e.g. Playground Bundle" value={cardForm.headline}
                    onChange={e => setCardForm({ ...cardForm, headline: e.target.value })}
                    className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-primary focus:outline-none" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-on-surface-variant">Age Label</label>
                  <input placeholder="e.g. Growing Kids (5–12)" value={cardForm.ageLabel}
                    onChange={e => setCardForm({ ...cardForm, ageLabel: e.target.value })}
                    className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-primary focus:outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-on-surface-variant">Asset 1 Icon</label>
                    <input placeholder="e.g. checkroom" value={cardForm.asset1Icon}
                      onChange={e => setCardForm({ ...cardForm, asset1Icon: e.target.value })}
                      className="w-full bg-surface-container border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-primary focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-on-surface-variant">Asset 1 Label</label>
                    <input placeholder="e.g. Graphic Tees" value={cardForm.asset1Label}
                      onChange={e => setCardForm({ ...cardForm, asset1Label: e.target.value })}
                      className="w-full bg-surface-container border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-primary focus:outline-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-on-surface-variant">Asset 1 Quantity</label>
                  <input type="number" min={1} value={cardForm.asset1Qty}
                    onChange={e => setCardForm({ ...cardForm, asset1Qty: parseInt(e.target.value) || 1 })}
                    className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-primary focus:outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-on-surface-variant">Asset 2 Icon</label>
                    <input placeholder="e.g. accessibility" value={cardForm.asset2Icon}
                      onChange={e => setCardForm({ ...cardForm, asset2Icon: e.target.value })}
                      className="w-full bg-surface-container border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-primary focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-on-surface-variant">Asset 2 Label</label>
                    <input placeholder="e.g. Joggers" value={cardForm.asset2Label}
                      onChange={e => setCardForm({ ...cardForm, asset2Label: e.target.value })}
                      className="w-full bg-surface-container border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-primary focus:outline-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-on-surface-variant">Asset 2 Quantity</label>
                  <input type="number" min={1} value={cardForm.asset2Qty}
                    onChange={e => setCardForm({ ...cardForm, asset2Qty: parseInt(e.target.value) || 1 })}
                    className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-primary focus:outline-none" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-on-surface-variant">Canada Price (CAD)</label>
                    <input type="number" min={0} placeholder="e.g. 136" value={cardForm.canadaPrice || ''}
                      onChange={e => setCardForm({ ...cardForm, canadaPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-surface-container border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-primary focus:outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-on-surface-variant">India+Layo Price (CAD)</label>
                    <input type="number" min={0} placeholder="e.g. 81" value={cardForm.indiaPrice || ''}
                      onChange={e => setCardForm({ ...cardForm, indiaPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-surface-container border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-primary focus:outline-none" />
                  </div>
                </div>

                {cardForm.canadaPrice > 0 && cardForm.indiaPrice > 0 && (
                  <p className="text-[10px] text-primary font-bold">
                    Auto-calculated savings: ${cardForm.canadaPrice - cardForm.indiaPrice} CAD
                  </p>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-on-surface-variant">Highlight Subtext</label>
                  <input placeholder="e.g. every time you refresh their play-wear." value={cardForm.highlightSubtext}
                    onChange={e => setCardForm({ ...cardForm, highlightSubtext: e.target.value })}
                    className="w-full bg-surface-container border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-primary focus:outline-none" />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant">Active</span>
                  <button
                    onClick={() => setCardForm({ ...cardForm, status: cardForm.status === 'active' ? 'inactive' : 'active' })}
                    className={`w-12 h-6 rounded-full border transition-all relative ${
                      cardForm.status === 'active' ? 'bg-primary border-primary' : 'bg-white/10 border-white/10'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-background transition-all ${
                      cardForm.status === 'active' ? 'left-6' : 'left-0.5'
                    }`} />
                  </button>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={async () => {
                      if (!cardForm.headline || !cardForm.asset1Label || !cardForm.asset2Label) return;
                      let updated: HaulCard[];
                      let savedCard: HaulCard;
                      if (editingCardId) {
                        savedCard = { ...cardForm, id: editingCardId };
                        updated = haulCards.map(c => c.id === editingCardId ? savedCard : c);
                      } else {
                        savedCard = { ...cardForm, id: `card-${Date.now()}` };
                        updated = [...haulCards, savedCard];
                      }
                      saveHaulCards(updated);
                      setHaulCards(updated);
                      await saveHaulCardToDb(savedCard);
                      setEditingCardId(null);
                      setCardForm({
                        headline: '', ageLabel: '',
                        asset1Icon: 'checkroom', asset1Label: '', asset1Qty: 1,
                        asset2Icon: 'category', asset2Label: '', asset2Qty: 1,
                        canadaPrice: 0, indiaPrice: 0, highlightSubtext: '', status: 'active',
                      });
                    }}
                    disabled={!cardForm.headline || !cardForm.asset1Label || !cardForm.asset2Label}
                    className="flex-1 py-3 bg-primary text-background font-bold text-xs uppercase tracking-widest rounded-xl hover:brightness-110 transition-all disabled:opacity-35 disabled:cursor-not-allowed"
                  >
                    {editingCardId ? 'Save Changes' : '+ Add Card'}
                  </button>
                  {editingCardId && (
                    <button
                      onClick={() => {
                        setEditingCardId(null);
                        setCardForm({
                          headline: '', ageLabel: '',
                          asset1Icon: 'checkroom', asset1Label: '', asset1Qty: 1,
                          asset2Icon: 'category', asset2Label: '', asset2Qty: 1,
                          canadaPrice: 0, indiaPrice: 0, highlightSubtext: '', status: 'active',
                        });
                      }}
                      className="px-4 py-3 border border-white/10 text-on-surface-variant text-xs font-bold rounded-xl hover:bg-white/5 transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (!confirm('Reset all cards to defaults? This cannot be undone.')) return;
                    saveHaulCards(DEFAULT_HAUL_CARDS);
                    setHaulCards(DEFAULT_HAUL_CARDS);
                  }}
                  className="w-full py-2 text-[10px] text-error/60 hover:text-error uppercase font-bold tracking-widest transition-all"
                >
                  Reset to Defaults
                </button>
              </div>

              {/* Cards list */}
              <div className="lg:col-span-2 space-y-4">
                {haulCards.length === 0 ? (
                  <div className="py-16 text-center text-on-surface-variant bg-background/30 rounded-2xl border border-dashed border-white/10">No haul cards defined.</div>
                ) : (
                  <div className="space-y-3">
                    {haulCards.map(card => {
                      const savings = card.canadaPrice - card.indiaPrice;
                      return (
                        <div key={card.id} className={`bg-background border rounded-2xl p-5 flex items-center gap-4 transition-all ${
                          card.status === 'active' ? 'border-white/10' : 'border-white/5 opacity-50'
                        }`}>
                          <div className="flex-grow space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${card.status === 'active' ? 'bg-primary' : 'bg-white/20'}`} />
                              <p className="font-bold text-sm text-white truncate">{card.headline}</p>
                            </div>
                            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">{card.ageLabel}</p>
                            <p className="text-[11px] text-on-surface-variant">
                              <span className="text-white font-mono">{card.asset1Icon}</span> ×{card.asset1Qty}
                              {' + '}
                              <span className="text-white font-mono">{card.asset2Icon}</span> ×{card.asset2Qty}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs text-on-surface-variant line-through font-mono">${card.canadaPrice}</p>
                            <p className="text-xs text-white font-bold font-mono">${card.indiaPrice}</p>
                            <p className="text-primary text-xs font-black">Save ${savings}</p>
                          </div>
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <button
                              onClick={() => {
                                const updated = haulCards.map(c =>
                                  c.id === card.id ? { ...c, status: c.status === 'active' ? 'inactive' as const : 'active' as const } : c
                                );
                                saveHaulCards(updated);
                                setHaulCards(updated);
                              }}
                              className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition-all ${
                                card.status === 'active'
                                  ? 'border-primary/30 text-primary hover:bg-primary/5'
                                  : 'border-white/10 text-on-surface-variant hover:bg-white/5'
                              }`}
                            >
                              {card.status === 'active' ? 'Active' : 'Inactive'}
                            </button>
                            <button
                              onClick={() => {
                                setEditingCardId(card.id);
                                setCardForm({
                                  headline: card.headline,
                                  ageLabel: card.ageLabel,
                                  asset1Icon: card.asset1Icon,
                                  asset1Label: card.asset1Label,
                                  asset1Qty: card.asset1Qty,
                                  asset2Icon: card.asset2Icon,
                                  asset2Label: card.asset2Label,
                                  asset2Qty: card.asset2Qty,
                                  canadaPrice: card.canadaPrice,
                                  indiaPrice: card.indiaPrice,
                                  highlightSubtext: card.highlightSubtext,
                                  status: card.status,
                                });
                              }}
                              className="px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-white/10 text-on-surface-variant hover:text-white hover:bg-white/5 transition-all"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                if (!confirm('Delete this card?')) return;
                                const updated = haulCards.filter(c => c.id !== card.id);
                                saveHaulCards(updated);
                                setHaulCards(updated);
                              }}
                              className="text-error/60 hover:text-error transition-all"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </section>
        )}

        {/* ── PRICING & TARIFF CONFIG TAB ── */}
        {activeTab === 'pricing' && (
          <section className="space-y-8 animate-fade-in max-w-6xl">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#8BC34A]">Pricing Engine Control</span>
              <h1 className="text-3xl font-black text-white">Delivery Cost Rules &amp; Tariff Matrix</h1>
              <p className="text-xs text-on-surface-variant font-light mt-1">
                Configure Ops Expenses, Gross Margins, and view live tariff calculations across Delhivery 2026 options.
              </p>
            </div>

            {/* Saved Notice Banner */}
            {pricingSavedNotice && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-fade-in">
                <span className="material-symbols-outlined text-lg">check_circle</span>
                Pricing Settings Saved! System-wide estimate calculator updated instantly.
              </div>
            )}

            {/* 1. Editable Options Panel */}
            <div className="bg-surface rounded-3xl border border-white/10 p-6 space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">tune</span>
                    Configurable Pricing Variables
                  </h2>
                  <p className="text-xs text-on-surface-variant">Adjust operational overheads and profit margins used in customer rate generation.</p>
                </div>
                <button
                  onClick={handleSavePricingSettings}
                  className="px-6 py-3 bg-[#FF5A65] hover:bg-[#e24550] text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  Save Pricing Rules
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                {/* Ops Expense Low */}
                <div className="space-y-1.5 bg-black/20 p-4 rounded-2xl border border-white/5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">
                    Ops Expense (&lt; ₹{pricingSettings.opsFeeThreshold})
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-primary">₹</span>
                    <input
                      type="number"
                      value={pricingSettings.opsFeeLow}
                      onChange={e => setPricingSettings(prev => ({ ...prev, opsFeeLow: Number(e.target.value) }))}
                      className="w-full bg-surface border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <p className="text-[9px] text-on-surface-variant/60">Applied when carrier rate is below threshold.</p>
                </div>

                {/* Ops Expense High */}
                <div className="space-y-1.5 bg-black/20 p-4 rounded-2xl border border-white/5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">
                    Ops Expense (≥ ₹{pricingSettings.opsFeeThreshold})
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-primary">₹</span>
                    <input
                      type="number"
                      value={pricingSettings.opsFeeHigh}
                      onChange={e => setPricingSettings(prev => ({ ...prev, opsFeeHigh: Number(e.target.value) }))}
                      className="w-full bg-surface border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <p className="text-[9px] text-on-surface-variant/60">Applied when carrier rate is above threshold.</p>
                </div>

                {/* Ops Threshold */}
                <div className="space-y-1.5 bg-black/20 p-4 rounded-2xl border border-white/5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">
                    Carrier Rate Threshold
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-primary">₹</span>
                    <input
                      type="number"
                      value={pricingSettings.opsFeeThreshold}
                      onChange={e => setPricingSettings(prev => ({ ...prev, opsFeeThreshold: Number(e.target.value) }))}
                      className="w-full bg-surface border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-primary"
                    />
                  </div>
                  <p className="text-[9px] text-on-surface-variant/60">Cut-off carrier cost in INR.</p>
                </div>

                {/* Gross Margin % */}
                <div className="space-y-1.5 bg-black/20 p-4 rounded-2xl border border-white/5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">
                    Gross Margin %
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={pricingSettings.grossMarginPercent}
                      onChange={e => setPricingSettings(prev => ({ ...prev, grossMarginPercent: Number(e.target.value) }))}
                      className="w-full bg-surface border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-primary"
                    />
                    <span className="text-sm font-bold text-primary">%</span>
                  </div>
                  <p className="text-[9px] text-on-surface-variant/60">Added on (Carrier Cost + Ops Expense).</p>
                </div>

                {/* GST % */}
                <div className="space-y-1.5 bg-black/20 p-4 rounded-2xl border border-white/5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block">
                    GST Tax %
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={pricingSettings.gstPercent}
                      onChange={e => setPricingSettings(prev => ({ ...prev, gstPercent: Number(e.target.value) }))}
                      className="w-full bg-surface border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-primary"
                    />
                    <span className="text-sm font-bold text-emerald-400">%</span>
                  </div>
                  <p className="text-[9px] text-on-surface-variant/60">Added at last before customer rate.</p>
                </div>
              </div>
            </div>

            {/* 2. Calculation Explanation Box */}
            <div className="bg-surface rounded-3xl border border-white/10 p-6 space-y-4 shadow-sm">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">help</span>
                How Calculation Table &amp; Costing Formula Works
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs font-light text-on-surface-variant">
                <div className="bg-black/20 p-3 rounded-2xl border border-white/5 space-y-1">
                  <span className="font-bold text-white block">Step 1: Carrier Base</span>
                  <p className="text-[11px]">Normal uses MIN(DLV Saver, Deferred, Express). Express uses Express. Documents use Doc tariff.</p>
                </div>
                <div className="bg-black/20 p-3 rounded-2xl border border-white/5 space-y-1">
                  <span className="font-bold text-white block">Step 2: Ops Expense</span>
                  <p className="text-[11px]">Adds ₹{pricingSettings.opsFeeLow} if carrier &lt; ₹{pricingSettings.opsFeeThreshold}, or ₹{pricingSettings.opsFeeHigh} if ≥ ₹{pricingSettings.opsFeeThreshold}.</p>
                </div>
                <div className="bg-black/20 p-3 rounded-2xl border border-white/5 space-y-1">
                  <span className="font-bold text-white block">Step 3: Gross Margin</span>
                  <p className="text-[11px]">Adds {pricingSettings.grossMarginPercent}% margin to (Carrier Base + Ops Expense).</p>
                </div>
                <div className="bg-black/20 p-3 rounded-2xl border border-white/5 space-y-1">
                  <span className="font-bold text-white block">Step 4: GST (18%)</span>
                  <p className="text-[11px]">Adds {pricingSettings.gstPercent}% GST tax at last on top of Subtotal.</p>
                </div>
                <div className="bg-black/20 p-3 rounded-2xl border border-white/5 space-y-1">
                  <span className="font-bold text-white block">Step 5: Customer View</span>
                  <p className="text-[11px]">Customer sees ONLY final rate ($ CAD = Final INR / 70.4). Internal breakdowns are hidden.</p>
                </div>
              </div>
            </div>

            {/* 3. Live Dynamic Tariff & Profit Matrix Table */}
            <div className="bg-surface rounded-3xl border border-white/10 p-6 space-y-4 shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400">table_chart</span>
                    Live Master Tariff Matrix with 18% GST (Canada / Zone L)
                  </h2>
                  <p className="text-xs text-on-surface-variant">Calculated dynamically using active settings including {pricingSettings.gstPercent}% GST.</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full text-left text-xs bg-black/20">
                  <thead className="bg-black/40 text-on-surface-variant text-[10px] uppercase font-bold tracking-wider border-b border-white/10">
                    <tr>
                      <th className="p-3">Weight</th>
                      <th className="p-3">Normal Carrier Base</th>
                      <th className="p-3">Express Carrier Base</th>
                      <th className="p-3">Ops Fee</th>
                      <th className="p-3">Cost Basis</th>
                      <th className="p-3 text-emerald-400">Margin ({pricingSettings.grossMarginPercent}%)</th>
                      <th className="p-3 text-purple-400">GST ({pricingSettings.gstPercent}%)</th>
                      <th className="p-3">Normal Customer Rate</th>
                      <th className="p-3 text-right">Express Customer Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-on-surface">
                    {[0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 3.0, 5.0, 10.0, 20.0, 50.0].map(wt => {
                      const nCalc = calculateLayoDeliveryCost({
                        weightKg: wt,
                        deliveryType: 'normal',
                        isDocument: false,
                        cadToInrRate: 70.4,
                        opsFeeLow: pricingSettings.opsFeeLow,
                        opsFeeHigh: pricingSettings.opsFeeHigh,
                        opsFeeThreshold: pricingSettings.opsFeeThreshold,
                        grossMarginPercent: pricingSettings.grossMarginPercent,
                        gstPercent: pricingSettings.gstPercent,
                      });

                      const eCalc = calculateLayoDeliveryCost({
                        weightKg: wt,
                        deliveryType: 'express',
                        isDocument: false,
                        cadToInrRate: 70.4,
                        opsFeeLow: pricingSettings.opsFeeLow,
                        opsFeeHigh: pricingSettings.opsFeeHigh,
                        opsFeeThreshold: pricingSettings.opsFeeThreshold,
                        grossMarginPercent: pricingSettings.grossMarginPercent,
                        gstPercent: pricingSettings.gstPercent,
                      });

                      return (
                        <tr key={wt} className="hover:bg-white/5 font-medium">
                          <td className="p-3 font-bold text-white">{wt} kg</td>
                          <td className="p-3 font-mono">₹{nCalc.carrierBaseINR.toLocaleString()}</td>
                          <td className="p-3 font-mono text-amber-400">₹{eCalc.carrierBaseINR.toLocaleString()}</td>
                          <td className="p-3 font-mono">₹{nCalc.opsFeeINR}</td>
                          <td className="p-3 font-mono">₹{nCalc.costBasisINR.toLocaleString()}</td>
                          <td className="p-3 font-mono font-bold text-emerald-400">₹{nCalc.marginINR.toLocaleString()}</td>
                          <td className="p-3 font-mono font-bold text-purple-400">₹{nCalc.gstINR.toLocaleString()}</td>
                          <td className="p-3 font-bold text-white">
                            ${nCalc.finalPriceCAD.toFixed(2)} CAD <span className="text-[10px] text-on-surface-variant font-normal">(₹{nCalc.finalPriceINR.toLocaleString()})</span>
                          </td>
                          <td className="p-3 font-bold text-amber-400 text-right">
                            ${eCalc.finalPriceCAD.toFixed(2)} CAD <span className="text-[10px] text-on-surface-variant font-normal">(₹{eCalc.finalPriceINR.toLocaleString()})</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ── Tab 7: Master Category & Weight Matrix Management ── */}
        {activeTab === 'categories' && (
          <section className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container border border-white/10 p-6 rounded-2xl">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary block">
                  Catalog Configuration
                </span>
                <h2 className="text-xl font-bold text-white mt-1">Master Categories &amp; Weight Matrix Manager</h2>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  Manage unit weights in grams, item subtext descriptions, promo rules, and oversized warning triggers across all 9 main shipping categories.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetCategoryMatrix}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-white/10 cursor-pointer"
                >
                  Reset Defaults
                </button>
                <button
                  type="button"
                  onClick={handleSaveCategoryMatrix}
                  className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-background font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  Save Matrix
                </button>
              </div>
            </div>

            {categorySavedNotice && (
              <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-xl animate-fade-in flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Category &amp; Weight Matrix saved successfully! Changes are live across customer calculators.
              </div>
            )}

            {/* 9 Category Accordion Cards */}
            <div className="space-y-6">
              {masterCategories.map((group, groupIdx) => (
                <div key={group.id} className="bg-surface-container border border-white/10 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-white/10 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-2xl text-primary">{group.icon}</span>
                      <div>
                        <h3 className="text-base font-bold text-white">{group.name}</h3>
                        <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider">
                          {group.items.length} Subcategory Items {group.isFoodGlobal ? '· Food Customs Warning Enabled' : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Subcategory Items Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">
                          <th className="p-3 w-1/4">Subcategory Label</th>
                          <th className="p-3 w-1/6">Unit Weight (Grams)</th>
                          <th className="p-3">Subtext Description / Examples</th>
                          <th className="p-3 text-right">Special Flags</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {group.items.map((item, itemIdx) => (
                          <tr key={item.id} className="hover:bg-white/5">
                            {/* Label */}
                            <td className="p-3">
                              <input
                                type="text"
                                value={item.label}
                                onChange={(e) => {
                                  const updated = [...masterCategories];
                                  updated[groupIdx].items[itemIdx].label = e.target.value;
                                  setMasterCategories(updated);
                                }}
                                className="w-full bg-background border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:border-primary outline-none"
                              />
                            </td>

                            {/* Weight */}
                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  value={item.weightGrams}
                                  onChange={(e) => {
                                    const updated = [...masterCategories];
                                    updated[groupIdx].items[itemIdx].weightGrams = parseInt(e.target.value) || 0;
                                    setMasterCategories(updated);
                                  }}
                                  className="w-24 bg-background border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-amber-400 font-mono font-bold focus:border-primary outline-none"
                                />
                                <span className="text-[10px] text-on-surface-variant font-mono">g ({((item.weightGrams || 0) / 1000).toFixed(2)}kg)</span>
                              </div>
                            </td>

                            {/* Subtext */}
                            <td className="p-3">
                              <input
                                type="text"
                                value={item.subtext}
                                onChange={(e) => {
                                  const updated = [...masterCategories];
                                  updated[groupIdx].items[itemIdx].subtext = e.target.value;
                                  setMasterCategories(updated);
                                }}
                                className="w-full bg-background border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-on-surface-variant focus:border-primary outline-none font-light"
                              />
                            </td>

                            {/* Flags */}
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-3">
                                <label className="flex items-center gap-1 cursor-pointer text-[10px] text-amber-400 font-bold">
                                  <input
                                    type="checkbox"
                                    checked={!!item.isPromo}
                                    onChange={(e) => {
                                      const updated = [...masterCategories];
                                      updated[groupIdx].items[itemIdx].isPromo = e.target.checked;
                                      setMasterCategories(updated);
                                    }}
                                    className="rounded border-white/20 accent-amber-400"
                                  />
                                  Promo (0g 1st 5)
                                </label>

                                <label className="flex items-center gap-1 cursor-pointer text-[10px] text-red-400 font-bold">
                                  <input
                                    type="checkbox"
                                    checked={!!item.isOversized}
                                    onChange={(e) => {
                                      const updated = [...masterCategories];
                                      updated[groupIdx].items[itemIdx].isOversized = e.target.checked;
                                      setMasterCategories(updated);
                                    }}
                                    className="rounded border-white/20 accent-red-400"
                                  />
                                  Oversized
                                </label>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
