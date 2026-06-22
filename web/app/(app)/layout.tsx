import Link from "next/link";
import { activeRole } from "@/lib/session";
import { RoleSwitcher } from "@/components/role-switcher";
import type { RoleKey } from "@/lib/parties";

const navLinks: Record<RoleKey, { label: string; href: string }[]> = {
  vendor: [
    { label: "Invoices", href: "/vendor/invoices" },
    { label: "New invoice", href: "/vendor/invoices/new" },
  ],
  ap: [
    { label: "Inbox", href: "/ap/inbox" },
    { label: "Policies", href: "/ap/policies" },
  ],
  ceo: [
    { label: "Dashboard", href: "/ceo/dashboard" },
    { label: "Agent", href: "/ceo/agent" },
  ],
  hr: [{ label: "Payroll", href: "/hr/payroll" }],
  customer: [{ label: "Subscriptions", href: "/ar/subscriptions" }],
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const role = await activeRole();
  const links = navLinks[role];

  return (
    <div className="min-h-screen text-foreground">
      <header style={{ position: "sticky", top: 14, zIndex: 50, marginInline: "auto", maxWidth: 1152, paddingInline: 24 }}>
        <div className="liquid-glass" style={{ borderRadius: 18, padding: "12px 18px" }}>
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5" style={{ fontWeight: 600, fontSize: 18 }}>
              <img src="/icon.png" alt="" width={28} height={28} className="h-7 w-7" />
              <span className="font-display" style={{ fontSize: 22 }}><span style={{ color: "#8b7bff" }}>Fin</span><span style={{ color: "#f5a623" }}>Hive</span></span>
            </Link>
            <RoleSwitcher active={role} />
          </div>
          <div className="mt-3 flex gap-5 border-t border-white/10 pt-2.5">
            {links.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
