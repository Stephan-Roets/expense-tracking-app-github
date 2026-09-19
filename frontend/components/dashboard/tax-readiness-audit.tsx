"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle2,
  XCircle,
  Camera,
  MapPin,
  Clock,
  Car,
  Calendar,
  ExternalLink,
  AlertTriangle,
  Pencil,
  Trash2,
  Lock,
  Unlock,
  Upload,
  RefreshCw,
} from "lucide-react";
import { VehicleLogo } from "@/components/vehicles/vehicle-logo";
import { cn } from "@/lib/utils";
import {
  OdometerReadingType,
  getTaxYearReadingWindow,
  getSATaxYear,
} from "@/lib/types/database";
import type { EntryImage } from "@/lib/types/database";
import { api, API_URL, apiForm } from "@/lib/api/client";
import { ImageCropModal } from "@/components/ui/image-crop-modal";
import { useAuth } from "@/lib/contexts/auth-context";
import { usePermissions } from "@/hooks/usePermissions";

interface OdometerVerificationRecord {
  id: string;
  vehicleId: string;
  vehicleReg: string;
  vehicleMake: string;
  taxYear: number;
  readingType: OdometerReadingType;
  odometerValue: number;
  imageUrlAvif: string;
  capturedAt: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  createdAt: string;
  // Lock fields
  isLocked?: boolean;
  lockedAt?: Date;
  lockedByName?: string;
  lockedReason?: string;
}

interface TaxReadinessAuditProps {
  className?: string;
}

/**
 * Tax Readiness Audit View
 *
 * Displays the time-stamped opening and closing odometer photos for each tax year.
 * Provides a visual audit trail for SARS compliance with edit, delete, and lock capabilities.
 */
