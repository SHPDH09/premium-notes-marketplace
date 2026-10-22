"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Inbox,
  Phone,
  Users,
  Contact,
  Smartphone,
  BarChart3,
  Megaphone,
  Settings,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";

const agentNav = [
  { href: "/crm/inbox", label: "Inbox", icon: Inbox },
  { href: "/crm/contacts", label: "Contacts", icon: Contact },
  { href: "/crm/calls", label: "Calls", icon: Phone },
];

const adminExtra = [
  { href: "/crm/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/crm/connections", label: "WhatsApp", icon: Smartphone },
  { href: "/crm/agents", label: "Agents", icon: Users },
  { href: "/crm/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/crm/reports", label: "Reports", icon: BarChart3 },
  { href: "/crm/settings", label: "Settings", icon: Settings },
];

export function CrmShell({
  children,
  isCompanyAdmin,
  companyName,
}: {
  children: React.ReactNode;
  isCompanyAdmin: boolean;
  companyName?: string;
}) {
  const pathname = usePathname();
  const nav = isCompanyAdmin ? [...adminExtra, ...agentNav] : agentNav;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="hidden w-56 shrink-0 border-r border-emerald-900/40 bg-slate-900/80 p-4 md:block">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-400">WhatsApp CRM</p>
          <p className="mt-1 truncate text-sm font-semibold text-white">{companyName ?? "Workspace"}</p>
        </div>
        <nav className="space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
                  active ? "bg-emerald-600/20 text-emerald-300" : "text-slate-300 hover:bg-slate-800"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-8 border-t border-slate-800 pt-4">
          <LogoutButton className="w-full justify-start text-slate-400" />
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
