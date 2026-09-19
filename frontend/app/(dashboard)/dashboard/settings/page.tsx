"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaxReadinessAudit } from "@/components/dashboard/tax-readiness-audit";
import { VehicleExportDialog } from "@/components/dashboard/vehicle-export-dialog";
import ReportExportManager from "@/components/settings/ReportExportManager";
import {
  AppUsageGuideDialog,
  getGuideSeenStorageKey,
} from "@/components/navigation/app-usage-guide-dialog";
import { DashboardCollapsiblePanel } from "@/components/dashboard/dashboard-collapsible-panel";
import { PermissionSection } from "@/components/settings/PermissionSection";
import {
  User,
  Users,
  Building2,
  Bell,
  Moon,
  Sun,
  LogOut,
  FileText,
  ChevronRight,
  Camera,
  Settings as SettingsIcon,
  Shield,
  Database,
  CheckCircle2,
  XCircle,
  Loader2,
  RotateCcw,
  Lock,
  Car,
  BookOpen,
  FileDown,
  Scale,
  ReceiptText,
  MapPin,
  ClipboardList,
  Download,
  KeyRound,
  Crown,
  Check,
  SlidersHorizontal,
} from "lucide-react";
import { VehicleLogo } from "@/components/vehicles/vehicle-logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/contexts/auth-context";
import { useUserPreferences } from "@/lib/hooks/use-user-preferences";
import { api } from "@/lib/api/client";
import { getSATaxYear, OrganizationMode } from "@/lib/types/database";
import { toast } from "sonner";
import { usePermissions, useResetPermissions } from "@/hooks/usePermissions";

interface VehicleOption {
  id: string;
  nickname: string | null;
  registrationNumber: string;
  make: string;
  model: string;
}

