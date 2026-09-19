"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Car, AlertCircle, Lock, Image as ImageIcon, Clock, Trash2, Check, X, MessageSquare, Eye, Edit } from "lucide-react";
import { VehicleLogo } from "@/components/vehicles/vehicle-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import { getVehicleAssignments } from "@/lib/api/client";
import type { Vehicle } from "@/lib/types/database";
import { EntryActions } from "@/components/entries";
import { cn } from "@/lib/utils";
import { DashboardCollapsiblePanel } from "@/components/dashboard/dashboard-collapsible-panel";
import { useAuth } from "@/lib/contexts/auth-context";
import { usePermissions } from "@/hooks/usePermissions";
import { UserRole, VehicleStatus } from "@/lib/types/database";
import { VehicleConditionReport } from "@/components/VehicleConditionReport";
import { OdometerConfirmationForm } from "@/components/OdometerConfirmationForm";
import { HandoffDialog } from "@/components/vehicles/handoff-dialog";
import { HandoffStatusCard } from "@/components/vehicles/handoff-status-card";
import { handoffApi } from "@/lib/api/handoff";
import type { VehicleHandoffDTO } from "@/lib/types/handoff";
import { FleetOdometerStatusTable } from "@/components/vehicles/fleet-odometer-status-table";
import { VehicleExportDialog } from "@/components/dashboard/vehicle-export-dialog";
import { FleetAssignmentHistoryExportDialog } from "@/components/vehicles/fleet-assignment-history-export-dialog";

