'use client';

import { useState, useMemo, useEffect } from 'react';
import styles from "./page.module.css";
import Link from "next/link";
import Image from "next/image";
import Logo from "@/components/Logo";
import { useAuth } from "@/components/AuthProvider";

export default function Home() {
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [calcCategory, setCalcCategory] = useState('Apparel');
  const [calcWeight, setCalcWeight] = useState(1);

  useEffect(() => {
    setMounted(true);
  }, []);

  const ambientDots = useMemo(() => {
    if (!mounted) return [];
    return [...Array(60)].map((_, i) => ({
      cx: Math.random() * 1440,
      cy: Math.random() * 810,
      r: Math.random() * 1.5 + 0.5,
      dur: `${Math.random() * 3 + 2}s`,
      opacity: Math.random() * 0.4 + 0.1,
      fill: i % 3 === 0 ? "#facc15" : "#4a90d9"
    }));
  }, [mounted]);

  const savings = useMemo(() => {
    const baseIndia = calcCategory === 'Jewelry' ? 5000 : calcCategory === 'Home Decor' ? 4000 : 2000;
    const baseCanada = baseIndia * 5;
    const layoShipping = calcWeight * 3000;
    const totalLayo = (baseIndia * calcWeight) + layoShipping;
    const totalCanada = baseCanada * calcWeight;
    const netSavings = totalCanada - totalLayo;
    const percent = Math.round((netSavings / totalCanada) * 100);
    return { totalLayo, totalCanada, netSavings, percent };
  }, [calcCategory, calcWeight]);

  return (
    <main className={styles.main}>
      {/* ── Background: World Map + City Lights ── */}
      <div className={styles.bgLayer} aria-hidden="true">
        <svg
          className={styles.worldMapSvg}
          viewBox="0 0 1440 810"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <radialGradient id="cityGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffe066" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ffe066" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="bgGrad" cx="50%" cy="50%" r="80%">
              <stop offset="0%" stopColor="#0d2045" />
              <stop offset="100%" stopColor="#050a14" />
            </radialGradient>
            <filter id="blur2">
              <feGaussianBlur stdDeviation="2" />
            </filter>
            <filter id="blur4">
              <feGaussianBlur stdDeviation="4" />
            </filter>
            <filter id="blur8">
              <feGaussianBlur stdDeviation="8" />
            </filter>
          </defs>

          {/* Background */}
          <rect width="1440" height="810" fill="url(#bgGrad)" />

          {/* ── Continent Shapes ── */}
          <g fill="#102e52" stroke="#1e5080" strokeWidth="0.6" opacity="0.92">
            {/* North America */}
            <path d="M 80 80 L 130 60 L 200 55 L 280 70 L 330 90 L 350 120 L 340 160 L 310 200 L 290 240 L 260 280 L 230 320 L 200 360 L 170 380 L 150 360 L 120 330 L 100 300 L 90 260 L 70 220 L 60 180 L 65 140 L 80 80 Z" />
            {/* Greenland */}
            <path d="M 320 30 L 370 20 L 420 30 L 430 60 L 410 90 L 370 95 L 330 80 L 315 55 Z" />
            {/* South America */}
            <path d="M 200 390 L 240 370 L 280 380 L 310 410 L 320 460 L 310 510 L 290 560 L 260 610 L 230 650 L 200 670 L 180 650 L 175 600 L 180 550 L 175 490 L 180 440 L 190 400 Z" />
            {/* Europe */}
            <path d="M 530 80 L 560 70 L 600 65 L 640 70 L 670 90 L 680 120 L 660 150 L 630 170 L 600 175 L 570 165 L 545 145 L 530 120 L 525 95 Z" />
            {/* UK / Ireland */}
            <path d="M 500 90 L 515 80 L 525 90 L 520 110 L 505 115 L 495 105 Z" />
            {/* Scandinavia */}
            <path d="M 560 40 L 590 30 L 620 35 L 640 55 L 630 80 L 605 90 L 575 85 L 555 65 Z" />
            {/* Africa */}
            <path d="M 530 200 L 570 190 L 610 195 L 640 210 L 660 240 L 665 280 L 660 330 L 645 380 L 620 430 L 590 470 L 560 500 L 530 510 L 510 495 L 495 460 L 490 410 L 492 360 L 495 310 L 500 260 L 510 220 Z" />
            {/* Asia (main body) */}
            <path d="M 680 60 L 750 45 L 840 40 L 940 50 L 1020 70 L 1080 90 L 1120 120 L 1130 160 L 1110 200 L 1080 230 L 1040 250 L 1000 260 L 950 265 L 900 260 L 860 250 L 820 240 L 780 230 L 750 215 L 720 195 L 700 170 L 685 140 L 678 100 Z" />
            {/* Indian Subcontinent */}
            <path d="M 860 260 L 890 265 L 910 285 L 915 315 L 900 350 L 880 380 L 858 395 L 840 385 L 830 360 L 828 325 L 835 292 L 848 270 Z" />
            {/* Southeast Asia */}
            <path d="M 950 265 L 990 270 L 1020 290 L 1030 320 L 1015 345 L 990 355 L 965 345 L 950 320 L 948 290 Z" />
            {/* Australia */}
            <path d="M 1060 390 L 1120 370 L 1190 375 L 1240 400 L 1260 440 L 1255 490 L 1230 530 L 1185 555 L 1130 560 L 1075 545 L 1045 510 L 1040 465 L 1050 420 Z" />
            {/* Japan */}
            <path d="M 1110 140 L 1130 130 L 1150 140 L 1155 165 L 1140 185 L 1115 185 L 1105 165 Z" />
            {/* Middle East */}
            <path d="M 680 170 L 720 165 L 760 170 L 780 195 L 775 225 L 750 240 L 720 240 L 695 225 L 680 200 Z" />
          </g>

          {/* ── Grid lines (perspective) ── */}
          <g stroke="#1a3a5c" strokeWidth="0.5" opacity="0.6">
            {[...Array(20)].map((_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 40} x2="1440" y2={i * 40} />
            ))}
            {[...Array(30)].map((_, i) => (
              <line key={`v${i}`} x1={i * 48} y1="0" x2={i * 48} y2="810" />
            ))}
          </g>

          {/* ── City Lights ── */}
          <CityLight cx={175} cy={185} r={8} />
          <CityLight cx={155} cy={175} r={6} />
          <CityLight cx={120} cy={200} r={5} />
          <CityLight cx={170} cy={160} r={5} />
          <CityLight cx={160} cy={170} r={4} />
          <CityLight cx={185} cy={195} r={4} />
          <CityLight cx={540} cy={115} r={6} />
          <CityLight cx={565} cy={110} r={5} />
          <CityLight cx={595} cy={105} r={5} />
          <CityLight cx={625} cy={115} r={4} />
          <CityLight cx={560} cy={120} r={3} />
          <CityLight cx={580} cy={130} r={4} />
          <CityLight cx={610} cy={125} r={3} />
          <CityLight cx={1100} cy={155} r={7} />
          <CityLight cx={1090} cy={165} r={5} />
          <CityLight cx={1010} cy={200} r={6} />
          <CityLight cx={1020} cy={215} r={5} />
          <CityLight cx={990} cy={195} r={4} />
          <CityLight cx={960} cy={175} r={4} />
          <CityLight cx={750} cy={155} r={5} />
          <CityLight cx={700} cy={200} r={4} />
          <CityLight cx={720} cy={210} r={3} />
          <CityLight cx={820} cy={295} r={6} />
          <CityLight cx={830} cy={270} r={5} />
          <CityLight cx={840} cy={320} r={4} />
          <CityLight cx={815} cy={310} r={3} />
          <CityLight cx={1155} cy={490} r={6} />
          <CityLight cx={1130} cy={495} r={4} />
          <CityLight cx={1115} cy={440} r={3} />
          <CityLight cx={710} cy={215} r={5} />
          <CityLight cx={695} cy={205} r={3} />
          <CityLight cx={565} cy={415} r={4} />
          <CityLight cx={570} cy={220} r={4} />
          <CityLight cx={545} cy={280} r={3} />

          {/* ── India & Canada Pins ── */}
          <circle cx={930} cy={380} r={10} fill="#facc15" filter="url(#blur4)" opacity={0.35} />
          <circle cx={930} cy={380} r={5} fill="#facc15" opacity={0.7} />
          <circle cx={930} cy={380} r={2.5} fill="#fff" />
          <text x={943} y={376} fill="white" fontSize="12" fontWeight="700" fontFamily="sans-serif">INDIA</text>
          <circle cx={168} cy={163} r={10} fill="#facc15" filter="url(#blur4)" opacity={0.35} />
          <circle cx={168} cy={163} r={5} fill="#facc15" opacity={0.7} />
          <circle cx={168} cy={163} r={2.5} fill="#fff" />
          <text x={100} y={154} fill="white" fontSize="12" fontWeight="700" fontFamily="sans-serif">CANADA</text>
          <text x={100} y={168} fill="#94a3b8" fontSize="9" fontFamily="sans-serif">(Toronto/Vancouver)</text>

          {/* ── India→Canada Arc ── */}
          <path d="M 930 380 Q 600 -60 168 163" fill="none" stroke="#facc15" strokeWidth="12" opacity="0.1" filter="url(#blur8)" />
          <path d="M 930 380 Q 600 -60 168 163" fill="none" stroke="#ffe066" strokeWidth="6" opacity="0.3" filter="url(#blur4)" />
          <path d="M 930 380 Q 600 -60 168 163" fill="none" stroke="#fff" strokeWidth="1" opacity="0.8" />
          <path d="M 930 380 Q 600 -60 168 163" fill="none" stroke="#facc15" strokeWidth="2" strokeDasharray="10 8" opacity="1" />

          {/* Animated dot along arc */}
          <circle r="4" fill="#facc15" filter="url(#blur2)">
            <animateMotion dur="4s" repeatCount="indefinite" path="M 930 380 Q 600 -60 168 163" />
          </circle>

          {/* Extra ambient dots (more density) */}
          {ambientDots.map((dot, i) => (
            <circle
              key={i}
              cx={dot.cx}
              cy={dot.cy}
              r={dot.r}
              fill={dot.fill}
              opacity={dot.opacity}
            >
              <animate attributeName="opacity" values="0.1;0.5;0.1" dur={dot.dur} repeatCount="indefinite" />
            </circle>
          ))}
        </svg>
      </div>

      {/* ── Header ── */}
      <header className={styles.header}>
        <Logo showTagline={false} />
        <nav className={styles.nav}>
          <Link href="/" className={styles.navActive}>Home</Link>
          <Link href="#services">Services</Link>
          <Link href="#solutions">Solutions</Link>
          <Link href="#about">About</Link>
          {!loading && user && <Link href="/dashboard">My Shipments</Link>}
        </nav>
        {!loading && user ? (
          <Link href="/dashboard" className={styles.quoteBtn}>My Shipments</Link>
        ) : (
          <Link href="/login" className={styles.quoteBtn}>Sign In</Link>
        )}
      </header>

      {/* ── Hero Content ── */}
      <section className={styles.hero}>
        {/* Category Icons */}
        <div className={styles.categoryRow}>
          <div className={styles.catItem}>
            <div className={styles.catIconWrapper}>
              <Image src="/apparel-v2.png" alt="Apparel" width={120} height={120} className={styles.catImage} />
            </div>
            <span>APPAREL</span>
          </div>
          <div className={styles.catItem}>
            <div className={styles.catIconWrapper}>
              <Image src="/value-goods-v2.png" alt="Value Goods" width={120} height={120} className={styles.catImage} />
            </div>
            <span>VALUE GOODS</span>
          </div>
          <div className={styles.catItem}>
            <div className={styles.catIconWrapper}>
              <Image src="/secure-parcels-v2.png" alt="Secure Parcels" width={120} height={120} className={styles.catImage} />
            </div>
            <span>SECURE PARCELS</span>
          </div>
        </div>

        <h1 className={styles.heroTitle}>DISTANCE, DECODED</h1>
        <p className={styles.heroSub}>Seamless Global Logistics connecting India to Canada and beyond</p>

        <div className={styles.ctaRow}>
          <Link href="/dashboard" className={styles.ctaBtn}>
            START SHIPPING FROM INDIA <span className={styles.ctaIcon}>↗</span>
          </Link>
          <button className={styles.ctaBtn} onClick={() => setIsCalcOpen(true)}>
            CALCULATE SAVINGS <span className={styles.ctaIcon}>🗓</span>
          </button>
        </div>
      </section>

      {/* ── Solutions Section ── */}
      <section id="solutions" className={styles.infoSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionLabel}>SOLUTIONS</span>
          <h2 className={styles.sectionTitle}>The Layo Advantage</h2>
        </div>
        <div className={styles.solutionsGrid}>
          <div className={styles.solutionCard}>
            <div className={styles.solIcon}>💰</div>
            <h3>Price Disparity</h3>
            <p>Apparel and home goods in Canada are often 6-7x more expensive. Layo brings you Indian prices with international speed.</p>
          </div>
          <div className={styles.solutionCard}>
            <div className={styles.solIcon}>✨</div>
            <h3>Cultural Variety</h3>
            <p>Don't miss out on ethnic wear, jewelry, and decor. Get authentic Indian quality delivered to your Canadian doorstep.</p>
          </div>
          <div className={styles.solutionCard}>
            <div className={styles.solIcon}>⚡</div>
            <h3>Logistic Hurdles</h3>
            <p>No more complex shipping forms or high individual rates. We aggregate the best carriers for a seamless experience.</p>
          </div>
        </div>
      </section>

      {/* ── Services Section ── */}
      <section id="services" className={styles.infoSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionLabel}>SERVICES</span>
          <h2 className={styles.sectionTitle}>Flexible Shipping Options</h2>
        </div>
        <div className={styles.servicesRow}>
          <div className={styles.serviceItem}>
            <div className={styles.serviceImgWrapper}>
              <div className={styles.serviceIconLarge}>📦</div>
            </div>
            <div className={styles.serviceContent}>
              <h3>Selection Dashboard</h3>
              <p>A simplified selection flow with instant estimation based on weight and standard box sizes.</p>
              <ul className={styles.serviceList}>
                <li>Instant Quotes</li>
                <li>Categorized Goods</li>
                <li>Secure Tracking</li>
              </ul>
            </div>
          </div>
          <div className={styles.serviceItem}>
            <div className={styles.serviceImgWrapper}>
              <div className={styles.serviceIconLarge}>💬</div>
            </div>
            <div className={styles.serviceContent}>
              <h3>WhatsApp Concierge</h3>
              <p>Share product links or details directly via WhatsApp. Our team handles the parsing and order generation.</p>
              <ul className={styles.serviceList}>
                <li>White-glove Service</li>
                <li>Zero Forms</li>
                <li>Direct Communication</li>
              </ul>
            </div>
          </div>
          <div className={styles.serviceItem}>
            <div className={styles.serviceImgWrapper}>
              <div className={styles.serviceIconLarge}>📄</div>
            </div>
            <div className={styles.serviceContent}>
              <h3>Digital Documentation</h3>
              <p>Upload invoices or delivery details. Our AI extracts customs data to generate your labels automatically.</p>
              <ul className={styles.serviceList}>
                <li>AI-Powered Extraction</li>
                <li>Document Support</li>
                <li>Automated Customs</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── About Section ── */}
      <section id="about" className={styles.infoSection}>
        <div className={styles.aboutContainer}>
          <div className={styles.aboutContent}>
            <span className={styles.sectionLabel}>ABOUT LAYO</span>
            <h2 className={styles.sectionTitle}>Bridging Borders, Simplifying Logistics</h2>
            <p className={styles.aboutText}>
              Layo is a premium logistics aggregator platform designed to solve the significant price disparity for essential goods between India and Canada. 
              We act as a strategic mid-player, bringing together diverse courier partners onto a single unified interface.
            </p>
            <p className={styles.aboutText}>
              Our mission is to provide seamless trans-continental delivery for Non-Resident Indians (NRIs) and customers in Canada, ensuring high-quality Indian goods reach you at a fraction of the cost.
            </p>
            <div className={styles.aboutStats}>
              <div className={styles.statItem}>
                <span className={styles.statNum}>50%</span>
                <span className={styles.statDesc}>Average Savings</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statNum}>100+</span>
                <span className={styles.statDesc}>Item Categories</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statNum}>24/7</span>
                <span className={styles.statDesc}>Concierge Support</span>
              </div>
            </div>
          </div>
          <div className={styles.aboutVisual}>
            <div className={styles.visualGlobe}>
              <div className={styles.globePulse}></div>
              <Logo variant="header" showTagline={true} className={styles.aboutLogo} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <p className={styles.footerTagline}>Global Network. Express Delivery. Guaranteed Safety.</p>
        <div className={styles.footerCenter}>
          <Logo variant="footer" showTagline={false} />
          <div className={styles.socialIcons}>
            <span>f</span><span>𝕏</span><span>📷</span><span>▶</span>
          </div>
        </div>
        <div className={styles.footerRight}>
          <Link href="/dashboard">Privacy</Link>
          <Link href="/dashboard">Terms</Link>
          <span>© 2024 Layo Logistics</span>
        </div>
      </footer>

      {/* ── Savings Calculator Modal ── */}
      {isCalcOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsCalcOpen(false)}>
          <div className={styles.calculatorCard} onClick={e => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setIsCalcOpen(false)}>×</button>
            
            <div className={styles.calcHeader}>
              <span className={styles.sectionLabel}>Layo Savings Calculator</span>
              <h2 className={styles.sectionTitle}>See how much you save</h2>
            </div>

            <div className={styles.calcGrid}>
              <div className={styles.calcInputs}>
                <div className={styles.inputBox}>
                  <label>Category of Goods</label>
                  <select value={calcCategory} onChange={e => setCalcCategory(e.target.value)}>
                    <option value="Apparel">Apparel & Clothing</option>
                    <option value="Jewelry">Jewelry & Accessories</option>
                    <option value="Home Decor">Home Decor & Handicrafts</option>
                  </select>
                </div>
                <div className={styles.inputBox}>
                  <label>Estimated Weight (kg)</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="50" 
                    value={calcWeight} 
                    onChange={e => setCalcWeight(Number(e.target.value))} 
                  />
                </div>
                <Link href="/dashboard" className={styles.quoteBtn} style={{ textAlign: 'center' }}>
                  Start Shipping Now
                </Link>
              </div>

              <div className={styles.resultsArea}>
                <div className={styles.comparisonBar}>
                  <div className={styles.barLabel}>
                    <span>Layo Total Cost</span>
                    <span>₹{savings.totalLayo.toLocaleString()}</span>
                  </div>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: '40%', background: '#facc15' }}></div>
                  </div>
                </div>

                <div className={styles.comparisonBar}>
                  <div className={styles.barLabel}>
                    <span>Canada Retail Cost</span>
                    <span>₹{savings.totalCanada.toLocaleString()}</span>
                  </div>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: '100%', background: 'rgba(255,255,255,0.2)' }}></div>
                  </div>
                </div>

                <div className={styles.savingsBadge}>
                  <span className={styles.savingsLabel}>YOU SAVE APPROXIMATELY</span>
                  <span className={styles.savingsValue}>₹{savings.netSavings.toLocaleString()}</span>
                  <span className={styles.savingsLabel}>{savings.percent}% OFF CANADIAN PRICES</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/** Inline helper – renders a glowing city-light circle */
function CityLight({ cx, cy, r = 4, label }: { cx: number; cy: number; r?: number; label?: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r * 2.5} fill="#ffe066" opacity={0.08} />
      <circle cx={cx} cy={cy} r={r * 1.4} fill="#ffe066" opacity={0.18} />
      <circle cx={cx} cy={cy} r={r * 0.7} fill="#fff8c0" opacity={0.7} />
    </g>
  );
}
