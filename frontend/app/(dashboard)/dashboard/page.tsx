"use client";

import { useEffect, useState, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Car,
  ChevronDown,
  ClipboardList,
  Download,
  Fuel,
  Route,
  Shield,
  TrendingUp,
  Wrench,
  Droplets,
  CircleDot,
  FileText,
  PlusCircle,
  CheckCircle2,
  Clock,
  Briefcase,
  MapPin,
  X,
  Sparkles,
  CreditCard,
  FileCheck,
  IdCard,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import { VehicleLogo } from "@/components/vehicles/vehicle-logo";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ExpenseCategoryCard } from "@/components/dashboard/expense-category-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { TaxAlertBanner } from "@/components/dashboard/tax-alert-banner";
import { FuelConsumptionAlertBanner } from "@/components/dashboard/fuel-consumption-alert-banner";
import { VehicleExportDialog } from "@/components/dashboard/vehicle-export-dialog";
import { TripExportDialog } from "@/components/dashboard/trip-export-dialog";
import { ExpenseBreakdownChart } from "@/components/dashboard/expense-breakdown-chart";
import { FuelConsumptionChart } from "@/components/dashboard/fuel-consumption-chart";
import { MonthlyExpensesChart } from "@/components/dashboard/monthly-expenses-chart";
import { TripSummaryChart } from "@/components/dashboard/trip-summary-chart";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatZAR,
  formatConsumption,
  formatConsumptionWithPreference,
  lPer100kmToKmPerLiter,
  EXPENSE_CATEGORY_LABELS,
} from "@/lib/types/database";
import { api, apiFetch, getExpenseCategories } from "@/lib/api/client";
import {
  ExpenseCategory,
  OdometerReadingType,
  getTaxYearReadingWindow,
} from "@/lib/types/database";
import Link from "next/link";
import { useAuth } from "@/lib/contexts/auth-context";
import { UserRole } from "@/lib/types/database";
import { useUserPreferences } from "@/lib/hooks/use-user-preferences";
import { usePermissions } from "@/hooks/usePermissions";

// ─── Icon & Color Mappings for Expense Categories ─────────────────────────────
const categoryIcons: Record<ExpenseCategory, any> = {
  [ExpenseCategory.FUEL_LOG]: Fuel,
  [ExpenseCategory.MECHANIC_SERVICE]: Wrench,
  [ExpenseCategory.MAINTENANCE_TOPUP]: Droplets,
  [ExpenseCategory.TIRES]: CircleDot,
  [ExpenseCategory.CAR_WASH]: Sparkles,
  [ExpenseCategory.INSURANCE_PREMIUM]: Shield,
  [ExpenseCategory.VEHICLE_TRACKING]: MapPin,
  [ExpenseCategory.ETOLL_SANRAL]: CreditCard,
  [ExpenseCategory.LICENSE_RENEWAL]: FileCheck,
  [ExpenseCategory.PERSONAL_LICENSE]: IdCard,
  [ExpenseCategory.ROADWORTHY]: Car,
  [ExpenseCategory.OTHER_FIXED]: MoreHorizontal,
};

const categoryColors: Record<
  ExpenseCategory,
  { iconBgColor: string; iconColor: string }
> = {
  [ExpenseCategory.FUEL_LOG]: {
    iconBgColor: "bg-chart-1/10",
    iconColor: "text-chart-1",
  },
  [ExpenseCategory.CAR_WASH]: {
    iconBgColor: "bg-sky-500/10",
    iconColor: "text-sky-500",
  },
  [ExpenseCategory.MECHANIC_SERVICE]: {
    iconBgColor: "bg-chart-3/10",
    iconColor: "text-chart-3",
  },
  [ExpenseCategory.MAINTENANCE_TOPUP]: {
    iconBgColor: "bg-chart-2/10",
    iconColor: "text-chart-2",
  },
  [ExpenseCategory.TIRES]: {
    iconBgColor: "bg-chart-5/10",
    iconColor: "text-chart-5",
  },
  [ExpenseCategory.INSURANCE_PREMIUM]: {
    iconBgColor: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
  },
  [ExpenseCategory.VEHICLE_TRACKING]: {
    iconBgColor: "bg-violet-500/10",
    iconColor: "text-violet-500",
  },
  [ExpenseCategory.ETOLL_SANRAL]: {
    iconBgColor: "bg-amber-500/10",
    iconColor: "text-amber-500",
  },
  [ExpenseCategory.LICENSE_RENEWAL]: {
    iconBgColor: "bg-teal-500/10",
    iconColor: "text-teal-500",
  },
  [ExpenseCategory.PERSONAL_LICENSE]: {
    iconBgColor: "bg-rose-500/10",
    iconColor: "text-rose-500",
  },
  [ExpenseCategory.ROADWORTHY]: {
    iconBgColor: "bg-indigo-500/10",
    iconColor: "text-indigo-500",
  },
  [ExpenseCategory.OTHER_FIXED]: {
    iconBgColor: "bg-chart-4/10",
    iconColor: "text-chart-4",
  },
};

const categoryDescriptions: Record<ExpenseCategory, string> = {
  [ExpenseCategory.FUEL_LOG]: "Diesel or Petrol purchase",
  [ExpenseCategory.CAR_WASH]: "Car wash, full valet, engine clean",
  [ExpenseCategory.MECHANIC_SERVICE]: "Workshop invoice, windscreen, glass",
  [ExpenseCategory.MAINTENANCE_TOPUP]: "Oil, battery, fuses, brake fluid",
  [ExpenseCategory.TIRES]: "Purchase and rotation tracking",
  [ExpenseCategory.INSURANCE_PREMIUM]: "Vehicle insurance premiums",
  [ExpenseCategory.VEHICLE_TRACKING]: "Vehicle tracking subscriptions",
  [ExpenseCategory.ETOLL_SANRAL]: "SANRAL e-toll payments",
  [ExpenseCategory.LICENSE_RENEWAL]: "Vehicle license disc renewal",
  [ExpenseCategory.PERSONAL_LICENSE]: "Driver's license & ID card renewal",
  [ExpenseCategory.ROADWORTHY]: "Roadworthy certificate testing",
  [ExpenseCategory.OTHER_FIXED]: "Parking, tolls, other vehicle costs",
};

type DashboardShortcutAccent = "compliance" | "export" | "logbook";
type VehicleComplianceStatus =
  | "Needs confirmation"
  | "Opening reading confirmed"
  | "Fully confirmed";
type DashboardSummaryTone =
  | "neutral"
  | "success"
  | "warning"
  | "info"
  | "activity";

type DashboardCollapsedSummaryItem = {
  label: string;
  tone?: DashboardSummaryTone;
};

const DASHBOARD_SHORTCUT_ACCENTS: Record<
  DashboardShortcutAccent,
  {
    card: string;
    icon: string;
    subtitle: string;
    tip: string;
  }
