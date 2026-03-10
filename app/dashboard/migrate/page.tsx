"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RefreshCw, Plus, Trash2, CheckCircle2, XCircle, Loader2 } from "lucide-react";

type MigrationRow = {
  id: string;
  airtableTableId: string;
  supabaseTableName: string;
  status: "pending" | "running" | "success" | "error";
  message: string;
};

export default function MigratePage() {
  const [apiKey, setApiKey] = useState(process.env.NEXT_PUBLIC_AIRTABLE_API_KEY ?? "");
  const [baseId, setBaseId] = useState(process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID ?? "");
  const [rows, setRows] = useState<MigrationRow[]>([
    { id: "1", airtableTableId: "", supabaseTableName: "", status: "pending", message: "" },
  ]);

  const addRow = () => {
    setRows((r) => [
      ...r,
      { id: Date.now().toString(), airtableTableId: "", supabaseTableName: "", status: "pending", message: "" },
    ]);
  };

  const removeRow = (id: string) => {
    setRows((r) => r.filter((row) => row.id !== id));
  };

  const updateRow = (id: string, field: keyof MigrationRow, value: string) => {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const migrateAll = async () => {
    if (!apiKey || !baseId) {
      toast.error("Ingresa tu API Key y Base ID de Airtable");
      return;
    }

    for (const row of rows) {
      if (!row.airtableTableId || !row.supabaseTableName) continue;

      setRows((r) => r.map((x) => x.id === row.id ? { ...x, status: "running", message: "" } : x));

      try {
        const res = await fetch("/api/migrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tableId: row.airtableTableId,
            tableName: row.supabaseTableName,
            apiKey,
            baseId,
          }),
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        setRows((r) =>
          r.map((x) => x.id === row.id ? { ...x, status: "success", message: data.message } : x)
        );
        toast.success(`${row.supabaseTableName}: ${data.message}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        setRows((r) =>
          r.map((x) => x.id === row.id ? { ...x, status: "error", message: msg } : x)
        );
        toast.error(`${row.supabaseTableName}: ${msg}`);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Migrar desde Airtable</h1>
        <p className="text-gray-500 mt-1">
          Importa tablas de Airtable a Supabase. Las tablas deben existir en Supabase con una columna{" "}
          <code className="bg-gray-100 px-1 rounded text-xs">airtable_id</code> de tipo text.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Credenciales de Airtable</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">API Key</label>
            <Input
              type="password"
              placeholder="patXXXXXXXXXXXXXX.XXXXXXXX"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Base ID</label>
            <Input
              placeholder="appXXXXXXXXXXXXXX"
              value={baseId}
              onChange={(e) => setBaseId(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mapeo de tablas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 text-xs font-semibold text-gray-500 px-1">
            <span>Nombre tabla Airtable</span>
            <span>Nombre tabla Supabase</span>
            <span>Estado</span>
            <span></span>
          </div>

          {rows.map((row) => (
            <div key={row.id} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
              <Input
                placeholder="Ej: Clientes"
                value={row.airtableTableId}
                onChange={(e) => updateRow(row.id, "airtableTableId", e.target.value)}
              />
              <Input
                placeholder="Ej: clientes"
                value={row.supabaseTableName}
                onChange={(e) => updateRow(row.id, "supabaseTableName", e.target.value)}
              />
              <div className="flex items-center gap-1">
                {row.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                {row.status === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                {row.status === "error" && (
                  <div title={row.message}>
                    <XCircle className="h-4 w-4 text-red-500" />
                  </div>
                )}
                {row.status === "pending" && <Badge variant="secondary" className="text-xs">Listo</Badge>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-red-500"
                onClick={() => removeRow(row.id)}
                disabled={rows.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={addRow} className="mt-2">
            <Plus className="h-4 w-4 mr-1" /> Añadir tabla
          </Button>
        </CardContent>
      </Card>

      <Button onClick={migrateAll} className="bg-emerald-600 hover:bg-emerald-700">
        <RefreshCw className="h-4 w-4 mr-2" />
        Iniciar migración
      </Button>
    </div>
  );
}
