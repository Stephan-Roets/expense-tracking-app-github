"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
import { formatZAR } from "@/lib/types/database";

interface MonthlyExpensesChartProps {
  data: Array<{
    month: string;
    amount: number;
  }>;
  title?: string;
}

const chartConfig = {
  amount: {
    label: "Expenses",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function MonthlyExpensesChart({
  data,
  title = "Monthly Expenses",
}: MonthlyExpensesChartProps) {
  if (data.length === 0) {
    return (
      <Card className="border-indigo-200/70 bg-indigo-50/20 dark:border-indigo-900/40 dark:bg-indigo-950/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <CardDescription>Track your spending month by month</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-full h-24 flex items-end justify-between gap-2 px-4 opacity-30">
            {[30, 50, 40, 60, 45, 55].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-muted rounded-t"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Record expenses to see monthly trends
          </p>
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((sum, d) => sum + d.amount, 0);
  const avg = total / data.length;

  return (
    <Card className="border-indigo-200/70 bg-indigo-50/20 dark:border-indigo-900/40 dark:bg-indigo-950/10 chart-container">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <CardDescription>Monthly average: {formatZAR(avg)}</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary animate-number">
              {formatZAR(data[data.length - 1]?.amount || 0)}
            </p>
            <p className="text-xs text-muted-foreground">This month</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-50 w-full">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={1} />
                <stop
                  offset="100%"
                  stopColor="var(--primary)"
                  stopOpacity={0.6}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--border)"
            />
            <XAxis
              dataKey="month"
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
              tickFormatter={(value) => `R${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => [formatZAR(Number(value)), "Total"]}
                />
              }
            />
            <Bar
              dataKey="amount"
              fill="url(#expenseGradient)"
              radius={[4, 4, 0, 0]}
              className="transition-all duration-300"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
