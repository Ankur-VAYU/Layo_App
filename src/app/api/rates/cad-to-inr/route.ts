import { NextResponse } from 'next/server';

interface CachedRate {
  spotRate: number;
  buffer: number;
  effectiveRate: number;
  source: string;
  timestamp: number;
}

// 1-hour in-memory server cache
let memoryCache: CachedRate | null = null;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 60 minutes
const DEFAULT_BUFFER = 0.90; // Default safety spread in INR to absorb Stripe 2-2.5% forex fee
const FALLBACK_SPOT_RATE = 68.90;

async function fetchFromOnlineSources(): Promise<{ spotRate: number; source: string }> {
  // Primary source: open.er-api.com
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/CAD', {
      headers: { 'User-Agent': 'LayoLogistics/1.0' },
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      const inr = Number(data?.rates?.INR);
      if (!isNaN(inr) && inr > 50 && inr < 100) {
        return { spotRate: inr, source: 'open.er-api.com' };
      }
    }
  } catch (e) {
    console.warn('Primary exchange rate source (open.er-api.com) failed:', e);
  }

  // Secondary source: exchangerate-api.com open endpoint
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/CAD', {
      headers: { 'User-Agent': 'LayoLogistics/1.0' },
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      const inr = Number(data?.rates?.INR);
      if (!isNaN(inr) && inr > 50 && inr < 100) {
        return { spotRate: inr, source: 'api.exchangerate-api.com' };
      }
    }
  } catch (e) {
    console.warn('Secondary exchange rate source failed:', e);
  }

  return { spotRate: FALLBACK_SPOT_RATE, source: 'system_fallback' };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customBufferParam = searchParams.get('buffer');
    const buffer = customBufferParam !== null && !isNaN(Number(customBufferParam))
      ? Math.max(0, Number(customBufferParam))
      : DEFAULT_BUFFER;

    const now = Date.now();

    if (!memoryCache || (now - memoryCache.timestamp > CACHE_DURATION_MS)) {
      const { spotRate, source } = await fetchFromOnlineSources();
      const effectiveRate = Number(Math.max(50, spotRate - buffer).toFixed(2));

      memoryCache = {
        spotRate: Number(spotRate.toFixed(4)),
        buffer,
        effectiveRate,
        source,
        timestamp: now,
      };
    }

    // If request passed a custom buffer different from cached buffer, compute effective rate dynamically
    const effectiveRate = Number(Math.max(50, memoryCache.spotRate - buffer).toFixed(2));

    return NextResponse.json(
      {
        base: 'CAD',
        target: 'INR',
        spotRate: memoryCache.spotRate,
        buffer,
        effectiveRate,
        source: memoryCache.source,
        lastUpdated: new Date(memoryCache.timestamp).toISOString(),
        status: 'success',
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (err: any) {
    console.error('Failed to compute exchange rate:', err);
    return NextResponse.json(
      {
        base: 'CAD',
        target: 'INR',
        spotRate: FALLBACK_SPOT_RATE,
        buffer: DEFAULT_BUFFER,
        effectiveRate: 68.0,
        source: 'error_fallback',
        lastUpdated: new Date().toISOString(),
        status: 'fallback',
      },
      { status: 200 }
    );
  }
}
