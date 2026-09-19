"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Briefcase, Palmtree, MapPin, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { api, createRecurringTrip } from "@/lib/api/client";
import { useOdometerMemory } from "@/lib/hooks/useOdometerMemory";
import { OdometerInput } from "@/components/forms/odometer-input";
import RecurringTripToggle from "@/components/forms/recurring-trip-toggle";
import RecurringTripsList from "@/components/forms/recurring-trips-list";

interface VehicleOption {
  id: string;
  registration: string;
  make: string;
  model: string;
  nickname?: string;
}

function NewTripContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialVehicleId = searchParams.get("vehicleId") ?? "";

  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [userId, setUserId] = useState<string>("");

  // Form state
  const [formData, setFormData] = useState({
    vehicleId: initialVehicleId,
    tripDate: new Date().toISOString().split("T")[0],
    startTime: "",
    endTime: "",
    startOdometer: "",
    endOdometer: "",
    startLocation: "",
    endLocation: "",
    routeDescription: "",
    customerClientName: "",
    reasonForTrip: "",
    tollCostsZar: "",
    parkingCostsZar: "",
  });

  // Use the custom hook for odometer memory - use current vehicleId from form
  const { lastOdometer, currentOdometer, vehicleName: odometerVehicleName, loading: loadingOdometer } =
    useOdometerMemory(formData.vehicleId);

  const [tripPurpose, setTripPurpose] = useState<"BUSINESS" | "PRIVATE">("BUSINESS");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Recurring trip data from the toggle component
  const [recurringData, setRecurringData] = useState<{
    isRecurring: boolean;
    days: string[];
    daysOfMonth: number[];
    startDate?: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
  }>({ isRecurring: false, days: [], daysOfMonth: [] });

  // Load vehicles and user info
  useEffect(() => {
    api.get("/vehicles").then(({ data }) => {
      const list = Array.isArray(data) ? data : [];
      setVehicles(
        list.map((v: VehicleOption) => ({
          id: v.id,
          registration: v.registration,
          make: v.make,
          model: v.model,
          nickname: v.nickname,
        }))
      );
    }).catch(console.error);

    // Get user ID from localStorage
    const storedUser = localStorage.getItem("user_profile");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserId(user.id);
    }
  }, []);

  // Auto-fill start odometer when data loads or vehicle changes
  useEffect(() => {
    if (lastOdometer !== null) {
      setFormData(prev => ({ ...prev, startOdometer: String(lastOdometer) }));
    } else if (currentOdometer !== null) {
      setFormData(prev => ({ ...prev, startOdometer: String(currentOdometer) }));
    }
  }, [lastOdometer, currentOdometer]);

  const handleRecurringChange = (isRecurring: boolean, days: string[], daysOfMonth: number[], startDate?: string, endDate?: string, startTime?: string, endTime?: string) => {
    setRecurringData({ isRecurring, days, daysOfMonth, startDate, endDate, startTime, endTime });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleId || !userId) return;

    // Validate recurring trip data
    if (recurringData.isRecurring) {
      if (recurringData.days.length === 0) {
        alert("Please select at least one day for the recurring trip.");
        return;
      }
      if (!recurringData.startDate && !formData.tripDate) {
        alert("Please provide a recurrence start date.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Create the trip
      await api.post("/trips", {
        vehicleId: formData.vehicleId,
        tripDate: formData.tripDate,
        startTime: formData.startTime || undefined,
        endTime: formData.endTime || undefined,
        startOdometer: Number(formData.startOdometer),
        endOdometer: Number(formData.endOdometer),
        purpose: tripPurpose,
        startLocation: formData.startLocation,
        endLocation: formData.endLocation,
        routeDescription: formData.routeDescription,
        customerClientName: formData.customerClientName,
        reasonForTrip: formData.reasonForTrip,
        tollCostsZar: Number(formData.tollCostsZar) || 0,
        parkingCostsZar: Number(formData.parkingCostsZar) || 0,
      });

      // If recurring, create the recurring trip template
      if (recurringData.isRecurring && recurringData.days.length > 0) {
        await createRecurringTrip({
          vehicleId: formData.vehicleId,
          userId: userId,
          purpose: tripPurpose,
          startLocation: formData.startLocation,
          endLocation: formData.endLocation,
          routeDescription: formData.routeDescription,
          customerClientName: formData.customerClientName,
          reasonForTrip: formData.reasonForTrip,
          isRecurring: true,
          recurrenceDays: recurringData.days.join(","),
          recurrenceDaysOfMonth: recurringData.daysOfMonth.length > 0 ? recurringData.daysOfMonth.join(",") : undefined,
          recurrenceStartDate: recurringData.startDate || formData.tripDate,
          recurrenceEndDate: recurringData.endDate,
          startTime: recurringData.startTime,
          endTime: recurringData.endTime,
          defaultTollCostsZar: Number(formData.tollCostsZar) || 0,
          defaultParkingCostsZar: Number(formData.parkingCostsZar) || 0,
        });
      }

      router.push("/dashboard/logbook");
    } catch (err: any) {
      console.error("Failed to create trip:", err);
      const errorMessage = err?.message || "Unknown error";
      alert(`Failed to create trip: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="px-4 py-4 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Log Trip</h1>
            <p className="text-sm text-muted-foreground">SARS Compliant Entry</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-6 space-y-6">
        {/* SARS Trip Purpose Toggle */}
        <Card className="border-2 border-primary/20 bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              SARS Trip Classification
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Required for SARS logbook compliance
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id="trip-purpose-business"
                name="tripPurpose"
                value="BUSINESS"
                onClick={() => setTripPurpose("BUSINESS")}
                className={cn(
                  "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all",
                  "min-h-[120px] touch-manipulation",
                  tripPurpose === "BUSINESS"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:border-primary/50"
                )}
              >
                <Briefcase className={cn(
                  "h-10 w-10 mb-2",
                  tripPurpose === "BUSINESS" ? "text-primary" : "text-muted-foreground"
                )} />
                <span className="font-semibold text-lg">Business</span>
                <span className="text-xs text-muted-foreground mt-1">Tax Deductible</span>
              </button>
              <button
                type="button"
                id="trip-purpose-private"
                name="tripPurpose"
                value="PRIVATE"
                onClick={() => setTripPurpose("PRIVATE")}
                className={cn(
                  "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all",
                  "min-h-[120px] touch-manipulation",
                  tripPurpose === "PRIVATE"
                    ? "border-amber-500 bg-amber-500/10 text-amber-500"
                    : "border-border bg-card hover:border-amber-500/50"
                )}
              >
                <Palmtree className={cn(
                  "h-10 w-10 mb-2",
                  tripPurpose === "PRIVATE" ? "text-amber-500" : "text-muted-foreground"
                )} />
                <span className="font-semibold text-lg">Private</span>
                <span className="text-xs text-muted-foreground mt-1">Personal Use</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Selection */}
        <div className="space-y-2">
          <Label htmlFor="vehicle" className="text-base font-medium">
            Vehicle
          </Label>
          <Select
            value={formData.vehicleId}
            onValueChange={(value) => setFormData({ ...formData, vehicleId: value })}
            name="vehicleId"
          >
            <SelectTrigger id="vehicle" className="h-14 text-base">
              <SelectValue placeholder="Select vehicle" />
            </SelectTrigger>
            <SelectContent>
              {vehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id} className="py-3">
                  <div className="flex flex-col">
                    <span className="font-medium">{vehicle.registration}</span>
                    <span className="text-sm text-muted-foreground">
                      {vehicle.make} {vehicle.model}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Odometer Section using modular component */}
        <OdometerInput
          startOdometer={formData.startOdometer}
          endOdometer={formData.endOdometer}
          lastOdometer={lastOdometer}
          currentOdometer={currentOdometer}
          vehicleName={odometerVehicleName}
          loading={loadingOdometer}
          onStartOdometerChange={(value) => setFormData({ ...formData, startOdometer: value })}
          onEndOdometerChange={(value) => setFormData({ ...formData, endOdometer: value })}
        />

        {/* Locations */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="startLocation" className="text-base font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-green-500" />
              Start Location
            </Label>
            <Input
              id="startLocation"
              name="startLocation"
              type="text"
              placeholder="e.g., Office - Sandton"
              value={formData.startLocation}
              onChange={(e) => setFormData({ ...formData, startLocation: e.target.value })}
              className="h-14 text-base"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endLocation" className="text-base font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-red-500" />
              End Location
            </Label>
            <Input
              id="endLocation"
              name="endLocation"
              type="text"
              placeholder="e.g., Client Site - Pretoria"
              value={formData.endLocation}
              onChange={(e) => setFormData({ ...formData, endLocation: e.target.value })}
              className="h-14 text-base"
              required
            />
          </div>
        </div>

        {/* Trip Date */}
        <div className="space-y-2">
          <Label htmlFor="tripDate" className="text-base font-medium flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Trip Date
          </Label>
          <Input
            id="tripDate"
            name="tripDate"
            type="date"
            value={formData.tripDate}
            onChange={(e) => setFormData({ ...formData, tripDate: e.target.value })}
            className="h-14 text-base"
            required
          />
        </div>

        {/* Trip Time */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="startTime" className="text-base font-medium">
              Start Time
            </Label>
            <Input
              id="startTime"
              name="startTime"
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="h-14 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endTime" className="text-base font-medium">
              End Time
            </Label>
            <Input
              id="endTime"
              name="endTime"
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              className="h-14 text-base"
            />
          </div>
        </div>

        {/* Existing Recurring Trips List */}
        {formData.vehicleId && (
          <RecurringTripsList vehicleId={formData.vehicleId} />
        )}

        {/* Save as Recurring Toggle using modular component */}
        <RecurringTripToggle onRecurringChange={handleRecurringChange} />

        {/* Business Trip Details */}
        {tripPurpose === "BUSINESS" && (
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Business Trip Details</CardTitle>
              <p className="text-sm text-muted-foreground">
                Optional but recommended for SARS documentation
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerClientName" className="text-sm">
                  Client / Company Name
                </Label>
                <Input
                  id="customerClientName"
                  name="customerClientName"
                  type="text"
                  placeholder="e.g., ABC Construction"
                  value={formData.customerClientName}
                  onChange={(e) => setFormData({ ...formData, customerClientName: e.target.value })}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reasonForTrip" className="text-sm">
                  Reason for Trip
                </Label>
                <Input
                  id="reasonForTrip"
                  name="reasonForTrip"
                  type="text"
                  placeholder="e.g., Site inspection, client meeting"
                  value={formData.reasonForTrip}
                  onChange={(e) => setFormData({ ...formData, reasonForTrip: e.target.value })}
                  className="h-12"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Costs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Trip Costs (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tollCostsZar" className="text-sm">
                Toll Costs (R)
              </Label>
              <Input
                id="tollCostsZar"
                name="tollCostsZar"
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={formData.tollCostsZar}
                onChange={(e) => setFormData({ ...formData, tollCostsZar: e.target.value })}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parkingCostsZar" className="text-sm">
                Parking Costs (R)
              </Label>
              <Input
                id="parkingCostsZar"
                name="parkingCostsZar"
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={formData.parkingCostsZar}
                onChange={(e) => setFormData({ ...formData, parkingCostsZar: e.target.value })}
                className="h-12"
              />
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="routeDescription" className="text-base font-medium">
            Trip Description
          </Label>
          <Textarea
            id="routeDescription"
            name="routeDescription"
            placeholder="Brief description of the trip purpose..."
            value={formData.routeDescription}
            onChange={(e) => setFormData({ ...formData, routeDescription: e.target.value })}
            className="min-h-[100px] text-base resize-none"
          />
        </div>

        {/* Submit Button */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            id="cancel-trip"
            name="cancel"
            variant="outline"
            onClick={() => router.back()}
            className="flex-1 h-14 text-base"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            id="submit-trip"
            name="submit"
            disabled={isSubmitting || !formData.vehicleId}
            className="flex-1 h-14 text-base font-semibold"
          >
            {isSubmitting ? "Saving..." : "Log Trip"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewTripPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <NewTripContent />
    </Suspense>
  );
}
