"use client";
import { useState, useRef } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
type RowStatus = "valid" | "error" | "duplicate" | "pending" | "verified" | "rejected";

interface BulkRow {
  sno: number;
  empId: string;
  empName: string;
  designation: string;
  payLevel: string;
  cadre: string;
  dept: string;
  requestedType: string;
  colony: string;
  flatNo: string;
  allotmentDate: string;
  orderNo: string;
  status: RowStatus;
  error?: string;
  verifyRemark?: string;
}

// ── Sample CSV template rows ───────────────────────────────────────────────
const SAMPLE_ROWS: BulkRow[] = [
  { sno:1,  empId:"BH-IAS-24-0081", empName:"Amit Kumar",      designation:"Dy. Collector",   payLevel:"Level 10", cadre:"IAS",   dept:"Revenue",    requestedType:"Type-IV", colony:"Kadamkuan Govt Colony",      flatNo:"12A", allotmentDate:"05 Jun 2026", orderNo:"BCD/ALLOT/2026/0501", status:"valid" },
  { sno:2,  empId:"BH-IPS-22-0144", empName:"Priya Sharma",    designation:"DSP",             payLevel:"Level 11", cadre:"IPS",   dept:"Home",       requestedType:"Type-IV", colony:"Boring Road Officers Colony",flatNo:"5B",  allotmentDate:"05 Jun 2026", orderNo:"BCD/ALLOT/2026/0502", status:"valid" },
  { sno:3,  empId:"BH-PCS-23-0392", empName:"Vivek Singh",     designation:"BDO",             payLevel:"Level 8",  cadre:"State", dept:"Agriculture",requestedType:"Type-III",colony:"Rajendra Nagar Staff Colony",flatNo:"22D", allotmentDate:"05 Jun 2026", orderNo:"BCD/ALLOT/2026/0503", status:"valid" },
  { sno:4,  empId:"BH-IAS-19-0842", empName:"Rajesh Kumar",    designation:"Dy. Collector",   payLevel:"Level 11", cadre:"IAS",   dept:"Revenue",    requestedType:"Type-IV", colony:"Boring Road Officers Colony",flatNo:"7C",  allotmentDate:"05 Jun 2026", orderNo:"BCD/ALLOT/2026/0504", status:"duplicate", error:"Already has active allotment (Flat 12B, Kadamkuan)" },
  { sno:5,  empId:"BH-IAS-20-0055", empName:"Meena Devi",      designation:"Addl. Secretary", payLevel:"Level 14", cadre:"IAS",   dept:"Finance",    requestedType:"Type-V",  colony:"Bailey Road VIP Colony",     flatNo:"1A",  allotmentDate:"05 Jun 2026", orderNo:"BCD/ALLOT/2026/0505", status:"valid" },
  { sno:6,  empId:"BH-PCS-21-0218", empName:"Ranjit Kumar",    designation:"Circle Officer",  payLevel:"Level 7",  cadre:"State", dept:"Education",  requestedType:"Type-IV", colony:"Kadamkuan Govt Colony",      flatNo:"3C",  allotmentDate:"05 Jun 2026", orderNo:"BCD/ALLOT/2026/0506", status:"error",     error:"Not eligible for Type-IV at Pay Level 7" },
  { sno:7,  empId:"BH-IAS-23-0199", empName:"Sunita Verma",    designation:"SDO",             payLevel:"Level 10", cadre:"IAS",   dept:"Revenue",    requestedType:"Type-IV", colony:"Kankarbagh Officers Colony", flatNo:"9B",  allotmentDate:"05 Jun 2026", orderNo:"BCD/ALLOT/2026/0507", status:"valid" },
  { sno:8,  empId:"BH-IPS-21-0088", empName:"Deepak Narayan",  designation:"DSP",             payLevel:"Level 11", cadre:"IPS",   dept:"Home",       requestedType:"Type-IV", colony:"Boring Road Officers Colony",flatNo:"6A",  allotmentDate:"05 Jun 2026", orderNo:"BCD/ALLOT/2026/0508", status:"valid" },
  { sno:9,  empId:"BH-PCS-20-0311", empName:"Kaveri Singh",    designation:"Block Dev. Officer",payLevel:"Level 8",cadre:"State", dept:"Rural Dev.", requestedType:"Type-II", colony:"Danapur Staff Quarters",     flatNo:"44C", allotmentDate:"05 Jun 2026", orderNo:"BCD/ALLOT/2026/0509", status:"valid" },
  { sno:10, empId:"",               empName:"",                designation:"",                payLevel:"",         cadre:"",      dept:"",           requestedType:"",        colony:"",                           flatNo:"",    allotmentDate:"",            orderNo:"",                    status:"error",     error:"Missing required fields: Employee ID, Name" },
];

