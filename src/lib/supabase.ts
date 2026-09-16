/* eslint-disable @typescript-eslint/no-explicit-any */
// ── Dependencies ─────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';
import { formatShipmentId } from '@/lib/idGenerator';

// ── Client Setup ──────────────────────────────────────────────────────────────

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const isUrlValid = rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'));
const supabaseUrl = isUrlValid ? rawUrl : 'https://hlqeddasjkxweiqadege.supabase.co';

const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscWVkZGFzamt4d2VpcWFkZWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NTcyMTEsImV4cCI6MjA5MzUzMzIxMX0.EJJ_kELoWM2wsQ4GiDkOXSS0Lc5yFQ3Zw-RSIAWMhMA';

if (!isUrlValid) {
  console.warn("⚠️ Valid NEXT_PUBLIC_SUPABASE_URL was not found in environment variables. Falling back to default URL for build/prerendering.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export async function getCurrentUser() {
  if (typeof window !== 'undefined') {
    const mockRaw = localStorage.getItem('layo_mock_user');
    if (mockRaw) {
      try {
        return JSON.parse(mockRaw);
      } catch (e) {
        console.warn('Failed to parse mock user', e);
      }
    }
  }
  try {
    const { data } = await supabase.auth.getUser();
    if (data?.user) return data.user;
  } catch (e) {
    console.warn('supabase.auth.getUser error:', e);
  }
  return null;
}

export async function clearUserSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('layo_mock_user');
    localStorage.removeItem('layo_ops_user');
    localStorage.removeItem('layo_admin_user');
    localStorage.removeItem('layo_profile');
    localStorage.removeItem('layo_saved_addresses');
    localStorage.removeItem('layo_local_shipments');
    localStorage.removeItem('layo_pending_shipment');
    localStorage.removeItem('layo_pending_shipment_draft');
    localStorage.removeItem('layo_dashboard_flow_state');

    // Wipe transient user-scoped shipment and flow state, while preserving saved address book
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (
        k.startsWith('layo_customer_shipments_') ||
        k.startsWith('layo_local_shipments_') ||
        k.startsWith('layo_dashboard_flow_state_')
      )) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();
  }
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn('supabase.auth.signOut error:', e);
  }
}

// ── Types & Interfaces ───────────────────────────────────────────────────────

export interface ShipmentPayload {
  id?: string;
  user_id?: string;
  mode?: string;
  destination_city?: string;
  destination_address?: string;
  india_warehouse?: string | null;
  external_order_id?: string | null;
  external_tracking?: string | null;
  total_weight: number;
  total_cost: number;
  items: any[];
  status?: string;
  payment_method?: string;
  stage_timestamps?: Record<string, string>;
  master_box_id?: string | null;
  canada_local_carrier?: string | null;
  canada_local_awb?: string | null;
  warehouse_action?: 'ship' | 'hold' | null;
  expected_packages?: number | null;
  hold_group_id?: string | null;
  customer_id?: string | null;
  advance_pct?: number;
  advance_amount_cad?: number;
  advance_paid_inr?: number;
  estimated_weight?: number;
  estimated_cost_cad?: number;
  actual_weight?: number | null;
  final_cost_cad?: number | null;
  remaining_balance_cad?: number;
  payment_status?: string;
}

export interface OperatorUser {
  id?: string | null;
  email?: string | null;
  role?: string | null;
}

// ── Stage Label Map ──────────────────────────────────────────────────────────

