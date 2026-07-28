"use client";

const WAITLIST = [
  { pos: 1, empId: "BH-IAS-24-0091", name: "Suresh Yadav", cadre: "IAS", payLevel: "Level 10", type: "Type-IV", since: "15 Apr 2026", priority: "High" },
  { pos: 2, empId: "BH-IPS-23-0044", name: "Nisha Patel", cadre: "IPS", payLevel: "Level 10", type: "Type-IV", since: "20 Apr 2026", priority: "Normal" },
  { pos: 3, empId: "BH-PCS-22-0310", name: "Alok Kumar", cadre: "State", payLevel: "Level 8", type: "Type-III", since: "01 May 2026", priority: "Normal" },
  { pos: 4, empId: "BH-IAS-23-0058", name: "Rekha Sinha", cadre: "IAS", payLevel: "Level 9", type: "Type-IV", since: "05 May 2026", priority: "Normal" },
];

export default function WaitlistPage() {
  return (
    <div>
      <div className="eniwas-page-header">
        <div className="eniwas-breadcrumb">Admin / Allotment / <span>Waiting List</span></div>
        <h2>Waiting List</h2>
        <p>Priority queue for property allotment when units become available</p>
      </div>
      <div className="eniwas-alert eniwas-alert-info">
        <span>ℹ️</span>
        <span>8 employees on waiting list. They will be notified automatically when a suitable property becomes available.</span>
      </div>
      <div className="eniwas-card">
        <table className="eniwas-table">
          <thead><tr><th>Position</th><th>Employee</th><th>Cadre / Pay Level</th><th>Requested Type</th><th>Since</th><th>Priority</th><th>Action</th></tr></thead>
          <tbody>
            {WAITLIST.map(w => (
              <tr key={w.empId}>
                <td style={{ fontWeight: 700, fontSize: 16, color: "#0d2b6b" }}>#{w.pos}</td>
                <td><div style={{ fontWeight: 600 }}>{w.name}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>{w.empId}</div></td>
                <td><span className="badge badge-purple">{w.cadre}</span><div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{w.payLevel}</div></td>
                <td><span className="badge badge-blue">{w.type}</span></td>
                <td style={{ fontSize: 12 }}>{w.since}</td>
                <td><span className={`badge ${w.priority === "High" ? "badge-red" : "badge-gray"}`}>{w.priority}</span></td>
                <td style={{ display: "flex", gap: 4 }}>
                  <button className="btn btn-xs btn-secondary">↑ Promote</button>
                  <button className="btn btn-xs btn-danger">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
