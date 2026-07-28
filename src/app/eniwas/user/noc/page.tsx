"use client";
import { useState } from "react";
import { generateNOCPdf } from "@/lib/generateNOC";

// Mock: a previously approved NOC for this user
const APPROVED_NOC = {
  id: "NOC-2026-00041",
  status: "Approved",
  issuedDate: "04 Jun 2026",
  issuedBy: "Suresh Prasad, Dy. Director (Rental)",
};

export default function NOCPage() {
  const [step, setStep] = useState(0);
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  return (
    <div>
      <div className="eniwas-page-header">
        <div className="eniwas-breadcrumb">Dashboard / <span>NOC Request</span></div>
        <h2>NOC / Vacation Request</h2>
        <p>Apply for No Objection Certificate upon transfer or retirement</p>
      </div>

      <div className="eniwas-alert eniwas-alert-info">
        <span>ℹ️</span>
        <span>NOC is required before your salary is processed at a new posting location. Property must be vacated and all dues cleared.</span>
      </div>

      <div className="eniwas-grid-2">
        {/* NOC Application form */}
        <div className="eniwas-card">
          <div className="eniwas-card-title"><span className="icon material-symbols-outlined">description</span> Apply for NOC</div>

          {!submitted ? (
            <>
              {/* Steps */}
              <div className="eniwas-steps" style={{ marginBottom: 24 }}>
                {["Initiate", "Dues Check", "Documents", "Submit"].map((s, i) => (
                  <div key={s} className="eniwas-step">
                    <div className={`eniwas-step-circle ${i < step ? "done" : i === step ? "active" : ""}`}>
                      {i < step ? "✓" : i + 1}
                    </div>
                    <div className={`eniwas-step-label ${i === step ? "active" : ""}`}>{s}</div>
                    {i < 3 && <div className={`eniwas-step-line ${i < step ? "done" : ""}`} />}
                  </div>
                ))}
              </div>

              {step === 0 && (
                <div>
                  <div className="eniwas-form-group">
                    <label className="eniwas-label">Reason for NOC</label>
                    <select className="eniwas-select" value={reason} onChange={e => setReason(e.target.value)}>
                      <option value="">Select reason…</option>
                      <option value="transfer">Transfer / New Posting</option>
                      <option value="retirement">Retirement</option>
                      <option value="voluntary">Voluntary Vacation</option>
                      <option value="death">Death of Employee (NOK)</option>
                    </select>
                  </div>
                  {reason === "transfer" && (
                    <div className="eniwas-form-group">
                      <label className="eniwas-label">Transfer Order Number</label>
                      <input className="eniwas-input" placeholder="e.g. GAD/TRNS/2026/0842" />
                    </div>
                  )}
                  <div className="eniwas-form-group">
                    <label className="eniwas-label">Expected Vacation Date</label>
                    <input className="eniwas-input" type="date" />
                  </div>
                  <div className="eniwas-form-group">
                    <label className="eniwas-label">New Posting Location (if applicable)</label>
                    <input className="eniwas-input" placeholder="e.g. Gaya, Bihar" />
                  </div>
                  <button className="btn btn-primary" disabled={!reason} onClick={() => setStep(1)}>Next →</button>
                </div>
              )}

              {step === 1 && (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Dues Verification</div>
                    {[
                      { label: "Rent – June 2026", status: "pending", amount: "₹2,840" },
                      { label: "Arrears (all cleared)", status: "ok", amount: "₹0" },
                      { label: "Penalty (all cleared)", status: "ok", amount: "₹0" },
                      { label: "Maintenance charges", status: "ok", amount: "₹0" },
                    ].map(d => (
                      <div key={d.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: d.status === "pending" ? "#fffbeb" : "#f0fdf4", borderRadius: 8, marginBottom: 8, border: `1px solid ${d.status === "pending" ? "#fde68a" : "#bbf7d0"}` }}>
                        <span style={{ fontSize: 13 }}>{d.status === "ok" ? "✅" : "⚠️"} {d.label}</span>
                        <span style={{ fontWeight: 700, fontSize: 13, color: d.status === "pending" ? "#92400e" : "#166534" }}>{d.amount}</span>
                      </div>
                    ))}
                  </div>
                  <div className="eniwas-alert eniwas-alert-warning">
                    <span>⚠️</span>
                    <span>Please clear June 2026 rent (₹2,840) before NOC can be processed. <a href="/eniwas/user/rent" style={{ color: "#0d2b6b", fontWeight: 600 }}>Pay Now</a></span>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="btn btn-secondary" onClick={() => setStep(0)}>← Back</button>
                    <button className="btn btn-primary" onClick={() => setStep(2)}>Continue Anyway (Pending Dues) →</button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Upload Supporting Documents</div>
                  {[
                    { doc: "Transfer Order / Retirement Letter", required: true },
                    { doc: "Self-declaration of property vacation", required: true },
                    { doc: "Latest rent receipt", required: false },
                    { doc: "Key handover acknowledgement", required: false },
                  ].map(d => (
                    <div key={d.doc} className="eniwas-form-group" style={{ marginBottom: 12 }}>
                      <label className="eniwas-label">{d.doc} {d.required && <span style={{ color: "#dc2626" }}>*</span>}</label>
                      <input type="file" className="eniwas-input" style={{ paddingTop: 6 }} accept=".pdf,.jpg,.png" />
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
                    <button className="btn btn-primary" onClick={() => setStep(3)}>Next →</button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Review & Submit</div>
                  <div style={{ background: "#f8fafc", borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 13 }}>
                    {[
                      ["Employee", "Rajesh Kumar (BH-IAS-2019-00842)"],
                      ["Property", "Type-IV, Flat 12B, Kadamkuan Colony"],
                      ["Reason", reason || "Transfer"],
                      ["Expected Vacation", "30 Jun 2026"],
                      ["Pending Dues", "₹2,840 (June 2026 rent)"],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                        <span style={{ color: "#64748b", width: 140, flexShrink: 0 }}>{k}</span>
                        <span style={{ fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="eniwas-form-group">
                    <label className="eniwas-label">Additional Remarks</label>
                    <textarea className="eniwas-textarea" placeholder="Any additional information for the Rental Division…" />
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="btn btn-secondary" onClick={() => setStep(2)}>← Back</button>
                    <button className="btn btn-primary" onClick={() => setSubmitted(true)}>Submit NOC Request</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#0d2b6b", marginBottom: 6 }}>NOC Request Submitted</div>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
                Reference No: <strong>NOC-2026-00{Math.floor(Math.random()*900+100)}</strong><br />
                The Rental Division will verify dues and process within 7 working days.
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => { setSubmitted(false); setStep(0); }}>Submit Another</button>
            </div>
          )}
        </div>

        {/* NOC status & history */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ── Approved NOC card ── */}
          <div className="eniwas-card" style={{ borderLeft: "4px solid #16a34a" }}>
            <div className="eniwas-card-title">
              <span className="icon material-symbols-outlined">assignment</span> NOC History
            </div>
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "14px 16px", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 20 }}>✅</span>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "#15803d" }}>NOC Approved & Issued</span>
                  </div>
                  {[
                    ["Reference No.",   APPROVED_NOC.id],
                    ["Status",          APPROVED_NOC.status],
                    ["Issued On",       APPROVED_NOC.issuedDate],
                    ["Issued By",       APPROVED_NOC.issuedBy],
                    ["Property",        "Type-IV, Flat 9A – Kankarbagh Colony"],
                    ["Reason",          "Transfer to Gaya Sadar"],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", gap: 8, fontSize: 12, marginBottom: 3 }}>
                      <span style={{ color: "#64748b", minWidth: 100 }}>{k}:</span>
                      <span style={{ fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
                {/* QR placeholder preview */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ width: 64, height: 64, background: "#0d2b6b", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 28 }}>▦</span>
                  </div>
                  <div style={{ fontSize: 9, color: "#64748b" }}>QR in PDF</div>
                </div>
              </div>
              <button
                className="btn btn-success btn-sm"
                style={{ marginTop: 10, width: "100%", justifyContent: "center" }}
                disabled={pdfLoading}
                onClick={async () => {
                  setPdfLoading(true);
                  await generateNOCPdf({
                    nocRef:      APPROVED_NOC.id,
                    empName:     "Kavita Singh",
                    empId:       "BH-IAS-21-0099",
                    designation: "SDO",
                    department:  "Revenue Department",
                    flat:        "Flat 9A",
                    colony:      "Kankarbagh Officers Colony, Patna",
                    type:        "Type-IV",
                    since:       "14 Aug 2022",
                    vacateDate:  "30 Jun 2026",
                    reason:      "Transfer",
                    newPosting:  "Gaya Sadar",
                    issuedBy:    APPROVED_NOC.issuedBy,
                    issuedDate:  APPROVED_NOC.issuedDate,
                    dues:        "Nil",
                  });
                  setPdfLoading(false);
                }}
              >
                {pdfLoading ? "⏳ Generating PDF…" : "📄 Download NOC Certificate (PDF with QR)"}
              </button>
            </div>
          </div>

          <div className="eniwas-card">
            <div className="eniwas-card-title"><span className="icon">📋</span> NOC Process</div>
            <div className="timeline" style={{ fontSize: 13 }}>
              {[
                { color: "green", title: "Employee submits NOC request", desc: "With transfer order & supporting docs" },
                { color: "", title: "Rental Division verification", desc: "Checks dues, penalties, documents" },
                { color: "", title: "Query (if any)", desc: "Employee provides additional info" },
                { color: "orange", title: "NOC Approved", desc: "Rental Division approves & issues NOC" },
                { color: "", title: "NOC Issued to Employee", desc: "Digital copy sent via portal & SMS" },
                { color: "", title: "Property vacated", desc: "Property marked available for re-allotment" },
              ].map((e, i) => (
                <div key={i} className="timeline-item">
                  <div className={`timeline-dot ${e.color}`} />
                  <div className="timeline-title">{e.title}</div>
                  <div className="timeline-desc">{e.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
