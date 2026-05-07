'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './dashboard.module.css';
import shippingDataRaw from './shipping_data.json';
import Logo from '@/components/Logo';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

const shippingData = shippingDataRaw as Record<string, Record<string, number>>;

interface Item {
  id: string;
  category: string;
  subcategory: string;
  quantity: number;
  weight: number;
}

type ShipmentMode = 'selection' | 'whatsapp' | 'scan';

export default function Dashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  
  const [mode, setMode] = useState<ShipmentMode>('selection');
  const [items, setItems] = useState<Item[]>([]);
  const [currentCategory, setCurrentCategory] = useState('');
  const [currentSubcategory, setCurrentSubcategory] = useState('');
  const [currentQuantity, setCurrentQuantity] = useState(1);
  const [destinationCity, setDestinationCity] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  
  const warehouses = [
    { id: 'wh-del', city: 'Delhi NCR (Gurgaon)', address: 'Plot 42, Sector 18, Udyog Vihar', pincode: '122015', contact: '+91 97745 81632' },
    { id: 'wh-mum', city: 'Mumbai (Bhiwandi)', address: 'Gala 12, Jai Bhagwan Complex', pincode: '421302', contact: '+91 97745 81632' },
    { id: 'wh-blr', city: 'Bangalore (Whitefield)', address: 'Building 7, Export Promotion Park', pincode: '560066', contact: '+91 97745 81632' }
  ];

  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [shipments, setShipments] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      fetchShipments();
    }
  }, [user, loading, router]);

  const fetchShipments = async () => {
    setIsFetching(true);
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setShipments(data);
    }
    setIsFetching(false);
  };

  useEffect(() => {
    if (selectedWarehouse && currentStep === 1) setCurrentStep(2);
    if (destinationCity && destinationAddress && currentStep === 2) setCurrentStep(3);
  }, [selectedWarehouse, destinationCity, destinationAddress, currentStep]);

  const canadaCities = ['Toronto (GTA)', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton', 'Winnipeg'];
  const categories = Object.keys(shippingData);
  const subcategories = currentCategory ? Object.keys(shippingData[currentCategory]) : [];

  const addItem = () => {
    if (!currentCategory || !currentSubcategory || currentQuantity < 1) return;
    const unitWeight = shippingData[currentCategory][currentSubcategory];
    const newItem: Item = {
      id: Math.random().toString(36).substr(2, 9),
      category: currentCategory,
      subcategory: currentSubcategory,
      quantity: currentQuantity,
      weight: unitWeight * currentQuantity
    };
    setItems([...items, newItem]);
    setCurrentSubcategory('');
    setCurrentQuantity(1);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItemQuantity = (id: string, newQty: number) => {
    if (newQty < 1) return;
    setItems(items.map(item => {
      if (item.id === id) {
        const unitWeight = item.weight / item.quantity;
        return { ...item, quantity: newQty, weight: unitWeight * newQty };
      }
      return item;
    }));
  };

  const totals = useMemo(() => {
    const weight = items.reduce((sum, item) => sum + item.weight, 0);
    const rate = Math.ceil(weight * 3000);
    return { weight: weight.toFixed(2), rate: rate.toLocaleString() };
  }, [items]);

  const handleCheckout = () => {
    const shipmentData = {
      items,
      mode,
      destinationCity,
      destinationAddress,
      indiaWarehouse: selectedWarehouse,
      externalOrderId: orderId,
      externalTracking: trackingNumber,
      totalWeight: totals.weight,
      totalCost: totals.rate
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
        <div className={styles.selectionArea}>
          <div className={styles.tabSwitcher}>
            <button 
              className={`${styles.tab} ${activeTab === 'new' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('new')}
            >
              New Shipment
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'history' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('history')}
            >
              My Shipments ({shipments.length})
            </button>
          </div>

          {activeTab === 'history' ? (
            <div className={styles.historyList}>
              <h1 className="gradient-text">Shipment History</h1>
              <p className={styles.subtitle}>Track your previous orders and their current status.</p>
              
              {shipments.length === 0 ? (
                <div className={styles.emptyHistory}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
                  <h3>No shipments found</h3>
                  <p>When you create a shipment, it will appear here.</p>
                  <button onClick={() => setActiveTab('new')} className={styles.addBtn} style={{ marginTop: '1.5rem' }}>
                    Create First Shipment
                  </button>
                </div>
              ) : (
                <div className={styles.historyGrid}>
                  {shipments.map((s) => (
                    <div key={s.id} className={`${styles.historyCard} glass`}>
                      <div className={styles.cardHeader}>
                        <span className={styles.statusBadge}>{s.status}</span>
                        <span className={styles.date}>{new Date(s.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className={styles.cardBody}>
                        <h3>To: {s.destination_city}</h3>
                        <p>{s.destination_address}</p>
                        <div className={styles.cardMeta}>
                          <span>⚖️ {s.total_weight}kg</span>
                          <span>💰 ₹{s.total_cost.toLocaleString()}</span>
                        </div>
                        {s.external_order_id && (
                          <div className={styles.orderRef}>
                            ID: {s.external_order_id}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className={styles.progressContainer}>
            <div className={styles.progressBar} style={{ width: `${(currentStep / 3) * 100}%` }}></div>
            <div className={styles.stepLabels}>
              <span className={currentStep >= 1 ? styles.activeStep : ''}>1. Warehouse</span>
              <span className={currentStep >= 2 ? styles.activeStep : ''}>2. Destination</span>
              <span className={currentStep >= 3 ? styles.activeStep : ''}>3. Items</span>
            </div>
          </div>

          <h1 className="gradient-text">Complete Your Shipment</h1>
          <p className={styles.subtitle}>Provide your details to get your unique India shipping address.</p>

          <div className={styles.addressSection}>
            <h3>1. India Warehouse (Drop-off Point)</h3>
            <div className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label>Select Origin City</label>
                <select 
                  value={selectedWarehouse} 
                  onChange={(e) => setSelectedWarehouse(e.target.value)}
                  className="glass"
                >
                  <option value="" disabled>Select India Warehouse</option>
                  {warehouses.map(wh => <option key={wh.id} value={wh.id}>{wh.city}</option>)}
                </select>
              </div>

              {selectedWarehouse && (
                <div className={`${styles.previewCard} animate-in`} style={{ gridColumn: 'span 2' }}>
                  <div className={styles.previewBadge}>Preview of your Virtual Address</div>
                  <div className={styles.previewContent}>
                    <strong>{user?.user_metadata?.full_name || 'Your Name'} / LAYO-{user?.id?.substr(0, 5).toUpperCase() || '5592'}</strong><br/>
                    {warehouses.find(w => w.id === selectedWarehouse)?.address}, {warehouses.find(w => w.id === selectedWarehouse)?.city}
                  </div>
                  <p style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.5rem' }}>Full address details will be shared after checkout.</p>
                </div>
              )}
            </div>
          </div>

          <div className={styles.divider}></div>

          <div className={styles.addressSection}>
            <h3>2. Delivery Destination (Canada)</h3>
            <div className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label>Destination City</label>
                <select 
                  value={destinationCity} 
                  onChange={(e) => setDestinationCity(e.target.value)}
                  className="glass"
                >
                  <option value="" disabled>Select region</option>
                  {canadaCities.map(city => <option key={city} value={city}>{city}</option>)}
                </select>
              </div>
              <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                <label>Full Delivery Address</label>
                <input 
                  type="text" 
                  placeholder="Street address, Apt, Postal Code"
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  className="glass"
                />
              </div>
            </div>
          </div>

          <div className={styles.divider}></div>

          <div className={styles.addressSection}>
            <h3>3. Indian Order Reference (Optional)</h3>
            <div className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label>E-commerce Order ID</label>
                <input 
                  type="text" 
                  placeholder="e.g. 405-1234567"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="glass"
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Tracking Number (if known)</label>
                <input 
                  type="text" 
                  placeholder="e.g. DELHIVERY12345"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="glass"
                />
              </div>
            </div>
          </div>

          <div className={styles.divider}></div>

          <div className={styles.selectionGrid}>
            <div className={styles.addItemForm}>
              <h3>3. Add Items to Ship</h3>
              <div className={styles.formGrid} style={{ marginBottom: '1.5rem' }}>
                <div className={styles.inputGroup}>
                  <label>Category</label>
                  <select 
                    value={currentCategory} 
                    onChange={(e) => {
                      setCurrentCategory(e.target.value);
                      setCurrentSubcategory('');
                    }}
                    className="glass"
                  >
                    <option value="" disabled>Select category</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label>Sub-category</label>
                  <select 
                    value={currentSubcategory} 
                    onChange={(e) => setCurrentSubcategory(e.target.value)}
                    className="glass"
                    disabled={!currentCategory}
                  >
                    <option value="" disabled>Select sub-category</option>
                    {subcategories.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label>Quantity</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={currentQuantity || ''}
                    onChange={(e) => setCurrentQuantity(e.target.value === '' ? 0 : parseInt(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="glass"
                  />
                </div>
              </div>
              <button 
                className={styles.addBtn} 
                onClick={addItem}
                disabled={!currentCategory || !currentSubcategory || !currentQuantity}
              >
                {items.length > 0 ? '+ Add more items' : '+ Add Item'}
              </button>
            </div>

            <div className={styles.itemsList}>
              <h3>Items in Shipment</h3>
              {items.length === 0 ? (
                <p className={styles.emptyMsg}>No items added yet.</p>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Weight</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id}>
                        <td>
                          <div className={styles.itemName}>{item.subcategory}</div>
                          <div className={styles.itemCat}>{item.category}</div>
                        </td>
                        <td>
                          <input 
                            type="number" 
                            min="1" 
                            value={item.quantity || ''}
                            onChange={(e) => updateItemQuantity(item.id, e.target.value === '' ? 0 : parseInt(e.target.value))}
                            onFocus={(e) => e.target.select()}
                            style={{ 
                              width: '60px', 
                              background: 'rgba(255,255,255,0.05)', 
                              border: '1px solid var(--glass-border)', 
                              color: '#fff', 
                              padding: '4px 8px', 
                              borderRadius: '4px',
                              outline: 'none'
                            }}
                          />
                        </td>
                        <td>{item.weight.toFixed(1)} kg</td>
                        <td>
                          <button onClick={() => removeItem(item.id)} className={styles.removeBtn}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            </>
          )}
        </div>

        <aside className={styles.quoteSidebar}>
          <div className={`${styles.quoteCard} glass`}>
            <h3>Shipment Summary</h3>
            <div className={styles.summaryItem}>
              <span>Total Items</span>
              <span>{items.reduce((sum, i) => sum + i.quantity, 0)}</span>
            </div>
            <div className={styles.summaryItem}>
              <span>Total Weight</span>
              <span>{totals.weight} kg</span>
            </div>
            
            <div className={styles.divider}></div>
            
            <div className={styles.totalSection}>
              <span>Estimated Cost</span>
              <span className={styles.price}>{items.length > 0 ? `₹${totals.rate}` : '---'}</span>
            </div>
            
            <button 
              className={styles.checkoutBtn} 
              disabled={items.length === 0 || !destinationCity || !destinationAddress || !selectedWarehouse}
              onClick={handleCheckout}
            >
              Secure Checkout
            </button>
            
            <div className={styles.safetyBadge}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              End-to-End Encrypted & Insured
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
