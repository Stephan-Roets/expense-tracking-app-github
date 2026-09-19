"use client";

import React, { useState, useEffect } from "react";
import { api, getLatestBusinessTripOdometer } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Palmtree, MapPin, Navigation, Car, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/contexts/auth-context";
import { usePermissions } from "@/hooks/usePermissions";

interface TripLogFormProps {
  vehicleId?: string;
  onSubmit?: (data: TripFormData) => Promise<void>;
  onCancel?: () => void;
}

interface TripFormData {
  vehicleId: string;
  tripDate: string;
  startOdometer: number;
  endOdometer: number;
  tripPurpose: "BUSINESS" | "PRIVATE";
  startLocation: string;
  endLocation: string;
  description?: string;
  projectCode?: string;
  clientName?: string;
}

interface VehicleOption {
  id: string;
  registration: string;
  make: string;
  model: string;
}

interface VehicleTaxProfile {
  isCompanyProvidedVehicle: boolean;
}

export function TripLogForm({ vehicleId, onSubmit, onCancel }: TripLogFormProps) {
  const { user } = useAuth();
  const { data: permissions, isLoading: isLoadingPermissions } = usePermissions(user?.organizationId || '');
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tripPurpose, setTripPurpose] = useState<"BUSINESS" | "PRIVATE">("BUSINESS");
  const [dateInput, setDateInput] = useState("")
  const [autoFilledOdometer, setAutoFilledOdometer] = useState<number | null>(null)
  const [vehicleTaxProfile, setVehicleTaxProfile] = useState<VehicleTaxProfile | null>(null)

  // Check if user has permission to add/edit trips
  const canAddTrip = permissions?.["LOGBOOK"]?.["ADD_TRIP"] ||
                     permissions?.["LOGBOOK"]?.["EDIT_OWN_ENTRIES"] ||
                     permissions?.["LOGBOOK"]?.["EDIT_ALL_ENTRIES"] ||
                     user?.role === "SUPER_ADMIN" ||
                     user?.role === "ADMIN" ||
                     user?.role === "MANAGER" ||
                     (user?.role === "ASSISTANT" && user?.assistantRole === "ASSISTANT_HIGH");

  // Show loading state while checking permissions
  if (isLoadingPermissions) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading permissions...</div>
      </div>
    );
  }

  // Show locked message if user doesn't have permission
  if (!canAddTrip) {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
        <CardContent className="flex items-center gap-4 p-6">
          <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-100">
              Permission Required
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              You don't have permission to add or edit trips. Please contact your organization administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const [formData, setFormData] = useState({
    vehicleId: vehicleId || "",
    tripDate: new Date().toISOString().split("T")[0],
    startOdometer: "",
    endOdometer: "",
    startLocation: "",
    endLocation: "",
    description: "",
    projectCode: "",
    clientName: "",
  });

  // Initialize date input from formData when it changes
  useEffect(() => {
    if (formData.tripDate) {
      setDateInput(formData.tripDate)
    }
  }, [formData.tripDate]);
  
  useEffect(() => {
    api.get("/vehicles").then(({ data }) => {
      const list = Array.isArray(data) ? data : [];
      setVehicles(
        list.map((v: { id: string; registrationNumber: string; make: string; model: string }) => ({
          id: v.id,
          registration: v.registrationNumber,
          make: v.make,
          model: v.model,
        }))
      );
    }).catch(console.error);
  }, []);

  // Fetch vehicle tax profile to determine if company provided vehicle
  useEffect(() => {
    if (formData.vehicleId) {
      api.get(`/vehicles/${formData.vehicleId}/tax-profiles`).then(({ data }) => {
        const profiles = Array.isArray(data) ? data : [];
        const activeProfile = profiles.find((p: { effectiveTo: string | null }) => p.effectiveTo === null);
        if (activeProfile) {
          setVehicleTaxProfile(activeProfile);
          // Force BUSINESS purpose for non-company vehicles
          if (!activeProfile.isCompanyProvidedVehicle) {
            setTripPurpose("BUSINESS");
          }
        } else {
          setVehicleTaxProfile(null);
        }
      }).catch(console.error);
    } else {
      setVehicleTaxProfile(null);
    }
  }, [formData.vehicleId]);

  // Odometer chaining: Pre-fill start odometer from latest business trip when purpose is BUSINESS
  useEffect(() => {
    if (tripPurpose === "BUSINESS" && formData.vehicleId) {
      getLatestBusinessTripOdometer(formData.vehicleId).then(({ data }) => {
        if (data !== null && data !== undefined) {
          setFormData(prev => ({ ...prev, startOdometer: data.toString() }));
          setAutoFilledOdometer(data);
        } else {
          setAutoFilledOdometer(null);
        }
      }).catch(console.error);
    } else {
      setAutoFilledOdometer(null);
    }
  }, [tripPurpose, formData.vehicleId]);

  const distanceTraveled = formData.endOdometer && formData.startOdometer
    ? Number(formData.endOdometer) - Number(formData.startOdometer)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSubmit) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        vehicleId: formData.vehicleId,
        startOdometer: Number(formData.startOdometer),
        endOdometer: Number(formData.endOdometer),
        tripPurpose,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* SARS Trip Purpose Toggle - Most Important */}
      <Card className="border-2 border-primary/20 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            SARS Trip Classification
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Required for SARS logbook compliance
          </p>
        </CardHeader>
        <CardContent>
          {vehicleTaxProfile?.isCompanyProvidedVehicle ? (
            // Company Provided Vehicle: Show both Business and Private options
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
                <span className="font-semibold text-lg">Private / Leisure</span>
                <span className="text-xs text-muted-foreground mt-1">Optional - for employer records</span>
              </button>
            </div>
          ) : (
            // Personal Vehicle: Force Business only
            <div className="p-6 bg-primary/5 rounded-xl border-2 border-primary/20">
              <div className="flex flex-col items-center justify-center">
                <Briefcase className="h-10 w-10 mb-2 text-primary" />
                <span className="font-semibold text-lg text-primary">Business Trip</span>
                <span className="text-xs text-muted-foreground mt-1">Tax Deductible</span>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Private kilometres are calculated automatically from total odometer distance
                </p>
              </div>
            </div>
          )}
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

      {/* Trip Date */}
      <div className="space-y-2">
        <Label htmlFor="tripDate" className="text-base font-medium">
          Trip Date
        </Label>
        <Input
          id="tripDate"
          name="tripDate"
          type="text"
          inputMode="numeric"
          pattern="\d{4}-\d{2}-\d{2}"
          placeholder="YYYY-MM-DD"
          value={dateInput || formData.tripDate}
          onChange={(e) => {
            let value = e.target.value;
            value = value.replace(/[^\d-]/g, '');
            const digits = value.replace(/\D/g, '');
            if (digits.length > 0) {
              let formatted = digits.slice(0, 4);
              if (digits.length > 4) {
                formatted += '-' + digits.slice(4, 6);
              }
              if (digits.length > 6) {
                formatted += '-' + digits.slice(6, 8);
              }
              value = formatted;
            }
            setDateInput(value);
            if (value && value.length >= 4) {
              const year = parseInt(value.slice(0, 4));
              if (year < 1900 || year > 2099) {
                return;
              }
            }
            if (value.length === 10) {
              const year = parseInt(value.slice(0, 4));
              const month = parseInt(value.slice(5, 7));
              const day = parseInt(value.slice(8, 10));
              
              // Validate month
              if (month < 1 || month > 12) {
                return;
              }
              
              // Validate day based on month
              const daysInMonth = new Date(year, month, 0).getDate();
              if (day < 1 || day > daysInMonth) {
                return;
              }
              
              setFormData({ ...formData, tripDate: value });
            }
          }}
          className="h-14 text-base"
          maxLength={10}
        />
      </div>

      {/* Odometer Readings */}
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation className="h-4 w-4" />
            Odometer Readings (km)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startOdometer" className="text-sm">
                Start (km)
              </Label>
              <Input
                id="startOdometer"
                name="startOdometer"
                type="number"
                inputMode="numeric"
                placeholder="e.g., 45000"
                value={formData.startOdometer}
                onChange={(e) => setFormData({ ...formData, startOdometer: e.target.value })}
                className="h-14 text-lg font-mono"
                required
              />
              {autoFilledOdometer && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                  Auto-filled from your last business trip ({autoFilledOdometer.toLocaleString()} km) — edit if needed
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endOdometer" className="text-sm">
                End (km)
              </Label>
              <Input
                id="endOdometer"
                name="endOdometer"
                type="number"
                inputMode="numeric"
                placeholder="e.g., 45150"
                value={formData.endOdometer}
                onChange={(e) => setFormData({ ...formData, endOdometer: e.target.value })}
                className="h-14 text-lg font-mono"
                required
              />
            </div>
          </div>
          
          {/* Distance Summary */}
          {distanceTraveled > 0 && (
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
              <span className="text-sm font-medium">Distance Traveled</span>
              <span className="text-xl font-bold text-primary">
                {distanceTraveled.toLocaleString()} km
              </span>
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Business Trip Details (only shown for business trips) */}
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
              <Label htmlFor="clientName" className="text-sm">
                Client / Company Name
              </Label>
              <Input
                id="clientName"
                name="clientName"
                type="text"
                placeholder="e.g., ABC Construction"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectCode" className="text-sm">
                Project / Job Code
              </Label>
              <Input
                id="projectCode"
                name="projectCode"
                type="text"
                placeholder="e.g., PRJ-2024-001"
                value={formData.projectCode}
                onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                className="h-12"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-base font-medium">
          Trip Description
        </Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Brief description of the trip purpose..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="min-h-[100px] text-base resize-none"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            id="cancel-trip"
            name="cancel"
            variant="outline"
            onClick={onCancel}
            className="flex-1 h-14 text-base"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          id="submit-trip"
          name="submit"
          disabled={isSubmitting || !formData.vehicleId || !formData.startOdometer || !formData.endOdometer}
          className="flex-1 h-14 text-base font-semibold"
        >
          {isSubmitting ? "Saving..." : "Log Trip"}
        </Button>
      </div>
    </form>
  );
}

