"use client";

export default function OccupancyPage() {
  const data = [
    { colony: "Kadamkuan Govt Colony", type: "Type-IV", total: 48, occupied: 44, available: 4, rate: 91.7 },
    { colony: "Kankarbagh Officers Colony", type: "Type-IV", total: 36, occupied: 31, available: 5, rate: 86.1 },
    { colony: "Bailey Road VIP Colony", type: "Type-V", total: 12, occupied: 11, available: 1, rate: 91.7 },
    { colony: "Rajendra Nagar Staff Colony", type: "Type-III", total: 120, occupied: 108, available: 12, rate: 90.0 },
    { colony: "Phulwari Staff Colony", type: "Type-III", total: 90, occupied: 74, available: 16, rate: 82.2 },
    { colony: "Danapur Staff Quarters", type: "Type-II", total: 200, occupied: 178, available: 22, rate: 89.0 },
  ];

  return (
    <div>
      <div className="eniwas-page-header">
        <div className="eniwas-breadcrumb">Admin / <span>Occupancy Monitor</span></div>
        <h2>Occupancy Monitoring</h2>
        <p>Real-time occupancy rates across all government colonies</p>
      </div>

      <div className="eniwas-stats" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 20 }}>
        <div className="eniwas-stat"><div className="eniwas-stat-label">Total Units</div><div className="eniwas-stat-value">3,320</div></div>
        <div className="eniwas-stat green"><div className="eniwas-stat-label">Occupied</div><div className="eniwas-stat-value">2,970</div></div>
        <div className="eniwas-stat"><div className="eniwas-stat-label">Available</div><div className="eniwas-stat-value">338</div></div>
        <div className="eniwas-stat orange"><div className="eniwas-stat-label">Overall Rate</div><div className="eniwas-stat-value">89.5%</div></div>
      </div>

      <div className="eniwas-card">
        <div className="eniwas-card-title"><span className="icon">🏘️</span> Colony-wise Occupancy</div>
        {data.map(d => {
          const color = d.rate > 90 ? "#dc2626" : d.rate > 85 ? "#e87722" : "#1a3a8f";
          return (
            <div key={d.colony} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{d.colony}</span>
                  <span className="badge badge-blue" style={{ marginLeft: 8, fontSize: 10 }}>{d.type}</span>
                </div>
                <div style={{ color: "#475569" }}>{d.occupied}/{d.total} units · <strong style={{ color }}>{d.rate}%</strong></div>
              </div>
              <div style={{ background: "#f1f5f9", borderRadius: 6, height: 20, overflow: "hidden" }}>
                <div style={{ width: `${d.rate}%`, background: color, height: "100%", borderRadius: 6, display: "flex", alignItems: "center", paddingLeft: 8, fontSize: 11, fontWeight: 600, color: "white" }}>
                  {d.occupied} occupied
                </div>
              </div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{d.available} units available for allotment</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
