"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { label: "Dashboard", href: "/eniwas/user/dashboard", icon: "dashboard" },
  { label: "My Profile", href: "/eniwas/user/profile", icon: "person" },
  { label: "Find Property", href: "/eniwas/user/properties", icon: "apartment" },
  { label: "My Allotment", href: "/eniwas/user/allotment", icon: "home" },
  { label: "Rent & Payments", href: "/eniwas/user/rent", icon: "payments", badge: "Due" },
  { label: "NOC Request", href: "/eniwas/user/noc", icon: "description" },
  { label: "Complaints", href: "/eniwas/user/complaints", icon: "report_problem" },
];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="eniwas-body">
      {/* Top Nav */}
      <nav className="eniwas-nav">
        <div className="eniwas-logo">
          <div className="eniwas-logo-icon">🏠</div>
          <div className="eniwas-logo-text">
            <h1>e-Niwas</h1>
            <p>Bihar Government Housing Portal</p>
          </div>
        </div>
        <div className="eniwas-nav-links">
          <span style={{ fontSize: 12, opacity: 0.7, marginRight: 8 }}>Welcome, Rajesh Kumar</span>
          <div className="eniwas-avatar">RK</div>
          <button className="eniwas-nav-link" style={{ fontSize: 18, padding: "6px 10px" }} title="Notifications">
            🔔<span className="notif-dot" />
          </button>
          <button className="eniwas-nav-link" onClick={() => router.push("/eniwas")}>Logout</button>
        </div>
      </nav>

      <div className="eniwas-layout">
        {/* Sidebar */}
        <aside className="eniwas-sidebar">
          <div className="eniwas-sidebar-section">Employee Portal</div>
          {NAV.map(item => (
            <Link key={item.href} href={item.href}
              className={`eniwas-sidebar-link ${pathname === item.href ? "active" : ""}`}>
              <span className="material-symbols-outlined icon">{item.icon}</span>
              {item.label}
              {item.badge && <span className="eniwas-sidebar-badge orange">{item.badge}</span>}
            </Link>
          ))}
          <div className="eniwas-sidebar-section" style={{ marginTop: 16 }}>Account</div>
          <button className="eniwas-sidebar-link" onClick={() => router.push("/eniwas")}>
            <span className="material-symbols-outlined icon">logout</span>
            Sign Out
          </button>
        </aside>
        <main className="eniwas-content">{children}</main>
      </div>
    </div>
  );
}
