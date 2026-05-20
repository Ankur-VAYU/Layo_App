'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './admin.module.css';
import Logo from '@/components/Logo';
import { supabase, fetchShipments } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

const STATUS_STEPS = ['draft', 'paid', 'arrived', 'shipped', 'delivered'];
const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft Estimate',
  paid: 'Estimate Paid',
  arrived: 'Received in India',
  shipped: 'Shipped to Canada',
  delivered: 'Delivered',
};
const STATUS_COLORS: Record<string, string> = {
  draft: '#64748b',
  paid: '#f59e0b',
  arrived: '#8b5cf6',
  shipped: '#3b82f6',
  delivered: '#10b981',
};

type AdminTab = 'orders' | 'warehouses' | 'analytics';

export default function AdminPortal() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>('orders');
  const [shipments, setShipments] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Warehouse form
  const [whForm, setWhForm] = useState({ city: '', address: '', pincode: '', contact: '' });
  const [whSaving, setWhSaving] = useState(false);
  const [deletingWH, setDeletingWH] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    else if (user) fetchAllData();
  }, [user, loading, router]);

  const fetchAllData = async () => {
    setIsFetching(true);
    const [shipsResult, whs] = await Promise.all([
      fetchShipments(),
      supabase.from('warehouses').select('*').order('created_at', { ascending: true }),
    ]);
    if (shipsResult.data) setShipments(shipsResult.data);
    if (whs.data) setWarehouses(whs.data);
    setIsFetching(false);
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    const { error } = await supabase.from('shipments').update({ status }).eq('id', id);
    if (!error) setShipments(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    setUpdatingId(null);
  };

  const addWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setWhSaving(true);
    const { data, error } = await supabase.from('warehouses').insert([whForm]).select();
    if (!error && data) {
      setWarehouses(prev => [...prev, data[0]]);
      setWhForm({ city: '', address: '', pincode: '', contact: '' });
    }
    setWhSaving(false);
  };

  const deleteWarehouse = async (id: string) => {
    if (!confirm('Delete this warehouse? This cannot be undone.')) return;
    setDeletingWH(id);
    const { error } = await supabase.from('warehouses').delete().eq('id', id);
    if (!error) setWarehouses(prev => prev.filter(w => w.id !== id));
    setDeletingWH(null);
  };

  const filteredShipments = useMemo(() => {
    return shipments.filter(s => {
      const matchesSearch =
        !searchQuery ||
        s.destination_city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.destination_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.id?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [shipments, searchQuery, statusFilter]);

  // Analytics
  const stats = useMemo(() => {
    const total = shipments.length;
    const totalWeight = shipments.reduce((s, o) => s + (parseFloat(o.total_weight) || 0), 0);
    const totalRevenue = shipments.reduce((s, o) => s + (parseInt(o.total_cost) || 0), 0);
    const byStatus = STATUS_STEPS.reduce((acc, st) => {
      acc[st] = shipments.filter(s => s.status === st).length;
      return acc;
    }, {} as Record<string, number>);
    return { total, totalWeight, totalRevenue, byStatus };
  }, [shipments]);

  if (loading || isFetching) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner}></div>
        <p>Loading Admin Portal…</p>
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      {/* ── Sidebar ── */}
      <nav className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <Logo showTagline={false} />
          <span className={styles.adminBadge}>ADMIN</span>
        </div>

        <div className={styles.navSection}>
          <p className={styles.navLabel}>Main Menu</p>
          {(
            [
              { id: 'orders',     icon: '📦', label: 'Orders' },
              { id: 'warehouses', icon: '🏭', label: 'Warehouses' },
              { id: 'analytics',  icon: '📊', label: 'Analytics' },
            ] as { id: AdminTab; icon: string; label: string }[]
          ).map(item => (
            <button
              key={item.id}
              className={`${styles.navItem} ${activeTab === item.id ? styles.navActive : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        <div className={styles.navSection}>
          <p className={styles.navLabel}>Quick Links</p>
          <Link href="/dashboard" className={styles.navItem}>
            <span className={styles.navIcon}>🏠</span> Customer Dashboard
          </Link>
          <button className={styles.navItem} onClick={() => supabase.auth.signOut()}>
            <span className={styles.navIcon}>🚪</span> Sign Out
          </button>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className={styles.main}>
        {/* Stats Row */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total Orders</span>
            <span className={styles.statValue}>{stats.total}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total Weight Shipped</span>
            <span className={styles.statValue}>{stats.totalWeight.toFixed(1)} kg</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Revenue (Deposits)</span>
            <span className={styles.statValue}>₹{stats.totalRevenue.toLocaleString()}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Active Warehouses</span>
            <span className={styles.statValue}>{warehouses.length}</span>
          </div>
        </div>

        {/* ──────────── ORDERS ──────────── */}
        {activeTab === 'orders' && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Orders Management</h2>
              <button className={styles.refreshBtn} onClick={fetchAllData}>↻ Refresh</button>
            </div>

            {/* Filters */}
            <div className={styles.filters}>
              <input
                className={styles.searchInput}
                placeholder="Search by city, address or order ID…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                {STATUS_STEPS.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              <span className={styles.resultCount}>{filteredShipments.length} orders</span>
            </div>

            {filteredShipments.length === 0 ? (
              <div className={styles.emptyState}>
                <span>📭</span>
                <p>No orders match your filters.</p>
              </div>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Destination</th>
                      <th>Weight</th>
                      <th>Cost</th>
                      <th>Status</th>
                      <th>Update Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredShipments.map(s => (
                      <>
                        <tr
                          key={s.id}
                          className={expandedRow === s.id ? styles.rowExpanded : ''}
                        >
                          <td>{new Date(s.created_at).toLocaleDateString('en-IN')}</td>
                          <td>
                            <strong>{s.destination_city}</strong>
                            <div className={styles.subtext}>{s.destination_address?.slice(0, 40)}…</div>
                          </td>
                          <td>{s.total_weight} kg</td>
                          <td>₹{parseInt(s.total_cost || 0).toLocaleString()}</td>
                          <td>
                            <span
                              className={styles.statusPill}
                              style={{ background: `${STATUS_COLORS[s.status]}22`, color: STATUS_COLORS[s.status] }}
                            >
                              {STATUS_LABELS[s.status] || s.status}
                            </span>
                          </td>
                          <td>
                            <select
                              value={s.status}
                              onChange={e => updateStatus(s.id, e.target.value)}
                              className={styles.statusSelect}
                              disabled={updatingId === s.id}
                            >
                              {STATUS_STEPS.map(st => (
                                <option key={st} value={st}>{STATUS_LABELS[st]}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <button
                              className={styles.expandBtn}
                              onClick={() => setExpandedRow(expandedRow === s.id ? null : s.id)}
                            >
                              {expandedRow === s.id ? '▲' : '▼'}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Detail Row */}
                        {expandedRow === s.id && (
                          <tr key={`${s.id}-detail`} className={styles.detailRow}>
                            <td colSpan={7}>
                              <div className={styles.detailGrid}>
                                {/* Status Tracker */}
                                <div className={styles.detailBlock}>
                                  <h4>5-Step Shipment Tracker</h4>
                                  <div className={styles.tracker}>
                                    {STATUS_STEPS.map((st, i) => {
                                      const currentIdx = STATUS_STEPS.indexOf(s.status);
                                      const done = i <= currentIdx;
                                      const active = i === currentIdx;
                                      return (
                                        <div key={st} className={styles.trackerStep}>
                                          <div
                                            className={styles.trackerDot}
                                            style={{
                                              background: done ? STATUS_COLORS[s.status] : '#1e293b',
                                              border: `2px solid ${done ? STATUS_COLORS[s.status] : '#334155'}`,
                                              boxShadow: active ? `0 0 12px ${STATUS_COLORS[s.status]}` : 'none',
                                            }}
                                          >
                                            {done && '✓'}
                                          </div>
                                          <span style={{ color: done ? '#fff' : '#475569', fontSize: '0.75rem' }}>
                                            {STATUS_LABELS[st]}
                                          </span>
                                          {i < STATUS_STEPS.length - 1 && (
                                            <div
                                              className={styles.trackerLine}
                                              style={{ background: i < currentIdx ? STATUS_COLORS[s.status] : '#1e293b' }}
                                            />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Order Info */}
                                <div className={styles.detailBlock}>
                                  <h4>Order Details</h4>
                                  <table className={styles.infoTable}>
                                    <tbody>
                                      <tr><td>Order ID</td><td><code>{s.id.slice(0, 8)}…</code></td></tr>
                                      <tr><td>Payment Method</td><td>{s.payment_method || '—'}</td></tr>
                                      <tr><td>Warehouse</td><td>{s.india_warehouse || '—'}</td></tr>
                                      <tr><td>Origin Order ID</td><td>{s.external_order_id || '—'}</td></tr>
                                      <tr><td>Tracking No.</td><td>{s.external_tracking || '—'}</td></tr>
                                    </tbody>
                                  </table>
                                </div>

                                {/* Items */}
                                {s.items && s.items.length > 0 && (
                                  <div className={styles.detailBlock} style={{ gridColumn: '1 / -1' }}>
                                    <h4>Items in Shipment</h4>
                                    <table className={styles.itemsTable}>
                                      <thead>
                                        <tr>
                                          <th>Category</th>
                                          <th>Item</th>
                                          <th>Age Group</th>
                                          <th>Qty</th>
                                          <th>Weight</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {s.items.map((item: any, i: number) => (
                                          <tr key={i}>
                                            <td>{item.category}</td>
                                            <td>{item.subcategory}</td>
                                            <td>{item.ageGroup || '—'}</td>
                                            <td>{item.quantity}</td>
                                            <td>{item.weight?.toFixed(2)} kg</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ──────────── WAREHOUSES ──────────── */}
        {activeTab === 'warehouses' && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Warehouse Management</h2>
            </div>

            <div className={styles.whLayout}>
              {/* Add Form */}
              <div className={styles.whFormCard}>
                <h3>Add New Warehouse</h3>
                <form onSubmit={addWarehouse} className={styles.form}>
                  <label>City / Location Name</label>
                  <input
                    placeholder="e.g. Pune (Hinjewadi)"
                    value={whForm.city}
                    onChange={e => setWhForm({ ...whForm, city: e.target.value })}
                    required
                  />
                  <label>Full Address</label>
                  <input
                    placeholder="Building, Street, Area"
                    value={whForm.address}
                    onChange={e => setWhForm({ ...whForm, address: e.target.value })}
                    required
                  />
                  <label>Pincode</label>
                  <input
                    placeholder="e.g. 411057"
                    value={whForm.pincode}
                    onChange={e => setWhForm({ ...whForm, pincode: e.target.value })}
                    required
                  />
                  <label>Contact Number</label>
                  <input
                    placeholder="+91 XXXXX XXXXX"
                    value={whForm.contact}
                    onChange={e => setWhForm({ ...whForm, contact: e.target.value })}
                    required
                  />
                  <button type="submit" className={styles.addBtn} disabled={whSaving}>
                    {whSaving ? 'Saving…' : '+ Add Warehouse'}
                  </button>
                </form>
              </div>

              {/* Existing Warehouses */}
              <div className={styles.whCards}>
                {warehouses.length === 0 ? (
                  <div className={styles.emptyState}>
                    <span>🏭</span>
                    <p>No warehouses yet.</p>
                  </div>
                ) : (
                  warehouses.map(wh => (
                    <div key={wh.id} className={styles.whCard}>
                      <div className={styles.whCardHeader}>
                        <h3>{wh.city}</h3>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => deleteWarehouse(wh.id)}
                          disabled={deletingWH === wh.id}
                        >
                          {deletingWH === wh.id ? '…' : '🗑'}
                        </button>
                      </div>
                      <p className={styles.whAddress}>{wh.address}</p>
                      <div className={styles.whMeta}>
                        <span>📍 {wh.pincode}</span>
                        <span>📞 {wh.contact}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {/* ──────────── ANALYTICS ──────────── */}
        {activeTab === 'analytics' && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Analytics Overview</h2>
            </div>

            <div className={styles.analyticsGrid}>
              {/* Status Breakdown */}
              <div className={styles.analyticsCard}>
                <h3>Orders by Status</h3>
                <div className={styles.statusBreakdown}>
                  {STATUS_STEPS.map(st => {
                    const count = stats.byStatus[st] || 0;
                    const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                    return (
                      <div key={st} className={styles.breakdownItem}>
                        <div className={styles.breakdownLabel}>
                          <span>{STATUS_LABELS[st]}</span>
                          <span style={{ color: STATUS_COLORS[st] }}>{count}</span>
                        </div>
                        <div className={styles.breakdownBar}>
                          <div
                            className={styles.breakdownFill}
                            style={{ width: `${pct}%`, background: STATUS_COLORS[st] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Destinations */}
              <div className={styles.analyticsCard}>
                <h3>Top Destinations</h3>
                <div className={styles.destList}>
                  {(() => {
                    const counts: Record<string, number> = {};
                    shipments.forEach(s => {
                      if (s.destination_city) counts[s.destination_city] = (counts[s.destination_city] || 0) + 1;
                    });
                    return Object.entries(counts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 6)
                      .map(([city, count]) => (
                        <div key={city} className={styles.destItem}>
                          <span>{city}</span>
                          <span className={styles.destCount}>{count} orders</span>
                        </div>
                      ));
                  })()}
                </div>
              </div>

              {/* Recent Activity */}
              <div className={styles.analyticsCard} style={{ gridColumn: '1 / -1' }}>
                <h3>Recent Activity (Last 10 Orders)</h3>
                <div className={styles.activityList}>
                  {shipments.slice(0, 10).map(s => (
                    <div key={s.id} className={styles.activityItem}>
                      <span
                        className={styles.activityDot}
                        style={{ background: STATUS_COLORS[s.status] }}
                      />
                      <span className={styles.activityText}>
                        Order to <strong>{s.destination_city}</strong> — {s.total_weight}kg
                      </span>
                      <span
                        className={styles.activityStatus}
                        style={{ color: STATUS_COLORS[s.status] }}
                      >
                        {STATUS_LABELS[s.status]}
                      </span>
                      <span className={styles.activityDate}>
                        {new Date(s.created_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
