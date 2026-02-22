"use client";

import Sidebar from "../../components/Sidebar";
import { useRequireAuth } from "../../lib/auth";

const items = [
  { href: "/clinician/dashboard", label: "Dashboard" },
  { href: "/clinician/new-case", label: "New Case" },
  { href: "/clinician/messages", label: "Messages" },
  { href: "/clinician/audit", label: "Audit" }
];

export default function ClinicianLayout({ children }) {
  const { loading } = useRequireAuth("clinician");
  if (loading) return <div className="p-8 text-sm text-slate-500">Loading clinician workspace...</div>;
  return (
    <div className="flex min-h-screen gap-4 p-4">
      <Sidebar items={items} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
