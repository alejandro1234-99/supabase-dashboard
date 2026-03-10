"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Loader2 } from "lucide-react";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export default function ChartsPage() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [xAxis, setXAxis] = useState("");
  const [yAxis, setYAxis] = useState("");
  const [chartType, setChartType] = useState("bar");
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/tables")
      .then((r) => r.json())
      .then((d) => setTables(d.tables ?? []));
  }, []);

  const fetchTableData = useCallback(() => {
    if (!selectedTable) return;
    setLoading(true);
    fetch(`/api/table-data?table=${selectedTable}&page=1&pageSize=100`)
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.length > 0) {
          const cols = Object.keys(d.data[0]);
          setColumns(cols);
          setXAxis(cols[0]);
          setYAxis(cols.find((c) => typeof d.data[0][c] === "number") ?? cols[1] ?? cols[0]);
          setData(d.data);
        }
      })
      .finally(() => setLoading(false));
  }, [selectedTable]);

  useEffect(() => { fetchTableData(); }, [fetchTableData]);

  const chartData = data.slice(0, 50).map((row) => ({
    name: String(row[xAxis] ?? ""),
    value: Number(row[yAxis] ?? 0),
  }));

  const pieData = chartData.reduce<{ name: string; value: number }[]>((acc, item) => {
    const existing = acc.find((a) => a.name === item.name);
    if (existing) existing.value += item.value;
    else acc.push({ ...item });
    return acc;
  }, []).slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gráficas</h1>
        <p className="text-gray-500 mt-1">Visualiza tus datos con gráficas interactivas</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedTable} onValueChange={(v) => v && setSelectedTable(v)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tabla" />
          </SelectTrigger>
          <SelectContent>
            {tables.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={xAxis} onValueChange={(v) => v && setXAxis(v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Eje X" />
          </SelectTrigger>
          <SelectContent>
            {columns.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={yAxis} onValueChange={(v) => v && setYAxis(v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Eje Y (valor)" />
          </SelectTrigger>
          <SelectContent>
            {columns.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={chartType} onValueChange={(v) => v && setChartType(v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bar">Barras</SelectItem>
            <SelectItem value="line">Línea</SelectItem>
            <SelectItem value="pie">Pastel</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {selectedTable ? `${selectedTable}: ${xAxis} vs ${yAxis}` : "Selecciona una tabla"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
              Sin datos para mostrar
            </div>
          ) : chartType === "pie" ? (
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : chartType === "line" ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
