import { z } from 'zod'
import {
  UserRole,
  OrganizationMode,
  FuelType,
  ExpenseCategory,
  MaintenanceItemType,
  ServiceType,
  FixedExpenseType,
  TripPurpose,
  OdometerReadingType
} from '@/lib/types/database'

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  organizationName: z.string().min(1, 'Organization name is required').max(255),
  organizationMode: z.nativeEnum(OrganizationMode),
  phone: z.string().optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
})

// ============================================================================
// VEHICLE SCHEMAS
// ============================================================================

export const vehicleSchema = z.object({
  registrationNumber: z
    .string()
    .min(1, 'Registration number is required')
    .max(20)
    .toUpperCase(),
  vin: z.string().length(17, 'VIN must be 17 characters').optional().or(z.literal('')),
  make: z.string().min(1, 'Make is required').max(100),
  model: z.string().min(1, 'Model is required').max(100),
  year: z
    .number()
    .int()
    .min(1900, 'Year must be 1900 or later')
    .max(new Date().getFullYear() + 1, 'Year cannot be in the future'),
  color: z.string().max(50).optional(),
  fuelType: z.nativeEnum(FuelType),
  tankCapacityLiters: z.number().positive().max(500).optional(),
  currentOdometer: z.number().int().min(0, 'Odometer cannot be negative'),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().positive().optional(),
  licenseExpiry: z.string().optional(),
  insurancePolicyNumber: z.string().max(100).optional(),
  trackerSerial: z.string().max(100).optional(),
  assignedDriverId: z.string().uuid().optional(),
  notes: z.string().optional()
})

// ============================================================================
// EXPENSE SCHEMAS
// ============================================================================

export const baseExpenseSchema = z.object({
  vehicleId: z.string().uuid('Invalid vehicle ID'),
  category: z.nativeEnum(ExpenseCategory),
  expenseDate: z.string().min(1, 'Date is required'),
  amountZar: z.number().positive('Amount must be greater than 0'),
  vatAmountZar: z.number().min(0).default(0),
  description: z.string().max(500).optional(),
  odometerReading: z.number().int().min(0).optional(),
  supplierName: z.string().max(255).optional(),
  invoiceNumber: z.string().max(100).optional(),
  isTaxDeductible: z.boolean().default(true)
})

export const fuelLogSchema = z.object({
  fuelType: z.nativeEnum(FuelType),
  liters: z.number().positive('Liters must be greater than 0').max(500),
  pricePerLiter: z.number().positive('Price must be greater than 0').max(100),
  fullTank: z.boolean().default(true),
  stationName: z.string().max(255).optional(),
  stationLocation: z.string().max(255).optional()
})

export const mechanicServiceSchema = z.object({
  serviceType: z.nativeEnum(ServiceType),
  workshopName: z.string().min(1, 'Workshop name is required').max(255),
  workshopPhone: z.string().max(20).optional(),
  workshopAddress: z.string().max(500).optional(),
  technicianName: z.string().max(100).optional(),
  laborCostZar: z.number().min(0).optional(),
  partsCostZar: z.number().min(0).optional(),
  workDescription: z.string().optional(),
  partsReplaced: z.string().optional(),
  warrantyMonths: z.number().int().min(0).max(120).optional(),
  nextServiceDueKm: z.number().int().positive().optional(),
  nextServiceDueDate: z.string().optional()
})

export const maintenanceTopupSchema = z.object({
  itemType: z.nativeEnum(MaintenanceItemType),
  itemBrand: z.string().max(100).optional(),
  itemQuantity: z.number().positive().default(1),
  itemUnit: z.string().max(20).optional(),
  shopName: z.string().max(255).optional(),
  notes: z.string().optional()
})

export const tireSchema = z.object({
  brand: z.string().min(1, 'Brand is required').max(100),
  model: z.string().max(100).optional(),
  size: z.string().min(1, 'Size is required').max(50), // e.g., "205/55R16"
  quantity: z.number().int().min(1).max(6).default(4),
  position: z.string().max(50).optional(), // "Front", "Rear", "All", "Spare"
  purchaseOdometer: z.number().int().min(0),
  treadDepthMm: z.number().positive().max(15).optional(),
  expectedLifespanKm: z.number().int().positive().optional(),
  rotationIntervalKm: z.number().int().positive().default(10000),
  warrantyKm: z.number().int().positive().optional(),
  notes: z.string().optional()
})

export const fixedExpenseSchema = z.object({
  expenseType: z.nativeEnum(FixedExpenseType),
  providerName: z.string().max(255).optional(),
  policyNumber: z.string().max(100).optional(),
  coverageStart: z.string().optional(),
  coverageEnd: z.string().optional(),
  paymentFrequency: z.string().max(50).optional(),
  referenceNumber: z.string().max(100).optional(),
  notes: z.string().optional()
})

