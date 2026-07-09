"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type ChartType = "area" | "bar" | "line";

interface ChartPlaceholderProps {
  title: string;
  subtitle?: string;
  type?: ChartType;
  data?: Array<Record<string, string | number>>;
  dataKey?: string;
  xKey?: string;
  color?: string;
  height?: number;
  className?: string;
}

const defaultRevenueData = [
  { month: "Jan", value: 42 },
  { month: "Feb", value: 58 },
  { month: "Mar", value: 51 },
  { month: "Apr", value: 72 },
  { month: "May", value: 68 },
  { month: "Jun", value: 85 },
];

const defaultVolumeData = [
  { week: "W1", volume: 120 },
  { week: "W2", volume: 185 },
  { week: "W3", volume: 160 },
  { week: "W4", volume: 210 },
  { week: "W5", volume: 195 },
  { week: "W6", volume: 240 },
];

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  fontSize: 12,
  fontFamily: "Inter, sans-serif",
  boxShadow: "var(--shadow-card)",
  color: "var(--text-primary)",
};

export const ChartPlaceholder: React.FC<ChartPlaceholderProps> = ({
  title,
  subtitle,
  type = "area",
  data,
  dataKey = "value",
  xKey = "month",
  color = "#0F766E",
  height = 220,
  className,
}) => {
  const chartData = data || (type === "bar" ? defaultVolumeData : defaultRevenueData);
  const resolvedDataKey = data ? dataKey : type === "bar" ? "volume" : "value";
  const resolvedXKey = data ? xKey : type === "bar" ? "week" : "month";

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 8, right: 16, left: -16, bottom: 0 },
    };

    const axisProps = {
      tick: { fontSize: 11, fill: "#94A3B8", fontFamily: "Inter" },
      axisLine: false,
      tickLine: false,
    };

    switch (type) {
      case "bar":
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey={resolvedXKey} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey={resolvedDataKey} fill={color} radius={[6, 6, 0, 0]} />
          </BarChart>
        );
      case "line":
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey={resolvedXKey} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Line
              type="monotone"
              dataKey={resolvedDataKey}
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        );
      default:
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id={`gradient-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey={resolvedXKey} {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area
              type="monotone"
              dataKey={resolvedDataKey}
              stroke={color}
              strokeWidth={2}
              fill={`url(#gradient-${color.replace("#", "")})`}
            />
          </AreaChart>
        );
    }
  };

  return (
    <Card title={title} subtitle={subtitle} className={cn(className)} hover={false}>
      <div style={{ height }} className="w-full mt-1">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
