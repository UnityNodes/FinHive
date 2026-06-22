"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { RoleKey } from "@/lib/parties";

export async function setRole(role: RoleKey): Promise<void> {
  const jar = await cookies();
  jar.set("finhive-role", role, { path: "/", httpOnly: true, sameSite: "lax" });
  revalidatePath("/");
}
