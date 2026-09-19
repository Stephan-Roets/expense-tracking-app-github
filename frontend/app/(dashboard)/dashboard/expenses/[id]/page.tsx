"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ArrowLeft, Edit, Trash2, AlertTriangle, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExpenseCategory, FUEL_TYPE_LABELS, FuelType, EXPENSE_CATEGORY_LABELS, TaxExpenseClassification } from "@/lib/types/database";
import { formatZAR } from "@/lib/utils/currency";
import { api } from "@/lib/api/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  vehicleReg: string;
  date: Date;
  supplierName?: string;
  odometerReading?: number;
  fuelType?: string;
  fuelLogId?: string;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  gpsAccuracy?: number | null;
  taxExpenseClassification?: TaxExpenseClassification;
}

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const expenseId = params.id as string;
  
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);
  const [editingClassification, setEditingClassification] = useState(false);
  const [classificationSaving, setClassificationSaving] = useState(false);

  // GPS retroactive entry state
  const [gpsEditing, setGpsEditing] = useState(false);
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [gpsSaving, setGpsSaving] = useState(false);

  // Load expense from Spring API
  useEffect(() => {
    const fetchExpense = async () => {
      try {
        const { data: expenseData } = await api.get(`/expenses/${expenseId}`);
        if (expenseData && expenseData.id) {
          setExpense({
            id: expenseData.id,
            category: expenseData.category,
            description: expenseData.description || 'Expense',
            amount: expenseData.amountZar || 0,
            vehicleReg: expenseData.vehicle?.registrationNumber || 'Unknown',
            date: expenseData.expenseDate ? new Date(expenseData.expenseDate) : (expenseData.createdAt ? new Date(expenseData.createdAt) : new Date()),
            supplierName: expenseData.supplierName,
            odometerReading: expenseData.odometerReading,
            fuelType: expenseData.fuelLog?.fuelType,
            fuelLogId: expenseData.fuelLog?.id,
            gpsLatitude: expenseData.fuelLog?.gpsLatitude ?? null,
            gpsLongitude: expenseData.fuelLog?.gpsLongitude ?? null,
            gpsAccuracy: expenseData.fuelLog?.gpsAccuracyMeters ?? null,
            taxExpenseClassification: expenseData.taxExpenseClassification,
          });
          // Set receipt image URL if available
          if (expenseData.receiptImageUrl) {
            setReceiptImageUrl(expenseData.receiptImageUrl);
          }
        }
      } catch (err) {
        console.error('Expense detail - Failed to fetch from backend:', err);
        if (err instanceof Error && err.message.includes('HTTP 401')) {
          router.push('/login?error=session_expired');
        }
      }
      setLoading(false);
    };
    fetchExpense();
  }, [expenseId, router]);

  const handleDelete = async () => {
    console.log('Attempting to delete expense:', expenseId);
    try {
      const result = await api.delete(`/expenses/${expenseId}`);
      console.log('Delete result:', result);
      router.push('/dashboard/expenses');
    } catch (err) {
      console.error('Failed to delete expense:', err);
      alert(`Failed to delete expense: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // ── GPS Retroactive Entry ──────────────────────────────────────────────────

  const captureGps = async () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }
    setIsCapturingGps(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });
      setManualLat(position.coords.latitude.toFixed(6));
      setManualLng(position.coords.longitude.toFixed(6));
    } catch (error) {
      console.error("GPS capture failed:", error);
      alert("Failed to capture GPS. You can enter coordinates manually.");
    } finally {
      setIsCapturingGps(false);
    }
  };

  const saveGps = async () => {
    if (!expense?.fuelLogId) return;
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert("Please enter valid coordinates. Latitude: -90 to 90, Longitude: -180 to 180.");
      return;
    }
    setGpsSaving(true);
    try {
      await api.put(`/fuel-logs/${expense.fuelLogId}`, {
        gpsLatitude: lat,
        gpsLongitude: lng,
        gpsAccuracyMeters: null,
      });
      setExpense((prev) =>
        prev
          ? {
              ...prev,
              gpsLatitude: lat,
              gpsLongitude: lng,
              gpsAccuracy: null,
            }
          : prev
      );
      setGpsEditing(false);
    } catch (err) {
      console.error("Failed to save GPS:", err);
      alert("Failed to save GPS coordinates.");
    } finally {
      setGpsSaving(false);
    }
  };

  const clearGps = async () => {
    if (!expense?.fuelLogId) return;
    setGpsSaving(true);
    try {
      await api.put(`/fuel-logs/${expense.fuelLogId}`, {
        gpsLatitude: null,
        gpsLongitude: null,
        gpsAccuracyMeters: null,
      });
      setExpense((prev) =>
        prev
          ? { ...prev, gpsLatitude: null, gpsLongitude: null, gpsAccuracy: null }
          : prev
      );
      setGpsEditing(false);
      setManualLat("");
      setManualLng("");
    } catch (err) {
      console.error("Failed to clear GPS:", err);
      alert("Failed to clear GPS coordinates.");
    } finally {
      setGpsSaving(false);
    }
  };

  const openGpsEdit = () => {
    setManualLat(expense?.gpsLatitude?.toFixed(6) ?? "");
    setManualLng(expense?.gpsLongitude?.toFixed(6) ?? "");
    setGpsEditing(true);
  };

  const handleClassificationUpdate = async (newClassification: TaxExpenseClassification) => {
    if (!expense) return;
    setClassificationSaving(true);
    try {
      await api.put(`/expenses/${expenseId}`, {
        taxExpenseClassification: newClassification,
      });
      setExpense((prev) =>
        prev
          ? { ...prev, taxExpenseClassification: newClassification }
          : prev
      );
      setEditingClassification(false);
    } catch (err) {
      console.error("Failed to update classification:", err);
      alert("Failed to update tax classification.");
    } finally {
      setClassificationSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Expense not found</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/expenses">Back to Expenses</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-14 z-30 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/dashboard/expenses">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <h1 className="text-xl font-bold">Expense Details</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/expenses/${expenseId}/edit`)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{expense.description}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Amount</span>
              <span className="text-xl font-bold">{formatZAR(expense.amount)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Category</span>
              <span>{EXPENSE_CATEGORY_LABELS[expense.category]}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Tax Classification</span>
              {!editingClassification ? (
                <div className="flex items-center gap-2">
                  <span className={expense.taxExpenseClassification === TaxExpenseClassification.UNCATEGORIZED ? "text-orange-600 font-medium" : ""}>
                    {expense.taxExpenseClassification || "Uncategorized"}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setEditingClassification(true)} className="h-8">
                    Edit
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Select
                    value={expense.taxExpenseClassification || ""}
                    onValueChange={(value) => handleClassificationUpdate(value as TaxExpenseClassification)}
                    disabled={classificationSaving}
                  >
                    <SelectTrigger className="w-48 h-8">
                      <SelectValue placeholder="Select classification" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TaxExpenseClassification.QUALIFYING_CURRENT_EXPENSE}>
                        Qualifying Current Expense
                      </SelectItem>
                      <SelectItem value={TaxExpenseClassification.CAPITAL_OR_ALLOWANCE_REVIEW}>
                        Capital/Allowance Review
                      </SelectItem>
                      <SelectItem value={TaxExpenseClassification.PERSONAL_OR_NON_QUALIFYING}>
                        Personal/Non-Qualifying
                      </SelectItem>
                      <SelectItem value={TaxExpenseClassification.UNCATEGORIZED}>
                        Uncategorized
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" onClick={() => setEditingClassification(false)} disabled={classificationSaving} className="h-8">
                    Cancel
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Vehicle</span>
              <span>{expense.vehicleReg}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Date</span>
              <span>{format(expense.date, "d MMM yyyy")}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Odometer (km)</span>
              <span>
                {expense.odometerReading != null
                  ? expense.odometerReading.toLocaleString('en-ZA')
                  : '—'}
              </span>
            </div>
            {expense.category === ExpenseCategory.FUEL_LOG && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Fuel Type</span>
                <span>
                  {expense.fuelType
                    ? FUEL_TYPE_LABELS[expense.fuelType as FuelType] || expense.fuelType
                    : '—'}
                </span>
              </div>
            )}
            {expense.supplierName && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Supplier</span>
                <span>{expense.supplierName}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Receipt Image Preview */}
        {receiptImageUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Receipt</CardTitle>
            </CardHeader>
            <CardContent>
              <img
                src={receiptImageUrl}
                alt="Receipt"
                className="w-full max-h-96 object-contain rounded-lg border"
              />
            </CardContent>
          </Card>
        )}

        {expense.category === ExpenseCategory.FUEL_LOG && expense.fuelLogId && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                Fuel Purchase Location
                <span className="text-xs font-normal text-muted-foreground">(optional — for SARS logbook)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!gpsEditing ? (
                <div className="space-y-3">
                  {expense.gpsLatitude != null && expense.gpsLongitude != null ? (
                    <div className="rounded-lg border border-border p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> Location recorded
                        </span>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={openGpsEdit} className="h-8">Update</Button>
                          <Button variant="ghost" size="sm" onClick={clearGps} disabled={gpsSaving} className="h-8 text-muted-foreground">Clear</Button>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>Lat: {expense.gpsLatitude.toFixed(6)}</p>
                        <p>Lng: {expense.gpsLongitude.toFixed(6)}</p>
                        {expense.gpsAccuracy != null && <p>Accuracy: ±{Math.round(expense.gpsAccuracy)}m</p>}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">No GPS location recorded. Add it for your SARS logbook.</p>
                      <Button variant="outline" onClick={openGpsEdit} className="w-full h-12 touch-target">
                        <MapPin className="h-4 w-4 mr-2" /> Add GPS Location
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Enter fuel station coordinates. Capture live or type manually.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="gps-lat">Latitude</Label>
                      <Input id="gps-lat" name="gps-lat" value={manualLat} onChange={(e) => setManualLat(e.target.value)} placeholder="-26.2041" className="h-12" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="gps-lng">Longitude</Label>
                      <Input id="gps-lng" name="gps-lng" value={manualLng} onChange={(e) => setManualLng(e.target.value)} placeholder="28.0473" className="h-12" />
                    </div>
                  </div>
                  <Button variant="outline" onClick={captureGps} disabled={isCapturingGps} className="w-full h-12 touch-target">
                    <MapPin className="h-4 w-4 mr-2" />
                    {isCapturingGps ? "Capturing GPS..." : "Use My Current Location"}
                  </Button>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setGpsEditing(false)} className="flex-1 h-12">Cancel</Button>
                    <Button onClick={saveGps} disabled={gpsSaving} className="flex-1 h-12">Save</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Expense
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