function SettingsContent() {
  const { user, logout, refreshUser, isLoading: authLoading, isFleetMode } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const {
    preferences,
    loaded: prefsLoaded,
    setNotifications,
    setRegional,
  } = useUserPreferences();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [exportVehicleId, setExportVehicleId] = useState<string>("");
  const [dbStatus, setDbStatus] = useState<"loading" | "up" | "down">(
    "loading",
  );
  
  // Fleet feature visibility settings
  const [conditionReportEnabled, setConditionReportEnabled] = useState(true);
  const [odometerConfirmationEnabled, setOdometerConfirmationEnabled] = useState(true);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);

  // Permissions state (SUPER_ADMIN only) - using React Query
  // Only fetch permissions for fleet mode or SOLO owners (not assistants)
  const shouldFetchPermissions = isFleetMode || (user?.organizationMode === OrganizationMode.SOLO && !user?.assistantRole);
  const { data: permissionOverrides = [], isLoading: isLoadingPermissions } = usePermissions(shouldFetchPermissions ? (user?.organizationId || "") : "");
  const resetPermissions = useResetPermissions();
  const [openSection, setOpenSection] = useState<string>("EXPENSE_CATEGORY");
  const [saved, setSaved] = useState(false);
  const currentUserRole = user?.role;
  const assistantRole = user?.assistantRole;
  
  // Effective role for permission checks (use assistantRole for ASSISTANT users)
  const effectiveRole = currentUserRole === 'ASSISTANT' && assistantRole ? assistantRole : currentUserRole;

  // Track component mount/unmount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Default permissions for tax audit (matching backend)
  const TAX_AUDIT_DEFAULTS = {
    ADD_OPENING_READING: ['SOLO', 'ASSISTANT_HIGH', 'MANAGER', 'ADMIN'],
    ADD_CLOSING_READING: ['SOLO', 'ASSISTANT_HIGH', 'MANAGER', 'ADMIN'],
    EDIT_READINGS: ['SOLO', 'ASSISTANT_HIGH', 'ADMIN'],
    DELETE_READINGS: ['SOLO', 'ASSISTANT_HIGH', 'ADMIN'],
    VIEW_TAX_REPORTS: ['SOLO', 'ASSISTANT_HIGH', 'MANAGER', 'ADMIN']
  }

  // Check if current user has permission to view tax audit
  const canViewTaxAudit = () => {
    // SUPER_ADMIN bypasses everything
    if (effectiveRole === 'SUPER_ADMIN') return true
    
    if (!permissionOverrides || !effectiveRole) return false

    // Check for overrides first
    const addOpeningOverride = permissionOverrides.find(
      (p: any) => p.permissionType === 'TAX_AUDIT' &&
                  p.permissionKey === 'ADD_OPENING_READING' &&
                  p.userRole === effectiveRole
    )
    const addClosingOverride = permissionOverrides.find(
      (p: any) => p.permissionType === 'TAX_AUDIT' &&
                  p.permissionKey === 'ADD_CLOSING_READING' &&
                  p.userRole === effectiveRole
    )
    const editOverride = permissionOverrides.find(
      (p: any) => p.permissionType === 'TAX_AUDIT' &&
                  p.permissionKey === 'EDIT_READINGS' &&
                  p.userRole === effectiveRole
    )
    const deleteOverride = permissionOverrides.find(
      (p: any) => p.permissionType === 'TAX_AUDIT' &&
                  p.permissionKey === 'DELETE_READINGS' &&
                  p.userRole === effectiveRole
    )
    const viewOverride = permissionOverrides.find(
      (p: any) => p.permissionType === 'TAX_AUDIT' &&
                  p.permissionKey === 'VIEW_TAX_REPORTS' &&
                  p.userRole === effectiveRole
    )

    // If any override exists and is true, allow access
    if (addOpeningOverride?.isAllowed) return true
    if (addClosingOverride?.isAllowed) return true
    if (editOverride?.isAllowed) return true
    if (deleteOverride?.isAllowed) return true
    if (viewOverride?.isAllowed) return true

    // If any override exists and is false, deny access
    if (addOpeningOverride !== undefined && !addOpeningOverride.isAllowed) return false
    if (addClosingOverride !== undefined && !addClosingOverride.isAllowed) return false
    if (editOverride !== undefined && !editOverride.isAllowed) return false
    if (deleteOverride !== undefined && !deleteOverride.isAllowed) return false
    if (viewOverride !== undefined && !viewOverride.isAllowed) return false

    // Fall back to default permissions
    return TAX_AUDIT_DEFAULTS.ADD_OPENING_READING.includes(effectiveRole) ||
           TAX_AUDIT_DEFAULTS.ADD_CLOSING_READING.includes(effectiveRole) ||
           TAX_AUDIT_DEFAULTS.EDIT_READINGS.includes(effectiveRole) ||
           TAX_AUDIT_DEFAULTS.DELETE_READINGS.includes(effectiveRole) ||
           TAX_AUDIT_DEFAULTS.VIEW_TAX_REPORTS.includes(effectiveRole)
  }

  const isDark = resolvedTheme === "dark";
  const isFleet = isFleetMode;
  const isAdminOrManager = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN" || user?.role === "MANAGER";
  const isDriver = user?.role === "DRIVER";
  const isRentalCustomer = user?.role === "RENTAL_CUSTOMER";

  const roles = isFleet ? [
    { name: 'DRIVER', tone: 'blue', icon: User },
    { name: 'MANAGER', tone: 'violet', icon: Users },
    { name: 'ADMIN', tone: 'amber', icon: Shield },
    { name: 'RENTAL_CUSTOMER', tone: 'green', icon: KeyRound },
  ] as const : [
    { name: 'ASSISTANT_LOW', tone: 'purple', icon: User },
    { name: 'ASSISTANT_HIGH', tone: 'orange', icon: Users },
  ] as const;

  // Convert permission overrides array to matrix format for PermissionSection
  const permissionMatrix = permissionOverrides.reduce((acc: Record<string, Record<string, Record<string, boolean>>>, p: any) => {
    if (!acc[p.permissionType]) acc[p.permissionType] = {};
    if (!acc[p.permissionType][p.permissionKey]) acc[p.permissionType][p.permissionKey] = {};
    acc[p.permissionType][p.permissionKey][p.userRole] = p.isAllowed;
    return acc;
  }, {} as Record<string, Record<string, Record<string, boolean>>>);

  const requestedTab = searchParams.get("tab");
  const defaultTab = requestedTab === "tax-readiness"
      ? "tax-readiness"
      : "general";
  const taxYear = getSATaxYear();
  const displayName = user
    ? `${user.firstName} ${user.lastName ?? ""}`.trim()
    : "—";

  const generalSettingsSummaryItems = [
    {
      label: displayName,
      tone: "activity" as const,
    },
    {
      label: user?.role ?? "No role",
      tone: "info" as const,
    },
    {
      label: isFleet ? "Fleet account" : "Individual account",
    },
    {
      label:
        isRentalCustomer
          ? (vehicles.length > 0
              ? `${vehicles.length} vehicle${vehicles.length === 1 ? "" : "s"} assigned`
              : "Vehicle not assigned")
          : (vehicles.length > 0
              ? `${vehicles.length} vehicle${vehicles.length === 1 ? "" : "s"} ready for export`
              : "No vehicles to export"),
      tone: vehicles.length > 0 ? ("success" as const) : ("neutral" as const),
    },
  ];

  const taxReadinessSummaryItems = [
    {
      label: `Tax year ${taxYear} / ${taxYear + 1}`,
      tone: "warning" as const,
    },
    {
      label:
        vehicles.length > 0
          ? `${vehicles.length} vehicle${vehicles.length === 1 ? "" : "s"}`
          : "No vehicles yet",
    },
    {
      label: "Opening and closing odometer review",
      tone: "info" as const,
    },
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  // Temporarily disable refreshUser to prevent redirect
  // useEffect(() => {
  //   console.log('[Settings] Calling refreshUser...');
  //   refreshUser().catch((error) => {
  //     console.error('[Settings] refreshUser failed:', error);
  //   });
  // }, [refreshUser]);

  useEffect(() => {
    api
      .get("/health")
      .then(() => setDbStatus("up"))
      .catch(() => setDbStatus("down"));
  }, []);

  useEffect(() => {
    api
      .get("/vehicles")
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        setVehicles(
          list.map((v: Record<string, unknown>) => ({
            id: String(v.id),
            nickname: v.nickname as string | null,
            registrationNumber: String(v.registrationNumber ?? ""),
            make: String(v.make ?? ""),
            model: String(v.model ?? ""),
          })),
        );
        if (list.length > 0) {
          setExportVehicleId(String(list[0].id));
        }
      })
      .catch(() => setVehicles([]));
  }, []);

  // Fetch organization visibility settings (for SUPER_ADMIN and ADMIN only)
  useEffect(() => {
    if (user?.role === "SUPER_ADMIN" || user?.role === "ADMIN") {
      api
        .get("/organization")
        .then(({ data }) => {
          if (data) {
            setConditionReportEnabled(data.conditionReportEnabled ?? true);
            setOdometerConfirmationEnabled(data.odometerConfirmationEnabled ?? true);
          }
        })
        .catch(() => {
          // Default to true if fetch fails
          setConditionReportEnabled(true);
          setOdometerConfirmationEnabled(true);
        });
    }
  }, [user]);


  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      setIsLoggingOut(false);
    }
  };

  const handleThemeToggle = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
    toast.success(checked ? "Dark mode enabled" : "Light mode enabled");
  };

  const handleVisibilityToggle = async (setting: "conditionReport" | "odometerConfirmation", value: boolean) => {
    setIsUpdatingVisibility(true);
    try {
      await api.put("/organization", {
        conditionReportEnabled: setting === "conditionReport" ? value : conditionReportEnabled,
        odometerConfirmationEnabled: setting === "odometerConfirmation" ? value : odometerConfirmationEnabled,
      });
      
      if (setting === "conditionReport") {
        setConditionReportEnabled(value);
      } else {
        setOdometerConfirmationEnabled(value);
      }
      
      toast.success(`${setting === "conditionReport" ? "Condition Report" : "Odometer Confirmation"} ${value ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Failed to update visibility settings:", error);
      toast.error("Failed to update settings. Please try again.");
    } finally {
      setIsUpdatingVisibility(false);
    }
  };

  const handleResetPermissions = async () => {
    if (!confirm("Are you sure you want to reset all permissions to their default values?")) {
      return;
    }
    if (!user?.organizationId) {
      toast.error("Organization ID not found");
      return;
    }
    try {
      await resetPermissions.mutateAsync(user.organizationId);
      toast.success("All permissions reset to defaults");
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (error) {
      console.error("Failed to reset permissions:", error);
      toast.error("Failed to reset permissions. Please try again.");
    }
  };

  const exportVehicleLabel = () => {
    const v = vehicles.find((x) => x.id === exportVehicleId);
    if (!v) return "Vehicle";
    return v.nickname ?? `${v.make} ${v.model}`;
  };

  const handleResetGuidePopup = () => {
    if (!user?.organizationMode) {
      toast.error("Could not reset guide pop-up");
      return;
    }

    try {
      const key = getGuideSeenStorageKey({
        organizationMode: user.organizationMode,
        role: user.role,
        userEmail: user.email,
      });
      localStorage.removeItem(key);
      toast.success("Guide pop-up reset. It will open again on Home.");
    } catch {
      toast.error("Could not reset guide pop-up");
    }
  };

  if (authLoading || !mounted || (shouldFetchPermissions && isLoadingPermissions)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-full space-y-6 p-4 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account and preferences
          </p>
        </div>
      </div>

      {!isRentalCustomer && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 sm:px-4 sm:py-3 w-full max-w-full overflow-hidden">
            <p className="text-xs sm:text-sm font-medium">
              Important for SARS tax completion
            </p>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Go to{" "}
              <Link href="/dashboard/settings?tab=tax-readiness" className="font-medium text-foreground hover:underline">
                Tax Readiness
              </Link>{" "}
              and make sure your{" "}
              <span className="font-medium text-foreground">
                OPENING Reading
              </span>{" "}
              has both the correct odometer image and the actual odometer
              reading. Once you are sure it is correct, lock it so it moves
              from pending to a confirmed opening record. Then, at the end
              of the tax year, add the{" "}
              <span className="font-medium text-foreground">
                CLOSING Reading
              </span>{" "}
              odometer reading and image to complete your SARS tax records.
            </p>
          </div>
        )}

      <DashboardCollapsiblePanel
        panelId="settings-general"
        title="General settings"
        description="Manage your account, preferences, exports and support options."
        tone="info"
        openLabel="Hide settings"
        closedLabel="Show settings"
        summaryItems={generalSettingsSummaryItems}
        contentClassName="space-y-6"
      >
        {/* Profile — live from backend via useAuth */}
        <Link href="/dashboard/profile">
          <Card className="cursor-pointer transition-colors hover:border-primary/50 w-full max-w-full overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-3 sm:gap-4 w-full min-w-0">
                <div className="relative h-12 w-12 sm:h-16 sm:w-16 shrink-0">
                  <div className="h-full w-full rounded-xl bg-primary/20 flex items-center justify-center overflow-hidden">
                    {user?.profilePhotoUrl ? (
                      <img
                        src={user.profilePhotoUrl}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-lg sm:text-xl font-bold text-primary">
                        {user?.firstName?.[0] ?? <User className="h-6 w-6 sm:h-8 sm:w-8" />}
                      </span>
                    )}
                  </div>
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <h2 className="truncate text-base sm:text-lg font-semibold">
                    {displayName}
                  </h2>
                  <p className="truncate text-xs sm:text-sm text-muted-foreground">
                    {user?.email ?? ""}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {user?.role ?? "—"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs shrink-0",
                        isFleet
                          ? "border-primary/50 text-primary"
                          : "border-accent/50 text-accent",
                      )}
                    >
                      {isFleet ? "Fleet Account" : "Individual Account"}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 sm:h-9 gap-2 px-2 sm:px-3 text-xs font-medium shrink-0"
                >
                  <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="hidden sm:inline">Change Password</span>
                  <span className="sm:hidden">Password</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* System status — PostgreSQL via Spring Boot health */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Database className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <StatusRow
              label="API Server"
              ok={dbStatus === "up"}
              loading={dbStatus === "loading"}
              detail="Spring Boot on port 8080"
            />
            <StatusRow
              label="Database (PostgreSQL)"
              ok={dbStatus === "up"}
              loading={dbStatus === "loading"}
              detail={
                dbStatus === "up"
                  ? "Connected via backend"
                  : "Cannot reach API — start backend & PostgreSQL"
              }
            />
          </CardContent>
        </Card>

        {/* Account type */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              Account Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <p className="font-medium text-sm sm:text-base">
				  {isFleet ? "Fleet Management" : "Individual"}
                </p>
                <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
                  {isFleet
                    ? "Full fleet dashboard with team and vehicle management"
                    : "Personal vehicle expense tracking"}
                </p>
              </div>
              <Badge
                className={cn(
                  "shrink-0 text-xs",
                  isFleet
                    ? "border-primary/30 bg-primary/20 text-primary"
                    : "border-accent/30 bg-accent/20 text-accent",
                )}
                variant="outline"
              >
                {isFleet ? "FLEET" : "INDIVIDUAL"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {isFleet && isAdminOrManager && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-5 w-5" />
                Organisation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">
                    {user?.organizationName ?? "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Fleet account
                  </p>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <Link href="/dashboard/organization">Manage</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-5 w-5 text-muted-foreground" />
              Help Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium">Open the guide again</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Read the full step-by-step guide again whenever you need
                a refresher.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <AppUsageGuideDialog
                organizationMode={user?.organizationMode}
                role={user?.role}
                organizationName={user?.organizationName}
                userEmail={user?.email}
                triggerLabel="Show guide again"
                triggerVariant="outline"
                triggerSize="sm"
                triggerClassName="w-full gap-2 sm:w-auto"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-2 sm:w-auto"
                onClick={handleResetGuidePopup}
              >
                <RotateCcw className="h-4 w-4" />
                Reset guide pop-up
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Resetting the pop-up means the guide will open
              automatically again next time you land on Home.
            </p>
          </CardContent>
        </Card>

        {/* Appearance — wired to next-themes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Appearance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {isDark ? (
                  <Moon className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Sun className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <Label htmlFor="dark-mode" className="font-medium">
                    Dark Mode
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {theme === "system"
                      ? "Following system preference"
                      : isDark
                        ? "High contrast for outdoor visibility"
                        : "Light theme"}
                  </p>
                </div>
              </div>
              <Switch
                id="dark-mode"
                checked={isDark}
                onCheckedChange={handleThemeToggle}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications — persisted locally */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
            <CardContent className="space-y-4">
              {prefsLoaded && (
                <>
                  <NotificationToggle
                    id="service-reminders"
                    label="Service Reminders"
                    description="Get notified before service is due"
                    checked={preferences.notifications.serviceReminders}
                    onCheckedChange={(v) => {
                      setNotifications({ serviceReminders: v });
                      toast.success("Preference saved");
                    }}
                  />
                  <Separator />
                  <NotificationToggle
                    id="fuel-efficiency"
                    label="Fuel Efficiency Alerts"
                    description="Alert when km/L drops significantly"
                    checked={preferences.notifications.fuelEfficiency}
                    onCheckedChange={(v) => {
                      setNotifications({ fuelEfficiency: v });
                      toast.success("Preference saved");
                    }}
                  />
                  <Separator />
                  <NotificationToggle
                    id="tax-deadlines"
                    label="SARS Tax Deadlines"
                    description="Reminders for tax submission dates"
                    checked={preferences.notifications.taxDeadlines}
                    onCheckedChange={(v) => {
                      setNotifications({ taxDeadlines: v });
                      toast.success("Preference saved");
                    }}
                  />
                </>
              )}
            </CardContent>
          </Card>

        {/* Feature Visibility — SUPER_ADMIN and ADMIN only */}
        {(user?.role === "SUPER_ADMIN" || user?.role === "ADMIN") && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-5 w-5" />
                Feature Visibility
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="condition-report-toggle" className="font-medium">
                      Condition Report
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Show/hide Condition Report button (available for both Fleet and Solo accounts)
                    </p>
                  </div>
                </div>
                <Switch
                  id="condition-report-toggle"
                  checked={conditionReportEnabled}
                  onCheckedChange={(checked) => handleVisibilityToggle("conditionReport", checked)}
                  disabled={isUpdatingVisibility}
                />
              </div>
              {isFleet && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <Label htmlFor="odometer-toggle" className="font-medium">
                          Odometer Confirmation
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Show/hide Odometer Confirmation button (Fleet accounts only)
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="odometer-toggle"
                      checked={odometerConfirmationEnabled}
                      onCheckedChange={(checked) => handleVisibilityToggle("odometerConfirmation", checked)}
                      disabled={isUpdatingVisibility}
                    />
                  </div>
                </>
              )}
              <p className="text-xs text-muted-foreground">
                When disabled, these buttons will be hidden from all users including admins.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Permissions — SUPER_ADMIN and Organization Owner only */}
        {(user?.role === "SUPER_ADMIN" || user?.id === user?.organizationOwnerId) && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    <SlidersHorizontal size={14} />
                    Organization settings
                  </div>
                  <CardTitle className="flex items-center gap-2 text-3xl font-bold tracking-tight">
                    <Scale className="h-8 w-8" />
                    Permissions
                  </CardTitle>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                    Manage what each role can access and do in your organization.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetPermissions}
                  className="gap-2 shrink-0"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset to Defaults
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {saved && (
                <div role="status" className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                  <Check size={16} />
                  Permissions reset to defaults.
                </div>
              )}
              {isLoadingPermissions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-border bg-card shadow-sm">
                    {/* Role header */}
                    <div className="hidden items-center border-b border-border px-5 py-4 lg:flex">
                      <div className="min-w-0 flex-1 pr-4 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        Permission
                      </div>
                      <div className="grid w-[600px] shrink-0 grid-cols-4 gap-2">
                        {roles.map((role) => (
                          <div key={role.name} className="flex min-w-0 flex-col items-center gap-2 px-0.5 text-center">
                            <div className={`rounded-full p-1.5 ${
                              role.tone === 'blue' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              role.tone === 'violet' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' :
                              role.tone === 'amber' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                              'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            }`}>
                              <role.icon size={16} strokeWidth={2.2} className="text-current" />
                            </div>
                            <span className="w-full break-words text-[9px] font-bold leading-3 tracking-[0.04em] text-muted-foreground">
                              {role.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Expense Categories */}
                    <PermissionSection
                      title="Expense Categories"
                      description="Control who can view and manage expense categories."
                      icon={ReceiptText}
                      type="EXPENSE_CATEGORY"
                      keys={[
                        { key: "FUEL_LOG", label: "Fuel Log" },
                        { key: "MECHANIC_SERVICE", label: "Mechanic Service" },
                        { key: "MAINTENANCE_TOPUP", label: "Maintenance Top-up" },
                        { key: "TIRES", label: "Tires" },
                        { key: "CAR_WASH", label: "Car Wash" },
                        { key: "INSURANCE_PREMIUM", label: "Insurance Premium" },
                        { key: "VEHICLE_TRACKING", label: "Vehicle Tracking" },
                        { key: "ETOLL_SANRAL", label: "eToll Sanral" },
                        { key: "LICENSE_RENEWAL", label: "License Renewal" },
                        { key: "PERSONAL_LICENSE", label: "Personal License" },
                        { key: "ROADWORTHY", label: "Roadworthy" },
                        { key: "OTHER_FIXED", label: "Other Fixed" },
                        { key: "PARKING", label: "Parking" },
                      ]}
                      roles={roles.filter(r => isFleet 
                        ? ['DRIVER', 'MANAGER', 'ADMIN', 'RENTAL_CUSTOMER'].includes(r.name)
                        : ['ASSISTANT_LOW', 'ASSISTANT_HIGH'].includes(r.name)
                      )}
                      overrides={permissionMatrix['EXPENSE_CATEGORY'] ?? {}}
                      orgId={user?.organizationId || ""}
                      isOpen={openSection === "EXPENSE_CATEGORY"}
                      onToggle={() => setOpenSection(openSection === "EXPENSE_CATEGORY" ? "" : "EXPENSE_CATEGORY")}
                      isIndividualMode={!isFleet}
                    />

                    {/* Vehicle Assignments - Fleet only */}
                    {isFleet && (
                      <PermissionSection
                        title="Vehicle Assignments"
                        description="Control who can assign and reclaim vehicles."
                        icon={MapPin}
                        type="VEHICLE_ASSIGNMENT"
                        keys={[
                          { key: "ASSIGN_TO_DRIVER", label: "Assign to Driver" },
                          { key: "ASSIGN_TO_MANAGER", label: "Assign to Manager" },
                          { key: "RECLAIM_VEHICLE", label: "Reclaim Vehicle" },
                          { key: "VIEW_ASSIGNMENTS", label: "View Assignments" },
                        ]}
                        roles={roles.filter(r => ['MANAGER', 'ADMIN'].includes(r.name))}
                        overrides={permissionMatrix['VEHICLE_ASSIGNMENT'] ?? {}}
                        orgId={user?.organizationId || ""}
                        isOpen={openSection === "VEHICLE_ASSIGNMENT"}
                        onToggle={() => setOpenSection(openSection === "VEHICLE_ASSIGNMENT" ? "" : "VEHICLE_ASSIGNMENT")}
                      />
                    )}

                    {/* Logbook */}
                    <PermissionSection
                      title="Logbook"
                      description="Control who can view, edit, and delete logbook entries."
                      icon={BookOpen}
                      type="LOGBOOK"
                      keys={[
                        { key: "VIEW_OWN_LOGBOOK", label: "View Own Logbook" },
                        { key: "VIEW_ALL_LOGBOOKS", label: "View All Logbooks" },
                        { key: "EDIT_OWN_ENTRIES", label: "Edit Own Entries" },
                        { key: "EDIT_ALL_ENTRIES", label: "Edit All Entries" },
                        { key: "DELETE_OWN_ENTRIES", label: "Delete Own Entries" },
                        { key: "DELETE_ALL_ENTRIES", label: "Delete All Entries" },
                      ]}
                      roles={roles.filter(r => isFleet
                        ? ['DRIVER', 'MANAGER', 'ADMIN', 'RENTAL_CUSTOMER'].includes(r.name)
                        : ['ASSISTANT_LOW', 'ASSISTANT_HIGH'].includes(r.name)
                      )}
                      overrides={permissionMatrix['LOGBOOK'] ?? {}}
                      orgId={user?.organizationId || ""}
                      isOpen={openSection === "LOGBOOK"}
                      onToggle={() => setOpenSection(openSection === "LOGBOOK" ? "" : "LOGBOOK")}
                      isIndividualMode={!isFleet}
                    />

                    {/* Tax Audit */}
                    {!isLoadingPermissions && canViewTaxAudit() && (
                      <PermissionSection
                        title="Tax Audit"
                        description="Control who can manage tax audit readings and reports."
                        icon={ClipboardList}
                        type="TAX_AUDIT"
                        keys={[
                          { key: "ADD_OPENING_READING", label: "Add Opening Reading" },
                          { key: "ADD_CLOSING_READING", label: "Add Closing Reading" },
                          { key: "EDIT_READINGS", label: "Edit Readings" },
                          { key: "DELETE_READINGS", label: "Delete Readings" },
                          { key: "VIEW_TAX_REPORTS", label: "View Tax Reports" },
                        ]}
                        roles={roles.filter(r => isFleet
                          ? ['MANAGER', 'ADMIN'].includes(r.name)
                          : ['ASSISTANT_LOW', 'ASSISTANT_HIGH'].includes(r.name)
                        )}
                        overrides={permissionMatrix['TAX_AUDIT'] ?? {}}
                        orgId={user?.organizationId || ""}
                        isOpen={openSection === "TAX_AUDIT"}
                        onToggle={() => setOpenSection(openSection === "TAX_AUDIT" ? "" : "TAX_AUDIT")}
                        isIndividualMode={!isFleet}
                      />
                    )}

                    {/* Fleet Status - Fleet only */}
                    {isFleet && (
                      <PermissionSection
                        title="Fleet Status"
                        description="Control who can view fleet-wide odometer status and vehicle assignments."
                        icon={ClipboardList}
                        type="FLEET_STATUS"
                        keys={[
                          { key: "VIEW_FLEET_STATUS", label: "View Fleet Status" },
                        ]}
                        roles={roles.filter(r => ['MANAGER', 'ADMIN'].includes(r.name))}
                        overrides={permissionMatrix['FLEET_STATUS'] ?? {}}
                        orgId={user?.organizationId || ""}
                        isOpen={openSection === "FLEET_STATUS"}
                        onToggle={() => setOpenSection(openSection === "FLEET_STATUS" ? "" : "FLEET_STATUS")}
                      />
                    )}

                    {/* Export */}
                    <PermissionSection
                      title="Export"
                      description="Control who can export data and reports."
                      icon={Download}
                      type="EXPORT"
                      keys={[
                        { key: "EXPORT_SARS_LOGBOOK", label: "Export SARS Logbook" },
                        { key: "EXPORT_TRIPS", label: "Export Trips" },
                        { key: "EXPORT_EMAIL", label: "Export Email" },
                      ]}
                      roles={roles.filter(r => isFleet
                        ? ['MANAGER', 'ADMIN'].includes(r.name)
                        : ['ASSISTANT_LOW', 'ASSISTANT_HIGH'].includes(r.name)
                      )}
                      overrides={permissionMatrix['EXPORT'] ?? {}}
                      orgId={user?.organizationId || ""}
                      isOpen={openSection === "EXPORT"}
                      onToggle={() => setOpenSection(openSection === "EXPORT" ? "" : "EXPORT")}
                      isIndividualMode={!isFleet}
                    />
                  </div>
                  <p className="mt-4 text-xs leading-5 text-muted-foreground">
                    Changes are saved automatically. Super admins always retain full access to organization settings.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Regional — persisted locally */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Regional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {prefsLoaded && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={preferences.regional.currency}
                    onValueChange={(v) => {
                      setRegional({ currency: v as "ZAR" });
                      toast.success("Currency preference saved");
                    }}
                    name="currency"
                  >
                    <SelectTrigger id="currency" className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ZAR">
                        ZAR (R) — South African Rand
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="distanceUnit">Distance Unit</Label>
                  <Select
                    value={preferences.regional.distanceUnit}
                    onValueChange={(v) => {
                      setRegional({ distanceUnit: v as "km" });
                      toast.success("Distance unit saved");
                    }}
                    name="distanceUnit"
                  >
                    <SelectTrigger id="distanceUnit" className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="km">
                        Kilometers (km)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fuelEfficiencyDisplay">Fuel Efficiency Display</Label>
                  <Select
                    value={preferences.regional.fuelEfficiencyDisplay}
                    onValueChange={(v) => {
                      setRegional({
                        fuelEfficiencyDisplay: v as "km_l" | "l_100km",
                      });
                      toast.success("Display preference saved");
                    }}
                    name="fuelEfficiencyDisplay"
                  >
                    <SelectTrigger id="fuelEfficiencyDisplay" className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="km_l">km/L</SelectItem>
                      <SelectItem value="l_100km">L/100 km</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Tax & export - hide for RENTAL_CUSTOMER */}
        {!isRentalCustomer && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5" />
                Tax & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingsRow
                icon={<FileText className="h-4 w-4" />}
                label="Current Tax Year"
                value={`${taxYear} / ${taxYear + 1}`}
              />

              {vehicles.length > 0 ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="exportVehicleId">Export vehicle data</Label>
                    <Select
                      value={exportVehicleId}
                      onValueChange={setExportVehicleId}
                      name="exportVehicleId"
                    >
                      <SelectTrigger id="exportVehicleId" className="h-12">
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            <div className="flex items-center gap-2">
                              <VehicleLogo make={v.make} size="sm"  />
                              <span>
                                {v.nickname ??
                                  `${v.make} ${v.model} — ${v.registrationNumber}`}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {exportVehicleId && (
                    <VehicleExportDialog
                      vehicleId={exportVehicleId}
                      vehicleLabel={exportVehicleLabel()}
                      triggerLabel="Export all data"
                      triggerClassName="w-full gap-2"
                    />
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Add a vehicle on the dashboard to export SARS logbook
                  and expenses.
                </p>
              )}

              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/logbook">View SARS Logbook</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <Button
          variant="destructive"
          className="h-12 sm:h-14 w-full text-sm sm:text-base"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <LogOut className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          {isLoggingOut ? "Signing out…" : "Sign Out"}
        </Button>

        <div className="py-4 text-center text-xs text-muted-foreground">
          <p>Vehicle Expense Tracker v1.0.0</p>
          <p>Designed for South African Tax Compliance</p>
        </div>
      </DashboardCollapsiblePanel>

      {!isRentalCustomer && (
        <DashboardCollapsiblePanel
          panelId="settings-tax-readiness"
          title="Tax Readiness"
          description="Review and confirm your opening and closing odometer records for SARS."
          tone="warning"
          openLabel="Hide readiness"
          closedLabel="Show readiness"
          summaryItems={taxReadinessSummaryItems}
        >
          <TaxReadinessAudit />
        </DashboardCollapsiblePanel>
      )}

      <DashboardCollapsiblePanel
        panelId="settings-report-exports"
        title="Report Exports"
        description="Generate and download fleet reports asynchronously."
        tone="info"
        openLabel="Hide exports"
        closedLabel="Show exports"
      >
        <ReportExportManager />
      </DashboardCollapsiblePanel>
    </div>
  );
}

function NotificationToggle({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Label htmlFor={id} className="font-medium">
          {label}
        </Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function StatusRow({
  label,
  ok,
  loading,
  detail,
}: {
  label: string;
  ok: boolean;
  loading: boolean;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : ok ? (
        <CheckCircle2 className="h-5 w-5 text-green-600" />
      ) : (
        <XCircle className="h-5 w-5 text-destructive" />
      )}
    </div>
  );
}

function SettingsRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm text-muted-foreground">{value}</span>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div>Loading settings...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
