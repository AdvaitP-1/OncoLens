"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function NavItem({ href, label }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={`block rounded-lg px-3 py-2 text-sm ${active ? "bg-teal-100 text-teal-800" : "text-slate-700 hover:bg-slate-100"}`}
    >
      {label}
    </Link>
  );
}

export default function Sidebar({ items }) {
  return (
    <aside className="card h-fit w-60 p-3">
      <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Navigation</p>
      <div className="space-y-1">
        {items.map((item) => (
          <NavItem key={item.href} href={item.href} label={item.label} />
        ))}
      </div>
    </aside>
  );
}
