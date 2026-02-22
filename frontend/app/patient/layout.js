"use client";

import Sidebar from "../../components/Sidebar";
import { useRequireAuth } from "../../lib/auth";

const items = [
  { href: "/patient/dashboard", label: "Dashboard" },
  { href: "/patient/messages", label: "Messages" }
];

export default function PatientLayout({ children }) {
  const { loading } = useRequireAuth("patient");
  if (loading) return <div className="p-8 text-sm text-slate-500">Loading patient workspace...</div>;
  return (
    <div className="flex min-h-screen gap-4 p-4">
      <Sidebar items={items} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
