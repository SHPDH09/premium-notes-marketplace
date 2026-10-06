"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Ticket,
  Users,
  Receipt,
  User,
  KeyRound,
  Menu,
  Handshake,
  Home,
} from "lucide-react";
import { useState } from "react";

const nav = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/notes", label: "Notes", icon: FileText },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/users", label: "Students", icon: Users },
  { href: "/admin/collaborators", label: "Collaborations", icon: Handshake },
  { href: "/admin/homepage", label: "Homepage", icon: Home },
  { href: "/admin/transactions", label: "Transactions", icon: Receipt },
  { href: "/admin/profile", label: "Profile", icon: User },
  { href: "/admin/settings/password", label: "Password", icon: KeyRound },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-[1400px] gap-6 px-4 py-6 sm:px-6">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 transform border-r border-slate-200 bg-white p-5 transition lg:static lg:translate-x-0 lg:rounded-2xl lg:border lg:shadow-sm",
            open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          <BrandLogo />
          <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-indigo-500">Admin Panel</p>
          <nav className="mt-6 space-y-1">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <button onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu />
            </button>
          </div>
          {children}
        </div>
      </div>
      {open && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}
    </div>
  );
}
