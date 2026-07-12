"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const axis = { fontSize: 11, fill: "#6B7280" };

type RevenuePoint = { date: string; revenue: number; cost?: number; profit?: number; packages?: number };
type BarPoint = { name?: string; code?: string; sales: number; revenue?: number };
type PiePoint = { name: string; value: number; fill: string };

export function RevenueAreaChart({ data = [] }: { data?: RevenuePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={236}>
      <AreaChart data={data} margin={{ left: -16, right: 8, top: 12, bottom: 0 }}>
        <defs>
          <linearGradient id="revenue" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="#004FFE" stopOpacity={0.28} />
            <stop offset="95%" stopColor="#004FFE" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#EEF2F7" vertical={false} />
        <XAxis dataKey="date" tick={axis} axisLine={false} tickLine={false} />
        <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={(v) => `€${Number(v) / 1000}k`} />
        <Tooltip formatter={(v) => [`€${Number(v).toLocaleString()}`, "Revenue"]} />
        <Area type="monotone" dataKey="revenue" stroke="#004FFE" strokeWidth={2.4} fill="url(#revenue)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CountryBarChart({ data = [] }: { data?: BarPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={236}>
      <BarChart data={data} margin={{ left: -20, right: 4, top: 12 }}>
        <CartesianGrid stroke="#EEF2F7" vertical={false} />
        <XAxis dataKey="code" tick={axis} axisLine={false} tickLine={false} />
        <YAxis tick={axis} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => [Number(v).toLocaleString(), "Sales"]} />
        <Bar dataKey="sales" radius={[5, 5, 0, 0]} fill="#004FFE" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PackageSalesChart({ data = [] }: { data?: BarPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={232}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 18, top: 8, bottom: 8 }}>
        <CartesianGrid stroke="#EEF2F7" horizontal={false} />
        <XAxis type="number" tick={axis} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={92} tick={axis} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => [Number(v).toLocaleString(), "Sales"]} />
        <Bar dataKey="sales" radius={[0, 5, 5, 0]} fill="#004FFE" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PaymentDonutChart({ data = [] }: { data?: PiePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={184}>
      <PieChart>
        <Pie data={data} dataKey="value" innerRadius={50} outerRadius={70} paddingAngle={4}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CustomerMixChart({ data = [] }: { data?: PiePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={184}>
      <PieChart>
        <Pie data={data} dataKey="value" innerRadius={48} outerRadius={70} paddingAngle={5}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => [`${v}%`, "Share"]} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ProfitLineChart({ data = [] }: { data?: RevenuePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ left: -18, right: 10, top: 12 }}>
        <CartesianGrid stroke="#EEF2F7" vertical={false} />
        <XAxis dataKey="date" tick={axis} axisLine={false} tickLine={false} />
        <YAxis tick={axis} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => [`€${Number(v).toLocaleString()}`, "Gross profit"]} />
        <Line dataKey="profit" stroke="#16A34A" strokeWidth={2.3} dot={false} />
        <Line dataKey="cost" stroke="#F59E0B" strokeWidth={2.1} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
