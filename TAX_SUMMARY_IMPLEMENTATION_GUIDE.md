# Tax Summary Implementation Guide
**Complete Detailed Instructions**

## 1. SYSTEM ARCHITECTURE OVERVIEW

### Tech Stack
- **Backend**: JDK 21 Spring Boot, JWT, Gradle, PostgreSQL 16
- **Frontend**: Next.js
- **Deployment**: Docker ? OCI via SSH PowerShell script, Frontend ? GitHub ? Vercel
- **Development**: Build/test directly on production branch (no staging)

### Core Concept: Two Independent Timelines
The system maintains two separate data timelines for each vehicle:

**Timeline 1: Master Total Timeline (Fuel-Based)**
- Driven by sequential tank-to-tank fuel entries
- Each fuel entry has: odometer reading, amount, liters, timestamp, receipt image
- Purpose: Tracks total distance driven, fuel consumption, service alerts, tire rotation
- Anchors: March 1st photo (start) and Feb 28/29 photo (end of tax year)

**Timeline 2: Business Timeline (Logbook-Based)**
- Driven by chained business trip logs
- Each trip has: start odometer, end odometer, distance, timestamp, purpose
- Purpose: Tracks business kilometres for tax deduction
- Chained: New trips auto-fill start odometer from previous business trip's end odometer

### Why Two Timelines?
- Users fill up fuel regularly (sequential, high-integrity data)
- Users log business trips asynchronously (e.g., Sunday catch-up for past week)
- Private kilometres are automatically calculated as the mathematical remainder
- No need to log private trips explicitly

---

## 2. DATABASE SCHEMA (Key Tables)

### VEHICLE_TAX_PROFILE
```sql
- id (PK)
- vehicle_id (FK)
- tax_year (2024-2027)
- default_calculation_method (ENUM: ACTUAL_COSTS, SARS_COST_SCALE, SIMPLIFIED_REIMBURSIVE)
- is_company_provided_vehicle (BOOLEAN) - THE FRINGE BENEFIT TOGGLE
- march_1st_photo_odometer (INTEGER) - Locked baseline
- feb_28th_photo_odometer (INTEGER) - Closing photo (optional until year-end)
```

### FUEL_EXPENSE
```sql
- id (PK)
- vehicle_id (FK)
- amount_cents (BIGINT)
- liters (DECIMAL)
- odometer_reading (INTEGER) - THE MASTER TIMELINE ANCHOR
- timestamp (TIMESTAMPTZ)
- receipt_image_url (VARCHAR)
- deleted_at (TIMESTAMPTZ NULL) - Soft delete
```

### TRIP_LOG
```sql
- id (PK)
- vehicle_id (FK)
- start_odometer (INTEGER) - Auto-chained from previous business trip
- end_odometer (INTEGER)
- distance_kms (INTEGER)
- timestamp (TIMESTAMPTZ)
- purpose (ENUM: BUSINESS, PRIVATE, UNCLASSIFIED)
- deleted_at (TIMESTAMPTZ NULL) - Soft delete
```

---

## 3. USER WORKFLOWS

### Workflow A: Daily Fuel Entry (Master Timeline)
1. User pulls up to fuel pump
2. Opens app ? "Add Fuel Expense"
3. App pre-fills "Previous Odometer" from last fuel entry
4. User types current odometer reading
5. User taps to capture/upload receipt image
6. Backend calculates:
   - Interval delta = Current - Previous odometer
   - Updates average fuel consumption (L/100km)
   - Increments tire rotation counter
   - Increments maintenance alert counter
7. Data saved to FUEL_EXPENSE table

### Workflow B: Sunday Logbook Catch-Up (Business Timeline)
1. User opens app on Sunday evening
2. Selects vehicle to log trips for
3. Clicks "Add Business Trip"
4. Backend fetches end_odometer from last active business trip for this vehicle
5. Frontend auto-fills Start Odometer with that value
6. User enters End Odometer or Distance Driven
7. User enters destination, reason for travel
8. Trip saved to TRIP_LOG table
9. Repeat for each business trip from past week

**Key Point**: Private/leisure trips are NOT logged. They are automatically calculated.

---

## 4. TAX SUMMARY CALCULATION ENGINE

### Base Calculations (Shared for All Vehicles)

**Total Annual Distance:**
```
Total KM = Highest Fuel Odometer - March 1st Photo Baseline Odometer
```

**Total Business Distance:**
```
Business KM = SUM of (end_odometer - start_odometer) for all active TripLogs
           where vehicle_id = X AND deleted_at IS NULL
```

**Private/Leisure Kilometres (Calculated):**
```
Private KM = Total KM - Business KM
```

### The Fringe Benefit Toggle (is_company_provided_vehicle)

This boolean field in VEHICLE_TAX_PROFILE determines which calculation path to use.

---

