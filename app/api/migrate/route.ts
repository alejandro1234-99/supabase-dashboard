import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import Airtable from "airtable";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tableId, tableName, apiKey, baseId } = body;

    if (!tableId || !tableName || !apiKey || !baseId) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    // Configurar Airtable
    const base = new Airtable({ apiKey }).base(baseId);

    // Obtener todos los registros de Airtable
    const records: Record<string, unknown>[] = [];
    await base(tableId)
      .select({ pageSize: 100 })
      .eachPage((pageRecords, fetchNextPage) => {
        pageRecords.forEach((record) => {
          records.push({
            airtable_id: record.id,
            ...record.fields,
          });
        });
        fetchNextPage();
      });

    if (records.length === 0) {
      return NextResponse.json({ message: "No hay registros en esta tabla", inserted: 0 });
    }

    // Crear tabla en Supabase e insertar datos
    const supabase = createAdminClient();

    // Insertar en Supabase (la tabla debe existir previamente o usar upsert)
    const { error, count } = await supabase
      .from(tableName)
      .upsert(records, { onConflict: "airtable_id", count: "exact" });

    if (error) throw error;

    return NextResponse.json({
      message: `Migración completada: ${count ?? records.length} registros`,
      inserted: count ?? records.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error en la migración" },
      { status: 500 }
    );
  }
}
