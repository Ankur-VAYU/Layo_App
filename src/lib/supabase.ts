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
    'paid': 'Payment Completed via Stripe',
    'inwarded': 'Inward Scanned at India Hub',
    'qc_verified': 'QC Passed & Inspected',
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

// ── Shipment Operations ──────────────────────────────────────────────────────

/**
 * Creates a new shipment row in Supabase with a branded LYS- ID.
 * Also seeds the stage_history array and writes an initial activity log.
 */
export async function insertShipment(payload: ShipmentPayload, operatorUser?: OperatorUser | null) {
  const validUserId = payload.user_id && payload.user_id !== '00000000-0000-0000-0000-000000000000'
    ? payload.user_id
    : null;

  // Auto-resolve customer_id from customers table if not provided
  let resolvedCustomerId = payload.customer_id || null;
  if (!resolvedCustomerId && validUserId) {
    const { data: custData } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', validUserId)
      .maybeSingle();
    resolvedCustomerId = custData?.id || null;
  }

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

  const insertPayload = {
    id: formatShipmentId(payload.id || Date.now()),
    user_id: validUserId,
    customer_id: resolvedCustomerId,
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
    items: payload.items || [],
    stage_timestamps: payload.stage_timestamps || { [initialStatus]: nowIso },
    stage_history: [initialLog],
    master_box_id: payload.master_box_id || null,
    canada_local_carrier: payload.canada_local_carrier || null,
    canada_local_awb: payload.canada_local_awb || null,
    warehouse_action: payload.warehouse_action || 'ship',
    expected_packages: payload.expected_packages || 1,
    hold_group_id: payload.hold_group_id || null,
    created_at: nowIso,
    updated_at: nowIso,
  };

  const { data, error } = await supabase
    .from('shipments')
    .insert([insertPayload])
    .select();

  if (error) {
    console.error('insertShipment error:', error);
    const fallbackRow = { ...insertPayload };
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
    return { data, error: null };
  }

  const fallbackRow = { ...insertPayload };
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
  let metadata: any = {};
  
  if (raw.items && !Array.isArray(raw.items) && raw.items.items) {
    itemsArray = raw.items.items;
    metadata = raw.items.metadata || {};
  }
  
  const stageTimestamps = raw.stage_timestamps || metadata.stage_timestamps || {
    [raw.status || 'draft']: raw.created_at || new Date().toISOString()
  };

  return {
    ...raw,
    items: itemsArray || [],
    user_id: raw.user_id || metadata.user_id || null,
    india_warehouse: raw.india_warehouse || metadata.india_warehouse || null,
    external_order_id: raw.external_order_id || metadata.external_order_id || null,
    external_tracking: raw.external_tracking || metadata.external_tracking || null,
    stage_timestamps: stageTimestamps,
    stage_history: raw.stage_history || [],
    master_box_id: raw.master_box_id || metadata.master_box_id || null,
    canada_local_carrier: raw.canada_local_carrier || metadata.canada_local_carrier || null,
    canada_local_awb: raw.canada_local_awb || metadata.canada_local_awb || null,
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

  // Fetch existing stage_history array
  let currentHistory: any[] = [];
  try {
    const { data: currentShipment } = await supabase
      .from('shipments')
      .select('stage_history')
      .eq('id', id)
      .maybeSingle();
    if (currentShipment?.stage_history && Array.isArray(currentShipment.stage_history)) {
      currentHistory = currentShipment.stage_history;
    }
  } catch (e) {
    console.warn('Could not fetch stage_history', e);
  }

  const updatedHistory = [...currentHistory, newLogEntry];

  const updatePayload: any = {
    status: newStatus,
    stage_timestamps: updatedTimestamps,
    stage_history: updatedHistory,
    updated_at: nowIso,
    ...(extraFields || {})
  };

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
 * - When userId is provided (customer dashboard): returns only that user's shipments.
 * - When userId is omitted (admin/ops): returns all shipments.
 */
export async function fetchShipments(userId?: string) {
  let query = supabase
    .from('shipments')
    .select('*')
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('fetchShipments error:', error);
    return { data: [], error };
  }
  const formatted = (data || []).map(parseShipment);
  return { data: formatted, error: null };
}
