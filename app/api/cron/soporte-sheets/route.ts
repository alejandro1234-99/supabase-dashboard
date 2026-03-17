/**
 * GET /api/cron/soporte-sheets
 * Ejecutado cada noche a las 23:00 UTC (medianoche España CET).
 * Exporta las filas de soporte del día de hoy (hora España) a Google Sheets.
 */
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createAdminClient } from "@/lib/supabase";

// Columnas que se exportan (en este orden)
const HEADERS = [
  "Nº Ticket", "Fecha", "Alumno", "Consulta",
  "Tipo", "Canal", "Responsable", "Escalado a", "Cerrada",
];

function toRow(r: Record<string, unknown>): string[] {
  return [
    String(r.numero_ticket ?? ""),
    String(r.fecha ?? ""),
    String(r.alumno ?? ""),
    String(r.consulta ?? ""),
    String(r.tipo_consulta ?? ""),
    String(r.medio_canal ?? ""),
    String(r.responsable ?? ""),
    String(r.escalado_a ?? ""),
    r.cerrada ? "Sí" : "No",
  ];
}

export async function GET(req: NextRequest) {
  // Seguridad: solo Vercel Cron puede llamar a este endpoint
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sheetId = process.env.GOOGLE_SHEETS_SOPORTE_ID;
  const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!sheetId || !serviceEmail || !privateKey) {
    return NextResponse.json({ error: "Missing Google Sheets env vars" }, { status: 500 });
  }

  // Fecha de hoy en zona horaria España
  const spainDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" })
    .format(new Date()); // "YYYY-MM-DD"

  // Obtener filas del día de hoy desde Supabase
  const supabase = createAdminClient() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from("soporte")
    .select("numero_ticket, fecha, alumno, consulta, tipo_consulta, medio_canal, responsable, escalado_a, cerrada")
    .eq("fecha", spainDate)
    .order("numero_ticket", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as Record<string, unknown>[];

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, message: `No hay filas para ${spainDate}`, rows: 0 });
  }

  // Autenticación Google
  const auth = new google.auth.JWT(serviceEmail, undefined, privateKey, [
    "https://www.googleapis.com/auth/spreadsheets",
  ]);
  const sheets = google.sheets({ version: "v4", auth });

  // Verificar si la hoja tiene cabecera, si no, añadirla
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "A1:I1",
  });

  const firstRow = existing.data.values?.[0];
  const valuesToAppend: string[][] = [];

  if (!firstRow || firstRow[0] !== HEADERS[0]) {
    valuesToAppend.push(HEADERS);
  }

  for (const r of rows) {
    valuesToAppend.push(toRow(r));
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "A1",
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: valuesToAppend },
  });

  return NextResponse.json({
    ok: true,
    date: spainDate,
    rows: rows.length,
    message: `${rows.length} filas exportadas para ${spainDate}`,
  });
}
