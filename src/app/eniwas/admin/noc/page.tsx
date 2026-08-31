/* eslint-disable react/no-unescaped-entities */
"use client";
import { useState } from "react";
import { generateNOCPdf, type NOCData } from "@/lib/generateNOC";

const NOCS = [
  { id: "NOC-2026-00041", empId: "BH-IAS-21-0099", name: "Kavita Singh",  designation: "SDO",           dept: "Revenue",   flat: "9A",  colony: "Kankarbagh Officers Colony, Patna", type: "Type-IV", since: "14 Aug 2022", reason: "Transfer",    newPosting: "Gaya Sadar",  submitted: "28 May 2026", vacateDate: "30 Jun 2026", dues: "Nil" },
  { id: "NOC-2026-00038", empId: "BH-IPS-18-0077", name: "Ravi Shankar",  designation: "SP (Retd.)",    dept: "Home",      flat: "5C",  colony: "Boring Road Officers Colony, Patna",  type: "Type-IV", since: "02 Mar 2018", reason: "Retirement",  newPosting: "—",           submitted: "24 May 2026", vacateDate: "31 Jul 2026", dues: "₹2,840 pending" },
  { id: "NOC-2026-00031", empId: "BH-PCS-20-0112", name: "Suman Lata",    designation: "Circle Officer", dept: "Education", flat: "17B", colony: "Phulwari Staff Colony, Patna Rural",  type: "Type-III",since: "10 Jan 2021", reason: "Transfer",    newPosting: "Muzaffarpur", submitted: "18 May 2026", vacateDate: "25 Jun 2026", dues: "Nil" },
];

type ActionStatus = "Approved" | "Query" | "Rejected";

