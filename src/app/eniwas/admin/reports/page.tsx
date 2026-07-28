"use client";
import { useState } from "react";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("employee-status");

  const reports = [
    { id: "employee-status", label: "Employee Status Report", icon: "👥" },
    { id: "property-details", label: "Property Details Report", icon: "🏢" },
    { id: "property-status", label: "Property Status Report", icon: "📊" },
    { id: "property-journey", label: "Property Journey / History", icon: "📜" },
    { id: "user-journey", label: "User Journey / History", icon: "👤" },
    { id: "rent-collection", label: "Rent Collection MIS", icon: "💰" },
    { id: "arrears", label: "Arrears & Penalty Report", icon: "⚠️" },
  ];

  const sampleRows = {
    "employee-status": {
      headers: ["S.No", "Emp ID", "Name", "Phone", "Designation", "Office", "Cadre", "Allotted?", "Flat No", "Date of Occupancy", "Last Bill", "Due Amount"],
      rows: [
        ["1", "BH-IAS-19-0842", "Rajesh Kumar", "98XXXX12", "Dy. Collector", "Revenue Dept.", "IAS", "Yes", "12B – Kadamkuan", "12 Mar 2021", "08 May 2026", "₹2,840"],
        ["2", "BH-IAS-18-0621", "Anita Singh", "97XXXX44", "SDO", "Finance Dept.", "IAS", "Yes", "7A – Kankarbagh", "04 Jan 2020", "05 May 2026", "₹0"],
        ["3", "BH-IPS-20-0144", "Priya Sharma", "96XXXX88", "DSP", "Home Dept.", "IPS", "No", "—", "—", "—", "₹0"],
      ]
    },
    "property-details": {
      headers: ["S.No", "Property ID", "Property No", "Location", "Date OC Rcvd", "Category", "OC Status", "Pool", "Area (m²)", "Rate Applicable", "Last Maintenance", "Fire & Safety Cert."],
      rows: [
        ["1", "PROP-KAD-IV-012B", "12B", "Kadamkuan Colony, Patna", "2003", "Type-IV", "Yes", "IAS/IPS", "145", "₹17.65/m²", "15 Jan 2026", "Valid (Dec 2026)"],
        ["2", "PROP-BAI-V-003B", "3B", "Bailey Road, Patna", "2001", "Type-V", "Yes", "Secretary", "210", "₹20.00/m²", "01 Dec 2025", "Expired"],
      ]
    },
    "property-status": {
      headers: ["S.No", "Property ID", "Type", "Pool", "Allotment Status", "Allotted To (Emp ID)", "Occupancy Date", "Last Vacant Date", "Condition"],
      rows: [
        ["1", "PROP-KAD-IV-012B", "Type-IV", "IAS/IPS", "Yes", "BH-IAS-19-0842", "12 Mar 2021", "10 Mar 2021", "Good"],
        ["2", "PROP-KAD-IV-012A", "Type-IV", "IAS/IPS", "No", "—", "—", "05 Jan 2026", "Good"],
        ["3", "PROP-BAI-V-003B", "Type-V", "Secretary", "Yes", "BH-IAS-17-0055", "20 Jun 2019", "18 Jun 2019", "Fair"],
      ]
    },
    "property-journey": {
      headers: ["S.No", "Prop ID", "Emp ID", "Tenant Name", "Occupancy Date", "Vacate Date"],
      rows: [
        ["1", "PROP-KAD-IV-012B", "BH-IAS-19-0842", "Rajesh Kumar", "12 Mar 2021", "Present"],
        ["2", "PROP-KAD-IV-012B", "BH-IAS-15-0311", "Arun Mishra", "10 Aug 2016", "08 Mar 2021"],
        ["3", "PROP-KAD-IV-012B", "BH-IAS-10-0124", "Surendra Yadav", "15 Apr 2011", "05 Aug 2016"],
      ]
    },
    "user-journey": {
      headers: ["S.No", "Emp ID", "Emp Name", "Phone", "Cadre", "Dept", "Posting", "Flat No", "Start Date", "End Date"],
      rows: [
        ["1", "BH-IAS-19-0842", "Rajesh Kumar", "98XXXX12", "IAS", "Revenue", "Patna Sadar", "12B – Kadamkuan", "12 Mar 2021", "Present"],
        ["2", "BH-IAS-18-0621", "Anita Singh", "97XXXX44", "IAS", "Finance", "Patna Sadar", "7A – Kankarbagh", "04 Jan 2020", "Present"],
      ]
    },
    "rent-collection": {
      headers: ["S.No", "Emp ID", "Name", "Flat", "Month", "Base Rent", "Water", "Maintenance", "Penalty", "Total", "Mode", "Status"],
      rows: [
        ["1", "BH-IAS-19-0842", "Rajesh Kumar", "12B Kadamkuan", "Jun 2026", "₹2,560", "₹120", "₹160", "₹0", "₹2,840", "Online", "Pending"],
        ["2", "BH-IAS-18-0621", "Anita Singh", "7A Kankarbagh", "Jun 2026", "₹2,560", "₹120", "₹160", "₹0", "₹2,840", "Salary Ded.", "Paid"],
      ]
    },
    "arrears": {
      headers: ["S.No", "Emp ID", "Name", "Flat", "Months Overdue", "Principal", "Penalty (10%)", "Total Outstanding", "Status"],
      rows: [
        ["1", "BH-PCS-21-0392", "Vivek Singh", "22D Rajendra Nagar", "4", "₹5,440", "₹544", "₹5,984", "Defaulter"],
        ["2", "BH-IAS-19-0842", "Rajesh Kumar", "12B Kadamkuan", "1", "₹2,840", "₹0", "₹2,840", "Pending"],
      ]
    },
  };

  const currentReport = sampleRows[reportType as keyof typeof sampleRows];

  return (
    <div>
      <div className="eniwas-page-header">
        <div className="eniwas-breadcrumb">Admin / <span>MIS Reports</span></div>
        <h2>MIS Reports & Analytics</h2>
        <p>Management Information System reports for Bihar Housing Division</p>
      </div>

      <div className="eniwas-grid-2" style={{ marginBottom: 24, alignItems: "start" }}>
        {/* Report selector */}
        <div className="eniwas-card">
          <div className="eniwas-card-title"><span className="icon">📊</span> Select Report</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {reports.map(r => (
              <button key={r.id}
                onClick={() => setReportType(r.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                  borderRadius: 8, border: `1px solid ${reportType === r.id ? "#1a3a8f" : "#e2e8f0"}`,
                  background: reportType === r.id ? "#eff3ff" : "white",
                  color: reportType === r.id ? "#1a3a8f" : "#374151",
                  fontWeight: reportType === r.id ? 600 : 400,
                  fontSize: 13, cursor: "pointer", textAlign: "left"
                }}>
                <span style={{ fontSize: 18 }}>{r.icon}</span>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="eniwas-card">
          <div className="eniwas-card-title"><span className="icon">🔍</span> Filters & Parameters</div>
          <div className="eniwas-form-group">
            <label className="eniwas-label">Date Range</label>
            <div className="eniwas-form-row">
              <input className="eniwas-input" type="date" defaultValue="2026-01-01" />
              <input className="eniwas-input" type="date" defaultValue="2026-06-04" />
            </div>
          </div>
          <div className="eniwas-form-group">
            <label className="eniwas-label">Cadre</label>
            <select className="eniwas-select"><option>All Cadres</option><option>IAS</option><option>IPS</option><option>State Service</option></select>
          </div>
          <div className="eniwas-form-group">
            <label className="eniwas-label">Property Type</label>
            <select className="eniwas-select"><option>All Types</option><option>Type-I</option><option>Type-II</option><option>Type-III</option><option>Type-IV</option><option>Type-V</option></select>
          </div>
          <div className="eniwas-form-group">
            <label className="eniwas-label">Location / District</label>
            <select className="eniwas-select"><option>All Locations</option><option>Patna</option><option>Gaya</option><option>Muzaffarpur</option></select>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-primary btn-sm">Generate Report</button>
            <button className="btn btn-secondary btn-sm">📥 Export Excel</button>
            <button className="btn btn-secondary btn-sm">📄 Export PDF</button>
          </div>
        </div>
      </div>

      {/* Report preview */}
      <div className="eniwas-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="eniwas-card-title" style={{ margin: 0 }}>
            {reports.find(r => r.id === reportType)?.icon} {reports.find(r => r.id === reportType)?.label}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary btn-sm">📥 Excel</button>
            <button className="btn btn-secondary btn-sm">📄 PDF</button>
            <button className="btn btn-secondary btn-sm">🖨️ Print</button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="eniwas-table">
            <thead>
              <tr>{currentReport.headers.map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {currentReport.rows.map((row, i) => (
                <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: "#94a3b8" }}>
          Showing {currentReport.rows.length} sample records. Generate report for full data.
        </div>
      </div>
    </div>
  );
}
