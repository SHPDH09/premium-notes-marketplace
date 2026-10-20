"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  BookOpen,
  Receipt,
  User,
  Menu,
  Package,
  Truck,
  Briefcase,
  Mail,
  ClipboardList,
} from "lucide-react";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/auth/logout-button";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | null;
};

const baseNav: Omit<NavItem, "badge">[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/cart", label: "Cart", icon: ShoppingCart },
  { href: "/purchases", label: "Purchased Notes", icon: BookOpen },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/physical-documents", label: "Physical Documents", icon: Package },
  { href: "/physical-orders", label: "Physical Orders", icon: Truck },
  { href: "/placement", label: "Placement jobs", icon: Briefcase },
  { href: "/profile/placement", label: "Placement profile", icon: Briefcase },
  { href: "/dashboard/placement/job-postings", label: "My job posts", icon: ClipboardList },
  { href: "/dashboard/placement/email-setup", label: "Placement email setup", icon: Mail },
  { href: "/profile", label: "Profile", icon: User },
];

export function StudentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [jobPostCount, setJobPostCount] = useState<number | null>(null);

  function loadJobPostCount() {
    fetch("/api/student/placement/status", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setJobPostCount(typeof d.jobPostCount === "number" ? d.jobPostCount : 0))
      .catch(() => setJobPostCount(null));
  }

  useEffect(() => {
    loadJobPostCount();
    const onUpdate = () => loadJobPostCount();
    window.addEventListener("tl-job-posts-changed", onUpdate);
    return () => window.removeEventListener("tl-job-posts-changed", onUpdate);
  }, [pathname]);

  const nav: NavItem[] = baseNav.map((item) =>
    item.href === "/dashboard/placement/job-postings" ? { ...item, badge: jobPostCount } : item
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-64 flex-col transform border-r border-slate-200 bg-white p-5 transition md:static md:translate-x-0 md:rounded-2xl md:border md:shadow-sm",
            open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          )}
        >
          <BrandLogo />
          <nav className="mt-8 space-y-1">
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
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge != null ? (
                    <span
                      className={cn(
                        "min-w-[1.25rem] rounded-full px-2 py-0.5 text-center text-xs font-semibold",
                        item.badge > 0 ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"
                      )}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto border-t border-slate-100 pt-4">
            <LogoutButton variant="sidebar" callbackUrl="/login" />
          </div>
        </aside>
        <div className="flex-1 md:ml-0">
          <div className="mb-4 flex items-center justify-between md:hidden">
            <button onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu />
            </button>
            <Link href="/notes" className="text-sm font-medium text-indigo-600">
              Browse Notes
            </Link>
          </div>
          {children}
        </div>
      </div>
      {open && <div className="fixed inset-0 z-40 bg-black/30 md:hidden" onClick={() => setOpen(false)} />}
    </div>
  );
}