/** Maps internal status keys to human-readable stage labels shown in the UI */
export function getStageLabel(stage: string): string {
  const map: Record<string, string> = {
    'draft': 'Draft Estimate Created',
    'Draft Estimate': 'Draft Estimate Created',
    'advance_paid': '20% Advance Paid • Awaiting Warehouse Arrival',
    'awaiting_balance': 'Actual Weight Verified • Balance Payment Due',
    'paid': 'Payment Completed',
    'fully_paid': 'Payment Completed',
    'inwarded': 'Inward Scanned at India Hub',
    'qc_verified': 'QC Passed & Weight Verified',
    'qc_discrepancy': 'QC Flagged Discrepancy',
    'repacked': 'Repacked in Layo Green Box',
    'bulk_consolidated': 'Assigned to Master Air Cargo',
    'hold_arrived': 'Package Arrived (Hold & Combine)',
    'in_transit': 'Airfreight Dispatched (India → Canada)',
    'shipped': 'Airfreight Dispatched',
    'received_canada': 'Received at Canada Hub',
    'out_for_delivery': 'Out for Canadian Doorstep Delivery',
    'delivered': 'Delivered to Customer Doorstep'
  };
  return map[stage] || stage;
}

export function isValidUuid(str: any): boolean {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export function stringToUuid(str: any): string | null {
  if (!str) return null;
  const s = String(str).trim();
  if (isValidUuid(s)) return s;
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  const hex = (Math.abs(hash).toString(16) + '00000000000000000000000000000000').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

// ── Shipment Operations ──────────────────────────────────────────────────────

/**
 * Creates a new shipment row in Supabase with a branded LYS- ID.
 * Also seeds the stage_history array and writes an initial activity log.
 */
export async function insertShipment(payload: ShipmentPayload, operatorUser?: OperatorUser | null) {
  const validUserId = payload.user_id && payload.user_id !== '00000000-0000-0000-0000-000000000000'
    ? payload.user_id
    : null;

  const initialStatus = payload.status || 'Draft Estimate';
  const nowIso = new Date().toISOString();

  const initialLog = {
    stage: initialStatus,
    status_label: getStageLabel(initialStatus),
    timestamp: nowIso,
    done_by_user_id: operatorUser?.id || validUserId || null,
    done_by_email: operatorUser?.email || null,
    done_by_role: operatorUser?.role || (validUserId ? 'customer' : 'system'),
  };

  const rawHoldId = payload.hold_group_id ? String(payload.hold_group_id).trim() : null;
  const uuidHoldId = stringToUuid(rawHoldId);

  const itemsObject = {
    items: Array.isArray(payload.items) ? payload.items : ((payload.items as any)?.items || []),
    advance_pct: payload.advance_pct ?? 20,
    advance_amount_cad: payload.advance_amount_cad ?? 0,
    advance_paid_inr: payload.advance_paid_inr ?? 0,
    estimated_weight: payload.estimated_weight ?? payload.total_weight ?? 1.0,
    estimated_cost_cad: payload.estimated_cost_cad ?? payload.total_cost ?? 0,
    actual_weight: payload.actual_weight ?? null,
    final_cost_cad: payload.final_cost_cad ?? null,
    remaining_balance_cad: payload.remaining_balance_cad ?? 0,
    payment_status: payload.payment_status || 'pending',
    raw_hold_group_id: rawHoldId,
  };

  const stageTimestamps = payload.stage_timestamps || { [initialStatus]: nowIso };
  if (rawHoldId) {
    (stageTimestamps as any).raw_hold_group_id = rawHoldId;
  }

  const insertPayload = {
    id: formatShipmentId(payload.id || Date.now()),
    user_id: isValidUuid(validUserId) ? validUserId : null,
    mode: payload.mode || 'online',
    status: initialStatus,
    destination_city: payload.destination_city || null,
    destination_address: payload.destination_address || null,
    india_warehouse: payload.india_warehouse || null,
    external_order_id: payload.external_order_id || null,
    external_tracking: payload.external_tracking || null,
    total_weight: payload.total_weight || 0,
    total_cost: payload.total_cost || 0,
    payment_method: payload.payment_method || 'draft',
    items: itemsObject,
    stage_timestamps: stageTimestamps,
    stage_history: [initialLog],
    master_box_id: payload.master_box_id || null,
    canada_local_carrier: payload.canada_local_carrier || null,
    canada_local_awb: payload.canada_local_awb || null,
    warehouse_action: payload.warehouse_action || 'ship',
    expected_packages: payload.expected_packages || 1,
    hold_group_id: uuidHoldId,
    created_at: nowIso,
    updated_at: nowIso,
  };

  const { data, error } = await supabase
    .from('shipments')
    .insert([insertPayload])
    .select();

  if (initialStatus === 'Draft Estimate') {
    try {
      await saveDraftEstimate({
        ...payload,
        id: insertPayload.id,
        user_id: validUserId,
        customer_email: operatorUser?.email || null,
        external_order_id: payload.external_order_id || insertPayload.id,
        created_at: nowIso,
      });
    } catch (draftErr) {
      console.warn('Dual-write to draft_estimates failed:', draftErr);
    }
  }

  if (error) {
    console.error('insertShipment error:', error);
    const fallbackRow = parseShipment({ ...insertPayload });
    return { data: [fallbackRow], error: null };
  } else if (data && data[0]) {
    // Log to shipment_activity_logs table
    try {
      await supabase.from('shipment_activity_logs').insert({
        shipment_id: data[0].id,
        stage: initialStatus,
        status_label: getStageLabel(initialStatus),
        done_by_user_id: operatorUser?.id || validUserId || null,
        done_by_email: operatorUser?.email || null,
        done_by_role: operatorUser?.role || (validUserId ? 'customer' : 'system'),
        notes: 'Shipment created',
        metadata: { items_count: payload.items?.length || 0, weight: payload.total_weight },
        created_at: nowIso,
      });
    } catch (logErr) {
      console.error('insertShipment activity log error:', logErr);
    }
    return { data: [parseShipment(data[0])], error: null };
  }

  const fallbackRow = parseShipment({ ...insertPayload });
  return { data: [fallbackRow], error: null };
}

// ── Parsers ───────────────────────────────────────────────────────────────────

/**
 * Normalises a raw Supabase shipment row, handling both old nested-JSON
 * format and the current flat column schema.
 */
export function parseShipment(raw: any) {
  if (!raw) return null;
  let itemsArray = raw.items;
  let itemMeta: any = {};
  
  if (raw.items && !Array.isArray(raw.items)) {
    itemsArray = raw.items.items || [];
    itemMeta = raw.items;
  }
  
  const stageTimestamps = raw.stage_timestamps || itemMeta.stage_timestamps || {
    [raw.status || 'draft']: raw.created_at || new Date().toISOString()
  };

  let rawHoldId = stageTimestamps.raw_hold_group_id || itemMeta.raw_hold_group_id || null;
  if (!rawHoldId && raw.hold_group_id) {
    const holdStr = String(raw.hold_group_id).trim();
    if (holdStr.toUpperCase().includes('HOLD-')) {
      rawHoldId = holdStr;
    } else if (isValidUuid(holdStr)) {
      rawHoldId = `HOLD-${formatShipmentId(holdStr)}`;
    } else {
      rawHoldId = holdStr;
    }
  } else if (!rawHoldId && (raw.warehouse_action === 'hold' || String(raw.status || '').toLowerCase() === 'holding')) {
    const refId = raw.id ? formatShipmentId(raw.id) : (raw.external_order_id ? String(raw.external_order_id).trim() : null);
    if (refId) {
      const cleanRef = String(refId).trim().replace(/^#/, '').replace(/^HOLD-/i, '').toUpperCase();
      rawHoldId = `HOLD-${cleanRef}`;
    }
  }

  return {
    ...raw,
    items: Array.isArray(itemsArray) ? itemsArray : [],
    user_id: raw.user_id || itemMeta.user_id || null,
    india_warehouse: raw.india_warehouse || itemMeta.india_warehouse || null,
    external_order_id: raw.external_order_id || itemMeta.external_order_id || null,
    external_tracking: raw.external_tracking || itemMeta.external_tracking || null,
    stage_timestamps: stageTimestamps,
    stage_history: raw.stage_history || [],
    master_box_id: raw.master_box_id || itemMeta.master_box_id || null,
    canada_local_carrier: raw.canada_local_carrier || itemMeta.canada_local_carrier || null,
    canada_local_awb: raw.canada_local_awb || itemMeta.canada_local_awb || null,
    warehouse_action: raw.warehouse_action || itemMeta.warehouse_action || 'ship',
    expected_packages: Number(raw.expected_packages ?? itemMeta.expected_packages ?? 1),
    hold_group_id: rawHoldId || raw.hold_group_id || null,
    advance_pct: raw.advance_pct ?? itemMeta.advance_pct ?? 20,
    advance_amount_cad: raw.advance_amount_cad ?? itemMeta.advance_amount_cad ?? 0,
    advance_paid_inr: raw.advance_paid_inr ?? itemMeta.advance_paid_inr ?? 0,
    estimated_weight: raw.estimated_weight ?? itemMeta.estimated_weight ?? raw.total_weight ?? 1.0,
    estimated_cost_cad: raw.estimated_cost_cad ?? itemMeta.estimated_cost_cad ?? raw.total_cost ?? 0,
    actual_weight: raw.actual_weight ?? itemMeta.actual_weight ?? null,
    final_cost_cad: raw.final_cost_cad ?? itemMeta.final_cost_cad ?? null,
    remaining_balance_cad: raw.remaining_balance_cad ?? itemMeta.remaining_balance_cad ?? 0,
    payment_status: raw.payment_status || itemMeta.payment_status || 'pending',
    box_dimensions: raw.box_dimensions ?? itemMeta.box_dimensions ?? null,
  };
}

// ── Stage Updates ────────────────────────────────────────────────────────────

/**
 * Updates a shipment's status, appends to stage_history, and writes an
 * audit entry to shipment_activity_logs. Falls back to upsert if the
 * targeted row returns 0 updated rows.
 */
export async function updateShipmentStage(
  id: string,
  newStatus: string,
  currentTimestamps?: Record<string, string>,
  extraFields?: any,
  operatorUser?: OperatorUser | null,
  notes?: string | null
) {
  const nowIso = new Date().toISOString();
  const updatedTimestamps = {
    ...(currentTimestamps || {}),
    [newStatus]: nowIso
  };

  const newLogEntry = {
    stage: newStatus,
    status_label: getStageLabel(newStatus),
    timestamp: nowIso,
    done_by_user_id: operatorUser?.id || null,
    done_by_email: operatorUser?.email || null,
    done_by_role: operatorUser?.role || 'ops',
    notes: notes || null,
    extra: extraFields || null,
  };

  // Fetch existing shipment row to merge stage_history and items
  let currentHistory: any[] = [];
  let existingItemsObj: any = { items: [] };
  try {
    const { data: currentShipment } = await supabase
      .from('shipments')
      .select('stage_history, items, user_id, hold_group_id')
      .eq('id', id)
      .maybeSingle();
    if (currentShipment?.stage_history && Array.isArray(currentShipment.stage_history)) {
      currentHistory = currentShipment.stage_history;
    }
    if (currentShipment?.items) {
      if (Array.isArray(currentShipment.items)) {
        existingItemsObj = { items: currentShipment.items };
      } else {
        existingItemsObj = { ...currentShipment.items };
      }
    }
  } catch (e) {
    console.warn('Could not fetch existing shipment before updateStage', e);
  }

  const updatedHistory = [...currentHistory, newLogEntry];

  // List of columns that strictly exist in Postgres shipments table schema
  const ALLOWED_COLUMNS = new Set([
    'id', 'created_at', 'mode', 'destination_city', 'destination_address',
    'total_weight', 'total_cost', 'items', 'status', 'payment_method',
    'user_id', 'india_warehouse', 'external_order_id', 'external_tracking',
    'stage_timestamps', 'master_box_id', 'canada_local_carrier', 'canada_local_awb',
    'updated_at', 'warehouse_action', 'expected_packages', 'hold_group_id', 'stage_history'
  ]);

  const rawHoldId = extraFields?.hold_group_id ? String(extraFields.hold_group_id).trim() : (existingItemsObj.raw_hold_group_id || null);

  const updatedItemsObj = {
    ...existingItemsObj,
    ...(extraFields?.items ? (Array.isArray(extraFields.items) ? { items: extraFields.items } : extraFields.items) : {}),
    ...(extraFields?.actual_weight !== undefined ? { actual_weight: extraFields.actual_weight } : {}),
    ...(extraFields?.final_cost_cad !== undefined ? { final_cost_cad: extraFields.final_cost_cad } : {}),
    ...(extraFields?.remaining_balance_cad !== undefined ? { remaining_balance_cad: extraFields.remaining_balance_cad } : {}),
    ...(extraFields?.advance_amount_cad !== undefined ? { advance_amount_cad: extraFields.advance_amount_cad } : {}),
    ...(extraFields?.advance_paid_inr !== undefined ? { advance_paid_inr: extraFields.advance_paid_inr } : {}),
    ...(extraFields?.advance_pct !== undefined ? { advance_pct: extraFields.advance_pct } : {}),
    ...(extraFields?.estimated_weight !== undefined ? { estimated_weight: extraFields.estimated_weight } : {}),
    ...(extraFields?.estimated_cost_cad !== undefined ? { estimated_cost_cad: extraFields.estimated_cost_cad } : {}),
    ...(extraFields?.payment_status !== undefined ? { payment_status: extraFields.payment_status } : {}),
    ...(extraFields?.box_dimensions !== undefined ? { box_dimensions: extraFields.box_dimensions } : {}),
    ...(rawHoldId ? { raw_hold_group_id: rawHoldId } : {}),
  };

  if (rawHoldId) {
    (updatedTimestamps as any).raw_hold_group_id = rawHoldId;
  }

  const updatePayload: any = {
    status: newStatus,
    stage_timestamps: updatedTimestamps,
    stage_history: updatedHistory,
    items: updatedItemsObj,
    updated_at: nowIso,
  };

  // Copy allowed extra top-level fields
  if (extraFields) {
    for (const [key, val] of Object.entries(extraFields)) {
      if (ALLOWED_COLUMNS.has(key)) {
        if (key === 'hold_group_id') {
          updatePayload[key] = stringToUuid(val);
        } else if (key === 'user_id') {
          updatePayload[key] = isValidUuid(val) ? val : null;
        } else if (key !== 'items' && key !== 'stage_timestamps' && key !== 'stage_history') {
          updatePayload[key] = val;
        }
      }
    }
  }

  // Try direct update
  let { data, error } = await supabase
    .from('shipments')
    .update(updatePayload)
    .eq('id', id)
    .select();

  if ((!data || data.length === 0) && !error) {
    // If update modified 0 rows, perform upsert to guarantee creation
    const upsertRes = await supabase
      .from('shipments')
      .upsert([{ id, ...updatePayload }])
      .select();
    data = upsertRes.data;
    error = upsertRes.error;
  }

  if (error) {
    console.error('updateShipmentStage error:', error);
  }

  // Insert to shipment_activity_logs table for audit & analysis
  try {
    await supabase.from('shipment_activity_logs').insert({
      shipment_id: id,
      stage: newStatus,
      status_label: getStageLabel(newStatus),
      done_by_user_id: operatorUser?.id || null,
      done_by_email: operatorUser?.email || null,
      done_by_role: operatorUser?.role || 'ops',
      notes: notes || null,
      metadata: extraFields || {},
      created_at: nowIso,
    });
  } catch (logErr) {
    console.error('Failed to log to shipment_activity_logs table:', logErr);
  }

  return { data, error, updatedTimestamps, stageHistory: updatedHistory };
}


// ── Data Fetching ────────────────────────────────────────────────────────────

/**
 * Fetches shipments ordered by creation date descending.
 * - When userId is provided: returns only that user's shipments.
 * - When requireUserId is true: strictly returns [] if no valid user UUID is passed.
 * - When userId is omitted and requireUserId is false: returns all shipments (admin/ops only).
 */
export async function fetchShipments(userId?: string, options?: { requireUserId?: boolean }) {
  if (options?.requireUserId && (!userId || !isValidUuid(userId))) {
    return { data: [], error: null };
  }

  let query = supabase
    .from('shipments')
    .select('*')
    .order('created_at', { ascending: false });

  if (userId) {
    if (isValidUuid(userId)) {
      query = query.eq('user_id', userId);
    } else if (options?.requireUserId) {
      return { data: [], error: null };
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('fetchShipments error:', error);
    return { data: [], error };
  }
  const formatted = (data || []).map(parseShipment);
  return { data: formatted, error: null };
}

// ── Draft Estimates ─────────────────────────────────────────────────────────

export async function saveDraftEstimate(payload: any) {
  const nowIso = new Date().toISOString();
  const validDraftId = isValidUuid(payload.id) ? payload.id : undefined;
  const validUserId = isValidUuid(payload.user_id) ? payload.user_id : null;
  const externalRef = payload.external_order_id || (payload.id && !isValidUuid(payload.id) ? payload.id : null);

  const draftRow: any = {
    user_id: validUserId,
    customer_email: payload.customer_email || null,
    mode: payload.mode || 'Online Retailer',
    destination_city: payload.destination_city || 'Toronto (GTA)',
    destination_address: payload.destination_address || '',
    india_warehouse: payload.india_warehouse || null,
    external_order_id: externalRef,
    total_weight: payload.total_weight || 1.0,
    total_cost: payload.total_cost || 0,
    estimated_cost_cad: payload.estimated_cost_cad || 0,
    advance_pct: payload.advance_pct ?? 20,
    advance_amount_cad: payload.advance_amount_cad ?? 0,
    remaining_balance_cad: payload.remaining_balance_cad ?? 0,
    items: payload.items || [],
    warehouse_action: payload.warehouse_action || 'ship',
    expected_packages: payload.expected_packages || 1,
    status: 'Draft Estimate',
    created_at: payload.created_at || nowIso,
    updated_at: nowIso,
  };

  if (validDraftId) {
    draftRow.id = validDraftId;
  } else if (externalRef) {
    try {
      const { data: existingRows } = await supabase
        .from('draft_estimates')
        .select('id')
        .eq('external_order_id', externalRef)
        .order('created_at', { ascending: false })
        .limit(1);
      if (existingRows && existingRows[0]?.id) {
        draftRow.id = existingRows[0].id;
      }
    } catch (e) {}
  }

  try {
    const { data, error } = await supabase
      .from('draft_estimates')
      .upsert([draftRow])
      .select();
    if (error) {
      console.warn('draft_estimates upsert notice:', error.message);
    }
    return { data, error };
  } catch (err: any) {
    console.warn('draft_estimates error:', err.message);
    return { data: null, error: err };
  }
}

export async function fetchDraftEstimates(userId?: string, options?: { requireUserId?: boolean }) {
  if (options?.requireUserId && (!userId || !isValidUuid(userId))) {
    return { data: [], error: null };
  }
  try {
    let query = supabase
      .from('draft_estimates')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId && isValidUuid(userId)) {
      query = query.eq('user_id', userId);
    } else if (options?.requireUserId) {
      return { data: [], error: null };
    }

    const { data, error } = await query;
    if (error) {
      return { data: [], error };
    }
    return { data: data || [], error: null };
  } catch (err) {
    return { data: [], error: err };
  }
}

export async function deleteDraftEstimate(idOrRef: string) {
  try {
    if (!idOrRef) return { error: null };
    if (isValidUuid(idOrRef)) {
      const { error } = await supabase
        .from('draft_estimates')
        .delete()
        .eq('id', idOrRef);
      return { error };
    } else {
      const { error } = await supabase
        .from('draft_estimates')
        .delete()
        .eq('external_order_id', idOrRef);
      return { error };
    }
  } catch (err) {
    return { error: err };
  }
}

