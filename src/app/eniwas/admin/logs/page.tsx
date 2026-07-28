"use client";

const LOGS = [
  { time: "04 Jun 2026, 11:20", user: "S. Prasad (Admin)", action: "Allotment Approved", target: "REQ-2026-00410 – Deepak Verma", module: "Allotment", ip: "10.0.1.12" },
  { time: "04 Jun 2026, 10:45", user: "R. Kumar (Admin)", action: "NOC Issued", target: "NOC-2026-00041 – Kavita Singh", module: "NOC", ip: "10.0.1.18" },
  { time: "03 Jun 2026, 16:30", user: "S. Prasad (Admin)", action: "Request Rejected", target: "REQ-2026-00388 – Mohan Lal", module: "Allotment", ip: "10.0.1.12" },
  { time: "01 Jun 2026, 09:00", user: "System (Auto)", action: "Penalty Applied", target: "48 employees – May 2026 arrears", module: "Rent", ip: "System" },
  { time: "31 May 2026, 17:00", user: "S. Prasad (Admin)", action: "Waiting List Updated", target: "2 employees promoted", module: "Allotment", ip: "10.0.1.12" },
  { time: "30 May 2026, 14:22", user: "System (HRMS Sync)", action: "Profile Updated", target: "BH-IAS-19-0842 – Rajesh Kumar", module: "Profile", ip: "HRMS API" },
];

const ACCESS = [
  { role: "Super Admin", name: "Director, BCD", access: ["All Modules", "User Management", "System Config"] },
  { role: "Rental Division Admin", name: "Dy. Director, Rental", access: ["Allotment", "NOC", "Rent", "Reports", "Employee View"] },
  { role: "Allotment Committee", name: "Joint Director", access: ["Pending Requests", "Waiting List", "Property View"] },
  { role: "Finance Admin", name: "Accounts Officer", access: ["Rent Collection", "Arrears", "Financial Reports"] },
  { role: "Employee (User)", name: "All Government Employees", access: ["Own Profile", "Property Browse", "Own Rent", "NOC Application"] },
];

export default function LogsPage() {
  return (
    <div>
      <div className="eniwas-page-header">
        <div className="eniwas-breadcrumb">Admin / <span>Access & Logs</span></div>
        <h2>Access Matrix & Audit Logs</h2>
        <p>Role-based access control and system activity tracking</p>
      </div>

      <div className="eniwas-grid-2" style={{ marginBottom: 20 }}>
        <div className="eniwas-card">
          <div className="eniwas-card-title"><span className="icon material-symbols-outlined">manage_accounts</span> Access Matrix</div>
          <table className="eniwas-table">
            <thead><tr><th>Role</th><th>Name / Group</th><th>Modules</th></tr></thead>
            <tbody>
              {ACCESS.map(a => (
                <tr key={a.role}>
                  <td style={{ fontWeight: 600 }}>{a.role}</td>
                  <td style={{ fontSize: 12, color: "#64748b" }}>{a.name}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {a.access.map(m => <span key={m} className="badge badge-blue" style={{ fontSize: 10 }}>{m}</span>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="eniwas-card">
          <div className="eniwas-card-title"><span className="icon material-symbols-outlined">history</span> Recent Audit Logs</div>
          <table className="eniwas-table">
            <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Module</th></tr></thead>
            <tbody>
              {LOGS.map((l, i) => (
                <tr key={i}>
                  <td style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}>{l.time}</td>
                  <td style={{ fontSize: 12 }}>{l.user}</td>
                  <td>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{l.action}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>{l.target}</div>
                  </td>
                  <td><span className="badge badge-gray" style={{ fontSize: 10 }}>{l.module}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
