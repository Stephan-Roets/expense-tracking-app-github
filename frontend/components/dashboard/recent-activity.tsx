"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Fuel,
  Wrench,
  Droplets,
  CircleDot,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Clock,
  ArrowUpRight,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ExpenseCategory,
  formatZAR,
  EXPENSE_CATEGORY_LABELS,
} from "@/lib/types/database";
import { cn } from "@/lib/utils";

function RelativeTime({ date }: { date: Date }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span className="text-xs text-muted-foreground">...</span>;
  }

  return (
    <span className="text-xs text-muted-foreground">
      {formatDistanceToNow(date, { addSuffix: true })}
    </span>
  );
}

interface ActivityItem {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  vehicleReg: string;
  date: Date;
}

type RecentActivitySummaryTone = "neutral" | "info" | "activity";

type RecentActivitySummaryItem = {
  label: string;
  tone?: RecentActivitySummaryTone;
};

interface RecentActivityProps {
  activities: ActivityItem[];
  isOpen?: boolean;
  onToggle?: () => void;
}

const categoryIcons: Record<ExpenseCategory, LucideIcon> = {
  [ExpenseCategory.FUEL_LOG]: Fuel,
  [ExpenseCategory.MECHANIC_SERVICE]: Wrench,
  [ExpenseCategory.MAINTENANCE_TOPUP]: Droplets,
  [ExpenseCategory.TIRES]: CircleDot,
  [ExpenseCategory.CAR_WASH]: Sparkles,
  [ExpenseCategory.INSURANCE_PREMIUM]: FileText,
  [ExpenseCategory.VEHICLE_TRACKING]: ChevronRight,
  [ExpenseCategory.ETOLL_SANRAL]: CircleDot,
  [ExpenseCategory.LICENSE_RENEWAL]: FileText,
  [ExpenseCategory.PERSONAL_LICENSE]: FileText,
  [ExpenseCategory.ROADWORTHY]: Wrench,
  [ExpenseCategory.OTHER_FIXED]: Sparkles,
};

const categoryColors: Record<
  ExpenseCategory,
  { bg: string; text: string; border: string }
> = {
  [ExpenseCategory.FUEL_LOG]: {
    bg: "bg-chart-1/10",
    text: "text-chart-1",
    border: "border-chart-1/20",
  },
  [ExpenseCategory.MECHANIC_SERVICE]: {
    bg: "bg-chart-3/10",
    text: "text-chart-3",
    border: "border-chart-3/20",
  },
  [ExpenseCategory.MAINTENANCE_TOPUP]: {
    bg: "bg-chart-2/10",
    text: "text-chart-2",
    border: "border-chart-2/20",
  },
  [ExpenseCategory.TIRES]: {
    bg: "bg-chart-5/10",
    text: "text-chart-5",
    border: "border-chart-5/20",
  },
  [ExpenseCategory.CAR_WASH]: {
    bg: "bg-blue-500/10",
    text: "text-blue-600",
    border: "border-blue-500/20",
  },
  [ExpenseCategory.INSURANCE_PREMIUM]: {
    bg: "bg-purple-500/10",
    text: "text-purple-600",
    border: "border-purple-500/20",
  },
  [ExpenseCategory.VEHICLE_TRACKING]: {
    bg: "bg-green-500/10",
    text: "text-green-600",
    border: "border-green-500/20",
  },
  [ExpenseCategory.ETOLL_SANRAL]: {
    bg: "bg-orange-500/10",
    text: "text-orange-600",
    border: "border-orange-500/20",
  },
  [ExpenseCategory.LICENSE_RENEWAL]: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-600",
    border: "border-yellow-500/20",
  },
  [ExpenseCategory.PERSONAL_LICENSE]: {
    bg: "bg-rose-500/10",
    text: "text-rose-600",
    border: "border-rose-500/20",
  },
  [ExpenseCategory.ROADWORTHY]: {
    bg: "bg-red-500/10",
    text: "text-red-600",
    border: "border-red-500/20",
  },
  [ExpenseCategory.OTHER_FIXED]: {
    bg: "bg-gray-500/10",
    text: "text-gray-600",
    border: "border-gray-500/20",
  },
};

const RECENT_ACTIVITY_SUMMARY_BADGE_STYLES: Record<
  RecentActivitySummaryTone,
  string
> = {
  neutral: "border-border/60 bg-background/70 text-muted-foreground",
  info: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-300",
  activity:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-300",
};

const RECENT_ACTIVITY_TOGGLE_BUTTON_CLASS =
  "gap-2 border-violet-200 bg-violet-50/80 text-violet-700 hover:bg-violet-100 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-300 dark:hover:bg-violet-950/50";

const RECENT_ACTIVITY_CONTAINER_CLASS =
  "overflow-hidden border-violet-200/70 bg-violet-50/35 dark:border-violet-900/40 dark:bg-violet-950/15";

