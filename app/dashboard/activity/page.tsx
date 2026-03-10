"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw } from "lucide-react";

type ActivityLog = {
  id: string;
  event_type: string;
  category: string;
  user_id: string;
  target_type: string | null;
  description: string;
  created_at: string;
  profiles: { name: string; avatar_url: string | null } | null;
};

const EVENT_COLORS: Record<string, string> = {
  post_created: "bg-blue-100 text-blue-700",
  comment_created: "bg-purple-100 text-purple-700",
  lesson_completed: "bg-emerald-100 text-emerald-700",
  challenge_completed: "bg-yellow-100 text-yellow-700",
  event_registration: "bg-orange-100 text-orange-700",
  user_registered: "bg-pink-100 text-pink-700",
  qa_submitted: "bg-indigo-100 text-indigo-700",
  dm_sent: "bg-gray-100 text-gray-700",
  chat_message: "bg-teal-100 text-teal-700",
};

const CATEGORY_LABEL: Record<string, string> = {
  user: "Usuario",
  admin: "Admin",
  community: "Comunidad",
};

export default function ActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const cat = category !== "all" ? `&category=${category}` : "";
    fetch(`/api/activity?limit=100${cat}`)
      .then((r) => r.json())
      .then((d) => setLogs(d.data ?? []))
      .finally(() => setLoading(false));
  }, [category]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Actividad</h1>
        <p className="text-gray-500 mt-1">Log de acciones en tiempo real de la plataforma</p>
      </div>

      <div className="flex items-center gap-3">
        <Select value={category} onValueChange={(v) => v && setCategory(v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="user">Usuario</SelectItem>
            <SelectItem value="community">Comunidad</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>

        <Button
          variant={autoRefresh ? "default" : "outline"}
          size="sm"
          onClick={() => setAutoRefresh((v) => !v)}
          className={autoRefresh ? "bg-emerald-600 hover:bg-emerald-700" : ""}
        >
          {autoRefresh ? "Auto ON" : "Auto OFF"}
        </Button>

        <Badge variant="secondary">{logs.length} eventos</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            Feed de actividad
            {autoRefresh && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">Sin actividad registrada</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50">
                  <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-semibold text-xs shrink-0 mt-0.5">
                    {log.profiles?.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-800">
                        {log.profiles?.name ?? "Usuario desconocido"}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${EVENT_COLORS[log.event_type] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {log.event_type.replace(/_/g, " ")}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {CATEGORY_LABEL[log.category] ?? log.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{log.description}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(log.created_at).toLocaleString("es-ES", {
                      day: "numeric", month: "short",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
