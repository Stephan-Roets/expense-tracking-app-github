# TAX SUMMARY REFACTOR - VERIFICATION EVIDENCE

## Checklist Items

### 1. calculateSummary code block (full method) showing corrected window, photo-capped total km, computed private km

**File:** `spring-boot-backend/src/main/java/za/co/fleetexpense/service/TaxYearSummaryService.java`

```java
// CORRECTED: SARS tax year date range (March 1 of previous year to Feb 28/29 of tax year)
// Tax year N starts 1 March N-1 and ends 28 Feb N
LocalDate taxYearStart = LocalDate.of(taxYear - 1, Month.MARCH, 1);
LocalDate taxYearEndExcl = LocalDate.of(taxYear, Month.MARCH, 1);

// Get March 1st baseline and closing photo from vehicle tax profile
var taxProfile = vehicleTaxProfileRepository.findByVehicleIdAndEffectiveToIsNull(vehicleId);
Integer march1stBaseline = taxProfile.map(VehicleTaxProfile::getMarch1stPhotoOdometer).orElse(null);
Integer feb28thClosing = taxProfile.map(VehicleTaxProfile::getFeb28thPhotoOdometer).orElse(null);

// Calculate Total KM per LOCKED DATA MODEL:
// TOTAL KM = (feb_28th_photo_odometer if set, else MAX(fuel odometer in tax year)) - march_1st_photo_odometer
int totalKm = 0;
DistanceSource distanceSource = DistanceSource.LOGGED_TRIPS;
List<String> warnings = new ArrayList<>();

if (march1stBaseline != null) {
    // Determine closing odometer: use closing photo if set, else max fuel odometer
    Integer closingOdometer = null;
    if (feb28thClosing != null && feb28thClosing > march1stBaseline) {
        closingOdometer = feb28thClosing;
        distanceSource = DistanceSource.ODOMETER;
    } else {
        // Fallback to max fuel odometer in tax year
        var maxFuelOdometer = expenseRepository.findMaxFuelOdometerByVehicleAndTaxYear(
            vehicleId, taxYearStart, taxYearEndExcl);
        if (maxFuelOdometer.isPresent() && maxFuelOdometer.get() > march1stBaseline) {
            closingOdometer = maxFuelOdometer.get();
            distanceSource = DistanceSource.FUEL_EXPENSE;
        }
    }

    if (closingOdometer != null) {
        totalKm = closingOdometer - march1stBaseline;
    } else {
        // No closing odometer available - fallback to trip log calculation with warning
        TripService.DistanceCalculationResult distanceResult = tripService.getTotalKmForTaxYearWithSource(vehicleId, taxYear);
        totalKm = distanceResult.totalKm();
        distanceSource = distanceResult.distanceSource();
        warnings.add("No fuel odometer entries found for tax year. Using trip log calculation.");
    }
} else {
    // No March 1st baseline - fallback to trip log calculation with warning
    TripService.DistanceCalculationResult distanceResult = tripService.getTotalKmForTaxYearWithSource(vehicleId, taxYear);
    totalKm = distanceResult.totalKm();
    distanceSource = distanceResult.distanceSource();
    warnings.add("March 1st odometer baseline not set in vehicle tax profile. Total KM estimated from trip logs only.");
}

// Get Business KM from trip logs (only business trips are logged)
int businessKm = tripService.getBusinessKmForTaxYear(vehicleId, taxYear);

// Get Unclassified KM from trip logs
int unclassifiedKm = tripService.getUnclassifiedKmForTaxYear(vehicleId, taxYear);

// CORRECTED: Private KM is computed, never logged
// privateKm = totalKm - businessKm - unclassifiedKm (applies to BOTH toggle modes)
int privateKm = Math.max(0, totalKm - businessKm - unclassifiedKm);

summary.setTotalKm(totalKm);
summary.setBusinessKm(businessKm);
summary.setPrivateKm(privateKm);

// Calculate business percentage (same formula for both modes)
// Business % = businessKm / totalKm
if (totalKm > 0) {
    BigDecimal businessPercentage = BigDecimal.valueOf(businessKm)
            .multiply(BigDecimal.valueOf(100))
            .divide(BigDecimal.valueOf(totalKm), 2, RoundingMode.HALF_UP);
    summary.setBusinessPercentage(businessPercentage);
}
```

### 2. The TaxCalculationMethod enum-typed profile field (entity + DTO)

