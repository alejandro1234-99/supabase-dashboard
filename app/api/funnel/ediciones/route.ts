import { NextResponse } from "next/server";

export async function GET() {
  // Fixed list of editions for the funnel panel
  const ediciones = ["Enero 2026", "Febrero 2026", "Marzo 2026", "Abril 2026"];
  return NextResponse.json({ ediciones });
}
