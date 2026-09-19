"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  User,
  LogOut,
  Settings,
  Building2,
  ChevronDown,
  CircleDot,
  AlertTriangle,
  RotateCcw,
  X,
  Check,
  Car,
  IdCard,
  Shield,
  MapPin,
  ClipboardCheck,
  FileText,
  BadgeCheck,
  ExternalLink,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/contexts/auth-context";
import { cn } from "@/lib/utils";
import { AppUsageGuideDialog } from "@/components/navigation/app-usage-guide-dialog";
import { useTyreRotationWarnings } from "@/lib/hooks/use-tyre-rotation-warnings";
import { useExpiryAlerts } from "@/lib/hooks/use-expiry-alerts";
import { useMissingReceipts } from "@/lib/hooks/use-missing-receipts";
import { useOdometerDriftAlerts, OdometerDriftAlert } from "@/lib/hooks/use-odometer-drift-alerts";
import {
  TyreRotationWarning,
  getTyreRotationStatusColor,
  getTyreRotationStatusLabel,
  DRIVETRAIN_TYPE_LABELS,
  ExpiryAlert,
  ExpiryItemType,
  getExpiryStatusColor,
  getExpiryStatusLabel,
  formatDaysUntilExpiry,
  UserRole,
} from "@/lib/types/database";

// ── Stored profile shape (written to localStorage at login / register) ────────
interface StoredProfile {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  organizationMode?: "SOLO" | "FLEET" | "BUSINESS_FLEET" | "COMPANY";
  organizationName?: string;
  profilePhotoUrl?: string;
}

interface DashboardHeaderProps {
  title?: string;
  showModeToggle?: boolean;
}

// Get icon for expiry item type
function getExpiryItemIcon(itemType: ExpiryItemType) {
  switch (itemType) {
    case "VEHICLE_LICENSE":
      return Car;
    case "DRIVERS_LICENSE":
      return IdCard;
    case "PDP":
      return BadgeCheck;
    case "INSURANCE":
      return Shield;
    case "TRACKING_CONTRACT":
      return MapPin;
    case "ROADWORTHY":
      return ClipboardCheck;
    case "OPERATING_LICENSE":
      return FileText;
    case "TYRE_ROTATION":
      return RotateCcw;
    default:
      return FileText;
  }
}

function TyreRotationNotification({
  warning,
  onDismiss,
  onRecordRotation,
}: {
  warning: TyreRotationWarning;
  onDismiss: (id: string) => void;
  onRecordRotation: (id: string) => void;
}) {
  const statusColor = getTyreRotationStatusColor(warning.rotationStatus);
  const statusLabel = getTyreRotationStatusLabel(warning.rotationStatus);

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "p-1.5 rounded-full",
              warning.rotationStatus === "CRITICAL"
                ? "bg-destructive/20"
                : "bg-warning/20",
            )}
          >
            <CircleDot
              className={cn(
                "h-4 w-4",
                warning.rotationStatus === "CRITICAL"
                  ? "text-destructive"
                  : "text-warning",
              )}
            />
          </div>
          <div>
            <p className="text-sm font-medium">{warning.vehicleRegistration}</p>
            <p className="text-xs text-muted-foreground">
              {warning.vehicleName}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={cn("text-xs", statusColor)}>
          {statusLabel}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Tyres</p>
          <p className="font-medium">{warning.tyreBrand}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Drivetrain</p>
          <p className="font-medium">
            {DRIVETRAIN_TYPE_LABELS[warning.drivetrainType]}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Interval</p>
          <p className="font-medium">
            {warning.rotationIntervalKm.toLocaleString()} km
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">
            {warning.kmOverdue > 0 ? "Overdue" : "Due at"}
          </p>
          <p
            className={cn(
              "font-medium",
              warning.kmOverdue > 0 && "text-destructive",
            )}
          >
            {warning.kmOverdue > 0
              ? `${warning.kmOverdue.toLocaleString()} km`
              : `${warning.nextRotationOdometer.toLocaleString()} km`}
          </p>
        </div>
      </div>

      {warning.latestFuelOdometer && (
        <div className="text-xs text-muted-foreground">
          Latest fuel reading: {warning.latestFuelOdometer.toLocaleString()} km
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          name="markRotated"
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs"
          onClick={() => onRecordRotation(warning.trackingId)}
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Mark Rotated
        </Button>
        <Button
          name="dismiss"
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-muted-foreground"
          onClick={() => onDismiss(warning.trackingId)}
        >
          <X className="h-3 w-3 mr-1" />
          Dismiss
        </Button>
      </div>
    </div>
  );
}