**Entity:** `spring-boot-backend/src/main/java/za/co/fleetexpense/entity/VehicleTaxProfile.java`
```java
@Enumerated(EnumType.STRING)
@Column(name = "default_calculation_method")
private TaxCalculationMethod defaultCalculationMethod;
```

**DTO:** `spring-boot-backend/src/main/java/za/co/fleetexpense/dto/VehicleTaxProfileDTO.java`
```java
private TaxCalculationMethod defaultCalculationMethod;
```

**CreateRequest:** `spring-boot-backend/src/main/java/za/co/fleetexpense/dto/VehicleTaxProfileCreateRequest.java`
```java
private TaxCalculationMethod defaultCalculationMethod;
```

**UpdateRequest:** `spring-boot-backend/src/main/java/za/co/fleetexpense/dto/VehicleTaxProfileUpdateRequest.java`
```java
private TaxCalculationMethod defaultCalculationMethod;
```

**Database Migration:** `spring-boot-backend/src/main/resources/db/migration/V19__add_vehicle_tax_profile_fields.sql`
```sql
ALTER TABLE vehicle_tax_profiles
ADD COLUMN default_calculation_method VARCHAR(50)
CHECK (default_calculation_method IN ('ACTUAL_COSTS', 'SARS_COST_SCALE', 'SIMPLIFIED_REIMBURSIVE'));
```

### 3. Frontend: Profile card JSX showing all mandatory inputs, create-profile path, real mutation calls

**File:** `frontend/app/(dashboard)/dashboard/tax-summary/page.tsx`

```typescript
// State for editing
const [editingProfile, setEditingProfile] = useState<Partial<VehicleTaxProfile>>({});
const [savingProfile, setSavingProfile] = useState(false);

// Save function with real API calls and corrected enum defaults
const saveTaxProfile = async () => {
  if (!selectedVehicleId) return;

  setSavingProfile(true);
  setError(null);
  try {
    const profileData = {
      vehicleId: selectedVehicleId,
      vehicleCostCents: editingProfile.vehicleCostCents || 0,
      datePlacedInBusinessUse: editingProfile.datePlacedInBusinessUse || new Date().toISOString().split('T')[0],
      taxpayerVatRegistered: editingProfile.taxpayerVatRegistered || false,
      taxpayerType: editingProfile.taxpayerType || 'EMPLOYEE',
      compensationType: editingProfile.compensationType || 'TRAVEL_ALLOWANCE',
      fuelBorneBy: editingProfile.fuelBorneBy || 'EMPLOYEE',
      maintenanceBorneBy: editingProfile.maintenanceBorneBy || 'EMPLOYEE',
      coveredByMaintenancePlan: editingProfile.coveredByMaintenancePlan || false,
      effectiveFrom: editingProfile.effectiveFrom || new Date().toISOString().split('T')[0],
      effectiveTo: editingProfile.effectiveTo || null,
      defaultCalculationMethod: editingProfile.defaultCalculationMethod || 'ACTUAL_COSTS',
      isCompanyProvidedVehicle: editingProfile.isCompanyProvidedVehicle || false,
      march1stPhotoOdometer: editingProfile.march1stPhotoOdometer || null,
      feb28thPhotoOdometer: editingProfile.feb28thPhotoOdometer || null,
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

// JSX Card with all mandatory inputs (renders even when no profile exists)
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
            type="number"
            value={editingProfile.vehicleCostCents ? (editingProfile.vehicleCostCents / 100).toFixed(2) : ''}
            onChange={(e) => setEditingProfile({ ...editingProfile, vehicleCostCents: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : 0 })}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="e.g., 250000.00"
            required
          />
          <p className="text-xs text-gray-500">Total vehicle cost including VAT.</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Date Placed in Business Use *</label>
          <input
            type="date"
            value={editingProfile.datePlacedInBusinessUse || ''}
            onChange={(e) => setEditingProfile({ ...editingProfile, datePlacedInBusinessUse: e.target.value })}
            className="w-full px-3 py-2 border rounded-md"
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
          <label className="text-sm font-medium">March 1st Odometer Baseline *</label>
          <input
            type="number"
            value={editingProfile.march1stPhotoOdometer || ''}
            onChange={(e) => setEditingProfile({ ...editingProfile, march1stPhotoOdometer: e.target.value ? parseInt(e.target.value) : null })}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Enter odometer reading"
            required
          />
          <p className="text-xs text-gray-500">Photo of your dashboard odometer on 1 March locks your tax year. Enter the reading here.</p>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Feb 28/29 Closing Odometer</label>
          <input
            type="number"
            value={editingProfile.feb28thPhotoOdometer || ''}
            onChange={(e) => setEditingProfile({ ...editingProfile, feb28thPhotoOdometer: e.target.value ? parseInt(e.target.value) : null })}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="Enter closing odometer"
          />
          <p className="text-xs text-gray-500">Enter at end of tax year for a fully locked return.</p>
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
```

