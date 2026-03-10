"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

type Profile = {
  id: string;
  name: string;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  country: string | null;
  desired_role: string | null;
  public_role: string;
  onboarding_completed: boolean;
  created_at: string;
};

const ROLE_COLORS: Record<string, string> = {
  alumno: "bg-blue-100 text-blue-700",
  admin: "bg-red-100 text-red-700",
  moderator: "bg-purple-100 text-purple-700",
};

export default function UsersPage() {
  const [data, setData] = useState<Profile[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      table: "profiles",
      page: String(page),
      pageSize: "25",
    });
    fetch(`/api/table-data?${params}`)
      .then((r) => r.json())
      .then((d) => {
        let rows: Profile[] = d.data ?? [];
        if (search) {
          rows = rows.filter((u) =>
            u.name?.toLowerCase().includes(search.toLowerCase()) ||
            u.city?.toLowerCase().includes(search.toLowerCase()) ||
            u.country?.toLowerCase().includes(search.toLowerCase())
          );
        }
        if (roleFilter !== "all") {
          rows = rows.filter((u) => u.public_role === roleFilter);
        }
        setData(rows);
        setCount(d.count ?? 0);
      })
      .finally(() => setLoading(false));
  }, [page, search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const totalPages = Math.ceil(count / 25);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <p className="text-gray-500 mt-1">Directorio completo de miembros de la plataforma</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, ciudad..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => v && setRoleFilter(v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            <SelectItem value="alumno">Alumno</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="moderator">Moderador</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary">{count} usuarios</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Perfiles</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Objetivo</TableHead>
                    <TableHead>Onboarding</TableHead>
                    <TableHead>Registro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-xs shrink-0">
                            {u.name?.charAt(0)?.toUpperCase() ?? "?"}
                          </div>
                          <span className="text-sm font-medium">{u.name ?? "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.public_role] ?? "bg-gray-100 text-gray-700"}`}>
                          {u.public_role}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {[u.city, u.country].filter(Boolean).join(", ") || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 max-w-40 truncate">
                        {u.desired_role ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={u.onboarding_completed ? "default" : "secondary"}
                          className={u.onboarding_completed ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""}
                        >
                          {u.onboarding_completed ? "Completado" : "Pendiente"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-400">
                        {new Date(u.created_at).toLocaleDateString("es-ES")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Página {page} de {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
