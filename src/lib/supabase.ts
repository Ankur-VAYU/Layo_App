import { createClient } from '@supabase/supabase-js';

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

export interface ShipmentPayload {
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
}

export async function insertShipment(payload: ShipmentPayload) {
  const validUserId = payload.user_id && payload.user_id !== '00000000-0000-0000-0000-000000000000'
    ? payload.user_id
    : null;

  const initialTimestamps = payload.stage_timestamps || {
    [payload.status || 'draft']: new Date().toISOString()
  };

  const payloadWithTimestamps = {
    ...payload,
    user_id: validUserId,
    stage_timestamps: initialTimestamps,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 1. Try standard insert with all columns
  const { data, error } = await supabase
    .from('shipments')
    .insert([payloadWithTimestamps])
    .select();

  if (error) {
    console.warn("Supabase insert with full columns failed. Retrying with JSON metadata fallback...", error);
    
    // 2. Fallback: Wrap newer metadata inside the items column BUT keep user_id in the row
    const { india_warehouse, external_order_id, external_tracking, items, stage_timestamps, master_box_id, canada_local_carrier, canada_local_awb, ...basicFields } = payloadWithTimestamps;
    const fallbackPayload = {
      ...basicFields,
      user_id: validUserId,
      items: {
        items: items,
        metadata: {
          user_id: validUserId,
          india_warehouse,
          external_order_id,
          external_tracking,
          stage_timestamps: initialTimestamps,
          master_box_id,
          canada_local_carrier,
          canada_local_awb
        }
      }
    };
    
    const fallbackRes = await supabase.from('shipments').insert([fallbackPayload]).select();
    if (fallbackRes.error && validUserId) {
      // If user_id foreign key constraint failed, try with user_id = null while keeping metadata
      const { user_id: _uid, ...noUserPayload } = fallbackPayload;
      return supabase.from('shipments').insert([noUserPayload]).select();
    }
    return fallbackRes;
  }

  return { data, error };
}

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
    master_box_id: raw.master_box_id || metadata.master_box_id || null,
    canada_local_carrier: raw.canada_local_carrier || metadata.canada_local_carrier || null,
    canada_local_awb: raw.canada_local_awb || metadata.canada_local_awb || null,
  };
}

export async function updateShipmentStage(id: string, newStatus: string, currentTimestamps?: Record<string, string>, extraFields?: any) {
  const updatedTimestamps = {
    ...(currentTimestamps || {}),
    [newStatus]: new Date().toISOString()
  };

  const updatePayload: any = {
    status: newStatus,
    stage_timestamps: updatedTimestamps,
    updated_at: new Date().toISOString(),
    ...(extraFields || {})
  };

  // Try direct update with stage_timestamps
  const { data, error } = await supabase
    .from('shipments')
    .update(updatePayload)
    .eq('id', id)
    .select();

  // If column error, fallback to updating status and metadata
  if (error && error.message && error.message.includes('column')) {
    const fallbackRes = await supabase
      .from('shipments')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...(extraFields || {})
      })
      .eq('id', id)
      .select();
    return { data: fallbackRes.data, error: fallbackRes.error, updatedTimestamps };
  }

  return { data, error, updatedTimestamps };
}

export async function fetchShipments(userId?: string) {
  let query = supabase
    .from('shipments')
    .select('*')
    .order('created_at', { ascending: false });

  if (userId) {
    // Look up by top-level user_id or nested JSON metadata user_id
    query = query.or(`user_id.eq.${userId},items->metadata->>user_id.eq.${userId}`);
  }

  const { data, error } = await query;
  if (error) {
    // If complex JSON query failed, fallback to standard user_id check
    if (userId) {
      const fallbackQuery = await supabase
        .from('shipments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (fallbackQuery.data) {
        return { data: fallbackQuery.data.map(parseShipment), error: null };
      }
    }
    return { data: null, error };
  }
  const formatted = (data || []).map(parseShipment);
  return { data: formatted, error: null };
}