> = {
  compliance: {
    card: "border-rose-200 bg-rose-50/60 dark:border-rose-900/40 dark:bg-rose-950/20",
    icon: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    subtitle: "text-rose-700 dark:text-rose-300",
    tip: "bg-rose-100/80 text-rose-950 dark:bg-rose-900/30 dark:text-rose-100",
  },
  export: {
    card: "border-indigo-200 bg-indigo-50/60 dark:border-indigo-900/40 dark:bg-indigo-950/20",
    icon: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    subtitle: "text-indigo-700 dark:text-indigo-300",
    tip: "bg-indigo-100/80 text-indigo-950 dark:bg-indigo-900/30 dark:text-indigo-100",
  },
  logbook: {
    card: "border-violet-200 bg-violet-50/60 dark:border-violet-900/40 dark:bg-violet-950/20",
    icon: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    subtitle: "text-violet-700 dark:text-violet-300",
    tip: "bg-violet-100/80 text-violet-950 dark:bg-violet-900/30 dark:text-violet-100",
  },
};

const DASHBOARD_SUMMARY_BADGE_STYLES: Record<DashboardSummaryTone, string> = {
  neutral: "border-border/60 bg-background/70 text-muted-foreground",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300",
  info: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-300",
  activity:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/30 dark:text-violet-300",
};

const DASHBOARD_TOGGLE_BUTTON_STYLES: Record<DashboardSummaryTone, string> = {
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

const DASHBOARD_PANEL_CONTAINER_STYLES: Record<DashboardSummaryTone, string> = {
  neutral: "border-border/60 bg-muted/20",
  success:
    "border-emerald-200/70 bg-emerald-50/35 dark:border-emerald-900/40 dark:bg-emerald-950/15",
  warning:
    "border-amber-200/70 bg-amber-50/35 dark:border-amber-900/40 dark:bg-amber-950/15",
  info: "border-indigo-200/70 bg-indigo-50/35 dark:border-indigo-900/40 dark:bg-indigo-950/15",
  activity:
    "border-violet-200/70 bg-violet-50/35 dark:border-violet-900/40 dark:bg-violet-950/15",
};

const DASHBOARD_PANEL_TITLE_STYLES: Record<DashboardSummaryTone, string> = {
  neutral: "text-foreground",
  success: "text-emerald-900 dark:text-emerald-100",
  warning: "text-amber-900 dark:text-amber-100",
  info: "text-indigo-900 dark:text-indigo-100",
  activity: "text-violet-900 dark:text-violet-100",
};

const DASHBOARD_PANEL_SUBTITLE_STYLES: Record<DashboardSummaryTone, string> = {
  neutral: "text-muted-foreground",
  success: "text-emerald-700/90 dark:text-emerald-200/90",
  warning: "text-amber-700/90 dark:text-amber-200/90",
  info: "text-indigo-700/90 dark:text-indigo-200/90",
  activity: "text-violet-700/90 dark:text-violet-200/90",
};

function DashboardCollapsedSummary({
  items,
}: {
  items: DashboardCollapsedSummaryItem[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <Badge
          key={`${item.label}-${index}`}
          variant="outline"
          className={`rounded-full px-2.5 py-1 text-[11px] ${DASHBOARD_SUMMARY_BADGE_STYLES[item.tone ?? "neutral"]}`}
        >
          {item.label}
        </Badge>
      ))}
    </div>
  );
}

