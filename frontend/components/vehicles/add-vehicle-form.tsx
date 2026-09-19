"use client"

import React, { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Car, AlertCircle } from "lucide-react"
import { apiFetch } from "@/lib/api/client"
import { VehicleLogo } from "./vehicle-logo"

// Simplified fuel type categories for vehicle creation
// Maps to specific fuel types in the backend
const VEHICLE_FUEL_CATEGORIES = [
  { value: "PETROL", label: "Petrol", defaultType: "PETROL_UNLEADED_95" },
  { value: "DIESEL", label: "Diesel", defaultType: "DIESEL_50PPM" },
  { value: "ELECTRIC", label: "Electric (Coming Soon)", defaultType: "ELECTRIC", disabled: true },
]

export function AddVehicleForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editVehicleId = searchParams.get('edit')
  const isEditMode = !!editVehicleId

  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    nickname: "",
    registrationNumber: "",
    make: "",
    model: "",
    year: new Date().getFullYear().toString(),
    fuelCategory: "",
    color: "",
    vin: "",
    tankCapacityLiters: "",
    licenseExpiry: "",
    insurancePolicyNumber: "",
    trackerSerial: "",
    notes: "",
    minorServiceIntervalKm: "",
    majorServiceIntervalKm: "",
    brakeOverhaulIntervalKm: "",
    minorServiceIntervalMonths: "",
    majorServiceIntervalMonths: "",
    brakeOverhaulIntervalMonths: "",
  })

  // Fetch vehicle data if in edit mode
  useEffect(() => {
    if (editVehicleId) {
      fetchVehicleData()
    }
  }, [editVehicleId])

  const fetchVehicleData = async () => {
    if (!editVehicleId) return

    try {
      setIsFetching(true)
      const response = await apiFetch(`/vehicles/${editVehicleId}`, {
        method: "GET",
      })

      if (!response.ok) {
        throw new Error("Failed to fetch vehicle data")
      }

      const data = await response.json()

      // Map fuel type back to category
      let fuelCategory = ""
      if (data.fuelType?.includes("PETROL")) {
        fuelCategory = "PETROL"
      } else if (data.fuelType?.includes("DIESEL")) {
        fuelCategory = "DIESEL"
      }

      setForm({
        nickname: data.nickname || "",
        registrationNumber: data.registrationNumber || "",
        make: data.make || "",
        model: data.model || "",
        year: data.year?.toString() || new Date().getFullYear().toString(),
        fuelCategory: fuelCategory,
        color: data.color || "",
        vin: data.vin || "",
        tankCapacityLiters: data.tankCapacityLiters?.toString() || "",
        licenseExpiry: data.licenseExpiry || "",
        insurancePolicyNumber: data.insurancePolicyNumber || "",
        trackerSerial: data.trackerSerial || "",
        notes: data.notes || "",
        minorServiceIntervalKm: data.minorServiceIntervalKm?.toString() || "",
        majorServiceIntervalKm: data.majorServiceIntervalKm?.toString() || "",
        brakeOverhaulIntervalKm: data.brakeOverhaulIntervalKm?.toString() || "",
        minorServiceIntervalMonths: data.minorServiceIntervalMonths?.toString() || "",
        majorServiceIntervalMonths: data.majorServiceIntervalMonths?.toString() || "",
        brakeOverhaulIntervalMonths: data.brakeOverhaulIntervalMonths?.toString() || "",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vehicle data")
    } finally {
      setIsFetching(false)
    }
  }

  const set = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // Map selected fuel category to default specific fuel type
      const selectedCategory = VEHICLE_FUEL_CATEGORIES.find(c => c.value === form.fuelCategory)
      const fuelType = selectedCategory?.defaultType || "PETROL_UNLEADED_95"

      const requestBody = {
        nickname: form.nickname || null,
        registrationNumber: form.registrationNumber,
        make: form.make,
        model: form.model,
        year: parseInt(form.year),
        fuelType: fuelType,
        color: form.color || null,
        vin: form.vin || null,
        tankCapacityLiters: form.tankCapacityLiters ? parseFloat(form.tankCapacityLiters) : null,
        licenseExpiry: form.licenseExpiry || null,
        insurancePolicyNumber: form.insurancePolicyNumber || null,
        trackerSerial: form.trackerSerial || null,
        notes: form.notes || null,
        minorServiceIntervalKm: form.minorServiceIntervalKm ? parseInt(form.minorServiceIntervalKm) : null,
        majorServiceIntervalKm: form.majorServiceIntervalKm ? parseInt(form.majorServiceIntervalKm) : null,
        brakeOverhaulIntervalKm: form.brakeOverhaulIntervalKm ? parseInt(form.brakeOverhaulIntervalKm) : null,
        minorServiceIntervalMonths: form.minorServiceIntervalMonths ? parseInt(form.minorServiceIntervalMonths) : null,
        majorServiceIntervalMonths: form.majorServiceIntervalMonths ? parseInt(form.majorServiceIntervalMonths) : null,
        brakeOverhaulIntervalMonths: form.brakeOverhaulIntervalMonths ? parseInt(form.brakeOverhaulIntervalMonths) : null,
      }

      let response
      if (isEditMode) {
        // Update existing vehicle
        response = await apiFetch(`/vehicles/${editVehicleId}`, {
          method: "PUT",
          body: JSON.stringify(requestBody),
        })
      } else {
        // Create new vehicle
        response = await apiFetch("/vehicles", {
          method: "POST",
          body: JSON.stringify(requestBody),
        })
      }

      // Handle non-OK responses
      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = isEditMode ? "Failed to update vehicle" : "Failed to add vehicle"
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.message || errorMessage
        } catch {
          // If JSON parsing fails, use the raw text or status
          errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      // Parse successful response
      const data = await response.json()

      if (isEditMode) {
        // For edit mode, go back to vehicles dashboard
        router.push("/dashboard/vehicles")
      } else {
        // Must complete odometer check before accessing dashboard
        router.push(`/onboarding/odometer-check/${data.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center" suppressHydrationWarning>
            <Car className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-xl">{isEditMode ? "Edit Vehicle" : "Add Your Vehicle"}</CardTitle>
        </div>
        <CardDescription>
          {isEditMode
            ? "Update your vehicle details. After saving, you can resubmit for approval."
            : "You need at least one vehicle to use Vehicle Expense Tracker. You can add optional details later by editing the vehicle at /dashboard/vehicles."
          }
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isFetching ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <span suppressHydrationWarning>
                  <AlertCircle className="h-4 w-4" />
                </span>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

          {/* Nickname */}
          <div className="space-y-2">
            <Label htmlFor="nickname">Nickname <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              id="nickname"
              name="nickname"
              placeholder='e.g. "My Daily Driver"'
              value={form.nickname}
              onChange={e => set("nickname", e.target.value)}
              className="h-12"
            />
          </div>

          {/* Registration Number */}
          <div className="space-y-2">
            <Label htmlFor="registrationNumber">Registration Number <span className="text-destructive">*</span></Label>
            <Input
              id="registrationNumber"
              name="registrationNumber"
              placeholder="e.g. CA 123-456"
              value={form.registrationNumber}
              onChange={e => set("registrationNumber", e.target.value.toUpperCase())}
              className="h-12 uppercase"
              required
            />
          </div>

          {/* Make & Model */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="make">Make <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  id="make"
                  name="make"
                  placeholder="Toyota"
                  value={form.make}
                  onChange={e => set("make", e.target.value)}
                  className="h-12 pr-10"
                  required
                />
                {form.make && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <VehicleLogo make={form.make} size="sm" />
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model <span className="text-destructive">*</span></Label>
              <Input
                id="model"
                name="model"
                placeholder="Hilux"
                value={form.model}
                onChange={e => set("model", e.target.value)}
                className="h-12"
                required
              />
            </div>
          </div>

          {/* Year & Color */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="year">Year <span className="text-destructive">*</span></Label>
              <Input
                id="year"
                name="year"
                type="text"
                inputMode="numeric"
                pattern="\d{4}"
                min={1980}
                max={2030}
                maxLength={4}
                placeholder="2022"
                value={form.year}
                onChange={e => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4)
                  set("year", value)
                }}
                className="h-12"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Colour <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="color"
                name="color"
                placeholder="White"
                value={form.color}
                onChange={e => set("color", e.target.value)}
                className="h-12"
              />
            </div>
          </div>

          {/* Fuel Type */}
          <div className="space-y-2">
            <Label htmlFor="fuelCategory">Fuel Type <span className="text-destructive">*</span></Label>
            <Select
              value={form.fuelCategory}
              onValueChange={v => set("fuelCategory", v)}
              name="fuelCategory"
              required
            >
              <SelectTrigger id="fuelCategory" className="h-12">
                <SelectValue placeholder="Select fuel type..." />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_FUEL_CATEGORIES.map(ft => (
                  <SelectItem
                    key={ft.value}
                    value={ft.value}
                    disabled={ft.disabled}
                    className={ft.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    {ft.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Optional Additional Fields */}
          <div className="space-y-4 pt-2 border-t border-border/50">
            <p className="text-xs font-medium text-muted-foreground">Additional Details (Optional)</p>

            {/* VIN */}
            <div className="space-y-2">
              <Label htmlFor="vin">VIN <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="vin"
                name="vin"
                placeholder="Vehicle Identification Number"
                value={form.vin}
                onChange={e => set("vin", e.target.value)}
                className="h-12"
              />
            </div>

            {/* Tank Capacity */}
            <div className="space-y-2">
              <Label htmlFor="tankCapacityLiters">Tank Capacity (Liters) <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="tankCapacityLiters"
                name="tankCapacityLiters"
                type="number"
                step="0.1"
                placeholder="e.g., 80"
                value={form.tankCapacityLiters}
                onChange={e => set("tankCapacityLiters", e.target.value)}
                className="h-12"
              />
            </div>

            {/* License Expiry */}
            <div className="space-y-2">
              <Label htmlFor="licenseExpiry">License Expiry Date <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="licenseExpiry"
                name="licenseExpiry"
                type="date"
                value={form.licenseExpiry}
                onChange={e => set("licenseExpiry", e.target.value)}
                className="h-12"
                max="2099-12-31"
              />
              <p className="text-xs text-muted-foreground">
                Enter the expiry date of your vehicle's license disc. This helps you track when your license needs renewal.
              </p>
            </div>

            {/* Insurance Policy Number */}
            <div className="space-y-2">
              <Label htmlFor="insurancePolicyNumber">Insurance Policy Number <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="insurancePolicyNumber"
                name="insurancePolicyNumber"
                placeholder="Insurance policy reference"
                value={form.insurancePolicyNumber}
                onChange={e => set("insurancePolicyNumber", e.target.value)}
                className="h-12"
              />
            </div>

            {/* Tracker Serial */}
            <div className="space-y-2">
              <Label htmlFor="trackerSerial">Tracker Serial <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="trackerSerial"
                name="trackerSerial"
                placeholder="GPS tracker serial number"
                value={form.trackerSerial}
                onChange={e => set("trackerSerial", e.target.value)}
                className="h-12"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="notes"
                name="notes"
                placeholder="Additional notes about the vehicle"
                value={form.notes}
                onChange={e => set("notes", e.target.value)}
                className="h-12"
              />
            </div>

            {/* Service Intervals */}
            <div className="space-y-4 pt-2 border-t border-border/50">
              <p className="text-xs font-medium text-muted-foreground">Service Intervals (Optional)</p>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="minorServiceIntervalKm">Minor Service (km)</Label>
                  <Input
                    id="minorServiceIntervalKm"
                    name="minorServiceIntervalKm"
                    type="number"
                    placeholder="e.g., 15000"
                    value={form.minorServiceIntervalKm}
                    onChange={e => set("minorServiceIntervalKm", e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="majorServiceIntervalKm">Major Service (km)</Label>
                  <Input
                    id="majorServiceIntervalKm"
                    name="majorServiceIntervalKm"
                    type="number"
                    placeholder="e.g., 60000"
                    value={form.majorServiceIntervalKm}
                    onChange={e => set("majorServiceIntervalKm", e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brakeOverhaulIntervalKm">Brake Overhaul (km)</Label>
                  <Input
                    id="brakeOverhaulIntervalKm"
                    name="brakeOverhaulIntervalKm"
                    type="number"
                    placeholder="e.g., 120000"
                    value={form.brakeOverhaulIntervalKm}
                    onChange={e => set("brakeOverhaulIntervalKm", e.target.value)}
                    className="h-12"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="minorServiceIntervalMonths">Minor (months)</Label>
                  <Input
                    id="minorServiceIntervalMonths"
                    name="minorServiceIntervalMonths"
                    type="number"
                    placeholder="e.g., 12"
                    value={form.minorServiceIntervalMonths}
                    onChange={e => set("minorServiceIntervalMonths", e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="majorServiceIntervalMonths">Major (months)</Label>
                  <Input
                    id="majorServiceIntervalMonths"
                    name="majorServiceIntervalMonths"
                    type="number"
                    placeholder="e.g., 48"
                    value={form.majorServiceIntervalMonths}
                    onChange={e => set("majorServiceIntervalMonths", e.target.value)}
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brakeOverhaulIntervalMonths">Brake (months)</Label>
                  <Input
                    id="brakeOverhaulIntervalMonths"
                    name="brakeOverhaulIntervalMonths"
                    type="number"
                    placeholder="e.g., 60"
                    value={form.brakeOverhaulIntervalMonths}
                    onChange={e => set("brakeOverhaulIntervalMonths", e.target.value)}
                    className="h-12"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Set custom service intervals for this vehicle. Used to calculate service due alerts.
              </p>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            disabled={isLoading || !form.fuelCategory}
          >
            {isLoading ? (isEditMode ? "Updating Vehicle…" : "Adding Vehicle…") : (isEditMode ? "Update Vehicle" : "Add Vehicle & Continue →")}
          </Button>
        </form>
        )}
      </CardContent>
    </Card>
  )
}
