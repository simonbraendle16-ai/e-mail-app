import { NextResponse, type NextRequest } from "next/server";
import { serverZugang } from "@/lib/supabase/server";

export async function POST(anfrage: NextRequest) {
  const zugang = await serverZugang();
  await zugang.auth.signOut();

  const ziel = anfrage.nextUrl.clone();
  ziel.pathname = "/anmelden";
  ziel.search = "";
  return NextResponse.redirect(ziel, { status: 303 });
}
