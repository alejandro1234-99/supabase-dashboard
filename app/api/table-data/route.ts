import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const table = searchParams.get("table");
  const page = parseInt(searchParams.get("page") ?? "1");
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20");
  const search = searchParams.get("search") ?? "";

  if (!table) {
    return NextResponse.json({ error: "Tabla requerida" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from(table).select("*", { count: "exact" });

    if (search) {
      // Búsqueda genérica en texto
      query = query.textSearch("fts", search, { type: "plain" });
    }

    const { data, error, count } = await query.range(from, to);

    if (error) throw error;

    return NextResponse.json({ data, count, page, pageSize });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al obtener datos" },
      { status: 500 }
    );
  }
}
