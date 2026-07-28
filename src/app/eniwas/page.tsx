"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ENiwasLogin() {
  const router = useRouter();
  const [tab, setTab] = useState<"employee" | "admin">("employee");
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminId, setAdminId] = useState("");
  const [adminPass, setAdminPass] = useState("");

  function sendOtp() {
    if (mobile.length < 10) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setStep("otp"); }, 1200);
  }

  function verifyOtp() {
    setLoading(true);
    setTimeout(() => { setLoading(false); router.push("/eniwas/user/dashboard"); }, 1200);
  }

  function adminLogin() {
    setLoading(true);
    setTimeout(() => { setLoading(false); router.push("/eniwas/admin/dashboard"); }, 1200);
  }

  return (
    <div className="eniwas-login-page">
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, background: "rgba(255,255,255,0.04)", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "white" }}>
          <div style={{ width: 40, height: 40, background: "white", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🏠</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>e-Niwas</div>
            <div style={{ fontSize: 10, opacity: 0.7 }}>Bihar Sarkar – आवास विभाग</div>
          </div>
        </div>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>बिहार सरकार आवास पोर्टल</div>
      </div>

      <div style={{ display: "flex", gap: 60, alignItems: "center", flexWrap: "wrap", padding: "0 40px", justifyContent: "center" }}>
        {/* Left – info */}
        <div style={{ color: "white", maxWidth: 380 }}>
          <div style={{ fontSize: 13, background: "rgba(232,119,34,0.25)", border: "1px solid rgba(232,119,34,0.4)", borderRadius: 20, display: "inline-block", padding: "4px 14px", marginBottom: 18, color: "#fbbf24" }}>
            🏛️ Government of Bihar
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.2, margin: "0 0 16px" }}>
            e-Niwas<br />
            <span style={{ color: "#e87722" }}>Housing Portal</span>
          </h1>
          <p style={{ fontSize: 14, opacity: 0.8, lineHeight: 1.7, margin: "0 0 28px" }}>
            Seamless Property Allotment, Rent Management & NOC services for Bihar Government employees.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { icon: "🏘️", text: "Search & apply for government accommodation" },
              { icon: "💳", text: "Pay rent online or via salary deduction" },
              { icon: "📋", text: "Apply for NOC on transfer/retirement" },
              { icon: "📊", text: "Track allotment status in real-time" },
            ].map(f => (
              <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, opacity: 0.85 }}>
                <span style={{ fontSize: 20 }}>{f.icon}</span>
                {f.text}
              </div>
            ))}
          </div>
        </div>

        {/* Right – login box */}
        <div className="eniwas-login-box">
          <div className="eniwas-login-logo">
            <div className="big-icon">🏠</div>
            <h2>e-Niwas Portal</h2>
            <p>Bihar Government Housing Management System</p>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 8, padding: 4, marginBottom: 20 }}>
            {(["employee", "admin"] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setStep("mobile"); }}
                style={{
                  flex: 1, padding: "8px 0", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                  background: tab === t ? "white" : "transparent",
                  color: tab === t ? "#0d2b6b" : "#64748b",
                  boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.15s"
                }}
              >
                {t === "employee" ? "👤 Employee" : "🔐 Admin"}
              </button>
            ))}
          </div>

          {tab === "employee" ? (
            <>
              {step === "mobile" ? (
                <>
                  <div className="eniwas-form-group">
                    <label className="eniwas-label">Registered Mobile Number</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div style={{ padding: "9px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 13, color: "#475569", whiteSpace: "nowrap" }}>+91</div>
                      <input className="eniwas-input" placeholder="Enter 10-digit mobile" maxLength={10}
                        value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, ""))} />
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", background: "#f8fafc", borderRadius: 8, padding: "10px 12px", marginBottom: 16 }}>
                    ℹ️ OTP will be sent to your HRMS-registered mobile number
                  </div>
                  <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}
                    onClick={sendOtp} disabled={loading || mobile.length < 10}>
                    {loading ? "Sending OTP…" : "Send OTP →"}
                  </button>
                </>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, padding: "10px 12px", background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0", fontSize: 13, color: "#166534" }}>
                    ✅ OTP sent to +91 {mobile}
                    <button style={{ marginLeft: "auto", fontSize: 11, color: "#0d2b6b", background: "none", border: "none", cursor: "pointer" }} onClick={() => setStep("mobile")}>Change</button>
                  </div>
                  <div className="eniwas-form-group">
                    <label className="eniwas-label">Enter 6-digit OTP</label>
                    <input className="eniwas-input" placeholder="• • • • • •" maxLength={6} style={{ letterSpacing: 8, fontSize: 18, textAlign: "center" }}
                      value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} />
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", textAlign: "right", marginBottom: 16 }}>
                    OTP valid for <strong>5:00</strong> &nbsp;·&nbsp; <button style={{ color: "#0d2b6b", background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>Resend</button>
                  </div>
                  <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}
                    onClick={verifyOtp} disabled={loading || otp.length < 6}>
                    {loading ? "Verifying…" : "Login →"}
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <div className="eniwas-form-group">
                <label className="eniwas-label">Admin ID</label>
                <input className="eniwas-input" placeholder="Enter admin username" value={adminId} onChange={e => setAdminId(e.target.value)} />
              </div>
              <div className="eniwas-form-group">
                <label className="eniwas-label">Password</label>
                <input className="eniwas-input" type="password" placeholder="Enter password" value={adminPass} onChange={e => setAdminPass(e.target.value)} />
              </div>
              <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginBottom: 8 }}
                onClick={adminLogin} disabled={loading || !adminId || !adminPass}>
                {loading ? "Logging in…" : "Admin Login →"}
              </button>
              <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
                Demo credentials: admin / admin123
              </div>
            </>
          )}

          <div style={{ marginTop: 20, padding: "12px", background: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a", fontSize: 11.5, color: "#92400e", textAlign: "center" }}>
            🔒 Secured by Bihar Government IT Infrastructure
          </div>
        </div>
      </div>
    </div>
  );
}
