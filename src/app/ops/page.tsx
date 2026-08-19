'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { supabase, fetchShipments, updateShipmentStage } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

interface QCPhoto {
  url: string;
  type: 'intake' | 'unboxed' | 'packed';
  timestamp: string;
}

export default function WarehouseOpsPortal() {
  const { user, loading } = useAuth();

  // State
  const [shipments, setShipments] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'inward' | 'qc' | 'repack' | 'dispatch'>('all');
  const [selectedShipment, setSelectedShipment] = useState<any | null>(null);

  // Form states for active workstation
  const [grossWeightInput, setGrossWeightInput] = useState('');
  const [boxDimensions, setBoxDimensions] = useState({ length: 35, width: 25, height: 20 });
  const [carrierAWB, setCarrierAWB] = useState('');
  const [carrierName, setCarrierName] = useState('Delhivery Cross-Border');
  const [discrepancyNote, setDiscrepancyNote] = useState('');
  const [showDiscrepancyModal, setShowDiscrepancyModal] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<QCPhoto[]>([]);
  const [updating, setUpdating] = useState(false);

  // File input ref for camera capture
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadOpsData();
  }, []);

  const loadOpsData = async () => {
    setIsFetching(true);
    try {
      const { data } = await fetchShipments();
      if (data) {
        setShipments(data);
        if (selectedShipment) {
          const updated = data.find(s => s.id === selectedShipment.id);
          if (updated) setSelectedShipment(updated);
        }
      }
    } catch (err) {
      console.error('Failed to load shipments for ops', err);
    } finally {
      setIsFetching(false);
    }
  };

  // Filtered shipments
  const filteredShipments = useMemo(() => {
    return shipments.filter(s => {
      const q = searchQuery.toLowerCase().trim();
      const lockerMatch = (s.id || '').toLowerCase().includes(q);
      const userMatch = (s.user_id || '').toLowerCase().includes(q);
      const cityMatch = (s.destination_city || '').toLowerCase().includes(q);
      const extOrderMatch = (s.external_order_id || '').toLowerCase().includes(q);
      const trackingMatch = (s.external_tracking || '').toLowerCase().includes(q);

      const matchesSearch = !q || lockerMatch || userMatch || cityMatch || extOrderMatch || trackingMatch;

      if (!matchesSearch) return false;

      if (activeTab === 'inward') return s.status === 'paid' || s.status === 'draft';
      if (activeTab === 'qc') return s.status === 'inwarded' || s.status === 'arrived';
      if (activeTab === 'repack') return s.status === 'qc_verified';
      if (activeTab === 'dispatch') return s.status === 'repacked' || s.status === 'shipped';

      return true;
    });
  }, [shipments, searchQuery, activeTab]);

  // Handler: Inward scan / arrival
  const handleMarkInwarded = async (shipmentId: string) => {
    setUpdating(true);
    try {
      const current = shipments.find(s => s.id === shipmentId);
      const result = await updateShipmentStage(shipmentId, 'inwarded', current?.stage_timestamps);

      if (!result.error) {
        setShipments(prev => prev.map(s => s.id === shipmentId ? { ...s, status: 'inwarded', stage_timestamps: result.updatedTimestamps } : s));
        if (selectedShipment?.id === shipmentId) {
          setSelectedShipment((prev: any) => ({ ...prev, status: 'inwarded', stage_timestamps: result.updatedTimestamps }));
        }
      }
    } catch (err) {
      console.error('Failed to mark inwarded', err);
    } finally {
      setUpdating(false);
    }
  };

  // Handler: QC Pass & Photo Attach
  const handleMarkQCVerified = async (shipmentId: string) => {
    setUpdating(true);
    try {
      const current = shipments.find(s => s.id === shipmentId);
      const result = await updateShipmentStage(shipmentId, 'qc_verified', current?.stage_timestamps);

      if (!result.error) {
        setShipments(prev => prev.map(s => s.id === shipmentId ? { ...s, status: 'qc_verified', stage_timestamps: result.updatedTimestamps } : s));
        if (selectedShipment?.id === shipmentId) {
          setSelectedShipment((prev: any) => ({ ...prev, status: 'qc_verified', stage_timestamps: result.updatedTimestamps }));
        }
      }
    } catch (err) {
      console.error('Failed to mark QC verified', err);
    } finally {
      setUpdating(false);
    }
  };

  // Handler: Repacked in Layo Box
  const handleMarkRepacked = async (shipmentId: string) => {
    setUpdating(true);
    try {
      const weightNum = parseFloat(grossWeightInput) || selectedShipment?.total_weight || 1.0;
      const current = shipments.find(s => s.id === shipmentId);
      const result = await updateShipmentStage(shipmentId, 'repacked', current?.stage_timestamps, {
        total_weight: weightNum
      });

      if (!result.error) {
        setShipments(prev => prev.map(s => s.id === shipmentId ? { ...s, status: 'repacked', total_weight: weightNum, stage_timestamps: result.updatedTimestamps } : s));
        if (selectedShipment?.id === shipmentId) {
          setSelectedShipment((prev: any) => ({ ...prev, status: 'repacked', total_weight: weightNum, stage_timestamps: result.updatedTimestamps }));
        }
      }
    } catch (err) {
      console.error('Failed to mark repacked', err);
    } finally {
      setUpdating(false);
    }
  };

  // Handler: Dispatch to Carrier
  const handleDispatchCarrier = async (shipmentId: string) => {
    if (!carrierAWB.trim()) {
      alert('Please enter an international carrier AWB tracking number');
      return;
    }
    setUpdating(true);
    try {
      const current = shipments.find(s => s.id === shipmentId);
      const result = await updateShipmentStage(shipmentId, 'in_transit', current?.stage_timestamps, {
        external_tracking: `${carrierName}: ${carrierAWB}`
      });

      if (!result.error) {
        setShipments(prev => prev.map(s => s.id === shipmentId ? { ...s, status: 'in_transit', external_tracking: `${carrierName}: ${carrierAWB}`, stage_timestamps: result.updatedTimestamps } : s));
        if (selectedShipment?.id === shipmentId) {
          setSelectedShipment((prev: any) => ({ ...prev, status: 'in_transit', external_tracking: `${carrierName}: ${carrierAWB}`, stage_timestamps: result.updatedTimestamps }));
        }
      }
    } catch (err) {
      console.error('Failed to mark in transit', err);
    } finally {
      setUpdating(false);
    }
  };

  // Simulated Photo Upload via Mobile Camera
  const handleCapturePhoto = (e: React.ChangeEvent<HTMLInputElement>, photoType: 'intake' | 'unboxed' | 'packed') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const newPhoto: QCPhoto = {
        url: reader.result as string,
        type: photoType,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setUploadedPhotos(prev => [newPhoto, ...prev]);
    };
    reader.readAsDataURL(file);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'inwarded':
        return <span className="bg-purple-100 text-purple-800 border border-purple-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">Inwarded @ Hub</span>;
      case 'qc_verified':
        return <span className="bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">QC Verified</span>;
      case 'repacked':
        return <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">Repacked in Box</span>;
      case 'in_transit':
      case 'shipped':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">In Transit to Canada</span>;
      case 'delivered':
        return <span className="bg-green-100 text-green-800 border border-green-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">Delivered</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">Awaiting Arrival</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#0E1F38] font-sans">
      {/* ── Top Ops Bar ── */}
      <header className="bg-[#1B250F] text-white px-4 py-3 sticky top-0 z-40 shadow-md flex items-center justify-between border-b border-[#34461F]">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-[#8BC34A]">LAYO</span>
            <span className="bg-[#8BC34A]/20 text-[#8BC34A] text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest border border-[#8BC34A]/40">
              Ops Floor Hub
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="text-xs bg-white/10 hover:bg-white/20 text-white font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
            <span className="hidden sm:inline">Admin Console</span>
          </Link>
          <button
            onClick={loadOpsData}
            className="text-xs bg-[#8BC34A] text-[#1B250F] font-black px-3 py-1.5 rounded-xl hover:bg-[#9ccc65] active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      {/* ── Main Ops Workstation Layout ── */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ── Left Column: Live Hub Inward Queue & Search ── */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Fast Search & Barcode Simulator */}
          <div className="bg-white rounded-2xl p-4 border border-black/10 shadow-sm space-y-3">
            <label className="text-[10px] uppercase font-black tracking-widest text-[#0E1F38]/60 flex items-center justify-between">
              <span>Quick Locker ID or Customer Search</span>
              <span className="text-[#2E7D32] flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">phone_android</span>
                Zero-Hardware Mobile Flow
              </span>
            </label>
            
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3 text-[#0E1F38]/40 text-lg">search</span>
              <input
                type="text"
                placeholder="Type Locker ID (e.g. 7892), Order ID, Name..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#FAF8EE] border border-black/10 rounded-xl text-xs text-[#0E1F38] placeholder:text-black/30 focus:outline-none focus:border-[#FF5A65] focus:ring-1 focus:ring-[#FF5A65]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-[#0E1F38]/40 hover:text-[#0E1F38] text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Stage Filter Tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-[10px] font-black uppercase tracking-wider">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'all' ? 'bg-[#0E1F38] text-white border-[#0E1F38]' : 'bg-[#FAF8EE] text-[#0E1F38]/60 border-black/10 hover:bg-black/5'
                }`}
              >
                All ({shipments.length})
              </button>
              <button
                onClick={() => setActiveTab('inward')}
                className={`px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'inward' ? 'bg-[#0E1F38] text-white border-[#0E1F38]' : 'bg-[#FAF8EE] text-[#0E1F38]/60 border-black/10 hover:bg-black/5'
                }`}
              >
                Inward (Scan)
              </button>
              <button
                onClick={() => setActiveTab('qc')}
                className={`px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'qc' ? 'bg-[#0E1F38] text-white border-[#0E1F38]' : 'bg-[#FAF8EE] text-[#0E1F38]/60 border-black/10 hover:bg-black/5'
                }`}
              >
                QC &amp; Photos
              </button>
              <button
                onClick={() => setActiveTab('repack')}
                className={`px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'repack' ? 'bg-[#0E1F38] text-white border-[#0E1F38]' : 'bg-[#FAF8EE] text-[#0E1F38]/60 border-black/10 hover:bg-black/5'
                }`}
              >
                Repack (Box)
              </button>
            </div>
          </div>

          {/* Shipment Queue Cards */}
          <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {isFetching ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-black/10 text-xs text-[#0E1F38]/60">
                <span className="material-symbols-outlined animate-spin text-2xl text-[#FF5A65] mb-2">progress_activity</span>
                <p>Loading hub queue...</p>
              </div>
            ) : filteredShipments.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-black/10 text-xs text-[#0E1F38]/60">
                <span className="material-symbols-outlined text-3xl text-black/20 mb-2">inbox</span>
                <p className="font-bold">No packages in this queue</p>
                <p className="text-[10px] mt-1 text-[#0E1F38]/40">Adjust filters or search parameters</p>
              </div>
            ) : (
              filteredShipments.map(s => {
                const isSelected = selectedShipment?.id === s.id;
                const shortId = (s.id || '').substring(0, 8).toUpperCase();
                const itemCount = Array.isArray(s.items) ? s.items.reduce((acc: number, i: any) => acc + (i.quantity || 1), 0) : 0;

                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedShipment(s)}
                    className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-xs relative ${
                      isSelected
                        ? 'border-[#FF5A65] ring-2 ring-[#FF5A65]/20 bg-[#FFF9F9]'
                        : 'border-black/10 hover:border-black/20 hover:bg-[#FAF8EE]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-xs text-[#0E1F38]">
                            LAYO-LOCK-{shortId.substring(0, 5)}
                          </span>
                          {getStatusBadge(s.status)}
                        </div>
                        <p className="text-xs font-bold text-[#0E1F38] mt-1">
                          {s.destination_city || 'Toronto, Canada'}
                        </p>
                        <p className="text-[10px] text-[#0E1F38]/60 mt-0.5">
                          Declared: {itemCount} items · {s.total_weight || 1} kg estimated
                        </p>
                      </div>

                      <span className="material-symbols-outlined text-[#0E1F38]/30">chevron_right</span>
                    </div>

                    {s.external_order_id && (
                      <div className="mt-2.5 pt-2 border-t border-black/5 flex items-center justify-between text-[9px] text-[#0E1F38]/60 font-mono">
                        <span>Merchant Ref: {s.external_order_id}</span>
                        <span>{new Date(s.created_at || Date.now()).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right Column: Interactive Ops Workstation ── */}
        <div className="lg:col-span-7">
          {selectedShipment ? (
            <div className="bg-white rounded-2xl border border-black/10 p-6 shadow-sm space-y-6 animate-fade-in">
              
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-black/5">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-[#0E1F38] font-mono">
                      LAYO-LOCK-{(selectedShipment.id || '').substring(0, 6).toUpperCase()}
                    </h2>
                    {getStatusBadge(selectedShipment.status)}
                  </div>
                  <p className="text-xs text-[#0E1F38]/60 mt-1">
                    Destination: <strong>{selectedShipment.destination_address || selectedShipment.destination_city}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowDiscrepancyModal(true)}
                    className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-100 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">warning</span>
                    Flag Discrepancy
                  </button>
                </div>
              </div>

              {/* Step 1 Workflow: Hub Ingestion */}
              <div className="p-4 bg-[#FAF8EE] rounded-2xl border border-black/5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#0E1F38] flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#1B250F] text-white flex items-center justify-center text-[10px]">1</span>
                    Hub Inward Ingestion
                  </h3>
                  {selectedShipment.status !== 'draft' && selectedShipment.status !== 'paid' && (
                    <span className="text-[10px] text-[#2E7D32] font-black flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">check_circle</span>
                      Inwarded at Hub
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#0E1F38]/70">
                  Verify domestic courier parcel label against locker code and confirm arrival.
                </p>

                {(selectedShipment.status === 'draft' || selectedShipment.status === 'paid') && (
                  <button
                    onClick={() => handleMarkInwarded(selectedShipment.id)}
                    disabled={updating}
                    className="w-full py-3 bg-[#8BC34A] text-[#1B250F] font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#9ccc65] active:scale-[0.99] transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">domain_verification</span>
                    Mark Package Inwarded at Hub
                  </button>
                )}
              </div>

              {/* Step 2 Workflow: Item QC & Mobile Photo Capture */}
              <div className="p-4 bg-[#FAF8EE] rounded-2xl border border-black/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#0E1F38] flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#1B250F] text-white flex items-center justify-center text-[10px]">2</span>
                    Physical QC &amp; Unboxing Verification
                  </h3>
                  {['qc_verified', 'repacked', 'in_transit', 'delivered'].includes(selectedShipment.status) && (
                    <span className="text-[10px] text-[#2E7D32] font-black flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">check_circle</span>
                      QC Verified
                    </span>
                  )}
                </div>

                {/* Declared items list */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#0E1F38]/60">Declared Customer Items Checklist:</p>
                  <div className="bg-white rounded-xl border border-black/5 divide-y divide-black/5 overflow-hidden text-xs">
                    {Array.isArray(selectedShipment.items) && selectedShipment.items.length > 0 ? (
                      selectedShipment.items.map((it: any, idx: number) => (
                        <div key={idx} className="p-3 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-[#0E1F38]">
                              {it.subcategory || it.name || 'Item'}
                            </span>
                            <span className="text-[10px] text-[#0E1F38]/60 ml-2">
                              {it.category ? `(${it.category})` : ''} {it.demographic ? `· ${it.demographic}` : ''}
                            </span>
                          </div>
                          <span className="bg-[#FAF8EE] border border-black/10 px-2 py-0.5 rounded font-black text-xs">
                            x{it.quantity || 1}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="p-3 text-[#0E1F38]/50 text-xs italic">No itemized list declared</p>
                    )}
                  </div>
                </div>

                {/* Photo capture gallery */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#0E1F38]/60">
                      Mobile Unboxing Photos ({uploadedPhotos.length}):
                    </p>
                    <label className="text-[10px] bg-white border border-black/10 hover:border-black/20 text-[#0E1F38] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs">
                      <span className="material-symbols-outlined text-xs">add_a_photo</span>
                      Snap Photo
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={e => handleCapturePhoto(e, 'unboxed')}
                      />
                    </label>
                  </div>

                  {uploadedPhotos.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {uploadedPhotos.map((photo, pIdx) => (
                        <div key={pIdx} className="relative aspect-square rounded-xl overflow-hidden border border-black/10 bg-black/5">
                          <img src={photo.url} alt="QC Capture" className="w-full h-full object-cover" />
                          <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] px-1 rounded font-mono">
                            {photo.timestamp}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-white rounded-xl border border-dashed border-black/15 text-center text-xs text-[#0E1F38]/40">
                      Take 1–2 photos of the unboxed goods for customer confirmation
                    </div>
                  )}
                </div>

                {selectedShipment.status === 'inwarded' && (
                  <button
                    onClick={() => handleMarkQCVerified(selectedShipment.id)}
                    disabled={updating}
                    className="w-full py-3 bg-[#1B250F] text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#2e3e1a] active:scale-[0.99] transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base text-[#8BC34A]">verified</span>
                    Pass Physical QC &amp; Attach Photos
                  </button>
                )}
              </div>

              {/* Step 3 Workflow: Volumetric Repacking & Weighing */}
              <div className="p-4 bg-[#FAF8EE] rounded-2xl border border-black/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#0E1F38] flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#1B250F] text-white flex items-center justify-center text-[10px]">3</span>
                    Standard Layo Repack &amp; Digital Weighing
                  </h3>
                  {['repacked', 'in_transit', 'delivered'].includes(selectedShipment.status) && (
                    <span className="text-[10px] text-[#2E7D32] font-black flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">check_circle</span>
                      Repacked ({selectedShipment.total_weight} kg)
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-[#0E1F38]/60 block mb-1">
                      Actual Scale Gross Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder={`e.g. ${selectedShipment.total_weight || 2.5}`}
                      value={grossWeightInput}
                      onChange={e => setGrossWeightInput(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-black/10 rounded-xl text-xs font-bold text-[#0E1F38] focus:outline-none focus:border-[#FF5A65]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-[#0E1F38]/60 block mb-1">
                      Layo Standard Green Box Size
                    </label>
                    <select
                      value={`${boxDimensions.length}x${boxDimensions.width}x${boxDimensions.height}`}
                      onChange={e => {
                        const [l, w, h] = e.target.value.split('x').map(Number);
                        setBoxDimensions({ length: l, width: w, height: h });
                      }}
                      className="w-full px-3 py-2 bg-white border border-black/10 rounded-xl text-xs font-bold text-[#0E1F38] focus:outline-none cursor-pointer"
                    >
                      <option value="25x20x15">Layo Box S (25 x 20 x 15 cm)</option>
                      <option value="35x25x20">Layo Box M (35 x 25 x 20 cm) - Standard</option>
                      <option value="45x35x25">Layo Box L (45 x 35 x 25 cm) - Haul</option>
                    </select>
                  </div>
                </div>

                {selectedShipment.status === 'qc_verified' && (
                  <button
                    onClick={() => handleMarkRepacked(selectedShipment.id)}
                    disabled={updating}
                    className="w-full py-3 bg-[#E6F4D0] border border-[#CADFAD] text-[#2B3A1A] font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#d8edbc] active:scale-[0.99] transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">inventory_2</span>
                    Seal Layo Box &amp; Record Weight
                  </button>
                )}
              </div>

              {/* Step 4 Workflow: Carrier Dispatch AWB */}
              <div className="p-4 bg-[#FAF8EE] rounded-2xl border border-black/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#0E1F38] flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#1B250F] text-white flex items-center justify-center text-[10px]">4</span>
                    Carrier Handoff &amp; International AWB
                  </h3>
                  {['in_transit', 'delivered'].includes(selectedShipment.status) && (
                    <span className="text-[10px] text-[#2E7D32] font-black flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">check_circle</span>
                      Dispatched
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-[#0E1F38]/60 block mb-1">
                      Air Express Carrier Partner
                    </label>
                    <select
                      value={carrierName}
                      onChange={e => setCarrierName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-black/10 rounded-xl text-xs font-bold text-[#0E1F38] focus:outline-none cursor-pointer"
                    >
                      <option value="Delhivery Cross-Border">Delhivery Cross-Border</option>
                      <option value="DHL Express International">DHL Express</option>
                      <option value="Aramex Express">Aramex</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-[#0E1F38]/60 block mb-1">
                      International AWB Tracking #
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. DLV-992039201"
                      value={carrierAWB}
                      onChange={e => setCarrierAWB(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-black/10 rounded-xl text-xs font-mono font-bold text-[#0E1F38] focus:outline-none focus:border-[#FF5A65]"
                    />
                  </div>
                </div>

                {selectedShipment.status === 'repacked' && (
                  <button
                    onClick={() => handleDispatchCarrier(selectedShipment.id)}
                    disabled={updating}
                    className="w-full py-3 bg-[#FF5A65] text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#e24550] active:scale-[0.99] transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">flight_takeoff</span>
                    Dispatch to Air Carrier (Activate Live Tracking)
                  </button>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-black/10 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#FAF8EE] text-[#0E1F38]/40 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-2xl">touch_app</span>
              </div>
              <h3 className="text-sm font-black text-[#0E1F38]">Select a Shipment from the Left Queue</h3>
              <p className="text-xs text-[#0E1F38]/60 max-w-sm mx-auto">
                Use the search box or tap any card on the left to start inward scanning, QC verification, and repacking.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Discrepancy Flag Modal */}
      {showDiscrepancyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-black/10 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center gap-3 text-red-600">
              <span className="material-symbols-outlined text-2xl">warning</span>
              <h3 className="text-base font-black text-[#0E1F38]">Flag Parcel Discrepancy</h3>
            </div>
            <p className="text-xs text-[#0E1F38]/70 leading-relaxed">
              Describe the issue (e.g. damaged goods, wrong size, restricted item). This will flag the customer dashboard and notify support.
            </p>
            <textarea
              rows={3}
              value={discrepancyNote}
              onChange={e => setDiscrepancyNote(e.target.value)}
              placeholder="e.g. Topwear has visible tear on left seam / Liquids bottle leaking..."
              className="w-full p-3 bg-[#FAF8EE] border border-black/10 rounded-xl text-xs text-[#0E1F38] focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowDiscrepancyModal(false)}
                className="flex-1 py-2.5 bg-[#FAF8EE] border border-black/10 text-xs font-bold rounded-xl hover:bg-black/5"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert('Discrepancy ticket created and attached to shipment');
                  setShowDiscrepancyModal(false);
                }}
                className="flex-1 py-2.5 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 shadow-sm"
              >
                Submit Flag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
