import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ tables: [], error: "Credenciales no configuradas" });
    }

    // El endpoint OpenAPI de Supabase lista todas las tablas expuestas
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }

    const spec = await res.json();

    // Las tablas están como paths en el spec OpenAPI: /nombre_tabla
    const tables = Object.keys(spec.paths ?? {})
      .map((p) => p.replace(/^\//, ""))
      .filter((t) => t && !t.includes("{") && !t.startsWith("rpc/"));

    return NextResponse.json({ tables });
  } catch (err) {
    return NextResponse.json({
      tables: [],
      error: err instanceof Error ? err.message : "Error al obtener tablas",
    });
  }
}
