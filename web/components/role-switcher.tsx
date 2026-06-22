"use client";

import { setRole } from "@/actions/role";
import type { RoleKey } from "@/lib/parties";
import { cn } from "@/lib/utils";

const roles: { key: RoleKey; label: string }[] = [
  { key: "ceo", label: "CEO" },
  { key: "ap", label: "AP" },
  { key: "vendor", label: "Vendor" },
  { key: "customer", label: "Customer" },
  { key: "hr", label: "HR" },
];

export function RoleSwitcher({ active }: { active: RoleKey }) {
  return (
    <div className="flex items-center gap-1">
      {roles.map(({ key, label }) => (
        <form key={key} action={setRole.bind(null, key)}>
          <button
            type="submit"
            className={cn(
              "rounded px-2.5 py-1 text-xs font-medium transition-colors",
              active === key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        </form>
      ))}
    </div>
  );
}
