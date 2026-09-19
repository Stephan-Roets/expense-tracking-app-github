"use client";

import { ReactNode, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/contexts/auth-context";
import { UserRole } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

export type DashboardPanelTone =
  | "neutral"
  | "success"
  | "warning"
  | "info"
  | "activity";

export type DashboardCollapsibleSummaryItem = {
  label: string;
  tone?: DashboardPanelTone;
};

interface DashboardCollapsiblePanelProps {
  panelId: string;
  title: string;
  description: string;
  tone?: DashboardPanelTone;
  summaryItems?: DashboardCollapsibleSummaryItem[];
  headerActions?: ReactNode;
  openLabel?: string;
  closedLabel?: string;
  defaultOpen?: boolean;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}

const DASHBOARD_SUMMARY_BADGE_STYLES: Record<DashboardPanelTone, string> = {
  neutral: "border-border/60 bg-background/70 text-muted-foreground",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300",
  info: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-300",
  activity:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-300",
};

const DASHBOARD_TOGGLE_BUTTON_STYLES: Record<DashboardPanelTone, string> = {
  neutral:
    "border-border/60 bg-background/80 text-foreground hover:bg-accent/70",
  success:
    "border-emerald-200 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50",
  warning:
    "border-amber-200 bg-amber-50/80 text-amber-700 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50",
  info: "border-indigo-200 bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-300 dark:hover:bg-indigo-950/50",
  activity:
    "border-violet-200 bg-violet-50/80 text-violet-700 hover:bg-violet-100 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-300 dark:hover:bg-violet-950/50",
};

const DASHBOARD_PANEL_CONTAINER_STYLES: Record<DashboardPanelTone, string> = {
  neutral: "border-border/60 bg-muted/20",
  success:
    "border-emerald-200/70 bg-emerald-50/35 dark:border-emerald-900/40 dark:bg-emerald-950/15",
  warning:
    "border-amber-200/70 bg-amber-50/35 dark:border-amber-900/40 dark:bg-amber-950/15",
  info: "border-indigo-200/70 bg-indigo-50/35 dark:border-indigo-900/40 dark:bg-indigo-950/15",
  activity:
    "border-violet-200/70 bg-violet-50/35 dark:border-violet-900/40 dark:bg-violet-950/15",
};

const DASHBOARD_PANEL_TITLE_STYLES: Record<DashboardPanelTone, string> = {
  neutral: "text-foreground",
  success: "text-emerald-900 dark:text-emerald-100",
  warning: "text-amber-900 dark:text-amber-100",
  info: "text-indigo-900 dark:text-indigo-100",
  activity: "text-violet-900 dark:text-violet-100",
};

const DASHBOARD_PANEL_SUBTITLE_STYLES: Record<DashboardPanelTone, string> = {
  neutral: "text-muted-foreground",
  success: "text-emerald-700/90 dark:text-emerald-200/90",
  warning: "text-amber-700/90 dark:text-amber-200/90",
  info: "text-indigo-700/90 dark:text-indigo-200/90",
  activity: "text-violet-700/90 dark:text-violet-200/90",
};

function getDashboardPanelStorageKey({
  panelId,
  organizationMode,
  role,
  userEmail,
}: {
  panelId: string;
  organizationMode?: string;
  role?: string;
  userEmail?: string;
}): string {
  const emailPart = userEmail?.toLowerCase().trim() || "unknown-user";
  const rolePart = role || "unknown-role";
  const modePart = organizationMode || "unknown-mode";

  return `dashboard-panel-state:${panelId}:${emailPart}:${modePart}:${rolePart}`;
}

function getStoredUserScope() {
  try {
    const rawProfile = localStorage.getItem("user_profile");
    const storedProfile = rawProfile
      ? (JSON.parse(rawProfile) as Record<string, unknown>)
      : null;

    const storedRole =
      localStorage.getItem("role") ??
      (typeof storedProfile?.role === "string" ? storedProfile.role : undefined);
    const storedOrganizationMode =
      localStorage.getItem("org_mode") ??
      (typeof storedProfile?.organizationMode === "string"
        ? storedProfile.organizationMode
        : undefined);
    const storedEmail =
      typeof storedProfile?.email === "string" ? storedProfile.email : undefined;

    return {
      storedRole,
      storedOrganizationMode,
      storedEmail,
    };
  } catch {
    return {
      storedRole: undefined,
      storedOrganizationMode: undefined,
      storedEmail: undefined,
    };
  }
}

export function DashboardCollapsiblePanel({
  panelId,
  title,
  description,
  tone = "neutral",
  summaryItems = [],
  headerActions,
  openLabel = "Hide details",
  closedLabel = "Show details",
  defaultOpen = true,
  className,
  contentClassName,
  children,
}: DashboardCollapsiblePanelProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [preferencesReady, setPreferencesReady] = useState(false);

  useEffect(() => {
    const { storedRole, storedOrganizationMode, storedEmail } =
      getStoredUserScope();
    const nextStorageKey = getDashboardPanelStorageKey({
      panelId,
      organizationMode: user?.organizationMode ?? storedOrganizationMode,
      role: user?.role ?? storedRole ?? UserRole.DRIVER,
      userEmail: user?.email ?? storedEmail,
    });

    setStorageKey(nextStorageKey);

    try {
      const savedPreference = localStorage.getItem(nextStorageKey);

      if (savedPreference === "open" || savedPreference === "closed") {
        setIsOpen(savedPreference === "open");
      } else {
        localStorage.setItem(nextStorageKey, defaultOpen ? "open" : "closed");
        setIsOpen(defaultOpen);
      }
    } catch {
      setIsOpen(defaultOpen);
    } finally {
      setPreferencesReady(true);
    }
  }, [defaultOpen, panelId, user?.email, user?.organizationMode, user?.role]);

  const handleToggle = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);

    if (!storageKey) {
      return;
    }

    try {
      localStorage.setItem(storageKey, nextOpen ? "open" : "closed");
    } catch {}
  };

  const panelContentId = `${panelId}-panel`;
  const shouldShowToggle = preferencesReady && isMobile;
  const shouldShowContent = !isMobile || isOpen;

  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border p-4 w-full overflow-hidden",
        DASHBOARD_PANEL_CONTAINER_STYLES[tone],
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between min-w-0">
        <div className="min-w-0 flex-1">
          <h2
            className={cn(
              "text-lg font-semibold",
              DASHBOARD_PANEL_TITLE_STYLES[tone],
            )}
          >
            {title}
          </h2>
          <p className={cn("text-sm", DASHBOARD_PANEL_SUBTITLE_STYLES[tone])}>
            {description}
          </p>
        </div>

        {(headerActions || shouldShowToggle) && (
          <div className="flex w-full flex-col gap-2 self-start sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end shrink-0">
            {headerActions}
            {shouldShowToggle && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "w-full justify-center gap-2 sm:w-auto whitespace-nowrap",
                  DASHBOARD_TOGGLE_BUTTON_STYLES[tone],
                )}
                onClick={handleToggle}
                aria-expanded={isOpen}
                aria-controls={panelContentId}
              >
                {isOpen ? openLabel : closedLabel}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform shrink-0",
                    isOpen && "rotate-180",
                  )}
                />
              </Button>
            )}
          </div>
        )}
      </div>

      {!shouldShowContent && summaryItems.length > 0 && (
        <div id={panelContentId} className="flex flex-wrap gap-2 w-full min-w-0 overflow-hidden">
          {summaryItems.map((item, index) => (
            <Badge
              key={`${item.label}-${index}`}
              variant="outline"
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] truncate max-w-full",
                DASHBOARD_SUMMARY_BADGE_STYLES[item.tone ?? "neutral"],
              )}
            >
              {item.label}
            </Badge>
          ))}
        </div>
      )}

      {shouldShowContent && (
        <div id={panelContentId} className={cn(contentClassName, "w-full max-w-full overflow-hidden")}>
          {children}
        </div>
      )}
    </div>
  );
}
