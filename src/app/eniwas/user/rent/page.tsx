"use client";
import { useState } from "react";

export default function RentPage() {
  const [payTab, setPayTab] = useState<"online" | "salary">("online");
  const [payDone, setPayDone] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  const rentBreakdown = [
    { label: "Base Rent (Type-IV, 145m²)", amount: 2560 },
    { label: "Water Charges", amount: 120 },
    { label: "Maintenance Fund", amount: 160 },
  ];
  const total = rentBreakdown.reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <div className="eniwas-page-header">
        <div className="eniwas-breadcrumb">Dashboard / <span>Rent & Payments</span></div>
        <h2>Rent Management</h2>
        <p>Pay rent, view history & manage payment preferences</p>
      </div>

      {/* Dues alert */}
      <div className="eniwas-alert eniwas-alert-warning">
        <span>⚠️</span>
        <div>
          <strong>Rent Due for June 2026</strong> — ₹2,840 is due by <strong>10 Jun 2026</strong>.
          A penalty of ₹284 (10%) will be levied after the due date.
        </div>
      </div>

      {/* Rent summary banner */}
      <div className="rent-summary">
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>AMOUNT DUE – JUNE 2026</div>
            <div className="rent-summary-amount">₹2,840</div>
            <div className="rent-summary-label">Due by 10 Jun 2026 · Type-IV Flat 12B, Kadamkuan</div>
          </div>
          <div className="rent-summary-meta">
            <div className="rent-summary-meta-item"><strong>₹0</strong>Arrears</div>
            <div className="rent-summary-meta-item"><strong>₹0</strong>Penalty</div>
            <div className="rent-summary-meta-item"><strong>6 days</strong>Until Due</div>
          </div>
        </div>
      </div>

      <div className="eniwas-grid-2" style={{ marginBottom: 20 }}>
        {/* Pay now */}
        {!payDone ? (
          <div className="eniwas-card">
            <div className="eniwas-card-title"><span className="icon">💳</span> Pay Rent – June 2026</div>

            {/* Breakdown */}
            <div style={{ background: "#f8fafc", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13 }}>
              {rentBreakdown.map(r => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#475569" }}>{r.label}</span>
                  <span style={{ fontWeight: 600 }}>₹{r.amount}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid #e2e8f0", fontWeight: 700, fontSize: 14, color: "#0d2b6b" }}>
                <span>Total</span>
                <span>₹{total}</span>
              </div>
            </div>

            {/* Payment method tabs */}
            <div className="eniwas-tabs">
              <button className={`eniwas-tab ${payTab === "online" ? "active" : ""}`} onClick={() => setPayTab("online")}>💳 Online Payment</button>
              <button className={`eniwas-tab ${payTab === "salary" ? "active" : ""}`} onClick={() => setPayTab("salary")}>🏦 Salary Deduction</button>
            </div>

            {payTab === "online" ? (
              <div>
                <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
                  {["UPI", "Net Banking", "Debit Card", "Credit Card"].map(m => (
                    <label key={m} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", fontSize: 13, background: m === "UPI" ? "#eff3ff" : "white", color: m === "UPI" ? "#1a3a8f" : "#374151", fontWeight: m === "UPI" ? 600 : 400 }}>
                      <input type="radio" name="paymode" defaultChecked={m === "UPI"} style={{ accentColor: "#1a3a8f" }} />
                      {m}
                    </label>
                  ))}
                </div>
                <div className="eniwas-form-group">
                  <label className="eniwas-label">UPI ID</label>
                  <input className="eniwas-input" placeholder="yourname@upi" />
                </div>
                <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => setPayDone(true)}>
                  Pay ₹{total} Now →
                </button>
              </div>
            ) : (
              <div>
                <div className="eniwas-alert eniwas-alert-info">
                  <span>ℹ️</span>
                  <span>A salary deduction request will be sent to HRMS. The amount will be deducted from your next salary.</span>
                </div>
                <div style={{ background: "#f8fafc", borderRadius: 8, padding: 12, fontSize: 13, marginBottom: 14 }}>
                  <div><strong>HRMS Employee ID:</strong> BH-IAS-2019-00842</div>
                  <div><strong>Deduction Month:</strong> June 2026</div>
                  <div><strong>Amount to Deduct:</strong> ₹{total}</div>
                </div>
                <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => setPayDone(true)}>
                  Request Salary Deduction
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="eniwas-card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#0d2b6b", marginBottom: 6 }}>Payment Successful!</div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>₹{total} paid for June 2026<br />Transaction ID: TXN26060{Math.floor(Math.random()*9000+1000)}</div>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowReceipt(true)}>📥 Download Receipt</button>
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setPayDone(false)}>Back</button>
            </div>
          </div>
        )}

        {/* Payment history */}
        <div className="eniwas-card">
          <div className="eniwas-card-title"><span className="icon material-symbols-outlined">receipt_long</span> Payment History</div>
          <table className="eniwas-table">
            <thead>
              <tr><th>Month</th><th>Amount</th><th>Mode</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {[
                { month: "May 2026", amount: 2840, mode: "Online/UPI", status: "Paid", txn: "TXN260508411" },
                { month: "Apr 2026", amount: 2840, mode: "Salary Ded.", status: "Paid", txn: "SAL260430022" },
                { month: "Mar 2026", amount: 2840, mode: "Online/UPI", status: "Paid", txn: "TXN260310987" },
                { month: "Feb 2026", amount: 2840, mode: "Online/UPI", status: "Paid", txn: "TXN260211344" },
                { month: "Jan 2026", amount: 3120, mode: "Online/UPI", status: "Paid + Penalty", txn: "TXN260118004" },
                { month: "Dec 2025", amount: 2840, mode: "Salary Ded.", status: "Paid", txn: "SAL251231100" },
              ].map(r => (
                <tr key={r.month}>
                  <td>{r.month}</td>
                  <td style={{ fontWeight: 600 }}>₹{r.amount.toLocaleString()}</td>
                  <td style={{ fontSize: 12 }}>{r.mode}</td>
                  <td><span className={`badge ${r.status.includes("Penalty") ? "badge-orange" : "badge-green"}`}>{r.status}</span></td>
                  <td><button style={{ fontSize: 11, color: "#0d2b6b", background: "none", border: "none", cursor: "pointer" }}>↓</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rent calculation details */}
      <div className="eniwas-card">
        <div className="eniwas-card-title"><span className="icon">🧮</span> How Your Rent is Calculated</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, fontSize: 13 }}>
          {[
            { label: "Property Type", value: "Type-IV" },
            { label: "Area", value: "145 sq.m." },
            { label: "Location Category", value: "Category A (Patna)" },
            { label: "Base Rate", value: "₹17.65/sq.m." },
            { label: "Water Charge Rate", value: "₹0.83/sq.m." },
            { label: "Maintenance Rate", value: "₹1.10/sq.m." },
            { label: "Pay Level Factor", value: "1.0x (Level 11)" },
            { label: "Penalty Rate", value: "10% after due date" },
          ].map(f => (
            <div key={f.label} style={{ padding: "10px 14px", background: "#f8fafc", borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: "#64748b" }}>{f.label}</div>
              <div style={{ fontWeight: 600, color: "#0d2b6b" }}>{f.value}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, fontSize: 12, color: "#64748b" }}>
          * Rent calculated per Government of Bihar Housing Policy 2019 (amended 2023). Rates subject to revision.
        </div>
      </div>
    </div>
  );
}
