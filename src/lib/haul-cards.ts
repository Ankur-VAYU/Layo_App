export interface HaulCard {
  id: string;
  headline: string;
  ageLabel: string;
  asset1Icon: string;
  asset1Label: string;
  asset1Qty: number;
  asset1Svg?: { viewBox: string; d: string };   // optional SVG silhouette override
  asset2Icon: string;
  asset2Label: string;
  asset2Qty: number;
  asset2Svg?: { viewBox: string; d: string };   // optional SVG silhouette override
  canadaPrice: number;
  indiaPrice: number;
  highlightSubtext: string;
  status: 'active' | 'inactive';
  externalUrl?: string;
}

export const DEFAULT_HAUL_CARDS: HaulCard[] = [
  {
    id: 'baby-daycare',
    headline: 'Daycare Essentials',
    ageLabel: 'Baby & Toddler (0–4)',
    asset1Icon: 'checkroom',
    asset1Label: 'Tops',
    asset1Qty: 6,
    // Styled top/shirt silhouette
    asset1Svg: {
      viewBox: '0 0 64 68',
      d: 'M 22,8 Q 32,3 42,8 L 57,16 L 64,30 L 52,36 L 48,28 L 48,64 L 16,64 L 16,28 L 12,36 L 0,30 L 7,16 Z',
    },
    asset2Icon: 'accessibility',
    asset2Label: 'Leggings/Pants',
    asset2Qty: 4,
    // Styled legging/pant silhouette
    asset2Svg: {
      viewBox: '0 0 60 72',
      d: 'M 8,6 Q 30,2 52,6 L 49,34 Q 44,52 38,70 L 22,70 Q 16,52 11,34 Z',
    },
    canadaPrice: 119,
    indiaPrice: 70,
    highlightSubtext: 'on a single 10-item basics refresh.',
    status: 'active',
  },
  {
    id: 'kids-playground',
    headline: 'Playground Bundle',
    ageLabel: 'Growing Kids (5–12)',
    asset1Icon: 'checkroom',
    asset1Label: 'Graphic Tees',
    asset1Qty: 5,
    asset2Icon: 'accessibility',
    asset2Label: 'Joggers/Pants',
    asset2Qty: 3,
    canadaPrice: 136,
    indiaPrice: 81,
    highlightSubtext: 'every time you refresh their play-wear.',
    status: 'active',
  },
  {
    id: 'teen-trend',
    headline: 'Trend Pack',
    ageLabel: 'Teens (11–17)',
    asset1Icon: 'dry_cleaning',
    asset1Label: 'Oversized Tees',
    asset1Qty: 4,
    asset2Icon: 'layers',
    asset2Label: 'Cargo/Denim',
    asset2Qty: 2,
    canadaPrice: 194,
    indiaPrice: 115,
    highlightSubtext: 'on just 6 trending pieces.',
    status: 'active',
  },
  {
    id: 'adult-comfort',
    headline: 'Comfort & Style',
    ageLabel: 'Adults (18+)',
    asset1Icon: 'apparel',
    asset1Label: 'Premium Tops',
    asset1Qty: 4,
    asset2Icon: 'category',
    asset2Label: 'Lounge/Work Pants',
    asset2Qty: 2,
    canadaPrice: 189,
    indiaPrice: 110,
    highlightSubtext: 'on a quick seasonal wardrobe update.',
    status: 'active',
  },
];

const STORAGE_KEY = 'layo_haul_cards';

export function loadHaulCards(): HaulCard[] {
  if (typeof window === 'undefined') return DEFAULT_HAUL_CARDS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_HAUL_CARDS;
    const parsed: HaulCard[] = JSON.parse(stored);
    // Merge SVG overrides from defaults so stale localStorage data always gets silhouettes
    return parsed.map(card => {
      const def = DEFAULT_HAUL_CARDS.find(d => d.id === card.id);
      return def
        ? { ...card, asset1Svg: card.asset1Svg ?? def.asset1Svg, asset2Svg: card.asset2Svg ?? def.asset2Svg }
        : card;
    });
  } catch {
    return DEFAULT_HAUL_CARDS;
  }
}

export function saveHaulCards(cards: HaulCard[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}