## 5. CONDITION A: FRINGE BENEFIT = FALSE (Solo/Professional/Small Business)

### Who Uses This?
- Individual professionals (doctors, lawyers, contractors)
- Small business owners using personal vehicles
- Anyone with travel allowances

### SARS Rule
- SARS assumes 100% of mileage is private by default
- User only needs to prove business kilometres
- Private kilometres are automatically the remainder (no need to log them)

### Calculation
```
Business Use % = Business KM / Total KM
Deduction Amount = (Business Use %) × Total Fuel & Maintenance Expenses
```

### UI Behavior
- Hide all "Private/Leisure" input fields
- Trip log form only shows "Business Trip" option
- Private KM calculated silently in background
- User only logs business trips

---

## 6. CONDITION B: FRINGE BENEFIT = TRUE (Company Car/Fleet)

### Who Uses This?
- Employees with company-provided vehicles
- Corporate fleet managers
- Vehicles owned by employer

### SARS Rule
- SARS assumes 100% of mileage is business by default
- Employee taxed monthly on vehicle value (fringe benefit)
- To reduce tax, employee must prove private kilometres
- Logbook used to isolate private/leisure travel

### Calculation
```
Private/Leisure KM = Total KM - Business KM
Fringe Benefit Tax Reduction = Based on Private KM calculation
```

### UI Behavior
- Show "Private/Leisure" option in trip log
- User can explicitly log private trips
- Private KM used for fringe benefit tax reconciliation
- Business KM still tracked separately

---

## 7. THREE TAX CALCULATION METHODS

Users can choose their calculation method per vehicle via a button selector.

### Method 1: ACTUAL_COSTS
**Best for**: Those with detailed expense records

**Formula:**
```
Deduction = (Qualifying Current Expenses × Business Use %) + Wear & Tear
```

**Wear & Tear**: 20% per year for 5 years (max R665,000 vehicle value)

**Eligibility**: EMPLOYEE+ALLOWANCE, SOLE_PROPRIETOR, COMPANY

**Data Used**:
- Fuel expenses
- Maintenance expenses
- Business use % from logbook

---

### Method 2: SARS_COST_SCALE
**Best for**: Employees with travel allowances

**Formula:**
```
Deduction = (Fixed Cost × Business Days / Days in Year × Business Use %) 
          + Fuel Cost (if borne by employee) 
          + Maintenance Cost (if borne by employee)
```

**Vehicle Value Brackets** (9 tiers):
- R0 - R100,000
- R100,001 - R200,000
- R200,001 - R300,000
- ... up to >R920,000

**Eligibility**: EMPLOYEE+ALLOWANCE only

**Data Used**:
- Vehicle purchase value
- Business days in year
- Business use %
- Fuel/maintenance costs (only if borne by employee)

---

### Method 3: SIMPLIFIED_REIMBURSIVE
**Best for**: Employees with reimbursement arrangements

**Formula:**
```
Deduction = Business KM × Prescribed Rate
```

**Rates**:
- 2026: R4.76 per km
- 2027: R4.95 per km

**Eligibility**: EMPLOYEE+REIMBURSEMENT only

**Data Used**:
- Business kilometres only
- Ignores fuel expenses completely

---

## 8. PER-VEHICLE CONFIGURATION

Each vehicle has its own independent configuration:

**Vehicle Profile Settings:**
1. `default_calculation_method`: Which tax method to use
2. `is_company_provided_vehicle`: Fringe benefit toggle

**Example Use Case (Doctor with 3 cars):**
- Vehicle 1 (Personal Sedan): Simplified Reimbursive, Fringe Benefit OFF
- Vehicle 2 (Personal SUV): Actual Costs, Fringe Benefit OFF
- Vehicle 3 (Corporate Bakkie): Actual Costs, Fringe Benefit ON

**Frontend Behavior:**
- Method selector button inside each vehicle card/tab
- Fringe benefit toggle inside each vehicle card/tab
- Not global page settings

**Backend Behavior:**
- Loop through each vehicle
- Read that vehicle's configuration
- Calculate based on that vehicle's settings
- Aggregate totals for combined view

---

## 9. FLEET VS SOLO VIEW MODES

### OrganizationMode determines presentation:

**SOLO Mode:**
- Single professional workbook layout
- Focused on logbook compliance
- Individual vehicle cards
- Clean, simple interface

**BUSINESS_FLEET / COMPANY Mode:**
- Corporate fleet dashboard
- Grouped by asset cost centers or branches
- Combined total view
- Fleet optimization intelligence
- Fringe benefit reconciliation cards

---

## 10. IMPLEMENTATION CHECKLIST

### Backend (Spring Boot)

**TripLogController.java:**
- Add endpoint: GET /api/triplogs/latest-odometer?vehicleId=XYZ
- Query: Find end_odometer of last active business trip for this vehicle
- Return value for frontend auto-fill

