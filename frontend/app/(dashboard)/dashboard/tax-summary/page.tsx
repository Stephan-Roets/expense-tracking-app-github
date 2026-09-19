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
import { Car, Calculator, Download, AlertTriangle, CheckCircle } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { useAuth } from "@/lib/contexts/auth-context";
import { OrganizationMode } from "@/lib/types/database";

interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
}

interface VehicleTaxProfile {
  id: string;
  vehicleId: string;
  vehicleCostCents?: number;
  datePlacedInBusinessUse?: string;
  taxpayerVatRegistered?: boolean;
  taxpayerType?: string;
  compensationType?: string;
  fuelBorneBy?: string;
  maintenanceBorneBy?: string;
  coveredByMaintenancePlan?: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  defaultCalculationMethod?: 'ACTUAL_COSTS' | 'SARS_COST_SCALE' | 'SIMPLIFIED_REIMBURSIVE';
  isCompanyProvidedVehicle?: boolean;
  march1stPhotoOdometer?: number | null;
  feb28thPhotoOdometer?: number | null;
}

interface TaxYearSummary {
  vehicleId: string;
  taxYear: number;
  totalKm: number;
  businessKm: number;
  privateKm: number;
  unclassifiedKm: number;
  businessPercentage: number;
  distanceSource: string;
  qualifyingCurrentExpenseCents: number;
  capitalOrAllowanceReviewCents: number;
  uncategorizedExpenseCents: number;
  dataQualityWarnings: string[];
}

interface TaxCalculationResult {
  method: string;
  eligible: boolean;
  ineligibilityReason?: string;
  totalDeductionCents: number;
  fixedCostCents: number;
  fuelCostCents: number;
  maintenanceCostCents: number;
  businessShare: number;
  businessUseDays: number | null;
  daysInTaxYear: number | null;
  bracketDescription: string;
  breakdown: Record<string, any>;
}

interface TaxComparisonResponse {
  results: Record<string, TaxCalculationResult>;
}

