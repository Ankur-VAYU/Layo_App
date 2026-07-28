"use client";
import Link from "next/link";

export default function UserDashboard() {
  return (
    <div>
      <div className="eniwas-page-header">
        <div className="eniwas-breadcrumb">Home / <span>Dashboard</span></div>
        <h2>My Dashboard</h2>
        <p>Welcome back, Rajesh Kumar · Employee ID: BH-IAS-2019-00842</p>
      </div>

      {/* HRMS sync banner */}
      <div className="eniwas-alert eniwas-alert-success" style={{ marginBottom: 20 }}>
        <span style={{ fontSize: 18 }}>✅</span>
        <div>
          <strong>HRMS Profile Synced</strong> — Your profile is up to date. Designation: Deputy Collector · Pay Level 11 · Posting: Patna Sadar
        </div>
      </div>

      {/* Allotment Status Card */}
      <div className="eniwas-card" style={{ marginBottom: 20, background: "linear-gradient(135deg, #0d2b6b, #1a3a8f)", color: "white", border: "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>CURRENT ALLOTMENT</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Type-IV, Flat No. 12B</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 12 }}>📍 Kadamkuan Government Colony, Patna</div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              {[
                { label: "Occupied Since", value: "12 Mar 2021" },
                { label: "Pool", value: "IAS/IPS Pool" },
                { label: "Area", value: "145 sq.m." },
              ].map(m => (
                <div key={m.label}>
                  <div style={{ fontSize: 10, opacity: 0.65 }}>{m.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span className="badge badge-green">Active Allotment</span>
            <div style={{ marginTop: 10 }}>
              <Link href="/eniwas/user/allotment" className="btn" style={{ background: "rgba(255,255,255,0.2)", color: "white", fontSize: 12 }}>View Details →</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="eniwas-stats" style={{ marginBottom: 20 }}>
        <div className="eniwas-stat orange">
          <div className="eniwas-stat-icon">💰</div>
          <div className="eniwas-stat-label">Pending Rent</div>
          <div className="eniwas-stat-value">₹2,840</div>
          <div className="eniwas-stat-sub">Due by 10 Jun 2026</div>
        </div>
        <div className="eniwas-stat green">
          <div className="eniwas-stat-icon">✅</div>
          <div className="eniwas-stat-label">Last Payment</div>
          <div className="eniwas-stat-value">₹2,840</div>
          <div className="eniwas-stat-sub">Paid on 8 May 2026</div>
        </div>
        <div className="eniwas-stat">
          <div className="eniwas-stat-icon">📅</div>
          <div className="eniwas-stat-label">Tenancy Duration</div>
          <div className="eniwas-stat-value">3.2 yrs</div>
          <div className="eniwas-stat-sub">Since Mar 2021</div>
        </div>
        <div className="eniwas-stat">
          <div className="eniwas-stat-icon">📋</div>
          <div className="eniwas-stat-label">NOC Status</div>
          <div className="eniwas-stat-value" style={{ fontSize: 15 }}>Not Applied</div>
          <div className="eniwas-stat-sub">No pending NOC</div>
        </div>
      </div>

      <div className="eniwas-grid-2">
        {/* Rent Timeline */}
        <div className="eniwas-card">
          <div className="eniwas-card-title">
            <span className="icon material-symbols-outlined">receipt_long</span>
            Recent Rent Transactions
          </div>
          <table className="eniwas-table">
            <thead>
              <tr><th>Month</th><th>Amount</th><th>Mode</th><th>Status</th></tr>
            </thead>
            <tbody>
              {[
                { month: "May 2026", amount: "₹2,840", mode: "Online", status: "Paid", color: "green" },
                { month: "Apr 2026", amount: "₹2,840", mode: "Salary Ded.", status: "Paid", color: "green" },
                { month: "Mar 2026", amount: "₹2,840", mode: "Online", status: "Paid", color: "green" },
                { month: "Feb 2026", amount: "₹2,840", mode: "Online", status: "Paid", color: "green" },
                { month: "Jan 2026", amount: "₹3,120", mode: "Online", status: "Late+Penalty", color: "orange" },
              ].map(r => (
                <tr key={r.month}>
                  <td>{r.month}</td>
                  <td style={{ fontWeight: 600 }}>{r.amount}</td>
                  <td>{r.mode}</td>
                  <td><span className={`badge badge-${r.color}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 12 }}>
            <Link href="/eniwas/user/rent" className="btn btn-primary btn-sm">Pay June Rent →</Link>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="eniwas-card">
          <div className="eniwas-card-title">
            <span className="icon material-symbols-outlined">history</span>
            Activity Timeline
          </div>
          <div className="timeline">
            {[
              { color: "green", title: "Rent Paid – May 2026", desc: "₹2,840 via online payment gateway", date: "08 May 2026" },
              { color: "", title: "Profile Updated", desc: "HRMS sync: Designation updated to Dy. Collector", date: "02 Apr 2026" },
              { color: "orange", title: "Late Penalty Applied", desc: "₹280 penalty for Jan 2026 delay", date: "15 Feb 2026" },
              { color: "green", title: "Allotment Letter Issued", desc: "Type-IV Flat 12B allotted at Kadamkuan Colony", date: "10 Mar 2021" },
              { color: "green", title: "Request Approved", desc: "Allotment committee approved your request", date: "28 Feb 2021" },
              { color: "", title: "Request Submitted", desc: "Applied for Type-IV accommodation", date: "10 Feb 2021" },
            ].map((ev, i) => (
              <div key={i} className="timeline-item">
                <div className={`timeline-dot ${ev.color}`} />
                <div className="timeline-title">{ev.title}</div>
                <div className="timeline-desc">{ev.desc}</div>
                <div className="timeline-date">{ev.date}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="eniwas-card" style={{ marginTop: 20 }}>
        <div className="eniwas-card-title">
          <span className="icon material-symbols-outlined">flash_on</span>
          Quick Actions
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { href: "/eniwas/user/rent", icon: "💳", label: "Pay Rent", color: "#1a3a8f" },
            { href: "/eniwas/user/noc", icon: "📋", label: "Apply for NOC", color: "#16a34a" },
            { href: "/eniwas/user/complaints", icon: "🔧", label: "Raise Complaint", color: "#e87722" },
            { href: "/eniwas/user/properties", icon: "🏘️", label: "Browse Properties", color: "#7e22ce" },
            { href: "/eniwas/user/profile", icon: "👤", label: "Update Profile", color: "#0369a1" },
          ].map(a => (
            <Link key={a.href} href={a.href}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 20px", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0", textDecoration: "none", color: "#374151", fontSize: 12, fontWeight: 600, minWidth: 90, transition: "all 0.15s" }}>
              <span style={{ fontSize: 24 }}>{a.icon}</span>
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
