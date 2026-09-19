// ============================================================================
// VEHICLE EXPENSE & TAX COMPLIANCE SYSTEM - TypeScript Types
// South African ZAR Currency | SARS Logbook Compliant
// ============================================================================

// ============================================================================
// ENUMS
// ============================================================================

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  DRIVER = 'DRIVER',
  ASSISTANT = 'ASSISTANT',
  RENTAL_CUSTOMER = 'RENTAL_CUSTOMER'
}

export enum OrganizationMode {
  SOLO = 'SOLO',
  FLEET = 'FLEET', // Deprecated: Use BUSINESS_FLEET or COMPANY instead
  BUSINESS_FLEET = 'BUSINESS_FLEET',
  COMPANY = 'COMPANY'
}

export enum FuelType {
  DIESEL_10PPM = 'DIESEL_10PPM',
  DIESEL_50PPM = 'DIESEL_50PPM',
  DIESEL_500PPM = 'DIESEL_500PPM',
  PETROL_UNLEADED_93 = 'PETROL_UNLEADED_93',
  PETROL_UNLEADED_95 = 'PETROL_UNLEADED_95'
}

export enum ExpenseCategory {
  FUEL_LOG = 'FUEL_LOG',
  MECHANIC_SERVICE = 'MECHANIC_SERVICE',  // Renamed to "Service & Repairs" in UI
  MAINTENANCE_TOPUP = 'MAINTENANCE_TOPUP',
  TIRES = 'TIRES',
  CAR_WASH = 'CAR_WASH',  // New: Promoted from maintenance top-ups
  INSURANCE_PREMIUM = 'INSURANCE_PREMIUM',
  VEHICLE_TRACKING = 'VEHICLE_TRACKING',
  ETOLL_SANRAL = 'ETOLL_SANRAL',
  LICENSE_RENEWAL = 'LICENSE_RENEWAL',
  PERSONAL_LICENSE = 'PERSONAL_LICENSE',  // New: Personal driver's license & ID card
  ROADWORTHY = 'ROADWORTHY',
  OTHER_FIXED = 'OTHER_FIXED'
}

export enum MaintenanceItemType {
  ENGINE_OIL = 'ENGINE_OIL',
  BRAKE_FLUID = 'BRAKE_FLUID',
  ANTIFREEZE = 'ANTIFREEZE',
  BATTERY = 'BATTERY',
  FUSES = 'FUSES',
  RELAYS = 'RELAYS',
  WIPER_BLADES = 'WIPER_BLADES',
  LIGHT_BULBS = 'LIGHT_BULBS',
  OTHER = 'OTHER'  // Miscellaneous items
}

// New enum for Car Wash types (promoted from maintenance)
export enum CarWashType {
  WASH_AND_GO = 'WASH_AND_GO',
  FULL_VALET = 'FULL_VALET',
  ENGINE_STEAM_CLEAN = 'ENGINE_STEAM_CLEAN'
}

// Drivetrain types for tyre rotation logic
export enum DrivetrainType {
  FWD = 'FWD',       // Front Wheel Drive - 8,000km rotation
  RWD = 'RWD',       // Rear Wheel Drive - 10,000km rotation
  AWD = 'AWD',       // All Wheel Drive - 6,000km rotation
  FOUR_BY_FOUR = 'FOUR_BY_FOUR'  // 4x4 - 6,000km rotation
}

export enum ServiceType {
  MAJOR_SERVICE = 'MAJOR_SERVICE',
  MINOR_SERVICE = 'MINOR_SERVICE',
  BRAKE_OVERHAUL = 'BRAKE_OVERHAUL',
  ENGINE_REPAIR = 'ENGINE_REPAIR',
  TRANSMISSION = 'TRANSMISSION',
  SUSPENSION = 'SUSPENSION',
  ELECTRICAL = 'ELECTRICAL',
  AIR_CONDITIONING = 'AIR_CONDITIONING',
  WINDSCREEN_GLASS = 'WINDSCREEN_GLASS',  // New: Chip repairs/replacements
  OTHER = 'OTHER'
}

export enum FixedExpenseType {
  INSURANCE_PREMIUM = 'INSURANCE_PREMIUM',
  VEHICLE_TRACKING = 'VEHICLE_TRACKING',
  ETOLL_SANRAL = 'ETOLL_SANRAL',
  LICENSE_RENEWAL = 'LICENSE_RENEWAL',
  ROADWORTHY = 'ROADWORTHY',
  OTHER_FIXED = 'OTHER_FIXED'
}

export enum TripPurpose {
  BUSINESS = 'BUSINESS',
  PRIVATE = 'PRIVATE',
  UNCLASSIFIED = 'UNCLASSIFIED'
}

export enum TaxExpenseClassification {
  QUALIFYING_CURRENT_EXPENSE = 'QUALIFYING_CURRENT_EXPENSE',
  CAPITAL_OR_ALLOWANCE_REVIEW = 'CAPITAL_OR_ALLOWANCE_REVIEW',
  PERSONAL_OR_NON_QUALIFYING = 'PERSONAL_OR_NON_QUALIFYING',
  UNCATEGORIZED = 'UNCATEGORIZED'
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  EXPIRED = 'EXPIRED'
}

