"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface FuelConsumptionChartProps {
  data: Array<{
    date: string;
    consumption: number;
    label?: string;
  }>;
  title?: string;
  unit?: string;
}

const chartConfig = {
  consumption: {
    label: "Consumption",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const DEGRADATION_THRESHOLD_PCT = 0.15;

export function FuelConsumptionChart({
  data,
  title = "Fuel Consumption Trend",
  unit = "L/100km",
}: FuelConsumptionChartProps) {
  if (data.length === 0) {
    return (
      <Card className="border-violet-200/70 bg-violet-50/20 dark:border-violet-900/40 dark:bg-violet-950/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <CardDescription>
            Track your fuel efficiency over time
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-full h-24 flex items-end justify-between gap-1 px-4 opacity-30">
            {[40, 60, 45, 70, 55, 80, 65].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-muted rounded-t"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Log fuel purchases to see your consumption trend
          </p>
        </CardContent>
      </Card>
    );
  }

  const avg = data.reduce((sum, d) => sum + d.consumption, 0) / data.length;
  const isLPer100km = unit === "L/100km";
  // For L/100km higher = worse; for km/L higher = better
  const warningThreshold =
    avg *
    (1 +
      (isLPer100km ? DEGRADATION_THRESHOLD_PCT : -DEGRADATION_THRESHOLD_PCT));

  // Detect recent degradation: compare last 3 points vs overall avg
  const recentPoints = data.slice(-3);
  const recentAvg =
    recentPoints.length > 0
      ? recentPoints.reduce((sum, d) => sum + d.consumption, 0) /
        recentPoints.length
      : avg;
  const isDegrading = isLPer100km
    ? recentAvg >= warningThreshold
    : recentAvg <= warningThreshold;
  const lastVal = data[data.length - 1]?.consumption;

  return (
    <Card
      className={`border-violet-200/70 bg-violet-50/20 dark:border-violet-900/40 dark:bg-violet-950/10 chart-container${isDegrading ? " border-amber-400/60" : ""}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">{title}</CardTitle>
              {isDegrading && (
                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  Declining
                </span>
              )}
            </div>
            <CardDescription>
              Average: {avg.toFixed(1)} {unit}
            </CardDescription>
          </div>
          <div className="text-right">
            <p
              className={`text-2xl font-bold animate-number ${isDegrading ? "text-amber-600 dark:text-amber-400" : "text-primary"}`}
            >
              {lastVal?.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">{unit}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-50 w-full">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="fuelGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="100%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--border)"
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => [
                    `${Number(value).toFixed(1)} ${unit}`,
                    "Consumption",
                  ]}
                />
              }
            />
            {/* Warning threshold reference line */}
            <ReferenceLine
              y={warningThreshold}
              stroke="#f59e0b"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{
                value: isLPer100km ? "⚠ +15%" : "⚠ -15%",
                position: "insideTopRight",
                fontSize: 10,
                fill: "#f59e0b",
              }}
            />
            <Area
              type="monotone"
              dataKey="consumption"
              stroke={isDegrading ? "#f59e0b" : "var(--chart-1)"}
              strokeWidth={2}
              fill="url(#fuelGradient)"
              dot={{
                fill: isDegrading ? "#f59e0b" : "var(--chart-1)",
                strokeWidth: 0,
                r: 3,
              }}
              activeDot={{
                r: 5,
                fill: isDegrading ? "#f59e0b" : "var(--chart-1)",
                stroke: "var(--background)",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