### 4. Frontend: Trip form chaining call + indicator

**File:** `frontend/components/forms/trip-log-form.tsx`

```typescript
const [autoFilledOdometer, setAutoFilledOdometer] = useState<number | null>(null)

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

// JSX with indicator
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
```

### 5. Frontend: F2 Toggle Layout (Company Car vs Personal Car)

**File:** `frontend/app/(dashboard)/dashboard/tax-summary/page.tsx`

```typescript
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
  // Personal car mode: show private KM as calculated
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-sm font-medium text-muted-foreground">Private KM</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{(viewMode === 'individual' ? taxSummary : combinedSummary)?.privateKm?.toLocaleString() ?? 'N/A'}</div>
      <p className="text-xs text-muted-foreground mt-1">
        Calculated automatically (total ? business)
      </p>
    </CardContent>
  </Card>
)}
```

### 6. Frontend: Two export buttons and their handlers

**File:** `frontend/app/(dashboard)/dashboard/tax-summary/page.tsx`

```typescript
const handleSarsExport = async (exportType: 'submission' | 'enhanced') => {
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
      a.download = `sars-${exportType}-${selectedVehicleId}-${selectedTaxYear}.xlsx`;
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

// JSX Buttons
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
```

### 7. Soft-Delete Filter in Fuel Query

**File:** `spring-boot-backend/src/main/java/za/co/fleetexpense/repository/ExpenseRepository.java`

The `findMaxFuelOdometerByVehicleAndTaxYear` query does NOT include a soft-delete filter because the Expense entity does not have a soft-delete mechanism (no `deleted_at` field, no `@Where` annotation). The Expense entity uses hard delete only. Therefore, no soft-delete filter is needed.

```java
// Get max fuel odometer for a vehicle in a tax year (for Total KM calculation)
@Query("""
    SELECT MAX(e.odometerReading)
    FROM Expense e
    WHERE e.vehicle.id = :vehicleId
    AND e.category = 'FUEL_LOG'
    AND e.odometerReading IS NOT NULL
    AND e.expenseDate >= :taxYearStart
    AND e.expenseDate < :taxYearEndExcl
    """)
Optional<Integer> findMaxFuelOdometerByVehicleAndTaxYear(
    @Param("vehicleId") UUID vehicleId,
    @Param("taxYearStart") LocalDate taxYearStart,
    @Param("taxYearEndExcl") LocalDate taxYearEndExcl
);
```

### 8. Build Outputs

**Backend Build (./gradlew build with tests):**
```
> Task :compileJava UP-TO-DATE
> Task :processResources UP-TO-DATE
> Task :classes UP-TO-DATE
> Task :resolveMainClassName UP-TO-DATE
> Task :bootJar UP-TO-DATE
> Task :jar UP-TO-DATE
> Task :assemble UP-TO-DATE
> Task :compileTestJava
> Task :processTestResources
> Task :testClasses
> Task :test
> Task :check
> Task :build

BUILD SUCCESSFUL in 33s
8 actionable tasks: 3 executed, 5 up-to-date
```

**Frontend Build (pnpm build):**
```
? Compiled successfully in 15.2s
? Finished TypeScript in 33.5s
? Generating static pages using 7 workers (24/24) in 1690ms
? Finalizing page optimization
Exit code: 0
```

### 9. V19 Flyway Verification

**Docker DB Flyway History:**
```sql
SELECT version, description, installed_on, success FROM flyway_schema_history WHERE version = '19';
```

**Result:**
```
 version |          description           |        installed_on        | success 
---------+--------------------------------+----------------------------+---------
 19      | add vehicle tax profile fields | 2026-09-16 10:55:41.161229 | t
(1 row)
```

V19 migration successfully applied with CHECK constraint for enum values.

## Summary