export enum VehicleStatus {
  ACTIVE = 'ACTIVE',
  PENDING_CREATION = 'PENDING_CREATION',
  PENDING_DELETION = 'PENDING_DELETION'
}

export enum OdometerReadingType {
  OPENING = 'OPENING',
  CLOSING = 'CLOSING'
}

// ============================================================================
// DISPLAY LABELS (South African Context)
// ============================================================================

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  [FuelType.DIESEL_10PPM]: 'Diesel 10ppm (Ultra Low Sulphur)',
  [FuelType.DIESEL_50PPM]: 'Diesel 50ppm',
  [FuelType.DIESEL_500PPM]: 'Diesel 500ppm',
  [FuelType.PETROL_UNLEADED_93]: 'Petrol Unleaded 93',
  [FuelType.PETROL_UNLEADED_95]: 'Petrol Unleaded 95'
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  [ExpenseCategory.FUEL_LOG]: 'Fuel',
  [ExpenseCategory.MECHANIC_SERVICE]: 'Service & Repairs',  // Renamed from Mechanic Service
  [ExpenseCategory.MAINTENANCE_TOPUP]: 'Maintenance Top-ups (DIY)',
  [ExpenseCategory.TIRES]: 'Tyres',
  [ExpenseCategory.CAR_WASH]: 'Wash & Valet',
  [ExpenseCategory.INSURANCE_PREMIUM]: 'Insurance Premium',
  [ExpenseCategory.VEHICLE_TRACKING]: 'Vehicle Tracking',
  [ExpenseCategory.ETOLL_SANRAL]: 'E-Toll (SANRAL)',
  [ExpenseCategory.LICENSE_RENEWAL]: 'License Renewal',
  [ExpenseCategory.PERSONAL_LICENSE]: 'Personal License',
  [ExpenseCategory.ROADWORTHY]: 'Roadworthy Test',
  [ExpenseCategory.OTHER_FIXED]: 'Other'
}

export const MAINTENANCE_ITEM_LABELS: Record<MaintenanceItemType, string> = {
  [MaintenanceItemType.ENGINE_OIL]: 'Engine Oil',
  [MaintenanceItemType.BRAKE_FLUID]: 'Brake Fluid',
  [MaintenanceItemType.ANTIFREEZE]: 'Antifreeze/Coolant',
  [MaintenanceItemType.BATTERY]: 'Battery',
  [MaintenanceItemType.FUSES]: 'Fuses',
  [MaintenanceItemType.RELAYS]: 'Relays',
  [MaintenanceItemType.WIPER_BLADES]: 'Wiper Blades',
  [MaintenanceItemType.LIGHT_BULBS]: 'Light Bulbs',
  [MaintenanceItemType.OTHER]: 'Other/Miscellaneous'
}

export const CAR_WASH_TYPE_LABELS: Record<CarWashType, string> = {
  [CarWashType.WASH_AND_GO]: 'Wash & Go',
  [CarWashType.FULL_VALET]: 'Full Valet',
  [CarWashType.ENGINE_STEAM_CLEAN]: 'Engine Steam Clean'
}

export const DRIVETRAIN_TYPE_LABELS: Record<DrivetrainType, string> = {
  [DrivetrainType.FWD]: 'Front Wheel Drive (FWD)',
  [DrivetrainType.RWD]: 'Rear Wheel Drive (RWD)',
  [DrivetrainType.AWD]: 'All Wheel Drive (AWD)',
  [DrivetrainType.FOUR_BY_FOUR]: '4x4 / 4WD'
}

// Rotation interval in km based on drivetrain
export const ROTATION_INTERVAL_KM: Record<DrivetrainType, number> = {
  [DrivetrainType.FWD]: 8000,
  [DrivetrainType.RWD]: 10000,
  [DrivetrainType.AWD]: 6000,
  [DrivetrainType.FOUR_BY_FOUR]: 6000
}

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  [ServiceType.MAJOR_SERVICE]: 'Major Service',
  [ServiceType.MINOR_SERVICE]: 'Minor Service',
  [ServiceType.BRAKE_OVERHAUL]: 'Brake Overhaul',
  [ServiceType.ENGINE_REPAIR]: 'Engine Repair',
  [ServiceType.TRANSMISSION]: 'Transmission',
  [ServiceType.SUSPENSION]: 'Suspension',
  [ServiceType.ELECTRICAL]: 'Electrical',
  [ServiceType.AIR_CONDITIONING]: 'Air Conditioning',
  [ServiceType.WINDSCREEN_GLASS]: 'Windscreen & Glass',
  [ServiceType.OTHER]: 'Other'
}

export const FIXED_EXPENSE_LABELS: Record<FixedExpenseType, string> = {
  [FixedExpenseType.INSURANCE_PREMIUM]: 'Insurance Premium',
  [FixedExpenseType.VEHICLE_TRACKING]: 'Vehicle Tracking',
  [FixedExpenseType.ETOLL_SANRAL]: 'E-Tolls (SANRAL)',
  [FixedExpenseType.LICENSE_RENEWAL]: 'License Renewal',
  [FixedExpenseType.ROADWORTHY]: 'Roadworthy Certificate',
  [FixedExpenseType.OTHER_FIXED]: 'Other'
}

