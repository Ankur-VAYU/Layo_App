'use client';

import { useState, useEffect, useRef } from 'react';
import { HaulCard } from '@/lib/haul-cards';

interface Props {
  card: HaulCard;
  selected: boolean;
  onSelect: () => void;
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current === value) return;
    const start = prev.current;
    const end = value;
    const diff = end - start;
    const duration = 300;
    const startTime = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + diff * eased));
      if (t < 1) requestAnimationFrame(tick);
      else prev.current = end;
    };
    requestAnimationFrame(tick);
  }, [value]);

  return <>{display}</>;
}

export default function SmartHaulCard({ card, selected, onSelect }: Props) {
  const baseTotal = card.asset1Qty + card.asset2Qty;
  const canadaPerUnit = card.canadaPrice / baseTotal;
  const indiaPerUnit = card.indiaPrice / baseTotal;

  const [qty1, setQty1] = useState(card.asset1Qty);
  const [qty2, setQty2] = useState(card.asset2Qty);

  const totalItems = qty1 + qty2;
  const canadaTotal = Math.round(canadaPerUnit * totalItems);
  const indiaTotal = Math.round(indiaPerUnit * totalItems);
  const savings = canadaTotal - indiaTotal;
  const pct = totalItems > 0 ? Math.round((savings / canadaTotal) * 100) : 0;

  const adjust = (setter: (v: number) => void, current: number, delta: number) => {
    const next = current + delta;
    if (next < 0) return;
    setter(next);
  };

  return (
    <div
      onClick={onSelect}
      className={`snap-item w-full rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all duration-300 ${
        selected
          ? 'bg-[#1e1c0f] border-2 border-primary shadow-[0_0_28px_rgba(242,202,80,0.25)]'
          : 'bg-[#1a1a1a] border border-white/10 hover:border-primary/30'
      }`}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-start justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
            {card.ageLabel}
          </span>
          <h3 className="text-xl font-bold text-white mt-0.5 leading-tight">{card.headline}</h3>
        </div>
        {selected && (
          <span className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-background" style={{ fontSize: 14 }}>check</span>
          </span>
        )}
      </div>

      {/* Interactive item builder */}
      <div className="mx-5 my-3 rounded-xl bg-[#111] border border-white/5 py-4 px-4 flex items-center gap-2">
        {/* Item 1 */}
        <div className="flex flex-col items-center gap-2 flex-1">
          {card.asset1Svg ? (
            <svg viewBox={card.asset1Svg.viewBox} width={44} height={44} fill="none">
              <path d={card.asset1Svg.d} fill="#F2CA50" opacity={0.9} />
            </svg>
          ) : (
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontSize: 44, fontVariationSettings: "'wght' 100", lineHeight: 1 }}
            >
              {card.asset1Icon}
            </span>
          )}
          <span className="text-[10px] text-on-surface-variant font-semibold text-center leading-tight">{card.asset1Label}</span>
          {/* Stepper */}
          <div
            className="flex items-center gap-2"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => adjust(setQty1, qty1, -1)}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center transition-all text-on-surface-variant hover:text-white"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>remove</span>
            </button>
            <span className="text-primary font-black text-sm w-4 text-center">×{qty1}</span>
            <button
              onClick={() => adjust(setQty1, qty1, 1)}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center transition-all text-on-surface-variant hover:text-white"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
            </button>
          </div>
        </div>

        <span className="text-on-surface-variant/30 font-bold text-xl mb-6">+</span>

        {/* Item 2 */}
        <div className="flex flex-col items-center gap-2 flex-1">
          {card.asset2Svg ? (
            <svg viewBox={card.asset2Svg.viewBox} width={44} height={44} fill="none">
              <path d={card.asset2Svg.d} fill="#F2CA50" opacity={0.9} />
            </svg>
          ) : (
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontSize: 44, fontVariationSettings: "'wght' 100", lineHeight: 1 }}
            >
              {card.asset2Icon}
            </span>
          )}
          <span className="text-[10px] text-on-surface-variant font-semibold text-center leading-tight">{card.asset2Label}</span>
          {/* Stepper */}
          <div
            className="flex items-center gap-2"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => adjust(setQty2, qty2, -1)}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center transition-all text-on-surface-variant hover:text-white"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>remove</span>
            </button>
            <span className="text-primary font-black text-sm w-4 text-center">×{qty2}</span>
            <button
              onClick={() => adjust(setQty2, qty2, 1)}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 flex items-center justify-center transition-all text-on-surface-variant hover:text-white"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
            </button>
          </div>
        </div>

        <span className="text-on-surface-variant/30 font-bold text-xl mb-6">=</span>

        {/* Total */}
        <div className="flex flex-col items-center gap-1.5 min-w-[36px]">
          <span className="text-3xl font-black text-white">{totalItems}</span>
          <span className="text-[10px] text-on-surface-variant font-semibold">Items</span>
        </div>
      </div>

      {/* Price comparison */}
      <div className="mx-5 space-y-1.5">
        <div className="flex justify-between items-center text-xs">
          <span className="text-on-surface-variant">Canada Retail</span>
          <span className="text-on-surface-variant line-through font-mono">
            $<AnimatedNumber value={canadaTotal} /> CAD
          </span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-white font-semibold">India + Layo</span>
          <span className="text-white font-bold font-mono">
            $<AnimatedNumber value={indiaTotal} /> CAD
          </span>
        </div>
      </div>

      {/* Savings bar */}
      {totalItems > 0 && (
        <div className="mx-5 mt-2.5 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Gold savings highlight */}
      <div className={`mx-5 mt-3 mb-5 rounded-xl px-4 py-3 transition-all duration-300 ${
        selected ? 'bg-primary/15 border border-primary/40' : 'bg-primary/10 border border-primary/20'
      }`}>
        {totalItems > 0 ? (
          <>
            <p className="text-primary font-black text-base leading-tight">
              Save $<AnimatedNumber value={savings} /> CAD
              <span className="text-sm font-bold opacity-60 ml-1">({pct}% off)</span>
            </p>
            <p className="text-on-surface-variant text-[11px] mt-0.5 leading-snug">
              {card.highlightSubtext}
            </p>
          </>
        ) : (
          <p className="text-on-surface-variant text-[11px] leading-snug">
            Add items above to see your savings.
          </p>
        )}
      </div>
    </div>
  );
}
