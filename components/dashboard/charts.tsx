import {
  Area,
  AreaChart,
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
import { trendData, studentGrowth, performanceDistribution } from "@/lib/mock/data";

const axisStyle = {
  fontSize: 11,
  fill: "var(--color-muted-foreground)",
} as const;

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--color-foreground)",
  padding: "8px 12px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
};

export function AssessmentTrendChart() {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <AreaChart data={trendData} margin={{ top: 10, right: 8, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} style={axisStyle} />
        <YAxis tickLine={false} axisLine={false} style={axisStyle} width={40} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--color-border)" }} />
        <Area
          type="monotone"
          dataKey="assessments"
          stroke="var(--color-accent)"
          strokeWidth={2}
          fill="url(#trendFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function StudentGrowthChart() {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <LineChart data={studentGrowth} margin={{ top: 10, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid stroke="var(--color-border-subtle)" vertical={false} />
        <XAxis dataKey="month" tickLine={false} axisLine={false} style={axisStyle} />
        <YAxis tickLine={false} axisLine={false} style={axisStyle} width={40} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--color-border)" }} />
        <Line
          type="monotone"
          dataKey="students"
          stroke="var(--color-chart-2)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

const distColors = [
  "var(--color-destructive)",
  "var(--color-warning)",
  "var(--color-chart-3)",
  "var(--color-accent)",
  "var(--color-chart-2)",
];

export function PerformanceDistributionChart() {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <PieChart>
        <Pie
          data={performanceDistribution}
          dataKey="count"
          nameKey="band"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={2}
          stroke="var(--color-background)"
          strokeWidth={2}
        >
          {performanceDistribution.map((_, i) => (
            <Cell key={i} fill={distColors[i % distColors.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}
