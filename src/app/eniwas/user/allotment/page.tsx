"use client";

export default function AllotmentPage() {
  return (
    <div>
      <div className="eniwas-page-header">
        <div className="eniwas-breadcrumb">Dashboard / <span>My Allotment</span></div>
        <h2>My Allotment Details</h2>
        <p>Current and historical allotment information</p>
      </div>

      {/* Active allotment */}
      <div className="eniwas-card" style={{ marginBottom: 20, borderLeft: "4px solid #16a34a" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 28 }}>🏢</span>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#0d2b6b" }}>Type-IV, Flat No. 12B</div>
                <div style={{ fontSize: 13, color: "#64748b" }}>Kadamkuan Government Colony, Patna</div>
              </div>
              <span className="badge badge-green" style={{ marginLeft: 8 }}>Active</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
              {[
                { label: "Allotment Order No.", value: "BCD/ALLOT/2021/0342" },
                { label: "Date of Allotment", value: "10 Mar 2021" },
                { label: "Date of Occupancy", value: "12 Mar 2021" },
                { label: "Allotment Pool", value: "IAS/IPS Pool" },
                { label: "Property Category", value: "Type-IV" },
                { label: "Area", value: "145 sq.m." },
                { label: "Floor", value: "2nd Floor" },
                { label: "Monthly Rent", value: "₹2,840" },
              ].map(f => (
                <div key={f.label}>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{f.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1a2a3a" }}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 140 }}>
            <button className="btn btn-secondary btn-sm">📄 Download Allotment Letter</button>
            <button className="btn btn-secondary btn-sm">🗓️ View Rent Schedule</button>
            <button className="btn btn-danger btn-sm">🚪 Apply for NOC / Vacation</button>
          </div>
        </div>
      </div>

      {/* Property details */}
      <div className="eniwas-grid-2" style={{ marginBottom: 20 }}>
        <div className="eniwas-card">
          <div className="eniwas-card-title"><span className="icon">🏗️</span> Property Details</div>
          <table className="eniwas-table">
            <tbody>
              {[
                ["Property ID", "PROP-KAD-IV-012B"],
                ["Location", "Kadamkuan, Patna – 800003"],
                ["Building Name", "Block C, Tower 2"],
                ["Total Floors", "6"],
                ["Year of Construction", "2002"],
                ["Last Maintenance", "15 Jan 2026"],
                ["Fire Safety Certificate", "Valid till Dec 2026"],
                ["Occupancy Certificate", "Yes – Issued 2003"],
              ].map(([k, v]) => (
                <tr key={k}><td style={{ color: "#64748b", fontWeight: 500 }}>{k}</td><td style={{ fontWeight: 600 }}>{v}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="eniwas-card">
          <div className="eniwas-card-title"><span className="icon">📜</span> Allotment History</div>
          <div className="timeline">
            {[
              { color: "green", title: "Current Allotment – Active", desc: "Type-IV, Flat 12B, Kadamkuan Colony", date: "12 Mar 2021 – Present" },
              { color: "orange", title: "Previous Request – Pending", desc: "Applied for Type-IV in Boring Road Colony", date: "Feb 2021 (Not allotted – waiting list)" },
              { color: "gray", title: "First Application", desc: "Type-III request – Not eligible, Pay Level upgraded", date: "Nov 2019" },
            ].map((e, i) => (
              <div key={i} className="timeline-item">
                <div className={`timeline-dot ${e.color}`} />
                <div className="timeline-title">{e.title}</div>
                <div className="timeline-desc">{e.desc}</div>
                <div className="timeline-date">{e.date}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending requests */}
      <div className="eniwas-card">
        <div className="eniwas-card-title"><span className="icon material-symbols-outlined">pending_actions</span> Pending / Past Requests</div>
        <table className="eniwas-table">
          <thead>
            <tr><th>Ref No.</th><th>Property</th><th>Applied On</th><th>Status</th><th>Remarks</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>REQ-2021-00114</td>
              <td>Type-IV, Flat 12B, Kadamkuan</td>
              <td>10 Feb 2021</td>
              <td><span className="badge badge-green">Approved</span></td>
              <td>Allotment letter issued 10 Mar 2021</td>
            </tr>
            <tr>
              <td>REQ-2021-00098</td>
              <td>Type-IV, Flat 8A, Boring Road</td>
              <td>15 Jan 2021</td>
              <td><span className="badge badge-yellow">Waiting List</span></td>
              <td>Position 3 – moved on after new allotment</td>
            </tr>
            <tr>
              <td>REQ-2019-00312</td>
              <td>Type-III, Rajendra Nagar</td>
              <td>10 Nov 2019</td>
              <td><span className="badge badge-red">Rejected</span></td>
              <td>Not eligible for Type-III at Pay Level 11</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
