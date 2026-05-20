'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  ageGroup: string;
  pricePaidINR?: number;
}

type ShipmentMode = 'selection' | 'whatsapp' | 'scan';
type OriginType = 'online' | 'personal';

export default function Dashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  
  const [mode, setMode] = useState<ShipmentMode>('selection');
  const [items, setItems] = useState<Item[]>([]);
  const [currentCategory, setCurrentCategory] = useState('');
  const [currentSubcategory, setCurrentSubcategory] = useState('');
  const [currentAgeGroup, setCurrentAgeGroup] = useState('Adults');
  const [currentPriceINR, setCurrentPriceINR] = useState<number | ''>('');
  const [currentQuantity, setCurrentQuantity] = useState(1);
  
  // Custom enhanced states
  const [showOrderNumberError, setShowOrderNumberError] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [warehouseAction, setWarehouseAction] = useState<'ship' | 'hold' | null>(null);
  const [morePackages, setMorePackages] = useState<number | null>(null);
  const [tempAction, setTempAction] = useState<'ship' | 'hold' | null>(null);
  const [tempMore, setTempMore] = useState<number | null>(null);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  
  const [originType, setOriginType] = useState<OriginType>('online');
  const [storeName, setStoreName] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [senderName, setSenderName] = useState('');
  const [originCity, setOriginCity] = useState('');

  const [destinationCity, setDestinationCity] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [shipments, setShipments] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      fetchDashboardData();
    }
  }, [user, loading, router]);

  const fetchDashboardData = async () => {
    setIsFetching(true);
    try {
      const [ships, whs] = await Promise.all([
        supabase.from('shipments').select('*').order('created_at', { ascending: false }),
        supabase.from('warehouses').select('*')
      ]);
      
      if (ships.data) setShipments(ships.data);
      if (whs.data) {
        setWarehouses(whs.data);
      } else {
        setWarehouses([
          { id: 'wh1', city: 'Delhi', pincode: '110001', address: 'Plot 42, Layo Hub, Okhla Phase 3' },
          { id: 'wh2', city: 'Mumbai', pincode: '400001', address: 'Gala 5, Hub 2, Andheri East' }
        ]);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data from Supabase:", err);
      // Fallback data when offline/unreachable
      setWarehouses([
        { id: 'wh1', city: 'Delhi', pincode: '110001', address: 'Plot 42, Layo Hub, Okhla Phase 3' },
        { id: 'wh2', city: 'Mumbai', pincode: '400001', address: 'Gala 5, Hub 2, Andheri East' }
      ]);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (selectedWarehouse && currentStep === 1) setCurrentStep(2);
    if (destinationCity && destinationAddress && currentStep === 2) setCurrentStep(3);
  }, [selectedWarehouse, destinationCity, destinationAddress, currentStep]);

  const canadaCities = ['Toronto (GTA)', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton', 'Winnipeg'];
  const ageGroups = ['Baby/Toddler (0-4)', 'Growing Kids', 'Teens', 'Adults'];

  const ACCESSORY_KEY = 'Small Accessories (Socks, Innerwear, Ties, Light Towels)';
  const ACCESSORY_PAID_WEIGHT = 0.050; // kg from the 6th unit onward

  const addItem = () => {
    if (!currentCategory || !currentSubcategory || currentQuantity < 1) return;
    const unitWeight = shippingData[currentCategory][currentSubcategory];
    const newItem: Item = {
      id: Math.random().toString(36).substr(2, 9),
      category: currentCategory,
      subcategory: currentSubcategory,
      quantity: currentQuantity,
      weight: unitWeight * currentQuantity,
      ageGroup: currentAgeGroup,
      pricePaidINR: currentPriceINR === '' ? undefined : currentPriceINR
    };
    setItems([...items, newItem]);
    setCurrentSubcategory('');
    setCurrentPriceINR('');
    setCurrentQuantity(1);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItemQuantity = (id: string, newQty: number) => {
    if (newQty < 1) return;
    setItems(items.map(item => {
      if (item.id === id) {
        const unitWeight = shippingData[item.category][item.subcategory];
        return { ...item, quantity: newQty, weight: unitWeight * newQty };
      }
      return item;
    }));
  };

  const getItemWeight = (item: Item) => {
    let unitWeight = shippingData[item.category]?.[item.subcategory] || 0.2;
    if (item.subcategory.includes("Small Accessories")) {
      const accessoriesBefore = items
        .slice(0, items.findIndex(i => i.id === item.id))
        .filter(i => i.subcategory.includes("Small Accessories"))
        .reduce((sum, i) => sum + i.quantity, 0);
      
      let itemWeight = 0;
      for (let q = 0; q < item.quantity; q++) {
        const currentCount = accessoriesBefore + q + 1;
        if (currentCount > 5) {
          itemWeight += 0.05;
        } else {
          itemWeight += 0;
        }
      }
      return itemWeight;
    }
    return unitWeight * item.quantity;
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setOrderNumber(text);
      setShowOrderNumberError(false);
      if (storeName && text && currentStep === 1) setCurrentStep(2);
    } catch (err) {
      console.error('Failed to read clipboard', err);
    }
  };

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const isFormIncomplete = items.length > 0 || storeName || senderName || selectedWarehouse || destinationAddress;
    if (isFormIncomplete) {
      e.preventDefault();
      setShowDraftModal(true);
    }
  };

  const totals = useMemo(() => {
    let totalWeight = 0;
    let smallAccessoriesCount = 0;
    const ACCESSORY_KEY = 'Small Accessories (Socks, Innerwear, Ties, Light Towels)';

    items.forEach(item => {
      const baseWeight = shippingData[item.category]?.[item.subcategory] ?? 0.2;
      if (item.subcategory === ACCESSORY_KEY) {
        // First 5 units across ALL accessory items = 0g. From 6th = 0.050kg each.
        let itemWeight = 0;
        for (let q = 0; q < item.quantity; q++) {
          smallAccessoriesCount++;
          itemWeight += smallAccessoriesCount > 5 ? 0.050 : 0;
        }
        totalWeight += itemWeight;
      } else {
        totalWeight += baseWeight * item.quantity;
      }
    });

    // Unified Shipping Estimate in CAD — $45 CAD/kg (internal rate, never shown as breakdown)
    const rateCAD = +(totalWeight * 45).toFixed(2);
    
    // Savings Calculator: INR price entered → compare to Canadian retail (5x markup assumption)
    const totalSpentINR = items.reduce((sum, i) => sum + (i.pricePaidINR || 0) * i.quantity, 0);
    const spentCAD = totalSpentINR / 83; // ~83 INR per CAD
    const canadaRetailCAD = spentCAD * 5;
    const valueReclaimed = Math.max(0, canadaRetailCAD - spentCAD - rateCAD);

    return {
      weight: totalWeight.toFixed(2),
      rateCAD: rateCAD.toFixed(2),
      rateDisplay: rateCAD > 0 ? `$${rateCAD.toFixed(2)} CAD` : '---',
      valueReclaimed: valueReclaimed > 0 ? valueReclaimed.toFixed(0) : '0',
    };
  }, [items]);

  const handleCheckout = () => {
    if (originType === 'online' && !orderNumber.trim()) {
      setShowOrderNumberError(true);
      const el = document.getElementById('orderNumberField');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const shipmentData = {
      items,
      mode,
      originType,
      storeName,
      orderNumber,
      senderName,
      originCity,
      destinationCity,
      destinationAddress,
      indiaWarehouse: selectedWarehouse,
      totalWeight: totals.weight,
      totalCostCAD: totals.rateCAD,
      valueReclaimed: totals.valueReclaimed,
      warehouseAction,
      morePackages
    };
    localStorage.setItem('layo_pending_shipment', JSON.stringify(shipmentData));
    router.push('/checkout');
  };

  const categories = Object.keys(shippingData);
  const subcategories = currentCategory ? Object.keys(shippingData[currentCategory]) : [];

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <Logo showTagline={false} onClick={handleLogoClick} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link href="/" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textDecoration: 'none' }}>Home</Link>
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
              <h1 className="gradient-text">My Shipments</h1>
              <p className={styles.subtitle}>Track all your booked and drafted packages in real time.</p>
              
              {shipments.length === 0 ? (
                <div className={styles.emptyHistory}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
                  <h3>No shipments yet</h3>
                  <p>Your booked and drafted packages will appear here.</p>
                  <button onClick={() => setActiveTab('new')} className={styles.addBtn} style={{ marginTop: '1.5rem' }}>
                    Book First Shipment
                  </button>
                </div>
              ) : (
                <div className={styles.historyGrid}>
                  {shipments.map((s) => {
                    const STEPS = ['draft', 'paid', 'arrived', 'shipped', 'delivered'];
                    const STEP_LABELS = ['Draft', 'Paid', 'In India', 'Shipped', 'Delivered'];
                    const STATUS_COLORS: Record<string,string> = { draft:'#64748b', paid:'#f59e0b', arrived:'#8b5cf6', shipped:'#3b82f6', delivered:'#10b981' };
                    const currentIdx = STEPS.indexOf(s.status?.toLowerCase?.() ?? '');
                    return (
                      <div key={s.id} className={`${styles.historyCard} glass`}>
                        <div className={styles.cardHeader}>
                          <span
                            className={styles.statusBadge}
                            style={{ background: `${STATUS_COLORS[s.status?.toLowerCase?.()] ?? '#64748b'}22`, color: STATUS_COLORS[s.status?.toLowerCase?.()] ?? '#64748b' }}
                          >
                            {s.status}
                          </span>
                          <span className={styles.date}>{new Date(s.created_at).toLocaleDateString()}</span>
                        </div>

                        {/* 5-step mini tracker */}
                        <div className={styles.miniTracker}>
                          {STEPS.map((st, i) => (
                            <div key={st} className={styles.miniStep}>
                              <div
                                className={styles.miniDot}
                                style={{
                                  background: i <= currentIdx ? (STATUS_COLORS[s.status?.toLowerCase?.()] ?? '#64748b') : '#1e293b',
                                  boxShadow: i === currentIdx ? `0 0 8px ${STATUS_COLORS[s.status?.toLowerCase?.()] ?? '#64748b'}` : 'none',
                                }}
                              />
                              {i < STEPS.length - 1 && (
                                <div
                                  className={styles.miniLine}
                                  style={{ background: i < currentIdx ? (STATUS_COLORS[s.status?.toLowerCase?.()] ?? '#64748b') : '#1e293b' }}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                        <div className={styles.miniStepLabels}>
                          {STEP_LABELS.map((lbl, i) => (
                            <span key={lbl} style={{ color: i <= currentIdx ? '#e2e8f0' : '#475569' }}>{lbl}</span>
                          ))}
                        </div>

                        <div className={styles.cardBody}>
                          <h3>→ {s.destination_city || 'Canada'}</h3>
                          <p>{s.destination_address}</p>
                          <div className={styles.cardMeta}>
                            <span>⚖️ {s.total_weight} kg</span>
                            <span>💰 ${s.total_cost_cad || s.total_cost} CAD</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className={styles.progressContainer}>
                <div className={styles.progressBar} style={{ width: `${(currentStep / 4) * 100}%` }}></div>
                <div className={styles.stepLabels}>
                  <span className={currentStep >= 1 ? styles.activeStep : ''}>1. Origin</span>
                  <span className={currentStep >= 2 ? styles.activeStep : ''}>2. Warehouse</span>
                  <span className={currentStep >= 3 ? styles.activeStep : ''}>3. Destination</span>
                  <span className={currentStep >= 4 ? styles.activeStep : ''}>4. Items</span>
                </div>
              </div>

              <h1 className="gradient-text">Complete Your Shipment</h1>
              <p className={styles.subtitle}>Provide your details to get your unique India shipping address.</p>

              <div className={styles.addressSection}>
                <h3>1. Package Origin (Source Selection)</h3>
                <div className={styles.radioGrid}>
                  <label className={`${styles.radioLabel} ${originType === 'online' ? styles.radioActive : ''}`}>
                    <input type="radio" name="origin" checked={originType === 'online'} onChange={() => { setOriginType('online'); if (currentStep === 1) setCurrentStep(1); }} />
                    Online Store
                  </label>
                  <label className={`${styles.radioLabel} ${originType === 'personal' ? styles.radioActive : ''}`}>
                    <input type="radio" name="origin" checked={originType === 'personal'} onChange={() => { setOriginType('personal'); if (currentStep === 1) setCurrentStep(1); }} />
                    Personal / Home
                  </label>
                </div>

                <div className={styles.formGrid} style={{ marginTop: '1.5rem' }}>
                  {originType === 'online' ? (
                    <>
                      <div className={styles.inputGroup}>
                        <label>Store Name</label>
                        <input 
                          type="text" 
                          placeholder="Amazon, Myntra, etc."
                          value={storeName}
                          onChange={(e) => {
                            setStoreName(e.target.value);
                            if (e.target.value && orderNumber && currentStep === 1) setCurrentStep(2);
                          }}
                          className="glass"
                        />
                      </div>
                      <div className={styles.inputGroup} id="orderNumberField">
                        <label>Order Number</label>
                        <div style={{ position: 'relative' }}>
                          <input 
                            type="text" 
                            placeholder="Order ID"
                            value={orderNumber}
                            onChange={(e) => {
                              setOrderNumber(e.target.value);
                              setShowOrderNumberError(false);
                              if (storeName && e.target.value && currentStep === 1) setCurrentStep(2);
                            }}
                            className={`glass ${showOrderNumberError ? styles.inputError : ''}`}
                            style={{ paddingRight: '45px' }}
                          />
                          <button 
                            type="button" 
                            onClick={handlePaste}
                            className={styles.pasteBtn}
                            title="Paste from clipboard"
                            style={{
                              position: 'absolute',
                              right: '8px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              color: '#facc15',
                              cursor: 'pointer',
                              fontSize: '1.1rem',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s'
                            }}
                          >
                            📋
                          </button>
                        </div>
                        {showOrderNumberError && (
                          <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', textTransform: 'none' }}>
                            Please paste your Order Number so our warehouse can instantly identify your package when it arrives.
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={styles.inputGroup}>
                        <label>Sender Name</label>
                        <input 
                          type="text" 
                          placeholder="Your Name"
                          value={senderName}
                          onChange={(e) => {
                            setSenderName(e.target.value);
                            if (e.target.value && originCity && currentStep === 1) setCurrentStep(2);
                          }}
                          className="glass"
                        />
                      </div>
                      <div className={styles.inputGroup}>
                        <label>Origin City</label>
                        <input 
                          type="text" 
                          placeholder="City Name"
                          value={originCity}
                          onChange={(e) => {
                            setOriginCity(e.target.value);
                            if (senderName && e.target.value && currentStep === 1) setCurrentStep(2);
                          }}
                          className="glass"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className={styles.divider}></div>

              <div className={styles.addressSection}>
                <h3>2. India Warehouse (Drop-off Point)</h3>
                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}>
                    <label>Select Origin City</label>
                    <select 
                      value={selectedWarehouse} 
                      onChange={(e) => {
                        setSelectedWarehouse(e.target.value);
                        if (currentStep === 2) setCurrentStep(3);
                      }}
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
                <h3>3. Delivery Destination (Canada)</h3>
                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}>
                    <label>Destination City</label>
                    <select 
                      value={destinationCity} 
                      onChange={(e) => {
                        setDestinationCity(e.target.value);
                        if (destinationAddress && currentStep === 3) setCurrentStep(4);
                      }}
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
                      onChange={(e) => {
                        setDestinationAddress(e.target.value);
                        if (destinationCity && e.target.value && currentStep === 3) setCurrentStep(4);
                      }}
                      className="glass"
                    />
                  </div>
                </div>
              </div>

              <div className={styles.divider}></div>

              <div className={styles.selectionGrid}>
                <div className={styles.addItemForm}>
                  <h3>4. Add Items to Ship</h3>
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
                      <label>Age Group</label>
                      <select 
                        value={currentAgeGroup} 
                        onChange={(e) => setCurrentAgeGroup(e.target.value)}
                        className="glass"
                      >
                        {ageGroups.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>

                    <div className={styles.inputGroup}>
                      <label>Price Paid (INR) <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>(Optional)</span></label>
                      <input 
                        type="number" 
                        placeholder="e.g. 1500"
                        value={currentPriceINR}
                        onChange={(e) => setCurrentPriceINR(e.target.value === '' ? '' : parseInt(e.target.value))}
                        className="glass"
                      />
                      <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '0.25rem 0 0', lineHeight: 1.4 }}>
                        Enter this to see how much you are saving compared to Canadian prices!
                      </p>
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
                              <div className={styles.itemCat}>{item.category} • {item.ageGroup}</div>
                            </td>
                            <td>
                              <input 
                                type="number" 
                                min="1" 
                                value={item.quantity || ''}
                                onChange={(e) => updateItemQuantity(item.id, e.target.value === '' ? 0 : parseInt(e.target.value))}
                                onFocus={(e) => e.target.select()}
                                className={styles.qtyInput}
                              />
                            </td>
                            <td>{getItemWeight(item).toFixed(2)} kg</td>
                            <td>
                              <button onClick={() => removeItem(item.id)} className={styles.removeBtn}>×</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <aside className={styles.quoteSidebar}>
          {parseFloat(totals.valueReclaimed) > 0 && (
            <div className={styles.savingsBanner}>
              <div className={styles.savingsBadge}>Arbitrage Advantage</div>
              <p>Estimated Value Reclaimed: <strong>~${totals.valueReclaimed} CAD!</strong></p>
            </div>
          )}

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
              <span>Estimated Unified Shipping</span>
              <span className={styles.price}>{items.length > 0 ? totals.rateDisplay : '---'}</span>
            </div>
            
            <button 
              className={styles.checkoutBtn} 
              disabled={items.length === 0 || !destinationCity || !destinationAddress || !selectedWarehouse || !warehouseAction}
              onClick={handleCheckout}
            >
              Pay Deposit & Book
            </button>
            
            <div className={styles.consolidationCard}>
              <h4>Free 30-Day Hold & Combine</h4>
              <p>Shop at your own pace! We will hold up to 4 packages for free and ship them together to maximize your savings.</p>
              
              <div style={{ marginTop: '1rem' }}>
                {warehouseAction ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p style={{ fontSize: '0.85rem', color: '#facc15', margin: 0, fontWeight: 500 }}>
                      {warehouseAction === 'ship' 
                        ? 'Action: 🚀 Ship Immediately.' 
                        : `Action: 📦 Holding for ${morePackages} more package(s).`}
                    </p>
                    <button 
                      onClick={() => {
                        setTempAction(warehouseAction);
                        setTempMore(morePackages || 1);
                        setShowWarehouseModal(true);
                      }}
                      className={styles.setActionButton}
                      style={{
                        background: 'rgba(250, 204, 21, 0.15)',
                        border: '1px solid #facc15',
                        color: '#facc15',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        fontWeight: 500,
                        width: '100%'
                      }}
                    >
                      [ Edit ]
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setTempAction('ship');
                      setTempMore(1);
                      setShowWarehouseModal(true);
                    }}
                    className={styles.setActionButton}
                    style={{
                      background: '#facc15',
                      border: 'none',
                      color: '#0d2045',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                      width: '100%'
                    }}
                  >
                    [ Set Warehouse Action ]
                  </button>
                )}
              </div>
            </div>

            <div className={styles.safetyBadge}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              End-to-End Encrypted & Insured
            </div>
          </div>
        </aside>
      </section>

      {/* Warehouse Action Modal */}
      {showWarehouseModal && (
        <div className={styles.modalOverlay} onClick={() => setShowWarehouseModal(false)}>
          <div className={styles.calculatorCard} style={{ maxWidth: '500px', background: '#091530', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '2rem', borderRadius: '16px', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setShowWarehouseModal(false)} style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            
            <div className={styles.calcHeader}>
              <span className={styles.sectionLabel} style={{ color: '#facc15', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05rem' }}>Set Warehouse Action</span>
              <h2 className={styles.sectionTitle} style={{ fontSize: '1.75rem', marginTop: '0.5rem', color: '#fff' }}>Choose your shipping preference</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
              <div 
                onClick={() => setTempAction('ship')}
                style={{
                  padding: '1.25rem',
                  borderRadius: '12px',
                  border: `2px solid ${tempAction === 'ship' ? '#facc15' : 'rgba(255, 255, 255, 0.1)'}`,
                  background: tempAction === 'ship' ? 'rgba(250, 204, 21, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <h4 style={{ color: '#fff', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🚀 Ship it immediately
                </h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Don't wait. Send it to Canada as soon as the weight is verified.
                </p>
              </div>

              <div 
                onClick={() => setTempAction('hold')}
                style={{
                  padding: '1.25rem',
                  borderRadius: '12px',
                  border: `2px solid ${tempAction === 'hold' ? '#facc15' : 'rgba(255, 255, 255, 0.1)'}`,
                  background: tempAction === 'hold' ? 'rgba(250, 204, 21, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <h4 style={{ color: '#fff', margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📦 Hold & Combine (Free for 30 Days)
                </h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Wait for my other packages so they ship in one box to maximize savings.
                </p>
              </div>

              {tempAction === 'hold' && (
                <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: '#fff', fontWeight: 500 }}>
                    How many MORE packages are you waiting for?
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[1, 2, 3].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setTempMore(num)}
                        style={{
                          flex: 1,
                          padding: '0.5rem',
                          background: tempMore === num ? '#facc15' : 'rgba(255, 255, 255, 0.05)',
                          color: tempMore === num ? '#0d2045' : '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setWarehouseAction(tempAction);
                  setMorePackages(tempAction === 'hold' ? tempMore : null);
                  setShowWarehouseModal(false);
                }}
                className={styles.addBtn}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: '#facc15',
                  color: '#0d2045',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  marginTop: '1rem'
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draft Intercept Modal */}
      {showDraftModal && (
        <div className={styles.modalOverlay} onClick={() => setShowDraftModal(false)}>
          <div className={styles.calculatorCard} style={{ maxWidth: '500px', background: '#091530', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '2rem', borderRadius: '16px', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setShowDraftModal(false)} style={{ position: 'absolute', right: '1.5rem', top: '1.5rem', background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            <div className={styles.calcHeader}>
              <span className={styles.sectionLabel} style={{ color: '#facc15', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05rem' }}>Save Your Progress?</span>
              <h2 className={styles.sectionTitle} style={{ fontSize: '1.75rem', marginTop: '0.5rem', color: '#fff' }}>You haven't finished booking.</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: '1.6', marginTop: '1rem' }}>
              Save these details as a draft so you don't lose your work?
            </p>
            <div className={styles.modalActions} style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={async () => {
                  try {
                    const { data: { user: currentUser } } = await supabase.auth.getUser();
                    if (currentUser) {
                      await supabase.from('shipments').insert([
                        {
                          user_id: currentUser.id,
                          mode: mode,
                          destination_city: destinationCity || 'Draft City',
                          destination_address: destinationAddress || 'Draft Address',
                          india_warehouse: selectedWarehouse || null,
                          external_order_id: orderNumber || null,
                          total_weight: parseFloat(totals.weight),
                          total_cost: parseInt(totals.rateCAD.replace(/,/g, '')) * 60,
                          items: items,
                          status: 'Draft Estimate'
                        }
                      ]);
                    }
                  } catch (err) {
                    console.error("Error saving draft:", err);
                  }
                  localStorage.removeItem('layo_pending_shipment');
                  router.push('/');
                }}
                className={styles.addBtn}
                style={{ flex: 1, padding: '1rem', textAlign: 'center', justifyContent: 'center', background: '#facc15', color: '#0d2045', fontWeight: 'bold' }}
              >
                Save to Drafts
              </button>
              <button 
                onClick={() => {
                  localStorage.removeItem('layo_pending_shipment');
                  router.push('/');
                }}
                className={styles.signOutBtn}
                style={{ flex: 1, padding: '1rem', textAlign: 'center', justifyContent: 'center' }}
              >
                No, Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