**TaxYearSummaryService.java:**
- Implement per-vehicle calculation loop
- For each vehicle:
  1. Read is_company_provided_vehicle flag
  2. Calculate Total KM (Highest Fuel Odometer - March 1st Baseline)
  3. Calculate Business KM (Sum of TripLogs)
  4. If Fringe Benefit OFF:
     - Business % = Business KM / Total KM
     - Apply to fuel/maintenance expenses
  5. If Fringe Benefit ON:
     - Private KM = Total KM - Business KM
     - Pass to fringe benefit DTO
  6. Calculate all 3 tax methods
- Use BigDecimal for all math
- Respect soft-delete (deleted_at IS NULL)

**VehicleTaxProfile.java:**
- Ensure is_company_provided_vehicle field exists
- Ensure default_calculation_method field exists

### Frontend (Next.js)

**trip-log-form.tsx:**
- Call GET /api/triplogs/latest-odometer?vehicleId=XYZ on load
- Auto-fill Start Odometer field
- If is_company_provided_vehicle = FALSE:
  - Hide Private/Leisure option
  - Show only Business Trip
- If is_company_provided_vehicle = TRUE:
  - Show Business and Private/Leisure options

**tax-summary/page.tsx:**
- Render per-vehicle cards/tabs
- Inside each vehicle card:
  - Method selector button (Actual Costs, SARS Cost Scale, Simplified Reimbursive)
  - Fringe Benefit toggle switch
- Combined total view aggregates each vehicle's calculated value
- If OrganizationMode = SOLO: Show individual workbook layout
- If OrganizationMode = FLEET: Show grouped fleet layout

---

## 11. THE "ELASTIC GRID" CONCEPT

### How Private KM is Automatically Caught

**Fuel Interval Example:**
- Fill-up #1: 50,000 km (Monday)
- Fill-up #2: 50,800 km (Sunday)
- Total distance = 800 km

**Sunday Logbook Entry:**
- User logs 3 business trips from past week
- Total logged = 300 km

**Automatic Calculation:**
- Business KM = 300 km (from logbook)
- Total KM = 800 km (from fuel)
- Private KM = 800 - 300 = 500 km (automatic remainder)

**No need to log private trips** - the system catches them automatically.

---

## 12. ODOMETER CHAINING IMPLEMENTATION

### Business Trip Chain Logic

**When creating new TripLog:**
1. Query TRIP_LOG table
2. Find most recent active business trip where vehicle_id = X
3. Get its end_odometer value
4. Pre-fill new trip's start_odometer with that value
5. User only enters end_odometer or distance

**Why This Works:**
- Creates continuous chain of business mileage
- Frictionless for Sunday catch-up
- Private driving between trips is ignored in business chain
- Private KM calculated from fuel timeline difference

---

## 13. SOFT-DELETE HANDLING

All queries must respect soft-delete:
```sql
WHERE deleted_at IS NULL
```

When calculating totals:
- Exclude deleted fuel expenses
- Exclude deleted trip logs
- Maintain audit trail

---

## 14. DATA QUALITY WARNINGS

### Optional Enhancements (Not Blocking)
- Flag if fuel consumption is unrealistic
- Flag if odometer decreases (typo detection)
- Flag if trip times overlap
- These are warnings, not hard blocks

---

## 15. DEPLOYMENT NOTES

### Build Process
1. Backend: Gradle build ? JAR ? Transfer to OCI via SSH ? Docker restart
2. Frontend: Git push to GitHub ? Vercel auto-deploy
3. No staging environment (production branch only)

### Error Handling
- Rely on Docker/Vercel build failures to catch errors
- Read deployment logs for debugging
- No real production data (zero risk)

---

## 16. SUMMARY OF KEY POINTS

1. **Two Timelines**: Fuel (master total) + TripLog (business chain)
2. **Private KM**: Automatic remainder, not logged
3. **Fringe Benefit Toggle**: Inverts calculation logic
4. **Per-Vehicle Config**: Each vehicle has its own method and toggle
5. **Three Tax Methods**: Actual Costs, SARS Cost Scale, Simplified Reimbursive
6. **Odometer Chaining**: New trips auto-fill from previous business trip
7. **Fleet vs Solo**: Different presentation based on OrganizationMode
8. **Soft-Delete**: All queries respect deleted_at IS NULL
9. **BigDecimal**: All math uses BigDecimal for accuracy
10. **No Blocking**: Warnings only, no hard validation blocks

---

## 17. IMPLEMENTATION ORDER

1. First: Verify database schema has required fields
2. Second: Implement TripLog latest-odometer endpoint
3. Third: Update TaxYearSummaryService calculation logic
4. Fourth: Update frontend trip-log-form for auto-fill
5. Fifth: Update frontend tax-summary for per-vehicle selectors
6. Sixth: Test with sample data
7. Seventh: Deploy and verify