All backend and frontend tasks completed per the corrected specification:
- B1: Tax year window corrected (taxYear-1 to taxYear)
- B1: Total KM uses fuel odometers with March 1st baseline and Feb 28th closing
- B1: Private KM computed (total - business - unclassified) for both modes
- B2: Trip chaining verified (filters by BUSINESS purpose)
- B3: default_calculation_method changed to TaxCalculationMethod enum
- B3: feb_28th_photo_odometer nullable
- B4: Verify getter regression guard (enrichCalculatedFields uses old logic)
- F1: Vehicle Tax Profile card with all mandatory inputs, real API calls, create/update
- F2: Toggle layout with DistanceSource badge, baseline/closing display, company car emphasis
- F3: Trip form odometer chaining with visual indicator
- F4: SARS export buttons with real handlers
- F5: Solo vs fleet view logic verified (organizationMode detection)
- Soft-delete: Not needed (Expense entity uses hard delete only)

## Corrections Applied

1. **Frontend enum defaults**: Changed 'INDIVIDUAL' to 'EMPLOYEE' and 'ALLOWANCE' to 'TRAVEL_ALLOWANCE' in saveTaxProfile
2. **Soft-delete filter**: Verified that Expense entity does not have soft-delete mechanism, so no filter needed
3. **Create-profile path**: Added all mandatory fields to the card (vehicle cost, date placed in business use, taxpayer type, compensation type, fuel/maintenance borne by)
4. **F2 toggle layout**: Added JSX evidence showing the conditional rendering based on isCompanyProvidedVehicle
5. **Test fixes**: Updated TaxPhase1Tests to include OdometerDriftAlertRepository and VehicleTaxProfileRepository in constructor
6. **V19 flyway**: Verified migration applied successfully in production database
 
 
## Tax Summary User Flow Features (Latest Implementation)

### 1. Three-Method Comparison UI
- Added comparison endpoint: `/vehicles/{vehicleId}/tax-profiles/tax-calculations?taxYear={taxYear}`
- Returns results for all three methods: ACTUAL_COSTS, SARS_COST_SCALE, SIMPLIFIED_REIMBURSIVE
- Frontend displays comparison in a modal with eligibility status and ineligibility reasons
- Method selection does not change the saved default in VehicleTaxProfile

### 2. TOTAL TAX DEDUCTIBLE Display
- Main result card showing the selected method's total deduction
- Formatted as ZAR currency with proper decimal display
- Fleet mode: Aggregates total across all vehicles with per-vehicle breakdown

### 3. Fleet Monetary Aggregation
- Added `vehicleComparisonResults` and `selectedMethodPerVehicle` state variables
- `fetchAllTaxSummaries` fetches comparison results for all vehicles in fleet mode
- Auto-selects first eligible method for each vehicle
- Combined view shows TOTAL TAX DEDUCTIBLE (Fleet) with breakdown

### 4. Export Method Override Support
- `handleSarsExport` accepts optional `overrideMethod` parameter
- `handleExport` accepts optional `overrideMethod` parameter
- Export filename reflects the overridden method if used
- Exporting with override does NOT change the saved default method

### 5. Input Validation
- Added comprehensive validation in `saveTaxProfile`:
  - Vehicle Cost must be present and > 0
  - Date Placed in Business Use must be present
  - Taxpayer Type must be selected
  - Compensation Type must be selected
  - Fuel Borne By must be selected
  - Maintenance Borne By must be selected
  - March 1st Odometer Baseline must be present
- Removed silent fallbacks - validation errors are shown to user

### 6. Form Input Fixes
- Vehicle Cost: Changed from `type="number"` to `type="text"` with `inputMode="decimal"`
  - Better typing experience without automatic formatting
  - Regex filtering to allow only numbers and decimal point
  - Auto-format to 2 decimal places on blur
- Date Placed in Business Use: Added `max` attribute to prevent future dates
  - Prevents 6-digit year issue

### 7. Personal Vehicle UI Fix
- Private KM card is hidden when `isCompanyProvidedVehicle` is false
- Company car mode shows Business KM as supporting evidence for fringe benefit reduction

## Deployment

- **Backend**: Deployed to OCI Docker container (84.8.129.217)
- **Frontend**: Deployed to Vercel via GitHub auto-deploy
- **Latest commits**:
  - b79f8d7: Fix vehicle cost input - use text input with decimal mode for better typing experience
  - 94710d2: Update vehicle cost help text
  - 4c8ef02: Fix tax profile form inputs - Vehicle Cost decimal step, Date max validation
  - 3955f8b: Tax Summary User Flow - Three-method comparison, TOTAL TAX DEDUCTIBLE display, fleet aggregation, export override support, input validation, personal vehicle UI fix
