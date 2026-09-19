"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Loader2, Briefcase, Palmtree, MapPin, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { api } from "@/lib/api/client";
import { TripPurpose, Vehicle } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export default function EditTripPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = params.id as string;
  
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [formData, setFormData] = useState({
    vehicleId: "",
    tripDate: "",
    startTime: "",
    endTime: "",
    startOdometer: "",
    endOdometer: "",
    purpose: "BUSINESS" as TripPurpose,
    startLocation: "",
    endLocation: "",
    routeDescription: "",
    customerClientName: "",
    reasonForTrip: "",
    tollCostsZar: "",
    parkingCostsZar: "",
  });

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const { data } = await api.get(`/trips/${tripId}`);
        if (data && typeof data === 'object') {
          setTrip(data);
          setFormData({
            vehicleId: data.vehicleId || "",
            tripDate: data.tripDate ? format(new Date(data.tripDate), "yyyy-MM-dd") : "",
            startTime: data.startTime || "",
            endTime: data.endTime || "",
            startOdometer: data.startOdometer?.toString() || "",
            endOdometer: data.endOdometer?.toString() || "",
            purpose: data.purpose || "BUSINESS",
            startLocation: data.startLocation || "",
            endLocation: data.endLocation || "",
            routeDescription: data.routeDescription || "",
            customerClientName: data.customerClientName || "",
            reasonForTrip: data.reasonForTrip || "",
            tollCostsZar: data.tollCostsZar?.toString() || "",
            parkingCostsZar: data.parkingCostsZar?.toString() || "",
          });
        }
      } catch (error) {
        console.error("Error fetching trip:", error);
        router.push("/dashboard/logbook");
      } finally {
        setLoading(false);
      }
    };

    const fetchVehicles = async () => {
      try {
        const response = await api.get('/vehicles');
        setVehicles(response.data || []);
      } catch (err) {
        console.error('Failed to fetch vehicles:', err);
      }
    };

    fetchTrip();
    fetchVehicles();
  }, [tripId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updateData = {
        vehicleId: formData.vehicleId,
        tripDate: formData.tripDate,
        startTime: formData.startTime || undefined,
        endTime: formData.endTime || undefined,
        startOdometer: parseInt(formData.startOdometer),
        endOdometer: parseInt(formData.endOdometer),
        purpose: formData.purpose,
        startLocation: formData.startLocation,
        endLocation: formData.endLocation,
        routeDescription: formData.routeDescription || undefined,
        customerClientName: formData.customerClientName || undefined,
        reasonForTrip: formData.reasonForTrip || undefined,
        tollCostsZar: Number(formData.tollCostsZar) || 0,
        parkingCostsZar: Number(formData.parkingCostsZar) || 0,
      };

      await api.put(`/trips/${tripId}`, updateData);
      router.push("/dashboard/logbook");
    } catch (error) {
      console.error("Error updating trip:", error);
      alert("Failed to update trip. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const distanceKm = formData.startOdometer && formData.endOdometer
    ? parseInt(formData.endOdometer) - parseInt(formData.startOdometer)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading trip details...</div>
      </div>
    );
  }

  if (!trip || trip.isLocked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-amber-600">
          {trip?.isLocked ? "This trip is locked and cannot be edited." : "Trip not found"}
          <br />
          <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="border-b border-border bg-card">
        <div className="flex items-center gap-3 px-4 py-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-sm">Edit Trip</h1>
            <p className="text-xs text-muted-foreground">
              {formData.tripDate && new Date(formData.tripDate).toLocaleDateString('en-ZA')}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 pb-24">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SARS Trip Purpose Toggle */}
          <Card className="border-2 border-primary/20 bg-card/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                SARS Trip Classification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleInputChange("purpose", "BUSINESS")}
                  disabled={trip.isLocked}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all",
                    formData.purpose === "BUSINESS"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card hover:border-primary/50"
                  )}
                >
                  <Briefcase className={cn(
                    "h-8 w-8 mb-2",
                    formData.purpose === "BUSINESS" ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className="font-semibold">Business</span>
                  <span className="text-xs text-muted-foreground">Tax Deductible</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange("purpose", "PRIVATE")}
                  disabled={trip.isLocked}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all",
                    formData.purpose === "PRIVATE"
                      ? "border-amber-500 bg-amber-500/10 text-amber-500"
                      : "border-border bg-card hover:border-amber-500/50"
                  )}
                >
                  <Palmtree className={cn(
                    "h-8 w-8 mb-2",
                    formData.purpose === "PRIVATE" ? "text-amber-500" : "text-muted-foreground"
                  )} />
                  <span className="font-semibold">Private</span>
                  <span className="text-xs text-muted-foreground">Personal Use</span>
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
              onValueChange={(v) => handleInputChange("vehicleId", v)}
              disabled={trip.isLocked}
              name="vehicleId"
            >
              <SelectTrigger id="vehicle" className="h-14 text-base">
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id} className="py-3">
                    <div className="flex flex-col">
                      <span className="font-medium">{v.registrationNumber}</span>
                      <span className="text-sm text-muted-foreground">
                        {v.make} {v.model}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Odometer Section */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Odometer Readings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startOdometer">Start (km)</Label>
                  <Input
                    id="startOdometer"
                    name="startOdometer"
                    type="number"
                    value={formData.startOdometer}
                    onChange={(e) => handleInputChange("startOdometer", e.target.value)}
                    placeholder="100000"
                    required
                    disabled={trip.isLocked}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endOdometer">End (km)</Label>
                  <Input
                    id="endOdometer"
                    name="endOdometer"
                    type="number"
                    value={formData.endOdometer}
                    onChange={(e) => handleInputChange("endOdometer", e.target.value)}
                    placeholder="100050"
                    required
                    disabled={trip.isLocked}
                    className="h-12"
                  />
                </div>
              </div>

              {distanceKm > 0 && (
                <div className="rounded-lg bg-muted p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Distance</span>
                    <span className="font-semibold">{distanceKm} km</span>
                  </div>
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
                value={formData.startLocation}
                onChange={(e) => handleInputChange("startLocation", e.target.value)}
                placeholder="e.g., Office - Sandton"
                required
                disabled={trip.isLocked}
                className="h-14 text-base"
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
                value={formData.endLocation}
                onChange={(e) => handleInputChange("endLocation", e.target.value)}
                placeholder="e.g., Client Site - Pretoria"
                required
                disabled={trip.isLocked}
                className="h-14 text-base"
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
              onChange={(e) => handleInputChange("tripDate", e.target.value)}
              required
              disabled={trip.isLocked}
              className="h-14 text-base"
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
                onChange={(e) => handleInputChange("startTime", e.target.value)}
                disabled={trip.isLocked}
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
                onChange={(e) => handleInputChange("endTime", e.target.value)}
                disabled={trip.isLocked}
                className="h-14 text-base"
              />
            </div>
          </div>

          {/* Business Trip Details */}
          {formData.purpose === "BUSINESS" && (
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Business Trip Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customerClientName">Client / Company Name</Label>
                  <Input
                    id="customerClientName"
                    name="customerClientName"
                    type="text"
                    value={formData.customerClientName}
                    onChange={(e) => handleInputChange("customerClientName", e.target.value)}
                    placeholder="e.g., ABC Construction"
                    disabled={trip.isLocked}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reasonForTrip">Reason for Trip</Label>
                  <Input
                    id="reasonForTrip"
                    name="reasonForTrip"
                    type="text"
                    value={formData.reasonForTrip}
                    onChange={(e) => handleInputChange("reasonForTrip", e.target.value)}
                    placeholder="e.g., Site inspection, client meeting"
                    disabled={trip.isLocked}
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
                <Label htmlFor="tollCostsZar">Toll Costs (R)</Label>
                <Input
                  id="tollCostsZar"
                  name="tollCostsZar"
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={formData.tollCostsZar}
                  onChange={(e) => handleInputChange("tollCostsZar", e.target.value)}
                  disabled={trip.isLocked}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parkingCostsZar">Parking Costs (R)</Label>
                <Input
                  id="parkingCostsZar"
                  name="parkingCostsZar"
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={formData.parkingCostsZar}
                  onChange={(e) => handleInputChange("parkingCostsZar", e.target.value)}
                  disabled={trip.isLocked}
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
              placeholder="Brief description of the trip purpose..."
              value={formData.routeDescription}
              onChange={(e) => handleInputChange("routeDescription", e.target.value)}
              disabled={trip.isLocked}
              className="min-h-[100px] text-base resize-none"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || trip.isLocked}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Changes</>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
