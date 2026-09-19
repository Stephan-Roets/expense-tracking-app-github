"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatZAR } from "@/lib/types/database";

interface ExpenseBreakdownChartProps {
  data: Array<{
    category: string;
    amount: number;
    label: string;
  }>;
  title?: string;
}

const chartConfig = {
  fuel: { label: "Fuel", color: "var(--chart-1)" },
  service: { label: "Service & Repairs", color: "var(--chart-3)" },
  carwash: { label: "Car Wash", color: "var(--chart-2)" },
  topup: { label: "Top-ups", color: "var(--chart-4)" },
  tyres: { label: "Tyres", color: "var(--chart-5)" },
  fixed: { label: "Fixed Costs", color: "var(--primary)" },
} satisfies ChartConfig;

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
  "var(--chart-9)",
  "var(--chart-10)",
  "var(--primary)",
];

export function ExpenseBreakdownChart({
  data,
  title = "Expense Breakdown",
}: ExpenseBreakdownChartProps) {
  const total = data.reduce((sum, item) => sum + item.amount, 0);

  if (data.length === 0 || total === 0) {
    return (
      <Card className="border-indigo-200/70 bg-indigo-50/20 dark:border-indigo-900/40 dark:bg-indigo-950/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <div className="h-32 w-32 rounded-full border-4 border-dashed border-muted flex items-center justify-center">
            <span className="text-2xl text-muted-foreground">0%</span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            No expenses recorded yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-indigo-200/70 bg-indigo-50/20 dark:border-indigo-900/40 dark:bg-indigo-950/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square h-50"
        >
          <PieChart>
            <Tooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, name) => (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">{name}</span>
                      <span className="font-mono font-medium">
                        {formatZAR(Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Pie
              data={data}
              dataKey="amount"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              strokeWidth={2}
              stroke="var(--background)"
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                  className="transition-all duration-300 hover:opacity-80"
                />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>

        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          {data.map((item, index) => (
            <div key={item.category} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-sm shrink-0"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="truncate text-muted-foreground">
                {item.label}
              </span>
              <span className="ml-auto font-medium">
                {Math.round((item.amount / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
