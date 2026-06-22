import "server-only";
import { getEnv } from "./env";

export type RoleKey = "ceo" | "ap" | "vendor" | "customer" | "hr";

export interface RoleInfo {
  label: string;
  party: string;
}

export function PARTIES(): Record<RoleKey, RoleInfo> {
  const e = getEnv();
  return {
    ceo: { label: "Alice (CEO)", party: e.CEO_PARTY },
    ap: { label: "Bob (AP Clerk)", party: e.AP_PARTY },
    vendor: { label: "Vera (Vendor)", party: e.VENDOR_PARTY },
    customer: { label: "Cara (Customer)", party: e.CUSTOMER_PARTY },
    hr: { label: "Hannah (HR)", party: e.HR_PARTY },
  };
}