// ============================================================================
// LOCK STATUS
// ============================================================================

export interface LockInfo {
  isLocked: boolean
  lockedAt?: Date
  lockedByUserId?: string
  lockedByName?: string
  lockedReason?: string
}

// ============================================================================
// ENTRY IMAGES
// ============================================================================

export interface EntryImage {
  id: string
  organizationId: string
  entryType: 'VEHICLE' | 'EXPENSE' | 'TRIP' | 'ODOMETER_VERIFICATION'
  entryId: string
  imageUrl: string
  imageKey?: string
  imageType: 'RECEIPT' | 'ODOMETER' | 'ATTACHMENT' | 'DAMAGE'
  fileName?: string
  fileSizeBytes?: number
  mimeType?: string
  description?: string
  uploadedByUserId?: string
  uploadedByName?: string
  isLocked: boolean
  lockedAt?: Date
  lockedByUserId?: string
  lockedByName?: string
  lockedReason?: string
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// BASE INTERFACES
// ============================================================================

export interface Organization {
  id: string
  name: string
  mode: OrganizationMode
  taxNumber?: string
  vatNumber?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  province?: string
  postalCode?: string
  country: string
  phone?: string
  ownerId?: string
  createdAt: Date
  updatedAt: Date
  isActive: boolean
}

export interface User {
  id: string
  organizationId: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  phone?: string
  employeeNumber?: string
  driversLicenseNumber?: string
  driversLicenseExpiry?: Date
  emailVerified: boolean
  lastLogin?: Date
  createdAt: Date
  updatedAt: Date
  isActive: boolean
}

export interface Vehicle {
  id: string
  organizationId: string
  assignedDriverId?: string
  registrationNumber: string
  vin?: string
  make: string
  model: string
  year: number
  nickname?: string
  color?: string
  fuelType: FuelType
  tankCapacityLiters?: number
  currentOdometer: number
  purchaseDate?: Date
  purchasePrice?: number
  licenseExpiry?: Date
  insurancePolicyNumber?: string
  trackerSerial?: string
  notes?: string
  // Lock fields
  isLocked: boolean
  lockedAt?: Date
  lockedByUserId?: string
  lockedReason?: string
  // Status field
  status?: VehicleStatus
  // Rejection fields
  rejectionReason?: string
  rejectedAt?: Date
  rejectedByUserId?: string
  rejectedByName?: string
  // Timestamps
  createdAt: Date
  updatedAt: Date
  isActive: boolean
  // Additional fields from views
  lockedByName?: string
  imageCount?: number
}

// ============================================================================
// EXPENSE INTERFACES
// ============================================================================

export interface Expense {
  id: string
  organizationId: string
  vehicleId: string
  userId: string
  category: ExpenseCategory
  expenseDate: Date
  amountZar: number
  vatAmountZar: number
  description?: string
  receiptImageUrl?: string
  receiptImageKey?: string
  odometerReading?: number
  supplierName?: string
  invoiceNumber?: string
  isTaxDeductible: boolean
  // Lock fields
  isLocked: boolean
  lockedAt?: Date
  lockedByUserId?: string
  lockedReason?: string
  // Timestamps
  createdAt: Date
  updatedAt: Date
  // Additional fields from views
  lockedByName?: string
  imageCount?: number
}

export interface FuelLog {
  id: string
  expenseId: string
  fuelType: FuelType
  liters: number
  pricePerLiter: number
  fullTank: boolean
  stationName?: string
  stationLocation?: string
  previousOdometer?: number
  kmSinceLastFill?: number
  efficiencyKmPerLiter?: number
  // New consumption fields (L/100km - SA standard)
  isBaselineFill?: boolean
  consumptionLPer100km?: number
  consumptionCalculatedAt?: Date
  consumptionNotes?: string
  createdAt: Date
}

// Vehicle Fuel Consumption Stats
export interface VehicleFuelConsumptionStats {
  id: string
  organizationId: string
  vehicleId: string
  // Totals
  totalFuelLogs: number
  totalFullTankFills: number
  totalLiters: number
  totalDistanceKm: number
  totalFuelCostZar: number
  // Averages
  averageConsumptionLPer100km?: number
  bestConsumptionLPer100km?: number
  worstConsumptionLPer100km?: number
  recentAverageConsumptionLPer100km?: number
  // Last fill info
  lastFillOdometer?: number
  lastFillDate?: Date
  lastFillFullTank?: boolean
  // Timestamps
  createdAt: Date
  updatedAt: Date
}

// Extended vehicle with fuel consumption stats
export interface VehicleWithFuelStats extends Vehicle {
  fuelStats?: VehicleFuelConsumptionStats
  costPerKmZar?: number
  estimatedKmPerTank?: number
}

export interface MechanicService {
  id: string
  expenseId: string
  serviceType: ServiceType
  workshopName: string
  workshopPhone?: string
  workshopAddress?: string
  technicianName?: string
  laborCostZar?: number
  partsCostZar?: number
  workDescription?: string
  partsReplaced?: string
  warrantyMonths?: number
  nextServiceDueKm?: number
  nextServiceDueDate?: Date
  createdAt: Date
}

export interface MaintenanceTopup {
  id: string
  expenseId: string
  itemType: MaintenanceItemType
  itemBrand?: string
  itemQuantity: number
  itemUnit?: string
  shopName?: string
  notes?: string
  createdAt: Date
}

export interface Tire {
  id: string
  expenseId: string
  brand: string
  model?: string
  size: string
  quantity: number
  position?: string
  purchaseOdometer: number
  treadDepthMm?: number
  expectedLifespanKm?: number
  rotationIntervalKm: number
  lastRotationOdometer?: number
  warrantyKm?: number
  notes?: string
  createdAt: Date
}

export interface FixedExpense {
  id: string
  expenseId: string
  expenseType: FixedExpenseType
  providerName?: string
  policyNumber?: string
  coverageStart?: Date
  coverageEnd?: Date
  paymentFrequency?: string
  referenceNumber?: string
  notes?: string
  createdAt: Date
}

// ============================================================================
// FIXED & ADMIN EXPENSE - SEPARATE TABLES
// ============================================================================

// Insurance Premium
export interface InsurancePremium {
  id: string
  expenseId: string
  insurerName: string
  policyNumber: string
  policyType: 'COMPREHENSIVE' | 'THIRD_PARTY' | 'THIRD_PARTY_FIRE_THEFT'
  coverageStartDate: Date
  coverageEndDate: Date
  monthlyPremiumZar: number
  excessAmountZar?: number
  brokerName?: string
  brokerPhone?: string
  claimPhoneNumber?: string
  coverDetails?: string
  // Lock fields
  isLocked: boolean
  lockedAt?: Date
  lockedByUserId?: string
  lockedReason?: string
  createdAt: Date
  updatedAt: Date
}

// Vehicle Tracking
export interface VehicleTracking {
  id: string
  expenseId: string
  providerName: string
  subscriptionType: 'MONTHLY' | 'ANNUAL' | 'ONCE_OFF'
  monthlyFeeZar: number
  contractStartDate: Date
  contractEndDate?: Date
  deviceSerialNumber?: string
  deviceType?: string
  installationDate?: Date
  recoveryIncluded: boolean
  appLoginEmail?: string
  supportPhoneNumber?: string
  features?: string
  // Lock fields
  isLocked: boolean
  lockedAt?: Date
  lockedByUserId?: string
  lockedReason?: string
  createdAt: Date
  updatedAt: Date
}

// E-Tolls (SANRAL)
export interface ETollSanral {
  id: string
  expenseId: string
  accountNumber?: string
  tagSerialNumber?: string
  vehicleRegistration: string
  paymentMethod: 'ETAG' | 'VIOLATION' | 'ALTERNATE_ROUTE' | 'MONTHLY_PASS'
  tollRoutes?: string
  periodStartDate?: Date
  periodEndDate?: Date
  totalGantries?: number
  totalAmountZar: number
  vatAmountZar?: number
  referenceNumber?: string
  notes?: string
  // Lock fields
  isLocked: boolean
  lockedAt?: Date
  lockedByUserId?: string
  lockedReason?: string
  createdAt: Date
  updatedAt: Date
}

// License Renewal
export interface LicenseRenewal {
  id: string
  expenseId: string
  licenseType: 'VEHICLE_LICENSE' | 'DRIVERS_LICENSE' | 'PDP' | 'OPERATING_LICENSE'
  licenseNumber?: string
  registrationAuthority?: string
  previousExpiryDate?: Date
  newExpiryDate: Date
  renewalFeeZar: number
  penaltiesZar?: number
  arrearsZar?: number
  transactionNumber?: string
  renewalMethod: 'ONLINE' | 'POST_OFFICE' | 'LICENSING_DEPT' | 'AGENT'
  processingDays?: number
  notes?: string
  // Lock fields
  isLocked: boolean
  lockedAt?: Date
  lockedByUserId?: string
  lockedReason?: string
  createdAt: Date
  updatedAt: Date
}

// Roadworthy Certificate
export interface RoadworthyCertificate {
  id: string
  expenseId: string
  testingStationName: string
  testingStationAddress?: string
  testingStationPhone?: string
  testDate: Date
  certificateNumber?: string
  expiryDate?: Date
  testResult: 'PASS' | 'FAIL' | 'CONDITIONAL_PASS'
  testFeeZar: number
  retestFeeZar?: number
  inspectorName?: string
  vehicleOdometer?: number
  failureReasons?: string
  conditionsApplied?: string
  notes?: string
  // Lock fields
  isLocked: boolean
  lockedAt?: Date
  lockedByUserId?: string
  lockedReason?: string
  createdAt: Date
  updatedAt: Date
}

// Other Fixed Expense
export interface OtherFixedExpense {
  id: string
  expenseId: string
  expenseDescription: string
  categoryLabel?: string
  providerName?: string
  referenceNumber?: string
  isRecurring: boolean
  recurrenceFrequency?: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'ONCE_OFF'
  periodStartDate?: Date
  periodEndDate?: Date
  notes?: string
  // Lock fields
  isLocked: boolean
  lockedAt?: Date
  lockedByUserId?: string
  lockedReason?: string
  createdAt: Date
  updatedAt: Date
}

// Union type for all Fixed & Admin expenses
export type FixedAdminExpenseDetail = 
  | { type: 'INSURANCE_PREMIUM'; data: InsurancePremium }
  | { type: 'VEHICLE_TRACKING'; data: VehicleTracking }
  | { type: 'ETOLL_SANRAL'; data: ETollSanral }
  | { type: 'LICENSE_RENEWAL'; data: LicenseRenewal }
  | { type: 'ROADWORTHY'; data: RoadworthyCertificate }
  | { type: 'OTHER'; data: OtherFixedExpense }

// Labels for new types
export const INSURANCE_POLICY_TYPE_LABELS: Record<InsurancePremium['policyType'], string> = {
  'COMPREHENSIVE': 'Comprehensive',
  'THIRD_PARTY': 'Third Party Only',
  'THIRD_PARTY_FIRE_THEFT': 'Third Party, Fire & Theft'
}

export const TRACKING_SUBSCRIPTION_LABELS: Record<VehicleTracking['subscriptionType'], string> = {
  'MONTHLY': 'Monthly',
  'ANNUAL': 'Annual',
  'ONCE_OFF': 'Once-off Installation'
}

export const ETOLL_PAYMENT_METHOD_LABELS: Record<ETollSanral['paymentMethod'], string> = {
  'ETAG': 'E-Tag',
  'VIOLATION': 'Violation Notice',
  'ALTERNATE_ROUTE': 'Alternate Route Payment',
  'MONTHLY_PASS': 'Monthly Pass'
}

export const LICENSE_TYPE_LABELS: Record<LicenseRenewal['licenseType'], string> = {
  'VEHICLE_LICENSE': 'Vehicle License Disc',
  'DRIVERS_LICENSE': 'Driver\'s License',
  'PDP': 'Professional Driving Permit (PDP)',
  'OPERATING_LICENSE': 'Operating License'
}

export const LICENSE_RENEWAL_METHOD_LABELS: Record<LicenseRenewal['renewalMethod'], string> = {
  'ONLINE': 'Online (NaTIS)',
  'POST_OFFICE': 'Post Office',
  'LICENSING_DEPT': 'Licensing Department',
  'AGENT': 'Third-party Agent'
}

export const ROADWORTHY_RESULT_LABELS: Record<RoadworthyCertificate['testResult'], string> = {
  'PASS': 'Pass',
  'FAIL': 'Fail',
  'CONDITIONAL_PASS': 'Conditional Pass'
}

export const RECURRENCE_FREQUENCY_LABELS: Record<NonNullable<OtherFixedExpense['recurrenceFrequency']>, string> = {
  'WEEKLY': 'Weekly',
  'MONTHLY': 'Monthly',
  'QUARTERLY': 'Quarterly',
  'ANNUAL': 'Annual',
  'ONCE_OFF': 'Once-off'
}

// ============================================================================
// TRIP & LOGBOOK INTERFACES
// ============================================================================

export interface Trip {
  id: string
  organizationId: string
  vehicleId: string
  userId: string
  tripDate: Date
  startTime?: string
  endTime?: string
  startOdometer: number
  endOdometer: number
  distanceKm: number
  purpose: TripPurpose
  startLocation: string
  endLocation: string
  routeDescription?: string
  customerClientName?: string
  reasonForTrip?: string
  tollCostsZar: number
  parkingCostsZar: number
  // Lock fields
  isLocked: boolean
  lockedAt?: Date
  lockedByUserId?: string
  lockedReason?: string
  // Timestamps
  createdAt: Date
  updatedAt: Date
  // Additional fields from views
  lockedByName?: string
  imageCount?: number
  vehicleReg?: string
  vehicleName?: string
}

export interface TaxYearSummary {
  id: string
  organizationId: string
  vehicleId: string
  taxYear: number
  totalKm: number
  businessKm: number
  privateKm: number
  businessPercentage: number
  totalExpensesZar: number
  fuelExpensesZar: number
  maintenanceExpensesZar: number
  fixedExpensesZar: number
  openingOdometer?: number
  closingOdometer?: number
  lastCalculated: Date
  createdAt: Date
  // Phase 1: Additional fields for tax calculation
  unclassifiedLoggedKm?: number
  unloggedKm?: number
  distanceSource?: 'ODOMETER' | 'LOGGED_TRIPS'
  dataQualityWarnings?: string[]
  qualifyingCurrentExpenseCents?: number
  capitalOrAllowanceReviewCents?: number
  personalOrNonQualifyingExpenseCents?: number
  uncategorizedExpenseCents?: number
}

export interface VehicleTaxProfile {
  id: string
  organizationId: string
  vehicleId: string
  vehicleRegistration?: string
  vehicleMake?: string
  vehicleModel?: string
  vehicleCostCents: number
  datePlacedInBusinessUse: Date
  taxpayerVatRegistered: boolean
  taxpayerType: 'INDIVIDUAL' | 'COMPANY'
  compensationType: 'TRAVEL_ALLOWANCE' | 'COMPANY_CAR'
  fuelBorneBy: 'EMPLOYER' | 'EMPLOYEE'
  maintenanceBorneBy: 'EMPLOYER' | 'EMPLOYEE'
  coveredByMaintenancePlan: boolean
  effectiveFrom: Date
  effectiveTo?: Date
  // Phase 0: New fields for tax calculation configuration
  defaultCalculationMethod?: 'ACTUAL_COSTS' | 'SARS_COST_SCALE' | 'SIMPLIFIED_REIMBURSIVE'
  isCompanyProvidedVehicle?: boolean
  march1stPhotoOdometer?: number
  feb28thPhotoOdometer?: number
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

export interface OdometerVerification {
  id: string
  organizationId: string
  vehicleId: string
  userId: string
  taxYear: number
  readingType: OdometerReadingType
  odometerValue: number
  imageUrlAvif?: string  // Optional: photo recommended but not required
  imageKey?: string
  capturedAt: Date
  gpsLatitude?: number
  gpsLongitude?: number
  gpsAccuracyMeters?: number
  deviceInfo?: string
  ipAddress?: string
  // Lock fields
  isLocked: boolean
  lockedAt?: Date
  lockedByUserId?: string
  lockedReason?: string
  // Timestamps
  createdAt: Date
  // Additional fields from views
  lockedByName?: string
  additionalImageCount?: number
  vehicleReg?: string
  vehicleName?: string
}

// Helper to check if we're in Opening/Closing window
export const getTaxYearReadingWindow = (date: Date = new Date()): {
  isOpeningWindow: boolean
  isClosingWindow: boolean
  currentTaxYear: number
} => {
  const month = date.getMonth() // 0-indexed (0=Jan, 2=Mar)
  const year = date.getFullYear()
  
  // Opening window: March (month 2)
  const isOpeningWindow = month === 2
  // Closing window: February (month 1)
  const isClosingWindow = month === 1
  
  // Current tax year: if before March, it's previous year's tax year
  const currentTaxYear = month < 2 ? year - 1 : year
  
  return { isOpeningWindow, isClosingWindow, currentTaxYear }
}

// ============================================================================
// COMPOSITE TYPES (For Forms & Display)
// ============================================================================

export interface ExpenseWithDetails extends Expense {
  vehicle?: Vehicle
  user?: User
  fuelLog?: FuelLog
  mechanicService?: MechanicService
  maintenanceTopup?: MaintenanceTopup
  tire?: Tire
  fixedExpense?: FixedExpense
}

export interface VehicleWithStats extends Vehicle {
  assignedDriver?: User
  totalExpenses?: number
  totalTrips?: number
  lastServiceDate?: Date
  lastFuelDate?: Date
  averageEfficiency?: number
}

export interface DashboardStats {
  totalVehicles: number
  activeDrivers: number
  monthlyExpenses: number
  monthlyTrips: number
  businessKmPercentage: number
  fuelEfficiencyAverage: number
  upcomingServices: number
  expiringLicenses: number
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateExpenseRequest {
  vehicleId: string
  category: ExpenseCategory
  expenseDate: string
  amountZar: number
  vatAmountZar?: number
  description?: string
  receiptImage?: File
  odometerReading?: number
  supplierName?: string
  invoiceNumber?: string
  isTaxDeductible?: boolean
  // Category-specific fields
  fuelLog?: Omit<FuelLog, 'id' | 'expenseId' | 'createdAt'>
  mechanicService?: Omit<MechanicService, 'id' | 'expenseId' | 'createdAt'>
  maintenanceTopup?: Omit<MaintenanceTopup, 'id' | 'expenseId' | 'createdAt'>
  tire?: Omit<Tire, 'id' | 'expenseId' | 'createdAt'>
  fixedExpense?: Omit<FixedExpense, 'id' | 'expenseId' | 'createdAt'>
}

export interface CreateTripRequest {
  vehicleId: string
  tripDate: string
  startTime?: string
  endTime?: string
  startOdometer: number
  endOdometer: number
  purpose: TripPurpose
  startLocation: string
  endLocation: string
  routeDescription?: string
  customerClientName?: string
  reasonForTrip?: string
  tollCostsZar?: number
  parkingCostsZar?: number
}

export interface AuthResponse {
  user: User
  organization: Organization
  accessToken: string
  refreshToken: string
}

export interface JWTPayload {
  sub: string // User ID
  email: string
  organizationId: string
  role: UserRole
  mode: OrganizationMode
  iat: number
  exp: number
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type DateRange = {
  from: Date
  to: Date
}

export type SortDirection = 'asc' | 'desc'

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, string[]>
}

// ============================================================================
// ZAR CURRENCY HELPERS
// ============================================================================

export const formatZAR = (amount: number): string => {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

export const formatDistance = (km: number): string => {
  return `${km.toLocaleString('en-ZA')} km`
}

export const formatEfficiency = (kmPerLiter: number): string => {
  return `${kmPerLiter.toFixed(1)} km/L`
}

// Format fuel consumption in L/100km (South African standard)
export const formatConsumption = (lPer100km: number): string => {
  return `${lPer100km.toFixed(1)} L/100km`
}

// Format fuel consumption based on user preference
export const formatConsumptionWithPreference = (
  lPer100km: number,
  preference: "km_l" | "l_100km"
): string => {
  if (preference === "km_l") {
    const kmPerLiter = lPer100kmToKmPerLiter(lPer100km);
    return `${kmPerLiter.toFixed(1)} km/L`;
  }
  return `${lPer100km.toFixed(1)} L/100km`;
}

// Convert between km/L and L/100km
export const kmPerLiterToLPer100km = (kmPerLiter: number): number => {
  if (kmPerLiter <= 0) return 0
  return 100 / kmPerLiter
}

export const lPer100kmToKmPerLiter = (lPer100km: number): number => {
  if (lPer100km <= 0) return 0
  return 100 / lPer100km
}

// Get consumption rating (good/average/poor for SA context)
export const getConsumptionRating = (lPer100km: number, fuelType: FuelType): {
  rating: 'excellent' | 'good' | 'average' | 'poor' | 'unknown'
  label: string
  color: string
} => {
  if (!lPer100km || lPer100km <= 0) {
    return { rating: 'unknown', label: 'No data', color: 'text-muted-foreground' }
  }
  
  // Different thresholds for petrol vs diesel
  const isPetrol = fuelType.toString().startsWith('PETROL')
  
  if (isPetrol) {
    // Petrol thresholds (typically higher consumption)
    if (lPer100km <= 6) return { rating: 'excellent', label: 'Excellent', color: 'text-green-600' }
    if (lPer100km <= 8) return { rating: 'good', label: 'Good', color: 'text-emerald-500' }
    if (lPer100km <= 10) return { rating: 'average', label: 'Average', color: 'text-yellow-500' }
    return { rating: 'poor', label: 'High', color: 'text-red-500' }
  } else {
    // Diesel thresholds (typically more efficient)
    if (lPer100km <= 5) return { rating: 'excellent', label: 'Excellent', color: 'text-green-600' }
    if (lPer100km <= 7) return { rating: 'good', label: 'Good', color: 'text-emerald-500' }
    if (lPer100km <= 9) return { rating: 'average', label: 'Average', color: 'text-yellow-500' }
    return { rating: 'poor', label: 'High', color: 'text-red-500' }
  }
}

// SA Tax Year runs March to February
export const getSATaxYear = (date: Date = new Date()): number => {
  const month = date.getMonth() // 0-indexed
  const year = date.getFullYear()
  // If before March, we're in the previous tax year
  return month < 2 ? year - 1 : year
}

export const getTaxYearDateRange = (taxYear: number): DateRange => {
  return {
    from: new Date(taxYear, 2, 1), // March 1
    to: new Date(taxYear + 1, 1, 28) // February 28/29
  }
}

// ============================================================================
// TYRE ROTATION TRACKING
// ============================================================================

export type TyreRotationStatus = 'OK' | 'UPCOMING' | 'WARNING' | 'CRITICAL'

export interface TyreRotationTracking {
  id: string
  organizationId: string
  vehicleId: string
  tyreExpenseId: string
  drivetrainType: DrivetrainType
  rotationIntervalKm: number
  installationOdometer: number
  lastRotationOdometer?: number
  lastRotationDate?: Date
  rotationCount: number
  nextRotationOdometer: number
  isActive: boolean
  isDismissed: boolean
  dismissedAt?: Date
  dismissedByUserId?: string
  createdAt: Date
  updatedAt: Date
}

export interface TyreRotationWarning {
  trackingId: string
  organizationId: string
  vehicleId: string
  vehicleRegistration: string
  vehicleName: string
  tyreBrand: string
  tyreModel?: string
  tyreSize?: string
  installationDate: Date
  drivetrainType: DrivetrainType
  rotationIntervalKm: number
  installationOdometer: number
  lastRotationOdometer?: number
  lastRotationDate?: Date
  rotationCount: number
  nextRotationOdometer: number
  currentVehicleOdometer: number
  latestFuelOdometer?: number
  kmOverdue: number
  rotationStatus: TyreRotationStatus
  isActive: boolean
  isDismissed: boolean
  dismissedAt?: Date
  dismissedByName?: string
}

export const getTyreRotationStatusColor = (status: TyreRotationStatus): string => {
  switch (status) {
    case 'CRITICAL':
      return 'text-destructive bg-destructive/10'
    case 'WARNING':
      return 'text-warning bg-warning/10'
    case 'UPCOMING':
      return 'text-primary bg-primary/10'
    default:
      return 'text-muted-foreground bg-muted'
  }
}

export const getTyreRotationStatusLabel = (status: TyreRotationStatus): string => {
  switch (status) {
    case 'CRITICAL':
      return 'Overdue - Rotate Now!'
    case 'WARNING':
      return 'Rotation Due'
    case 'UPCOMING':
      return 'Rotation Coming Up'
    default:
      return 'OK'
  }
}

// ============================================================================
// EXPIRY ALERTS SYSTEM
// ============================================================================

export type ExpiryItemType = 
  | 'VEHICLE_LICENSE'
  | 'DRIVERS_LICENSE'
  | 'PDP'
  | 'PERSONAL_ID_CARD'
  | 'INSURANCE'
  | 'TRACKING_CONTRACT'
  | 'ROADWORTHY'
  | 'OPERATING_LICENSE'
  | 'TYRE_ROTATION'

export type ExpiryStatus = 'VALID' | 'UPCOMING' | 'WARNING' | 'CRITICAL' | 'EXPIRED'

export interface ExpiryAlert {
  itemType: ExpiryItemType
  itemId: string
  relatedId?: string
  itemName: string
  itemDescription: string
  vehicleId?: string
  vehicleRegistration?: string
  vehicleName?: string
  userId?: string
  userName?: string
  expiryDate: Date
  daysUntilExpiry: number
  expiryStatus: ExpiryStatus
  renewalUrl?: string
  isDismissed: boolean
  dismissedAt?: Date
  lastNotifiedAt?: Date
}

export interface ExpiryAlertCounts {
  totalAlerts: number
  expiredCount: number
  criticalCount: number
  warningCount: number
  upcomingCount: number
}

export const EXPIRY_ITEM_TYPE_LABELS: Record<ExpiryItemType, string> = {
  'VEHICLE_LICENSE': 'Vehicle License',
  'DRIVERS_LICENSE': "Driver's License",
  'PDP': 'PDP',
  'PERSONAL_ID_CARD': 'ID Card',
  'INSURANCE': 'Insurance',
  'TRACKING_CONTRACT': 'Tracking Contract',
  'ROADWORTHY': 'Roadworthy',
  'OPERATING_LICENSE': 'Operating License',
  'TYRE_ROTATION': 'Tyre Rotation'
}

export const EXPIRY_ITEM_TYPE_ICONS: Record<ExpiryItemType, string> = {
  'VEHICLE_LICENSE': 'car',
  'DRIVERS_LICENSE': 'id-card',
  'PDP': 'badge',
  'PERSONAL_ID_CARD': 'credit-card',
  'INSURANCE': 'shield',
  'TRACKING_CONTRACT': 'map-pin',
  'ROADWORTHY': 'clipboard-check',
  'OPERATING_LICENSE': 'file-text',
  'TYRE_ROTATION': 'rotate-ccw'
}

export const getExpiryStatusColor = (status: ExpiryStatus): string => {
  switch (status) {
    case 'EXPIRED':
      return 'text-destructive bg-black border-destructive'
    case 'CRITICAL':
      return 'text-orange-600 dark:text-orange-400 bg-black border-orange-600 dark:border-orange-500'
    case 'WARNING':
      return 'text-yellow-600 dark:text-yellow-400 bg-black border-yellow-600 dark:border-yellow-500'
    case 'UPCOMING':
      return 'text-green-600 dark:text-green-400 bg-black border-green-600 dark:border-green-500'
    default:
      return 'text-green-600 dark:text-green-400 bg-black border-green-600 dark:border-green-500'
  }
}

export const getExpiryStatusLabel = (status: ExpiryStatus): string => {
  switch (status) {
    case 'EXPIRED':
      return 'Expired'
    case 'CRITICAL':
      return 'Expires Soon'
    case 'WARNING':
      return 'Expiring'
    case 'UPCOMING':
      return 'Coming Up'
    default:
      return 'Valid'
  }
}

export const getExpiryStatusBadgeVariant = (status: ExpiryStatus): 'destructive' | 'secondary' | 'outline' | 'default' => {
  switch (status) {
    case 'EXPIRED':
    case 'CRITICAL':
      return 'destructive'
    case 'WARNING':
      return 'secondary'
    case 'UPCOMING':
      return 'outline'
    default:
      return 'default'
  }
}

export const formatDaysUntilExpiry = (days: number): string => {
  if (days < 0) {
    const absDays = Math.abs(days)
    if (absDays === 1) return 'Expired yesterday'
    if (absDays < 7) return `Expired ${absDays} days ago`
    if (absDays < 30) return `Expired ${Math.floor(absDays / 7)} week${Math.floor(absDays / 7) > 1 ? 's' : ''} ago`
    return `Expired ${Math.floor(absDays / 30)} month${Math.floor(absDays / 30) > 1 ? 's' : ''} ago`
  }
  if (days === 0) return 'Expires today'
  if (days === 1) return 'Expires tomorrow'
  if (days < 7) return `Expires in ${days} days`
  if (days < 30) return `Expires in ${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''}`
  if (days < 60) return `Expires in ${Math.floor(days / 30)} month`
  return `Expires in ${Math.floor(days / 30)} months`
}

// ============================================================================
// RECURRING TRIPS
// ============================================================================

export interface RecurringTrip {
  id: string;
  organizationId: string;
  vehicleId: string;
  vehicleName: string;
  userId: string;
  userName: string;
  purpose: TripPurpose;
  startLocation: string;
  endLocation: string;
  routeDescription?: string;
  customerClientName?: string;
  reasonForTrip?: string;
  isRecurring: boolean;
  recurrenceDays?: string; // "MON,TUE,WED,THU,FRI"
  recurrenceStartDate?: string;
  recurrenceEndDate?: string;
  defaultTollCostsZar: number;
  defaultParkingCostsZar: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringTripCreateRequest {
  vehicleId: string;
  userId: string;
  purpose: TripPurpose;
  startLocation: string;
  endLocation: string;
  routeDescription?: string;
  customerClientName?: string;
  reasonForTrip?: string;
  isRecurring: boolean;
  recurrenceDays?: string;
  recurrenceStartDate?: string;
  recurrenceEndDate?: string;
  defaultTollCostsZar: number;
  defaultParkingCostsZar: number;
}

export interface LastOdometerResponse {
  vehicleId: string;
  lastOdometer: number | null;
  currentOdometer: number | null;
  vehicleName: string;
}