function ExpiryAlertNotification({
  alert,
  onDismiss,
}: {
  alert: ExpiryAlert;
  onDismiss: (itemType: ExpiryItemType, itemId: string) => void;
}) {
  const Icon = getExpiryItemIcon(alert.itemType);
  const statusColor = getExpiryStatusColor(alert.expiryStatus);
  const statusLabel = getExpiryStatusLabel(alert.expiryStatus);
  const expiryText = formatDaysUntilExpiry(alert.daysUntilExpiry);

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-3 rounded-lg border transition-colors bg-card",
        statusColor,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "p-1.5 rounded-full",
              alert.expiryStatus === "EXPIRED"
                ? "bg-destructive/20"
                : alert.expiryStatus === "CRITICAL"
                  ? "bg-orange-500/20"
                  : alert.expiryStatus === "WARNING"
                    ? "bg-yellow-500/20"
                    : "bg-green-500/20",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4",
                alert.expiryStatus === "EXPIRED"
                  ? "text-destructive"
                  : alert.expiryStatus === "CRITICAL"
                    ? "text-orange-600"
                    : alert.expiryStatus === "WARNING"
                      ? "text-yellow-600"
                      : "text-green-600",
              )}
            />
          </div>
          <div>
            <p className="text-sm font-medium">{alert.itemName}</p>
            <p className="text-xs text-muted-foreground">
              {alert.vehicleRegistration || alert.userName || "General"}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn("text-xs shrink-0", statusColor)}
        >
          {statusLabel}
        </Badge>
      </div>

      <div className="text-xs text-muted-foreground">
        {alert.itemDescription}
      </div>

      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <span
            className={cn(
              "font-medium",
              alert.daysUntilExpiry < 0 && "text-destructive",
            )}
          >
            {expiryText}
          </span>
        </div>
        {alert.vehicleName && (
          <div className="text-muted-foreground truncate">
            {alert.vehicleName}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        {alert.renewalUrl && (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs"
            asChild
          >
            <a
              href={alert.renewalUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Renew Online
            </a>
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 text-xs text-muted-foreground",
            !alert.renewalUrl && "flex-1",
          )}
          onClick={() => {
            if (!alert.itemType || !alert.itemId) {
              console.error(
                "[ExpiryAlertNotification] Cannot dismiss alert with missing data:",
                alert,
              );
              return;
            }
            onDismiss(alert.itemType, alert.itemId);
          }}
          disabled={!alert.itemType || !alert.itemId}
        >
          <X className="h-3 w-3 mr-1" />
          Dismiss
        </Button>
      </div>
    </div>
  );
}

export function DashboardHeader({
  title,
  showModeToggle = true,
}: DashboardHeaderProps) {
  // logout() is the one thing still valid from AuthContext (it clears localStorage)
  const { logout, user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"expired" | "warning" | "receipts" | "odometer">("expired");

  // Real user data — use auth context user as source of truth
  const profile: StoredProfile = user ? {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    organizationMode: user.organizationMode,
    organizationName: user.organizationName,
    profilePhotoUrl: user.profilePhotoUrl,
  } : {};

  // Tyre rotation warnings
  const {
    warnings: tyreWarnings,
    warningCount: tyreWarningCount,
    criticalCount: tyreCriticalCount,
    dismissWarning: dismissTyreWarning,
    recordRotation,
  } = useTyreRotationWarnings();

  // Expiry alerts
  const {
    activeAlerts: expiryAlerts,
    counts: expiryCounts,
    dismissAlert: dismissExpiryAlert,
  } = useExpiryAlerts();

  // Missing receipts
  const {
    expenses: missingReceipts,
    isLoading: missingReceiptsLoading,
    refreshReceipts,
  } = useMissingReceipts();

  // Odometer drift alerts
  const {
    activeAlerts: odometerDriftAlerts,
    dismissAlert: dismissOdometerDriftAlert,
    deleteAlert: deleteOdometerDriftAlert,
    refreshAlerts: refreshOdometerDriftAlerts,
    checkAllVehicles: checkAllOdometerDrift,
  } = useOdometerDriftAlerts();

  const isFleet = profile.organizationMode === "FLEET" || profile.organizationMode === "BUSINESS_FLEET" || profile.organizationMode === "COMPANY";
  const isRentalCustomer = profile.role === UserRole.RENTAL_CUSTOMER;
  const displayName = profile.firstName
    ? `${profile.firstName} ${profile.lastName ?? ""}`.trim()
    : null;
  const initials = profile.firstName
    ? `${profile.firstName[0]}${profile.lastName?.[0] ?? ""}`.toUpperCase()
    : null;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
  };

  const handleDismissTyreWarning = async (trackingId: string) => {
    try {
      await dismissTyreWarning(trackingId);
    } catch {
      // Handle error
    }
  };

  const handleRecordRotation = async (trackingId: string) => {
    const warning = tyreWarnings.find((w) => w.trackingId === trackingId);
    if (warning) {
      try {
        await recordRotation(trackingId, warning.currentVehicleOdometer);
      } catch {
        // Handle error
      }
    }
  };

  const handleDismissExpiryAlert = async (
    itemType: ExpiryItemType,
    itemId: string,
  ) => {
    try {
      await dismissExpiryAlert(itemType, itemId);
    } catch (error) {
      console.error(
        "[handleDismissExpiryAlert] Failed to dismiss alert:",
        error,
      );
    }
  };

  // Total notifications
  const totalExpiredAlerts = expiryCounts.expiredCount + tyreCriticalCount;
  const totalWarningAlerts =
    expiryCounts.criticalCount +
    expiryCounts.warningCount +
    expiryCounts.upcomingCount +
    (tyreWarningCount - tyreCriticalCount);
  const totalMissingReceipts = missingReceipts.length;
  const totalOdometerDriftAlerts = odometerDriftAlerts.length;
  const totalNotifications = totalExpiredAlerts + totalWarningAlerts + totalMissingReceipts + totalOdometerDriftAlerts;

  // Check for critical items
  const hasExpiryExpired = expiryCounts.expiredCount > 0 || tyreCriticalCount > 0;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex h-14 items-center justify-between px-4">
        {/* Left — logo + mode badge */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">
                VE
              </span>
            </div>
            <span className="hidden font-semibold sm:inline-block">
              {title || "Vehicle Expense"}
            </span>
          </Link>

          {/* Account-type badge — derived from real localStorage value */}
          {showModeToggle && profile.organizationMode && (
            <div
              className={cn(
                "hidden rounded-full px-2 py-0.5 text-xs font-medium sm:block",
                isFleet
                  ? "bg-primary/20 text-primary"
                  : "bg-accent/20 text-accent",
              )}
            >
              {isFleet ? "Fleet" : "Individual"}
            </div>
          )}
        </div>

        {/* Right — notifications + help + user menu */}
        <div className="flex items-center gap-2">
          <AppUsageGuideDialog
            organizationMode={profile.organizationMode}
            role={profile.role}
            organizationName={profile.organizationName}
            userEmail={profile.email}
          />

          {/* Notification Bell with Expiry Alerts and Tyre Rotation Warnings - hide for RENTAL_CUSTOMER */}
          {!isRentalCustomer && (
            <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative touch-target"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {totalNotifications > 0 && (
                    <span
                      className={cn(
                        "absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white",
                        hasExpiryExpired
                          ? "bg-destructive animate-pulse"
                          : "bg-warning",
                      )}
                    >
                      {totalNotifications > 9 ? "9+" : totalNotifications}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-[calc(100vw-2rem)] max-w-[600px] p-0 bg-card"
              sideOffset={8}
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    className={cn(
                      "h-4 w-4",
                      hasExpiryExpired ? "text-destructive" : "text-warning",
                    )}
                  />
                  <span className="font-semibold text-sm">
                    Alerts & Reminders
                  </span>
                </div>
                {totalNotifications > 0 && (
                  <Badge
                    variant={hasExpiryExpired ? "destructive" : "secondary"}
                    className="text-xs"
                  >
                    {totalNotifications}
                  </Badge>
                )}
              </div>

              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as "expired" | "warning" | "receipts" | "odometer")}
                className="w-full flex flex-col"
              >
                <TabsList className="w-full rounded-none border-b bg-background p-0 grid grid-cols-2 gap-0 flex-shrink-0 h-20 sm:h-28 relative z-10">
                  <TabsTrigger
                    value="expired"
                    className="rounded-none border-b-2 border-r border-border data-[state=active]:border-primary data-[state=active]:bg-accent h-10 sm:h-14 text-sm sm:text-base"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span>Expired</span>
                      {totalExpiredAlerts > 0 && (
                        <Badge
                          variant="destructive"
                          className="h-5 px-1.5 sm:h-6 sm:px-2 text-[10px] sm:text-xs"
                        >
                          {totalExpiredAlerts}
                        </Badge>
                      )}
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="warning"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-accent h-10 sm:h-14 text-sm sm:text-base"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span>Warning</span>
                      {totalWarningAlerts > 0 && (
                        <Badge className="h-5 px-1.5 sm:h-6 sm:px-2 text-[10px] sm:text-xs bg-orange-500 text-white border-2 border-orange-500">
                          {totalWarningAlerts}
                        </Badge>
                      )}
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="receipts"
                    className="rounded-none border-b-2 border-r border-border data-[state=active]:border-primary data-[state=active]:bg-accent h-10 sm:h-14 text-sm sm:text-base"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span>Receipts</span>
                      {totalMissingReceipts > 0 && (
                        <Badge className="h-5 px-1.5 sm:h-6 sm:px-2 text-[10px] sm:text-xs bg-blue-500 text-white border-2 border-blue-500">
                          {totalMissingReceipts}
                        </Badge>
                      )}
                    </div>
                  </TabsTrigger>
                  <TabsTrigger
                    value="odometer"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-accent h-10 sm:h-14 text-sm sm:text-base"
                  >
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span>Odometer</span>
                      {totalOdometerDriftAlerts > 0 && (
                        <Badge className="h-5 px-1.5 sm:h-6 sm:px-2 text-[10px] sm:text-xs bg-purple-500 text-white border-2 border-purple-500">
                          {totalOdometerDriftAlerts}
                        </Badge>
                      )}
                    </div>
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-hidden bg-background">
                  <TabsContent value="expired" className="m-0 h-full">
                  <div className="max-h-[400px] overflow-y-auto p-2">
                    {expiryAlerts.filter((a) => a.expiryStatus === "EXPIRED")
                      .length === 0 && tyreWarnings.filter((w) => w.rotationStatus === "CRITICAL").length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="p-3 rounded-full bg-muted mb-3">
                          <Check className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">No expired items!</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          All licenses, insurance, and certificates are up to
                          date.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Critical tyre rotations */}
                        {tyreWarnings.filter((w) => w.rotationStatus === "CRITICAL").length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-2 px-1">
                              Overdue Tyre Rotations ({tyreWarnings.filter((w) => w.rotationStatus === "CRITICAL").length})
                            </p>
                            {tyreWarnings
                              .filter((w) => w.rotationStatus === "CRITICAL")
                              .map((warning) => (
                                <TyreRotationNotification
                                  key={warning.trackingId}
                                  warning={warning}
                                  onRecordRotation={handleRecordRotation}
                                  onDismiss={handleDismissTyreWarning}
                                />
                              ))}
                          </div>
                        )}
                        {/* Expired expiry alerts */}
                        {expiryAlerts
                          .filter(
                            (a) =>
                              a.expiryStatus === "EXPIRED" &&
                              a.itemType &&
                              a.itemId,
                          )
                          .map((alert) => (
                            <ExpiryAlertNotification
                              key={`${alert.itemType}-${alert.itemId}`}
                              alert={alert}
                              onDismiss={handleDismissExpiryAlert}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="warning" className="m-0 h-full">
                  <div className="max-h-[400px] overflow-y-auto p-2">
                    {expiryAlerts.filter((a) => a.expiryStatus !== "EXPIRED")
                      .length === 0 && tyreWarnings.filter((w) => w.rotationStatus !== "CRITICAL").length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="p-3 rounded-full bg-muted mb-3">
                          <Check className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">All caught up!</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          No warnings at this time.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Critical expiry alerts */}
                        {expiryCounts.criticalCount > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-2 px-1">
                              Critical - Within 7 Days (
                              {expiryCounts.criticalCount})
                            </p>
                            {expiryAlerts
                              .filter(
                                (a) =>
                                  a.expiryStatus === "CRITICAL" &&
                                  a.itemType &&
                                  a.itemId,
                              )
                              .map((alert, index) => (
                                <ExpiryAlertNotification
                                  key={`${alert.itemType}-${alert.itemId}-${index}`}
                                  alert={alert}
                                  onDismiss={handleDismissExpiryAlert}
                                />
                              ))}
                          </div>
                        )}
                        {/* Warning expiry alerts */}
                        {expiryCounts.warningCount > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-2 px-1">
                              Warning - Within 30 Days (
                              {expiryCounts.warningCount})
                            </p>
                            {expiryAlerts
                              .filter(
                                (a) =>
                                  a.expiryStatus === "WARNING" &&
                                  a.itemType &&
                                  a.itemId,
                              )
                              .map((alert, index) => (
                                <ExpiryAlertNotification
                                  key={`${alert.itemType}-${alert.itemId}-${index}`}
                                  alert={alert}
                                  onDismiss={handleDismissExpiryAlert}
                                />
                              ))}
                          </div>
                        )}
                        {/* Upcoming expiry alerts */}
                        {expiryCounts.upcomingCount > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-2 px-1">
                              Coming Up - Within 60 Days (
                              {expiryCounts.upcomingCount})
                            </p>
                            {expiryAlerts
                              .filter(
                                (a) =>
                                  a.expiryStatus === "UPCOMING" &&
                                  a.itemType &&
                                  a.itemId,
                              )
                              .map((alert, index) => (
                                <ExpiryAlertNotification
                                  key={`${alert.itemType}-${alert.itemId}-${index}`}
                                  alert={alert}
                                  onDismiss={handleDismissExpiryAlert}
                                />
                              ))}
                          </div>
                        )}
                        {/* Tyre rotation warnings (excluding CRITICAL) */}
                        {tyreWarnings.filter((w) => w.rotationStatus !== "CRITICAL").length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-2 px-1">
                              Tyre Rotations ({tyreWarnings.filter((w) => w.rotationStatus !== "CRITICAL").length})
                            </p>
                            {tyreWarnings
                              .filter((w) => w.rotationStatus !== "CRITICAL")
                              .map((warning) => (
                              <TyreRotationNotification
                                key={warning.trackingId}
                                warning={warning}
                                onDismiss={handleDismissTyreWarning}
                                onRecordRotation={handleRecordRotation}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="receipts" className="m-0 h-full">
                  <div className="max-h-[400px] overflow-y-auto p-2">
                    {missingReceiptsLoading ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="p-3 rounded-full bg-muted mb-3">
                          <FileText className="h-6 w-6 text-muted-foreground animate-pulse" />
                        </div>
                        <p className="text-sm font-medium">Loading...</p>
                      </div>
                    ) : missingReceipts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="p-3 rounded-full bg-muted mb-3">
                          <Check className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium">All receipts captured!</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          All fuel and other expenses have receipt images.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2 px-1">
                          Expenses Missing Receipts ({missingReceipts.length})
                        </p>
                        {missingReceipts.map((expense) => (
                          <div
                            key={expense.id}
                            className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-card"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-full bg-blue-500/20">
                                  <FileText className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{expense.description}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {expense.category} - R{expense.amount?.toFixed(2) ?? '0.00'}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
                                {new Date(expense.expenseDate).toLocaleDateString()}
                              </Badge>
                            </div>
                            {expense.vehicleRegistration && (
                              <div className="text-xs text-muted-foreground">
                                {expense.vehicleRegistration}
                              </div>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full h-8 text-xs"
                              onClick={() => window.location.href = `/dashboard/expenses/${expense.id}/edit`}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Add Receipt Image
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {expiryAlerts.filter((a) => a.expiryStatus !== "EXPIRED")
                        .length > 0 && (
                        <div className="border-t border-border px-4 py-2">
                          <p className="text-xs text-muted-foreground text-center">
                            Renew online at{" "}
                            <a
                              href="https://online.natis.gov.za/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              NaTIS
                            </a>
                          </p>
                        </div>
                      )}
                  </div>
                </TabsContent>

                <TabsContent value="odometer" className="m-0 h-full">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between px-2 py-1 border-b border-border">
                      <p className="text-xs font-medium text-purple-600 dark:text-purple-400">
                        Odometer Drift Alerts ({odometerDriftAlerts.length})
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={async () => {
                          try {
                            const alertsCreated = await checkAllOdometerDrift();
                            // Optionally show a toast or notification
                            console.log(`Checked all vehicles, created ${alertsCreated} alerts`);
                          } catch (err) {
                            console.error('Failed to check vehicles:', err);
                          }
                        }}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Check All
                      </Button>
                    </div>
                    <div className="flex-1 max-h-[400px] overflow-y-auto p-2">
                      {odometerDriftAlerts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="p-3 rounded-full bg-muted mb-3">
                            <Check className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium">All odometers synced!</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            No odometer drift detected.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {odometerDriftAlerts.map((alert) => (
                            <div
                              key={alert.id}
                              className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-card"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 rounded-full bg-purple-500/20">
                                    <Car className="h-4 w-4 text-purple-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{alert.vehicleRegistration}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Stored: {alert.storedOdometer.toLocaleString()} km | Computed: {alert.computedOdometer.toLocaleString()} km
                                    </p>
                                  </div>
                                </div>
                                <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/20">
                                  Drift: {(alert.computedOdometer - alert.storedOdometer).toLocaleString()} km
                                </Badge>
                              </div>
                              <div className="flex gap-2 pt-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 h-8 text-xs"
                                  onClick={() => window.location.href = `/dashboard/vehicles/${alert.vehicleId}/edit?from=odometer-drift`}
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Recalculate
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-xs text-muted-foreground"
                                  onClick={() => dismissOdometerDriftAlert(alert.vehicleId)}
                                >
                                  <X className="h-3 w-3 mr-1" />
                                  Dismiss
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
                </div>
              </Tabs>
            </PopoverContent>
          </Popover>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 touch-target">
                {profile.profilePhotoUrl ? (
                  <img
                    src={profile.profilePhotoUrl}
                    alt={displayName || "Profile"}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-semibold">
                    {initials ?? <User className="h-4 w-4" />}
                  </div>
                )}
                <span className="hidden max-w-[100px] truncate text-sm sm:inline-block">
                  {profile.firstName ?? "Account"}
                </span>
                <ChevronDown className="hidden h-4 w-4 sm:block" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-0.5">
                  {displayName ? (
                    <span className="text-sm font-medium">{displayName}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">
                      Loading...
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground truncate">
                    {profile.email ?? ""}
                  </span>
                  {profile.organizationMode && (
                    <span className="text-xs text-muted-foreground">
                      {isFleet
                        ? `Fleet · ${profile.organizationName ?? ""}`
                        : "Individual account"}
                    </span>
                  )}
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard/profile"
                  className="flex items-center gap-2"
                >
                  <User className="h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>

              {/* Only show Organisation for Fleet accounts */}
              {isFleet && (
                <DropdownMenuItem asChild>
                  <Link
                    href="/dashboard/organization"
                    className="flex items-center gap-2"
                  >
                    <Building2 className="h-4 w-4" />
                    Organisation
                  </Link>
                </DropdownMenuItem>
              )}

              <DropdownMenuItem asChild>
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isLoggingOut ? "Signing out..." : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
