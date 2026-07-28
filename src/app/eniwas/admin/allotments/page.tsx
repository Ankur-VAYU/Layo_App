"use client";
import { useState } from "react";

const REQUESTS = [
  { id: "REQ-2026-00441", name: "Amit Kumar", empId: "BH-IAS-24-0081", dept: "Revenue", cadre: "IAS", payLevel: "Level 10", type: "Type-IV", colony: "Kadamkuan Colony", date: "01 Jun 2026", priority: "High" },
  { id: "REQ-2026-00438", name: "Priya Sharma", empId: "BH-IPS-22-0144", dept: "Home", cadre: "IPS", payLevel: "Level 11", type: "Type-IV", colony: "Boring Road Colony", date: "29 May 2026", priority: "Normal" },
  { id: "REQ-2026-00421", name: "Vivek Singh", empId: "BH-PCS-23-0392", dept: "Agriculture", cadre: "State Service", payLevel: "Level 8", type: "Type-III", colony: "Rajendra Nagar", date: "28 May 2026", priority: "Normal" },
  { id: "REQ-2026-00419", name: "Meena Devi", empId: "BH-IAS-20-0055", dept: "Finance", cadre: "IAS", payLevel: "Level 14", type: "Type-V", colony: "Bailey Road", date: "25 May 2026", priority: "High" },
  { id: "REQ-2026-00408", name: "Ranjit Kumar", empId: "BH-PCS-21-0218", dept: "Education", cadre: "State Service", payLevel: "Level 7", type: "Type-III", colony: "Phulwari Colony", date: "22 May 2026", priority: "Normal" },
];

