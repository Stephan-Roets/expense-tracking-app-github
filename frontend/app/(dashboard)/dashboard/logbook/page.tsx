"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api/client";
import type { Vehicle, Trip } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  FileText,
  Download,
  Calendar,
  Briefcase,
  Palmtree,
  TrendingUp,
  Car,
  Filter,
  Lock,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { cn, getSarsTaxYear } from "@/lib/utils";
import { EntryActions } from "@/components/entries";
import { VehicleExportDialog } from "@/components/dashboard/vehicle-export-dialog";
import { TripExportDialog } from "@/components/dashboard/trip-export-dialog";
import { DashboardCollapsiblePanel } from "@/components/dashboard/dashboard-collapsible-panel";
import { VehicleLogo } from "@/components/vehicles/vehicle-logo";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/lib/contexts/auth-context";

// Helper to format vehicle label same as dashboard
function vehicleLabel(v: Vehicle): string {
  return v.nickname
    ? `${v.nickname} (${v.registrationNumber})`
    : `${v.year} ${v.make} ${v.model} — ${v.registrationNumber}`;
}

type TripRow = Trip & {
  vehicle: { registration: string; make: string; model: string };
};

const emptySummary = {
  totalKm: 0,
  businessKm: 0,
  privateKm: 0,
  businessPercentage: 0,
  totalTrips: 0,
  businessTrips: 0,
  privateTrips: 0,
};

