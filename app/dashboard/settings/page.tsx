"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

export default function SettingsPage() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [supabaseUrl, setSupabaseUrl] = useState(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  );

  useEffect(() => {
    fetch("/api/tables")
      .then((r) => r.json())
      .then((d) => setConnected(!d.error))
      .catch(() => setConnected(false));
  }, []);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 mt-1">Gestiona las conexiones de tu dashboard</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Supabase
            {connected === true && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            {connected === false && <XCircle className="h-4 w-4 text-red-500" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Edita <code className="bg-gray-100 px-1 rounded text-xs">.env.local</code> en la raíz del proyecto con tus credenciales:
          </p>
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-green-400 space-y-1">
            <p>NEXT_PUBLIC_SUPABASE_URL=<span className="text-yellow-300">tu-url</span></p>
            <p>NEXT_PUBLIC_SUPABASE_ANON_KEY=<span className="text-yellow-300">tu-anon-key</span></p>
            <p>SUPABASE_SERVICE_ROLE_KEY=<span className="text-yellow-300">tu-service-role-key</span></p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">URL actual</label>
            <Input value={supabaseUrl} readOnly className="font-mono text-xs bg-gray-50" />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetch("/api/tables")
                .then((r) => r.json())
                .then((d) => {
                  const ok = !d.error;
                  setConnected(ok);
                  toast[ok ? "success" : "error"](ok ? "Conexión exitosa" : d.error ?? "Error de conexión");
                })
                .catch(() => {
                  setConnected(false);
                  toast.error("Error de conexión");
                });
            }}
          >
            Verificar conexión
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Instrucciones de migración Airtable</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <ol className="list-decimal list-inside space-y-2">
            <li>
              Crea una tabla en Supabase con el mismo nombre que usarás en la migración.
              Añade una columna <code className="bg-gray-100 px-1 rounded text-xs">airtable_id TEXT UNIQUE</code>.
            </li>
            <li>
              Obtén tu Airtable API Key en{" "}
              <span className="text-emerald-600 underline">airtable.com/create/tokens</span>
            </li>
            <li>
              El Base ID lo encuentras en la URL de tu base:{" "}
              <code className="bg-gray-100 px-1 rounded text-xs">airtable.com/appXXXXXXXX/...</code>
            </li>
            <li>Ve a la página <strong>Migrar Airtable</strong> y mapea tus tablas.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
