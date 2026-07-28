"use client";
import { useState } from "react";

export default function UserProfile() {
  const [editing, setEditing] = useState(false);

  const profile = {
    emp_id: "BH-IAS-2019-00842",
    name: "Rajesh Kumar",
    phone: "98XXXXXX12",
    email: "rajesh.kumar@ias.bihar.gov.in",
    doj: "15 Aug 2019",
    dob: "12 Mar 1986",
    designation: "Deputy Collector",
    department: "Revenue Department",
    cadre: "IAS (Bihar Cadre)",
    pay_level: "Level 11 – ₹67,700",
    pay_grade: "Grade Pay 6600",
    service_status: "Active",
    posting: "Patna Sadar",
    district: "Patna",
    hrms_id: "HRMS-BH-84291",
  };

  return (
    <div>
      <div className="eniwas-page-header">
        <div className="eniwas-breadcrumb">Dashboard / <span>My Profile</span></div>
        <h2>Employee Profile</h2>
        <p>Synced from HRMS · Last updated: 02 Jun 2026, 09:14 AM</p>
      </div>

      <div className="eniwas-alert eniwas-alert-info">
        <span>ℹ️</span>
        <span>Profile data is auto-synced from HRMS. Contact your department admin for corrections to official details.</span>
      </div>

      <div className="eniwas-grid-2" style={{ marginBottom: 20 }}>
        {/* Identity card */}
        <div className="eniwas-card" style={{ background: "linear-gradient(135deg, #0d2b6b, #1a3a8f)", color: "white", border: "none" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20 }}>
            <div style={{ width: 72, height: 72, borderRadius: 12, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, border: "2px solid rgba(255,255,255,0.3)" }}>
              👤
            </div>
            <div>
              <div style={{ fontSize: 19, fontWeight: 800 }}>{profile.name}</div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{profile.designation}</div>
              <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>{profile.cadre}</div>
              <span className="badge badge-green" style={{ marginTop: 6 }}>🟢 Service Active</span>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Employee ID", value: profile.emp_id },
              { label: "HRMS ID", value: profile.hrms_id },
              { label: "Pay Level", value: profile.pay_level },
              { label: "Posting", value: profile.posting },
            ].map(f => (
              <div key={f.label}>
                <div style={{ fontSize: 10, opacity: 0.6 }}>{f.label}</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{f.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Allotment eligibility */}
        <div className="eniwas-card">
          <div className="eniwas-card-title"><span className="icon">✅</span> Allotment Eligibility</div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#16a34a", marginBottom: 2 }}>Eligible for Type-IV & Type-V</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Based on Pay Level 11, IAS cadre</div>
          </div>
          {[
            { type: "Type-I", eligible: false, reason: "Pay level too high" },
            { type: "Type-II", eligible: false, reason: "Pay level too high" },
            { type: "Type-III", eligible: false, reason: "Pay level too high" },
            { type: "Type-IV", eligible: true, reason: "Primary eligible type" },
            { type: "Type-V", eligible: true, reason: "Senior officer type" },
          ].map(t => (
            <div key={t.type} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 14 }}>{t.eligible ? "✅" : "⬜"}</span>
              <span style={{ fontSize: 13, fontWeight: t.eligible ? 600 : 400, color: t.eligible ? "#0d2b6b" : "#94a3b8" }}>{t.type}</span>
              <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>{t.reason}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Full details */}
      <div className="eniwas-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div className="eniwas-card-title" style={{ margin: 0 }}>
            <span className="icon material-symbols-outlined">badge</span>
            HRMS Profile Details
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setEditing(!editing)}>
            {editing ? "Cancel" : "✏️ Edit Contact Info"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 18 }}>
          {[
            { group: "Personal", fields: [
              { label: "Full Name", value: profile.name, key: "name", editable: false },
              { label: "Date of Birth", value: profile.dob, key: "dob", editable: false },
              { label: "Mobile Number", value: profile.phone, key: "phone", editable: true },
              { label: "Email", value: profile.email, key: "email", editable: true },
            ]},
            { group: "Service Details", fields: [
              { label: "Employee ID", value: profile.emp_id, key: "emp_id", editable: false },
              { label: "Date of Joining", value: profile.doj, key: "doj", editable: false },
              { label: "Cadre", value: profile.cadre, key: "cadre", editable: false },
              { label: "Designation", value: profile.designation, key: "designation", editable: false },
            ]},
            { group: "Posting", fields: [
              { label: "Department", value: profile.department, key: "dept", editable: false },
              { label: "Posting Location", value: profile.posting, key: "posting", editable: false },
              { label: "District", value: profile.district, key: "district", editable: false },
              { label: "Pay Level", value: profile.pay_level, key: "pay", editable: false },
            ]},
          ].map(section => (
            <div key={section.group}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 10 }}>{section.group}</div>
              {section.fields.map(f => (
                <div key={f.key} className="eniwas-form-group" style={{ marginBottom: 12 }}>
                  <label className="eniwas-label">{f.label} {!f.editable && <span style={{ color: "#94a3b8", fontWeight: 400, fontSize: 10 }}>(HRMS)</span>}</label>
                  {editing && f.editable ? (
                    <input className="eniwas-input" defaultValue={f.value} />
                  ) : (
                    <div style={{ padding: "8px 12px", background: f.editable ? "white" : "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 13, color: f.editable ? "#1a2a3a" : "#64748b" }}>
                      {f.value}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        {editing && (
          <div style={{ marginTop: 8, paddingTop: 16, borderTop: "1px solid #e2e8f0", display: "flex", gap: 10 }}>
            <button className="btn btn-primary">Save Changes</button>
            <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
