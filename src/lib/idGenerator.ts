/**
 * Layo Custom Branded ID Generators & Formatters
 *
 * Format Requirements:
 * 1. Order ID        → LY-10000001
 * 2. Customer ID     → LYC-100000001
 * 3. Warehouse ID    → LYW-10001
 * 4. User ID         → LYU-100001
 * 5. Shipment ID     → LYS-10000000001
 * 6. Transaction ID  → LYT100000001
 *
 * Each formatter accepts an optional numeric or string seed.
 * If the value is already in the correct branded format, it is returned as-is.
 */

// ── Internal Helpers ──────────────────────────────────────────────────────────

/** Deterministic string → positive integer hash (djb2 variant) */
function hashToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// ── ID Formatters ─────────────────────────────────────────────────────────────

/** 1. Order ID — format: LY-10000001 */
export function formatOrderId(seed?: number | string): string {
  if (typeof seed === 'string' && seed.startsWith('LY-')) return seed;
  const base = 10000001;
  const num = typeof seed === 'number'
    ? seed
    : typeof seed === 'string'
    ? (hashToNumber(seed) % 8999999) + 1
    : 1;
  return `LY-${base + num - 1}`;
}

/** 2. Customer ID — format: LYC-100000001 */
export function formatCustomerId(seed?: number | string): string {
  if (typeof seed === 'string' && seed.startsWith('LYC-')) return seed;
  const base = 100000001;
  const num = typeof seed === 'number'
    ? seed
    : typeof seed === 'string'
    ? (hashToNumber(seed) % 89999999) + 1
    : 1;
  return `LYC-${base + num - 1}`;
}

/** 3. Warehouse ID — format: LYW-10001 */
export function formatWarehouseId(seed?: number | string): string {
  if (typeof seed === 'string' && seed.startsWith('LYW-')) return seed;
  const base = 10001;
  const num = typeof seed === 'number'
    ? seed
    : typeof seed === 'string'
    ? (hashToNumber(seed) % 8999) + 1
    : 1;
  return `LYW-${base + num - 1}`;
}

/** 4. User ID — format: LYU-100001 */
export function formatUserId(seed?: number | string): string {
  if (typeof seed === 'string' && seed.startsWith('LYU-')) return seed;
  const base = 100001;
  const num = typeof seed === 'number'
    ? seed
    : typeof seed === 'string'
    ? (hashToNumber(seed) % 899999) + 1
    : 1;
  return `LYU-${base + num - 1}`;
}

/** 5. Shipment ID — format: LYS-10000000001 */
export function formatShipmentId(seed?: number | string): string {
  if (typeof seed === 'string' && seed.startsWith('LYS-')) return seed;
  const base = 10000000001;
  const num = typeof seed === 'number'
    ? seed
    : typeof seed === 'string'
    ? (hashToNumber(seed) % 899999999) + 1
    : 1;
  return `LYS-${base + num - 1}`;
}

/** 6. Transaction ID — format: LYT100000001 */
export function formatTransactionId(seed?: number | string): string {
  if (typeof seed === 'string' && seed.startsWith('LYT')) return seed;
  const base = 100000001;
  const num = typeof seed === 'number'
    ? seed
    : typeof seed === 'string'
    ? (hashToNumber(seed) % 89999999) + 1
    : 1;
  return `LYT${base + num - 1}`;
}

/**
 * SQL Migration snippet to execute in Supabase Console -> SQL Editor
 * to convert primary key columns from UUID to TEXT type.
 */
export const ALTER_TABLES_SQL = `
-- Run this in Supabase Console -> SQL Editor:
ALTER TABLE shipments ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE transactions ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE transactions ALTER COLUMN shipment_id TYPE text USING shipment_id::text;
ALTER TABLE warehouses ALTER COLUMN id TYPE text USING id::text;
`;
