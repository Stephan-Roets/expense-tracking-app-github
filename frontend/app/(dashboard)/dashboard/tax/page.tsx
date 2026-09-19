"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Car, Calculator, Download, FileText, TrendingUp } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/lib/contexts/auth-context";

interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
}

interface VehicleTaxProfile {
  id: string;
  organizationId: string;
  vehicleId: string;
  vehicleRegistration: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleCostCents: number;
  datePlacedInBusinessUse: string;
  taxpayerVatRegistered: boolean;
  taxpayerType: string;
  compensationType: string;
  fuelBorneBy: string;
  maintenanceBorneBy: boolean;
  coveredByMaintenancePlan: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface TaxCalculationResult {
  methodName: string;
  totalDeductionZAR: number;
  perKmRateZAR: number;
  totalKm: number;
  businessKm: number;
  privateKm: number;
  businessPercentage: number;
  description: string;
}

export default function TaxSummaryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [selectedTaxYear, setSelectedTaxYear] = useState<number>(2026);
  const [taxProfiles, setTaxProfiles] = useState<VehicleTaxProfile[]>([]);
  const [calculationResults, setCalculationResults] = useState<TaxCalculationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const taxYears = [2024, 2025, 2026, 2027];

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    if (selectedVehicleId) {
      fetchTaxProfiles();
    }
  }, [selectedVehicleId]);

  const fetchVehicles = async () => {
    try {
      const response = await apiFetch("/api/v1/admin/vehicles");
      if (response.ok) {
        const data = await response.json();
        setVehicles(data);
        if (data.length > 0) {
          setSelectedVehicleId(data[0].id);
        }
      }
    } catch (err) {
      setError("Failed to fetch vehicles");
    }
  };

  const fetchTaxProfiles = async () => {
    try {
      const response = await apiFetch(`/api/v1/vehicles/${selectedVehicleId}/tax-profiles`);
      if (response.ok) {
        const data = await response.json();
        setTaxProfiles(data);
      }
    } catch (err) {
      setError("Failed to fetch tax profiles");
    }
  };

  const calculateTaxComparison = async () => {
    if (!selectedVehicleId || !selectedTaxYear) return;

    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(
        `/api/v1/vehicles/${selectedVehicleId}/tax-profiles/tax-calculations?taxYear=${selectedTaxYear}`
      );
      if (response.ok) {
        const data = await response.json();
        // Transform the backend response to match frontend expectations
        const results = Object.entries(data.results || {}).map(([key, result]: [string, any]) => ({
          methodName: result.method,
          totalDeductionZAR: result.totalDeductionCents ? result.totalDeductionCents / 100 : 0,
          perKmRateZAR: result.perKmRateCents ? result.perKmRateCents / 100 : 0,
          totalKm: result.totalKm || 0,
          businessKm: result.businessKm || 0,
          privateKm: result.privateKm || 0,
          businessPercentage: result.businessPercentage || 0,
          description: result.eligible ? "Eligible" : result.ineligibilityReason || "Not eligible",
        }));
        setCalculationResults(results);
      } else {
        setError("Failed to calculate tax comparison. Please ensure a tax profile exists for this vehicle and tax year.");
      }
    } catch (err) {
      setError("Failed to calculate tax comparison");
    } finally {
      setLoading(false);
    }
  };

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const currentProfile = taxProfiles.find((p) => {
    const effectiveFrom = new Date(p.effectiveFrom);
    const effectiveTo = p.effectiveTo ? new Date(p.effectiveTo) : null;
    const taxYearStart = new Date(selectedTaxYear, 2, 1); // March 1st of tax year
    const taxYearEnd = new Date(selectedTaxYear + 1, 1, 28); // Feb 28/29 of next year
    
    return effectiveFrom <= taxYearEnd && (!effectiveTo || effectiveTo >= taxYearStart);
  });

  const formatZAR = (value: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax Summary</h1>
          <p className="text-muted-foreground">
            Compare tax deduction methods and manage vehicle tax profiles
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/tax/profiles")}>
          <FileText className="mr-2 h-4 w-4" />
          Manage Tax Profiles
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Vehicle & Tax Year Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Vehicle</label>
              <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.registrationNumber} - {vehicle.make} {vehicle.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <label className="text-sm font-medium mb-2 block">Tax Year</label>
              <Select value={selectedTaxYear.toString()} onValueChange={(v) => setSelectedTaxYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taxYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}/{(year + 1).toString().slice(-2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={calculateTaxComparison} disabled={loading || !selectedVehicleId}>
                <Calculator className="mr-2 h-4 w-4" />
                {loading ? "Calculating..." : "Calculate Comparison"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Profile Status */}
      {currentProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Current Tax Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Vehicle Cost</p>
                <p className="font-semibold">{formatZAR(currentProfile.vehicleCostCents / 100)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxpayer Type</p>
                <p className="font-semibold">{currentProfile.taxpayerType}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Compensation Type</p>
                <p className="font-semibold">{currentProfile.compensationType}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">VAT Registered</p>
                <Badge variant={currentProfile.taxpayerVatRegistered ? "default" : "secondary"}>
                  {currentProfile.taxpayerVatRegistered ? "Yes" : "No"}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fuel Borne By</p>
                <p className="font-semibold">{currentProfile.fuelBorneBy}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Maintenance Plan</p>
                <Badge variant={currentProfile.coveredByMaintenancePlan ? "default" : "secondary"}>
                  {currentProfile.coveredByMaintenancePlan ? "Yes" : "No"}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Effective From</p>
                <p className="font-semibold">{new Date(currentProfile.effectiveFrom).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Effective To</p>
                <p className="font-semibold">{currentProfile.effectiveTo ? new Date(currentProfile.effectiveTo).toLocaleDateString() : "Ongoing"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!currentProfile && selectedVehicleId && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">No tax profile found for this vehicle and tax year</p>
                <p className="text-sm text-muted-foreground">
                  Create a tax profile to enable tax calculations and exports
                </p>
              </div>
              <Button onClick={() => router.push("/dashboard/tax/profiles")}>
                Create Tax Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calculation Results */}
      {calculationResults.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          {calculationResults.map((result, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{result.methodName}</span>
                  <Badge variant="outline">{result.description}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold text-primary">
                  {formatZAR(result.totalDeductionZAR)}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Per km rate</p>
                    <p className="font-medium">{formatZAR(result.perKmRateZAR)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total km</p>
                    <p className="font-medium">{result.totalKm.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Business km</p>
                    <p className="font-medium">{result.businessKm.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Private km</p>
                    <p className="font-medium">{result.privateKm.toLocaleString()}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Business percentage</p>
                    <p className="font-medium">{result.businessPercentage.toFixed(2)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
