import type { Metadata } from "next";
import "./eniwas.css";

export const metadata: Metadata = {
  title: "e-Niwas | Bihar Government Housing Portal",
  description: "Property Allotment, Rent Management & NOC Management System for Bihar Government Employees",
};

export default function ENiwasLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
