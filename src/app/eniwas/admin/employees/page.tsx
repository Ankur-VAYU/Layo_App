"use client";
import { useState } from "react";

const EMPLOYEES = [
  { empId: "BH-IAS-19-0842", name: "Rajesh Kumar", phone: "98XX-XX12", designation: "Dy. Collector", cadre: "IAS", dept: "Revenue", posting: "Patna Sadar", allotted: true, flat: "12B – Kadamkuan", occupancyDate: "12 Mar 2021", lastBill: "08 May 2026", dueAmount: 2840 },
  { empId: "BH-IAS-18-0621", name: "Anita Singh", phone: "97XX-XX44", designation: "SDO", cadre: "IAS", dept: "Finance", posting: "Patna Sadar", allotted: true, flat: "7A – Kankarbagh", occupancyDate: "04 Jan 2020", lastBill: "05 May 2026", dueAmount: 0 },
  { empId: "BH-IPS-20-0144", name: "Priya Sharma", phone: "96XX-XX88", designation: "DSP", cadre: "IPS", dept: "Home", posting: "Patna City", allotted: false, flat: "—", occupancyDate: "—", lastBill: "—", dueAmount: 0 },
  { empId: "BH-PCS-21-0392", name: "Vivek Singh", phone: "95XX-XX22", designation: "BDO", cadre: "State", dept: "Agriculture", posting: "Patna Rural", allotted: true, flat: "22D – Rajendra Nagar", occupancyDate: "15 Sep 2022", lastBill: "01 Apr 2026", dueAmount: 5680 },
  { empId: "BH-IAS-17-0055", name: "Meena Devi", phone: "94XX-XX66", designation: "Addl. Secretary", cadre: "IAS", dept: "Finance", posting: "Patna Sadar", allotted: true, flat: "3B – Bailey Road", occupancyDate: "20 Jun 2019", lastBill: "02 May 2026", dueAmount: 0 },
  { empId: "BH-PCS-22-0218", name: "Ranjit Kumar", phone: "93XX-XX11", designation: "Circle Officer", cadre: "State", dept: "Education", posting: "Phulwari", allotted: false, flat: "—", occupancyDate: "—", lastBill: "—", dueAmount: 0 },
];

export default function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [detail, setDetail] = useState<typeof EMPLOYEES[0] | null>(null);

  const filtered = EMPLOYEES.filter(e =>
    (filter === "All" || (filter === "Allotted" ? e.allotted : !e.allotted)) &&
    (search === "" || e.name.toLowerCase().includes(search.toLowerCase()) || e.empId.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div className="eniwas-page-header">
        <div className="eniwas-breadcrumb">Admin / <span>Employee Status</span></div>
        <h2>Employee Status Report</h2>
        <p>View allotment status, dues, and occupancy details for all employees</p>
      </div>

      <div className="eniwas-filter-bar">
        <div className="eniwas-search-box">
          <span className="icon material-symbols-outlined">search</span>
          <input className="eniwas-input" placeholder="Search by name or employee ID…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {["All", "Allotted", "Not Allotted"].map(f => (
          <button key={f} className={`btn ${filter === f ? "btn-primary" : "btn-secondary"} btn-sm`} onClick={() => setFilter(f)}>{f}</button>
        ))}
        <button className="btn btn-secondary btn-sm" style={{ marginLeft: "auto" }}>📥 Export CSV</button>
      </div>

      <div className="eniwas-card">
        <table className="eniwas-table">
          <thead>
            <tr><th>Employee</th><th>Cadre / Dept</th><th>Posting</th><th>Allotment</th><th>Occupancy Date</th><th>Last Bill</th><th>Due Amount</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.empId}>
                <td>
                  <div style={{ fontWeight: 600 }}>{e.name}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{e.empId} · {e.phone}</div>
                </td>
                <td>
                  <span className="badge badge-purple">{e.cadre}</span>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{e.designation}</div>
                </td>
                <td style={{ fontSize: 13 }}>{e.posting}</td>
                <td>
                  {e.allotted
                    ? <><span className="badge badge-green">Allotted</span><div style={{ fontSize: 11, marginTop: 2 }}>{e.flat}</div></>
                    : <span className="badge badge-gray">Not Allotted</span>}
                </td>
                <td style={{ fontSize: 12 }}>{e.occupancyDate}</td>
                <td style={{ fontSize: 12 }}>{e.lastBill}</td>
                <td>
                  {e.dueAmount > 0
                    ? <span style={{ color: "#dc2626", fontWeight: 700 }}>₹{e.dueAmount.toLocaleString()}</span>
                    : <span className="badge badge-green">Nil</span>}
                </td>
                <td><button className="btn btn-secondary btn-xs" onClick={() => setDetail(e)}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="eniwas-modal-overlay" onClick={() => setDetail(null)}>
          <div className="eniwas-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="eniwas-modal-title">Employee Detail – {detail.name}</div>
            <div className="eniwas-modal-sub">{detail.empId}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13, marginBottom: 16 }}>
              {[
                ["Full Name", detail.name],
                ["Employee ID", detail.empId],
                ["Phone", detail.phone],
                ["Designation", detail.designation],
                ["Cadre", detail.cadre],
                ["Department", detail.dept],
                ["Posting", detail.posting],
                ["Allotment Status", detail.allotted ? "Active" : "None"],
                ...(detail.allotted ? [
                  ["Flat / Property", detail.flat],
                  ["Occupied Since", detail.occupancyDate],
                  ["Last Bill Date", detail.lastBill],
                  ["Outstanding Dues", detail.dueAmount > 0 ? `₹${detail.dueAmount.toLocaleString()}` : "Nil"],
                ] : []),
              ].map(([k, v]) => (
                <div key={k} style={{ padding: "8px 10px", background: "#f8fafc", borderRadius: 6 }}>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>{k}</div>
                  <div style={{ fontWeight: 600 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {detail.dueAmount > 0 && <button className="btn btn-danger btn-sm">⚠️ Send Due Notice</button>}
              <button className="btn btn-secondary btn-sm">📄 View Full History</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