export default function NOCAdminPage() {
  const [selected, setSelected]   = useState<typeof NOCS[0] | null>(null);
  const [remarks,  setRemarks]    = useState("");
  const [actions,  setActions]    = useState<Record<string, ActionStatus>>({});
  const [loading,  setLoading]    = useState<string | null>(null);

  async function doAction(id: string, act: ActionStatus) {
    setActions(a => ({ ...a, [id]: act }));
    setSelected(null);
    setRemarks("");
  }

  async function downloadNOC(noc: typeof NOCS[0]) {
    setLoading(noc.id);
    const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    const payload: NOCData = {
      nocRef:      noc.id,
      empName:     noc.name,
      empId:       noc.empId,
      designation: noc.designation,
      department:  noc.dept,
      flat:        `Flat ${noc.flat}`,
      colony:      noc.colony,
      type:        noc.type,
      since:       noc.since,
      vacateDate:  noc.vacateDate,
      reason:      noc.reason,
      newPosting:  noc.newPosting,
      issuedBy:    "Suresh Prasad, Dy. Director (Rental)",
      issuedDate:  today,
      dues:        noc.dues,
    };
    await generateNOCPdf(payload);
    setLoading(null);
  }

  return (
    <div>
      <div className="eniwas-page-header">
        <div className="eniwas-breadcrumb">Admin / <span>NOC Management</span></div>
        <h2>NOC Management</h2>
        <p>Process No Objection Certificate requests — approved NOCs include a downloadable PDF with QR code</p>
      </div>

      {/* Stats */}
      <div className="eniwas-stats" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 20 }}>
        {[
          { label: "Pending Review",   value: NOCS.filter(n => !actions[n.id]).length,                             cls: "orange" },
          { label: "Under Query",      value: Object.values(actions).filter(v => v === "Query").length,            cls: "" },
          { label: "Approved (Month)", value: Object.values(actions).filter(v => v === "Approved").length + 8,     cls: "green" },
          { label: "Rejected (Month)", value: Object.values(actions).filter(v => v === "Rejected").length + 1,     cls: "red" },
        ].map(s => (
          <div key={s.label} className={`eniwas-stat ${s.cls}`} style={{ padding: "12px 14px" }}>
            <div className="eniwas-stat-label">{s.label}</div>
            <div className="eniwas-stat-value" style={{ fontSize: 22 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* NOC table */}
      <div className="eniwas-card">
        <div className="eniwas-card-title">
          <span className="icon material-symbols-outlined">description</span>
          NOC Requests
        </div>
        <table className="eniwas-table">
          <thead>
            <tr>
              <th>NOC Ref</th><th>Employee</th><th>Property</th>
              <th>Reason</th><th>Submitted</th><th>Dues</th>
              <th>Status</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {NOCS.map(n => {
              const status = actions[n.id];
              return (
                <tr key={n.id}>
                  <td style={{ fontWeight: 600, fontSize: 11, color: "#0d2b6b" }}>{n.id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{n.name}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{n.empId} · {n.designation}</div>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    Flat {n.flat}
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>{n.type}</div>
                  </td>
                  <td><span className="badge badge-blue">{n.reason}</span></td>
                  <td style={{ fontSize: 12 }}>{n.submitted}</td>
                  <td>
                    {n.dues === "Nil"
                      ? <span className="badge badge-green">Nil</span>
                      : <span className="badge badge-red">{n.dues}</span>}
                  </td>
                  <td>
                    <span className={`badge ${
                      !status             ? "badge-yellow" :
                      status === "Approved" ? "badge-green" :
                      status === "Query"    ? "badge-orange" : "badge-red"
                    }`}>{status ?? "Pending"}</span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {!status ? (
                        <button className="btn btn-primary btn-xs" onClick={() => { setSelected(n); setRemarks(""); }}>
                          Review
                        </button>
                      ) : status === "Approved" ? (
                        <button
                          className="btn btn-xs"
                          style={{ background: "#16a34a", color: "white", borderRadius: 5, padding: "3px 9px", fontSize: 11, border: "none", cursor: "pointer" }}
                          onClick={() => downloadNOC(n)}
                          disabled={loading === n.id}
                        >
                          {loading === n.id ? "⏳ Generating…" : "📄 Download NOC PDF"}
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Review Modal */}
      {selected && (
        <div className="eniwas-modal-overlay" onClick={() => setSelected(null)}>
          <div className="eniwas-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="eniwas-modal-title">NOC Review – {selected.id}</div>
            <div className="eniwas-modal-sub">{selected.name} · Flat {selected.flat}, {selected.type}</div>

            {/* Details grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 13, marginBottom: 16 }}>
              {[
                ["Employee ID",    selected.empId],
                ["Designation",    selected.designation],
                ["Department",     selected.dept],
                ["Reason",         selected.reason],
                ["New Posting",    selected.newPosting || "—"],
                ["Submitted",      selected.submitted],
                ["Expected Vacate",selected.vacateDate],
                ["Dues",           selected.dues],
              ].map(([k, v]) => (
                <div key={k} style={{ padding: "8px 10px", background: "#f8fafc", borderRadius: 6 }}>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>{k}</div>
                  <div style={{ fontWeight: 600, color: k === "Dues" && v !== "Nil" ? "#dc2626" : "#1a2a3a" }}>{v}</div>
                </div>
              ))}
            </div>

            {selected.dues !== "Nil" && (
              <div className="eniwas-alert eniwas-alert-warning" style={{ marginBottom: 14 }}>
                <span>⚠️</span>
                <span>Employee has {selected.dues}. NOC can still be approved — dues must be cleared before salary at new posting.</span>
              </div>
            )}

            <div className="eniwas-form-group">
              <label className="eniwas-label">Admin Remarks</label>
              <textarea className="eniwas-textarea" placeholder="Enter remarks…"
                value={remarks} onChange={e => setRemarks(e.target.value)} />
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <button className="btn btn-success btn-sm" onClick={() => doAction(selected.id, "Approved")}>
                ✅ Approve & Issue NOC
              </button>
              <button className="btn btn-orange btn-sm"  onClick={() => doAction(selected.id, "Query")}>
                ❓ Raise Query
              </button>
              <button className="btn btn-danger btn-sm"  onClick={() => doAction(selected.id, "Rejected")}>
                ❌ Reject
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Approved NOC preview hint */}
      {Object.values(actions).some(v => v === "Approved") && (
        <div className="eniwas-alert eniwas-alert-success" style={{ marginTop: 20 }}>
          <span>✅</span>
          <div>
            <strong>NOC Approved!</strong> Click <strong>"📄 Download NOC PDF"</strong> in the table above to generate and download the official NOC with QR verification code.
          </div>
        </div>
      )}
    </div>
  );
}
