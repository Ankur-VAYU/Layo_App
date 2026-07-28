"use client";
import { useState } from "react";

const COMPLAINTS = [
  { id: "CMP-2026-0041", category: "Plumbing", subject: "Water leakage in bathroom", date: "28 May 2026", status: "In Progress", assignee: "Maintenance Team A" },
  { id: "CMP-2026-0018", category: "Electrical", subject: "Corridor light not working – Floor 2", date: "10 Apr 2026", status: "Resolved", assignee: "Electrical Unit" },
  { id: "CMP-2025-0211", category: "Structural", subject: "Crack in exterior wall", date: "12 Nov 2025", status: "Resolved", assignee: "Civil Team" },
];

export default function ComplaintsPage() {
  const [showNew, setShowNew] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  return (
    <div>
      <div className="eniwas-page-header">
        <div className="eniwas-breadcrumb">Dashboard / <span>Complaints & Maintenance</span></div>
        <h2>Complaints & Maintenance Requests</h2>
        <p>Raise and track maintenance issues for your allotted accommodation</p>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div className="eniwas-stats" style={{ margin: 0, gridTemplateColumns: "repeat(3, auto)" }}>
          <div className="eniwas-stat" style={{ padding: "10px 16px" }}>
            <div className="eniwas-stat-label">Total</div>
            <div className="eniwas-stat-value" style={{ fontSize: 20 }}>3</div>
          </div>
          <div className="eniwas-stat orange" style={{ padding: "10px 16px" }}>
            <div className="eniwas-stat-label">In Progress</div>
            <div className="eniwas-stat-value" style={{ fontSize: 20 }}>1</div>
          </div>
          <div className="eniwas-stat green" style={{ padding: "10px 16px" }}>
            <div className="eniwas-stat-label">Resolved</div>
            <div className="eniwas-stat-value" style={{ fontSize: 20 }}>2</div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowNew(true); setSubmitted(false); }}>+ New Request</button>
      </div>

      <div className="eniwas-card">
        <div className="eniwas-card-title"><span className="icon material-symbols-outlined">handyman</span> My Maintenance Requests</div>
        <table className="eniwas-table">
          <thead>
            <tr><th>Ticket ID</th><th>Category</th><th>Subject</th><th>Date</th><th>Status</th><th>Assigned To</th></tr>
          </thead>
          <tbody>
            {COMPLAINTS.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600, color: "#0d2b6b" }}>{c.id}</td>
                <td><span className="badge badge-blue">{c.category}</span></td>
                <td>{c.subject}</td>
                <td style={{ fontSize: 12 }}>{c.date}</td>
                <td>
                  <span className={`badge ${c.status === "Resolved" ? "badge-green" : "badge-orange"}`}>{c.status}</span>
                </td>
                <td style={{ fontSize: 12 }}>{c.assignee}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && (
        <div className="eniwas-modal-overlay" onClick={() => setShowNew(false)}>
          <div className="eniwas-modal" onClick={e => e.stopPropagation()}>
            {!submitted ? (
              <>
                <div className="eniwas-modal-title">New Maintenance Request</div>
                <div className="eniwas-modal-sub">Flat 12B, Kadamkuan Colony</div>
                <div className="eniwas-form-group">
                  <label className="eniwas-label">Category</label>
                  <select className="eniwas-select">
                    <option>Plumbing</option>
                    <option>Electrical</option>
                    <option>Structural</option>
                    <option>Pest Control</option>
                    <option>Common Area</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="eniwas-form-group">
                  <label className="eniwas-label">Subject / Title</label>
                  <input className="eniwas-input" placeholder="Brief description of the issue" />
                </div>
                <div className="eniwas-form-group">
                  <label className="eniwas-label">Detailed Description</label>
                  <textarea className="eniwas-textarea" placeholder="Describe the problem in detail…" />
                </div>
                <div className="eniwas-form-group">
                  <label className="eniwas-label">Priority</label>
                  <select className="eniwas-select">
                    <option>Normal</option>
                    <option>Urgent</option>
                    <option>Emergency</option>
                  </select>
                </div>
                <div className="eniwas-form-group">
                  <label className="eniwas-label">Attach Photo (optional)</label>
                  <input type="file" className="eniwas-input" style={{ paddingTop: 6 }} accept="image/*" />
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button className="btn btn-primary" onClick={() => setSubmitted(true)}>Submit Request</button>
                  <button className="btn btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 10 }}>🔧</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#0d2b6b", marginBottom: 6 }}>Request Submitted!</div>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>Ticket ID: <strong>CMP-2026-00{Math.floor(Math.random()*90+50)}</strong><br />Maintenance team will respond within 48 hours.</div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowNew(false)}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
