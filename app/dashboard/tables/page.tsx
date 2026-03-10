"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TablesPage() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/tables")
      .then((r) => r.json())
      .then((d) => {
        setTables(d.tables ?? []);
        if (d.tables?.length > 0) setSelectedTable(d.tables[0]);
      });
  }, []);

  const fetchData = useCallback(() => {
    if (!selectedTable) return;
    setLoading(true);
    fetch(`/api/table-data?table=${selectedTable}&page=${page}&pageSize=20&search=${search}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d.data ?? []);
        setCount(d.count ?? 0);
        if (d.data?.length > 0) {
          setColumns(Object.keys(d.data[0]));
        }
      })
      .finally(() => setLoading(false));
  }, [selectedTable, page, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(count / 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tablas</h1>
        <p className="text-gray-500 mt-1">Explora y filtra los datos de tus tablas</p>
      </div>

      <div className="flex items-center gap-3">
        <Select value={selectedTable} onValueChange={(v) => { if (v) { setSelectedTable(v); setPage(1); } }}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Selecciona tabla" />
          </SelectTrigger>
          <SelectContent>
            {tables.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {count > 0 && (
          <Badge variant="secondary">{count} registros</Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{selectedTable || "—"}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              {selectedTable ? "Sin datos en esta tabla" : "Selecciona una tabla"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((col) => (
                      <TableHead key={col} className="whitespace-nowrap text-xs font-semibold">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, i) => (
                    <TableRow key={i}>
                      {columns.map((col) => (
                        <TableCell key={col} className="text-xs max-w-48 truncate">
                          {row[col] === null
                            ? <span className="text-gray-300 italic">null</span>
                            : typeof row[col] === "object"
                            ? JSON.stringify(row[col])
                            : String(row[col])}
                        </TableCell>
                      ))}
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
          <p className="text-sm text-gray-500">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
