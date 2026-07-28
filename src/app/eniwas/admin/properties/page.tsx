"use client";
import { useState } from "react";

type Property = {
  id: string; type: string; flat: string; colony: string; location: string;
  area: number; floor: number; pool: string; status: string;
  tenant: string; tenantId: string; since: string; vacancyDate: string;
  oc: string; fire: string; lastMaint: string;
  baseRent: number; waterCharge: number; maintCharge: number;
  maintRemarks: string; nextMaintDue: string; allottedTo: string;
};

const INITIAL: Property[] = [
  { id: "PROP-KAD-IV-012B", type: "Type-IV", flat: "12B", colony: "Kadamkuan Govt Colony", location: "Patna", area: 145, floor: 2, pool: "IAS/IPS", status: "Occupied", tenant: "Rajesh Kumar", tenantId: "BH-IAS-19-0842", since: "12 Mar 2021", vacancyDate: "", oc: "Yes", fire: "Valid", lastMaint: "15 Jan 2026", baseRent: 2560, waterCharge: 120, maintCharge: 160, maintRemarks: "Routine inspection done", nextMaintDue: "2026-07-15", allottedTo: "Rajesh Kumar" },
  { id: "PROP-KAD-IV-012A", type: "Type-IV", flat: "12A", colony: "Kadamkuan Govt Colony", location: "Patna", area: 145, floor: 2, pool: "IAS/IPS", status: "Available", tenant: "—", tenantId: "", since: "—", vacancyDate: "10 Feb 2026", oc: "Yes", fire: "Valid", lastMaint: "20 Mar 2026", baseRent: 2560, waterCharge: 120, maintCharge: 160, maintRemarks: "Painted & cleaned", nextMaintDue: "2026-09-20", allottedTo: "" },
  { id: "PROP-KNK-IV-007C", type: "Type-IV", flat: "7C", colony: "Kankarbagh Officers Colony", location: "Patna", area: 138, floor: 4, pool: "IAS/IPS", status: "Available", tenant: "—", tenantId: "", since: "—", vacancyDate: "22 Jan 2026", oc: "Yes", fire: "Valid", lastMaint: "10 Feb 2026", baseRent: 2440, waterCharge: 115, maintCharge: 152, maintRemarks: "Plumbing fixed", nextMaintDue: "2026-08-10", allottedTo: "" },
  { id: "PROP-BAI-V-003B", type: "Type-V", flat: "3B", colony: "Bailey Road VIP Colony", location: "Patna", area: 210, floor: 1, pool: "Secretary", status: "Occupied", tenant: "Meena Devi", tenantId: "BH-IAS-17-0055", since: "20 Jun 2019", vacancyDate: "", oc: "Yes", fire: "Expired", lastMaint: "01 Dec 2025", baseRent: 4400, waterCharge: 200, maintCharge: 300, maintRemarks: "Fire cert needs renewal", nextMaintDue: "2026-06-30", allottedTo: "Meena Devi" },
  { id: "PROP-RNR-III-022D", type: "Type-III", flat: "22D", colony: "Rajendra Nagar Staff Colony", location: "Patna", area: 95, floor: 3, pool: "General", status: "Occupied", tenant: "Vivek Singh", tenantId: "BH-PCS-21-0392", since: "15 Sep 2022", vacancyDate: "", oc: "Yes", fire: "Valid", lastMaint: "11 Apr 2026", baseRent: 1180, waterCharge: 80, maintCharge: 100, maintRemarks: "All systems OK", nextMaintDue: "2026-10-11", allottedTo: "Vivek Singh" },
  { id: "PROP-PHU-III-014C", type: "Type-III", flat: "14C", colony: "Phulwari Staff Colony", location: "Patna Rural", area: 88, floor: 2, pool: "General", status: "Maintenance", tenant: "—", tenantId: "", since: "—", vacancyDate: "05 Mar 2026", oc: "Yes", fire: "Valid", lastMaint: "—", baseRent: 1100, waterCharge: 75, maintCharge: 96, maintRemarks: "Under repair – ceiling crack", nextMaintDue: "2026-06-30", allottedTo: "" },
];