export default function LogbookPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { taxYear } = getSarsTaxYear();
  const { user } = useAuth();
  const orgId = user?.organizationId;
  const currentUserRole = user?.role;
  const assistantRole = user?.assistantRole;
  
  // Fetch permissions for the organization
  const { data: permissions, isLoading: isLoadingPermissions } = usePermissions(orgId || "");
  
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [filterPurpose, setFilterPurpose] = useState<
    "all" | "BUSINESS" | "PRIVATE"
  >("all");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [summary, setSummary] = useState(emptySummary);

  // Default permissions for logbook (matching backend)
  const LOGBOOK_DEFAULTS = {
    VIEW_OWN_LOGBOOK: ['DRIVER', 'MANAGER', 'ADMIN', 'RENTAL_CUSTOMER', 'ASSISTANT_HIGH'],
    VIEW_ALL_LOGBOOKS: ['MANAGER', 'ADMIN'],
    EDIT_OWN_ENTRIES: ['DRIVER', 'MANAGER', 'ADMIN', 'ASSISTANT_HIGH'],
    EDIT_ALL_ENTRIES: ['ADMIN'],
    DELETE_OWN_ENTRIES: ['DRIVER', 'MANAGER', 'ADMIN', 'ASSISTANT_HIGH'],
    DELETE_ALL_ENTRIES: ['ADMIN']
  }

  // Default permissions for export (matching backend)
  const EXPORT_DEFAULTS = {
    EXPORT_SARS_LOGBOOK: ['ADMIN'],
    EXPORT_TRIPS: ['ADMIN'],
    EXPORT_EMAIL: ['ADMIN']
  }

  // Check if current user has permission to view logbook
  const canViewLogbook = () => {
    // SUPER_ADMIN bypasses everything
    if (currentUserRole === 'SUPER_ADMIN') return true
    
    if (!permissions || !currentUserRole) return false

    // For ASSISTANT users, check their assistantRole
    const effectiveRole = currentUserRole === 'ASSISTANT' && assistantRole ? assistantRole : currentUserRole

    // Check for override first
    const viewOwnOverride = permissions.find(
      (p: any) => p.permissionType === 'LOGBOOK' &&
                  p.permissionKey === 'VIEW_OWN_LOGBOOK' &&
                  p.userRole === effectiveRole
    )
    const viewAllOverride = permissions.find(
      (p: any) => p.permissionType === 'LOGBOOK' &&
                  p.permissionKey === 'VIEW_ALL_LOGBOOKS' &&
                  p.userRole === effectiveRole
    )

    // If override exists, use it
    if (viewOwnOverride !== undefined) {
      return viewOwnOverride.isAllowed
    }
    if (viewAllOverride !== undefined) {
      return viewAllOverride.isAllowed
    }

    // Fall back to default permissions
    return LOGBOOK_DEFAULTS.VIEW_OWN_LOGBOOK.includes(effectiveRole) ||
           LOGBOOK_DEFAULTS.VIEW_ALL_LOGBOOKS.includes(effectiveRole)
  }

  // Check if current user has permission to add trips
  const canAddTrips = () => {
    // SUPER_ADMIN bypasses everything
    if (currentUserRole === 'SUPER_ADMIN') return true
    
    if (!permissions || !currentUserRole) return false

    // For ASSISTANT users, check their assistantRole
    const effectiveRole = currentUserRole === 'ASSISTANT' && assistantRole ? assistantRole : currentUserRole

    // Check for override first
    const editOverride = permissions.find(
      (p: any) => p.permissionType === 'LOGBOOK' &&
                  p.permissionKey === 'EDIT_OWN_ENTRIES' &&
                  p.userRole === effectiveRole
    )

    // If override exists, use it
    if (editOverride !== undefined) {
      return editOverride.isAllowed
    }

    // Fall back to default permissions
    return LOGBOOK_DEFAULTS.EDIT_OWN_ENTRIES.includes(effectiveRole)
  }

  // Check if current user has permission to edit trips
  const canEditTrips = () => {
    // SUPER_ADMIN bypasses everything
    if (currentUserRole === 'SUPER_ADMIN') return true
    
    if (!permissions || !currentUserRole) return false

    // For ASSISTANT users, check their assistantRole
    const effectiveRole = currentUserRole === 'ASSISTANT' && assistantRole ? assistantRole : currentUserRole

    // Check for overrides first
    const editOwnOverride = permissions.find(
      (p: any) => p.permissionType === 'LOGBOOK' &&
                  p.permissionKey === 'EDIT_OWN_ENTRIES' &&
                  p.userRole === effectiveRole
    )
    const editAllOverride = permissions.find(
      (p: any) => p.permissionType === 'LOGBOOK' &&
                  p.permissionKey === 'EDIT_ALL_ENTRIES' &&
                  p.userRole === effectiveRole
    )

    // If override exists, use it
    if (editOwnOverride !== undefined) {
      return editOwnOverride.isAllowed
    }
    if (editAllOverride !== undefined) {
      return editAllOverride.isAllowed
    }

    // Fall back to default permissions
    return LOGBOOK_DEFAULTS.EDIT_OWN_ENTRIES.includes(effectiveRole) ||
           LOGBOOK_DEFAULTS.EDIT_ALL_ENTRIES.includes(effectiveRole)
  }

  // Check if current user has permission to delete trips
  const canDeleteTrips = () => {
    // SUPER_ADMIN bypasses everything
    if (currentUserRole === 'SUPER_ADMIN') return true
    
    if (!permissions || !currentUserRole) return false

    // For ASSISTANT users, check their assistantRole
    const effectiveRole = currentUserRole === 'ASSISTANT' && assistantRole ? assistantRole : currentUserRole

    // Check for overrides first
    const deleteOwnOverride = permissions.find(
      (p: any) => p.permissionType === 'LOGBOOK' &&
                  p.permissionKey === 'DELETE_OWN_ENTRIES' &&
                  p.userRole === effectiveRole
    )
    const deleteAllOverride = permissions.find(
      (p: any) => p.permissionType === 'LOGBOOK' &&
                  p.permissionKey === 'DELETE_ALL_ENTRIES' &&
                  p.userRole === effectiveRole
    )

    // If override exists, use it
    if (deleteOwnOverride !== undefined) {
      return deleteOwnOverride.isAllowed
    }
    if (deleteAllOverride !== undefined) {
      return deleteAllOverride.isAllowed
    }

    // Fall back to default permissions
    return LOGBOOK_DEFAULTS.DELETE_OWN_ENTRIES.includes(effectiveRole) ||
           LOGBOOK_DEFAULTS.DELETE_ALL_ENTRIES.includes(effectiveRole)
  }

  // Check if current user has permission to export SARS logbook
  const canExportSARSLogbook = () => {
    // SUPER_ADMIN bypasses everything
    if (currentUserRole === 'SUPER_ADMIN') return true
    
    if (!permissions || !currentUserRole) return false

    // For ASSISTANT users, check their assistantRole
    const effectiveRole = currentUserRole === 'ASSISTANT' && assistantRole ? assistantRole : currentUserRole

    // Check for override first
    const exportOverride = permissions.find(
      (p: any) => p.permissionType === 'EXPORT' &&
                  p.permissionKey === 'EXPORT_SARS_LOGBOOK' &&
                  p.userRole === effectiveRole
    )

    // If override exists, use it
    if (exportOverride !== undefined) {
      return exportOverride.isAllowed
    }

    // Fall back to default permissions
    return EXPORT_DEFAULTS.EXPORT_SARS_LOGBOOK.includes(effectiveRole)
  }

  // Check if current user has permission to export trips
  const canExportTrips = () => {
    // SUPER_ADMIN bypasses everything
    if (currentUserRole === 'SUPER_ADMIN') return true
    
    if (!permissions || !currentUserRole) return false

    // For ASSISTANT users, check their assistantRole
    const effectiveRole = currentUserRole === 'ASSISTANT' && assistantRole ? assistantRole : currentUserRole

    // Check for override first
    const exportOverride = permissions.find(
      (p: any) => p.permissionType === 'EXPORT' &&
                  p.permissionKey === 'EXPORT_TRIPS' &&
                  p.userRole === effectiveRole
    )

    // If override exists, use it
    if (exportOverride !== undefined) {
      return exportOverride.isAllowed
    }

    // Fall back to default permissions
    return EXPORT_DEFAULTS.EXPORT_TRIPS.includes(effectiveRole)
  }

  // Check if current user has permission to export via email
  const canExportEmail = () => {
    // SUPER_ADMIN bypasses everything
    if (currentUserRole === 'SUPER_ADMIN') return true
    
    if (!permissions || !currentUserRole) return false

    // For ASSISTANT users, check their assistantRole
    const effectiveRole = currentUserRole === 'ASSISTANT' && assistantRole ? assistantRole : currentUserRole

    // Check for override first
    const exportOverride = permissions.find(
      (p: any) => p.permissionType === 'EXPORT' &&
                  p.permissionKey === 'EXPORT_EMAIL' &&
                  p.userRole === effectiveRole
    )

    // If override exists, use it
    if (exportOverride !== undefined) {
      return exportOverride.isAllowed
    }

    // Fall back to default permissions
    return EXPORT_DEFAULTS.EXPORT_EMAIL.includes(effectiveRole)
  }

  // Redirect removed - ASSISTANT users now have permission via LOGBOOK_DEFAULTS

  const loadTrips = async () => {
    try {
      // If no vehicle is selected, don't fetch any trips
      if (!selectedVehicle) {
        setTrips([]);
        setSummary(emptySummary);
        return;
      }

      // Fetch trips for the specific vehicle using the correct endpoint
      const tripsRes = await api.get(`/trips/vehicle/${selectedVehicle}`);
      const tripData = Array.isArray(tripsRes.data) ? tripsRes.data : [];
      setTrips(
        tripData
          .filter((t: Record<string, unknown>) => t != null)
          .map((t: Record<string, unknown>) => ({
          id: String(t.id),
          organizationId: "",
          vehicleId: String(t.vehicleId),
          userId: "",
          tripDate: new Date(String(t.tripDate)),
          startTime: t.startTime ? String(t.startTime).slice(0, 5) : undefined,
          endTime: t.endTime ? String(t.endTime).slice(0, 5) : undefined,
          startLocation: String(t.startLocation),
          endLocation: String(t.endLocation),
          startOdometer: Number(t.startOdometer),
          endOdometer: Number(t.endOdometer),
          distanceKm: Number(
            t.distanceKm ?? Number(t.endOdometer) - Number(t.startOdometer),
          ),
          purpose: t.purpose as Trip["purpose"],
          routeDescription: t.routeDescription
            ? String(t.routeDescription)
            : undefined,
          customerClientName: t.customerClientName
            ? String(t.customerClientName)
            : undefined,
          reasonForTrip: t.reasonForTrip ? String(t.reasonForTrip) : undefined,
          tollCostsZar: Number(t.tollCostsZar ?? 0),
          parkingCostsZar: Number(t.parkingCostsZar ?? 0),
          isLocked: Boolean(t.isLocked ?? false),
          lockedAt: t.lockedAt ? new Date(String(t.lockedAt)) : undefined,
          lockedReason: t.lockedReason ? String(t.lockedReason) : undefined,
          lockedByName: t.lockedByName ? String(t.lockedByName) : undefined,
          createdAt: new Date(String(t.createdAt ?? t.tripDate)),
          updatedAt: new Date(String(t.updatedAt ?? t.tripDate)),
          vehicle: {
            registration: String(t.vehicleRegistration ?? ""),
            make: String(t.vehicleMake ?? ""),
            model: String(t.vehicleModel ?? ""),
          },
        })),
      );

      // Fetch summary - this is optional and may not exist in backend yet
      try {
        const summaryRes = await api.getOptional(
          `/trips/summary?vehicleId=${selectedVehicle}`,
        );
        const s = (summaryRes.data ?? {}) as Record<string, number>;
        setSummary({
          totalKm: Number(s.totalKm ?? 0),
          businessKm: Number(s.businessKm ?? 0),
          privateKm: Number(s.privateKm ?? 0),
          businessPercentage: Number(s.businessPercentage ?? 0),
          totalTrips: Number(s.totalTrips ?? 0),
          businessTrips: Number(s.businessTrips ?? 0),
          privateTrips: Number(s.privateTrips ?? 0),
        });
      } catch (summaryErr) {
        // Summary endpoint doesn't exist yet - calculate from trips data
        const businessTrips = tripData.filter(
          (t: Record<string, unknown>) => t.purpose === "BUSINESS",
        );
        const privateTrips = tripData.filter(
          (t: Record<string, unknown>) => t.purpose === "PRIVATE",
        );
        const totalKm = tripData.reduce(
          (sum: number, t: Record<string, unknown>) =>
            sum + Number(t.distanceKm ?? 0),
          0,
        );
        const businessKm = businessTrips.reduce(
          (sum: number, t: Record<string, unknown>) =>
            sum + Number(t.distanceKm ?? 0),
          0,
        );
        const privateKm = privateTrips.reduce(
          (sum: number, t: Record<string, unknown>) =>
            sum + Number(t.distanceKm ?? 0),
          0,
        );

        setSummary({
          totalKm,
          businessKm,
          privateKm,
          businessPercentage:
            totalKm > 0 ? Math.round((businessKm / totalKm) * 100) : 0,
          totalTrips: tripData.length,
          businessTrips: businessTrips.length,
          privateTrips: privateTrips.length,
        });
      }
    } catch (err) {
      console.error("Logbook - Failed to fetch trips:", err);
      setTrips([]);
      setSummary(emptySummary);
    }
  };

  useEffect(() => {
    api
      .get("/vehicles")
      .then(({ data }) => {
        if (Array.isArray(data)) {
          setVehicles(data);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    loadTrips();
  }, [selectedVehicle]);

  const filteredTrips = trips.filter((trip) => {
    if (filterPurpose !== "all" && trip.purpose !== filterPurpose) return false;
    return true;
  });

  const selectedVehicleOption = vehicles.find(
    (vehicle) => vehicle.id === selectedVehicle,
  );

  const logbookSummaryItems = [
    {
      label: `${filteredTrips.length} trip${filteredTrips.length === 1 ? "" : "s"}`,
      tone: "activity" as const,
    },
    {
      label: `${summary.businessPercentage}% business use`,
      tone: "info" as const,
    },
    {
      label: `Business ${summary.businessKm.toLocaleString()} km`,
      tone: "success" as const,
    },
    {
      label: `Private ${summary.privateKm.toLocaleString()} km`,
      tone: "warning" as const,
    },
    {
      label: selectedVehicleOption
        ? vehicleLabel(selectedVehicleOption)
        : "No vehicle selected",
    },
    ...(filterPurpose !== "all"
      ? [
          {
            label:
              filterPurpose === "BUSINESS" ? "Business only" : "Private only",
            tone:
              filterPurpose === "BUSINESS"
                ? ("success" as const)
                : ("warning" as const),
          },
        ]
      : []),
    ...(selectedMonth !== "all"
      ? [
          {
            label: `Month ${selectedMonth}`,
          },
        ]
      : []),
  ];

  const handleDeleteTrip = async (tripId: string) => {
    try {
      await api.delete(`/trips/${tripId}`);
      await loadTrips();
    } catch (err) {
      console.error("Failed to delete trip:", err);
    }
  };

  const handleLockTrip = async (tripId: string, reason?: string) => {
    try {
      await api.post(
        `/trips/${tripId}/lock?reason=${encodeURIComponent(reason || "Manual lock")}`,
        {},
      );
      await loadTrips();
    } catch (err) {
      console.error("Failed to lock trip:", err);
    }
  };

  const handleUnlockTrip = async (tripId: string) => {
    try {
      await api.post(`/trips/${tripId}/unlock`, {});
      await loadTrips();
    } catch (err) {
      console.error("Failed to unlock trip:", err);
    }
  };

  return (
    <div className="container mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 px-3 py-2 sm:gap-3 sm:px-4 sm:py-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8 sm:h-9 sm:w-9">
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
        <div>
          <h1 className="text-sm font-semibold sm:text-base">SARS Logbook</h1>
          <p className="text-[10px] text-muted-foreground sm:text-xs">Tax Year {taxYear}</p>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        <div className="flex justify-end">
          {!isLoadingPermissions && canExportTrips() && (
            <TripExportDialog
                vehicleId={selectedVehicle || vehicles[0]?.id || ""}
                vehicleLabel={
                  selectedVehicle
                    ? (vehicles.find((v) => v.id === selectedVehicle)?.nickname ??
                      vehicles.find((v) => v.id === selectedVehicle)
                        ?.registrationNumber ??
                      "Vehicle")
                    : (vehicles[0]?.nickname ??
                      vehicles[0]?.registrationNumber ??
                      "Vehicle")
                }
                disabled={vehicles.length === 0}
                triggerClassName="w-full gap-2 sm:w-auto"
              />
          )}
        </div>

        <DashboardCollapsiblePanel
          panelId="logbook-summary"
          title="Logbook summary and filters"
          description="Review tax-year totals and narrow the trip list for the selected vehicle."
          tone="activity"
          openLabel="Hide summary"
          closedLabel="Show summary"
          summaryItems={logbookSummaryItems}
          contentClassName="space-y-6"
        >
          {/* Tax Year Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="rounded-xl shadow-lg border-primary/20 bg-primary/10">
              <CardContent className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-primary">
                    Business KM
                  </span>
                </div>
                <div className="text-2xl font-bold">
                  {summary.businessKm.toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {summary.businessTrips} trips
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-xl shadow-lg border-amber-500/20 bg-amber-500/10">
              <CardContent className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Palmtree className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-medium text-amber-500">
                    Private KM
                  </span>
                </div>
                <div className="text-2xl font-bold">
                  {summary.privateKm.toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {summary.privateTrips} trips
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Business Percentage Card */}
          <Card className="rounded-xl shadow-lg">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span className="font-medium">Business Use Ratio</span>
                </div>
                <span className="text-2xl font-bold text-primary">
                  {summary.businessPercentage}%
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${summary.businessPercentage}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>Business: {summary.businessKm} km</span>
                <span>Private: {summary.privateKm} km</span>
              </div>
            </CardContent>
          </Card>

          {/* SARS Compliance Notice */}
          <Card className="rounded-xl shadow-lg border-dashed bg-muted/50">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    SARS Logbook Requirements
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Record all trips with date, start/end odometer, purpose
                    (business/private), and destination. Keep for 5 years for
                    tax audit purposes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <div className="flex flex-col gap-2 md:flex-row">
            <Select
              value={filterPurpose}
              onValueChange={(v) => setFilterPurpose(v as typeof filterPurpose)}
              name="filterPurpose"
            >
              <SelectTrigger className="h-10 w-full md:w-[160px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All trips" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trips</SelectItem>
                <SelectItem value="BUSINESS">Business Only</SelectItem>
                <SelectItem value="PRIVATE">Private Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle} name="selectedVehicle">
              <SelectTrigger className="h-10 w-full md:w-[240px]">
                <Car className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    <div className="flex items-center gap-2">
                      <VehicleLogo make={vehicle.make} size="xs" />
                      <span className="truncate">{vehicleLabel(vehicle)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth} name="selectedMonth">
              <SelectTrigger className="h-10 w-full flex-1">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                <SelectItem value="01">January 2024</SelectItem>
                <SelectItem value="02">February 2024</SelectItem>
                <SelectItem value="03">March 2024</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </DashboardCollapsiblePanel>

        {/* Add Trip Button */}
        {canAddTrips() && (
          <div className="pt-2">
            <Link 
              href={selectedVehicle ? `/dashboard/logbook/new?vehicleId=${selectedVehicle}` : "/dashboard/logbook/new"} 
              className="block w-full"
            >
              <Button size="lg" className="w-full gap-2">
                <Plus className="h-5 w-5" />
                Add New Trip
              </Button>
            </Link>
          </div>
        )}

        {/* Trip List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Trip History</h2>
            <span className="text-sm text-muted-foreground">
              {filteredTrips.length} trips
            </span>
          </div>

          {/* Vehicle dropdown for Trip History */}
          <Select value={selectedVehicle} onValueChange={setSelectedVehicle} name="selectedVehicleHistory">
            <SelectTrigger className="h-10 w-full">
              <Car className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Select vehicle to view trip history" />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  <div className="flex items-center gap-2">
                    <VehicleLogo make={vehicle.make} size="xs"  />
                    <span className="truncate">{vehicleLabel(vehicle)}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Show message when no vehicle is selected */}
          {!selectedVehicle && (
            <Card className="bg-muted/50">
              <CardContent className="p-6 text-center">
                <Car className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Select a vehicle above to view trip history
                </p>
              </CardContent>
            </Card>
          )}

          {selectedVehicle && filteredTrips.map((trip) => (
            <Card
              key={trip.id}
              className={cn(
                "overflow-hidden relative",
                trip.purpose === "BUSINESS"
                  ? "border-l-4 border-l-primary"
                  : "border-l-4 border-l-amber-500",
                trip.isLocked && "border-amber-500/50",
              )}
            >
              {/* Lock indicator */}
              {trip.isLocked && (
                <div className="absolute top-3 right-3 z-10">
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-600 border-amber-500/30"
                  >
                    <Lock className="h-3 w-3 mr-1" />
                    Confirmed
                  </Badge>
                </div>
              )}

              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        trip.purpose === "BUSINESS" ? "default" : "secondary"
                      }
                      className={cn(
                        "text-xs",
                        trip.purpose === "PRIVATE" &&
                          "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30",
                      )}
                    >
                      {trip.purpose === "BUSINESS" ? (
                        <Briefcase className="h-3 w-3 mr-1" />
                      ) : (
                        <Palmtree className="h-3 w-3 mr-1" />
                      )}
                      {trip.purpose}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(trip.tripDate).toLocaleDateString("en-ZA", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <span className="text-lg font-bold">
                    {trip.distanceKm} km
                  </span>
                  {trip.isLocked && (
                    <Badge
                      variant="secondary"
                      className="bg-amber-500/10 text-amber-600 border-amber-500/20"
                    >
                      <Lock className="h-3 w-3 mr-1" />
                      Confirmed
                    </Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                    <span className="text-sm">{trip.startLocation}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                    <span className="text-sm">{trip.endLocation}</span>
                  </div>
                </div>

                {trip.customerClientName && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">
                      Client:{" "}
                    </span>
                    <span className="text-xs font-medium">
                      {trip.customerClientName}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      <span>{trip.vehicle.registration}</span>
                    </div>
                    <span>
                      {trip.startOdometer.toLocaleString()} -{" "}
                      {trip.endOdometer.toLocaleString()} km
                    </span>
                  </div>

                  {/* Action buttons */}
                  <EntryActions
                    entryId={trip.id}
                    entryType="trip"
                    isLocked={trip.isLocked ?? false}
                    lockedAt={trip.lockedAt}
                    lockedByName={trip.lockedByName}
                    lockedReason={trip.lockedReason}
                    onEdit={() =>
                      router.push(`/dashboard/trips/${trip.id}/edit`)
                    }
                    onDelete={() => handleDeleteTrip(trip.id)}
                    onLock={(reason) => handleLockTrip(trip.id, reason)}
                    onUnlock={() => handleUnlockTrip(trip.id)}
                    variant="icons"
                    canEdit={canEditTrips()}
                    canDelete={canDeleteTrips()}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
