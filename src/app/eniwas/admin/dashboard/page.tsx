"use client";
import Link from "next/link";

export default function AdminDashboard() {
  const bars = [
    { label: "Type-I", total: 420, occupied: 395 },
    { label: "Type-II", total: 680, occupied: 612 },
    { label: "Type-III", total: 1240, occupied: 1087 },
    { label: "Type-IV", total: 860, occupied: 778 },
    { label: "Type-V", total: 120, occupied: 98 },
  ];

  return (
    <div>
      <div className="eniwas-page-header">
        <div className="eniwas-breadcrumb">Admin / <span>Dashboard</span></div>
        <h2>Admin Dashboard</h2>
        <p>e-Niwas Housing Portal — Bihar Building Construction Department · As of 4 Jun 2026</p>
      </div>

      {/* Summary stats */}
      <div className="eniwas-stats" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
        {[
          { label: "Total Properties", value: "3,320", sub: "Across all categories", icon: "🏢", cls: "" },
          { label: "Occupied", value: "2,970", sub: "89.5% occupancy rate", icon: "✅", cls: "green" },
          { label: "Available", value: "350", sub: "For fresh allotment", icon: "🏠", cls: "" },
          { label: "Pending Requests", value: "14", sub: "Awaiting committee", icon: "⏳", cls: "orange" },
          { label: "Waiting List", value: "8", sub: "Priority queue", icon: "📋", cls: "" },
          { label: "Rent Collection", value: "₹84.2L", sub: "This month (May 2026)", icon: "💰", cls: "green" },
          { label: "Pending Dues", value: "₹12.4L", sub: "From 438 employees", icon: "⚠️", cls: "red" },
          { label: "Pending NOCs", value: "3", sub: "Under review", icon: "📄", cls: "orange" },
        ].map(s => (
          <div key={s.label} className={`eniwas-stat ${s.cls}`}>
            <div className="eniwas-stat-icon">{s.icon}</div>
            <div className="eniwas-stat-label">{s.label}</div>
            <div className="eniwas-stat-value" style={{ fontSize: typeof s.value === "string" && s.value.includes("₹") ? 16 : 26 }}>{s.value}</div>
            <div className="eniwas-stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="eniwas-grid-2" style={{ marginTop: 20, marginBottom: 20 }}>
        {/* Occupancy chart */}
        <div className="eniwas-card">
          <div className="eniwas-card-title"><span className="icon">📊</span> Occupancy by Property Type</div>
          {bars.map(b => {
            const pct = Math.round((b.occupied / b.total) * 100);
            return (
              <div key={b.label} className="chart-bar-row">
                <div className="chart-bar-label">{b.label}</div>
                <div className="chart-bar-track">
                  <div className="chart-bar-fill" style={{ width: `${pct}%`, background: pct > 90 ? "#dc2626" : pct > 80 ? "#e87722" : "#1a3a8f" }}>
                    {b.occupied}/{b.total}
                  </div>
                </div>
                <div className="chart-bar-val">{pct}%</div>
              </div>
            );
          })}
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>Red &gt;90% occupancy · Orange &gt;80%</div>
        </div>

        {/* Pending allotments */}
        <div className="eniwas-card">
          <div className="eniwas-card-title">
            <span className="icon material-symbols-outlined">pending_actions</span>
            Pending Allotment Requests
            <span className="badge badge-orange" style={{ marginLeft: 6 }}>14</span>
          </div>
          <table className="eniwas-table">
            <thead><tr><th>Employee</th><th>Type</th><th>Applied</th><th>Action</th></tr></thead>
            <tbody>
              {[
                { name: "Amit Kumar", empId: "BH-IAS-24-0081", type: "Type-IV", date: "01 Jun 2026" },
                { name: "Priya Sharma", empId: "BH-IPS-22-0144", type: "Type-IV", date: "29 May 2026" },
                { name: "Vivek Singh", empId: "BH-PCS-23-0392", type: "Type-III", date: "28 May 2026" },
                { name: "Meena Devi", empId: "BH-IAS-20-0055", type: "Type-V", date: "25 May 2026" },
              ].map(r => (
                <tr key={r.empId}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{r.empId}</div>
                  </td>
                  <td><span className="badge badge-blue">{r.type}</span></td>
                  <td style={{ fontSize: 12 }}>{r.date}</td>
                  <td>
                    <Link href="/eniwas/admin/allotments" className="btn btn-primary btn-xs">Review</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 12 }}>
            <Link href="/eniwas/admin/allotments" className="btn btn-secondary btn-sm">View All 14 →</Link>
          </div>
        </div>
      </div>

      <div className="eniwas-grid-3" style={{ marginBottom: 20 }}>
        {/* Rent overview */}
        <div className="eniwas-card">
          <div className="eniwas-card-title"><span className="icon">💳</span> Rent This Month</div>
          {[
            { label: "Collected via Portal", amount: "₹42.1L", pct: 50, color: "#1a3a8f" },
            { label: "Via Salary Deduction", amount: "₹38.6L", pct: 46, color: "#16a34a" },
            { label: "Pending", amount: "₹12.4L", pct: 13, color: "#dc2626" },
          ].map(r => (
            <div key={r.label} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                <span style={{ color: "#475569" }}>{r.label}</span>
                <span style={{ fontWeight: 700 }}>{r.amount}</span>
              </div>
              <div style={{ background: "#f1f5f9", borderRadius: 4, height: 6 }}>
                <div style={{ width: `${r.pct}%`, background: r.color, height: "100%", borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>

        {/* NOC status */}
        <div className="eniwas-card">
          <div className="eniwas-card-title"><span className="icon material-symbols-outlined">description</span> NOC Pipeline</div>
          {[
            { status: "Pending Review", count: 3, color: "badge-orange" },
            { status: "Under Query", count: 1, color: "badge-yellow" },
            { status: "Approved (Month)", count: 8, color: "badge-green" },
            { status: "Rejected (Month)", count: 1, color: "badge-red" },
          ].map(n => (
            <div key={n.status} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13 }}>
              <span>{n.status}</span>
              <span className={`badge ${n.color}`}>{n.count}</span>
            </div>
          ))}
          <div style={{ marginTop: 12 }}>
            <Link href="/eniwas/admin/noc" className="btn btn-secondary btn-sm">Manage NOCs →</Link>
          </div>
        </div>

        {/* System alerts */}
        <div className="eniwas-card">
          <div className="eniwas-card-title"><span className="icon">🔔</span> System Alerts</div>
          {[
            { icon: "⚠️", text: "43 employees overdue &gt;90 days", color: "#dc2626" },
            { icon: "📋", text: "3 NOC requests awaiting action", color: "#e87722" },
            { icon: "🏠", text: "12 properties need maintenance", color: "#0369a1" },
            { icon: "🔄", text: "HRMS sync: 2 profiles pending update", color: "#7e22ce" },
            { icon: "📊", text: "Monthly MIS report due Jun 10", color: "#64748b" },
          ].map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderBottom: "1px solid #f1f5f9", fontSize: 12 }}>
              <span>{a.icon}</span>
              <span style={{ color: a.color, fontWeight: 500 }}>{a.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="eniwas-card">
        <div className="eniwas-card-title"><span className="icon material-symbols-outlined">history</span> Recent Admin Activity</div>
        <table className="eniwas-table">
          <thead><tr><th>Action</th><th>Employee/Property</th><th>Admin</th><th>Time</th><th>Status</th></tr></thead>
          <tbody>
            {[
              { action: "Allotment Approved", ref: "Deepak Verma – Type-III Flat 22", admin: "S. Prasad", time: "Today, 11:20 AM", status: "Approved", cls: "badge-green" },
              { action: "NOC Issued", ref: "Kavita Singh – NOC-2026-0041", admin: "R. Kumar", time: "Today, 10:45 AM", status: "Issued", cls: "badge-green" },
              { action: "Request Rejected", ref: "Mohan Lal – Type-V (ineligible)", admin: "S. Prasad", time: "Yesterday, 4:30 PM", status: "Rejected", cls: "badge-red" },
              { action: "Penalty Applied", ref: "48 employees – May arrears", admin: "System Auto", time: "01 Jun 2026", status: "Applied", cls: "badge-orange" },
              { action: "Waiting List Update", ref: "2 employees promoted in queue", admin: "S. Prasad", time: "31 May 2026", status: "Updated", cls: "badge-blue" },
            ].map((r, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{r.action}</td>
                <td style={{ fontSize: 12 }}>{r.ref}</td>
                <td style={{ fontSize: 12 }}>{r.admin}</td>
                <td style={{ fontSize: 12, color: "#94a3b8" }}>{r.time}</td>
                <td><span className={`badge ${r.cls}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
