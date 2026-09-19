"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
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
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Briefcase, MapPin } from "lucide-react";

interface TripSummaryChartProps {
  data: Array<{
    month: string;
    business: number;
    private: number;
  }>;
  title?: string;
}

const chartConfig = {
  business: {
    label: "Business",
    color: "var(--chart-1)",
    icon: Briefcase,
  },
  private: {
    label: "Private",
    color: "var(--chart-3)",
    icon: MapPin,
  },
} satisfies ChartConfig;

export function TripSummaryChart({
  data,
  title = "Trip Distance Summary",
}: TripSummaryChartProps) {
  if (data.length === 0) {
    return (
      <Card className="border-violet-200/70 bg-violet-50/20 dark:border-violet-900/40 dark:bg-violet-950/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <CardDescription>Business vs Private kilometers</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="flex gap-4 items-end h-24 opacity-30">
            <div className="flex flex-col gap-1 items-center">
              <div className="w-12 h-16 bg-chart-1/50 rounded-t" />
              <span className="text-xs text-muted-foreground">Bus</span>
            </div>
            <div className="flex flex-col gap-1 items-center">
              <div className="w-12 h-10 bg-chart-3/50 rounded-t" />
              <span className="text-xs text-muted-foreground">Priv</span>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Log trips to see your SARS-deductible breakdown
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalBusiness = data.reduce((sum, d) => sum + d.business, 0);
  const totalPrivate = data.reduce((sum, d) => sum + d.private, 0);
  const total = totalBusiness + totalPrivate;
  const businessPct = total > 0 ? Math.round((totalBusiness / total) * 100) : 0;

  return (
    <Card className="border-violet-200/70 bg-violet-50/20 dark:border-violet-900/40 dark:bg-violet-950/10 chart-container">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <CardDescription>
              {total.toLocaleString()} km total this period
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-chart-1 animate-number">
              {businessPct}%
            </p>
            <p className="text-xs text-muted-foreground">Business use</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="w-full h-50">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
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
              tickFormatter={(value) => `${value}km`}
            />
            <Tooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => [
                    `${Number(value).toLocaleString()} km`,
                    name === "business" ? "Business" : "Private",
                  ]}
                />
              }
            />
            <Legend content={<ChartLegendContent />} />
            <Bar
              dataKey="business"
              stackId="trips"
              fill="var(--chart-1)"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="private"
              stackId="trips"
              fill="var(--chart-3)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>

        {/* Summary stats */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-chart-1/10">
            <Briefcase className="h-4 w-4 text-chart-1" />
            <div>
              <p className="text-sm font-medium">
                {totalBusiness.toLocaleString()} km
              </p>
              <p className="text-xs text-muted-foreground">
                Business ({businessPct}%)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-chart-3/10">
            <MapPin className="h-4 w-4 text-chart-3" />
            <div>
              <p className="text-sm font-medium">
                {totalPrivate.toLocaleString()} km
              </p>
              <p className="text-xs text-muted-foreground">
                Private ({100 - businessPct}%)
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