export default function TaxSummaryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [selectedTaxYear, setSelectedTaxYear] = useState<number>(2026);
  const [taxSummary, setTaxSummary] = useState<TaxYearSummary | null>(null);
  const [allTaxSummaries, setAllTaxSummaries] = useState<TaxYearSummary[]>([]);
  const [viewMode, setViewMode] = useState<'individual' | 'combined'>('individual');
  const [comparisonResults, setComparisonResults] = useState<TaxCalculationResult[]>([]);
  const [vehicleComparisonResults, setVehicleComparisonResults] = useState<Record<string, TaxCalculationResult[]>>({});
  const [selectedMethodPerVehicle, setSelectedMethodPerVehicle] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [calculateLoading, setCalculateLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [vehicleTaxProfile, setVehicleTaxProfile] = useState<VehicleTaxProfile | null>(null);
  const [showTaxProfileConfig, setShowTaxProfileConfig] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Partial<VehicleTaxProfile>>({});
  const [vehicleCostInput, setVehicleCostInput] = useState<string>('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Phase 8: Multi-tenant view switching based on organization mode
  const isFleetMode = user?.organizationMode === OrganizationMode.BUSINESS_FLEET || user?.organizationMode === OrganizationMode.COMPANY;
  const isSoloMode = user?.organizationMode === OrganizationMode.SOLO;

  const taxYears = [2024, 2025, 2026, 2027];

  useEffect(() => {
    fetchVehicles();
  }, []);

  useEffect(() => {
    if (viewMode === 'combined') {
      fetchAllTaxSummaries();
    } else if (selectedVehicleId) {
      fetchTaxSummary();
      fetchVehicleTaxProfile();
    }
  }, [selectedVehicleId, selectedTaxYear, viewMode]);

  const fetchVehicles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch("/vehicles");
      console.log("Tax Summary - Vehicles response:", response);
      if (response.ok) {
        const data = await response.json();
        console.log("Tax Summary - Vehicles data:", data);

        // Phase 8: Sort vehicles for fleet mode
        let sortedVehicles = data;
        if (isFleetMode && data.length > 0) {
          // Sort by make/model for fleet organization
          sortedVehicles = [...data].sort((a: Vehicle, b: Vehicle) => {
            const makeCompare = a.make.localeCompare(b.make);
            if (makeCompare !== 0) return makeCompare;
            return a.model.localeCompare(b.model);
          });
        }

        setVehicles(sortedVehicles);
        if (sortedVehicles.length > 0) {
          setSelectedVehicleId(sortedVehicles[0].id);
        } else {
          setError("No vehicles found. Please add a vehicle first.");
        }
      } else {
        const errorText = await response.text();
        console.error("Tax Summary - Vehicles error:", errorText);
        setError(`Failed to fetch vehicles: ${response.status}`);
      }
    } catch (err) {
      console.error("Tax Summary - Vehicles fetch error:", err);
      setError("Failed to fetch vehicles");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTaxSummaries = async () => {
    if (!selectedTaxYear) return;

    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(`/tax-year-summaries/tax-year/${selectedTaxYear}`);
      if (response.ok) {
        const data = await response.json();
        setAllTaxSummaries(data);

        // Fetch comparison results for all vehicles
        const vehicleResults: Record<string, TaxCalculationResult[]> = {};
        const vehicleMethods: Record<string, string> = {};

        for (const summary of data) {
          const compResponse = await apiFetch(`/vehicles/${summary.vehicleId}/tax-profiles/tax-calculations?taxYear=${selectedTaxYear}`);
          if (compResponse.ok) {
            const compData: TaxComparisonResponse = await compResponse.json();
            const results = Object.entries(compData.results || {}).map(([key, result]) => ({
              ...result,
              method: key,
            }));
            vehicleResults[summary.vehicleId] = results;

            // Auto-select the first eligible method for each vehicle
            const firstEligible = results.find((r) => r.eligible);
            if (firstEligible) {
              vehicleMethods[summary.vehicleId] = firstEligible.method;
            }
          }
        }

        setVehicleComparisonResults(vehicleResults);
        setSelectedMethodPerVehicle(vehicleMethods);
      } else if (response.status === 404) {
        // No tax summaries exist for this tax year
        setAllTaxSummaries([]);
        setVehicleComparisonResults({});
        setSelectedMethodPerVehicle({});
        setError(null);
      } else {
        setError("Failed to fetch tax summaries");
      }
    } catch (err) {
      setError("Failed to fetch tax summaries");
    } finally {
      setLoading(false);
    }
  };

  const fetchTaxSummary = async () => {
    if (!selectedVehicleId || !selectedTaxYear) return;

    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch(`/tax-year-summaries/vehicle/${selectedVehicleId}/tax-year/${selectedTaxYear}`);
      if (response.ok) {
        const data = await response.json();
        setTaxSummary(data);
      } else if (response.status === 404) {
        // No tax summary exists for this vehicle and tax year
        setTaxSummary(null);
        setError(null); // Clear error, this is expected
      } else {
        setError("Failed to fetch tax summary");
      }
    } catch (err) {
      setError("Failed to fetch tax summary");
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicleTaxProfile = async () => {
    if (!selectedVehicleId) return;

    try {
      const response = await apiFetch(`/vehicles/${selectedVehicleId}/tax-profiles/active`);
      if (response.ok) {
        const data = await response.json();
        setVehicleTaxProfile(data);
        setEditingProfile(data);
        setVehicleCostInput(data.vehicleCostCents ? (data.vehicleCostCents / 100).toFixed(2) : '');
      } else if (response.status === 404) {
        // No tax profile exists for this vehicle
        setVehicleTaxProfile(null);
        setEditingProfile({});
        setVehicleCostInput('');
      }
    } catch (err) {
      // 404 is expected when no tax profile exists - don't log
      const error = err as any;
      if (!error?.message?.includes('404')) {
        console.error("Failed to fetch vehicle tax profile:", err);
      }
    }
  };

  const saveTaxProfile = async () => {
    if (!selectedVehicleId) return;

    // Validate required fields
    const validationErrors: string[] = [];

    if (!editingProfile.vehicleCostCents || editingProfile.vehicleCostCents <= 0) {
      validationErrors.push('Vehicle Cost is required and must be greater than 0');
    }
    if (!editingProfile.datePlacedInBusinessUse) {
      validationErrors.push('Date Placed in Business Use is required');
    }
    if (!editingProfile.taxpayerType) {
      validationErrors.push('Taxpayer Type is required');
    }
    if (!editingProfile.compensationType) {
      validationErrors.push('Compensation Type is required');
    }
    if (!editingProfile.fuelBorneBy) {
      validationErrors.push('Fuel Borne By is required');
    }
    if (!editingProfile.maintenanceBorneBy) {
      validationErrors.push('Maintenance Borne By is required');
    }

    if (validationErrors.length > 0) {
      setError(validationErrors.join('; '));
      return;
    }

    setSavingProfile(true);
    setError(null);
    try {
      const profileData = {
        vehicleId: selectedVehicleId,
        vehicleCostCents: editingProfile.vehicleCostCents,
        datePlacedInBusinessUse: editingProfile.datePlacedInBusinessUse,
        taxpayerVatRegistered: editingProfile.taxpayerVatRegistered || false,
        taxpayerType: editingProfile.taxpayerType,
        compensationType: editingProfile.compensationType,
        fuelBorneBy: editingProfile.fuelBorneBy,
        maintenanceBorneBy: editingProfile.maintenanceBorneBy,
        coveredByMaintenancePlan: editingProfile.coveredByMaintenancePlan || false,
        effectiveFrom: editingProfile.effectiveFrom || new Date().toISOString().split('T')[0],
        effectiveTo: editingProfile.effectiveTo || null,
        defaultCalculationMethod: editingProfile.defaultCalculationMethod || 'ACTUAL_COSTS',
        isCompanyProvidedVehicle: editingProfile.isCompanyProvidedVehicle || false,
      };

      let response;
      if (vehicleTaxProfile?.id) {
        // Update existing profile
        response = await apiFetch(`/vehicles/${selectedVehicleId}/tax-profiles/${vehicleTaxProfile.id}`, {
          method: 'PUT',
          body: JSON.stringify(profileData),
        });
      } else {
        // Create new profile
        response = await apiFetch(`/vehicles/${selectedVehicleId}/tax-profiles`, {
          method: 'POST',
          body: JSON.stringify(profileData),
        });
      }

      if (response.ok) {
        const data = await response.json();
        setVehicleTaxProfile(data);
        setEditingProfile(data);
        // Refetch tax summary to recalculate with new profile
        await handleCalculate();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save tax profile');
      }
    } catch (err) {
      setError('Failed to save tax profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const fetchComparisonResults = async () => {
    if (!selectedVehicleId || !selectedTaxYear) return;

    setComparisonLoading(true);
    setError(null);
    try {
      const response = await apiFetch(`/vehicles/${selectedVehicleId}/tax-profiles/tax-calculations?taxYear=${selectedTaxYear}`);
      if (response.ok) {
        const data: TaxComparisonResponse = await response.json();
        const results = Object.entries(data.results || {}).map(([key, result]) => ({
          ...result,
          method: key,
        }));
        setComparisonResults(results);
        // Auto-select the first eligible method
        const firstEligible = results.find((r) => r.eligible);
        if (firstEligible) {
          setSelectedMethod(firstEligible.method);
        }
      } else if (response.status === 404) {
        // No tax profile exists for this vehicle
        setError("A tax profile is required to compare tax calculation methods. Please set up a tax profile for this vehicle first.");
      } else {
        setError("Failed to fetch tax comparison results");
      }
    } catch (err) {
      setError("Failed to fetch tax comparison results");
    } finally {
      setComparisonLoading(false);
    }
  };

  const handleCalculate = async () => {
    if (!selectedVehicleId || !selectedTaxYear) return;

    setCalculateLoading(true);
    setError(null);
    try {
      const response = await apiFetch(
        `/tax-year-summaries/calculate/vehicle/${selectedVehicleId}/tax-year/${selectedTaxYear}`,
        {
          method: "POST",
        }
      );
      if (response.ok) {
        const data = await response.json();
        setTaxSummary(data);
      } else {
        setError("Failed to calculate tax summary");
      }
    } catch (err) {
      setError("Failed to calculate tax summary");
    } finally {
      setCalculateLoading(false);
    }
  };

  const handleSarsExport = async (exportType: 'submission' | 'enhanced', overrideMethod?: string) => {
    if (!selectedVehicleId || !selectedTaxYear) return;

    setExportLoading(true);
    setError(null);
    try {
      const endpoint = exportType === 'submission'
        ? '/exports/sars-submission'
        : '/exports/sars-logbook/enhanced';

      const requestData = {
        vehicleId: selectedVehicleId,
        taxYear: selectedTaxYear,
        organizationId: user?.organizationId,
        calculationMethod: overrideMethod || selectedMethod, // Use override if provided, else selected
      };

      const response = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sars-${exportType}-${selectedVehicleId}-${selectedTaxYear}${overrideMethod ? `-${overrideMethod}` : ''}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        setError(errorData.error || `Failed to export ${exportType}`);
      }
    } catch (err) {
      setError(`Failed to export ${exportType}`);
    } finally {
      setExportLoading(false);
    }
  };

  const handleExport = async (overrideMethod?: string) => {
    if (!selectedVehicleId || !selectedTaxYear || !selectedMethod) return;

    setExportLoading(true);
    setError(null);
    try {
      const methodToUse = overrideMethod || selectedMethod;
      const response = await apiFetch(
        `/exports/export?vehicleId=${selectedVehicleId}&taxYear=${selectedTaxYear}&calculationMethod=${methodToUse}`,
        {
          method: "POST",
        }
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `tax-export-${selectedVehicleId}-${selectedTaxYear}${overrideMethod ? `-${overrideMethod}` : ''}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError("Failed to export tax data");
      }
    } catch (err) {
      setError("Failed to export tax data");
    } finally {
      setExportLoading(false);
    }
  };

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  const combinedSummary = allTaxSummaries.length > 0 ? {
    totalKm: allTaxSummaries.reduce((sum, s) => sum + (s.totalKm || 0), 0),
    businessKm: allTaxSummaries.reduce((sum, s) => sum + (s.businessKm || 0), 0),
    privateKm: allTaxSummaries.reduce((sum, s) => sum + (s.privateKm || 0), 0),
    unclassifiedKm: allTaxSummaries.reduce((sum, s) => sum + (s.unclassifiedKm || 0), 0),
    businessPercentage: allTaxSummaries.reduce((sum, s) => sum + (s.businessPercentage || 0), 0) / allTaxSummaries.length,
    qualifyingCurrentExpenseCents: allTaxSummaries.reduce((sum, s) => sum + (s.qualifyingCurrentExpenseCents || 0), 0),
    capitalOrAllowanceReviewCents: allTaxSummaries.reduce((sum, s) => sum + (s.capitalOrAllowanceReviewCents || 0), 0),
    uncategorizedExpenseCents: allTaxSummaries.reduce((sum, s) => sum + (s.uncategorizedExpenseCents || 0), 0),
    dataQualityWarnings: allTaxSummaries.flatMap(s => s.dataQualityWarnings || []),
    distanceSource: "Combined",
  } : null;

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
            {isFleetMode ? "Fleet tax year summaries and optimization" : "Individual tax year summaries and data quality information"}
          </p>
        </div>
        {/* Phase 8: Organization mode indicator */}
        <Badge variant={isFleetMode ? "default" : "secondary"}>
          {isFleetMode ? "Fleet Mode" : "Solo Mode"}
        </Badge>
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
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">View Mode</legend>
                <div className="flex gap-2" role="radiogroup" aria-label="View Mode">
                  <Button
                    variant={viewMode === 'individual' ? 'default' : 'outline'}
                    onClick={() => setViewMode('individual')}
                    className="flex-1"
                    role="radio"
                    aria-checked={viewMode === 'individual'}
                  >
                    Individual Vehicle
                  </Button>
                  <Button
                    variant={viewMode === 'combined' ? 'default' : 'outline'}
                    onClick={() => setViewMode('combined')}
                    className="flex-1"
                    role="radio"
                    aria-checked={viewMode === 'combined'}
                  >
                    Combined Total
                  </Button>
                </div>
              </fieldset>
            </div>
            {viewMode === 'individual' && (
              <div className="flex-1 w-full">
                <label htmlFor="vehicle-select" className="text-sm font-medium mb-2 block">Vehicle</label>
                <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId} name="vehicle">
                  <SelectTrigger id="vehicle-select">
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
            )}
            <div className="w-full md:w-48">
              <label htmlFor="tax-year-select" className="text-sm font-medium mb-2 block">Tax Year</label>
              <Select value={selectedTaxYear.toString()} onValueChange={(v) => setSelectedTaxYear(parseInt(v))} name="tax-year">
                <SelectTrigger id="tax-year-select">
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
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Tax Profile Configuration */}
      {viewMode === 'individual' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Vehicle Tax Profile Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!vehicleTaxProfile && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  No tax profile set up for this vehicle. Set up a tax profile to configure tax calculation methods and odometer baselines.
                </p>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Vehicle Cost (ZAR) *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={vehicleCostInput}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    setVehicleCostInput(value);
                    setEditingProfile({ ...editingProfile, vehicleCostCents: value ? Math.round(parseFloat(value) * 100) : 0 });
                  }}
                  onBlur={(e) => {
                    if (e.target.value) {
                      const numValue = parseFloat(e.target.value);
                      setVehicleCostInput(numValue.toFixed(2));
                      setEditingProfile({ ...editingProfile, vehicleCostCents: Math.round(numValue * 100) });
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., 250000.00"
                  required
                />
                <p className="text-xs text-gray-500">Total vehicle cost including VAT (purchase price + accessories).</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Placed in Business Use *</label>
                <input
                  type="date"
                  value={editingProfile.datePlacedInBusinessUse || ''}
                  onChange={(e) => setEditingProfile({ ...editingProfile, datePlacedInBusinessUse: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
                <p className="text-xs text-gray-500">When this vehicle was first used for business purposes.</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Taxpayer Type *</label>
                <Select
                  value={editingProfile.taxpayerType || 'EMPLOYEE'}
                  onValueChange={(value) => setEditingProfile({ ...editingProfile, taxpayerType: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="SOLE_PROPRIETOR">Sole Proprietor</SelectItem>
                    <SelectItem value="COMPANY">Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Compensation Type *</label>
                <Select
                  value={editingProfile.compensationType || 'TRAVEL_ALLOWANCE'}
                  onValueChange={(value) => setEditingProfile({ ...editingProfile, compensationType: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRAVEL_ALLOWANCE">Travel Allowance</SelectItem>
                    <SelectItem value="REIMBURSEMENT">Reimbursement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Fuel Borne By *</label>
                <Select
                  value={editingProfile.fuelBorneBy || 'EMPLOYEE'}
                  onValueChange={(value) => setEditingProfile({ ...editingProfile, fuelBorneBy: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="EMPLOYER">Employer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Maintenance Borne By *</label>
                <Select
                  value={editingProfile.maintenanceBorneBy || 'EMPLOYEE'}
                  onValueChange={(value) => setEditingProfile({ ...editingProfile, maintenanceBorneBy: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="EMPLOYER">Employer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Default Calculation Method *</label>
                <Select
                  value={editingProfile.defaultCalculationMethod || 'ACTUAL_COSTS'}
                  onValueChange={(value) => setEditingProfile({ ...editingProfile, defaultCalculationMethod: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTUAL_COSTS">Actual Costs</SelectItem>
                    <SelectItem value="SARS_COST_SCALE">SARS Cost Scale</SelectItem>
                    <SelectItem value="SIMPLIFIED_REIMBURSIVE">Simplified Reimbursive (AA Rates)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Company Provided Vehicle</label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingProfile.isCompanyProvidedVehicle || false}
                    onChange={(e) => setEditingProfile({ ...editingProfile, isCompanyProvidedVehicle: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">
                    {editingProfile.isCompanyProvidedVehicle ? 'Yes (Fringe Benefit)' : 'No (Personal Vehicle)'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">Company car (fringe benefit) changes how private use is displayed for tax purposes.</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button
                onClick={saveTaxProfile}
                disabled={savingProfile || !editingProfile.march1stPhotoOdometer}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {savingProfile ? 'Saving...' : vehicleTaxProfile ? 'Update Profile' : 'Create Profile'}
              </Button>
              {vehicleTaxProfile && (
                <Button
                  variant="outline"
                  onClick={() => setEditingProfile(vehicleTaxProfile)}
                  disabled={savingProfile}
                >
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase 8: Fleet Optimization Intelligence */}
      {isFleetMode && viewMode === 'combined' && combinedSummary && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Fleet Optimization Intelligence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Fleet Business KM</span>
                <span className="text-lg font-bold text-blue-900">{combinedSummary.businessKm?.toLocaleString()} km</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Fleet Business Percentage</span>
                <span className="text-lg font-bold text-blue-900">{combinedSummary.businessPercentage?.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Qualifying Expenses</span>
                <span className="text-lg font-bold text-blue-900">{formatZAR((combinedSummary.qualifyingCurrentExpenseCents || 0) / 100)}</span>
              </div>
              <p className="text-xs text-blue-700 mt-2">
                Fleet-level aggregation across {allTaxSummaries.length} vehicle(s)
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fleet TOTAL TAX DEDUCTIBLE Display */}
      {isFleetMode && viewMode === 'combined' && allTaxSummaries.length > 0 && Object.keys(vehicleComparisonResults).length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-blue-900">TOTAL TAX DEDUCTIBLE (Fleet)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-900">
              {formatZAR(
                allTaxSummaries.reduce((total, summary) => {
                  const selectedMethod = selectedMethodPerVehicle[summary.vehicleId];
                  const results = vehicleComparisonResults[summary.vehicleId] || [];
                  const selectedResult = results.find(r => r.method === selectedMethod);
                  return total + (selectedResult?.totalDeductionCents || 0);
                }, 0) / 100
              )}
            </div>
            <p className="text-sm text-blue-700 mt-2">
              Sum of selected calculation methods across {allTaxSummaries.length} vehicle(s)
            </p>
            <div className="mt-4 space-y-2">
              {allTaxSummaries.map((summary) => {
                const vehicle = vehicles.find(v => v.id === summary.vehicleId);
                const selectedMethod = selectedMethodPerVehicle[summary.vehicleId];
                const results = vehicleComparisonResults[summary.vehicleId] || [];
                const selectedResult = results.find(r => r.method === selectedMethod);
                return (
                  <div key={summary.vehicleId} className="flex items-center justify-between text-sm">
                    <span className="text-blue-800">{vehicle?.registrationNumber || 'Unknown Vehicle'}</span>
                    <span className="font-semibold">{formatZAR((selectedResult?.totalDeductionCents || 0) / 100)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Quality Banner */}
      {((viewMode === 'individual' && taxSummary) || (viewMode === 'combined' && combinedSummary)) &&
       ((viewMode === 'individual' ? taxSummary : combinedSummary)?.dataQualityWarnings?.length || 0) > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-orange-900">Data Quality Warnings</h3>
                <ul className="mt-2 space-y-1 text-sm text-orange-800">
                  {(viewMode === 'individual' ? taxSummary : combinedSummary)?.dataQualityWarnings?.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
                {/* Odometer drift warning for ALL users */}
                {(viewMode === 'individual' ? taxSummary : combinedSummary)?.dataQualityWarnings?.some(w => w.includes('odometer drift')) && (
                  <p className="mt-3 text-xs text-orange-700 font-medium">
                    ⚠️ Tax calculations and SARS exports are blocked until odometer drift is resolved.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Tax Summary State */}
      {((viewMode === 'individual' && !taxSummary) || (viewMode === 'combined' && !combinedSummary)) && !loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <CheckCircle className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">No Tax Summary Available</h3>
                <p className="text-muted-foreground mt-2">
                  {viewMode === 'individual'
                    ? "Calculate a tax summary for this vehicle and tax year to view tax calculations and data quality information."
                    : "Calculate tax summaries for your vehicles to view combined totals across all vehicles."
                  }
                </p>
              </div>
              {viewMode === 'individual' && (
                <Button
                  onClick={handleCalculate}
                  disabled={calculateLoading}
                  className="flex items-center gap-2"
                >
                  <Calculator className="h-4 w-4" />
                  {calculateLoading ? "Calculating..." : "Calculate Tax Summary"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {((viewMode === 'individual' && taxSummary) || (viewMode === 'combined' && combinedSummary)) && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {viewMode === 'combined'
                ? (isFleetMode ? 'Fleet Combined Tax Year Summary' : 'Combined Tax Year Summary (All Vehicles)')
                : 'Tax Year Summary'}
            </h2>
            <div className="flex gap-2">
              {viewMode === 'individual' && (
                <Button
                  onClick={fetchComparisonResults}
                  disabled={comparisonLoading}
                  className="flex items-center gap-2"
                >
                  <Calculator className="h-4 w-4" />
                  {comparisonLoading ? "Calculating..." : "Compare Methods"}
                </Button>
              )}
              {viewMode === 'individual' && (
                <>
                  <Button
                    onClick={() => handleSarsExport('submission')}
                    disabled={exportLoading}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {exportLoading ? "Exporting..." : "SARS eFiling Export"}
                  </Button>
                  <Button
                    onClick={() => handleSarsExport('enhanced')}
                    disabled={exportLoading}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {exportLoading ? "Exporting..." : "Enhanced Logbook"}
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total KM</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(viewMode === 'individual' ? taxSummary : combinedSummary)?.totalKm?.toLocaleString() ?? 'N/A'}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {(viewMode === 'individual' ? taxSummary : combinedSummary)?.distanceSource ?? 'N/A'}
                  </Badge>
                  {vehicleTaxProfile?.march1stPhotoOdometer && (
                    <p className="text-xs text-muted-foreground">
                      Baseline: {vehicleTaxProfile.march1stPhotoOdometer.toLocaleString()}
                    </p>
                  )}
                  {vehicleTaxProfile?.feb28thPhotoOdometer && (
                    <p className="text-xs text-muted-foreground">
                      Closing: {vehicleTaxProfile.feb28thPhotoOdometer.toLocaleString()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {vehicleTaxProfile?.isCompanyProvidedVehicle ? (
              // Company car mode: emphasize private KM with fringe benefit label
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-orange-900">Private / Leisure KM</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-900">{(viewMode === 'individual' ? taxSummary : combinedSummary)?.privateKm?.toLocaleString() ?? 'N/A'}</div>
                  <p className="text-xs text-orange-700 mt-1 font-medium">
                    Fringe benefit reduction
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    SARS assumes a company car is fully taxable; your logged business KM reduces the taxable private use.
                  </p>
                </CardContent>
              </Card>
            ) : (
              // Personal car mode: emphasize business KM
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Business KM</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(viewMode === 'individual' ? taxSummary : combinedSummary)?.businessKm?.toLocaleString() ?? 'N/A'}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(viewMode === 'individual' ? taxSummary : combinedSummary)?.businessPercentage?.toFixed(1) ?? 'N/A'}% of total
                  </p>
                </CardContent>
              </Card>
            )}

            {vehicleTaxProfile?.isCompanyProvidedVehicle ? (
              // Company car mode: show business KM as supporting evidence
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Business KM (Evidence)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(viewMode === 'individual' ? taxSummary : combinedSummary)?.businessKm?.toLocaleString() ?? 'N/A'}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Logged business trips support fringe benefit reduction
                  </p>
                </CardContent>
              </Card>
            ) : (
              // Personal car mode: do not show Private KM card (it's calculated internally)
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Business KM (Evidence)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(viewMode === 'individual' ? taxSummary : combinedSummary)?.businessKm?.toLocaleString() ?? 'N/A'}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Logged business trips for tax deduction
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Unclassified KM</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(viewMode === 'individual' ? taxSummary : combinedSummary)?.unclassifiedKm?.toLocaleString() ?? 'N/A'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Needs review
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Qualifying Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(viewMode === 'individual' ? taxSummary : combinedSummary)?.qualifyingCurrentExpenseCents ? formatZAR(((viewMode === 'individual' ? taxSummary : combinedSummary)?.qualifyingCurrentExpenseCents || 0) / 100) : 'N/A'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tax-deductible
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Capital/Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(viewMode === 'individual' ? taxSummary : combinedSummary)?.capitalOrAllowanceReviewCents ? formatZAR(((viewMode === 'individual' ? taxSummary : combinedSummary)?.capitalOrAllowanceReviewCents || 0) / 100) : 'N/A'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Requires review
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Uncategorized</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(viewMode === 'individual' ? taxSummary : combinedSummary)?.uncategorizedExpenseCents ? formatZAR(((viewMode === 'individual' ? taxSummary : combinedSummary)?.uncategorizedExpenseCents || 0) / 100) : 'N/A'}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Needs classification
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Business Percentage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(viewMode === 'individual' ? taxSummary : combinedSummary)?.businessPercentage?.toFixed(1) ?? 'N/A'}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Business use ratio
                </p>
              </CardContent>
            </Card>
          </div>

          {/* TOTAL TAX DEDUCTIBLE Display */}
          {selectedMethod && comparisonResults.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-blue-900">TOTAL TAX DEDUCTIBLE</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-blue-900">
                  {formatZAR((comparisonResults.find(r => r.method === selectedMethod)?.totalDeductionCents || 0) / 100)}
                </div>
                <p className="text-sm text-blue-700 mt-2">
                  Based on {comparisonResults.find(r => r.method === selectedMethod)?.method.replace(/_/g, ' ')} method
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Method Comparison Cards */}
      {comparisonResults.length > 0 && viewMode === 'individual' && (
        <>
          <h2 className="text-xl font-semibold">Tax Calculation Method Comparison</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {comparisonResults.map((result) => (
              <Card
                key={result.method}
                className={result.eligible ? "" : "opacity-60"}
                onClick={() => result.eligible && setSelectedMethod(result.method)}
                style={{ cursor: result.eligible ? 'pointer' : 'default' }}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {result.method.replace(/_/g, " ")}
                    </CardTitle>
                    <Badge variant={result.eligible ? "default" : "secondary"}>
                      {result.eligible ? "Eligible" : "Not Applicable"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!result.eligible && result.ineligibilityReason && (
                    <p className="text-sm text-muted-foreground">
                      {result.ineligibilityReason}
                    </p>
                  )}
                  {result.eligible && (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Deduction</p>
                        <p className="text-2xl font-bold">
                          {formatZAR(result.totalDeductionCents / 100)}
                        </p>
                      </div>
                      {result.bracketDescription && (
                        <div>
                          <p className="text-sm text-muted-foreground">Bracket/Rate Source</p>
                          <p className="font-semibold text-xs">{result.bracketDescription}</p>
                        </div>
                      )}
                      {result.fixedCostCents > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground">Fixed Costs</p>
                          <p className="font-semibold">{formatZAR(result.fixedCostCents / 100)}</p>
                        </div>
                      )}
                      {result.fuelCostCents > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground">Fuel Costs</p>
                          <p className="font-semibold">{formatZAR(result.fuelCostCents / 100)}</p>
                        </div>
                      )}
                      {result.maintenanceCostCents > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground">Maintenance Costs</p>
                          <p className="font-semibold">{formatZAR(result.maintenanceCostCents / 100)}</p>
                        </div>
                      )}
                      <div className="pt-2 border-t">
                        <p className="text-sm text-muted-foreground">Business Share</p>
                        <p className="font-semibold">{(result.businessShare * 100).toFixed(1)}%</p>
                      </div>
                      {result.businessUseDays !== null && (
                        <div>
                          <p className="text-sm text-muted-foreground">Business Use Days</p>
                          <p className="font-semibold">{result.businessUseDays} / {result.daysInTaxYear}</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Export Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Tax Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label htmlFor="calculation-method-select" className="text-sm font-medium mb-2 block">Calculation Method</label>
                  <Select
                    value={selectedMethod}
                    onValueChange={setSelectedMethod}
                    disabled={exportLoading}
                    name="calculation-method"
                  >
                    <SelectTrigger id="calculation-method-select">
                      <SelectValue placeholder="Select a method" />
                    </SelectTrigger>
                    <SelectContent>
                      {comparisonResults
                        .filter((r) => r.eligible)
                        .map((result) => (
                          <SelectItem key={result.method} value={result.method}>
                            {result.method.replace(/_/g, " ")} - {formatZAR(result.totalDeductionCents / 100)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => handleExport()}
                  disabled={!selectedMethod || exportLoading}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {exportLoading ? "Exporting..." : "Export"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading tax summary...</div>
            </div>
          </CardContent>
        </Card>
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
