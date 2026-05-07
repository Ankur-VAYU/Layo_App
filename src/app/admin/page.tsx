'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './admin.module.css';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

export default function AdminPortal() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [shipments, setShipments] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  
  // New Warehouse Form
  const [newWH, setNewWH] = useState({ city: '', address: '', pincode: '', contact: '' });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      // In a real app, we'd check if user is an admin here
      fetchAllData();
    }
  }, [user, loading, router]);

  const fetchAllData = async () => {
    setIsFetching(true);
    
    const [ships, whs] = await Promise.all([
      supabase.from('shipments').select('*').order('created_at', { ascending: false }),
      supabase.from('warehouses').select('*')
    ]);

    if (ships.data) setShipments(ships.data);
    if (whs.data) setWarehouses(whs.data);
    
    setIsFetching(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('shipments')
      .update({ status })
      .eq('id', id);

    if (!error) {
      setShipments(shipments.map(s => s.id === id ? { ...s, status } : s));
    }
  };

  const addWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from('warehouses')
      .insert([newWH])
      .select();

    if (!error && data) {
      setWarehouses([...warehouses, data[0]]);
      setNewWH({ city: '', address: '', pincode: '', contact: '' });
    }
  };

  if (isFetching) return <div className={styles.loading}>Loading Admin Data...</div>;

  return (
    <main className={styles.container}>
      <header className={styles.header}>
        <Logo showTagline={false} />
        <div className={styles.badge}>ADMIN PORTAL</div>
      </header>

      <div className={styles.grid}>
        <section className={styles.main}>
          <div className={styles.sectionHeader}>
            <h2>Orders Management</h2>
            <button onClick={fetchAllData} className={styles.refreshBtn}>Refresh</button>
          </div>
          
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Destination</th>
                  <th>Weight</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map(s => (
                  <tr key={s.id}>
                    <td>{new Date(s.created_at).toLocaleDateString()}</td>
                    <td>{s.destination_city}</td>
                    <td>{s.total_weight} kg</td>
                    <td>
                      <span className={`${styles.status} ${styles[s.status]}`}>{s.status}</span>
                    </td>
                    <td>
                      <select 
                        value={s.status} 
                        onChange={(e) => updateStatus(s.id, e.target.value)}
                        className={styles.statusSelect}
                      >
                        <option value="paid">Paid</option>
                        <option value="arrived">Arrived at WH</option>
                        <option value="shipped">Shipped to Canada</option>
                        <option value="delivered">Delivered</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className={styles.sidebar}>
          <div className={styles.card}>
            <h3>Add New Warehouse</h3>
            <form onSubmit={addWarehouse} className={styles.form}>
              <input 
                placeholder="City (e.g. Pune)" 
                value={newWH.city} 
                onChange={e => setNewWH({...newWH, city: e.target.value})}
                required
              />
              <input 
                placeholder="Full Address" 
                value={newWH.address} 
                onChange={e => setNewWH({...newWH, address: e.target.value})}
                required
              />
              <input 
                placeholder="Pincode" 
                value={newWH.pincode} 
                onChange={e => setNewWH({...newWH, pincode: e.target.value})}
                required
              />
              <input 
                placeholder="Contact" 
                value={newWH.contact} 
                onChange={e => setNewWH({...newWH, contact: e.target.value})}
                required
              />
              <button type="submit">Add Warehouse</button>
            </form>
          </div>

          <div className={styles.card}>
            <h3>Active Warehouses</h3>
            <div className={styles.whList}>
              {warehouses.map(wh => (
                <div key={wh.id} className={styles.whItem}>
                  <strong>{wh.city}</strong>
                  <p>{wh.address}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
