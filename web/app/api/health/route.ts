import { NextResponse } from "next/server";
import { ledgerEnd } from "@/lib/daml-client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ledgerOffset = await ledgerEnd();
    return NextResponse.json({ ok: true, ledgerOffset });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message });
  }
}
