'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './dashboard.module.css';
import shippingDataRaw from './shipping_data.json';
import Logo from '@/components/Logo';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

const shippingData = shippingDataRaw as Record<string, Record<string, number>>;

interface Package {
  id: string;
  vendor: string;
  expectedItems: string;
  trackingNumber?: string;
  status: 'pending' | 'arrived' | 'shipped';
  warehouseId: string;
  weight?: number;
  arrivalDate?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  
  const [packages, setPackages] = useState<Package[]>([]);
  const [showPreAlert, setShowPreAlert] = useState(false);
  
  // Pre-alert Form State
  const [vendor, setVendor] = useState('');
  const [itemsDesc, setItemsDesc] = useState('');
  const [selectedWH, setSelectedWH] = useState('');
  const [preTracking, setPreTracking] = useState('');

  const warehouses = [
    { id: 'wh-del', city: 'Delhi NCR (Gurgaon)', address: 'Plot 42, Sector 18, Udyog Vihar', pincode: '122015', contact: '+91 97745 81632' },
    { id: 'wh-mum', city: 'Mumbai (Bhiwandi)', address: 'Gala 12, Jai Bhagwan Complex', pincode: '421302', contact: '+91 97745 81632' },
    { id: 'wh-blr', city: 'Bangalore (Whitefield)', address: 'Building 7, Export Promotion Park', pincode: '560066', contact: '+91 97745 81632' }
  ];

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handlePreAlert = (e: React.FormEvent) => {
    e.preventDefault();
    const newPkg: Package = {
      id: Math.random().toString(36).substr(2, 9),
      vendor,
      expectedItems: itemsDesc,
      trackingNumber: preTracking,
      status: 'pending',
      warehouseId: selectedWH
    };
    setPackages([newPkg, ...packages]);
    setShowPreAlert(false);
    setVendor('');
    setItemsDesc('');
    setPreTracking('');
  };

  const handleCheckout = () => {
    const arrivedPackages = packages.filter(p => p.status === 'arrived');
    const shipmentData = {
      packages: arrivedPackages,
      totalWeight: arrivedPackages.reduce((sum, p) => sum + (p.weight || 0), 0),
    };
    localStorage.setItem('layo_pending_shipment', JSON.stringify(shipmentData));
    router.push('/checkout');
  };

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <Logo showTagline={false} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {user && (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Welcome, <strong>{user.user_metadata?.full_name || user.email}</strong>
            </span>
          )}
          <button onClick={() => supabase.auth.signOut()} className={styles.signOutBtn}>Sign Out</button>
        </div>
      </header>

      <section className={styles.content}>
        <div className={styles.lockerArea}>
          <div className={styles.lockerHeader}>
            <div>
              <h1 className="gradient-text">My India Locker</h1>
              <p className={styles.subtitle}>Manage your incoming packages and ship them to Canada together.</p>
            </div>
            <button className={styles.preAlertBtn} onClick={() => setShowPreAlert(true)}>
              + Register Incoming Package
            </button>
          </div>

          <div className={styles.packageGrid}>
            {packages.length === 0 ? (
              <div className={styles.emptyLocker}>
                <div className={styles.lockerIcon}>📦</div>
                <h3>Your locker is empty</h3>
                <p>Register a package before ordering from an Indian e-commerce site to get your virtual address.</p>
                <button className={styles.preAlertBtn} onClick={() => setShowPreAlert(true)} style={{ marginTop: '1.5rem' }}>
                  Get Started
                </button>
              </div>
            ) : (
              packages.map(pkg => (
                <div key={pkg.id} className={`${styles.packageCard} glass`}>
                  <div className={styles.pkgHeader}>
                    <span className={`${styles.statusTag} ${styles[pkg.status]}`}>{pkg.status}</span>
                    <span className={styles.pkgId}>ID: {pkg.id}</span>
                  </div>
                  <h3>{pkg.vendor}</h3>
                  <p className={styles.pkgItems}>{pkg.expectedItems}</p>
                  <div className={styles.pkgMeta}>
                    <span>📍 {warehouses.find(w => w.id === pkg.warehouseId)?.city}</span>
                    {pkg.trackingNumber && <span>🚚 {pkg.trackingNumber}</span>}
                  </div>
                  {pkg.status === 'pending' && (
                    <div className={styles.virtualAddressMini}>
                      <strong>Ship to:</strong> {user?.user_metadata?.full_name} / LAYO-{user?.id?.substr(0, 5).toUpperCase()}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <aside className={styles.quoteSidebar}>
          <div className={`${styles.quoteCard} glass`}>
            <h3>Consolidation Summary</h3>
            <div className={styles.summaryItem}>
              <span>Packages in Locker</span>
              <span>{packages.length}</span>
            </div>
            <div className={styles.summaryItem}>
              <span>Arrived & Ready</span>
              <span>{packages.filter(p => p.status === 'arrived').length}</span>
            </div>
            <div className={styles.summaryItem}>
              <span>Total Est. Weight</span>
              <span>{packages.reduce((sum, p) => sum + (p.weight || 0), 0).toFixed(2)} kg</span>
            </div>
            
            <div className={styles.divider}></div>
            
            <button 
              className={styles.checkoutBtn} 
              disabled={packages.filter(p => p.status === 'arrived').length === 0}
              onClick={handleCheckout}
            >
              Ship Arrived Items to Canada
            </button>
            <p className={styles.checkoutNote}>
              Tip: Wait for all your items to arrive to save up to 40% on shipping.
            </p>
          </div>
        </aside>
      </section>

      {showPreAlert && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modal} glass`}>
            <h2>Register Incoming Package</h2>
            <p>Tell us what you're buying so we can match it when it arrives.</p>
            <form onSubmit={handlePreAlert}>
              <div className={styles.inputGroup}>
                <label>Where are you buying from?</label>
                <input 
                  type="text" 
                  placeholder="e.g. Amazon, Myntra, Ajio" 
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label>What's inside? (Item description)</label>
                <input 
                  type="text" 
                  placeholder="e.g. 3 Cotton Shirts, 1 Saree" 
                  value={itemsDesc}
                  onChange={(e) => setItemsDesc(e.target.value)}
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Target Warehouse</label>
                <select value={selectedWH} onChange={(e) => setSelectedWH(e.target.value)} required>
                  <option value="" disabled>Select India Warehouse</option>
                  {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.city}</option>)}
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label>Tracking ID (if available)</label>
                <input 
                  type="text" 
                  placeholder="Paste it here if you already have it" 
                  value={preTracking}
                  onChange={(e) => setPreTracking(e.target.value)}
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowPreAlert(false)} className={styles.cancelBtn}>Cancel</button>
                <button type="submit" className={styles.submitBtn}>Register & Get Address</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
