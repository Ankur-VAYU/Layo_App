// Delhivery Export Rate Card 2026 — Zone L (Canada)

export type DelhiveryServiceType = 'DLV_Saver' | 'Express' | 'Deferred_Express' | 'Document';

export interface DelhiveryServiceComparison {
  weightKg: number;
  dlvSaver: number | null;
  express: number | null;
  deferredExpress: number | null;
  document: number | null;
  cheapestService: string;
  cheapestRateINR: number;
}

export const DELHIVERY_CANADA_RATES: Record<DelhiveryServiceType, Record<string, number>> = {
  DLV_Saver: {
    "0.05": 639, "0.1": 667, "0.15": 697, "0.2": 726, "0.25": 754, "0.3": 843, "0.35": 875, "0.4": 906, "0.45": 937,
    "0.5": 1048, "0.6": 1117, "0.7": 1183, "0.8": 1252, "0.9": 1318, "1": 1627, "1.1": 1702, "1.2": 1775, "1.3": 1849,
    "1.4": 2045, "1.5": 2118, "1.6": 2193, "1.7": 2265, "1.8": 2340, "1.9": 2535, "2": 2609, "2.1": 2682, "2.2": 2756,
    "2.3": 2951, "2.4": 3025, "2.5": 3098, "2.6": 3173, "2.7": 3245, "2.8": 3442, "2.9": 3516, "3": 3589, "3.1": 3664,
    "3.2": 3865, "3.3": 3940, "3.4": 4013, "3.5": 4087, "3.6": 4160, "3.7": 4411, "3.8": 4485, "3.9": 4558, "4": 4633,
    "4.5": 5176, "5": 6227, "5.5": 6751, "6": 7278, "6.5": 7802, "7": 8329, "7.5": 8853, "8": 9378, "8.5": 9904,
    "9": 10429, "9.5": 10942, "10": 11582, "11": 12595, "12": 13604, "13": 14615, "14": 15625, "15": 16773,
    "16": 17785, "17": 18795, "18": 19805, "19": 20816, "20": 21964
  },
  Express: {
    "0.5": 1344, "1": 1550, "1.5": 1756, "2": 1962, "2.5": 2168, "3": 2692, "3.5": 2902, "4": 3112, "4.5": 3322,
    "5": 3532, "5.5": 4054, "6": 4241, "6.5": 4429, "7": 4616, "7.5": 4804, "8": 4845, "8.5": 5027, "9": 5209,
    "9.5": 5391, "10": 5573, "10.5": 6276, "11": 6509, "12": 6976, "13": 7442, "14": 7908, "15": 8374, "16": 8841,
    "17": 9307, "18": 9773, "19": 10240, "20": 10706, "25": 13375, "30": 15957, "40": 21123, "50": 26140
  },
  Deferred_Express: {
    "0.5": 1277, "1": 1472, "1.5": 1667, "2": 1863, "2.5": 2058, "3": 2556, "3.5": 2760, "4": 2964, "4.5": 3169,
    "5": 3373, "5.5": 3854, "6": 4033, "6.5": 4212, "7": 4392, "7.5": 4571, "8": 4598, "8.5": 4772, "9": 4945,
    "9.5": 5119, "10": 5293, "10.5": 5962, "11": 6184, "12": 6627, "13": 7070, "14": 7512, "15": 7955, "16": 8398,
    "17": 8841, "18": 9284, "19": 9727, "20": 10170, "25": 12703, "30": 15158, "40": 20069, "50": 24823
  },
  Document: {
    "0.5": 1344, "1": 1550, "1.5": 1756, "2": 1962, "2.5": 2168, "3": 2692, "3.5": 2902, "4": 3112, "4.5": 3322, "5": 3532
  }
};

/**
 * Get exact Delhivery cost in INR for a given service and weight (in kg)
 */
export function getDelhiveryRate(service: DelhiveryServiceType, weightKg: number): number | null {
  const table = DELHIVERY_CANADA_RATES[service];
  if (!table) return null;

  let baseRate: number | null = null;
  const strWeight = weightKg.toString();
  if (table[strWeight]) {
    baseRate = table[strWeight];
  } else {
    // Find nearest weight slab
    const slabs = Object.keys(table)
      .filter(k => !k.includes('+'))
      .map(Number)
      .sort((a, b) => a - b);

    for (const slab of slabs) {
      if (weightKg <= slab) {
        baseRate = table[slab.toString()];
        break;
      }
    }
  }

  if (baseRate === null) {
    if (service === 'Express') baseRate = Math.round(weightKg * 521);
    else if (service === 'Deferred_Express') baseRate = Math.round(weightKg * 495);
    else return null;
  }

  // DLV Saver charge: max(20, 200 * weight)
  if (service === 'DLV_Saver' && baseRate !== null) {
    const saverFee = Math.max(20, Math.round(200 * weightKg));
    return baseRate + saverFee;
  }

  return baseRate;
}

/**
 * Compare all 4 Delhivery options for a given weight
 */