export default function AllotmentsPage() {
  const [selected, setSelected] = useState<typeof REQUESTS[0] | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | "waitlist" | null>(null);
  const [remarks, setRemarks] = useState("");
  const [done, setDone] = useState<Record<string, "approve" | "reject" | "waitlist">>({});

  function handleAction(act: "approve" | "reject" | "waitlist") {
    if (!selected) return;
    setDone(d => ({ ...d, [selected.id]: act }));
    setSelected(null);
    setAction(null);
    setRemarks("");
  }

  const pending = REQUESTS.filter(r => !done[r.id]);

  return (
    <div>
      <div className="eniwas-page-header">
        <div className="eniwas-breadcrumb">Admin / Allotment / <span>Pending Requests</span></div>
        <h2>Allotment Committee Review</h2>
        <p>Review, approve, reject or waitlist property allotment requests</p>
      </div>

      <div className="eniwas-stats" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 20 }}>
        <div className="eniwas-stat orange">
          <div className="eniwas-stat-label">Pending Review</div>
          <div className="eniwas-stat-value">{pending.length}</div>
        </div>
        <div className="eniwas-stat green">
          <div className="eniwas-stat-label">Approved Today</div>
          <div className="eniwas-stat-value">{Object.values(done).filter(v => v === "approve").length}</div>
        </div>
        <div className="eniwas-stat red">
          <div className="eniwas-stat-label">Rejected Today</div>
          <div className="eniwas-stat-value">{Object.values(done).filter(v => v === "reject").length}</div>
        </div>
        <div className="eniwas-stat">
          <div className="eniwas-stat-label">Waitlisted Today</div>
          <div className="eniwas-stat-value">{Object.values(done).filter(v => v === "waitlist").length}</div>
        </div>
      </div>

      <div className="eniwas-card">
        <div className="eniwas-card-title"><span className="icon material-symbols-outlined">pending_actions</span> Pending Requests ({pending.length})</div>
        <table className="eniwas-table">
          <thead>
            <tr><th>Ref No.</th><th>Employee</th><th>Cadre / Pay Level</th><th>Requested Property</th><th>Date</th><th>Priority</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {REQUESTS.map(r => {
              const status = done[r.id];
              return (
                <tr key={r.id} style={{ opacity: status ? 0.5 : 1 }}>
                  <td style={{ fontWeight: 600, color: "#0d2b6b", fontSize: 12 }}>{r.id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{r.empId} · {r.dept}</div>
                  </td>
                  <td>
                    <span className="badge badge-purple">{r.cadre}</span>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{r.payLevel}</div>
                  </td>
                  <td>
                    <span className="badge badge-blue">{r.type}</span>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{r.colony}</div>
                  </td>
                  <td style={{ fontSize: 12 }}>{r.date}</td>
                  <td>
                    <span className={`badge ${r.priority === "High" ? "badge-red" : "badge-gray"}`}>{r.priority}</span>
                  </td>
                  <td>
                    {status ? (
                      <span className={`badge ${status === "approve" ? "badge-green" : status === "reject" ? "badge-red" : "badge-yellow"}`}>
                        {status === "approve" ? "✓ Approved" : status === "reject" ? "✗ Rejected" : "⏳ Waitlisted"}
                      </span>
                    ) : (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="btn btn-xs btn-success" onClick={() => { setSelected(r); setAction("approve"); }}>✓ Approve</button>
                        <button className="btn btn-xs btn-danger" onClick={() => { setSelected(r); setAction("reject"); }}>✗ Reject</button>
                        <button className="btn btn-xs" style={{ background: "#fef9c3", color: "#92400e", padding: "3px 8px", fontSize: 11, borderRadius: 5, border: "none", cursor: "pointer" }} onClick={() => { setSelected(r); setAction("waitlist"); }}>⏳ Wait</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Decision Modal */}
      {selected && action && (
        <div className="eniwas-modal-overlay" onClick={() => { setSelected(null); setAction(null); }}>
          <div className="eniwas-modal" onClick={e => e.stopPropagation()}>
            <div className="eniwas-modal-title">
              {action === "approve" ? "✅ Approve Allotment" : action === "reject" ? "❌ Reject Request" : "⏳ Add to Waiting List"}
            </div>
            <div className="eniwas-modal-sub">{selected.id} – {selected.name}</div>

            <div style={{ background: "#f8fafc", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  ["Employee", selected.name],
                  ["Employee ID", selected.empId],
                  ["Cadre", selected.cadre],
                  ["Pay Level", selected.payLevel],
                  ["Requested Type", selected.type],
                  ["Colony", selected.colony],
                ].map(([k, v]) => (
                  <div key={k}><span style={{ color: "#64748b", fontSize: 11 }}>{k}</span><br /><strong>{v}</strong></div>
                ))}
              </div>
            </div>

            {action === "approve" && (
              <>
                <div className="eniwas-form-group">
                  <label className="eniwas-label">Allot Specific Flat (optional)</label>
                  <select className="eniwas-select">
                    <option>Auto-assign from {selected.type} pool</option>
                    <option>Flat 12A – Kadamkuan Colony</option>
                    <option>Flat 7C – Kankarbagh Colony</option>
                    <option>Flat 5A – Boring Road Colony</option>
                  </select>
                </div>
                <div className="eniwas-form-group">
                  <label className="eniwas-label">Allotment Date</label>
                  <input className="eniwas-input" type="date" defaultValue={new Date().toISOString().split("T")[0]} />
                </div>
              </>
            )}

            {action === "reject" && (
              <div className="eniwas-form-group">
                <label className="eniwas-label">Rejection Reason <span style={{ color: "#dc2626" }}>*</span></label>
                <select className="eniwas-select" onChange={e => setRemarks(e.target.value)}>
                  <option value="">Select reason…</option>
                  <option value="ineligible">Not eligible for requested type</option>
                  <option value="existing">Already has an active allotment</option>
                  <option value="docs">Incomplete documentation</option>
                  <option value="pending_dues">Pending dues on previous allotment</option>
                  <option value="other">Other</option>
                </select>
              </div>
            )}

            {action === "waitlist" && (
              <div className="eniwas-form-group">
                <label className="eniwas-label">Waitlist Priority</label>
                <select className="eniwas-select">
                  <option>Position 1 (Highest Priority)</option>
                  <option>Position 2</option>
                  <option>Position 3</option>
                  <option>End of Queue</option>
                </select>
              </div>
            )}

            <div className="eniwas-form-group">
              <label className="eniwas-label">Admin Remarks</label>
              <textarea className="eniwas-textarea" placeholder="Additional notes…" value={remarks} onChange={e => setRemarks(e.target.value)} />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                className={`btn ${action === "approve" ? "btn-success" : action === "reject" ? "btn-danger" : "btn-orange"}`}
                onClick={() => handleAction(action)}>
                Confirm {action === "approve" ? "Approval" : action === "reject" ? "Rejection" : "Waitlist"}
              </button>
              <button className="btn btn-secondary" onClick={() => { setSelected(null); setAction(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