function DashboardShortcutCard({
  title,
  subtitle,
  description,
  tip,
  icon: Icon,
  accent,
  cta,
}: {
  title: string;
  subtitle: string;
  description: string;
  tip: string;
  icon: LucideIcon;
  accent: DashboardShortcutAccent;
  cta: ReactNode;
}) {
  const styles = DASHBOARD_SHORTCUT_ACCENTS[accent];

  return (
    <Card className={`border ${styles.card}`}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className={`rounded-lg p-2 ${styles.icon}`}>
            <Icon className="h-5 w-5" />
          </div>
          <span
            className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${styles.subtitle}`}
          >
            {subtitle}
          </span>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        <div className={`rounded-lg p-3 text-xs leading-5 ${styles.tip}`}>
          <p className="mb-1 font-semibold">Helpful hint</p>
          <p>{tip}</p>
        </div>
        {cta}
      </CardContent>
    </Card>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FuelConsumptionSummary {
  averageConsumptionLPer100km?: number | null;
  recentAverageConsumptionLPer100km?: number | null;
  totalFullTankFills?: number;
  totalFuelLogs?: number;
  hint?: string | null;
}

interface Vehicle {
  id: string;
  nickname: string | null;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  color: string | null;
  fuelType: string;
  fuelTypeLabel: string;
  currentOdometer: number;
  compliant: boolean;
  fuelConsumption?: FuelConsumptionSummary | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function vehicleLabel(v: Vehicle): string {
  return v.nickname
    ? `${v.nickname} (${v.registrationNumber})`
    : `${v.year} ${v.make} ${v.model} — ${v.registrationNumber}`;
}

function vehicleShortLabel(v: Vehicle): string {
  return v.nickname ?? `${v.make} ${v.model}`;
}

function getVehicleComplianceStatus(locks?: {
  openingLocked: boolean;
  closingLocked: boolean;
}): VehicleComplianceStatus {
  const openingLocked = locks?.openingLocked ?? false;
  const closingLocked = locks?.closingLocked ?? false;

  if (openingLocked && closingLocked) {
    return "Fully confirmed";
  }

  if (openingLocked) {
    return "Opening reading confirmed";
  }

  return "Needs confirmation";
}

function getComplianceSummaryTone(
  status: VehicleComplianceStatus | null,
): DashboardSummaryTone {
  if (status === "Fully confirmed" || status === "Opening reading confirmed") {
    return "success";
  }

  return "warning";
}

function getDashboardPanelStorageKey({
  panelId,
  organizationMode,
  role,
  userEmail,
}: {
  panelId: string;
  organizationMode?: string;
  role?: UserRole;
  userEmail?: string;
}): string {
  const emailPart = userEmail?.toLowerCase().trim() || "unknown-user";
  const rolePart = role || "unknown-role";
  const modePart = organizationMode || "unknown-mode";

  return `dashboard-panel-state:${panelId}:${emailPart}:${modePart}:${rolePart}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { user, isFleetMode } = useAuth();
  const role = user?.role ?? UserRole.DRIVER;
  const currentUserRole = user?.role;
  const orgId = user?.organizationId;
  const isDriver = role === UserRole.DRIVER;
  const isManager = role === UserRole.MANAGER;
  const isRentalCustomer = role === UserRole.RENTAL_CUSTOMER;
  const showTaxReadinessShortcut =
    !isFleetMode || (!isDriver && !isRentalCustomer);
  const { preferences } = useUserPreferences();

  // Fetch permissions for the organization
  const { data: permissions, isLoading: isLoadingPermissions } = usePermissions(orgId || "");

  // Default permissions for export (matching backend)
  const EXPORT_DEFAULTS = {
    EXPORT_SARS_LOGBOOK: ['ADMIN'],
    EXPORT_TRIPS: ['ADMIN'],
    EXPORT_EMAIL: ['ADMIN']
  }

  // Check if current user has permission to export SARS logbook
  const canExportSARSLogbook = () => {
    // SUPER_ADMIN bypasses everything
    if (currentUserRole === 'SUPER_ADMIN') return true
    
    if (!permissions || !currentUserRole) return false

    // Check for override first
    const exportOverride = permissions.find(
      (p: any) => p.permissionType === 'EXPORT' &&
                  p.permissionKey === 'EXPORT_SARS_LOGBOOK' &&
                  p.userRole === currentUserRole
    )

    // If override exists, use it
    if (exportOverride !== undefined) {
      return exportOverride.isAllowed
    }

    // Fall back to default permissions
    return EXPORT_DEFAULTS.EXPORT_SARS_LOGBOOK.includes(currentUserRole)
  }

  // Check if current user has permission to export trips
  const canExportTrips = () => {
    // SUPER_ADMIN bypasses everything
    if (currentUserRole === 'SUPER_ADMIN') return true
    
    if (!permissions || !currentUserRole) return false

    // Check for override first
    const exportOverride = permissions.find(
      (p: any) => p.permissionType === 'EXPORT' &&
                  p.permissionKey === 'EXPORT_TRIPS' &&
                  p.userRole === currentUserRole
    )

    // If override exists, use it
    if (exportOverride !== undefined) {
      return exportOverride.isAllowed
    }

    // Fall back to default permissions
    return EXPORT_DEFAULTS.EXPORT_TRIPS.includes(currentUserRole)
  }

  // Check if current user has permission to export via email
  const canExportEmail = () => {
    // SUPER_ADMIN bypasses everything
    if (currentUserRole === 'SUPER_ADMIN') return true
    
    if (!permissions || !currentUserRole) return false

    // Check for override first
    const exportOverride = permissions.find(
      (p: any) => p.permissionType === 'EXPORT' &&
                  p.permissionKey === 'EXPORT_EMAIL' &&
                  p.userRole === currentUserRole
    )

    // If override exists, use it
    if (exportOverride !== undefined) {
      return exportOverride.isAllowed
    }

    // Fall back to default permissions
    return EXPORT_DEFAULTS.EXPORT_EMAIL.includes(currentUserRole)
  }

  // Memoize the permission check result to avoid re-evaluation during render
  // SUPER_ADMIN bypasses everything regardless of loading state
  const hasExportSARSLogbookPermission = useMemo(
    () => currentUserRole === 'SUPER_ADMIN' || (!isLoadingPermissions && canExportSARSLogbook()),
    [currentUserRole, isLoadingPermissions, permissions]
  )
  const hasExportTripsPermission = useMemo(
    () => currentUserRole === 'SUPER_ADMIN' || (!isLoadingPermissions && canExportTrips()),
    [currentUserRole, isLoadingPermissions, permissions]
  )
  const hasExportEmailPermission = useMemo(
    () => currentUserRole === 'SUPER_ADMIN' || (!isLoadingPermissions && canExportEmail()),
    [currentUserRole, isLoadingPermissions, permissions]
  )

  // User display name — from localStorage (set during login / register)
  const [firstName, setFirstName] = useState<string | null>(null);
  const [isTaxShortcutsOpen, setIsTaxShortcutsOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isRecentActivityOpen, setIsRecentActivityOpen] = useState(false);
  const [isVehiclesOpen, setIsVehiclesOpen] = useState(false);
  const [isLogbookTripRecordsOpen, setIsLogbookTripRecordsOpen] =
    useState(false);
  const [dashboardPanelPreferencesReady, setDashboardPanelPreferencesReady] =
    useState(false);

  // Gate state — spinner shown until compliance check resolves
  const [checking, setChecking] = useState(true);

  // ── Vehicle Context ────────────────────────────────────────────────────────
  // Single source of truth. Every stat, banner, and link derives from this.
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [monthlyExpenseTotal, setMonthlyExpenseTotal] = useState(0);
  const [businessKmPct, setBusinessKmPct] = useState(0);
  const [fuelConsumption, setFuelConsumption] =
    useState<FuelConsumptionSummary | null>(null);
  const [recentActivities, setRecentActivities] = useState<
    {
      id: string;
      category: ExpenseCategory;
      description: string;
      amount: number;
      vehicleReg: string;
      date: Date;
    }[]
  >([]);

  // Chart data state
  const [expenseBreakdown, setExpenseBreakdown] = useState<
    Array<{ category: string; amount: number; label: string }>
  >([]);
  const [fuelConsumptionData, setFuelConsumptionData] = useState<
    Array<{ date: string; consumption: number }>
  >([]);
  const [monthlyExpensesData, setMonthlyExpensesData] = useState<
    Array<{ month: string; amount: number }>
  >([]);
  const [tripSummaryData, setTripSummaryData] = useState<
    Array<{ month: string; business: number; private: number }>
  >([]);
  const [tripStats, setTripStats] = useState<{
    totalTrips: number;
    businessTrips: number;
    privateTrips: number;
    totalKm: number;
    businessKm: number;
    privateKm: number;
  }>({
    totalTrips: 0,
    businessTrips: 0,
    privateTrips: 0,
    totalKm: 0,
    businessKm: 0,
    privateKm: 0,
  });

  const [vehicleOdometerLocks, setVehicleOdometerLocks] = useState<
    Record<string, { openingLocked: boolean; closingLocked: boolean }>
  >({});

  // Verified odometer readings from compliance records (opening/closing)
  // keyed by vehicleId. Used for the main odometer stats card so that each
  // vehicle shows its own SARS-verified reading instead of a shared value.
  const [verifiedOdometers, setVerifiedOdometers] = useState<
    Record<string, number>
  >({});

  // Available expense categories from backend
  const [availableCategories, setAvailableCategories] = useState<
    ExpenseCategory[]
  >([]);

  const getDashboardStorageKey = (panelId: string) => {
    let storedEmail: string | undefined;

    try {
      const storedProfile = localStorage.getItem("user_profile");
      if (storedProfile) {
        storedEmail = JSON.parse(storedProfile).email ?? undefined;
      }
    } catch {}

    return getDashboardPanelStorageKey({
      panelId,
      organizationMode: user?.organizationMode,
      role: user?.role ?? role,
      userEmail: user?.email ?? storedEmail,
    });
  };

  const getInitialDashboardPanelState = (panelId: string) => {
    const savedPreference = localStorage.getItem(
      getDashboardStorageKey(panelId),
    );

    if (savedPreference === "open" || savedPreference === "closed") {
      return savedPreference === "open";
    }

    localStorage.setItem(getDashboardStorageKey(panelId), "open");
    return true;
  };

  const persistDashboardPanelState = (panelId: string, nextOpen: boolean) => {
    try {
      localStorage.setItem(
        getDashboardStorageKey(panelId),
        nextOpen ? "open" : "closed",
      );
    } catch {}
  };

  const handleTaxShortcutsToggle = () => {
    const nextOpen = !isTaxShortcutsOpen;
    setIsTaxShortcutsOpen(nextOpen);
    persistDashboardPanelState("tax-shortcuts", nextOpen);
  };

  const handleAddExpenseToggle = () => {
    const nextOpen = !isAddExpenseOpen;
    setIsAddExpenseOpen(nextOpen);
    persistDashboardPanelState("add-expense", nextOpen);
  };

  const handleRecentActivityToggle = () => {
    const nextOpen = !isRecentActivityOpen;
    setIsRecentActivityOpen(nextOpen);
    persistDashboardPanelState("recent-activity", nextOpen);
  };

  const handleVehiclesToggle = () => {
    const nextOpen = !isVehiclesOpen;
    setIsVehiclesOpen(nextOpen);
    persistDashboardPanelState("vehicles", nextOpen);
  };

  const handleLogbookTripRecordsToggle = () => {
    const nextOpen = !isLogbookTripRecordsOpen;
    setIsLogbookTripRecordsOpen(nextOpen);
    persistDashboardPanelState("logbook-trip-records", nextOpen);
  };

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem("user_profile");
      if (raw) setFirstName(JSON.parse(raw).firstName ?? null);
    } catch {}

    const token = localStorage.getItem("jwt_token");
    if (!token) {
      router.replace("/login");
      return;
    }

    apiFetch("/vehicles")
      .then((res) => {
        if (res.status === 401) {
          localStorage.clear();
          router.replace("/login");
          return null;
        }
        return res.json() as Promise<Vehicle[]>;
      })
      .then((list) => {
        if (!list) return;

        // ── Compliance gate ────────────────────────────────────────────────
        // Drivers and RENTAL_CUSTOMER should not be redirected to add vehicle - they need to be assigned by admin/manager
        if (list.length === 0 && !isDriver && !isRentalCustomer) {
          router.replace("/onboarding/add-vehicle");
          return;
        }

        const firstCompliant = list.find((v) => v.compliant);
        // TEMP: Disabled compliance redirect - backend not setting compliant flag yet
        // const isFreshFromOdometer = window.location.search.includes('t=');
        // if (!firstCompliant && !isFreshFromOdometer) {
        //   router.replace(`/onboarding/odometer-check/${list[0].id}`);
        //   return;
        // }

        // ── All checks passed — populate real state ────────────────────────
        setVehicles(list);
        // Auto-select the first compliant vehicle, or first vehicle if coming from odometer
        setSelectedVehicle(firstCompliant || list[0]);
        setChecking(false);
      })
      .catch(() => {
        // Network failure — fail open, don't lock the user out
        setChecking(false);
      });
  }, [router]);

  useEffect(() => {
    if (dashboardPanelPreferencesReady || !user?.organizationMode) {
      return;
    }

    try {
      setIsTaxShortcutsOpen(getInitialDashboardPanelState("tax-shortcuts"));
      setIsAddExpenseOpen(getInitialDashboardPanelState("add-expense"));
      setIsRecentActivityOpen(getInitialDashboardPanelState("recent-activity"));
      setIsVehiclesOpen(getInitialDashboardPanelState("vehicles"));
      setIsLogbookTripRecordsOpen(
        getInitialDashboardPanelState("logbook-trip-records"),
      );
    } catch {
      setIsTaxShortcutsOpen(true);
      setIsAddExpenseOpen(true);
      setIsRecentActivityOpen(true);
      setIsVehiclesOpen(true);
      setIsLogbookTripRecordsOpen(true);
    } finally {
      setDashboardPanelPreferencesReady(true);
    }
  }, [
    dashboardPanelPreferencesReady,
    role,
    user?.email,
    user?.organizationMode,
    user?.role,
  ]);

  useEffect(() => {
    if (vehicles.length === 0) {
      setVehicleOdometerLocks({});
      setVerifiedOdometers({});
      return;
    }

    const { currentTaxYear } = getTaxYearReadingWindow();

    api
      .getOptional(`/compliance/odometer?taxYear=${currentTaxYear}`)
      .then(({ data }) => {
        const rows = Array.isArray(data) ? (data as any[]) : [];

        const next: Record<
          string,
          { openingLocked: boolean; closingLocked: boolean }
        > = {};
        const odometerMap: Record<
          string,
          { opening?: number; closing?: number }
        > = {};

        // Initialize all known vehicles to unlocked
        for (const v of vehicles) {
          next[v.id] = { openingLocked: false, closingLocked: false };
        }

        // Fold lock status from compliance DTOs
        for (const ov of rows) {
          const vehicleId = String((ov as any).vehicleId);
          const type = String((ov as any).readingType);
          const locked = Boolean((ov as any).isLocked);
          const valueRaw = (ov as any).odometerValue;
          const value =
            typeof valueRaw === "number"
              ? valueRaw
              : valueRaw != null
                ? Number(valueRaw)
                : undefined;

          if (!next[vehicleId]) {
            next[vehicleId] = { openingLocked: false, closingLocked: false };
          }

          if (!odometerMap[vehicleId]) {
            odometerMap[vehicleId] = {};
          }

          if (!locked) continue;

          if (type === OdometerReadingType.OPENING) {
            next[vehicleId].openingLocked = true;
            if (value !== undefined) {
              odometerMap[vehicleId].opening = value;
            }
          } else if (type === OdometerReadingType.CLOSING) {
            next[vehicleId].closingLocked = true;
            if (value !== undefined) {
              odometerMap[vehicleId].closing = value;
            }
          }
        }

        setVehicleOdometerLocks(next);

        // Derive a single verified odometer per vehicle, preferring locked
        // closing readings, then opening, then falling back to currentOdometer.
        const verified: Record<string, number> = {};
        for (const v of vehicles) {
          const entry = odometerMap[v.id];
          if (entry) {
            const candidate =
              entry.closing ?? entry.opening ?? v.currentOdometer ?? 0;
            verified[v.id] = candidate;
          }
        }
        setVerifiedOdometers(verified);
      })
      .catch((e) => {
        console.warn(
          "[Dashboard] Failed to fetch odometer locks from compliance endpoint",
          e,
        );
        setVehicleOdometerLocks({});
        setVerifiedOdometers({});
      });
  }, [vehicles]);

  // Fetch available expense categories from backend
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await getExpenseCategories();
        const categories = (response as any).data || response;
        if (Array.isArray(categories)) {
          setAvailableCategories(categories as ExpenseCategory[]);
          console.log("[Dashboard] Loaded categories:", categories.length);
        } else {
          console.warn("[Dashboard] Invalid categories data:", categories);
        }
      } catch (err) {
        console.error("[Dashboard] Failed to fetch categories:", err);
        // Fallback to all categories if API fails
        setAvailableCategories(
          Object.values(ExpenseCategory) as ExpenseCategory[],
        );
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!selectedVehicle) {
      setFuelConsumption(null);
      return;
    }
    const vehicleId = selectedVehicle.id;

    const embedded = selectedVehicle.fuelConsumption;
    if (embedded?.averageConsumptionLPer100km != null) {
      setFuelConsumption(embedded);
    } else {
      api
        .getOptional(`/vehicles/${vehicleId}/fuel-stats`)
        .then(({ data }) => {
          setFuelConsumption((data as FuelConsumptionSummary) ?? null);
        })
        .catch(() => setFuelConsumption(embedded ?? null));
    }

    api
      .get("/expenses")
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        const forVehicle = list.filter(
          (e: { vehicle?: { id: string }; vehicleId?: string }) =>
            e.vehicle?.id === vehicleId || e.vehicleId === vehicleId,
        );
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthTotal = forVehicle
          .filter((e: { expenseDate?: string }) =>
            e.expenseDate ? new Date(e.expenseDate) >= monthStart : false,
          )
          .reduce(
            (sum: number, e: { amountZar?: number }) =>
              sum + Number(e.amountZar ?? 0),
            0,
          );
        setMonthlyExpenseTotal(monthTotal);
        setRecentActivities(
          forVehicle.slice(0, 5).map((e: Record<string, unknown>) => ({
            id: String(e.id),
            category: e.category as ExpenseCategory,
            description: String(e.description ?? "Expense"),
            amount: Number(e.amountZar ?? 0),
            vehicleReg: selectedVehicle.registrationNumber,
            date: e.expenseDate ? new Date(String(e.expenseDate)) : new Date(),
          })),
        );

        // Calculate expense breakdown by category
        const categoryTotals: Record<string, number> = {};
        forVehicle.forEach((e: { category?: string; amountZar?: number }) => {
          const cat = e.category || "other";
          categoryTotals[cat] =
            (categoryTotals[cat] || 0) + Number(e.amountZar ?? 0);
        });
        const categoryLabels: Record<string, string> = {
          fuel: "Fuel",
          service: "Service & Repairs",
          carwash: "Car Wash",
          topup: "Top-ups",
          tyres: "Tyres",
          fixed: "Fixed Costs",
          other: "Other",
        };
        setExpenseBreakdown(
          Object.entries(categoryTotals)
            .filter(([, amount]) => amount > 0)
            .map(([category, amount]) => ({
              category,
              amount,
              label: categoryLabels[category] || category,
            }))
            .sort((a, b) => b.amount - a.amount),
        );

        // Calculate monthly expenses for the last 6 months
        const monthlyTotals: Record<string, number> = {};
        const monthNames = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
          monthlyTotals[key] = 0;
        }
        forVehicle.forEach(
          (e: { expenseDate?: string; amountZar?: number }) => {
            if (e.expenseDate) {
              const d = new Date(e.expenseDate);
              const key = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
              if (key in monthlyTotals) {
                monthlyTotals[key] += Number(e.amountZar ?? 0);
              }
            }
          },
        );
        setMonthlyExpensesData(
          Object.entries(monthlyTotals).map(([month, amount]) => ({
            month,
            amount,
          })),
        );
      })
      .catch(console.error);

    console.log("[Dashboard] Fetching trip summary for vehicleId:", vehicleId);
    api
      .getOptional(`/trips/summary?vehicleId=${vehicleId}`)
      .then(({ data }) => {
        console.log("[Dashboard] Trip summary response:", data);
        const s = (data ?? {}) as {
          businessPercentage?: number;
          monthlyBreakdown?: Array<{
            month: string;
            businessKm: number;
            privateKm: number;
          }>;
          totalTrips?: number;
          businessTrips?: number;
          privateTrips?: number;
          totalKm?: number;
          businessKm?: number;
          privateKm?: number;
        };
        setBusinessKmPct(Number(s.businessPercentage ?? 0));

        // Set trip stats
        setTripStats({
          totalTrips: Number(s.totalTrips ?? 0),
          businessTrips: Number(s.businessTrips ?? 0),
          privateTrips: Number(s.privateTrips ?? 0),
          totalKm: Number(s.totalKm ?? 0),
          businessKm: Number(s.businessKm ?? 0),
          privateKm: Number(s.privateKm ?? 0),
        });

        // Set trip summary chart data
        if (s.monthlyBreakdown && s.monthlyBreakdown.length > 0) {
          setTripSummaryData(
            s.monthlyBreakdown.map((m) => ({
              month: m.month,
              business: m.businessKm,
              private: m.privateKm,
            })),
          );
        } else {
          setTripSummaryData([]);
        }
      })
      .catch(() => {
        setBusinessKmPct(0);
        setTripSummaryData([]);
        setTripStats({
          totalTrips: 0,
          businessTrips: 0,
          privateTrips: 0,
          totalKm: 0,
          businessKm: 0,
          privateKm: 0,
        });
      });
  }, [selectedVehicle]);

  // Fetch fuel logs and build chart data (converts unit based on preference)
  useEffect(() => {
    if (!selectedVehicle) {
      setFuelConsumptionData([]);
      return;
    }
    const vehicleId = selectedVehicle.id;

    api
      .getOptional(`/fuel-logs/vehicle/${vehicleId}`)
      .then(({ data }) => {
        const logs = Array.isArray(data) ? data : [];
        const chartData = logs
          .filter((log: any) => log.consumptionLPer100km != null)
          .map((log: any) => {
            const lPer100km = Number(log.consumptionLPer100km);
            const consumption =
              preferences.regional.fuelEfficiencyDisplay === "km_l"
                ? lPer100kmToKmPerLiter(lPer100km)
                : lPer100km;
            return {
              date: new Date(log.createdAt).toLocaleDateString("en-ZA", {
                day: "numeric",
                month: "short",
              }),
              consumption,
            };
          })
          .reverse();
        setFuelConsumptionData(chartData);
      })
      .catch(() => setFuelConsumptionData([]));
  }, [selectedVehicle, preferences.regional.fuelEfficiencyDisplay]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (checking) {
    return <DashboardSkeleton />;
  }

  // ── Derived values — all come from selectedVehicle, no .find() needed ──────
  const vehicleCount = vehicles.length;
  const selectedVehicleLabel = selectedVehicle
    ? vehicleShortLabel(selectedVehicle)
    : "";
  const selectedVehicleComplianceStatus = selectedVehicle
    ? getVehicleComplianceStatus(vehicleOdometerLocks[selectedVehicle.id])
    : null;
  const odometer = selectedVehicle
    ? (selectedVehicle.currentOdometer || 0).toLocaleString("en-ZA") + " km"
    : "—";
  const odometerSubtitle = selectedVehicle ? selectedVehicleLabel : "";
  const taxShortcutsCollapsedSummaryItems: DashboardCollapsedSummaryItem[] =
    selectedVehicle
      ? [
          { label: selectedVehicleLabel },
          {
            label: selectedVehicleComplianceStatus ?? "Needs confirmation",
            tone: getComplianceSummaryTone(selectedVehicleComplianceStatus),
          },
          {
            label: showTaxReadinessShortcut
              ? "SARS + export shortcuts"
              : "Export shortcuts",
            tone: "info",
          },
        ]
      : [];
  const vehiclesCollapsedSummaryItems: DashboardCollapsedSummaryItem[] =
    selectedVehicle
      ? [
          { label: `Viewing ${selectedVehicleLabel}` },
          {
            label: `${vehicleCount} ${vehicleCount === 1 ? "vehicle" : "vehicles"}`,
          },
          {
            label: selectedVehicleComplianceStatus ?? "Needs confirmation",
            tone: getComplianceSummaryTone(selectedVehicleComplianceStatus),
          },
        ]
      : [
          {
            label: `${vehicleCount} ${vehicleCount === 1 ? "vehicle" : "vehicles"}`,
          },
        ];
  const addExpenseCollapsedSummaryItems: DashboardCollapsedSummaryItem[] =
    selectedVehicle
      ? [
          { label: selectedVehicleLabel },
          {
            label: `${availableCategories.length} quick ${availableCategories.length === 1 ? "option" : "options"}`,
            tone: "info",
          },
          monthlyExpenseTotal > 0
            ? {
                label: `${formatZAR(monthlyExpenseTotal)} this month`,
                tone: "activity",
              }
            : {
                label: "No expenses this month yet",
                tone: "warning",
              },
        ]
      : [];
  const logbookTripRecordsCollapsedSummaryItems: DashboardCollapsedSummaryItem[] =
    selectedVehicle
      ? tripStats.totalTrips === 0
        ? [
            { label: selectedVehicleLabel },
            { label: "No trips logged yet", tone: "warning" },
          ]
        : [
            { label: selectedVehicleLabel },
            { label: `${tripStats.totalTrips} trips`, tone: "activity" },
            {
              label: `${tripStats.totalKm.toLocaleString("en-ZA")} km`,
              tone: "activity",
            },
            { label: `${businessKmPct}% business`, tone: "success" },
          ]
      : [];
  const taxToggleTone = getComplianceSummaryTone(
    selectedVehicleComplianceStatus,
  );
  const vehiclesToggleTone = getComplianceSummaryTone(
    selectedVehicleComplianceStatus,
  );
  const analyticsTone: DashboardSummaryTone = "info";
  const addExpenseToggleTone: DashboardSummaryTone = "activity";
  const logbookToggleTone: DashboardSummaryTone =
    tripStats.totalTrips === 0 ? "warning" : "activity";

  // Expense links carry the selected vehicle ID so the add-expense form
  // can pre-populate the vehicle picker
  const expenseBase = selectedVehicle
    ? `/dashboard/expenses/new?vehicleId=${selectedVehicle.id}`
    : "/dashboard/expenses/new";

  // ── Dashboard ──────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto space-y-6 p-4 page-enter">
      {/* SARS Compliance Banner — scoped to selected vehicle - hide for RENTAL_CUSTOMER */}
      {selectedVehicle && !isRentalCustomer && (
        <TaxAlertBanner
          vehicleId={selectedVehicle.id}
          vehicleReg={selectedVehicle.registrationNumber}
        />
      )}

      {/* Fuel Consumption Degradation Alert - hide for RENTAL_CUSTOMER */}
      {selectedVehicle && !isRentalCustomer && (
        <FuelConsumptionAlertBanner vehicleId={selectedVehicle.id} />
      )}

      {/* Fuel Tank Reminder for RENTAL_CUSTOMER */}
      {selectedVehicle && isRentalCustomer && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Fuel className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900">Fuel Tank Reminder</h3>
                <p className="text-sm text-orange-800 mt-1">
                  Please fill up the fuel tank before returning the vehicle to avoid additional fees for fuel difference.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Welcome ───────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-muted-foreground">
          {vehicleCount === 0
            ? isDriver
              ? "No vehicles assigned yet"
              : "No vehicles yet"
            : vehicleCount === 1
              ? isDriver
                ? "Your vehicle"
                : "Managing 1 vehicle"
              : isDriver
                ? "Your vehicle"
                : `Managing ${vehicleCount} vehicles`}
        </p>
        {vehicleCount === 0 && isDriver && (
          <p className="text-sm text-muted-foreground mt-1">
            Contact your admin or manager to assign a vehicle to you
          </p>
        )}
      </div>

      {/* ── Vehicle Context Selector ───────────────────────────────────────── */}
      {vehicleCount > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3 sm:flex-row sm:items-center">
          <Car className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap shrink-0">
            Viewing:
          </span>
          <Select
            value={selectedVehicle?.id ?? ""}
            onValueChange={(id) => {
              const v = vehicles.find((v) => v.id === id);
              if (v) setSelectedVehicle(v);
            }}
          >
            <SelectTrigger className="h-9 w-full flex-1 border-0 bg-transparent shadow-none focus:ring-0 font-medium">
              <SelectValue placeholder="Select a vehicle…" />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map((v) => {
                const locks = vehicleOdometerLocks[v.id];
                const openingLocked = locks?.openingLocked ?? false;
                const closingLocked = locks?.closingLocked ?? false;

                const complianceStatus = getVehicleComplianceStatus({
                  openingLocked,
                  closingLocked,
                });

                return (
                  <SelectItem key={v.id} value={v.id}>
                    <span className="flex items-center gap-2">
                      <VehicleLogo make={v.make} size="sm"  />
                      {vehicleLabel(v)}
                      {complianceStatus === "Fully confirmed" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      ) : complianceStatus === "Opening reading confirmed" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      )}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {selectedVehicle && (
            <VehicleExportDialog
              vehicleId={selectedVehicle.id}
              vehicleLabel={vehicleShortLabel(selectedVehicle)}
              triggerLabel="Export all data"
              triggerClassName="w-full gap-2 sm:w-auto"
            />
          )}
        </div>
      )}

      {selectedVehicle && dashboardPanelPreferencesReady && (
        <div
          className={`space-y-3 rounded-2xl border p-4 ${DASHBOARD_PANEL_CONTAINER_STYLES[taxToggleTone]}`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2
                className={`text-lg font-semibold ${DASHBOARD_PANEL_TITLE_STYLES[taxToggleTone]}`}
              >
                Tax Readiness and exports
              </h2>
              <p
                className={`text-sm ${DASHBOARD_PANEL_SUBTITLE_STYLES[taxToggleTone]}`}
              >
                Quick shortcuts for SARS compliance, complete exports and
                trip-log exports for {vehicleShortLabel(selectedVehicle)}.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className={`w-full justify-center gap-2 self-start sm:w-auto ${DASHBOARD_TOGGLE_BUTTON_STYLES[taxToggleTone]}`}
              onClick={handleTaxShortcutsToggle}
              aria-expanded={isTaxShortcutsOpen}
              aria-controls="dashboard-tax-shortcuts-panel"
            >
              {isTaxShortcutsOpen ? "Hide shortcuts" : "Show shortcuts"}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isTaxShortcutsOpen ? "rotate-180" : ""}`}
              />
            </Button>
          </div>

          {!isTaxShortcutsOpen && (
            <DashboardCollapsedSummary
              items={taxShortcutsCollapsedSummaryItems}
            />
          )}

          {isTaxShortcutsOpen && !isLoadingPermissions && (
            <div
              id="dashboard-tax-shortcuts-panel"
              className={`grid gap-3 ${showTaxReadinessShortcut ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}
            >
              {showTaxReadinessShortcut && (
                <DashboardShortcutCard
                  title="Open Tax Readiness"
                  subtitle="SARS compliance"
                  description="Review the OPENING and CLOSING odometer records for this tax year and confirm them when you are sure they are correct."
                  tip="Check that the opening image and actual odometer number match before you confirm it. Add the closing image and reading at year end to complete your SARS records."
                  icon={Shield}
                  accent="compliance"
                  cta={
                    <Button asChild className="w-full gap-2" size="sm">
                      <Link href="/dashboard/settings?tab=tax-readiness">
                        Open Tax Readiness
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  }
                />
              )}

              <DashboardShortcutCard
                title="Export complete vehicle data"
                subtitle="Full export"
                description="Use this when you want the full vehicle export for the selected tax year, including trips, expenses, fuel logs, summaries and compliance records."
                tip="PDF and HTML are best when you want a readable report with captured invoices. Excel is better when you want to sort and filter the raw data."
                icon={Download}
                accent="export"
                cta={
                  <VehicleExportDialog
                    vehicleId={selectedVehicle.id}
                    vehicleLabel={vehicleShortLabel(selectedVehicle)}
                    triggerLabel="Export all data"
                    triggerClassName="w-full gap-2"
                    disabled={false}
                  />
                }
              />

              {!isRentalCustomer && hasExportTripsPermission && (
                <DashboardShortcutCard
                  title="Export trip records only"
                  subtitle="Trip log export"
                  description="Use this when you only need the logbook trip history for the selected tax year without the rest of the dashboard export."
                  tip="This export is only for trip records. It does not include expenses, fuel logs or the complete vehicle export."
                  icon={ClipboardList}
                  accent="logbook"
                  cta={
                    <TripExportDialog
                      vehicleId={selectedVehicle.id}
                      vehicleLabel={vehicleShortLabel(selectedVehicle)}
                      triggerLabel="Export trip logs"
                      triggerClassName="w-full gap-2"
                    />
                  }
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Stats Grid ────────────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        {/* Fleet size — real count from API */}
        <StatsCard
          title={isDriver ? "Vehicle" : "Vehicles"}
          value={vehicleCount.toString()}
          subtitle={isDriver ? "Your assigned vehicle" : "In your fleet"}
          icon={Car}
          variant="primary"
        />
        {/* Odometer — real value from selected vehicle */}
        <StatsCard
          title="Odometer"
          value={odometer}
          subtitle={odometerSubtitle}
          icon={Route}
          variant="default"
        />
        {/* Expense & KM stats — honest zeros, backend not yet wired */}
        <StatsCard
          title="Monthly Expenses"
          value={formatZAR(monthlyExpenseTotal)}
          subtitle={
            monthlyExpenseTotal > 0 ? "This calendar month" : "No expenses yet"
          }
          icon={TrendingUp}
          variant="default"
        />
        <StatsCard
          title="Avg fuel use"
          value={
            fuelConsumption?.averageConsumptionLPer100km != null
              ? formatConsumptionWithPreference(
                  Number(fuelConsumption.averageConsumptionLPer100km),
                  preferences.regional.fuelEfficiencyDisplay,
                )
              : "—"
          }
          subtitle={
            fuelConsumption?.averageConsumptionLPer100km != null
              ? `Full tank to full tank (${preferences.regional.fuelEfficiencyDisplay === "km_l" ? "km/L" : "L/100km"})`
              : (fuelConsumption?.hint ?? "Log full-tank fills with odometer")
          }
          icon={Fuel}
          variant="default"
        />
        {/* Tax Summary — links to tax summary page */}
        <Link href="/dashboard/tax-summary" className="block">
          <StatsCard
            title="Tax Summary"
            value="View"
            subtitle="Tax year summaries"
            icon={FileText}
            variant="default"
          />
        </Link>
      </div>

      {/* ── Charts Section ─────────────────────────────────────────────────── */}
      {selectedVehicle && (
        <div
          className={`space-y-4 rounded-2xl border p-4 ${DASHBOARD_PANEL_CONTAINER_STYLES[analyticsTone]}`}
        >
          <div>
            <h2
              className={`text-lg font-semibold ${DASHBOARD_PANEL_TITLE_STYLES[analyticsTone]}`}
            >
              Analytics & Insights
            </h2>
            <p
              className={`text-sm ${DASHBOARD_PANEL_SUBTITLE_STYLES[analyticsTone]}`}
            >
              Trends and usage insights for {vehicleShortLabel(selectedVehicle)}
              .
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <ExpenseBreakdownChart
              data={expenseBreakdown}
              title={`Expense Breakdown — ${vehicleShortLabel(selectedVehicle)}`}
            />
            <MonthlyExpensesChart
              data={monthlyExpensesData}
              title="Monthly Expenses (6 months)"
            />
            <FuelConsumptionChart
              data={fuelConsumptionData}
              title="Fuel Consumption Trend"
              unit={
                preferences.regional.fuelEfficiencyDisplay === "km_l"
                  ? "km/L"
                  : "L/100km"
              }
            />
            <TripSummaryChart
              data={tripSummaryData}
              title="Trip Distance — Business vs Private"
            />
          </div>
        </div>
      )}

      {/* ── Vehicle Fleet ─────────────────────────────────────────────────── */}
      {dashboardPanelPreferencesReady && (
        <div
          className={`space-y-3 rounded-2xl border p-4 ${DASHBOARD_PANEL_CONTAINER_STYLES[vehiclesToggleTone]}`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2
                className={`text-lg font-semibold ${DASHBOARD_PANEL_TITLE_STYLES[vehiclesToggleTone]}`}
              >
                {isDriver ? "Your Vehicle" : "Your Vehicles"}
              </h2>
              <p
                className={`text-sm ${DASHBOARD_PANEL_SUBTITLE_STYLES[vehiclesToggleTone]}`}
              >
                Switch the vehicle you are viewing and check each vehicle’s tax
                confirmation status.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start">
              {!isDriver && !isRentalCustomer && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <Link href="/onboarding/add-vehicle">
                    <PlusCircle className="h-4 w-4 mr-1.5" />
                    Add Vehicle
                  </Link>
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`w-full justify-center gap-2 sm:w-auto ${DASHBOARD_TOGGLE_BUTTON_STYLES[vehiclesToggleTone]}`}
                onClick={handleVehiclesToggle}
                aria-expanded={isVehiclesOpen}
                aria-controls="dashboard-vehicles-panel"
              >
                {isVehiclesOpen ? "Hide vehicles" : "Show vehicles"}
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${isVehiclesOpen ? "rotate-180" : ""}`}
                />
              </Button>
            </div>
          </div>

          {!isVehiclesOpen && (
            <DashboardCollapsedSummary items={vehiclesCollapsedSummaryItems} />
          )}

          {isVehiclesOpen && (
            <div id="dashboard-vehicles-panel" className="space-y-2">
              {vehicles.length === 0 && isRentalCustomer ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Car className="h-16 w-16 text-muted-foreground" />
                    <p className="mt-4 text-lg font-medium text-muted-foreground">
                      Vehicle not assigned
                    </p>
                    <p className="text-sm text-muted-foreground text-center max-w-sm">
                      Vehicle has not been assigned; confirm with the representative that helped you that your vehicle gets assigned to you.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                vehicles.map((v) => {
                const isSelected = v.id === selectedVehicle?.id;
                const locks = vehicleOdometerLocks[v.id];
                const openingLocked = locks?.openingLocked ?? false;
                const closingLocked = locks?.closingLocked ?? false;

                const complianceStatus = getVehicleComplianceStatus({
                  openingLocked,
                  closingLocked,
                });

                let badgeClasses = "";
                if (complianceStatus === "Fully confirmed") {
                  badgeClasses =
                    "border-emerald-400 bg-emerald-50 text-emerald-700";
                } else if (complianceStatus === "Opening reading confirmed") {
                  badgeClasses = "border-green-300 bg-green-50 text-green-700";
                } else {
                  badgeClasses = "border-amber-300 bg-amber-50 text-amber-700";
                }
                return (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVehicle(v)}
                    className="w-full text-left"
                    aria-pressed={isSelected}
                  >
                    <Card
                      className={`border transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border/50 hover:border-border hover:bg-muted/30"
                      }`}
                    >
                      <CardContent className="flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center">
                        {/* Vehicle icon */}
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            isSelected ? "bg-primary/20" : "bg-muted"
                          }`}
                        >
                          <Car
                            className={`h-5 w-5 ${
                              isSelected
                                ? "text-primary"
                                : "text-muted-foreground"
                            }`}
                          />
                        </div>

                        {/* Name + details */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate leading-tight">
                            {v.nickname
                              ? v.nickname
                              : `${v.year} ${v.make} ${v.model}`}
                          </p>
                          <p className="text-sm text-muted-foreground truncate mt-0.5">
                            {v.registrationNumber}
                            {" · "}
                            {v.currentOdometer.toLocaleString("en-ZA")} km
                            {" · "}
                            {v.fuelTypeLabel}
                          </p>
                        </div>

                        {/* Compliance badge */}
                        <Link href="/dashboard/settings">
                          <Badge
                            variant="outline"
                            className={`shrink-0 self-start text-xs sm:self-auto cursor-pointer hover:opacity-80 transition-opacity ${badgeClasses}`}
                          >
                            {complianceStatus}
                          </Badge>
                        </Link>
                      </CardContent>
                    </Card>
                  </button>
                );
              })
            )}
            </div>
          )}
        </div>
      )}

      {/* ── Add Expense ───────────────────────────────────────────────────── */}
      {selectedVehicle && dashboardPanelPreferencesReady && (
        <div
          className={`space-y-3 rounded-2xl border p-4 ${DASHBOARD_PANEL_CONTAINER_STYLES[addExpenseToggleTone]}`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2
                className={`text-lg font-semibold ${DASHBOARD_PANEL_TITLE_STYLES[addExpenseToggleTone]}`}
              >
                {isDriver ? "Log Expense" : "Add Expense"}
              </h2>
              <p
                className={`text-sm ${DASHBOARD_PANEL_SUBTITLE_STYLES[addExpenseToggleTone]}`}
              >
                Quick expense shortcuts for {vehicleShortLabel(selectedVehicle)}
                .
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={`w-full justify-center gap-2 self-start sm:w-auto ${DASHBOARD_TOGGLE_BUTTON_STYLES[addExpenseToggleTone]}`}
              onClick={handleAddExpenseToggle}
              aria-expanded={isAddExpenseOpen}
              aria-controls="dashboard-add-expense-panel"
            >
              {isAddExpenseOpen ? "Hide shortcuts" : "Show shortcuts"}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isAddExpenseOpen ? "rotate-180" : ""}`}
              />
            </Button>
          </div>

          {!isAddExpenseOpen && (
            <DashboardCollapsedSummary
              items={addExpenseCollapsedSummaryItems}
            />
          )}

          {isAddExpenseOpen && (
            <div
              id="dashboard-add-expense-panel"
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              {availableCategories.map((category) => {
                const Icon = categoryIcons[category] || FileText;
                const colors = categoryColors[category] || {
                  iconBgColor: "bg-muted",
                  iconColor: "text-muted-foreground",
                };
                const label = EXPENSE_CATEGORY_LABELS[category] || category;
                const description = categoryDescriptions[category] || "";

                // Convert category enum to URL-friendly format (e.g., FUEL_LOG -> fuel)
                const categorySlug = category.toLowerCase().replace(/_/g, "-");

                return (
                  <ExpenseCategoryCard
                    key={category}
                    title={label}
                    description={description}
                    href={`${expenseBase}&category=${categorySlug}`}
                    icon={Icon}
                    iconBgColor={colors.iconBgColor}
                    iconColor={colors.iconColor}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SARS Tax Year Progress ─────────────────────────────────────────── */}
      {!isRentalCustomer && dashboardPanelPreferencesReady && (
        <Card className={DASHBOARD_PANEL_CONTAINER_STYLES[logbookToggleTone]}>
          <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle
                className={`text-base font-semibold ${DASHBOARD_PANEL_TITLE_STYLES[logbookToggleTone]}`}
              >
                Logbook Trip Records
                {selectedVehicle && (
                  <span
                    className={`ml-2 text-xs font-normal ${DASHBOARD_PANEL_SUBTITLE_STYLES[logbookToggleTone]}`}
                  >
                    — {vehicleShortLabel(selectedVehicle)}
                  </span>
                )}
              </CardTitle>
              <p
                className={`mt-1 text-sm ${DASHBOARD_PANEL_SUBTITLE_STYLES[logbookToggleTone]}`}
              >
                Review the current trip totals and business-use ratio for the
                selected vehicle.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={`w-full justify-center gap-2 self-start sm:w-auto ${DASHBOARD_TOGGLE_BUTTON_STYLES[logbookToggleTone]}`}
              onClick={handleLogbookTripRecordsToggle}
              aria-expanded={isLogbookTripRecordsOpen}
              aria-controls="dashboard-logbook-trip-records-panel"
            >
              {isLogbookTripRecordsOpen ? "Hide records" : "Show records"}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isLogbookTripRecordsOpen ? "rotate-180" : ""}`}
              />
            </Button>
          </CardHeader>
          <CardContent>
            {!isLogbookTripRecordsOpen ? (
              <div id="dashboard-logbook-trip-records-panel">
                <DashboardCollapsedSummary
                  items={logbookTripRecordsCollapsedSummaryItems}
                />
              </div>
            ) : tripStats.totalTrips === 0 ? (
              <div
                id="dashboard-logbook-trip-records-panel"
                className="py-4 text-center space-y-2"
              >
                <Route className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  No trips logged yet.
                </p>
                <p className="text-xs text-muted-foreground">
                  Log business and private trips to calculate your
                  SARS-deductible percentage for{" "}
                  {selectedVehicle
                    ? vehicleShortLabel(selectedVehicle)
                    : "this vehicle"}
                  .
                </p>
                <Button asChild variant="outline" size="sm" className="mt-2">
                  <Link
                    href={
                      selectedVehicle
                        ? `/dashboard/logbook/new?vehicleId=${selectedVehicle.id}`
                        : "/dashboard/logbook/new"
                    }
                  >
                    Log Your First Trip
                  </Link>
                </Button>
              </div>
            ) : (
              <div
                id="dashboard-logbook-trip-records-panel"
                className="space-y-4"
              >
                {/* Stats Grid */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="text-center p-3 bg-primary/10 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {tripStats.businessTrips}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Business
                    </div>
                  </div>
                  <div className="text-center p-3 bg-amber-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-amber-600">
                      {tripStats.privateTrips}
                    </div>
                    <div className="text-xs text-muted-foreground">Private</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">
                      {tripStats.totalTrips}
                    </div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                </div>

                {/* KM Stats */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Business KM</span>
                    <span className="font-medium">
                      {tripStats.businessKm.toLocaleString()} km
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Private KM</span>
                    <span className="font-medium">
                      {tripStats.privateKm.toLocaleString()} km
                    </span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-muted-foreground">Total KM</span>
                    <span className="font-semibold">
                      {tripStats.totalKm.toLocaleString()} km
                    </span>
                  </div>
                </div>

                {/* Business Use Percentage */}
                <div className="pt-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Business Use Ratio</span>
                    <span className="font-bold text-primary">
                      {businessKmPct}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${businessKmPct}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full flex-1"
                  >
                    <Link href="/dashboard/logbook">View Logbook</Link>
                  </Button>
                  <Button asChild size="sm" className="w-full flex-1">
                    <Link
                      href={
                        selectedVehicle
                          ? `/dashboard/logbook/new?vehicleId=${selectedVehicle.id}`
                          : "/dashboard/logbook/new"
                      }
                    >
                      Add Trip
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Recent Activity ───────────────────────────────────────────────── */}
      {dashboardPanelPreferencesReady && (
        <RecentActivity
          activities={recentActivities}
          isOpen={isRecentActivityOpen}
          onToggle={handleRecentActivityToggle}
        />
      )}
    </div>
  );
}