type Step = "upload" | "preview" | "submit" | "verify" | "done";

export default function BulkAllotmentPage() {
  const [step,     setStep]     = useState<Step>("upload");
  const [rows,     setRows]     = useState<BulkRow[]>([]);
  const [filter,   setFilter]   = useState<"all"|"valid"|"error"|"duplicate">("all");
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authority,  setAuthority]  = useState("Joint Director (Housing)");
  const [verifyRows, setVerifyRows] = useState<BulkRow[]>([]);
  const [allChecked, setAllChecked] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Simulate file parse ────────────────────────────────────────────────
  function handleFile() {
    setTimeout(() => {
      setRows(SAMPLE_ROWS);
      setStep("preview");
    }, 800);
  }

  // ── Submit for verification ───────────────────────────────────────────
  function submitForVerification() {
    setSubmitting(true);
    setTimeout(() => {
      const valid = rows.filter(r => r.status === "valid");
      setVerifyRows(valid.map(r => ({ ...r, status: "pending" })));
      setSubmitting(false);
      setStep("verify");
    }, 1200);
  }

  // ── Higher-authority verify action ───────────────────────────────────
  function verifyAction(ids: number[], action: "verified" | "rejected", remark = "") {
    setVerifyRows(prev => prev.map(r =>
      ids.includes(r.sno) ? { ...r, status: action, verifyRemark: remark } : r
    ));
  }

  function finalApprove() {
    setStep("done");
  }

  // ── Stats ─────────────────────────────────────────────────────────────
  const valid     = rows.filter(r => r.status === "valid").length;
  const errors    = rows.filter(r => r.status === "error").length;
  const dups      = rows.filter(r => r.status === "duplicate").length;
  const vVerified = verifyRows.filter(r => r.status === "verified").length;
  const vRejected = verifyRows.filter(r => r.status === "rejected").length;
  const vPending  = verifyRows.filter(r => r.status === "pending").length;

  const displayed = filter === "all" ? rows
    : filter === "valid"     ? rows.filter(r => r.status === "valid")
    : filter === "error"     ? rows.filter(r => r.status === "error" || r.status === "duplicate")
    : rows.filter(r => r.status === "duplicate");

  return (
    <div>
      <div className="eniwas-page-header">
        <div className="eniwas-breadcrumb">Admin / Allotment / <span>Bulk Upload</span></div>
        <h2>Bulk Allotment Upload</h2>
        <p>Upload CSV/Excel of allotments → auto-validate → submit for higher authority verification → approve</p>
      </div>

      {/* ── Step progress bar ── */}
      <div className="eniwas-steps" style={{ marginBottom: 28 }}>
        {([
          ["upload",  "Upload File"],
          ["preview", "Preview & Validate"],
          ["submit",  "Submit for Verification"],
          ["verify",  "Authority Verification"],
          ["done",    "Allotments Live"],
        ] as [Step, string][]).map(([s, label], i, arr) => {
          const stepOrder: Step[] = ["upload","preview","submit","verify","done"];
          const current = stepOrder.indexOf(step);
          const idx     = stepOrder.indexOf(s);
          const isDone  = idx < current;
          const isActive= idx === current;
          return (
            <div key={s} className="eniwas-step">
              <div className={`eniwas-step-circle ${isDone ? "done" : isActive ? "active" : ""}`}>
                {isDone ? "✓" : i + 1}
              </div>
              <div className={`eniwas-step-label ${isActive ? "active" : ""}`} style={{ whiteSpace: "nowrap" }}>{label}</div>
              {i < arr.length - 1 && <div className={`eniwas-step-line ${isDone ? "done" : ""}`} />}
            </div>
          );
        })}
      </div>

      {/* ════════════════════════════════ STEP 1 – UPLOAD ════════════════════*/}
      {step === "upload" && (
        <div className="eniwas-grid-2">
          <div className="eniwas-card">
            <div className="eniwas-card-title"><span className="icon">📤</span> Upload Allotment File</div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(); }}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "#1a3a8f" : "#cbd5e1"}`,
                borderRadius: 12, padding: "36px 20px", textAlign: "center",
                background: dragOver ? "#eff3ff" : "#f8fafc", cursor: "pointer",
                transition: "all 0.15s", marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 44, marginBottom: 10 }}>📂</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#0d2b6b", marginBottom: 4 }}>
                Drag & drop file here
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
                Supports .CSV, .XLS, .XLSX — max 5 MB
              </div>
              <span className="btn btn-primary btn-sm">Browse File</span>
              <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" style={{ display: "none" }}
                onChange={handleFile} />
            </div>

            {/* Or use sample */}
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div className="eniwas-login-divider">or</div>
            </div>
            <button className="btn btn-secondary" style={{ width: "100%", justifyContent: "center" }}
              onClick={handleFile}>
              🧪 Load Sample Data (10 rows)
            </button>
          </div>

          {/* Instructions & template */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="eniwas-card">
              <div className="eniwas-card-title"><span className="icon">📋</span> Required CSV Columns</div>
              <table className="eniwas-table" style={{ fontSize: 12 }}>
                <thead><tr><th>#</th><th>Column</th><th>Required</th><th>Example</th></tr></thead>
                <tbody>
                  {[
                    ["1","Emp_Id","Yes","BH-IAS-24-0081"],
                    ["2","Emp_Name","Yes","Amit Kumar"],
                    ["3","Designation","Yes","Dy. Collector"],
                    ["4","Pay_Level","Yes","Level 10"],
                    ["5","Cadre","Yes","IAS"],
                    ["6","Department","Yes","Revenue"],
                    ["7","Requested_Type","Yes","Type-IV"],
                    ["8","Colony","Yes","Kadamkuan Govt Colony"],
                    ["9","Flat_No","Yes","12A"],
                    ["10","Allotment_Date","Yes","05/06/2026"],
                    ["11","Order_No","Yes","BCD/ALLOT/2026/0501"],
                  ].map(([n,col,req,ex]) => (
                    <tr key={n}>
                      <td>{n}</td><td style={{ fontWeight: 600 }}>{col}</td>
                      <td><span className={`badge ${req==="Yes"?"badge-red":"badge-gray"}`}>{req}</span></td>
                      <td style={{ color: "#64748b" }}>{ex}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>
                📥 Download CSV Template
              </button>
            </div>

            <div className="eniwas-alert eniwas-alert-info">
              <span>ℹ️</span>
              <div style={{ fontSize: 12 }}>
                <strong>Auto-validation checks:</strong><br />
                • Pay level eligibility for requested type<br />
                • Existing active allotments (duplicates)<br />
                • Missing / blank required fields<br />
                • Valid Employee ID format (HRMS cross-check)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════ STEP 2 – PREVIEW ═══════════════════*/}
      {step === "preview" && (
        <div>
          {/* Summary bar */}
          <div className="eniwas-stats" style={{ gridTemplateColumns: "repeat(5,1fr)", marginBottom: 20 }}>
            {[
              { label: "Total Rows",    value: rows.length, cls: "" },
              { label: "✅ Valid",       value: valid,       cls: "green" },
              { label: "❌ Errors",      value: errors,      cls: "red" },
              { label: "⚠️ Duplicates",  value: dups,        cls: "orange" },
              { label: "Will Process",  value: valid,       cls: "" },
            ].map(s => (
              <div key={s.label} className={`eniwas-stat ${s.cls}`} style={{ padding: "12px 14px" }}>
                <div className="eniwas-stat-label">{s.label}</div>
                <div className="eniwas-stat-value" style={{ fontSize: 20 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {(errors > 0 || dups > 0) && (
            <div className="eniwas-alert eniwas-alert-warning" style={{ marginBottom: 16 }}>
              <span>⚠️</span>
              <span>
                <strong>{errors} rows have errors</strong> and <strong>{dups} are duplicates</strong> — they will be skipped.
                Only <strong>{valid} valid rows</strong> will be submitted for verification.
                Download the error report, fix issues, and re-upload if needed.
              </span>
            </div>
          )}

          {/* Filter tabs */}
          <div className="eniwas-filter-bar" style={{ marginBottom: 12 }}>
            {(["all","valid","error","duplicate"] as const).map(f => (
              <button key={f} className={`btn ${filter===f?"btn-primary":"btn-secondary"} btn-sm`}
                onClick={() => setFilter(f)}>
                {f==="all" ? `All (${rows.length})` : f==="valid" ? `✅ Valid (${valid})` : f==="error" ? `❌ Errors (${errors})` : `⚠️ Duplicates (${dups})`}
              </button>
            ))}
            <button className="btn btn-secondary btn-sm" style={{ marginLeft: "auto" }}>📥 Download Error Report</button>
          </div>

          <div className="eniwas-card" style={{ marginBottom: 20 }}>
            <div style={{ overflowX: "auto" }}>
              <table className="eniwas-table" style={{ minWidth: 900 }}>
                <thead>
                  <tr>
                    <th>#</th><th>Emp ID</th><th>Name</th><th>Designation</th>
                    <th>Pay Level</th><th>Cadre</th><th>Type</th>
                    <th>Flat / Colony</th><th>Order No.</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map(r => (
                    <tr key={r.sno} style={{ background: r.status==="error"||r.status==="duplicate" ? "#fff5f5" : "white" }}>
                      <td>{r.sno}</td>
                      <td style={{ fontWeight: 600, fontSize: 11, color: "#0d2b6b" }}>{r.empId || <span style={{ color: "#dc2626" }}>MISSING</span>}</td>
                      <td>{r.empName || <span style={{ color: "#dc2626" }}>MISSING</span>}</td>
                      <td style={{ fontSize: 12 }}>{r.designation}</td>
                      <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{r.payLevel}</span></td>
                      <td><span className="badge badge-purple" style={{ fontSize: 10 }}>{r.cadre}</span></td>
                      <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{r.requestedType}</span></td>
                      <td style={{ fontSize: 11 }}>
                        {r.flatNo && <><strong>Flat {r.flatNo}</strong><br /></>}
                        <span style={{ color: "#94a3b8" }}>{r.colony}</span>
                      </td>
                      <td style={{ fontSize: 10, color: "#64748b" }}>{r.orderNo}</td>
                      <td>
                        {r.status === "valid"
                          ? <span className="badge badge-green">✅ Valid</span>
                          : r.status === "duplicate"
                          ? <div><span className="badge badge-orange">⚠️ Duplicate</span><div style={{ fontSize: 10, color: "#dc2626", marginTop: 2 }}>{r.error}</div></div>
                          : <div><span className="badge badge-red">❌ Error</span><div style={{ fontSize: 10, color: "#dc2626", marginTop: 2 }}>{r.error}</div></div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Submit section */}
          <div className="eniwas-card">
            <div className="eniwas-card-title"><span className="icon">🔐</span> Submit for Higher Authority Verification</div>
            <div className="eniwas-form-row">
              <div className="eniwas-form-group">
                <label className="eniwas-label">Verify By (Authority)</label>
                <select className="eniwas-select" value={authority} onChange={e => setAuthority(e.target.value)}>
                  <option>Joint Director (Housing)</option>
                  <option>Director, BCD</option>
                  <option>Additional Secretary, Housing</option>
                  <option>Principal Secretary, BCD</option>
                </select>
              </div>
              <div className="eniwas-form-group">
                <label className="eniwas-label">Submission Remarks</label>
                <input className="eniwas-input" placeholder="e.g. Batch allotments for June 2026 joinings" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button className="btn btn-primary" onClick={submitForVerification} disabled={submitting || valid === 0}>
                {submitting ? "⏳ Submitting…" : `🔐 Submit ${valid} Valid Rows for Verification →`}
              </button>
              <button className="btn btn-secondary" onClick={() => setStep("upload")}>← Re-upload</button>
              {valid === 0 && <span style={{ fontSize: 12, color: "#dc2626" }}>No valid rows to submit</span>}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════ STEP 3 – VERIFY ════════════════════*/}
      {step === "verify" && (
        <div>
          <div className="eniwas-alert eniwas-alert-info" style={{ marginBottom: 20 }}>
            <span>🔐</span>
            <div>
              <strong>{verifyRows.length} allotments submitted to {authority}</strong> for dual-verification.
              The authority can approve all, approve selectively, or reject individual rows with remarks.
            </div>
          </div>

          {/* Verify stats */}
          <div className="eniwas-stats" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 20 }}>
            {[
              { label: "Total Submitted", value: verifyRows.length, cls: "" },
              { label: "⏳ Pending",       value: vPending,          cls: "orange" },
              { label: "✅ Verified",       value: vVerified,         cls: "green" },
              { label: "❌ Rejected",       value: vRejected,         cls: "red" },
            ].map(s => (
              <div key={s.label} className={`eniwas-stat ${s.cls}`} style={{ padding: "12px 14px" }}>
                <div className="eniwas-stat-label">{s.label}</div>
                <div className="eniwas-stat-value" style={{ fontSize: 20 }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Authority badge */}
          <div className="eniwas-card" style={{ marginBottom: 20, background: "linear-gradient(135deg,#0d2b6b,#1a3a8f)", color: "white", border: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>VERIFICATION AUTHORITY</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{authority}</div>
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>Bihar Building Construction Department</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn" style={{ background: "#16a34a", color: "white" }}
                  onClick={() => verifyAction(verifyRows.filter(r => r.status === "pending").map(r => r.sno), "verified", "Batch approved by authority")}>
                  ✅ Approve All Pending ({vPending})
                </button>
                <button className="btn" style={{ background: "rgba(255,255,255,0.2)", color: "white" }}
                  onClick={() => verifyAction(Array.from(checkedIds), "verified")}>
                  ✅ Approve Selected
                </button>
                <button className="btn" style={{ background: "#dc2626", color: "white" }}
                  onClick={() => verifyAction(Array.from(checkedIds), "rejected", "Rejected by authority")}>
                  ❌ Reject Selected
                </button>
              </div>
            </div>
          </div>

          {/* Verify table */}
          <div className="eniwas-card" style={{ marginBottom: 20 }}>
            <div style={{ overflowX: "auto" }}>
              <table className="eniwas-table" style={{ minWidth: 860 }}>
                <thead>
                  <tr>
                    <th>
                      <input type="checkbox" checked={allChecked}
                        onChange={e => {
                          setAllChecked(e.target.checked);
                          setCheckedIds(e.target.checked ? new Set(verifyRows.map(r => r.sno)) : new Set());
                        }} />
                    </th>
                    <th>#</th><th>Employee</th><th>Cadre / Pay</th>
                    <th>Property</th><th>Order No.</th><th>Status</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {verifyRows.map(r => (
                    <tr key={r.sno}>
                      <td>
                        <input type="checkbox"
                          checked={checkedIds.has(r.sno)}
                          onChange={e => {
                            const s = new Set(checkedIds);
                            e.target.checked ? s.add(r.sno) : s.delete(r.sno);
                            setCheckedIds(s);
                          }} />
                      </td>
                      <td>{r.sno}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{r.empName}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>{r.empId} · {r.designation}</div>
                      </td>
                      <td>
                        <span className="badge badge-purple" style={{ fontSize: 10 }}>{r.cadre}</span>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{r.payLevel}</div>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        <strong>{r.requestedType}</strong> · Flat {r.flatNo}
                        <div style={{ fontSize: 10, color: "#94a3b8" }}>{r.colony}</div>
                      </td>
                      <td style={{ fontSize: 10, color: "#64748b" }}>{r.orderNo}</td>
                      <td>
                        {r.status === "pending"
                          ? <span className="badge badge-yellow">⏳ Pending</span>
                          : r.status === "verified"
                          ? <span className="badge badge-green">✅ Verified</span>
                          : <div><span className="badge badge-red">❌ Rejected</span>{r.verifyRemark && <div style={{ fontSize: 10, color: "#dc2626", marginTop: 2 }}>{r.verifyRemark}</div>}</div>}
                      </td>
                      <td>
                        {r.status === "pending" && (
                          <div style={{ display: "flex", gap: 4 }}>
                            <button className="btn btn-xs btn-success" onClick={() => verifyAction([r.sno], "verified")}>✓</button>
                            <button className="btn btn-xs btn-danger"  onClick={() => verifyAction([r.sno], "rejected", "Rejected")}>✗</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Final approval */}
          {vPending === 0 && verifyRows.length > 0 && (
            <div className="eniwas-card" style={{ borderLeft: "4px solid #16a34a" }}>
              <div className="eniwas-card-title"><span className="icon">🏛️</span> Final Approval</div>
              <div style={{ fontSize: 13, color: "#374151", marginBottom: 14 }}>
                All rows reviewed. <strong className="text-green-700">{vVerified} allotments verified</strong> and <strong style={{ color: "#dc2626" }}>{vRejected} rejected</strong>.
                Click below to push verified allotments live.
              </div>
              <div className="eniwas-form-group" style={{ maxWidth: 400 }}>
                <label className="eniwas-label">Final Authority Signature / Digital Token</label>
                <input className="eniwas-input" placeholder="Enter digital signature / approval token" />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-primary" onClick={finalApprove}>
                  🚀 Push {vVerified} Allotments Live
                </button>
                <button className="btn btn-secondary">📥 Download Verification Report</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════ STEP 4 – DONE ══════════════════════*/}
      {step === "done" && (
        <div className="eniwas-card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#0d2b6b", marginBottom: 8 }}>
            Bulk Allotments Live!
          </div>
          <div style={{ fontSize: 14, color: "#64748b", maxWidth: 480, margin: "0 auto 24px" }}>
            <strong>{vVerified} allotments</strong> have been successfully processed, allotment letters generated, and employees notified via SMS & email.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, maxWidth: 480, margin: "0 auto 28px" }}>
            {[
              { icon: "✅", label: "Allotments Processed", value: vVerified },
              { icon: "❌", label: "Rejected / Skipped",   value: vRejected + errors + dups },
              { icon: "📧", label: "Notifications Sent",   value: vVerified },
            ].map(s => (
              <div key={s.label} style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 10px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 22 }}>{s.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#0d2b6b" }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={() => { setStep("upload"); setRows([]); setVerifyRows([]); }}>
              + New Bulk Upload
            </button>
            <button className="btn btn-secondary">📥 Download Final Report</button>
            <button className="btn btn-secondary">📋 View Allotment History</button>
          </div>
        </div>
      )}
    </div>
  );
}