export function compareAllDelhiveryServices(weightKg: number): DelhiveryServiceComparison {
  const dlvSaver = getDelhiveryRate('DLV_Saver', weightKg);
  const express = getDelhiveryRate('Express', weightKg);
  const deferredExpress = getDelhiveryRate('Deferred_Express', weightKg);
  const document = weightKg <= 5 ? getDelhiveryRate('Document', weightKg) : null;

  const validRates: { name: string; rate: number }[] = [];
  if (dlvSaver !== null) validRates.push({ name: 'DLV Saver', rate: dlvSaver });
  if (express !== null) validRates.push({ name: 'Express', rate: express });
  if (deferredExpress !== null) validRates.push({ name: 'Deferred Express', rate: deferredExpress });
  if (document !== null) validRates.push({ name: 'Document', rate: document });

  validRates.sort((a, b) => a.rate - b.rate);

  return {
    weightKg,
    dlvSaver,
    express,
    deferredExpress,
    document,
    cheapestService: validRates[0]?.name || 'Deferred Express',
    cheapestRateINR: validRates[0]?.rate || 0,
  };
}

export interface LayoDeliveryCalculation {
  weightKg: number;
  deliveryType: 'normal' | 'express';
  isDocument: boolean;
  carrierBaseINR: number;
  opsFeeINR: number;
  costBasisINR: number;
  marginINR: number;
  subtotalINR: number;
  gstINR: number;
  finalPriceINR: number;
  finalPriceCAD: number;
}

export interface LayoPricingSettings {
  opsFeeLow: number;       // default 300 (carrier cost < 2500)
  opsFeeHigh: number;      // default 500 (carrier cost >= 2500)
  opsFeeThreshold: number; // default 2500
  grossMarginPercent: number; // default 20
  gstPercent: number;      // default 18
}

export const DEFAULT_PRICING_SETTINGS: LayoPricingSettings = {
  opsFeeLow: 300,
  opsFeeHigh: 500,
  opsFeeThreshold: 2500,
  grossMarginPercent: 20,
  gstPercent: 18,
};

export function getPricingSettings(): LayoPricingSettings {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('layo_pricing_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse pricing settings', e);
    }
  }
  return DEFAULT_PRICING_SETTINGS;
}

export function savePricingSettings(settings: LayoPricingSettings) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('layo_pricing_settings', JSON.stringify(settings));
  }
}

/**
 * Calculate Layo Customer Delivery Price based on:
 * 1. Delivery Type: 'normal' | 'express'
 * 2. Document vs Non-Document parcel
 * 3. Ops Expense: Rs. 300 if carrier cost < Rs. 2,500; Rs. 500 if carrier cost >= Rs. 2,500
 * 4. Gross Margin on (Carrier cost + Ops expense)
 * 5. 18% GST added before final price to customer
 */
export function calculateLayoDeliveryCost(params: {
  weightKg: number;
  deliveryType: 'normal' | 'express';
  isDocument?: boolean;
  cadToInrRate?: number;
  opsFeeLow?: number;
  opsFeeHigh?: number;
  opsFeeThreshold?: number;
  grossMarginPercent?: number;
  gstPercent?: number;
}): LayoDeliveryCalculation {
  const { weightKg, deliveryType, isDocument = false, cadToInrRate = 70.4 } = params;
  
  const settings = getPricingSettings();
  const opsFeeLow = params.opsFeeLow ?? settings.opsFeeLow;
  const opsFeeHigh = params.opsFeeHigh ?? settings.opsFeeHigh;
  const opsFeeThreshold = params.opsFeeThreshold ?? settings.opsFeeThreshold;
  const grossMarginPercent = params.grossMarginPercent ?? settings.grossMarginPercent;
  const gstPercent = params.gstPercent ?? settings.gstPercent ?? 18;
  
  // Support sub-500g slabs down to 0.05kg (50g) as provided in DLV Saver
  const effectiveWeightKg = Math.max(0.05, weightKg);
  
  let carrierBaseINR = 0;
  
  if (isDocument && effectiveWeightKg <= 5.0) {
    carrierBaseINR = getDelhiveryRate('Document', effectiveWeightKg) || 1344;
  } else if (deliveryType === 'normal') {
    const s = getDelhiveryRate('DLV_Saver', effectiveWeightKg) || 99999;
    const d = getDelhiveryRate('Deferred_Express', effectiveWeightKg) || 99999;
    const e = getDelhiveryRate('Express', effectiveWeightKg) || 99999;
    carrierBaseINR = Math.min(s, d, e);
    if (carrierBaseINR === 99999) carrierBaseINR = Math.round(effectiveWeightKg * 495);
  } else {
    // Express
    carrierBaseINR = getDelhiveryRate('Express', effectiveWeightKg) || Math.round(effectiveWeightKg * 521);
  }

  // Dynamic Ops Expense Rule:
  const opsFeeINR = carrierBaseINR < opsFeeThreshold ? opsFeeLow : opsFeeHigh;
  const costBasisINR = carrierBaseINR + opsFeeINR;
  
  // Dynamic Gross Margin
  const marginINR = Math.round(costBasisINR * (grossMarginPercent / 100));
  const subtotalINR = costBasisINR + marginINR;

  // 18% GST added before showing final price to customer:
  const gstINR = Math.round(subtotalINR * (gstPercent / 100));
  const finalPriceINR = subtotalINR + gstINR;
  
  const finalPriceCAD = Number((finalPriceINR / (cadToInrRate || 70.4)).toFixed(2));

  return {
    weightKg: effectiveWeightKg,
    deliveryType,
    isDocument,
    carrierBaseINR,
    opsFeeINR,
    costBasisINR,
    marginINR,
    subtotalINR,
    gstINR,
    finalPriceINR,
    finalPriceCAD,
  };
}