export default function VehiclesPage() {
  const router = useRouter();
  const { user, isFleetMode, isSuperAdmin, isAdmin, isManager } = useAuth();
  const { data: permissions, isLoading: isLoadingPermissions } = usePermissions(user?.organizationId || '');
  const currentUserRole = user?.role ?? UserRole.DRIVER;
  const isDriver = currentUserRole === UserRole.DRIVER;
  const isRentalCustomer = currentUserRole === UserRole.RENTAL_CUSTOMER;
  const isAdminOrManager = isSuperAdmin || isAdmin || isManager;

  // Check if user has permission to view vehicles - SUPER_ADMIN always has access
  const canViewVehicles = user?.role === "SUPER_ADMIN" ||
                         user?.role === "ADMIN" ||
                         user?.role === "MANAGER" ||
                         (user?.role === "ASSISTANT" && user?.assistantRole === "ASSISTANT_HIGH") ||
                         (user?.role === "DRIVER");

  // Check if user has permission to add vehicles
  const canAddVehicle = user?.role === "SUPER_ADMIN" ||
                       user?.role === "ADMIN" ||
                       user?.role === "MANAGER" ||
                       (user?.role === "ASSISTANT" && user?.assistantRole === "ASSISTANT_HIGH");

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [rejectedVehicles, setRejectedVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingVehicleId, setRejectingVehicleId] = useState<string | null>(null);
  const [rejectType, setRejectType] = useState<'creation' | 'deletion'>('creation');
  const [rejectionReason, setRejectionReason] = useState('');
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [viewingVehicle, setViewingVehicle] = useState<Vehicle | null>(null);
  
  // Fleet-specific state
  const [conditionReportOpen, setConditionReportOpen] = useState(false);
  const [odometerConfirmationOpen, setOdometerConfirmationOpen] = useState(false);
  const [selectedVehicleForFleet, setSelectedVehicleForFleet] = useState<Vehicle | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  
  // Handoff state
  const [handoffDialogOpen, setHandoffDialogOpen] = useState(false);
  const [selectedVehicleForHandoff, setSelectedVehicleForHandoff] = useState<Vehicle | null>(null);
  const [activeHandoffs, setActiveHandoffs] = useState<Record<string, VehicleHandoffDTO>>({});
  
  // Fleet odometer status state
  const [fleetOdometerStatus, setFleetOdometerStatus] = useState<any[]>([]);
  const [isLoadingFleetStatus, setIsLoadingFleetStatus] = useState(false);
  
  // Organization visibility settings
  const [conditionReportEnabled, setConditionReportEnabled] = useState(true);
  const [odometerConfirmationEnabled, setOdometerConfirmationEnabled] = useState(true);

  const fetchVehicles = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.get("/vehicles");
      const responseData = (data as any).data || data;
      // Ensure vehicles is always an array
      let vehiclesArray: Vehicle[] = [];
      if (Array.isArray(responseData)) {
        vehiclesArray = responseData;
      } else if (responseData && typeof responseData === "object") {
        // Handle paginated response or wrapped response
        vehiclesArray =
          (responseData as any).content || (responseData as any).vehicles || [];
      }

      // Filter vehicles for drivers and rental customers - only show assigned vehicles
      if (isDriver || isRentalCustomer) {
        vehiclesArray = vehiclesArray.filter(
          (v) => v.assignedDriverId === user?.id
        );
      }

      setVehicles(vehiclesArray);
    } catch (err) {
      console.error("Failed to fetch vehicles:", err);
      setError("Failed to load vehicles. Please try again.");
      setVehicles([]);
    } finally {
      setIsLoading(false);
    }
  }, [isDriver, isRentalCustomer, user?.id]);

  const fetchRejectedVehicles = useCallback(async () => {
    try {
      const data = await api.get("/vehicles/rejected");
      const responseData = (data as any).data || data;
      let rejectedArray: Vehicle[] = [];
      if (Array.isArray(responseData)) {
        rejectedArray = responseData;
      } else if (responseData && typeof responseData === "object") {
        rejectedArray = (responseData as any).content || (responseData as any).vehicles || [];
      }
      setRejectedVehicles(rejectedArray);
    } catch (err) {
      console.error("Failed to fetch rejected vehicles:", err);
    }
  }, []);

  const fetchActiveHandoffs = useCallback(async () => {
    try {
      const handoffs = await handoffApi.list();
      const handoffMap: Record<string, VehicleHandoffDTO> = {};
      handoffs.forEach(handoff => {
        if (handoff.state !== 'HANDOFF_COMPLETE' && handoff.state !== 'CANCELLED') {
          handoffMap[handoff.vehicleId] = handoff;
        }
      });
      setActiveHandoffs(handoffMap);
    } catch (err) {
      console.error("Failed to fetch active handoffs:", err);
    }
  }, []);

  const fetchFleetOdometerStatus = useCallback(async () => {
    try {
      setIsLoadingFleetStatus(true);
      const { data } = await api.get('/vehicles/fleet/odometer-status');
      setFleetOdometerStatus(data || []);
    } catch (err) {
      console.error("Failed to fetch fleet odometer status:", err);
      setFleetOdometerStatus([]);
    } finally {
      setIsLoadingFleetStatus(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchVehicles();
      if (isAdminOrManager) {
        fetchRejectedVehicles();
      }
      if (isFleetMode) {
        fetchActiveHandoffs();
        // SUPER_ADMIN bypasses permission check for fleet odometer status
        if (isSuperAdmin) {
          fetchFleetOdometerStatus();
        }
      }
    }
  }, [user, isAdminOrManager, isFleetMode, isSuperAdmin, fetchVehicles, fetchRejectedVehicles, fetchActiveHandoffs, fetchFleetOdometerStatus]);

  // Fetch organization visibility settings
  useEffect(() => {
    if (user) {
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

  // Show locked message if user doesn't have permission
  if (!canViewVehicles) {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
        <CardContent className="flex items-center gap-4 p-6">
          <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-100">
              Permission Required
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              You don't have permission to view vehicles. Please contact your organization administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleDeleteVehicle = async (vehicleId: string) => {
    try {
      await api.delete(`/vehicles/${vehicleId}`);
      setVehicles(vehicles.filter((v) => v.id !== vehicleId));
      setRejectedVehicles(rejectedVehicles.filter((v) => v.id !== vehicleId));
    } catch (err) {
      console.error("Failed to delete vehicle:", err);
      throw err;
    }
  };

  const handleViewDetails = (vehicle: Vehicle) => {
    setViewingVehicle(vehicle);
    setViewDetailsOpen(true);
  };

  const handleLockVehicle = async (vehicleId: string, reason?: string) => {
    try {
      await api.patch(
        `/vehicles/${vehicleId}/lock?reason=${encodeURIComponent(reason || "")}`,
        {},
      );
      setVehicles(
        vehicles.map((v) =>
          v.id === vehicleId
            ? {
                ...v,
                isLocked: true,
                lockedAt: new Date(),
                lockedReason: reason,
              }
            : v,
        ),
      );
    } catch (err) {
      console.error("Failed to lock vehicle:", err);
      throw err;
    }
  };

  const handleUnlockVehicle = async (vehicleId: string) => {
    try {
      await api.patch(`/vehicles/${vehicleId}/unlock`, {});
      setVehicles(
        vehicles.map((v) =>
          v.id === vehicleId
            ? {
                ...v,
                isLocked: false,
                lockedAt: undefined,
                lockedReason: undefined,
              }
            : v,
        ),
      );
    } catch (err) {
      console.error("Failed to unlock vehicle:", err);
      throw err;
    }
  };

  const handleApproveVehicle = async (vehicleId: string) => {
    try {
      await api.post(`/vehicles/${vehicleId}/approve-creation`, {});
      setVehicles(
        vehicles.map((v) =>
          v.id === vehicleId
            ? {
                ...v,
                status: VehicleStatus.ACTIVE,
              }
            : v,
        ),
      );
    } catch (err) {
      console.error("Failed to approve vehicle:", err);
      throw err;
    }
  };

  const handleRejectVehicle = async (vehicleId: string) => {
    setRejectingVehicleId(vehicleId);
    setRejectType('creation');
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleApproveDeletion = async (vehicleId: string) => {
    try {
      await api.post(`/vehicles/${vehicleId}/approve-deletion`, {});
      setVehicles(vehicles.filter((v) => v.id !== vehicleId));
    } catch (err) {
      console.error("Failed to approve deletion:", err);
      throw err;
    }
  };

  const handleRejectDeletion = async (vehicleId: string) => {
    setRejectingVehicleId(vehicleId);
    setRejectType('deletion');
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectingVehicleId) return;

    try {
      const url = rejectType === 'creation'
        ? `/vehicles/${rejectingVehicleId}/reject-creation?rejectionReason=${encodeURIComponent(rejectionReason)}`
        : `/vehicles/${rejectingVehicleId}/reject-deletion?rejectionReason=${encodeURIComponent(rejectionReason)}`;

      await api.post(url, null);

      if (rejectType === 'creation') {
        setVehicles(vehicles.filter((v) => v.id !== rejectingVehicleId));
      } else {
        setVehicles(
          vehicles.map((v) =>
            v.id === rejectingVehicleId
              ? {
                  ...v,
                  status: VehicleStatus.ACTIVE,
                }
              : v,
          ),
        );
      }
      setRejectDialogOpen(false);
      setRejectionReason('');
      setRejectingVehicleId(null);
    } catch (err) {
      console.error("Failed to reject:", err);
      throw err;
    }
  };

  const confirmedVehiclesCount = vehicles.filter(
    (vehicle) => vehicle.isLocked,
  ).length;

  const vehiclesSummaryItems = vehicles.length
    ? [
        {
          label: `${vehicles.length} vehicle${vehicles.length === 1 ? "" : "s"}`,
          tone: "activity" as const,
        },
        {
          label: `${confirmedVehiclesCount} confirmed`,
          tone:
            confirmedVehiclesCount > 0
              ? ("success" as const)
              : ("neutral" as const),
        },
        {
          label:
            vehicles.length === 1
              ? vehicles[0].registrationNumber
              : `${vehicles[0].registrationNumber} +${vehicles.length - 1} more`,
        },
      ]
    : [{ label: "No vehicles yet" }];

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-2 text-sm text-muted-foreground">
            Loading vehicles...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <p className="mt-2 text-muted-foreground">{error}</p>
          <Button onClick={fetchVehicles} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-4 pb-24 md:pb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">My Vehicles</h1>
        <div className="flex gap-2">
          {/* Export All - Fleet Assignment History */}
          <FleetAssignmentHistoryExportDialog
            triggerLabel="Export All"
            triggerVariant="outline"
          />
          {!isDriver && !isRentalCustomer && (
            <Button asChild>
              <Link href="/onboarding/add-vehicle">
                <Plus className="mr-2 h-4 w-4" />
                Add Vehicle
              </Link>
            </Button>
          )}
        </div>
      </div>

      <DashboardCollapsiblePanel
        panelId="vehicles-list"
        title="Vehicle list"
        description="Review your saved vehicles and open one when you need to edit or confirm it."
        tone="success"
        openLabel="Hide vehicles"
        closedLabel="Show vehicles"
        summaryItems={vehiclesSummaryItems}
      >
        {vehicles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Car className="h-16 w-16 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium text-muted-foreground">
                {isRentalCustomer ? "Vehicle not assigned" : (isDriver ? "No vehicles assigned to you" : "No vehicles yet")}
              </p>
              <p className="text-sm text-muted-foreground">
                {isRentalCustomer
                  ? "Vehicle has not been assigned; confirm with the representative that helped you that your vehicle gets assigned to you."
                  : (isDriver
                    ? "Contact your manager to assign a vehicle to you"
                    : "Add your first vehicle to start tracking expenses")}
              </p>
              {!isDriver && !isRentalCustomer && canAddVehicle && (
                <Button asChild className="mt-6">
                  <Link href="/onboarding/add-vehicle">Add Vehicle</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((vehicle) => {
              const activeHandoff = activeHandoffs[vehicle.id];
              return (
                <div key={vehicle.id}>
                  {activeHandoff && (
                    <HandoffStatusCard 
                      handoff={activeHandoff} 
                      onRefresh={fetchActiveHandoffs}
                    />
                  )}
                  <Card
                    className={cn(
                      "relative",
                      vehicle.isLocked && "border-amber-500/50",
                    )}
                  >
                {/* Status indicator */}
                {(vehicle.status === VehicleStatus.PENDING_CREATION || vehicle.status === VehicleStatus.PENDING_DELETION) && (
                  <div className="absolute top-3 right-3">
                    <Badge
                      variant="outline"
                      className={cn(
                        "border-amber-500/30 bg-amber-500/10 text-amber-600",
                        vehicle.status === VehicleStatus.PENDING_DELETION && "border-red-500/30 bg-red-500/10 text-red-600"
                      )}
                    >
                      <Clock className="mr-1 h-3 w-3" />
                      {vehicle.status === VehicleStatus.PENDING_CREATION ? "Pending Approval" : "Pending Deletion"}
                    </Badge>
                  </div>
                )}

                {/* Lock indicator */}
                {vehicle.isLocked && vehicle.status === VehicleStatus.ACTIVE && (
                  <div className="absolute top-3 right-3">
                    <Badge
                      variant="outline"
                      className="border-amber-500/30 bg-amber-500/10 text-amber-600"
                    >
                      <Lock className="mr-1 h-3 w-3" />
                      Confirmed
                    </Badge>
                  </div>
                )}

                {/* Rejection indicator */}
                {vehicle.rejectionReason && !vehicle.isActive && (
                  <div className="absolute top-3 right-3">
                    <Badge
                      variant="outline"
                      className="border-red-500/30 bg-red-500/10 text-red-600"
                    >
                      <X className="mr-1 h-3 w-3" />
                      Rejected
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <VehicleLogo make={vehicle.make} size="lg"  />
                    {vehicle.nickname || `${vehicle.make} ${vehicle.model}`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </p>
                    <p className="text-sm font-medium">
                      {vehicle.registrationNumber}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {vehicle.fuelType ? vehicle.fuelType.toLowerCase().replace("_", " ") : "N/A"}
                    </p>
                  </div>

                  {/* Odometer Reading */}
                  <div className="space-y-0.5">
                    <span className="text-xs text-muted-foreground">Odometer</span>
                    <p className="text-sm font-medium">
                      {vehicle.currentOdometer.toLocaleString()} km
                    </p>
                  </div>

                  {/* Image count indicator */}
                  {(vehicle.imageCount ?? 0) > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <ImageIcon className="h-3 w-3" />
                      <span>
                        {vehicle.imageCount} image
                        {vehicle.imageCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}

                  {/* Rejection reason display */}
                  {vehicle.rejectionReason && !vehicle.isActive && (
                    <div className="rounded-md bg-red-50 border border-red-200 p-2">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-red-800">Rejection Reason</p>
                          <p className="text-xs text-red-700 mt-1">{vehicle.rejectionReason}</p>
                          {vehicle.rejectedByName && (
                            <p className="text-xs text-red-600 mt-1">
                              Rejected by: {vehicle.rejectedByName}
                              {vehicle.rejectedAt && ` on ${new Date(vehicle.rejectedAt).toLocaleDateString()}`}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Handoff Status Card - fleet mode only */}
                  {isFleetMode && activeHandoffs[vehicle.id] && (
                    <HandoffStatusCard
                      handoff={activeHandoffs[vehicle.id]}
                      vehicleRegistration={vehicle.registrationNumber}
                      vehicleName={vehicle.nickname || `${vehicle.make} ${vehicle.model}`}
                      permissions={permissions}
                      userId={user?.id}
                      onRefresh={fetchActiveHandoffs}
                    />
                  )}

                  {/* Action buttons */}
                  <div className="border-t border-border/50 pt-2">
                    {/* Condition Report - available for both Fleet and Solo modes */}
                    {conditionReportEnabled && (
                      <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2 mb-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            setSelectedVehicleForFleet(vehicle);
                            if (isFleetMode) {
                              try {
                                const assignments = await getVehicleAssignments(vehicle.id);
                                const assignmentData = (assignments as any).data || assignments;
                                const assignmentArray = Array.isArray(assignmentData) ? assignmentData : (assignmentData as any).content || [];
                                const activeAssignment = assignmentArray.find((a: any) => a.status === 'ACTIVE');
                                if (activeAssignment) {
                                  setSelectedAssignmentId(activeAssignment.id);
                                  setConditionReportOpen(true);
                                } else {
                                  // Admin, Super Admin, Manager can investigate without assignment
                                  if (currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.SUPER_ADMIN || currentUserRole === UserRole.MANAGER) {
                                    alert('No active assignment found for this vehicle. You can still investigate as an admin/manager.');
                                    setSelectedAssignmentId(null);
                                    setConditionReportOpen(true);
                                  } else {
                                    alert('No active assignment found for this vehicle. Please assign this vehicle to a driver first.');
                                  }
                                }
                              } catch (error) {
                                console.error('Failed to fetch assignments:', error);
                                alert('Failed to fetch vehicle assignments. Please try again.');
                              }
                            } else {
                              // Solo mode - no assignment needed
                              setSelectedAssignmentId(null);
                              setConditionReportOpen(true);
                            }
                          }}
                        >
                          Condition Report
                        </Button>
                        {/* Odometer Confirmation - fleet mode only */}
                        {isFleetMode && odometerConfirmationEnabled && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              setSelectedVehicleForFleet(vehicle);
                              try {
                                const assignments = await getVehicleAssignments(vehicle.id);
                                const assignmentData = (assignments as any).data || assignments;
                                const assignmentArray = Array.isArray(assignmentData) ? assignmentData : (assignmentData as any).content || [];
                                const activeAssignment = assignmentArray.find((a: any) => a.status === 'ACTIVE');
                                if (activeAssignment) {
                                  setSelectedAssignmentId(activeAssignment.id);
                                  setOdometerConfirmationOpen(true);
                                } else {
                                  // Admin, Super Admin, Manager can investigate without assignment
                                  if (currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.SUPER_ADMIN || currentUserRole === UserRole.MANAGER) {
                                    alert('No active assignment found for this vehicle. You can still investigate as an admin/manager.');
                                    setSelectedAssignmentId(null);
                                    setOdometerConfirmationOpen(true);
                                  } else {
                                    alert('No active assignment found for this vehicle. Please assign this vehicle to a driver first.');
                                  }
                                }
                              } catch (error) {
                                console.error('Failed to fetch assignments:', error);
                                alert('Failed to fetch vehicle assignments. Please try again.');
                              }
                            }}
                          >
                            Odometer
                          </Button>
                        )}
                      </div>
                    )}

                    
                    {/* Handoff button - fleet mode only, no active handoff */}
                    {isFleetMode && !activeHandoffs[vehicle.id] && !isDriver && permissions?.["VEHICLE_ASSIGNMENT"]?.["ASSIGN_VEHICLES"] && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedVehicleForHandoff(vehicle);
                          setHandoffDialogOpen(true);
                        }}
                      >
                        Handoff Vehicle
                      </Button>
                    )}
                    
                    {!isDriver && (
                      <>
                        {/* Approval buttons for pending vehicles (admin only) */}
                        {currentUserRole === UserRole.ADMIN && (vehicle.status === VehicleStatus.PENDING_CREATION || vehicle.status === VehicleStatus.PENDING_DELETION) ? (
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="col-span-2"
                              onClick={() => handleViewDetails(vehicle)}
                            >
                              <Eye className="mr-1 h-3 w-3" />
                              View Details
                            </Button>
                            {vehicle.status === VehicleStatus.PENDING_CREATION ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleApproveVehicle(vehicle.id)}
                                >
                                  <Check className="mr-1 h-3 w-3" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleRejectVehicle(vehicle.id)}
                                >
                                  <X className="mr-1 h-3 w-3" />
                                  Reject
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="px-2 text-xs"
                                  onClick={() => handleApproveDeletion(vehicle.id)}
                                >
                                  <Check className="mr-1 h-3 w-3" />
                                  <span className="flex flex-col leading-tight">
                                    <span>Approve</span>
                                    <span>Delete</span>
                                  </span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="px-2"
                                  onClick={() => handleRejectDeletion(vehicle.id)}
                                >
                                  <X className="mr-1 h-3 w-3" />
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        ) : (
                          /* Standard actions for active vehicles */
                          <EntryActions
                            entryId={vehicle.id}
                            entryType="vehicle"
                            isLocked={vehicle.isLocked ?? false}
                            lockedAt={vehicle.lockedAt}
                            lockedByName={vehicle.lockedByName}
                            lockedReason={vehicle.lockedReason}
                            onEdit={() => router.push(`/dashboard/vehicles/${vehicle.id}/edit`)}
                            onDelete={() => handleDeleteVehicle(vehicle.id)}
                            onLock={(reason) => handleLockVehicle(vehicle.id, reason)}
                            onUnlock={() => handleUnlockVehicle(vehicle.id)}
                            variant="icons"
                          />
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
                </div>
              );
            })}
          </div>
        )}
      </DashboardCollapsiblePanel>

      {/* Fleet Odometer Status - Fleet mode only, SUPER_ADMIN or with VIEW_FLEET_STATUS permission */}
      {isFleetMode && (isSuperAdmin || permissions?.['FLEET_STATUS']?.['VIEW_FLEET_STATUS']) && (
        <DashboardCollapsiblePanel
          panelId="fleet-odometer-status"
          title="Fleet Odometer Status"
          description="View current odometer readings and assignment status for all vehicles in your fleet."
          tone="info"
          openLabel="Hide fleet status"
          closedLabel="Show fleet status"
          summaryItems={[
            {
              label: `${fleetOdometerStatus.length} vehicle${fleetOdometerStatus.length === 1 ? '' : 's'}`,
              tone: "info" as const,
            },
          ]}
          defaultOpen={false}
        >
          <FleetOdometerStatusTable
            data={fleetOdometerStatus}
            permissions={permissions}
          />
        </DashboardCollapsiblePanel>
      )}

      {/* Rejected Vehicles Section - Only for Admins and Managers */}
      {!isDriver && rejectedVehicles.length > 0 && (
        <DashboardCollapsiblePanel
          panelId="rejected-vehicles"
          title="Rejected Vehicles"
          description="View vehicles that were rejected by admin with rejection reasons."
          tone="warning"
          openLabel="Hide rejected vehicles"
          closedLabel="Show rejected vehicles"
          summaryItems={[
            {
              label: `${rejectedVehicles.length} rejected vehicle${rejectedVehicles.length === 1 ? "" : "s"}`,
              tone: "warning" as const,
            },
          ]}
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rejectedVehicles.map((vehicle) => (
              <Card
                key={vehicle.id}
                className="border-red-500/50 bg-red-50/50"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <VehicleLogo make={vehicle.make} size="lg"  />
                      {vehicle.nickname || `${vehicle.make} ${vehicle.model}`}
                    </CardTitle>
                    <Badge variant="destructive">
                      <X className="mr-1 h-3 w-3" />
                      Rejected
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      {vehicle.registrationNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </p>
                  </div>

                  {/* Rejection reason display */}
                  {vehicle.rejectionReason && (
                    <div className="rounded-md bg-red-100 border border-red-200 p-3">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-red-800">Rejection Reason</p>
                          <p className="text-sm text-red-700 mt-1">{vehicle.rejectionReason}</p>
                          {vehicle.rejectedByName && (
                            <p className="text-xs text-red-600 mt-2">
                              Rejected by: {vehicle.rejectedByName}
                              {vehicle.rejectedAt && ` on ${new Date(vehicle.rejectedAt).toLocaleDateString()}`}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/onboarding/add-vehicle?edit=${vehicle.id}`)}
                    >
                      Edit & Resubmit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteVehicle(vehicle.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DashboardCollapsiblePanel>
      )}

      {/* Rejection Reason Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {rejectType === 'creation' ? 'Reject Vehicle Creation' : 'Reject Vehicle Deletion'}
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this {rejectType === 'creation' ? 'vehicle creation request' : 'deletion request'}. This will help the manager understand what needs to be changed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Explain why this request is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmReject} disabled={!rejectionReason.trim()}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vehicle Details Dialog */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vehicle Details</DialogTitle>
            <DialogDescription>
              Review all vehicle information before approving or rejecting.
            </DialogDescription>
          </DialogHeader>
          {viewingVehicle && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Registration Number</span>
                  <p className="font-medium">{viewingVehicle.registrationNumber}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Year</span>
                  <p className="font-medium">{viewingVehicle.year}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Make</span>
                  <p className="font-medium">{viewingVehicle.make}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Model</span>
                  <p className="font-medium">{viewingVehicle.model}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Nickname</span>
                  <p className="font-medium">{viewingVehicle.nickname || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Color</span>
                  <p className="font-medium">{viewingVehicle.color || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Fuel Type</span>
                  <p className="font-medium">{viewingVehicle.fuelType?.toLowerCase().replace('_', ' ') || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Tank Capacity</span>
                  <p className="font-medium">{viewingVehicle.tankCapacityLiters ? `${viewingVehicle.tankCapacityLiters}L` : 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">VIN</span>
                  <p className="font-medium">{viewingVehicle.vin || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">License Expiry</span>
                  <p className="font-medium">{viewingVehicle.licenseExpiry ? new Date(viewingVehicle.licenseExpiry).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Insurance Policy Number</span>
                  <p className="font-medium">{viewingVehicle.insurancePolicyNumber || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Tracker Serial</span>
                  <p className="font-medium">{viewingVehicle.trackerSerial || 'N/A'}</p>
                </div>
                <div className="space-y-1 col-span-2">
                  <span className="text-xs text-muted-foreground">Notes</span>
                  <p className="font-medium">{viewingVehicle.notes || 'N/A'}</p>
                </div>
              </div>
              <div className="border-t pt-4">
                <span className="text-xs text-muted-foreground">Status</span>
                <Badge className="ml-2">
                  {viewingVehicle.status === VehicleStatus.PENDING_CREATION ? 'Pending Creation' :
                   viewingVehicle.status === VehicleStatus.PENDING_DELETION ? 'Pending Delete' :
                   viewingVehicle.status === VehicleStatus.ACTIVE ? 'Active' : viewingVehicle.status}
                </Badge>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fleet: Vehicle Condition Report Dialog */}
      <Dialog open={conditionReportOpen} onOpenChange={setConditionReportOpen}>
        <DialogContent className="max-w-[100vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-[80vw] xl:max-w-[75vw] max-h-[100vh] sm:max-h-[90vh] overflow-y-auto p-0 sm:p-6">
          <DialogHeader className="p-4 sm:p-6 border-b">
            <DialogTitle className="text-lg sm:text-xl">Vehicle Condition Report</DialogTitle>
            <DialogDescription className="text-sm">
              Document the condition of {selectedVehicleForFleet?.nickname || selectedVehicleForFleet?.make + ' ' + selectedVehicleForFleet?.model}
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 sm:p-6">
            {selectedVehicleForFleet && (
              <VehicleConditionReport
                assignmentId={isFleetMode && selectedAssignmentId ? selectedAssignmentId : null}
                vehicleId={!isFleetMode || !selectedAssignmentId ? selectedVehicleForFleet.id : null}
                vehicleName={selectedVehicleForFleet?.nickname || `${selectedVehicleForFleet?.make} ${selectedVehicleForFleet?.model}`}
                onComplete={() => setConditionReportOpen(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Fleet: Odometer Confirmation Dialog */}
      <Dialog open={odometerConfirmationOpen} onOpenChange={setOdometerConfirmationOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Odometer Confirmation</DialogTitle>
            <DialogDescription>
              Confirm the odometer reading for {selectedVehicleForFleet?.nickname || selectedVehicleForFleet?.make + ' ' + selectedVehicleForFleet?.model}
            </DialogDescription>
          </DialogHeader>
          {selectedVehicleForFleet && selectedAssignmentId ? (
            <OdometerConfirmationForm
              assignmentId={selectedAssignmentId}
              vehicleName={selectedVehicleForFleet.nickname || `${selectedVehicleForFleet.make} ${selectedVehicleForFleet.model}`}
              onComplete={() => setOdometerConfirmationOpen(false)}
              onOdometerUpdate={(newReading) => {
                setVehicles(
                  vehicles.map((v) =>
                    v.id === selectedVehicleForFleet?.id
                      ? { ...v, currentOdometer: newReading }
                      : v
                  )
                )
              }}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Unable to load odometer confirmation form. Please try again.
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Fleet: Handoff Dialog */}
      <HandoffDialog
        open={handoffDialogOpen}
        onOpenChange={setHandoffDialogOpen}
        vehicleId={selectedVehicleForHandoff?.id || ''}
        vehicleRegistration={selectedVehicleForHandoff?.registrationNumber || ''}
        permissions={permissions}
        onSuccess={() => {
          setHandoffDialogOpen(false);
          fetchActiveHandoffs();
        }}
      />
    </div>
  );
}