const RECENT_ACTIVITY_HEADER_CLASS =
  "flex flex-col gap-3 bg-linear-to-r from-violet-100/70 to-transparent pb-3 dark:from-violet-950/30 sm:flex-row sm:items-center sm:justify-between";

const RECENT_ACTIVITY_ICON_CLASS =
  "flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300";

const RECENT_ACTIVITY_TITLE_CLASS =
  "text-base font-semibold text-violet-900 dark:text-violet-100";

const RECENT_ACTIVITY_SUBTITLE_CLASS =
  "text-xs text-violet-700/90 dark:text-violet-200/90";

export function RecentActivity({
  activities,
  isOpen = true,
  onToggle,
}: RecentActivityProps) {
  const latestActivity = activities[0];
  const collapsedSummaryItems: RecentActivitySummaryItem[] = latestActivity
    ? [
        {
          label: `${activities.length} recent ${activities.length === 1 ? "expense" : "expenses"}`,
          tone: "activity",
        },
        { label: `Latest: ${latestActivity.description}` },
        { label: formatZAR(latestActivity.amount), tone: "info" },
        { label: latestActivity.vehicleReg, tone: "activity" },
      ]
    : [{ label: "No recent expenses yet" }];

  return (
    <Card className={RECENT_ACTIVITY_CONTAINER_CLASS}>
      <CardHeader className={RECENT_ACTIVITY_HEADER_CLASS}>
        <div className="flex items-center gap-2">
          <div className={RECENT_ACTIVITY_ICON_CLASS}>
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className={RECENT_ACTIVITY_TITLE_CLASS}>
              Recent Activity
            </CardTitle>
            <p className={RECENT_ACTIVITY_SUBTITLE_CLASS}>
              Your latest expenses
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Button variant="ghost" size="sm" className="gap-1 group" asChild>
            <Link href="/dashboard/expenses">
              View all
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </Button>
          {onToggle && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={RECENT_ACTIVITY_TOGGLE_BUTTON_CLASS}
              onClick={onToggle}
              aria-expanded={isOpen}
              aria-controls="recent-activity-panel"
            >
              {isOpen ? "Hide activity" : "Show activity"}
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  isOpen && "rotate-180",
                )}
              />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {!isOpen ? (
          <div id="recent-activity-panel" className="px-6 py-4">
            <div className="flex flex-wrap gap-2">
              {collapsedSummaryItems.map((item, index) => (
                <Badge
                  key={`${item.label}-${index}`}
                  variant="outline"
                  className={`rounded-full px-2.5 py-1 text-[11px] ${RECENT_ACTIVITY_SUMMARY_BADGE_STYLES[item.tone ?? "neutral"]}`}
                >
                  {item.label}
                </Badge>
              ))}
            </div>
          </div>
        ) : activities.length === 0 ? (
          <div id="recent-activity-panel" className="px-6 py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
              <Receipt className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="mb-1 text-sm font-medium text-foreground">
              No recent activity
            </p>
            <p className="mb-4 text-sm text-muted-foreground">
              Start tracking your vehicle expenses
            </p>
            <Button asChild size="sm">
              <Link href="/dashboard/expenses/new">Add First Expense</Link>
            </Button>
          </div>
        ) : (
          <ul id="recent-activity-panel" className="divide-y divide-border/50">
            {activities.map((activity, index) => {
              const Icon = categoryIcons[activity.category];
              const colors = categoryColors[activity.category];
              const categoryLabel = EXPENSE_CATEGORY_LABELS[activity.category];

              return (
                <li
                  key={activity.id}
                  className="page-enter"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Link
                    href={`/dashboard/expenses/${activity.id}`}
                    className="flex flex-col items-start gap-3 px-4 py-3.5 transition-all duration-200 hover:bg-muted/30 group sm:flex-row sm:items-center sm:gap-4"
                  >
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all duration-200",
                        colors.bg,
                        colors.border,
                        "group-hover:scale-105",
                      )}
                    >
                      <Icon className={cn("h-5 w-5", colors.text)} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="mb-0.5 flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium transition-colors group-hover:text-primary">
                          {activity.description}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-4 px-1.5 py-0 text-[10px]",
                            colors.text,
                            colors.border,
                          )}
                        >
                          {categoryLabel}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {activity.vehicleReg}
                        </span>
                        <span className="text-muted-foreground/50">&bull;</span>
                        <RelativeTime date={activity.date} />
                      </div>
                    </div>

                    <div className="w-full shrink-0 text-left sm:w-auto sm:text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatZAR(activity.amount)}
                      </p>
                      <ChevronRight className="mt-1 h-4 w-4 -translate-x-2 text-muted-foreground/50 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 sm:ml-auto" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