export default function PropertiesAdminPage() {
  const [properties, setProperties] = useState<Property[]>(INITIAL);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Property | null>(null);
  const [tab, setTab] = useState<"vacancy" | "rent" | "maintenance" | "allot">("vacancy");
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<Partial<Property>>({});

  function openEdit(p: Property) {
    setEditing(p);
    setForm({ ...p });
    setTab("vacancy");
    setSaved(false);
  }

  function save() {
    setProperties(prev => prev.map(p => p.id === editing!.id ? { ...p, ...form } as Property : p));
    setSaved(true);
    setTimeout(() => { setEditing(null); setSaved(false); }, 1400);
  }

  const filtered = properties.filter(p =>
    (filter === "All" || p.status === filter) &&
    (search === "" || p.colony.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()))
  );

  const totalRent = (form.baseRent || 0) + (form.waterCharge || 0) + (form.maintCharge || 0);

  return (
    <div>
      <div className="eniwas-page-header">
        <div className="eniwas-breadcrumb">Admin / <span>Property Registry</span></div>
        <h2>Property Registry</h2>
        <p>Manage vacancy dates, rent, maintenance & allotment for all government properties</p>
      </div>

      <div className="eniwas-stats" style={{ gridTemplateColumns: "repeat(5, 1fr)", marginBottom: 20 }}>
        {[
          { label: "Total", value: "3,320", cls: "" },
          { label: "Occupied", value: String(properties.filter(p => p.status === "Occupied").length + 2964), cls: "green" },
          { label: "Available", value: String(properties.filter(p => p.status === "Available").length + 330), cls: "" },
          { label: "Maintenance", value: String(properties.filter(p => p.status === "Maintenance").length + 11), cls: "orange" },
          { label: "Fire Cert. Expired", value: String(properties.filter(p => p.fire === "Expired").length + 3), cls: "red" },
        ].map(s => (
          <div key={s.label} className={`eniwas-stat ${s.cls}`} style={{ padding: "12px 14px" }}>
            <div className="eniwas-stat-label">{s.label}</div>
            <div className="eniwas-stat-value" style={{ fontSize: 20 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="eniwas-filter-bar">
        <div className="eniwas-search-box">
          <span className="icon material-symbols-outlined">search</span>
          <input className="eniwas-input" placeholder="Search by colony, property ID…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {["All", "Available", "Occupied", "Maintenance"].map(f => (
          <button key={f} className={`btn ${filter === f ? "btn-primary" : "btn-secondary"} btn-sm`} onClick={() => setFilter(f)}>{f}</button>
        ))}
        <button className="btn btn-orange btn-sm" style={{ marginLeft: "auto" }}>+ Add Property</button>
        <button className="btn btn-secondary btn-sm">📥 Export</button>
      </div>

      <div className="eniwas-card">
        <table className="eniwas-table">
          <thead>
            <tr>
              <th>Property ID</th><th>Type</th><th>Colony / Location</th><th>Pool</th>
              <th>Status</th><th>Current Tenant</th><th>Vacancy Date</th>
              <th>Monthly Rent</th><th>Last Maint.</th><th>Fire</th><th>Update</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600, fontSize: 11, color: "#0d2b6b" }}>{p.id}</td>
                <td><span className="badge badge-blue">{p.type}</span></td>
                <td>
                  <div style={{ fontWeight: 500 }}>Flat {p.flat} – {p.colony}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{p.location} · Floor {p.floor === 0 ? "G" : p.floor} · {p.area}m²</div>
                </td>
                <td style={{ fontSize: 12 }}>{p.pool}</td>
                <td>
                  <span className={`badge ${p.status === "Occupied" ? "badge-green" : p.status === "Available" ? "badge-blue" : "badge-orange"}`}>{p.status}</span>
                </td>
                <td style={{ fontSize: 12 }}>
                  {p.tenant !== "—"
                    ? <><div style={{ fontWeight: 600 }}>{p.tenant}</div><div style={{ fontSize: 10, color: "#94a3b8" }}>Since {p.since}</div></>
                    : <span style={{ color: "#94a3b8" }}>Vacant</span>}
                </td>
                <td style={{ fontSize: 12, color: p.vacancyDate ? "#16a34a" : "#94a3b8" }}>
                  {p.vacancyDate || "—"}
                </td>
                <td style={{ fontSize: 13, fontWeight: 600, color: "#0d2b6b" }}>
                  ₹{(p.baseRent + p.waterCharge + p.maintCharge).toLocaleString()}
                  <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 400 }}>Base+Water+Maint.</div>
                </td>
                <td style={{ fontSize: 11 }}>{p.lastMaint}</td>
                <td><span className={`badge ${p.fire === "Valid" ? "badge-green" : "badge-red"}`}>{p.fire}</span></td>
                <td>
                  <button className="btn btn-primary btn-xs" onClick={() => openEdit(p)}>✏️ Update</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Update Modal ── */}
      {editing && (
        <div className="eniwas-modal-overlay" onClick={() => setEditing(null)}>
          <div className="eniwas-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 580 }}>

            {saved ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 10 }}>✅</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#0d2b6b" }}>Updated Successfully!</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>Property {editing.id} has been updated.</div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div style={{ marginBottom: 16 }}>
                  <div className="eniwas-modal-title">✏️ Update Property</div>
                  <div className="eniwas-modal-sub">
                    {editing.id} · Flat {editing.flat} – {editing.colony}
                  </div>
                </div>

                {/* Tab switcher */}
                <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
                  {([
                    { key: "vacancy", label: "🗓️ Vacancy Date" },
                    { key: "rent",    label: "💰 Rent" },
                    { key: "maintenance", label: "🔧 Maintenance" },
                    { key: "allot",   label: "🏠 Allot Property" },
                  ] as const).map(t => (
                    <button key={t.key}
                      onClick={() => setTab(t.key)}
                      style={{
                        padding: "7px 14px", borderRadius: 7, border: "none", cursor: "pointer",
                        fontSize: 12, fontWeight: 600,
                        background: tab === t.key ? "#1a3a8f" : "#f1f5f9",
                        color: tab === t.key ? "white" : "#475569",
                      }}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* ── VACANCY DATE ── */}
                {tab === "vacancy" && (
                  <div>
                    <div className="eniwas-alert eniwas-alert-info" style={{ marginBottom: 16 }}>
                      <span>ℹ️</span>
                      <span>Set the date when this property was vacated / became available for fresh allotment.</span>
                    </div>
                    <div className="eniwas-form-row">
                      <div className="eniwas-form-group">
                        <label className="eniwas-label">Vacancy Date <span style={{ color: "#dc2626" }}>*</span></label>
                        <input className="eniwas-input" type="date"
                          value={form.vacancyDate || ""}
                          onChange={e => setForm(f => ({ ...f, vacancyDate: e.target.value }))} />
                      </div>
                      <div className="eniwas-form-group">
                        <label className="eniwas-label">Update Status To</label>
                        <select className="eniwas-select"
                          value={form.status}
                          onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                          <option value="Available">Available – Ready for Allotment</option>
                          <option value="Maintenance">Under Maintenance</option>
                          <option value="Occupied">Occupied</option>
                        </select>
                      </div>
                    </div>
                    <div className="eniwas-form-group">
                      <label className="eniwas-label">Vacated By (Employee Name / ID)</label>
                      <input className="eniwas-input" placeholder="e.g. Rajesh Kumar / BH-IAS-19-0842"
                        value={form.tenant === "—" ? "" : (form.tenant || "")}
                        onChange={e => setForm(f => ({ ...f, tenant: e.target.value || "—" }))} />
                    </div>
                    <div className="eniwas-form-group">
                      <label className="eniwas-label">Reason for Vacancy</label>
                      <select className="eniwas-select">
                        <option>Transfer of occupant</option>
                        <option>Retirement</option>
                        <option>NOC processed – voluntary vacation</option>
                        <option>Court order / disciplinary action</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div className="eniwas-form-group">
                      <label className="eniwas-label">Remarks</label>
                      <textarea className="eniwas-textarea" placeholder="Any notes about the vacation…" />
                    </div>
                  </div>
                )}

                {/* ── RENT ── */}
                {tab === "rent" && (
                  <div>
                    <div className="eniwas-alert eniwas-alert-info" style={{ marginBottom: 16 }}>
                      <span>ℹ️</span>
                      <span>Update rent components for this property. Changes will apply from the next billing cycle.</span>
                    </div>
                    <div className="eniwas-form-row-3">
                      <div className="eniwas-form-group">
                        <label className="eniwas-label">Base Rent (₹/month)</label>
                        <input className="eniwas-input" type="number"
                          value={form.baseRent || ""}
                          onChange={e => setForm(f => ({ ...f, baseRent: Number(e.target.value) }))} />
                      </div>
                      <div className="eniwas-form-group">
                        <label className="eniwas-label">Water Charges (₹)</label>
                        <input className="eniwas-input" type="number"
                          value={form.waterCharge || ""}
                          onChange={e => setForm(f => ({ ...f, waterCharge: Number(e.target.value) }))} />
                      </div>
                      <div className="eniwas-form-group">
                        <label className="eniwas-label">Maintenance Fund (₹)</label>
                        <input className="eniwas-input" type="number"
                          value={form.maintCharge || ""}
                          onChange={e => setForm(f => ({ ...f, maintCharge: Number(e.target.value) }))} />
                      </div>
                    </div>

                    {/* Live total */}
                    <div style={{ background: "linear-gradient(135deg, #0d2b6b, #1a3a8f)", borderRadius: 10, padding: "14px 18px", color: "white", marginBottom: 16 }}>
                      <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>UPDATED MONTHLY TOTAL</div>
                      <div style={{ fontSize: 28, fontWeight: 800 }}>₹{totalRent.toLocaleString()}</div>
                      <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                        <span>Base: ₹{form.baseRent || 0}</span>
                        <span>Water: ₹{form.waterCharge || 0}</span>
                        <span>Maint: ₹{form.maintCharge || 0}</span>
                      </div>
                    </div>

                    <div className="eniwas-form-row">
                      <div className="eniwas-form-group">
                        <label className="eniwas-label">Effective From</label>
                        <input className="eniwas-input" type="date"
                          defaultValue={new Date().toISOString().split("T")[0]} />
                      </div>
                      <div className="eniwas-form-group">
                        <label className="eniwas-label">Penalty Rate (%)</label>
                        <select className="eniwas-select">
                          <option>10% (Default)</option>
                          <option>5%</option>
                          <option>15%</option>
                        </select>
                      </div>
                    </div>
                    <div className="eniwas-form-group">
                      <label className="eniwas-label">Revision Reason</label>
                      <select className="eniwas-select">
                        <option>Annual revision per policy</option>
                        <option>Revised area assessment</option>
                        <option>Category reclassification</option>
                        <option>Government order / circular</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* ── MAINTENANCE ── */}
                {tab === "maintenance" && (
                  <div>
                    <div className="eniwas-alert eniwas-alert-info" style={{ marginBottom: 16 }}>
                      <span>ℹ️</span>
                      <span>Record maintenance activity and schedule the next inspection for this property.</span>
                    </div>
                    <div className="eniwas-form-row">
                      <div className="eniwas-form-group">
                        <label className="eniwas-label">Last Maintenance Date</label>
                        <input className="eniwas-input" type="date"
                          value={form.lastMaint && form.lastMaint !== "—"
                            ? new Date(form.lastMaint).toISOString().split("T")[0]
                            : ""}
                          onChange={e => setForm(f => ({
                            ...f,
                            lastMaint: e.target.value
                              ? new Date(e.target.value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                              : "—"
                          }))} />
                      </div>
                      <div className="eniwas-form-group">
                        <label className="eniwas-label">Next Maintenance Due</label>
                        <input className="eniwas-input" type="date"
                          value={form.nextMaintDue || ""}
                          onChange={e => setForm(f => ({ ...f, nextMaintDue: e.target.value }))} />
                      </div>
                    </div>
                    <div className="eniwas-form-group">
                      <label className="eniwas-label">Maintenance Type</label>
                      <select className="eniwas-select">
                        <option>Routine Inspection</option>
                        <option>Plumbing Repair</option>
                        <option>Electrical Work</option>
                        <option>Civil / Structural Repair</option>
                        <option>Pest Control</option>
                        <option>Painting & Whitewash</option>
                        <option>Fire Safety Check</option>
                        <option>Full Renovation</option>
                      </select>
                    </div>
                    <div className="eniwas-form-group">
                      <label className="eniwas-label">Fire Safety Certificate Status</label>
                      <select className="eniwas-select"
                        value={form.fire || "Valid"}
                        onChange={e => setForm(f => ({ ...f, fire: e.target.value }))}>
                        <option value="Valid">Valid</option>
                        <option value="Expired">Expired – Renewal Required</option>
                        <option value="Pending">Pending Inspection</option>
                      </select>
                    </div>
                    <div className="eniwas-form-group">
                      <label className="eniwas-label">Maintenance Remarks</label>
                      <textarea className="eniwas-textarea"
                        value={form.maintRemarks || ""}
                        onChange={e => setForm(f => ({ ...f, maintRemarks: e.target.value }))}
                        placeholder="Describe work done or required…" />
                    </div>
                    <div className="eniwas-form-group">
                      <label className="eniwas-label">Contractor / Team</label>
                      <input className="eniwas-input" placeholder="e.g. PWD Team B / Patna" />
                    </div>
                    <div className="eniwas-form-group">
                      <label className="eniwas-label">Cost Incurred (₹)</label>
                      <input className="eniwas-input" type="number" placeholder="0" />
                    </div>
                  </div>
                )}

                {/* ── ALLOT PROPERTY ── */}
                {tab === "allot" && (
                  <div>
                    <div className={`eniwas-alert ${editing.status === "Available" ? "eniwas-alert-success" : "eniwas-alert-warning"}`} style={{ marginBottom: 16 }}>
                      <span>{editing.status === "Available" ? "✅" : "⚠️"}</span>
                      <span>
                        {editing.status === "Available"
                          ? "This property is available and can be allotted to an eligible employee."
                          : `This property is currently ${editing.status}. Update status to Available before allotting.`}
                      </span>
                    </div>
                    <div className="eniwas-form-row">
                      <div className="eniwas-form-group">
                        <label className="eniwas-label">Allot To (Employee Name)</label>
                        <input className="eniwas-input" placeholder="e.g. Amit Kumar"
                          value={form.allottedTo || ""}
                          onChange={e => setForm(f => ({ ...f, allottedTo: e.target.value }))} />
                      </div>
                      <div className="eniwas-form-group">
                        <label className="eniwas-label">Employee ID</label>
                        <input className="eniwas-input" placeholder="e.g. BH-IAS-24-0081"
                          value={form.tenantId || ""}
                          onChange={e => setForm(f => ({ ...f, tenantId: e.target.value }))} />
                      </div>
                    </div>
                    <div className="eniwas-form-row">
                      <div className="eniwas-form-group">
                        <label className="eniwas-label">Allotment Date</label>
                        <input className="eniwas-input" type="date"
                          defaultValue={new Date().toISOString().split("T")[0]}
                          onChange={e => setForm(f => ({
                            ...f,
                            since: new Date(e.target.value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
                            status: "Occupied",
                            vacancyDate: ""
                          }))} />
                      </div>
                      <div className="eniwas-form-group">
                        <label className="eniwas-label">Allotment Order No.</label>
                        <input className="eniwas-input" placeholder="e.g. BCD/ALLOT/2026/0XXX" />
                      </div>
                    </div>
                    <div className="eniwas-form-group">
                      <label className="eniwas-label">Request Reference (if applicable)</label>
                      <input className="eniwas-input" placeholder="e.g. REQ-2026-00441" />
                    </div>
                    <div className="eniwas-form-group">
                      <label className="eniwas-label">Remarks</label>
                      <textarea className="eniwas-textarea" placeholder="Allotment committee notes…" />
                    </div>

                    {form.allottedTo && (
                      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "12px 14px", fontSize: 13, color: "#166534" }}>
                        <strong>Preview:</strong> Flat {editing.flat} will be allotted to <strong>{form.allottedTo}</strong> ({form.tenantId}) — status will change to <strong>Occupied</strong>.
                      </div>
                    )}
                  </div>
                )}

                {/* Footer buttons */}
                <div style={{ display: "flex", gap: 10, marginTop: 20, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
                  <button className="btn btn-primary" onClick={save}>💾 Save Changes</button>
                  <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
