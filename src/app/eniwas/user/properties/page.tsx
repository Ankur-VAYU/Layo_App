"use client";
import { useState } from "react";

const PROPERTIES = [
  { id: "P001", type: "Type-IV", flat: "12A", colony: "Kadamkuan Govt Colony", location: "Patna", area: 145, bedrooms: 3, floor: 2, pool: "IAS/IPS Pool", rent: 2840, status: "Available", amenities: ["Lift", "Parking", "Generator"] },
  { id: "P002", type: "Type-IV", flat: "7C", colony: "Kankarbagh Officers Colony", location: "Patna", area: 138, bedrooms: 3, floor: 4, pool: "IAS/IPS Pool", rent: 2680, status: "Available", amenities: ["Parking", "Garden"] },
  { id: "P003", type: "Type-V", flat: "3B", colony: "Bailey Road VIP Colony", location: "Patna", area: 210, bedrooms: 4, floor: 1, pool: "Secretary Pool", rent: 4200, status: "Available", amenities: ["Lift", "Parking", "Generator", "Security"] },
  { id: "P004", type: "Type-III", flat: "22D", colony: "Rajendra Nagar Staff Colony", location: "Patna", area: 95, bedrooms: 2, floor: 3, pool: "General Pool", rent: 1420, status: "Occupied", amenities: ["Parking"] },
  { id: "P005", type: "Type-IV", flat: "5A", colony: "Boring Road Officers Colony", location: "Patna", area: 150, bedrooms: 3, floor: 2, pool: "IAS/IPS Pool", rent: 2960, status: "Available", amenities: ["Lift", "Parking", "Gym"] },
  { id: "P006", type: "Type-II", flat: "11B", colony: "Danapur Staff Quarters", location: "Patna", area: 65, bedrooms: 2, floor: 1, pool: "General Pool", rent: 940, status: "Available", amenities: ["Parking"] },
  { id: "P007", type: "Type-V", flat: "1A", colony: "Patna Sahib VIP Residency", location: "Patna", area: 250, bedrooms: 5, floor: 0, pool: "Secretary Pool", rent: 5200, status: "Occupied", amenities: ["Lift", "Parking", "Generator", "Security", "Garden"] },
  { id: "P008", type: "Type-III", flat: "14C", colony: "Phulwari Staff Colony", location: "Patna Rural", area: 88, bedrooms: 2, floor: 2, pool: "General Pool", rent: 1240, status: "Available", amenities: ["Parking", "Garden"] },
];

