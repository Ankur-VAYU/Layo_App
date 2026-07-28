"use client";

const HISTORY = [
  { id: "REQ-2026-00410", name: "Deepak Verma", empId: "BH-PCS-22-0118", type: "Type-III", flat: "22B – Rajendra Nagar", date: "02 Jun 2026", status: "Approved", admin: "S. Prasad" },
  { id: "REQ-2026-00388", name: "Suneeta Kumari", empId: "BH-IAS-21-0077", type: "Type-IV", flat: "8C – Kankarbagh", date: "28 May 2026", status: "Rejected", admin: "R. Kumar" },
  { id: "REQ-2026-00341", name: "Mohan Lal", empId: "BH-PCS-23-0501", type: "Type-V", flat: "—", date: "20 May 2026", status: "Rejected", admin: "S. Prasad" },
  { id: "REQ-2026-00298", name: "Kamala Singh", empId: "BH-IAS-20-0166", type: "Type-IV", flat: "5A – Boring Road", date: "10 May 2026", status: "Approved", admin: "S. Prasad" },
];

export default function AllotmentHistoryPage() {
  return (
    <div>
      <div className="eniwas-page-header">
        <div className="eniwas-breadcrumb">Admin / Allotment / <span>History</span></div>
        <h2>Allotment History</h2>
        <p>Complete record of all allotment decisions</p>
      </div>
      <div className="eniwas-card">
        <table className="eniwas-table">
          <thead><tr><th>Ref No.</th><th>Employee</th><th>Type</th><th>Flat Allotted</th><th>Date</th><th>Status</th><th>Decided By</th></tr></thead>
          <tbody>
            {HISTORY.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600, fontSize: 12, color: "#0d2b6b" }}>{r.id}</td>
                <td><div style={{ fontWeight: 600 }}>{r.name}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>{r.empId}</div></td>
                <td><span className="badge badge-blue">{r.type}</span></td>
                <td style={{ fontSize: 12 }}>{r.flat}</td>
                <td style={{ fontSize: 12 }}>{r.date}</td>
                <td><span className={`badge ${r.status === "Approved" ? "badge-green" : "badge-red"}`}>{r.status}</span></td>
                <td style={{ fontSize: 12 }}>{r.admin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
