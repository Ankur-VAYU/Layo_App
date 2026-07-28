"use client";
import { useState } from "react";

const RENT_DATA = [
  { empId: "BH-IAS-19-0842", name: "Rajesh Kumar", flat: "12B – Kadamkuan", type: "Type-IV", month: "Jun 2026", base: 2560, water: 120, maint: 160, total: 2840, penalty: 0, due: 2840, status: "Pending" },
  { empId: "BH-IAS-18-0621", name: "Anita Singh", flat: "7A – Kankarbagh", type: "Type-IV", month: "Jun 2026", base: 2560, water: 120, maint: 160, total: 2840, penalty: 0, due: 0, status: "Paid" },
  { empId: "BH-PCS-21-0392", name: "Vivek Singh", flat: "22D – Rajendra Nagar", type: "Type-III", month: "Jun 2026", base: 1180, water: 80, maint: 100, total: 1360, penalty: 136, due: 5680, status: "Overdue" },
  { empId: "BH-IAS-17-0055", name: "Meena Devi", flat: "3B – Bailey Road", type: "Type-V", month: "Jun 2026", base: 4400, water: 200, maint: 300, total: 4900, penalty: 0, due: 0, status: "Paid" },
];

export default function RentAdminPage() {
  const [tab, setTab] = useState<"collection" | "calculate" | "arrears">("collection");

  return (
    <div>
      <div className="eniwas-page-header">
        <div className="eniwas-breadcrumb">Admin / <span>Rent Collection</span></div>
        <h2>Rent Management</h2>
        <p>Rent calculation, collection tracking & penalty management</p>
      </div>

      <div className="eniwas-stats" style={{ gridTemplateColumns: "repeat(5, 1fr)", marginBottom: 20 }}>
        {[
          { label: "Demand (Jun 2026)", value: "₹97.4L", cls: "" },
          { label: "Collected", value: "₹84.2L", cls: "green" },
          { label: "Pending", value: "₹13.2L", cls: "orange" },
          { label: "Overdue >90d", value: "₹8.8L", cls: "red" },
          { label: "Penalty Collected", value: "₹1.4L", cls: "" },
        ].map(s => (
          <div key={s.label} className={`eniwas-stat ${s.cls}`} style={{ padding: "12px 14px" }}>
            <div className="eniwas-stat-label">{s.label}</div>
            <div className="eniwas-stat-value" style={{ fontSize: 16 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="eniwas-tabs">
        {[["collection", "💳 Collection Status"], ["calculate", "🧮 Rent Calculator"], ["arrears", "⚠️ Arrears & Penalty"]].map(([k, l]) => (
          <button key={k} className={`eniwas-tab ${tab === k ? "active" : ""}`} onClick={() => setTab(k as typeof tab)}>{l}</button>
        ))}
      </div>

      {tab === "collection" && (
        <div className="eniwas-card">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div className="eniwas-card-title" style={{ margin: 0 }}>June 2026 – Rent Collection</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-secondary btn-sm">📥 Export</button>
              <button className="btn btn-danger btn-sm">📧 Send Due Notices</button>
            </div>
          </div>
          <table className="eniwas-table">
            <thead>
              <tr><th>Employee</th><th>Property</th><th>Type</th><th>Base Rent</th><th>Charges</th><th>Penalty</th><th>Total Due</th><th>Status</th><th>Action</th></tr>
            </thead>
            <tbody>
              {RENT_DATA.map(r => (
                <tr key={r.empId}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{r.empId}</div>
                  </td>
                  <td style={{ fontSize: 12 }}>{r.flat}</td>
                  <td><span className="badge badge-blue">{r.type}</span></td>
                  <td>₹{r.base.toLocaleString()}</td>
                  <td>₹{(r.water + r.maint).toLocaleString()}</td>
                  <td style={{ color: r.penalty > 0 ? "#dc2626" : "#94a3b8" }}>{r.penalty > 0 ? `₹${r.penalty}` : "—"}</td>
                  <td style={{ fontWeight: 700 }}>₹{r.due > 0 ? r.due.toLocaleString() : "—"}</td>
                  <td>
                    <span className={`badge ${r.status === "Paid" ? "badge-green" : r.status === "Overdue" ? "badge-red" : "badge-yellow"}`}>{r.status}</span>
                  </td>
                  <td>
                    {r.status !== "Paid" && <button className="btn btn-xs btn-primary">📧 Remind</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "calculate" && (
        <div className="eniwas-card" style={{ maxWidth: 520 }}>
          <div className="eniwas-card-title">🧮 Rent Calculator</div>
          <div className="eniwas-form-row">
            <div className="eniwas-form-group">
              <label className="eniwas-label">Property Type</label>
              <select className="eniwas-select"><option>Type-IV</option><option>Type-III</option><option>Type-V</option></select>
            </div>
            <div className="eniwas-form-group">
              <label className="eniwas-label">Area (sq.m.)</label>
              <input className="eniwas-input" type="number" defaultValue={145} />
            </div>
          </div>
          <div className="eniwas-form-row">
            <div className="eniwas-form-group">
              <label className="eniwas-label">Location Category</label>
              <select className="eniwas-select"><option>Category A – Patna</option><option>Category B – District HQ</option><option>Category C – Block</option></select>
            </div>
            <div className="eniwas-form-group">
              <label className="eniwas-label">Pay Level</label>
              <select className="eniwas-select">{Array.from({length:18}, (_,i) => <option key={i+1}>Level {i+1}</option>)}</select>
            </div>
          </div>
          <div style={{ background: "#f8fafc", borderRadius: 8, padding: 14, fontSize: 13 }}>
            <div style={{ fontWeight: 700, color: "#0d2b6b", marginBottom: 10 }}>Calculated Rent Breakup</div>
            {[
              ["Base Rent (145 × ₹17.65)", "₹2,559"],
              ["Water Charges (145 × ₹0.83)", "₹120"],
              ["Maintenance (145 × ₹1.10)", "₹160"],
              ["Penalty (if delayed – 10%)", "₹284"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #e2e8f0" }}>
                <span style={{ color: "#475569" }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, fontWeight: 800, color: "#0d2b6b", fontSize: 15 }}>
              <span>Total (on time)</span><span>₹2,840</span>
            </div>
          </div>
        </div>
      )}

      {tab === "arrears" && (
        <div className="eniwas-card">
          <div className="eniwas-card-title">⚠️ Arrears & Penalty Register</div>
          <div className="eniwas-alert eniwas-alert-warning" style={{ marginBottom: 16 }}>
            <span>⚠️</span>
            <span>43 employees have arrears older than 90 days. Integration with HRMS for mandatory salary deduction is recommended.</span>
          </div>
          <table className="eniwas-table">
            <thead>
              <tr><th>Employee</th><th>Property</th><th>Arrears (months)</th><th>Principal</th><th>Penalty</th><th>Total Outstanding</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><div style={{ fontWeight: 600 }}>Vivek Singh</div><div style={{ fontSize: 11, color: "#94a3b8" }}>BH-PCS-21-0392</div></td>
                <td style={{ fontSize: 12 }}>22D – Rajendra Nagar (Type-III)</td>
                <td><span className="badge badge-red">4 months</span></td>
                <td>₹5,440</td>
                <td style={{ color: "#dc2626", fontWeight: 600 }}>₹544</td>
                <td style={{ fontWeight: 700, color: "#dc2626" }}>₹5,984</td>
                <td><span className="badge badge-red">Defaulter</span></td>
              </tr>
              <tr>
                <td><div style={{ fontWeight: 600 }}>Rajesh Kumar</div><div style={{ fontSize: 11, color: "#94a3b8" }}>BH-IAS-19-0842</div></td>
                <td style={{ fontSize: 12 }}>12B – Kadamkuan (Type-IV)</td>
                <td><span className="badge badge-yellow">1 month</span></td>
                <td>₹2,840</td>
                <td style={{ color: "#94a3b8" }}>—</td>
                <td style={{ fontWeight: 700 }}>₹2,840</td>
                <td><span className="badge badge-yellow">Pending</span></td>
              </tr>
            </tbody>
          </table>
          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button className="btn btn-danger btn-sm">📧 Send Final Notices</button>
            <button className="btn btn-orange btn-sm">🔗 Trigger HRMS Deduction</button>
          </div>
        </div>
      )}
    </div>
  );
}