// Combined expense schema with conditional validation
export const createExpenseSchema = baseExpenseSchema.and(
  z.discriminatedUnion('category', [
    z.object({
      category: z.literal(ExpenseCategory.FUEL_LOG),
      fuelLog: fuelLogSchema
    }),
    z.object({
      category: z.literal(ExpenseCategory.MECHANIC_SERVICE),
      mechanicService: mechanicServiceSchema
    }),
    z.object({
      category: z.literal(ExpenseCategory.MAINTENANCE_TOPUP),
      maintenanceTopup: maintenanceTopupSchema
    }),
    z.object({
      category: z.literal(ExpenseCategory.TIRES),
      tire: tireSchema
    }),
    z.object({
      category: z.literal(ExpenseCategory.INSURANCE_PREMIUM),
      fixedExpense: fixedExpenseSchema
    }),
    z.object({
      category: z.literal(ExpenseCategory.VEHICLE_TRACKING),
      fixedExpense: fixedExpenseSchema
    }),
    z.object({
      category: z.literal(ExpenseCategory.ETOLL_SANRAL),
      fixedExpense: fixedExpenseSchema
    }),
    z.object({
      category: z.literal(ExpenseCategory.LICENSE_RENEWAL),
      fixedExpense: fixedExpenseSchema
    }),
    z.object({
      category: z.literal(ExpenseCategory.ROADWORTHY),
      fixedExpense: fixedExpenseSchema
    }),
    z.object({
      category: z.literal(ExpenseCategory.OTHER_FIXED),
      fixedExpense: fixedExpenseSchema
    })
  ])
)

// ============================================================================
// TRIP SCHEMAS
// ============================================================================

export const tripSchema = z.object({
  vehicleId: z.string().uuid('Invalid vehicle ID'),
  tripDate: z.string().min(1, 'Date is required'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  startOdometer: z.number().int().min(0, 'Start odometer is required'),
  endOdometer: z.number().int().min(0, 'End odometer is required'),
  purpose: z.nativeEnum(TripPurpose),
  startLocation: z.string().min(1, 'Start location is required').max(255),
  endLocation: z.string().min(1, 'End location is required').max(255),
  routeDescription: z.string().optional(),
  customerClientName: z.string().max(255).optional(),
  reasonForTrip: z.string().optional(),
  tollCostsZar: z.number().min(0).default(0),
  parkingCostsZar: z.number().min(0).default(0)
}).refine((data) => data.endOdometer > data.startOdometer, {
  message: 'End odometer must be greater than start odometer',
  path: ['endOdometer']
})

// ============================================================================
// ODOMETER VERIFICATION SCHEMAS
// ============================================================================

export const odometerVerificationSchema = z.object({
  vehicleId: z.string().uuid('Invalid vehicle ID'),
  taxYear: z.number().int().min(2000).max(2100),
  readingType: z.nativeEnum(OdometerReadingType),
  odometerValue: z.number().int().min(0, 'Odometer must be a positive number'),
  imageBase64: z.string().min(1, 'Image is required'), // Base64 AVIF image
  capturedAt: z.string().datetime(), // ISO timestamp from device
  gpsLatitude: z.number().min(-90).max(90).optional(),
  gpsLongitude: z.number().min(-180).max(180).optional(),
  gpsAccuracyMeters: z.number().min(0).optional(),
  deviceInfo: z.string().max(500).optional()
})

export type OdometerVerificationInput = z.infer<typeof odometerVerificationSchema>

// ============================================================================
// USER MANAGEMENT SCHEMAS
// ============================================================================

export const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  role: z.nativeEnum(UserRole),
  phone: z.string().optional(),
  employeeNumber: z.string().max(50).optional(),
  driversLicenseNumber: z.string().max(50).optional(),
  driversLicenseExpiry: z.string().optional(),
  assignedVehicleId: z.string().uuid().optional()
})

export const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().optional(),
  driversLicenseNumber: z.string().max(50).optional(),
  driversLicenseExpiry: z.string().optional()
})

export const updateOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(255),
  mode: z.nativeEnum(OrganizationMode),
  taxNumber: z.string().max(50).optional(),
  vatNumber: z.string().max(50).optional(),
  addressLine1: z.string().max(255).optional(),
  addressLine2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  province: z.string().max(100).optional(),
  postalCode: z.string().max(10).optional(),
  phone: z.string().max(20).optional()
})

// ============================================================================
// EXPORT TYPE INFERENCE
// ============================================================================

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type VehicleInput = z.infer<typeof vehicleSchema>
export type FuelLogInput = z.infer<typeof fuelLogSchema>
export type MechanicServiceInput = z.infer<typeof mechanicServiceSchema>
export type MaintenanceTopupInput = z.infer<typeof maintenanceTopupSchema>
export type TireInput = z.infer<typeof tireSchema>
export type FixedExpenseInput = z.infer<typeof fixedExpenseSchema>
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
export type TripInput = z.infer<typeof tripSchema>
export type InviteUserInput = z.infer<typeof inviteUserSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>