export function TaxReadinessAudit({ className }: TaxReadinessAuditProps) {
  const { user } = useAuth();
  const { data: permissions } = usePermissions(user?.organizationId || "");
  const currentUserRole = user?.role;
  const assistantRole = user?.assistantRole;
  const effectiveRole = currentUserRole === 'ASSISTANT' ? assistantRole : currentUserRole;
  const router = useRouter();
  
  const [selectedYear, setSelectedYear] = useState<number>(getSATaxYear());
  const [verifications, setVerifications] = useState<
    OdometerVerificationRecord[]
  >([]);
  const [vehicles, setVehicles] = useState<
    Array<{ id: string; registrationNumber: string; make: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

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
    if (currentUserRole === 'SUPER_ADMIN') return true
    
    if (!permissions || !effectiveRole) return false

    // Check for overrides first
    const addOpeningOverride = permissions.find(
      (p: any) => p.permissionType === 'TAX_AUDIT' &&
                  p.permissionKey === 'ADD_OPENING_READING' &&
                  p.userRole === effectiveRole
    )
    const addClosingOverride = permissions.find(
      (p: any) => p.permissionType === 'TAX_AUDIT' &&
                  p.permissionKey === 'ADD_CLOSING_READING' &&
                  p.userRole === effectiveRole
    )
    const editOverride = permissions.find(
      (p: any) => p.permissionType === 'TAX_AUDIT' &&
                  p.permissionKey === 'EDIT_READINGS' &&
                  p.userRole === effectiveRole
    )
    const deleteOverride = permissions.find(
      (p: any) => p.permissionType === 'TAX_AUDIT' &&
                  p.permissionKey === 'DELETE_READINGS' &&
                  p.userRole === effectiveRole
    )
    const viewOverride = permissions.find(
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

  // Check if current user has permission to add readings
  const canAddReadings = () => {
    // SUPER_ADMIN bypasses everything
    if (currentUserRole === 'SUPER_ADMIN') return true
    
    if (!permissions || !effectiveRole) return false

    const addOpeningOverride = permissions.find(
      (p: any) => p.permissionType === 'TAX_AUDIT' &&
                  p.permissionKey === 'ADD_OPENING_READING' &&
                  p.userRole === effectiveRole
    )
    const addClosingOverride = permissions.find(
      (p: any) => p.permissionType === 'TAX_AUDIT' &&
                  p.permissionKey === 'ADD_CLOSING_READING' &&
                  p.userRole === effectiveRole
    )

    if (addOpeningOverride !== undefined) return addOpeningOverride.isAllowed
    if (addClosingOverride !== undefined) return addClosingOverride.isAllowed

    return TAX_AUDIT_DEFAULTS.ADD_OPENING_READING.includes(effectiveRole) ||
           TAX_AUDIT_DEFAULTS.ADD_CLOSING_READING.includes(effectiveRole)
  }

  // Check if current user has permission to edit readings
  const canEditReadings = () => {
    // SUPER_ADMIN bypasses everything
    if (currentUserRole === 'SUPER_ADMIN') return true
    
    if (!permissions || !effectiveRole) return false

    const editOverride = permissions.find(
      (p: any) => p.permissionType === 'TAX_AUDIT' &&
                  p.permissionKey === 'EDIT_READINGS' &&
                  p.userRole === effectiveRole
    )

    if (editOverride !== undefined) return editOverride.isAllowed

    return TAX_AUDIT_DEFAULTS.EDIT_READINGS.includes(effectiveRole)
  }

  // Check if current user has permission to delete readings
  const canDeleteReadings = () => {
    // SUPER_ADMIN bypasses everything
    if (currentUserRole === 'SUPER_ADMIN') return true
    
    if (!permissions || !effectiveRole) return false

    const deleteOverride = permissions.find(
      (p: any) => p.permissionType === 'TAX_AUDIT' &&
                  p.permissionKey === 'DELETE_READINGS' &&
                  p.userRole === effectiveRole
    )

    if (deleteOverride !== undefined) return deleteOverride.isAllowed

    return TAX_AUDIT_DEFAULTS.DELETE_READINGS.includes(effectiveRole)
  }

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'SUPER_ADMIN';

  const { isOpeningWindow, isClosingWindow } = getTaxYearReadingWindow();

  // Generate available tax years (last 5 years)
  const currentYear = getSATaxYear();
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Redirect if user doesn't have permission to view tax audit
  useEffect(() => {
    if (permissions && effectiveRole && !canViewTaxAudit()) {
      router.push('/dashboard');
    }
  }, [permissions, effectiveRole, router]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch all vehicles
      const { data: vehiclesData } = await api.get("/vehicles");
      const vehicleList = Array.isArray(vehiclesData) ? vehiclesData : [];
      setVehicles(
        vehicleList.map((v: any) => ({
          id: String(v.id),
          registrationNumber: String(v.registrationNumber ?? ""),
          make: String(v.make ?? ""),
        })),
      );

      // Fetch verifications
      const { data } = await api.get(
        `/compliance/odometer?taxYear=${selectedYear}`,
      );
      const rows = Array.isArray(data) ? data : [];

      const mapped: OdometerVerificationRecord[] = rows.map((v: any) => {
        const id = String(v.id);

        let lockedAt: Date | undefined;
        if (v.lockedAt) {
          const d = new Date(String(v.lockedAt));
          if (!Number.isNaN(d.getTime())) {
            lockedAt = d;
          }
        }

        return {
          id,
          vehicleId: String(v.vehicleId),
          vehicleReg: String(v.vehicleReg ?? ""),
          vehicleMake: String(v.vehicleMake ?? ""),
          taxYear: Number(v.taxYear),
          readingType: v.readingType as OdometerReadingType,
          odometerValue: Number(v.odometerValue),
          imageUrlAvif: String(v.imageUrl ?? ""),
          capturedAt: String(v.capturedAt ?? ""),
          createdAt: String(v.capturedAt ?? ""),
          isLocked: typeof v.isLocked === "boolean" ? v.isLocked : undefined,
          lockedAt,
          lockedByName: v.lockedByName ? String(v.lockedByName) : undefined,
          lockedReason: v.lockedReason ? String(v.lockedReason) : undefined,
        };
      });

      setVerifications(mapped);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  // Group verifications by vehicle and include all vehicles
  const vehicleVerifications = vehicles.reduce(
    (acc, v) => {
      acc[v.id] = {
        vehicleReg: v.registrationNumber,
        vehicleMake: v.make,
        opening: undefined,
        closing: undefined,
      };
      return acc;
    },
    {} as Record<
      string,
      {
        vehicleReg: string;
        vehicleMake: string;
        opening?: OdometerVerificationRecord;
        closing?: OdometerVerificationRecord;
      }
    >,
  );

  // Merge verifications into vehicle map
  verifications.forEach((v) => {
    if (!vehicleVerifications[v.vehicleId]) {
      vehicleVerifications[v.vehicleId] = {
        vehicleReg: v.vehicleReg,
        vehicleMake: v.vehicleMake || 'Unknown',
        opening: undefined,
        closing: undefined,
      };
    }
    if (v.readingType === OdometerReadingType.OPENING) {
      vehicleVerifications[v.vehicleId].opening = v;
    } else {
      vehicleVerifications[v.vehicleId].closing = v;
    }
  });

  const displayVehicles = Object.entries(vehicleVerifications);

  const handleDeleteVerification = async (verificationId: string) => {
    try {
      await api.delete(`/odometer-verifications/${verificationId}`);
      setVerifications((prev) => prev.filter((v) => v.id !== verificationId));
    } catch (error) {
      console.error("Failed to delete verification:", error);
      throw error;
    }
  };

  const handleLockVerification = async (
    verificationId: string,
    reason?: string,
  ) => {
    try {
      const { data } = await api.post(
        `/odometer-verifications/${verificationId}/lock?reason=${encodeURIComponent(reason ?? "")}`,
        {},
      );
      setVerifications((prev) =>
        prev.map((v) =>
          v.id === String((data as any).id)
            ? {
                ...v,
                isLocked: Boolean((data as any).isLocked ?? true),
                lockedAt: (data as any).lockedAt
                  ? new Date(String((data as any).lockedAt))
                  : undefined,
                lockedReason: (data as any).lockedReason
                  ? String((data as any).lockedReason)
                  : undefined,
                lockedByName: (data as any).lockedByName
                  ? String((data as any).lockedByName)
                  : v.lockedByName,
              }
            : v,
        ),
      );
    } catch (err) {
      console.error("Failed to lock verification:", err);
      throw err;
    }
  };

  const handleUnlockVerification = async (verificationId: string) => {
    try {
      const { data } = await api.post(
        `/odometer-verifications/${verificationId}/unlock`,
        {},
      );
      setVerifications((prev) =>
        prev.map((v) =>
          v.id === String((data as any).id)
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
      console.error("Failed to unlock verification:", err);
      throw err;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Tax Readiness Audit
            </CardTitle>
            <CardDescription>
              Review your SARS-compliant odometer verification photos
            </CardDescription>
          </div>
          <Select
            value={selectedYear.toString()}
            onValueChange={(v) => setSelectedYear(parseInt(v))}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}/{year + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="font-medium text-sm">
            Important for SARS tax completion
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Make sure your{" "}
            <span className="font-medium text-foreground">OPENING Reading</span>{" "}
            has both the odometer image and the actual odometer reading. If
            everything is correct, lock it so it moves from pending to a
            confirmed opening record for the tax year. Then add the{" "}
            <span className="font-medium text-foreground">CLOSING Reading</span>{" "}
            odometer reading and image at the end of the tax year to complete
            your SARS tax records.
          </p>
        </div>

        {/* Current Window Status */}
        {(isOpeningWindow || isClosingWindow) && (
          <div
            className={cn(
              "flex items-center gap-3 p-4 rounded-lg",
              isOpeningWindow
                ? "bg-blue-500/10 text-blue-600"
                : "bg-orange-500/10 text-orange-600",
            )}
          >
            <AlertTriangle className="h-5 w-5" />
            <div>
              <p className="font-medium">
                {isOpeningWindow
                  ? "Opening Reading Window Active"
                  : "Closing Reading Window Active"}
              </p>
              <p className="text-sm opacity-80">
                {isOpeningWindow
                  ? "Submit your opening odometer reading for the new tax year in March."
                  : "Submit your closing odometer reading for the current tax year in February."}
              </p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {displayVehicles.map(([vehicleId, data]) => (
              <VehicleVerificationCard
                key={vehicleId}
                vehicleId={vehicleId as string}
                vehicleReg={data.vehicleReg}
                vehicleMake={data.vehicleMake}
                opening={data.opening}
                closing={data.closing}
                taxYear={selectedYear}
                onDelete={handleDeleteVerification}
                onLock={handleLockVerification}
                onUnlock={handleUnlockVerification}
                onRefresh={fetchData}
                isAdminOrManager={isAdminOrManager}
                canAddReadings={canAddReadings()}
                canEditReadings={canEditReadings()}
                canDeleteReadings={canDeleteReadings()}
              />
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="border-t pt-4 mt-6">
          <p className="text-xs text-muted-foreground mb-2">Reading status:</p>
          <div className="flex flex-wrap gap-4 text-xs">
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-3 w-3" /> Submitted
            </span>
            <span className="flex items-center gap-1 text-yellow-600">
              <AlertTriangle className="h-3 w-3" /> Needs confirmation
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <XCircle className="h-3 w-3" /> Missing
            </span>
            <span className="flex items-center gap-1 text-amber-600">
              <Lock className="h-3 w-3" /> Confirmed
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface VehicleVerificationCardProps {
  vehicleId: string;
  vehicleReg: string;
  vehicleMake: string;
  opening?: OdometerVerificationRecord;
  closing?: OdometerVerificationRecord;
  taxYear: number;
  onDelete: (id: string) => Promise<void>;
  onLock: (id: string, reason?: string) => Promise<void>;
  onUnlock: (id: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  isAdminOrManager: boolean;
  canAddReadings: boolean;
  canEditReadings: boolean;
  canDeleteReadings: boolean;
}

function VehicleVerificationCard({
  vehicleId,
  vehicleReg,
  vehicleMake,
  opening,
  closing,
  taxYear,
  onDelete,
  onLock,
  onUnlock,
  onRefresh,
  isAdminOrManager,
  canAddReadings,
  canEditReadings,
  canDeleteReadings,
}: VehicleVerificationCardProps) {
  return (
    <div className="border rounded-lg overflow-hidden w-full" style={{ maxWidth: '100%', overflow: 'hidden' }}>
      {/* Vehicle Header */}
      <div className="bg-muted/50 px-4 py-3 flex items-center justify-between w-full overflow-hidden">
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <VehicleLogo make={vehicleMake} size="sm" />
          <span className="font-medium truncate">{vehicleReg}</span>
        </div>
        <Badge variant={opening && closing ? "default" : "secondary"} className="shrink-0">
          {opening && closing
            ? "Both readings added"
            : opening || closing
              ? "One reading added"
              : "No readings yet"}
        </Badge>
      </div>

      {/* Readings Grid */}
      <div className="flex flex-col md:flex-row w-full overflow-hidden" style={{ maxWidth: '100%', overflow: 'hidden' }}>
        <div className="w-full md:w-1/2 min-w-0 overflow-hidden border-r-0 md:border-r border-border" style={{ maxWidth: '50%', width: '50%', flex: '0 0 auto', overflow: 'hidden', isolation: 'isolate' }}>
          <div className="w-full overflow-hidden" style={{ maxWidth: '100%', overflow: 'hidden' }}>
            <ReadingCard
              type="OPENING"
              vehicleId={vehicleId}
              record={opening}
              taxYear={taxYear}
              onDelete={onDelete}
              onLock={onLock}
              onUnlock={onUnlock}
              onRefresh={onRefresh}
              isAdminOrManager={isAdminOrManager}
              canAddReadings={canAddReadings}
              canEditReadings={canEditReadings}
              canDeleteReadings={canDeleteReadings}
            />
          </div>
        </div>
        <div className="w-full md:w-1/2 min-w-0 overflow-hidden" style={{ maxWidth: '50%', width: '50%', flex: '0 0 auto', overflow: 'hidden', isolation: 'isolate' }}>
          <div className="w-full overflow-hidden" style={{ maxWidth: '100%', overflow: 'hidden' }}>
            <ReadingCard
              type="CLOSING"
              vehicleId={vehicleId}
              record={closing}
              taxYear={taxYear}
              onDelete={onDelete}
              onLock={onLock}
              onUnlock={onUnlock}
              onRefresh={onRefresh}
              isAdminOrManager={isAdminOrManager}
              canAddReadings={canAddReadings}
              canEditReadings={canEditReadings}
              canDeleteReadings={canDeleteReadings}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface ReadingCardProps {
  type: "OPENING" | "CLOSING";
  vehicleId: string;
  record?: OdometerVerificationRecord;
  taxYear: number;
  onDelete: (id: string) => Promise<void>;
  onLock: (id: string, reason?: string) => Promise<void>;
  onUnlock: (id: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  isAdminOrManager: boolean;
  canAddReadings: boolean;
  canEditReadings: boolean;
  canDeleteReadings: boolean;
}

function ReadingCard({
  type,
  vehicleId,
  record,
  taxYear,
  onDelete,
  onLock,
  onUnlock,
  onRefresh,
  isAdminOrManager,
  canAddReadings,
  canEditReadings,
  canDeleteReadings,
}: ReadingCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLockDialog, setShowLockDialog] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [lockReason, setLockReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editOdometerValue, setEditOdometerValue] = useState<string>("");
  const [editCapturedAtLocal, setEditCapturedAtLocal] = useState<string>("");
  const router = useRouter();

  const isOpening = type === "OPENING";
  const expectedMonth = isOpening ? "March" : "February";
  const expectedYear = isOpening ? taxYear : taxYear + 1;
  const isLocked = record?.isLocked ?? false;

  useEffect(() => {
    if (record && showEditDialog) {
      setEditOdometerValue(
        typeof record.odometerValue === "number" &&
          !Number.isNaN(record.odometerValue)
          ? String(record.odometerValue)
          : "",
      );

      if (record.capturedAt) {
        const d = new Date(record.capturedAt);
        if (!Number.isNaN(d.getTime())) {
          const tzOffsetMs = d.getTimezoneOffset() * 60000;
          const local = new Date(d.getTime() - tzOffsetMs)
            .toISOString()
            .slice(0, 16);
          setEditCapturedAtLocal(local);
        } else {
          setEditCapturedAtLocal("");
        }
      } else {
        setEditCapturedAtLocal("");
      }
    }
  }, [record, showEditDialog]);

  const handleDelete = async () => {
    if (!record) return;
    setIsProcessing(true);
    try {
      await onDelete(record.id);
      setShowDeleteDialog(false);
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLock = async () => {
    if (!record) return;
    setIsProcessing(true);
    try {
      await onLock(record.id, lockReason || undefined);
      setShowLockDialog(false);
      setLockReason("");
    } catch (err) {
      console.error("Failed to lock:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnlock = async () => {
    if (!record) return;
    setIsProcessing(true);
    try {
      await onUnlock(record.id);
      setShowUnlockDialog(false);
    } catch (err) {
      console.error("Failed to unlock:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!record) return;
    setIsProcessing(true);
    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append("photo", selectedFile);

        const { data } = await apiForm.post(
          `/compliance/odometer/${record.id}/photo`,
          formData,
        );

        (record as any).imageUrlAvif = String(
          (data as any)?.imageUrl ?? record.imageUrlAvif,
        );
        if ((data as any)?.capturedAt) {
          (record as any).capturedAt = String((data as any).capturedAt);
        }
      }

      const payload: Record<string, unknown> = {};

      const trimmedOdo = editOdometerValue.trim();
      if (trimmedOdo.length > 0) {
        const numericOdo = Number(trimmedOdo.replace(/,/g, ""));
        if (!Number.isNaN(numericOdo)) {
          payload.odometerValue = numericOdo;
        }
      }

      if (editCapturedAtLocal) {
        const localDate = new Date(editCapturedAtLocal);
        if (!Number.isNaN(localDate.getTime())) {
          payload.capturedAt = localDate.toISOString();
        }
      }

      if (Object.keys(payload).length > 0) {
        const { data: updated } = await api.patch(
          `/compliance/odometer/${record.id}`,
          payload,
        );

        if ((updated as any)?.odometerValue != null) {
          (record as any).odometerValue = Number(
            (updated as any).odometerValue,
          );
        }
        if ((updated as any)?.capturedAt) {
          (record as any).capturedAt = String((updated as any).capturedAt);
        }
      }

      setShowEditDialog(false);
      setSelectedFile(null);
      // Refresh data to show updated image
      await onRefresh();
    } catch (err) {
      console.error("Failed to save odometer changes:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setShowCropModal(true);
    }
  };

  const handleCropConfirm = (croppedFile: File) => {
    setSelectedFile(croppedFile);
    setShowCropModal(false);
  };

  return (
    <div className="p-4 w-full" style={{ maxWidth: '100%', overflow: 'hidden', minWidth: '0' }}>
      {/* Hidden file input */}
      <label htmlFor="tax-audit-file-upload" className="sr-only">
        Upload Tax Audit Photo
      </label>
      <input
        ref={fileInputRef}
        id="tax-audit-file-upload"
        name="tax-audit-file-upload"
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex items-center justify-between mb-3 w-full overflow-hidden">
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <span
            className={cn(
              "text-sm font-medium truncate",
              record ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {type} Reading
          </span>
          {record ? (
            isLocked ? (
              <Lock className="h-4 w-4 text-amber-500 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            )
          ) : (
            <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </div>
        <span className="text-xs text-muted-foreground shrink-0">
          {expectedMonth} {expectedYear}
        </span>
      </div>

      {record ? (
        <div className="space-y-3 w-full overflow-hidden" style={{ minWidth: '0' }}>
          {/* Photo Thumbnail */}
          <div className="aspect-video bg-muted rounded-lg overflow-hidden relative group w-full" style={{ minWidth: '0' }}>
            <img
              src={record.imageUrlAvif}
              alt={`${type} odometer reading`}
              className="w-full h-full object-cover"
              style={{ maxWidth: '100%', minWidth: '0' }}
              onError={(e) => {
                // Fallback for missing images in demo
                (e.target as HTMLImageElement).src =
                  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60"%3E%3Crect fill="%23374151" width="100" height="60"/%3E%3Ctext x="50" y="35" text-anchor="middle" fill="%239CA3AF" font-size="8"%3EOdometer Photo%3C/text%3E%3C/svg%3E';
              }}
            />

            {/* Lock indicator on image */}
            {isLocked && (
              <div className="absolute top-2 right-2 bg-amber-500 rounded-full p-1.5">
                <Lock className="h-3 w-3 text-white" />
              </div>
            )}

            {/* Action buttons overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10 w-full h-full overflow-hidden">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="!flex-none h-8 w-8 shrink-0"
                onClick={() => window.open(record.imageUrlAvif, "_blank")}
                title="View full image"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              {!isLocked && canEditReadings && (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="!flex-none h-8 w-8 shrink-0"
                  onClick={() => setShowEditDialog(true)}
                  title="Edit reading / Replace photo"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {!isLocked && canDeleteReadings && (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="!flex-none h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  title="Delete reading"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              {isAdminOrManager && (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="!flex-none h-8 w-8 shrink-0"
                  onClick={() =>
                    isLocked ? setShowUnlockDialog(true) : setShowLockDialog(true)
                  }
                  title={
                    isLocked ? "Re-open record for editing" : "Confirm record"
                  }
                >
                  {isLocked ? (
                    <Unlock className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Reading Details */}
          <div className="space-y-2 text-sm w-full overflow-hidden">
            <div className="flex items-center justify-between w-full overflow-hidden">
              <span className="text-muted-foreground shrink-0">Odometer:</span>
              <span className="font-mono font-medium truncate">
                {record.odometerValue.toLocaleString()} km
              </span>
            </div>
            <div className="flex items-center justify-between w-full overflow-hidden">
              <span className="text-muted-foreground flex items-center gap-1 shrink-0">
                <Clock className="h-3 w-3" />
                Captured:
              </span>
              <span className="text-xs truncate">
                {new Date(record.capturedAt).toLocaleString("en-ZA")}
              </span>
            </div>
            {record.gpsLatitude && record.gpsLongitude && (
              <div className="flex items-center justify-between w-full overflow-hidden">
                <span className="text-muted-foreground flex items-center gap-1 shrink-0">
                  <MapPin className="h-3 w-3" />
                  Location:
                </span>
                <a
                  href={`https://maps.google.com/?q=${record.gpsLatitude},${record.gpsLongitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline truncate"
                >
                  View on Map
                </a>
              </div>
            )}
            {isLocked && record.lockedReason && (
              <div className="flex items-center justify-between w-full overflow-hidden">
                <span className="text-muted-foreground flex items-center gap-1 shrink-0">
                  <Lock className="h-3 w-3" />
                  Confirmation note:
                </span>
                <span className="text-xs text-amber-600 truncate">
                  {record.lockedReason}
                </span>
              </div>
            )}
          </div>

          {/* Action buttons below image */}
          <div className="flex flex-col gap-2 pt-2 border-t w-full overflow-hidden">
            {!isLocked && canEditReadings && (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 !flex-none"
                onClick={() => setShowEditDialog(true)}
                title="Edit"
              >
                <Pencil className="h-3 w-3 mr-1 shrink-0" />
                <span className="truncate">Edit</span>
              </Button>
            )}
            {isAdminOrManager && (
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-full h-8 !flex-none",
                  isLocked && "text-amber-600 hover:text-amber-700",
                )}
                onClick={() =>
                  isLocked ? setShowUnlockDialog(true) : setShowLockDialog(true)
                }
                title={isLocked ? "Re-open for editing" : "Confirm record"}
              >
                {isLocked ? (
                  <>
                    <Unlock className="h-3 w-3 mr-1 shrink-0" />
                    <span className="truncate">Re-open</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3 mr-1 shrink-0" />
                    <span className="truncate">Confirm record</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="aspect-video bg-muted/50 rounded-lg flex flex-col items-center justify-center text-muted-foreground">
          <Camera className="h-8 w-8 mb-2 opacity-50" />
          <span className="text-sm">No reading submitted</span>
          <span className="text-xs mt-1">
            Expected: {expectedMonth} {expectedYear}
          </span>
          {canAddReadings && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                const readingType = isOpening
                  ? OdometerReadingType.OPENING
                  : OdometerReadingType.CLOSING;
                router.push(
                  `/dashboard/odometer-verification?vehicleId=${vehicleId}&type=${readingType}`,
                );
              }}
            >
              <Upload className="h-3 w-3 mr-1" />
              Take Photo
            </Button>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete {type} Reading
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this odometer verification? This
              action cannot be undone and may affect your SARS compliance
              records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lock Dialog */}
      <Dialog open={showLockDialog} onOpenChange={setShowLockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Confirm {type} Reading
            </DialogTitle>
            <DialogDescription>
              Confirming this odometer reading will prevent it from being edited
              or deleted. This is recommended for SARS audit compliance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="lockReason">Confirmation note (optional)</Label>
              <Input
                id="lockReason"
                name="lockReason"
                placeholder="e.g., Tax year checked, Confirmed for SARS"
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowLockDialog(false)}
              disabled={isProcessing}
              className="!flex-none"
            >
              Cancel
            </Button>
            <Button onClick={handleLock} disabled={isProcessing} className="!flex-none">
              {isProcessing ? "Confirming..." : "Confirm record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlock Dialog */}
      <Dialog open={showUnlockDialog} onOpenChange={setShowUnlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5" />
              Re-open {type} Record for Editing
            </DialogTitle>
            <DialogDescription>
              Re-opening this confirmed odometer record will allow it to be
              edited or deleted. Are you sure you want to proceed?
            </DialogDescription>
          </DialogHeader>
          {record?.lockedAt && (
            <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Confirmed at:</span>
                <span>{new Date(record.lockedAt).toLocaleString("en-ZA")}</span>
              </div>
              {record.lockedByName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Confirmed by:</span>
                  <span>{record.lockedByName}</span>
                </div>
              )}
              {record.lockedReason && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Confirmation note:
                  </span>
                  <span>{record.lockedReason}</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUnlockDialog(false)}
              disabled={isProcessing}
              className="!flex-none"
            >
              Cancel
            </Button>
            <Button onClick={handleUnlock} disabled={isProcessing} className="!flex-none">
              {isProcessing ? "Re-opening..." : "Re-open Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit/Reupload Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit {type} Reading
            </DialogTitle>
            <DialogDescription>
              You can update the odometer value, captured time and optionally
              replace the photo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Current image preview */}
            {record && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Current Photo</p>
                <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                  <img
                    src={record.imageUrlAvif}
                    alt="Current odometer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  <div className="space-y-1">
                    <Label htmlFor="edit-odometer">Odometer (km)</Label>
                    <Input
                      id="edit-odometer"
                      name="edit-odometer"
                      type="number"
                      inputMode="decimal"
                      value={editOdometerValue}
                      onChange={(e) => setEditOdometerValue(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-captured-at">Captured at</Label>
                    <Input
                      id="edit-captured-at"
                      name="edit-captured-at"
                      type="datetime-local"
                      value={editCapturedAtLocal}
                      onChange={(e) => setEditCapturedAtLocal(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Current:{" "}
                      {new Date(record.capturedAt).toLocaleString("en-ZA")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* New image upload */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Replace with new photo</p>
              {selectedFile ? (
                <div className="space-y-2">
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                    <img
                      src={URL.createObjectURL(selectedFile)}
                      alt="New odometer"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)}{" "}
                    KB)
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      fileInputRef.current?.click();
                    }}
                    aria-label="Choose different odometer photo"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Choose different photo
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-24 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Select new odometer photo"
                >
                  <Camera className="h-6 w-6 mr-2" />
                  Select new photo
                </Button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setSelectedFile(null);
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveChanges} disabled={isProcessing}>
              {isProcessing ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Crop Modal */}
      {selectedFile && (
        <ImageCropModal
          imageFile={selectedFile}
          mode="odometer"
          onConfirm={handleCropConfirm}
          onCancel={() => {
            setShowCropModal(false);
            setSelectedFile(null);
          }}
          isOpen={showCropModal}
        />
      )}
    </div>
  );
}