export default function PropertiesPage() {
  const [typeFilter, setTypeFilter] = useState("All");
  const [poolFilter, setPoolFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("Available");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [showApply, setShowApply] = useState(false);
  const [applyProp, setApplyProp] = useState<typeof PROPERTIES[0] | null>(null);
  const [applyDone, setApplyDone] = useState(false);

  const filtered = PROPERTIES.filter(p =>
    (typeFilter === "All" || p.type === typeFilter) &&
    (poolFilter === "All" || p.pool === poolFilter) &&
    (statusFilter === "All" || p.status === statusFilter) &&
    (search === "" || p.colony.toLowerCase().includes(search.toLowerCase()) || p.type.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div className="eniwas-page-header">
        <div className="eniwas-breadcrumb">Dashboard / <span>Find Property</span></div>
        <h2>Browse Available Properties</h2>
        <p>Search & apply for government accommodation based on your eligibility</p>
      </div>

      <div className="eniwas-alert eniwas-alert-info">
        <span>ℹ️</span>
        <span>You are eligible for <strong>Type-IV</strong> and <strong>Type-V</strong> properties based on your pay level (Level 11, IAS cadre).</span>
      </div>

      {/* Filters */}
      <div className="eniwas-filter-bar">
        <div className="eniwas-search-box">
          <span className="icon material-symbols-outlined">search</span>
          <input className="eniwas-input" placeholder="Search colony, location…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="eniwas-select" style={{ width: "auto" }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="All">All Types</option>
          {["Type-I","Type-II","Type-III","Type-IV","Type-V"].map(t => <option key={t}>{t}</option>)}
        </select>
        <select className="eniwas-select" style={{ width: "auto" }} value={poolFilter} onChange={e => setPoolFilter(e.target.value)}>
          <option value="All">All Pools</option>
          {["IAS/IPS Pool","Secretary Pool","General Pool"].map(p => <option key={p}>{p}</option>)}
        </select>
        <select className="eniwas-select" style={{ width: "auto" }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="All">All Status</option>
          <option value="Available">Available Only</option>
          <option value="Occupied">Occupied</option>
        </select>
        <span style={{ fontSize: 12, color: "#64748b", marginLeft: "auto" }}>{filtered.length} properties found</span>
      </div>

      {/* Grid */}
      <div className="property-grid">
        {filtered.map(p => (
          <div key={p.id} className="property-card" onClick={() => setSelected(selected === p.id ? null : p.id)}>
            <div className="property-card-img">
              🏢
              <span className="category-badge">{p.type}</span>
              <span className={`avail-badge badge ${p.status === "Available" ? "badge-green" : "badge-gray"}`}>
                {p.status === "Available" ? "✓ Available" : "Occupied"}
              </span>
            </div>
            <div className="property-card-body">
              <div className="property-card-title">Flat {p.flat} – {p.colony}</div>
              <div className="property-card-loc">📍 {p.location} &nbsp;·&nbsp; Floor {p.floor === 0 ? "Ground" : p.floor}</div>
              <div className="property-card-meta">
                <div className="property-card-meta-item">🛏️ {p.bedrooms} BHK</div>
                <div className="property-card-meta-item">📐 {p.area} m²</div>
                <div className="property-card-meta-item">🏷️ {p.pool}</div>
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
                {p.amenities.map(a => <span key={a} style={{ fontSize: 10, background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 10 }}>{a}</span>)}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="property-card-rent">₹{p.rent.toLocaleString()} <span>/month</span></div>
                {p.status === "Available" && (
                  <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); setApplyProp(p); setShowApply(true); setApplyDone(false); }}>Apply</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Apply Modal */}
      {showApply && applyProp && (
        <div className="eniwas-modal-overlay" onClick={() => setShowApply(false)}>
          <div className="eniwas-modal" onClick={e => e.stopPropagation()}>
            {!applyDone ? (
              <>
                <div className="eniwas-modal-title">Apply for Allotment</div>
                <div className="eniwas-modal-sub">Flat {applyProp.flat} – {applyProp.colony}</div>

                <div className="eniwas-steps" style={{ marginBottom: 20 }}>
                  {["Property", "Preference", "Review", "Submit"].map((s, i) => (
                    <div key={s} className="eniwas-step">
                      <div className={`eniwas-step-circle ${i === 0 ? "active" : ""}`}>{i + 1}</div>
                      <div className={`eniwas-step-label ${i === 0 ? "active" : ""}`}>{s}</div>
                      {i < 3 && <div className="eniwas-step-line" />}
                    </div>
                  ))}
                </div>

                <div style={{ background: "#f8fafc", borderRadius: 8, padding: 14, marginBottom: 16, fontSize: 13 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      ["Type", applyProp.type],
                      ["Flat No.", applyProp.flat],
                      ["Colony", applyProp.colony],
                      ["Rent/Month", `₹${applyProp.rent.toLocaleString()}`],
                      ["Pool", applyProp.pool],
                      ["Area", `${applyProp.area} m²`],
                    ].map(([k, v]) => (
                      <div key={k}><span style={{ color: "#64748b", fontSize: 11 }}>{k}</span><br /><strong>{v}</strong></div>
                    ))}
                  </div>
                </div>

                <div className="eniwas-form-group">
                  <label className="eniwas-label">Reason for Request</label>
                  <textarea className="eniwas-textarea" placeholder="Briefly state your requirement for this accommodation…" />
                </div>
                <div className="eniwas-form-group">
                  <label className="eniwas-label">Preferred Move-in Date</label>
                  <input className="eniwas-input" type="date" />
                </div>
                <div className="eniwas-form-group">
                  <label className="eniwas-label">Preference Priority</label>
                  <select className="eniwas-select">
                    <option>1st Choice</option>
                    <option>2nd Choice</option>
                    <option>3rd Choice</option>
                  </select>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <button className="btn btn-primary" onClick={() => setApplyDone(true)}>Submit Request</button>
                  <button className="btn btn-secondary" onClick={() => setShowApply(false)}>Cancel</button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "10px 0" }}>
                <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#0d2b6b", marginBottom: 8 }}>Request Submitted!</div>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
                  Your allotment request for Flat {applyProp.flat} has been submitted.<br />
                  Reference ID: <strong>REQ-2026-00{Math.floor(Math.random()*900+100)}</strong>
                </div>
                <div style={{ fontSize: 12, color: "#475569", background: "#f8fafc", borderRadius: 8, padding: "10px 14px", marginBottom: 20, textAlign: "left" }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>What happens next?</div>
                  <div>1. Allotment Committee reviews your request</div>
                  <div>2. You will receive SMS/email on your registered mobile</div>
                  <div>3. Typical processing time: 7–14 working days</div>
                </div>
                <button className="btn btn-primary" onClick={() => setShowApply(false)}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
