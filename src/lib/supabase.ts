import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hlqeddasjkxweiqadege.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhscWVkZGFzamt4d2VpcWFkZWdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NTcyMTEsImV4cCI6MjA5MzUzMzIxMX0.EJJ_kELoWM2wsQ4GiDkOXSS0Lc5yFQ3Zw-RSIAWMhMA';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Supabase credentials missing! Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
}

export async function insertShipment(payload: ShipmentPayload) {
  // 1. Try to insert with all columns
  const { data, error } = await supabase
    .from('shipments')
    .insert([payload])
    .select();

  if (error && error.message && error.message.includes('column')) {
    console.warn("Supabase insert with full columns failed. Retrying with JSON metadata fallback...", error);
    
    // 2. Fallback: Wrap metadata inside the items column
    const { user_id, india_warehouse, external_order_id, external_tracking, items, ...basicFields } = payload;
    const fallbackPayload = {
      ...basicFields,
      items: {
        items: items,
        metadata: {
          user_id,
          india_warehouse,
          external_order_id,
          external_tracking
        }
      }
    };
    return supabase.from('shipments').insert([fallbackPayload]).select();
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
  
  return {
    ...raw,
    items: itemsArray || [],
    user_id: raw.user_id || metadata.user_id || null,
    india_warehouse: raw.india_warehouse || metadata.india_warehouse || null,
    external_order_id: raw.external_order_id || metadata.external_order_id || null,
    external_tracking: raw.external_tracking || metadata.external_tracking || null,
  };
}

export async function fetchShipments() {
  const { data, error } = await supabase
    .from('shipments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return { data: null, error };
  const formatted = (data || []).map(parseShipment);
  return { data: formatted, error: null };
}
