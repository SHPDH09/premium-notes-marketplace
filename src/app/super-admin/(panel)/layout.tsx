import Link from "next/link";
import { redirect } from "next/navigation";
import { getCrmSession } from "@/lib/crm/auth";
import { LogoutButton } from "@/components/auth/logout-button";

const nav = [
  { href: "/super-admin", label: "Dashboard" },
  { href: "/super-admin/companies", label: "Companies" },
  { href: "/super-admin/plans", label: "Plans" },
  { href: "/super-admin/reports", label: "Reports" },
  { href: "/super-admin/settings", label: "WALayer & webhooks" },
];

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getCrmSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    redirect("/super-admin/login");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <p className="font-semibold text-emerald-400">Platform Super Admin</p>
          <LogoutButton callbackUrl="/super-admin/login" className="text-slate-400" />
        </div>
        <nav className="mx-auto mt-3 flex max-w-6xl gap-4 text-sm">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="text-slate-300 hover:text-white">
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
    </div>
  );
}
