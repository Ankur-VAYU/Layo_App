/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities, @next/next/no-img-element */
'use client';

// ── Imports ─────────────────────────────────────────────────────────────
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { supabase, fetchShipments, updateShipmentStage } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

// ── Types & Interfaces ───────────────────────────────────────────────────────

interface QCPhoto {
  url: string;
  type: 'intake' | 'unboxed' | 'packed';
  timestamp: string;
}

// ── Component ────────────────────────────────────────────────────────────

export default function WarehouseOpsPortal() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // State
  const [activeHub, setActiveHub] = useState<'india' | 'canada'>('india');
  const [shipments, setShipments] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'inward' | 'qc' | 'repack' | 'master_bulk' | 'canada_dispatch' | 'hold_combine'>('all');
  const [mobileOpsTab, setMobileOpsTab] = useState<'queue' | 'workstation'>('queue');
  const [selectedShipment, setSelectedShipment] = useState<any | null>(null);

  // Form states for active workstation
  const [grossWeightInput, setGrossWeightInput] = useState('');
  const [boxDimensions, setBoxDimensions] = useState({ length: 35, width: 25, height: 20 });
  const [masterBoxId, setMasterBoxId] = useState('BATCH-CA-801');
  const [canadaCarrier, setCanadaCarrier] = useState('Canada Post Expedited');
  const [canadaAWB, setCanadaAWB] = useState('');
  const [discrepancyNote, setDiscrepancyNote] = useState('');
  const [showDiscrepancyModal, setShowDiscrepancyModal] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<QCPhoto[]>([]);
  const [updating, setUpdating] = useState(false);

  // Live Camera Viewfinder State & Refs
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    loadOpsData();
  }, []);

  // ── Data Fetching ───────────────────────────────────────────────────
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/ops/login');
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
      const masterBoxMatch = (s.master_box_id || '').toLowerCase().includes(q);

      const matchesSearch = !q || lockerMatch || userMatch || cityMatch || extOrderMatch || trackingMatch || masterBoxMatch;
      if (!matchesSearch) return false;

      if (activeTab === 'inward') return s.status === 'paid' || s.status === 'draft';
      if (activeTab === 'qc') return s.status === 'inwarded' || s.status === 'arrived';
      if (activeTab === 'repack') return s.status === 'qc_verified';
      if (activeTab === 'master_bulk') return s.status === 'repacked' || s.status === 'bulk_consolidated';

      return true;
    });
  }, [shipments, searchQuery, activeTab]);

  // Hold & Combine groups — group by user_id for the hold_combine tab
  // Only show PAID shipments (not drafts) in ops
  const holdGroups = useMemo(() => {
    const holdShipments = shipments.filter(s =>
      s.warehouse_action === 'hold' &&
      s.status !== 'Draft Estimate' &&
      s.status !== 'draft'
    );
    const groups: Record<string, any[]> = {};
    holdShipments.forEach(s => {
      const key = s.hold_group_id || s.user_id || s.id;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return Object.entries(groups).map(([groupKey, items]) => ({
      groupKey,
      userId: items[0]?.user_id,
      destinationCity: items[0]?.destination_city || 'Toronto (GTA)',
      expectedPackages: items[0]?.expected_packages || items.length,
      arrivedCount: items.filter(s => s.status === 'hold_arrived' || s.status === 'inwarded' || s.status === 'holding').length,
      allArrived: items.every(s => s.status === 'hold_arrived' || s.status === 'inwarded'),
      shipments: items,
    }));
  }, [shipments]);

  // Operator user details for step audit logging
  const operatorUser = useMemo(() => ({
    id: user?.id || null,
    email: user?.email || null,
    role: 'ops'
  }), [user]);

  // Handler: Inward scan / arrival at India Hub
  // ── Ops Stage Handlers ─────────────────────────────────────────────────
  /** Stage 1: Inward — scan package in at India Hub */
  const handleMarkInwarded = async (shipmentId: string) => {
    setUpdating(true);
    try {
      const current = shipments.find(s => s.id === shipmentId);
      const result = await updateShipmentStage(
        shipmentId,
        'inwarded',
        current?.stage_timestamps,
        {},
        operatorUser,
        'Package inward scanned at India Hub'
      );

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

  // Handler: Mark QC Verified & Item Match
  /** Stage 2: QC Verify — package passes quality check */
  const handleMarkQCVerified = async (shipmentId: string) => {
    setUpdating(true);
    try {
      const current = shipments.find(s => s.id === shipmentId);
      const result = await updateShipmentStage(
        shipmentId,
        'qc_verified',
        current?.stage_timestamps,
        { qc_photos: uploadedPhotos },
        operatorUser,
        `QC inspection passed with ${uploadedPhotos.length} photos`
      );

      if (!result.error) {
        setShipments(prev => prev.map(s => s.id === shipmentId ? { ...s, status: 'qc_verified', stage_timestamps: result.updatedTimestamps, qc_photos: uploadedPhotos } : s));
        if (selectedShipment?.id === shipmentId) {
          setSelectedShipment((prev: any) => ({ ...prev, status: 'qc_verified', stage_timestamps: result.updatedTimestamps, qc_photos: uploadedPhotos }));
        }
      }
    } catch (err) {
      console.error('Failed to mark QC verified', err);
    } finally {
      setUpdating(false);
    }
  };

  // Handler: Flag parcel discrepancy
  /** Stage 2b: QC Discrepancy — flag item mismatch or damage */
  const handleFlagDiscrepancy = async () => {
    if (!selectedShipment || !discrepancyNote.trim()) return;
    setUpdating(true);
    try {
      const result = await updateShipmentStage(
        selectedShipment.id,
        'qc_discrepancy',
        selectedShipment.stage_timestamps,
        { discrepancy_note: discrepancyNote },
        operatorUser,
        `QC Discrepancy Flagged: ${discrepancyNote}`
      );

      if (!result.error) {
        setShipments(prev => prev.map(s => s.id === selectedShipment.id ? { ...s, status: 'qc_discrepancy', discrepancy_note: discrepancyNote, stage_timestamps: result.updatedTimestamps } : s));
        setSelectedShipment((prev: any) => ({ ...prev, status: 'qc_discrepancy', discrepancy_note: discrepancyNote, stage_timestamps: result.updatedTimestamps }));
        setShowDiscrepancyModal(false);
        setDiscrepancyNote('');
      }
    } catch (err) {
      console.error('Failed to flag discrepancy', err);
    } finally {
      setUpdating(false);
    }
  };

  // Handler: Layo SOP Repack & Gross Scale Weight
  /** Stage 3: Repack — repack into Layo Green Box */
  const handleCompleteRepack = async (shipmentId: string) => {
    const verifiedWeight = parseFloat(grossWeightInput) || selectedShipment?.total_weight || 1.0;
    setUpdating(true);
    try {
      const current = shipments.find(s => s.id === shipmentId);
      const result = await updateShipmentStage(
        shipmentId,
        'repacked',
        current?.stage_timestamps,
        { total_weight: verifiedWeight, box_dimensions: boxDimensions },
        operatorUser,
        `Repacked in Layo Green Box (${verifiedWeight} kg, ${boxDimensions.length}x${boxDimensions.width}x${boxDimensions.height} cm)`
      );

      if (!result.error) {
        setShipments(prev => prev.map(s => s.id === shipmentId ? { ...s, status: 'repacked', total_weight: verifiedWeight, box_dimensions: boxDimensions, stage_timestamps: result.updatedTimestamps } : s));
        if (selectedShipment?.id === shipmentId) {
          setSelectedShipment((prev: any) => ({ ...prev, status: 'repacked', total_weight: verifiedWeight, box_dimensions: boxDimensions, stage_timestamps: result.updatedTimestamps }));
        }
      }
    } catch (err) {
      console.error('Failed to mark repacked', err);
    } finally {
      setUpdating(false);
    }
  };

  // Handler: Assign to Master Air Cargo Box (Bulk Consolidation)
  /** Stage 4: Bulk Consolidation — assign to master air cargo box */
  const handleAssignMasterBox = async (shipmentId: string) => {
    if (!masterBoxId) return;
    setUpdating(true);
    try {
      const current = shipments.find(s => s.id === shipmentId);
      const result = await updateShipmentStage(
        shipmentId,
        'bulk_consolidated',
        current?.stage_timestamps,
        { master_box_id: masterBoxId },
        operatorUser,
        `Assigned to master cargo batch ${masterBoxId}`
      );

      if (!result.error) {
        setShipments(prev => prev.map(s => s.id === shipmentId ? { ...s, status: 'bulk_consolidated', master_box_id: masterBoxId, stage_timestamps: result.updatedTimestamps } : s));
        if (selectedShipment?.id === shipmentId) {
          setSelectedShipment((prev: any) => ({ ...prev, status: 'bulk_consolidated', master_box_id: masterBoxId, stage_timestamps: result.updatedTimestamps }));
        }
      }
    } catch (err) {
      console.error('Failed to assign master cargo box', err);
    } finally {
      setUpdating(false);
    }
  };

  // Handler: Mark individual hold package as arrived at hub
  const handleMarkHoldArrived = async (shipmentId: string) => {
    setUpdating(true);
    try {
      const current = shipments.find(s => s.id === shipmentId);
      const result = await updateShipmentStage(
        shipmentId,
        'hold_arrived',
        current?.stage_timestamps,
        {},
        operatorUser,
        'Hold package arrived at India Hub'
      );
      if (!result.error) {
        setShipments(prev => prev.map(s =>
          s.id === shipmentId ? { ...s, status: 'hold_arrived', stage_timestamps: result.updatedTimestamps } : s
        ));
      }
    } catch (err) {
      console.error('Failed to mark hold arrived', err);
    } finally {
      setUpdating(false);
    }
  };

  // Handler: Combine all packages in a group and move to repack queue
  const handleCombineAndDispatch = async (groupShipments: any[]) => {
    if (!confirm(`Combine ${groupShipments.length} packages into one shipment and move to Repack queue?`)) return;
    setUpdating(true);
    try {
      const combinedBoxId = `HOLD-${Date.now().toString(36).toUpperCase()}`;
      for (const s of groupShipments) {
        await updateShipmentStage(
          s.id,
          'qc_verified',
          s.stage_timestamps,
          { master_box_id: combinedBoxId },
          operatorUser,
          `Combined into group box ${combinedBoxId}`
        );
      }
      await loadOpsData();
      alert(`✅ Combined! All ${groupShipments.length} packages assigned to box ${combinedBoxId} and moved to Repack queue.`);
    } catch (err) {
      console.error('Failed to combine packages', err);
      alert('Failed to combine packages. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  // Handler: Airfreight Dispatch from India Hub directly to Canada customer
  /** Stage 6: Airfreight Dispatch — India → Canada air cargo */
  const handleAirfreightDispatch = async (shipmentId: string) => {
    if (!canadaAWB) return;
    setUpdating(true);
    try {
      const current = shipments.find(s => s.id === shipmentId);
      const result = await updateShipmentStage(
        shipmentId,
        'in_transit',
        current?.stage_timestamps,
        {
          canada_local_carrier: canadaCarrier,
          canada_local_awb: canadaAWB,
          external_tracking: `${canadaCarrier}: ${canadaAWB}`
        },
        operatorUser,
        `Airfreight dispatched via ${canadaCarrier} (AWB: ${canadaAWB})`
      );
      if (!result.error) {
        setShipments(prev => prev.map(s => s.id === shipmentId ? {
          ...s, status: 'in_transit',
          canada_local_carrier: canadaCarrier,
          canada_local_awb: canadaAWB,
          external_tracking: `${canadaCarrier}: ${canadaAWB}`,
          stage_timestamps: result.updatedTimestamps
        } : s));
        if (selectedShipment?.id === shipmentId) {
          setSelectedShipment((prev: any) => ({ ...prev, status: 'in_transit', canada_local_carrier: canadaCarrier, canada_local_awb: canadaAWB, stage_timestamps: result.updatedTimestamps }));
        }
      }
    } catch (err) {
      console.error('Failed to dispatch airfreight', err);
    } finally {
      setUpdating(false);
    }
  };

  // Handler: Confirm delivered to Canadian customer address
  const handleMarkDelivered = async (shipmentId: string) => {
    setUpdating(true);
    try {
      const current = shipments.find(s => s.id === shipmentId);
      const result = await updateShipmentStage(
        shipmentId,
        'delivered',
        current?.stage_timestamps,
        {},
        operatorUser,
        'Confirmed delivered to customer address in Canada'
      );
      if (!result.error) {
        setShipments(prev => prev.map(s => s.id === shipmentId ? { ...s, status: 'delivered', stage_timestamps: result.updatedTimestamps } : s));
        if (selectedShipment?.id === shipmentId) {
          setSelectedShipment((prev: any) => ({ ...prev, status: 'delivered', stage_timestamps: result.updatedTimestamps }));
        }
      }
    } catch (err) {
      console.error('Failed to mark delivered', err);
    } finally {
      setUpdating(false);
    }
  };

  // Handler: Canada Hub Intake & De-consolidation
  const handleCanadaHubReceived = async (shipmentId: string) => {
    setUpdating(true);
    try {
      const current = shipments.find(s => s.id === shipmentId);
      const result = await updateShipmentStage(
        shipmentId,
        'received_canada',
        current?.stage_timestamps,
        {},
        operatorUser,
        'Received and de-consolidated at Canada Hub'
      );

      if (!result.error) {
        setShipments(prev => prev.map(s => s.id === shipmentId ? { ...s, status: 'received_canada', stage_timestamps: result.updatedTimestamps } : s));
        if (selectedShipment?.id === shipmentId) {
          setSelectedShipment((prev: any) => ({ ...prev, status: 'received_canada', stage_timestamps: result.updatedTimestamps }));
        }
      }
    } catch (err) {
      console.error('Failed to mark received at Canada Hub', err);
    } finally {
      setUpdating(false);
    }
  };

  // Handler: Local Canadian Courier Dispatch (Canada Post / Purolator)
  const handleCanadaLocalDispatch = async (shipmentId: string) => {
    if (!canadaAWB) return;
    setUpdating(true);
    try {
      const current = shipments.find(s => s.id === shipmentId);
      const result = await updateShipmentStage(
        shipmentId,
        'out_for_delivery',
        current?.stage_timestamps,
        {
          canada_local_carrier: canadaCarrier,
          canada_local_awb: canadaAWB,
          external_tracking: `${canadaCarrier}: ${canadaAWB}`
        },
        operatorUser,
        `Dispatched via Canadian local courier ${canadaCarrier} (AWB: ${canadaAWB})`
      );

      if (!result.error) {
        setShipments(prev => prev.map(s => s.id === shipmentId ? { ...s, status: 'out_for_delivery', canada_local_carrier: canadaCarrier, canada_local_awb: canadaAWB, external_tracking: `${canadaCarrier}: ${canadaAWB}`, stage_timestamps: result.updatedTimestamps } : s));
        if (selectedShipment?.id === shipmentId) {
          setSelectedShipment((prev: any) => ({ ...prev, status: 'out_for_delivery', canada_local_carrier: canadaCarrier, canada_local_awb: canadaAWB, external_tracking: `${canadaCarrier}: ${canadaAWB}`, stage_timestamps: result.updatedTimestamps }));
        }
      }
    } catch (err) {
      console.error('Failed to dispatch Canadian local courier', err);
    } finally {

      setUpdating(false);
    }
  };

  // ── Live Camera Viewfinder Handlers ──
  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    setCapturedPhotoUrl(null);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any  ) {
      console.error('Camera access error:', err);
      setCameraError('Camera access denied or unavailable. Please grant camera permission or upload a photo.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const openCameraModal = () => {
    setShowCameraModal(true);
    startCamera(facingMode);
  };

  const closeCameraModal = () => {
    stopCamera();
    setShowCameraModal(false);
    setCapturedPhotoUrl(null);
    setCameraError(null);
  };

  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedPhotoUrl(dataUrl);
      stopCamera();
    }
  };

  const confirmCapturedPhoto = () => {
    if (!capturedPhotoUrl) return;
    const newPhoto: QCPhoto = {
      url: capturedPhotoUrl,
      type: 'unboxed',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setUploadedPhotos(prev => [newPhoto, ...prev]);
    closeCameraModal();
  };

  const retakePhoto = () => {
    setCapturedPhotoUrl(null);
    startCamera(facingMode);
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

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
      case 'draft':
        return <span className="bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">Draft Booking</span>;
      case 'paid':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">Paid / Awaiting India Hub</span>;
      case 'arrived':
      case 'inwarded':
        return <span className="bg-purple-100 text-purple-800 border border-purple-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">Received @ India Hub</span>;
      case 'qc_verified':
        return <span className="bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">QC Matched</span>;
      case 'repacked':
        return <span className="bg-orange-100 text-orange-800 border border-orange-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">Layo SOP Repacked</span>;
      case 'bulk_consolidated':
        return <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">In Master Cargo Box</span>;
      case 'in_transit':
      case 'shipped':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">Airfreight to Canada</span>;
      case 'holding':
        return <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">Holding at Hub</span>;
      case 'hold_arrived':
        return <span className="bg-purple-100 text-purple-800 border border-purple-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">Package Arrived</span>;
      case 'hold_combined':
        return <span className="bg-green-100 text-green-800 border border-green-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">Combined &amp; Ready</span>;
      case 'received_canada':
        return <span className="bg-teal-100 text-teal-800 border border-teal-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">Received @ Canada Hub</span>;
      case 'out_for_delivery':
        return <span className="bg-cyan-100 text-cyan-800 border border-cyan-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">Local Courier Dispatch</span>;
      case 'delivered':
        return <span className="bg-green-100 text-green-800 border border-green-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">Delivered in Canada</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">{status || 'Draft'}</span>;
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F4F1EA] text-[#0E1F38] font-sans">
      {/* ── Top Ops Bar ── */}
      <header className="bg-[#1B250F] text-white px-4 py-3 sticky top-0 z-40 shadow-md flex items-center justify-between border-b border-[#34461F]">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-[#8BC34A]">LAYO</span>
            <span className="bg-[#8BC34A]/20 text-[#8BC34A] text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest border border-[#8BC34A]/40">
              Operations Hub
            </span>
          </Link>
        </div>

        <div className="flex items-center bg-[#17200D] p-1 rounded-xl border border-white/10 text-xs">
          <span className="px-3 py-1.5 rounded-lg font-black bg-[#8BC34A] text-[#1B250F] shadow-sm flex items-center gap-1.5">
            <span>🇮🇳</span>
            <span>India Hub (Delhi)</span>
          </span>
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
            onClick={handleSignOut}
            className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold px-3 py-1.5 rounded-xl border border-red-500/30 transition-all flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* ── Main Ops Layout ── */}
      <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-4 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-6">
        
        {/* Mobile View Switcher */}
        <div className="lg:hidden flex bg-white p-1 rounded-2xl border border-black/10 text-xs font-bold shadow-xs">
          <button
            onClick={() => setMobileOpsTab('queue')}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileOpsTab === 'queue' ? 'bg-[#1B250F] text-white shadow-sm' : 'text-[#0E1F38]/60 hover:text-[#0E1F38]'
            }`}
          >
            <span className="material-symbols-outlined text-base">format_list_bulleted</span>
            Package Queue ({filteredShipments.length})
          </button>
          <button
            onClick={() => setMobileOpsTab('workstation')}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mobileOpsTab === 'workstation' ? 'bg-[#1B250F] text-white shadow-sm' : 'text-[#0E1F38]/60 hover:text-[#0E1F38]'
            }`}
          >
            <span className="material-symbols-outlined text-base">biotech</span>
            Workstation {selectedShipment ? `(#${selectedShipment.id.slice(0, 6).toUpperCase()})` : ''}
          </button>
        </div>

        {/* ── Left Column: Live Queue & Search ── */}
        <div className={`lg:col-span-5 space-y-4 ${mobileOpsTab === 'queue' ? 'block' : 'hidden lg:block'}`}>
          
          {/* Quick Search Card */}
          <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-xs space-y-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#0E1F38]/40 text-lg">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by 4-digit Locker, Order ID or Master Box..."
                className="w-full bg-[#FAF8EE] border border-black/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#0E1F38] placeholder:text-[#0E1F38]/40 focus:border-[#8BC34A] focus:outline-none font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#0E1F38]/40 hover:text-[#0E1F38]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Stage filter pills */}
            <div className="flex gap-1 overflow-x-auto pb-1 text-[10px] font-black uppercase tracking-wider">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg border transition-all shrink-0 cursor-pointer ${
                  activeTab === 'all' ? 'bg-[#1B250F] text-white border-[#1B250F]' : 'bg-[#FAF8EE] text-[#0E1F38]/70 border-black/5'
                }`}
              >
                All ({filteredShipments.length})
              </button>
              <button
                onClick={() => setActiveTab('inward')}
                className={`px-3 py-1.5 rounded-lg border transition-all shrink-0 cursor-pointer ${
                  activeTab === 'inward' ? 'bg-[#1B250F] text-white border-[#1B250F]' : 'bg-[#FAF8EE] text-[#0E1F38]/70 border-black/5'
                }`}
              >
                1. Inward Scan
              </button>
              <button
                onClick={() => setActiveTab('qc')}
                className={`px-3 py-1.5 rounded-lg border transition-all shrink-0 cursor-pointer ${
                  activeTab === 'qc' ? 'bg-[#1B250F] text-white border-[#1B250F]' : 'bg-[#FAF8EE] text-[#0E1F38]/70 border-black/5'
                }`}
              >
                2. QC Match
              </button>
              <button
                onClick={() => setActiveTab('repack')}
                className={`px-3 py-1.5 rounded-lg border transition-all shrink-0 cursor-pointer ${
                  activeTab === 'repack' ? 'bg-[#1B250F] text-white border-[#1B250F]' : 'bg-[#FAF8EE] text-[#0E1F38]/70 border-black/5'
                }`}
              >
                3. SOP Repack
              </button>
              <button
                onClick={() => setActiveTab('master_bulk')}
                className={`px-3 py-1.5 rounded-lg border transition-all shrink-0 cursor-pointer ${
                  activeTab === 'master_bulk' ? 'bg-[#1B250F] text-white border-[#1B250F]' : 'bg-[#FAF8EE] text-[#0E1F38]/70 border-black/5'
                }`}
              >
                4. Master Cargo
              </button>
              <button
                onClick={() => setActiveTab('hold_combine')}
                className={`px-3 py-1.5 rounded-lg border transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                  activeTab === 'hold_combine' ? 'bg-amber-700 text-white border-amber-700' : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                📦 Hold &amp; Combine
                {holdGroups.length > 0 && (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                    activeTab === 'hold_combine' ? 'bg-white/20 text-white' : 'bg-amber-700 text-white'
                  }`}>{holdGroups.length}</span>
                )}
              </button>
            </div>
          </div>

          {/* Shipment Queue List OR Hold & Combine panel */}
          <div className="space-y-2.5 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
            {isFetching ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-black/5">
                <span className="material-symbols-outlined animate-spin text-2xl text-[#8BC34A]">progress_activity</span>
                <p className="text-xs text-[#0E1F38]/60 mt-2">Loading floor queue...</p>
              </div>
            ) : activeTab === 'hold_combine' ? (
              /* ── Hold & Combine Grouped View ── */
              holdGroups.length === 0 ? (
                <div className="p-8 text-center bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
                  <span className="text-3xl">📦</span>
                  <p className="text-xs font-bold text-amber-800">No Hold & Combine shipments</p>
                  <p className="text-[11px] text-amber-700">Customers who select Hold & Combine will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {holdGroups.map(group => (
                    <div key={group.groupKey} className="bg-white rounded-2xl border border-amber-200 overflow-hidden shadow-sm">
                      {/* Group Header */}
                      <div className="bg-amber-50 px-4 py-3 flex items-center justify-between border-b border-amber-200">
                        <div>
                          <p className="text-xs font-black text-amber-900">📦 Hold Group — {group.destinationCity}</p>
                          <p className="text-[10px] text-amber-700 mt-0.5">
                            {group.arrivedCount} of {group.expectedPackages} packages arrived
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Progress pill */}
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                            group.allArrived
                              ? 'bg-green-100 text-green-800 border border-green-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}>
                            {group.allArrived ? '✅ All Arrived' : `⏳ ${group.expectedPackages - group.arrivedCount} Pending`}
                          </span>
                          {group.allArrived && (
                            <button
                              onClick={() => handleCombineAndDispatch(group.shipments)}
                              disabled={updating}
                              className="bg-[#8BC34A] hover:bg-[#9ccc65] text-[#1B250F] text-[10px] font-black px-3 py-1.5 rounded-xl transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-sm">merge</span>
                              Combine &amp; Dispatch
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Individual packages */}
                      <div className="divide-y divide-black/5">
                        {group.shipments.map((s: any) => (
                          <div key={s.id} className="px-4 py-3 flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-black bg-[#FAF8EE] px-2 py-0.5 rounded border border-black/5">
                                  #{s.id.slice(0, 8).toUpperCase()}
                                </span>
                                {getStatusBadge(s.status)}
                              </div>
                              <p className="text-[11px] text-[#0E1F38]/60 mt-1">
                                {Array.isArray(s.items) ? s.items.reduce((acc: number, it: any) => acc + (it.quantity || 1), 0) : 0} items · {s.total_weight || 1.0} kg
                                {s.external_order_id && ` · Order: ${s.external_order_id}`}
                              </p>
                            </div>
                            {s.status !== 'hold_arrived' && s.status !== 'inwarded' && (
                              <button
                                onClick={() => handleMarkHoldArrived(s.id)}
                                disabled={updating}
                                className="text-[10px] font-black bg-purple-100 hover:bg-purple-200 text-purple-800 border border-purple-300 px-3 py-1.5 rounded-xl transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                Mark Arrived
                              </button>
                            )}
                            {(s.status === 'hold_arrived' || s.status === 'inwarded') && (
                              <span className="text-[10px] font-black text-green-700 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">done_all</span>
                                At Hub
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : filteredShipments.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-black/5 space-y-1">
                <span className="material-symbols-outlined text-3xl text-[#0E1F38]/30">inventory_2</span>
                <p className="text-xs font-bold text-[#0E1F38]">No shipments matching this filter</p>
                <p className="text-[11px] text-[#0E1F38]/50">Check search term or switch hub tab</p>
              </div>
            ) : (
              filteredShipments.map(s => {
                const isSelected = selectedShipment?.id === s.id;
                const itemsCount = Array.isArray(s.items) ? s.items.reduce((acc: number, it: any) => acc + (it.quantity || 1), 0) : 0;
                
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedShipment(s);
                      setGrossWeightInput(s.total_weight ? s.total_weight.toString() : '');
                      setUploadedPhotos(s.qc_photos || []);
                      if (s.master_box_id) setMasterBoxId(s.master_box_id);
                      if (s.canada_local_awb) setCanadaAWB(s.canada_local_awb);
                      setMobileOpsTab('workstation');
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                      isSelected
                        ? 'bg-white border-[#8BC34A] shadow-md ring-2 ring-[#8BC34A]/20'
                        : 'bg-white hover:bg-white/80 border-black/5 hover:border-black/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black bg-[#FAF8EE] px-2 py-0.5 rounded border border-black/5 text-[#0E1F38]">
                            #{s.id ? s.id.slice(0, 8).toUpperCase() : 'PARCEL'}
                          </span>
                          {s.master_box_id && (
                            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[9px] font-black font-mono">
                              📦 {s.master_box_id}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-[#0E1F38] mt-1">
                          {s.destination_city || 'Toronto, Canada'}
                        </p>
                      </div>
                      {getStatusBadge(s.status)}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#0E1F38]/70 border-t border-black/5 pt-2">
                      <span>{itemsCount} Declared Items</span>
                      <span className="font-mono font-bold text-[#0E1F38]">{s.total_weight || 1.0} kg</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right Column: Interactive Hub Workstation ── */}
        <div className={`lg:col-span-7 ${mobileOpsTab === 'workstation' ? 'block' : 'hidden lg:block'}`}>
          {selectedShipment ? (
            <div className="bg-white rounded-3xl p-4 sm:p-8 border border-black/5 shadow-sm space-y-6">
              
              {/* Mobile Back Button */}
              <button
                onClick={() => setMobileOpsTab('queue')}
                className="lg:hidden text-xs font-bold text-[#8BC34A] bg-[#1B250F] px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-pointer w-fit"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Back to Package Queue
              </button>
              
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-black/5 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-sm text-[#0E1F38]">
                      Locker #{selectedShipment.id.slice(0, 8).toUpperCase()}
                    </span>
                    {getStatusBadge(selectedShipment.status)}
                  </div>
                  <p className="text-xs text-[#0E1F38]/60 mt-0.5">
                    Destination: <span className="font-bold text-[#0E1F38]">{selectedShipment.destination_city || 'Toronto (GTA), ON'}</span>
                  </p>
                </div>

                <button
                  onClick={() => setShowDiscrepancyModal(true)}
                  className="text-xs bg-red-50 hover:bg-red-100 text-red-700 font-bold px-3 py-2 rounded-xl border border-red-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start"
                >
                  <span className="material-symbols-outlined text-sm">warning</span>
                  Flag Discrepancy
                </button>
              </div>

              {/* ──────────────── INDIA HUB WORKFLOW ──────────────── */}
              {activeHub === 'india' && (
                <div className="space-y-5">
                  
                  {/* Step 1: Inward Receipt */}
                  <div className="p-4 bg-[#FAF8EE] rounded-2xl border border-black/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-[#0E1F38] flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#1B250F] text-white flex items-center justify-center text-[10px]">1</span>
                        India Hub Inward Ingestion
                      </h3>
                      {selectedShipment.status !== 'draft' && selectedShipment.status !== 'paid' && (
                        <span className="text-[10px] text-[#2E7D32] font-black flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">check_circle</span>
                          Received @ Delhi Hub
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#0E1F38]/70">
                      Verify incoming domestic merchant parcel (Myntra/Amazon/Ajio) against customer locker ID.
                    </p>
                    {(selectedShipment.status === 'draft' || selectedShipment.status === 'paid') && (
                      <button
                        onClick={() => handleMarkInwarded(selectedShipment.id)}
                        disabled={updating}
                        className="w-full py-3 bg-[#8BC34A] text-[#1B250F] font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#9ccc65] transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">domain_verification</span>
                        Confirm Package Received at India Hub
                      </button>
                    )}
                  </div>

                  {/* Step 2: Customer Listing Match & QC Photo */}
                  <div className="p-4 bg-[#FAF8EE] rounded-2xl border border-black/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-[#0E1F38] flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#1B250F] text-white flex items-center justify-center text-[10px]">2</span>
                        Match Customer Item Listing (QC)
                      </h3>
                      {['qc_verified', 'repacked', 'bulk_consolidated', 'in_transit', 'received_canada', 'out_for_delivery', 'delivered'].includes(selectedShipment.status) && (
                        <span className="text-[10px] text-[#2E7D32] font-black flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">check_circle</span>
                          QC Matched
                        </span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-wider text-[#0E1F38]/60">Declared Customer Items Checklist:</p>
                      <div className="bg-white rounded-xl border border-black/5 divide-y divide-black/5 overflow-hidden text-xs">
                        {Array.isArray(selectedShipment.items) && selectedShipment.items.length > 0 ? (
                          selectedShipment.items.map((it: any, idx: number) => (
                            <div key={idx} className="p-3 flex items-center justify-between">
                              <div>
                                <span className="font-bold text-[#0E1F38]">{it.subcategory || it.name || 'Item'}</span>
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

                    {/* Photos */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-wider text-[#0E1F38]/60">
                          Unboxing Photos ({uploadedPhotos.length}):
                        </p>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={openCameraModal}
                            className="text-[10px] bg-[#8BC34A] hover:bg-[#9ccc65] text-[#1B250F] font-black px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <span className="material-symbols-outlined text-xs">photo_camera</span>
                            Open Camera
                          </button>
                          <label className="text-[10px] bg-white border border-black/10 hover:border-black/20 text-[#0E1F38] font-bold px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-2xs">
                            <span className="material-symbols-outlined text-xs">upload_file</span>
                            Upload
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={e => handleCapturePhoto(e, 'unboxed')}
                            />
                          </label>
                        </div>
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
                          Take 1–2 photos of unboxed goods to confirm item match
                        </div>
                      )}
                    </div>

                    {selectedShipment.status === 'inwarded' && (
                      <button
                        onClick={() => handleMarkQCVerified(selectedShipment.id)}
                        disabled={updating}
                        className="w-full py-3 bg-[#1B250F] text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">verified</span>
                        Confirm Items Matched &amp; Pass QC
                      </button>
                    )}
                  </div>

                  {/* Step 3: Layo SOP Repack */}
                  <div className="p-4 bg-[#FAF8EE] rounded-2xl border border-black/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-[#0E1F38] flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#1B250F] text-white flex items-center justify-center text-[10px]">3</span>
                        Layo SOP Repack &amp; Digital Scale Weighing
                      </h3>
                      {['repacked', 'bulk_consolidated', 'in_transit', 'received_canada', 'out_for_delivery', 'delivered'].includes(selectedShipment.status) && (
                        <span className="text-[10px] text-[#2E7D32] font-black flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">check_circle</span>
                          Repacked in Layo Green Box
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#0E1F38]/70">
                      Strip merchant cardboard &amp; plastic fillers. Fold items and seal inside standard Layo Green Box.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-[#0E1F38]/60">Scale Gross Weight (kg)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 2.45"
                          value={grossWeightInput}
                          onChange={e => setGrossWeightInput(e.target.value)}
                          className="w-full p-2.5 bg-white border border-black/10 rounded-xl text-xs font-mono font-bold text-[#0E1F38] focus:border-[#8BC34A] focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-[#0E1F38]/60">Standard Layo Box Size</label>
                        <select
                          onChange={e => {
                            const val = e.target.value;
                            if (val === 'S') setBoxDimensions({ length: 25, width: 20, height: 15 });
                            if (val === 'M') setBoxDimensions({ length: 35, width: 25, height: 20 });
                            if (val === 'L') setBoxDimensions({ length: 45, width: 35, height: 25 });
                          }}
                          className="w-full p-2.5 bg-white border border-black/10 rounded-xl text-xs font-bold text-[#0E1F38] focus:border-[#8BC34A] focus:outline-none cursor-pointer"
                        >
                          <option value="S">Layo Box S (25 x 20 x 15 cm)</option>
                          <option value="M" selected>Layo Box M (35 x 25 x 20 cm)</option>
                          <option value="L">Layo Box L (45 x 35 x 25 cm)</option>
                        </select>
                      </div>
                    </div>

                    {selectedShipment.status === 'qc_verified' && (
                      <button
                        onClick={() => handleCompleteRepack(selectedShipment.id)}
                        disabled={updating || !grossWeightInput}
                        className="w-full py-3 bg-[#8BC34A] text-[#1B250F] font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#9ccc65] transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                      >
                        <span className="material-symbols-outlined text-base">inventory_2</span>
                        Seal Layo Green Box &amp; Record Weight
                      </button>
                    )}
                  </div>

                  {/* Step 4: Master Cargo Consolidation (Bulk Boxing) */}
                  <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-indigo-700 text-white flex items-center justify-center text-[10px]">4</span>
                        Combine into Master Air Cargo Box (Bulk Freight)
                      </h3>
                      {selectedShipment.master_box_id && (
                        <span className="text-[10px] text-indigo-700 font-black font-mono">
                          📦 {selectedShipment.master_box_id}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-indigo-900/70">
                      Combine this customer box with other Canada-bound boxes into a Master Bulk Crate to minimize airfreight costs.
                    </p>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-indigo-950/60">Master Cargo Batch ID</label>
                      <input
                        type="text"
                        value={masterBoxId}
                        onChange={e => setMasterBoxId(e.target.value)}
                        placeholder="e.g. BATCH-CA-801"
                        className="w-full p-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-mono font-bold text-indigo-950 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    {selectedShipment.status === 'repacked' && (
                      <button
                        onClick={() => handleAssignMasterBox(selectedShipment.id)}
                        disabled={updating || !masterBoxId}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                      >
                        <span className="material-symbols-outlined text-base">all_inbox</span>
                        Pack Into Master Air Cargo Box
                      </button>
                    )}
                  </div>

                  {/* Step 5: Airfreight Dispatch — India → Canada Customer */}
                  <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px]">5</span>
                        Airfreight Dispatch — India to Customer (Canada)
                      </h3>
                      {['in_transit', 'shipped', 'delivered'].includes(selectedShipment.status) && (
                        <span className="text-[10px] text-emerald-700 font-black flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">check_circle</span>
                          Dispatched ✈
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-emerald-900/70">
                      Enter airfreight carrier and AWB tracking number. Package ships directly from Delhi hub to customer's Canadian address.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-emerald-950/60">Airfreight Carrier</label>
                        <select
                          value={canadaCarrier}
                          onChange={e => setCanadaCarrier(e.target.value)}
                          className="w-full p-2.5 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-emerald-950 focus:border-emerald-500 focus:outline-none cursor-pointer"
                        >
                          <option value="FedEx International Priority">FedEx International Priority</option>
                          <option value="DHL Express Worldwide">DHL Express Worldwide</option>
                          <option value="UPS Worldwide Expedited">UPS Worldwide Expedited</option>
                          <option value="Air India Cargo">Air India Cargo</option>
                          <option value="IndiGo Cargo">IndiGo Cargo</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-emerald-950/60">Airfreight AWB Tracking No.</label>
                        <input
                          type="text"
                          placeholder="e.g. FX-9918283746IN"
                          value={canadaAWB}
                          onChange={e => setCanadaAWB(e.target.value)}
                          className="w-full p-2.5 bg-white border border-emerald-200 rounded-xl text-xs font-mono font-bold text-emerald-950 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {selectedShipment.status === 'bulk_consolidated' && (
                      <button
                        onClick={() => handleAirfreightDispatch(selectedShipment.id)}
                        disabled={updating || !canadaAWB}
                        className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                      >
                        <span className="material-symbols-outlined text-base">flight_takeoff</span>
                        Dispatch via {canadaCarrier}
                      </button>
                    )}

                    {selectedShipment.canada_local_awb && (
                      <div className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-emerald-200 text-xs">
                        <span className="material-symbols-outlined text-sm text-emerald-600">flight</span>
                        <span className="font-bold text-emerald-900">{selectedShipment.canada_local_carrier}</span>
                        <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{selectedShipment.canada_local_awb}</span>
                      </div>
                    )}
                  </div>

                  {/* Step 6: Confirm Delivered to Customer */}
                  <div className="p-4 bg-[#FAF8EE] rounded-2xl border border-black/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-[#0E1F38] flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#1B250F] text-white flex items-center justify-center text-[10px]">6</span>
                        Confirm Delivered to Customer (Canada)
                      </h3>
                      {selectedShipment.status === 'delivered' && (
                        <span className="text-[10px] text-[#2E7D32] font-black flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">check_circle</span>
                          Delivered ✅
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#0E1F38]/70">
                      Mark as delivered once customer confirms receipt or carrier shows delivery scan.
                    </p>
                    {(selectedShipment.status === 'in_transit' || selectedShipment.status === 'shipped') && (
                      <button
                        onClick={() => handleMarkDelivered(selectedShipment.id)}
                        disabled={updating}
                        className="w-full py-3 bg-[#8BC34A] text-[#1B250F] font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#9ccc65] transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-base">done_all</span>
                        Confirm Delivered to Customer
                      </button>
                    )}
                  </div>

                </div>
              )}

            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-black/5 space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#FAF8EE] flex items-center justify-center mx-auto text-[#0E1F38]/40">
                <span className="material-symbols-outlined text-2xl">touch_app</span>
              </div>
              <h3 className="text-sm font-black text-[#0E1F38]">Select a Shipment from the Left Queue</h3>
              <p className="text-xs text-[#0E1F38]/60 max-w-sm mx-auto">
                {activeHub === 'india'
                  ? 'Perform inward scanning, customer listing QC matching, Layo SOP repacking, and Master Bulk boxing.'
                  : 'Receive master crates at the Toronto Hub and dispatch parcels via Canada Post / Purolator.'}
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Live Camera Viewfinder Modal */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#1B250F] text-white rounded-3xl p-5 max-w-lg w-full border border-white/10 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#8BC34A]">photo_camera</span>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Live QC Photo Viewfinder</h3>
              </div>
              <button
                onClick={closeCameraModal}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Video Viewfinder / Captured Photo Preview */}
            <div className="relative aspect-4/3 bg-black rounded-2xl overflow-hidden border border-white/10 flex items-center justify-center">
              {capturedPhotoUrl ? (
                <img src={capturedPhotoUrl} alt="Captured Snapshot" className="w-full h-full object-cover" />
              ) : cameraError ? (
                <div className="p-6 text-center space-y-3">
                  <span className="material-symbols-outlined text-4xl text-amber-400">videocam_off</span>
                  <p className="text-xs text-white/80 leading-relaxed">{cameraError}</p>
                  <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#8BC34A] text-[#1B250F] font-black text-xs rounded-xl cursor-pointer hover:bg-[#9ccc65]">
                    <span className="material-symbols-outlined text-base">upload_file</span>
                    Choose From Files
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        handleCapturePhoto(e, 'unboxed');
                        closeCameraModal();
                      }}
                    />
                  </label>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Viewfinder crosshairs */}
                  <div className="absolute inset-4 border border-white/20 rounded-xl pointer-events-none flex items-center justify-center">
                    <div className="w-6 h-6 border-t-2 border-l-2 border-[#8BC34A] absolute top-0 left-0" />
                    <div className="w-6 h-6 border-t-2 border-r-2 border-[#8BC34A] absolute top-0 right-0" />
                    <div className="w-6 h-6 border-b-2 border-l-2 border-[#8BC34A] absolute bottom-0 left-0" />
                    <div className="w-6 h-6 border-b-2 border-r-2 border-[#8BC34A] absolute bottom-0 right-0" />
                  </div>
                </>
              )}
            </div>

            {/* Viewfinder Controls */}
            {capturedPhotoUrl ? (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={retakePhoto}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">refresh</span>
                  Retake Photo
                </button>
                <button
                  onClick={confirmCapturedPhoto}
                  className="flex-1 py-3 bg-[#8BC34A] hover:bg-[#9ccc65] text-[#1B250F] font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  Use Photo
                </button>
              </div>
            ) : !cameraError && (
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={toggleFacingMode}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">flip_camera_ios</span>
                  Switch
                </button>

                {/* Big Shutter Button */}
                <button
                  onClick={captureSnapshot}
                  className="w-14 h-14 rounded-full bg-white p-1 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
                >
                  <div className="w-full h-full rounded-full border-2 border-black/20 bg-[#8BC34A] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#1B250F] text-2xl">photo_camera</span>
                  </div>
                </button>

                <label className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer">
                  <span className="material-symbols-outlined text-sm">upload_file</span>
                  Files
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      handleCapturePhoto(e, 'unboxed');
                      closeCameraModal();
                    }}
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      )}

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
                onClick={handleFlagDiscrepancy}
                disabled={updating || !discrepancyNote.trim()}
                className="flex-1 py-2.5 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 shadow-sm disabled:opacity-40"
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
