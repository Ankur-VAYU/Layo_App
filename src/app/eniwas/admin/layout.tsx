"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { section: "Overview", items: [
    { label: "Dashboard", href: "/eniwas/admin/dashboard", icon: "dashboard" },
    { label: "MIS Reports", href: "/eniwas/admin/reports", icon: "bar_chart" },
  ]},
  { section: "Allotment", items: [
    { label: "Pending Requests",  href: "/eniwas/admin/allotments",       icon: "pending_actions",        badge: "14" },
    { label: "Bulk Upload",       href: "/eniwas/admin/allotments/bulk",  icon: "upload_file" },
    { label: "Allotment History", href: "/eniwas/admin/allotments/history",icon: "history" },
    { label: "Waiting List",      href: "/eniwas/admin/allotments/waitlist",icon: "format_list_numbered",  badge: "8" },
  ]},
  { section: "Property & Employees", items: [
    { label: "Property Registry", href: "/eniwas/admin/properties", icon: "apartment" },
    { label: "Employee Status", href: "/eniwas/admin/employees", icon: "groups" },
    { label: "Occupancy Monitor", href: "/eniwas/admin/occupancy", icon: "home_work" },
  ]},
  { section: "Finance", items: [
    { label: "Rent Collection", href: "/eniwas/admin/rent", icon: "payments" },
    { label: "NOC Management", href: "/eniwas/admin/noc", icon: "description", badge: "3" },
  ]},
  { section: "System", items: [
    { label: "Access & Logs", href: "/eniwas/admin/logs", icon: "manage_accounts" },
  ]},
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="eniwas-body">
      <nav className="eniwas-nav">
        <div className="eniwas-logo">
          <div className="eniwas-logo-icon">🏛️</div>
          <div className="eniwas-logo-text">
            <h1>e-Niwas Admin</h1>
            <p>Bihar Government Housing – Rental Division</p>
          </div>
        </div>
        <div className="eniwas-nav-links">
          <span style={{ fontSize: 11, opacity: 0.7, marginRight: 6 }}>Admin: Suresh Prasad (BCD)</span>
          <div className="eniwas-avatar">SP</div>
          <button className="eniwas-nav-link" style={{ fontSize: 18, padding: "6px 10px" }}>🔔<span className="notif-dot" /></button>
          <button className="eniwas-nav-link" onClick={() => router.push("/eniwas")}>Logout</button>
        </div>
      </nav>
      <div className="eniwas-layout">
        <aside className="eniwas-sidebar">
          {NAV.map(group => (
            <div key={group.section}>
              <div className="eniwas-sidebar-section">{group.section}</div>
              {group.items.map(item => (
                <Link key={item.href} href={item.href}
                  className={`eniwas-sidebar-link ${pathname === item.href ? "active" : ""}`}>
                  <span className="material-symbols-outlined icon">{item.icon}</span>
                  {item.label}
                  {item.badge && <span className="eniwas-sidebar-badge orange">{item.badge}</span>}
                </Link>
              ))}
            </div>
          ))}
          <div style={{ marginTop: 8 }}>
            <button className="eniwas-sidebar-link" onClick={() => router.push("/eniwas")}>
              <span className="material-symbols-outlined icon">logout</span>Sign Out
            </button>
          </div>
        </aside>
        <main className="eniwas-content">{children}</main>
      </div>
    </div>
  );
}
