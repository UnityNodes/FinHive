import "server-only";
import { cookies } from "next/headers";
import type { RoleKey } from "./parties";
import { PARTIES } from "./parties";

const ROLE_COOKIE = "finhive-role";

export async function activeRole(): Promise<RoleKey> {
  const jar = await cookies();
  const val = jar.get(ROLE_COOKIE)?.value;
  const valid: RoleKey[] = ["ceo", "ap", "vendor", "customer", "hr"];
  if (val && valid.includes(val as RoleKey)) {
    return val as RoleKey;
  }
  return "vendor";
}

export async function activeParty(): Promise<string> {
  const role = await activeRole();
  return PARTIES()[role].party;
}
