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
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parsingProgress, setParsingProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadedFiles([...uploadedFiles, ...files]);
      
      // Simulate AI Parsing
      setIsParsing(true);
      setParsingProgress(0);
    }
  };

  useEffect(() => {
    if (isParsing) {
      const interval = setInterval(() => {
        setParsingProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              setIsParsing(false);
              // Mock extracted items
              const mockItems: Item[] = [
                { id: 'm1', category: 'Clothing', subcategory: 'T-Shirts', quantity: 5, weight: 1.0 },
                { id: 'm2', category: 'Clothing', subcategory: 'Jeans/Denim', quantity: 2, weight: 1.75 }
              ];
              setItems(mockItems);
            }, 500);
            return 100;
          }
          return prev + 5;
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isParsing]);

  const totals = useMemo(() => {
    const weight = items.reduce((sum, item) => sum + item.weight, 0);
    // Rate: ₹3000 per kg as per proposal
    const rate = Math.ceil(weight * 3000);
    return { weight: weight.toFixed(2), rate: rate.toLocaleString() };
  }, [items]);

  const isCheckoutDisabled = useMemo(() => {
    if (isParsing) return true;
    if (mode === 'selection') return items.length === 0 || !destinationCity || !destinationAddress;
    if (mode === 'scan') return uploadedFiles.length === 0 || !destinationCity || !destinationAddress;
    return !destinationCity || !destinationAddress;
  }, [mode, items, uploadedFiles, destinationCity, destinationAddress, isParsing]);

  const handleCheckout = () => {
    const shipmentData = {
      items,
      mode,
      destinationCity,
      destinationAddress,
      totalWeight: totals.weight,
      totalCost: totals.rate
    };
    localStorage.setItem('layo_pending_shipment', JSON.stringify(shipmentData));
    router.push('/checkout');
  };

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <a href="/" style={{ textDecoration: 'none' }}>
          <Logo showTagline={false} />
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {user && (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              Welcome, <strong>{user.user_metadata?.full_name || user.email}</strong>
            </span>
          )}
          <button 
            onClick={() => supabase.auth.signOut()}
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid var(--glass-border)', 
              color: '#fff', 
              padding: '0.5rem 1rem', 
              borderRadius: '8px', 
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      <section className={styles.content}>
        <div className={styles.selectionArea}>
          <h1 className="gradient-text">Create Shipment</h1>
          <p className={styles.subtitle}>Choose your preferred way to ship goods from India to Canada.</p>

          <div className={styles.modeSwitcher}>
            <button 
              className={`${styles.modeTab} ${mode === 'selection' ? styles.modeTabActive : ''}`}
              onClick={() => { setMode('selection'); setItems([]); }}
            >
              <span>📦</span> Selection Flow
            </button>
            <button 
              className={`${styles.modeTab} ${mode === 'whatsapp' ? styles.modeTabActive : ''}`}
              onClick={() => { setMode('whatsapp'); setItems([]); }}
            >
              <span>💬</span> WhatsApp Concierge
            </button>
            <button 
              className={`${styles.modeTab} ${mode === 'scan' ? styles.modeTabActive : ''}`}
              onClick={() => { setMode('scan'); setItems([]); }}
            >
              <span>📄</span> Scan & Ship
            </button>
          </div>

          <div className={styles.addressSection}>
            <h3>1. Delivery Destination (Canada)</h3>
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

          {mode === 'selection' && (
            <div className="animate-in">
              <h3>2. Add Items to Ship</h3>
              <div className={styles.addItemForm}>
                <div className={styles.formGrid}>
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
                      value={currentQuantity}
                      onChange={(e) => setCurrentQuantity(parseInt(e.target.value) || 1)}
                      className="glass"
                    />
                  </div>
                </div>
                <button 
                  className={styles.addBtn} 
                  onClick={addItem}
                  disabled={!currentCategory || !currentSubcategory}
                >
                  + Add Item
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
                        <th>Est. Weight</th>
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
                          <td>{item.quantity}</td>
                          <td>{item.weight.toFixed(2)} kg</td>
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
          )}

          {mode === 'whatsapp' && (
            <div className={styles.whatsappFlow}>
              <div className={styles.waIconWrapper}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.631 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </div>
              <h2>WhatsApp Concierge</h2>
              <p>Experience our white-glove service. Just share product links or photos via WhatsApp and we'll handle the rest.</p>
              
              <div className={styles.steps}>
                <div className={styles.step}>
                  <div className={styles.stepNumber}>1</div>
                  <strong>Share Details</strong>
                  <span>Send links or photos of items you want to ship.</span>
                </div>
                <div className={styles.step}>
                  <div className={styles.stepNumber}>2</div>
                  <strong>Review Quote</strong>
                  <span>We extract details and send you an instant shipment link.</span>
                </div>
                <div className={styles.step}>
                  <div className={styles.stepNumber}>3</div>
                  <strong>Confirm & Pay</strong>
                  <span>Review the items and proceed to secure checkout.</span>
                </div>
              </div>

              <a href="https://wa.me/919774581632" target="_blank" className={styles.waMainBtn}>
                Start WhatsApp Chat
              </a>
            </div>
          )}

          {mode === 'scan' && (
            <div className={styles.scanFlow}>
              <div 
                className={`${styles.dropzone} ${isParsing ? styles.dropzoneDisabled : ''}`}
                onClick={() => !isParsing && fileInputRef.current?.click()}
              >
                <div className={styles.uploadIcon}>
                  {isParsing ? (
                    <div className={styles.loader}></div>
                  ) : (
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                    </svg>
                  )}
                </div>
                <h3>{isParsing ? `Analyzing Documents... ${parsingProgress}%` : 'Upload Invoice or Delivery Details'}</h3>
                <p>{isParsing ? 'Our AI is extracting weight and customs data.' : 'Drag and drop your PDF or images here, or click to browse.'}</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  style={{ display: 'none' }} 
                  multiple 
                  accept="image/*,.pdf"
                  disabled={isParsing}
                />
              </div>

              {uploadedFiles.length > 0 && !isParsing && (
                <div className={styles.fileList}>
                  <h4>Uploaded Files ({uploadedFiles.length})</h4>
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className={styles.fileItem}>
                      <span>📄 {file.name}</span>
                      <small>{(file.size / 1024).toFixed(1)} KB</small>
                    </div>
                  ))}
                  <div className={styles.extractionResult}>
                    <span>✨ AI Extraction Complete: 2 items found</span>
                  </div>
                </div>
              )}
              
              {items.length > 0 && mode === 'scan' && !isParsing && (
                <div className={styles.itemsList} style={{ marginTop: '2rem' }}>
                  <h3>Extracted Items</h3>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Est. Weight</th>
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
                          <td>{item.quantity}</td>
                          <td>{item.weight.toFixed(2)} kg</td>
                          <td>
                            <button onClick={() => removeItem(item.id)} className={styles.removeBtn}>×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className={styles.quoteSidebar}>
          <div className={`${styles.quoteCard} glass`}>
            <h3>Shipment Summary</h3>
            <div className={styles.summaryItem}>
              <span>Shipping Mode</span>
              <span style={{ textTransform: 'capitalize' }}>{mode}</span>
            </div>
            
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
              disabled={isCheckoutDisabled}
              onClick={handleCheckout}
            >
              {isParsing ? 'Processing...' : mode === 'whatsapp' ? 'Connect WhatsApp' : 'Secure Checkout'}
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
