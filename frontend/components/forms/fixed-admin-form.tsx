'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Camera, AlertCircle, CheckCircle2, CalendarIcon, Shield, MapPin, CreditCard, FileCheck, Car, MoreHorizontal } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { 
  FixedExpenseType, 
  FuelType,
  formatZAR,
  INSURANCE_POLICY_TYPE_LABELS,
  TRACKING_SUBSCRIPTION_LABELS,
  ETOLL_PAYMENT_METHOD_LABELS,
  LICENSE_TYPE_LABELS,
  LICENSE_RENEWAL_METHOD_LABELS,
  ROADWORTHY_RESULT_LABELS,
  RECURRENCE_FREQUENCY_LABELS,
} from '@/lib/types/database'
import { 
  processReceiptImage, 
  validateImageFile, 
  formatFileSize 
} from '@/lib/utils/image-converter'
import { ImageCropModal } from '@/components/ui/image-crop-modal'

// ============================================================================
// SCHEMAS FOR EACH EXPENSE TYPE
// ============================================================================

const baseSchema = z.object({
  vehicleId: z.string().min(1, 'Select a vehicle'),
  date: z.date({ required_error: 'Select a date' }),
  amountZar: z.coerce.number().positive('Enter amount').optional(),
})

const insurancePremiumSchema = baseSchema.extend({
  insurerName: z.string().min(1, 'Enter insurer name'),
  policyNumber: z.string().min(1, 'Enter policy number'),
  policyType: z.enum(['COMPREHENSIVE', 'THIRD_PARTY', 'THIRD_PARTY_FIRE_THEFT']),
  coverageStartDate: z.date({ required_error: 'Select coverage start date' }),
  coverageEndDate: z.date({ required_error: 'Select coverage end date' }),
  monthlyPremiumZar: z.coerce.number().positive('Enter monthly premium'),
  excessAmountZar: z.coerce.number().optional(),
  brokerName: z.string().optional(),
  brokerPhone: z.string().optional(),
  claimPhoneNumber: z.string().optional(),
  coverDetails: z.string().optional(),
})

const vehicleTrackingSchema = baseSchema.extend({
  providerName: z.string().min(1, 'Enter provider name'),
  subscriptionType: z.enum(['MONTHLY', 'ANNUAL', 'ONCE_OFF']),
  monthlyFeeZar: z.coerce.number().positive('Enter monthly fee'),
  contractStartDate: z.date({ required_error: 'Select contract start date' }),
  contractEndDate: z.date().optional(),
  deviceSerialNumber: z.string().optional(),
  deviceType: z.string().optional(),
  installationDate: z.date().optional(),
  recoveryIncluded: z.boolean().default(false),
  appLoginEmail: z.string().email().optional().or(z.literal('')),
  supportPhoneNumber: z.string().optional(),
  features: z.string().optional(),
})

const eTollSchema = baseSchema.extend({
  accountNumber: z.string().optional(),
  tagSerialNumber: z.string().optional(),
  vehicleRegistration: z.string().min(1, 'Enter vehicle registration'),
  paymentMethod: z.enum(['ETAG', 'VIOLATION', 'ALTERNATE_ROUTE', 'MONTHLY_PASS']),
  tollRoutes: z.string().optional(),
  periodStartDate: z.date().optional(),
  periodEndDate: z.date().optional(),
  totalGantries: z.coerce.number().optional(),
  totalAmountZar: z.coerce.number().positive('Enter total amount'),
  vatAmountZar: z.coerce.number().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
})

const licenseRenewalSchema = baseSchema.extend({
  licenseType: z.enum(['VEHICLE_LICENSE', 'DRIVERS_LICENSE', 'PDP', 'OPERATING_LICENSE']),
  licenseNumber: z.string().optional(),
  registrationAuthority: z.string().optional(),
  previousExpiryDate: z.date().optional(),
  newExpiryDate: z.date({ required_error: 'Select new expiry date' }),
  renewalFeeZar: z.coerce.number().positive('Enter renewal fee'),
  penaltiesZar: z.coerce.number().optional(),
  arrearsZar: z.coerce.number().optional(),
  transactionNumber: z.string().optional(),
  renewalMethod: z.enum(['ONLINE', 'POST_OFFICE', 'LICENSING_DEPT', 'AGENT']),
  processingDays: z.coerce.number().optional(),
  notes: z.string().optional(),
})

const roadworthySchema = baseSchema.extend({
  testingStationName: z.string().min(1, 'Enter testing station name'),
  testingStationAddress: z.string().optional(),
  testingStationPhone: z.string().optional(),
  testDate: z.date({ required_error: 'Select test date' }),
  certificateNumber: z.string().optional(),
  expiryDate: z.date().optional(),
  testResult: z.enum(['PASS', 'FAIL', 'CONDITIONAL_PASS']),
  testFeeZar: z.coerce.number().positive('Enter test fee'),
  retestFeeZar: z.coerce.number().optional(),
  inspectorName: z.string().optional(),
  vehicleOdometer: z.coerce.number().optional(),
  failureReasons: z.string().optional(),
  conditionsApplied: z.string().optional(),
  notes: z.string().optional(),
})

const otherExpenseSchema = baseSchema.extend({
  expenseDescription: z.string().min(1, 'Enter expense description'),
  categoryLabel: z.string().optional(),
  providerName: z.string().optional(),
  referenceNumber: z.string().optional(),
  isRecurring: z.boolean().default(false),
  recurrenceFrequency: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'ONCE_OFF']).optional(),
  periodStartDate: z.date().optional(),
  periodEndDate: z.date().optional(),
  notes: z.string().optional(),
})

type InsurancePremiumInput = z.infer<typeof insurancePremiumSchema>
type VehicleTrackingInput = z.infer<typeof vehicleTrackingSchema>
type ETollInput = z.infer<typeof eTollSchema>
type LicenseRenewalInput = z.infer<typeof licenseRenewalSchema>
type RoadworthyInput = z.infer<typeof roadworthySchema>
type OtherExpenseInput = z.infer<typeof otherExpenseSchema>

type FixedAdminFormData = 
  | { type: 'INSURANCE_PREMIUM'; data: InsurancePremiumInput }
  | { type: 'VEHICLE_TRACKING'; data: VehicleTrackingInput }
  | { type: 'ETOLL_SANRAL'; data: ETollInput }
  | { type: 'LICENSE_RENEWAL'; data: LicenseRenewalInput }
  | { type: 'ROADWORTHY'; data: RoadworthyInput }
  | { type: 'OTHER'; data: OtherExpenseInput }

interface Vehicle {
  id: string
  registrationNumber: string
  make: string
  model: string
  fuelType: FuelType
  currentOdometer: number
}

interface FixedAdminFormProps {
  vehicles: Vehicle[]
  onSubmit: (data: FixedAdminFormData, receiptImage: File | null) => Promise<void>
  initialData?: FixedAdminFormData
  isEditMode?: boolean
  existingReceiptImageUrl?: string
  defaultTab?: FixedExpenseType
}

// Tab configuration with icons
const EXPENSE_TABS = [
  { type: FixedExpenseType.INSURANCE_PREMIUM, label: 'Insurance', icon: Shield },
  { type: FixedExpenseType.VEHICLE_TRACKING, label: 'Tracking', icon: MapPin },
  { type: FixedExpenseType.ETOLL_SANRAL, label: 'E-Tolls', icon: CreditCard },
  { type: FixedExpenseType.LICENSE_RENEWAL, label: 'License', icon: FileCheck },
  { type: FixedExpenseType.ROADWORTHY, label: 'Roadworthy', icon: Car },
  { type: FixedExpenseType.OTHER_FIXED, label: 'Other', icon: MoreHorizontal },
] as const

export function FixedAdminForm({ vehicles, onSubmit, initialData, isEditMode = false, existingReceiptImageUrl, defaultTab }: FixedAdminFormProps) {
  const [activeTab, setActiveTab] = useState<FixedExpenseType>(
    defaultTab || (initialData?.type as FixedExpenseType) || FixedExpenseType.INSURANCE_PREMIUM
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [receiptImage, setReceiptImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingReceiptImageUrl || null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [isCompressing, setIsCompressing] = useState(false)
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: number
    compressedSize: number
  } | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null)

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageError(null)
    setCompressionInfo(null)

    const validation = validateImageFile(file)
    if (!validation.valid) {
      setImageError(validation.error || 'Invalid file')
      return
    }

    // Store original file and show crop modal
    setOriginalImageFile(file)
    setShowCropModal(true)
  }

  const handleCropConfirm = async (croppedFile: File, originalFile: File) => {
    setShowCropModal(false)
    setIsCompressing(true)

    try {
      const result = await processReceiptImage(croppedFile)
      const compressedFile = new File(
        [result.blob], 
        croppedFile.name.replace(/\.[^.]+$/, '.avif'),
        { type: result.format }
      )

      setReceiptImage(compressedFile)
      setPreviewUrl(URL.createObjectURL(result.blob))
      setCompressionInfo({
        originalSize: result.originalSize,
        compressedSize: result.convertedSize,
      })
    } catch (error) {
      setImageError(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`)
    } finally {
      setIsCompressing(false)
    }
  }

  const handleCropCancel = () => {
    setShowCropModal(false)
    setOriginalImageFile(null)
  }

  const clearImage = () => {
    setReceiptImage(null)
    setPreviewUrl(null)
    setCompressionInfo(null)
  }

  return (
    <>
      <div className="space-y-6">
      {/* Expense Type Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FixedExpenseType)}>
        <TabsList className="grid grid-cols-3 lg:grid-cols-6 h-auto gap-1 bg-muted/50 p-1">
          {EXPENSE_TABS.map(({ type, label, icon: Icon }) => (
            <TabsTrigger 
              key={type} 
              value={type}
              className="flex flex-col items-center gap-1 py-2 px-2 data-[state=active]:bg-background"
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Insurance Premium Form */}
        <TabsContent value={FixedExpenseType.INSURANCE_PREMIUM}>
          <InsurancePremiumForm 
            vehicles={vehicles} 
            onSubmit={onSubmit}
            receiptImage={receiptImage}
            previewUrl={previewUrl}
            imageError={imageError}
            isCompressing={isCompressing}
            compressionInfo={compressionInfo}
            onImageCapture={handleImageCapture}
            onClearImage={clearImage}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            initialData={initialData?.type === 'INSURANCE_PREMIUM' ? initialData.data : undefined}
            isEditMode={isEditMode}
          />
        </TabsContent>

        {/* Vehicle Tracking Form */}
        <TabsContent value={FixedExpenseType.VEHICLE_TRACKING}>
          <VehicleTrackingForm 
            vehicles={vehicles} 
            onSubmit={onSubmit}
            receiptImage={receiptImage}
            previewUrl={previewUrl}
            imageError={imageError}
            isCompressing={isCompressing}
            compressionInfo={compressionInfo}
            onImageCapture={handleImageCapture}
            onClearImage={clearImage}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            initialData={initialData?.type === 'VEHICLE_TRACKING' ? initialData.data : undefined}
            isEditMode={isEditMode}
          />
        </TabsContent>

        {/* E-Tolls Form */}
        <TabsContent value={FixedExpenseType.ETOLL_SANRAL}>
          <ETollForm 
            vehicles={vehicles} 
            onSubmit={onSubmit}
            receiptImage={receiptImage}
            previewUrl={previewUrl}
            imageError={imageError}
            isCompressing={isCompressing}
            compressionInfo={compressionInfo}
            onImageCapture={handleImageCapture}
            onClearImage={clearImage}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            initialData={initialData?.type === 'ETOLL_SANRAL' ? initialData.data : undefined}
            isEditMode={isEditMode}
          />
        </TabsContent>

        {/* License Renewal Form */}
        <TabsContent value={FixedExpenseType.LICENSE_RENEWAL}>
          <LicenseRenewalForm 
            vehicles={vehicles} 
            onSubmit={onSubmit}
            receiptImage={receiptImage}
            previewUrl={previewUrl}
            imageError={imageError}
            isCompressing={isCompressing}
            compressionInfo={compressionInfo}
            onImageCapture={handleImageCapture}
            onClearImage={clearImage}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            initialData={initialData?.type === 'LICENSE_RENEWAL' ? initialData.data : undefined}
            isEditMode={isEditMode}
          />
        </TabsContent>

        {/* Roadworthy Form */}
        <TabsContent value={FixedExpenseType.ROADWORTHY}>
          <RoadworthyForm 
            vehicles={vehicles} 
            onSubmit={onSubmit}
            receiptImage={receiptImage}
            previewUrl={previewUrl}
            imageError={imageError}
            isCompressing={isCompressing}
            compressionInfo={compressionInfo}
            onImageCapture={handleImageCapture}
            onClearImage={clearImage}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            initialData={initialData?.type === 'ROADWORTHY' ? initialData.data : undefined}
            isEditMode={isEditMode}
          />
        </TabsContent>

        {/* Other Fixed Expense Form */}
        <TabsContent value={FixedExpenseType.OTHER_FIXED}>
          <OtherExpenseForm
            vehicles={vehicles}
            onSubmit={onSubmit}
            receiptImage={receiptImage}
            previewUrl={previewUrl}
            imageError={imageError}
            isCompressing={isCompressing}
            compressionInfo={compressionInfo}
            onImageCapture={handleImageCapture}
            onClearImage={clearImage}
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
            initialData={initialData?.type === 'OTHER' ? initialData.data : undefined}
            isEditMode={isEditMode}
          />
        </TabsContent>
      </Tabs>
      </div>

      {/* Image Crop Modal */}
      {originalImageFile && (
        <ImageCropModal
          imageFile={originalImageFile}
          mode="receipt"
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
          isOpen={showCropModal}
        />
      )}
    </>
  )
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

interface SharedFormProps {
  vehicles: Vehicle[]
  receiptImage: File | null
  previewUrl: string | null
  imageError: string | null
  isCompressing: boolean
  compressionInfo: { originalSize: number; compressedSize: number } | null
  onImageCapture: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClearImage: () => void
  isSubmitting: boolean
  setIsSubmitting: (v: boolean) => void
}

function ReceiptImageCapture({
  previewUrl,
  imageError,
  isCompressing,
  compressionInfo,
  onImageCapture,
  onClearImage,
  isEditMode = false,
}: Pick<SharedFormProps, 'previewUrl' | 'imageError' | 'isCompressing' | 'compressionInfo' | 'onImageCapture' | 'onClearImage'> & { isEditMode?: boolean }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Camera className="h-5 w-5 text-chart-4" />
          Capture Receipt
          {!isEditMode && <span className="text-destructive text-sm font-normal">(Required)</span>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {previewUrl ? (
          <div className="space-y-3">
            <div className="relative">
              <img
                src={previewUrl}
                alt="Receipt preview"
                className="w-full max-h-48 object-contain rounded-lg bg-muted"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2"
                onClick={onClearImage}
              >
                Remove
              </Button>
            </div>
            {compressionInfo && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>
                  Compressed: {formatFileSize(compressionInfo.originalSize)} → {formatFileSize(compressionInfo.compressedSize)}
                  ({Math.round((1 - compressionInfo.compressedSize / compressionInfo.originalSize) * 100)}% saved)
                </span>
              </div>
            )}
          </div>
        ) : (
          <label htmlFor="fixed-receiptImage" className={`
            flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors
            ${imageError ? 'border-destructive bg-destructive/5' : 'border-chart-4 hover:border-chart-4/80 hover:bg-chart-4/5'}
          `}>
            {isCompressing ? (
              <>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-chart-4 mb-2" />
                <span className="text-sm text-muted-foreground">Compressing image...</span>
              </>
            ) : (
              <>
                <Camera className="h-10 w-10 text-chart-4 mb-2" />
                <span className="text-sm font-medium text-foreground">Tap to capture receipt</span>
                <span className="text-xs text-muted-foreground mt-1">Photo will be compressed automatically</span>
              </>
            )}
            <label htmlFor="fixed-receiptImage" className="sr-only">
              Upload Receipt Image
            </label>
            <input
              id="fixed-receiptImage"
              name="receiptImage"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onImageCapture}
              className="hidden"
              disabled={isCompressing}
            />
          </label>
        )}
        {imageError && (
          <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{imageError}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DatePickerField({
  label,
  value,
  onChange,
  error,
  required = false,
  id,
}: {
  label: string
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  error?: string
  required?: boolean
  id?: string
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}{required && <span className="text-destructive"> *</span>}</Label>
      <Input
        id={id}
        name={id}
        type="text"
        inputMode="numeric"
        pattern="\d{4}-\d{2}-\d{2}"
        placeholder="YYYY-MM-DD"
        value={value ? format(value, "yyyy-MM-dd") : ""}
        onChange={(e) => {
          let val = e.target.value;
          val = val.replace(/[^\d-]/g, '');
          const digits = val.replace(/\D/g, '');
          if (digits.length > 0) {
            let formatted = digits.slice(0, 4);
            if (digits.length > 4) {
              formatted += '-' + digits.slice(4, 6);
            }
            if (digits.length > 6) {
              formatted += '-' + digits.slice(6, 8);
            }
            val = formatted;
          }
          if (val && val.length >= 4) {
            const year = parseInt(val.slice(0, 4));
            if (year < 1900 || year > 2099) {
              return;
            }
          }
          if (val.length === 10) {
            onChange(new Date(val));
          }
        }}
        maxLength={10}
        className={error ? "border-red-500" : ""}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

// ============================================================================
// INSURANCE PREMIUM FORM
// ============================================================================

interface InsurancePremiumFormProps extends SharedFormProps {
  onSubmit: (data: FixedAdminFormData, receiptImage: File | null) => Promise<void>
  initialData?: InsurancePremiumInput
  isEditMode?: boolean
}

function InsurancePremiumForm({
  vehicles,
  onSubmit,
  receiptImage,
  previewUrl,
  imageError,
  isCompressing,
  compressionInfo,
  onImageCapture,
  onClearImage,
  isSubmitting,
  setIsSubmitting,
  initialData,
  isEditMode = false,
}: InsurancePremiumFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InsurancePremiumInput>({
    resolver: zodResolver(insurancePremiumSchema),
    defaultValues: initialData || {
      vehicleId: vehicles[0]?.id || '',
      date: new Date(),
      policyType: 'COMPREHENSIVE',
      coverageStartDate: new Date(),
      coverageEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    },
  })

  const selectedVehicleId = watch('vehicleId')
  const coverageStartDate = watch('coverageStartDate')
  const coverageEndDate = watch('coverageEndDate')
  const monthlyPremium = watch('monthlyPremiumZar')

  const handleFormSubmit = async (data: InsurancePremiumInput) => {
    console.log('=== InsurancePremiumForm: handleFormSubmit called ===')
    console.log('Receipt image present:', !!receiptImage)
    console.log('Form data:', data)
    console.log('Form errors:', errors)

    if (!isEditMode && !receiptImage) {
      console.error('ERROR: No receipt image captured')
      alert('Please capture a receipt image before saving')
      return
    }
    setIsSubmitting(true)
    try {
      console.log('Calling onSubmit with type: INSURANCE_PREMIUM')
      await onSubmit({ type: 'INSURANCE_PREMIUM', data }, receiptImage)
      console.log('onSubmit completed successfully')
    } catch (error) {
      console.error('Error in handleFormSubmit:', error)
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit((data) => {
      console.log('=== InsurancePremiumForm: Form validation passed ===')
      console.log('Form data:', data)
      console.log('Receipt image present:', !!receiptImage)
      void handleFormSubmit(data)
    }, (errors) => {
      console.log('=== InsurancePremiumForm: Form validation FAILED ===')
      console.log('Validation errors:', errors)
      alert('Please fix the validation errors before saving')
    })} className="space-y-6">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5 text-chart-1" />
            Insurance Premium Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Vehicle */}
          <div className="space-y-2">
            <Label htmlFor="vehicleId">Vehicle <span className="text-destructive">*</span></Label>
            <Select value={selectedVehicleId} onValueChange={(v) => setValue('vehicleId', v)}>
              <SelectTrigger id="vehicleId" className="h-12">
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.registrationNumber} - {v.make} {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.vehicleId && <p className="text-sm text-destructive">{errors.vehicleId.message}</p>}
          </div>

          {/* Insurer and Policy Number */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="insurerName">Insurer Name <span className="text-destructive">*</span></Label>
              <Input id="insurerName" {...register('insurerName')} placeholder="e.g., OUTsurance" className="h-12" />
              {errors.insurerName && <p className="text-sm text-destructive">{errors.insurerName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="policyNumber">Policy Number <span className="text-destructive">*</span></Label>
              <Input id="policyNumber" {...register('policyNumber')} placeholder="Policy number" className="h-12" />
              {errors.policyNumber && <p className="text-sm text-destructive">{errors.policyNumber.message}</p>}
            </div>
          </div>

          {/* Policy Type */}
          <div className="space-y-2">
            <Label htmlFor="policyType">Policy Type <span className="text-destructive">*</span></Label>
            <Select value={watch('policyType')} onValueChange={(v) => setValue('policyType', v as InsurancePremiumInput['policyType'])}>
              <SelectTrigger id="policyType" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(INSURANCE_POLICY_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Coverage Dates */}
          <div className="grid grid-cols-2 gap-4">
            <DatePickerField
              id="coverageStartDate"
              label="Coverage Start"
              value={coverageStartDate}
              onChange={(d) => d && setValue('coverageStartDate', d)}
              error={errors.coverageStartDate?.message}
              required
            />
            <DatePickerField
              id="coverageEndDate"
              label="Coverage End"
              value={coverageEndDate}
              onChange={(d) => d && setValue('coverageEndDate', d)}
              error={errors.coverageEndDate?.message}
              required
            />
          </div>

          {/* Monthly Premium and Excess */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthlyPremiumZar">Monthly Premium (R) <span className="text-destructive">*</span></Label>
              <Input id="monthlyPremiumZar" {...register('monthlyPremiumZar')} type="number" step="0.01" placeholder="850.00" className="h-12 text-lg font-semibold" />
              {errors.monthlyPremiumZar && <p className="text-sm text-destructive">{errors.monthlyPremiumZar.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="excessAmountZar">Excess Amount (R)</Label>
              <Input id="excessAmountZar" {...register('excessAmountZar')} type="number" step="0.01" placeholder="2500.00" className="h-12" />
            </div>
          </div>

          {/* Total Display */}
          {monthlyPremium > 0 && (
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Monthly Premium</span>
                <span className="text-2xl font-bold">{formatZAR(monthlyPremium)}</span>
              </div>
            </div>
          )}

          {/* Broker Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brokerName">Broker Name</Label>
              <Input id="brokerName" {...register('brokerName')} placeholder="Broker name" className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brokerPhone">Broker Phone</Label>
              <Input id="brokerPhone" {...register('brokerPhone')} placeholder="Broker phone" className="h-12" />
            </div>
          </div>

          {/* Claim Phone */}
          <div className="space-y-2">
            <Label htmlFor="claimPhoneNumber">Claims Phone Number</Label>
            <Input id="claimPhoneNumber" {...register('claimPhoneNumber')} placeholder="Claims hotline" className="h-12" />
          </div>

          {/* Cover Details */}
          <div className="space-y-2">
            <Label htmlFor="coverDetails">Cover Details</Label>
            <Textarea id="coverDetails" {...register('coverDetails')} placeholder="Details of what is covered..." className="min-h-20" />
          </div>
        </CardContent>
      </Card>

      <ReceiptImageCapture
        previewUrl={previewUrl}
        imageError={imageError}
        isCompressing={isCompressing}
        compressionInfo={compressionInfo}
        onImageCapture={onImageCapture}
        onClearImage={onClearImage}
        isEditMode={isEditMode}
      />

      <Button type="submit" size="lg" className="w-full h-14 text-lg" disabled={isSubmitting || (!isEditMode && !receiptImage)}>
        {isSubmitting ? 'Saving...' : 'Save Insurance Premium'}
      </Button>
    </form>
  )
}

// ============================================================================
// VEHICLE TRACKING FORM
// ============================================================================

interface VehicleTrackingFormProps extends SharedFormProps {
  onSubmit: (data: FixedAdminFormData, receiptImage: File | null) => Promise<void>
  initialData?: VehicleTrackingInput
  isEditMode?: boolean
}

function VehicleTrackingForm({
  vehicles,
  onSubmit,
  receiptImage,
  previewUrl,
  imageError,
  isCompressing,
  compressionInfo,
  onImageCapture,
  onClearImage,
  isSubmitting,
  setIsSubmitting,
  initialData,
  isEditMode = false,
}: VehicleTrackingFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<VehicleTrackingInput>({
    resolver: zodResolver(vehicleTrackingSchema),
    defaultValues: initialData || {
      vehicleId: vehicles[0]?.id || '',
      date: new Date(),
      subscriptionType: 'MONTHLY',
      contractStartDate: new Date(),
      recoveryIncluded: true,
    },
  })

  const selectedVehicleId = watch('vehicleId')
  const contractStartDate = watch('contractStartDate')
  const contractEndDate = watch('contractEndDate')
  const installationDate = watch('installationDate')
  const monthlyFee = watch('monthlyFeeZar')
  const recoveryIncluded = watch('recoveryIncluded')

  const handleFormSubmit = async (data: VehicleTrackingInput) => {
    if (!isEditMode && !receiptImage) {
      alert('Please capture a receipt image before saving')
      return
    }
    setIsSubmitting(true)
    try {
      await onSubmit({ type: 'VEHICLE_TRACKING', data }, receiptImage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-5 w-5 text-chart-2" />
            Vehicle Tracking Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Vehicle */}
          <div className="space-y-2">
            <Label htmlFor="vehicleId">Vehicle <span className="text-destructive">*</span></Label>
            <Select value={selectedVehicleId} onValueChange={(v) => setValue('vehicleId', v)}>
              <SelectTrigger id="vehicleId" className="h-12">
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.registrationNumber} - {v.make} {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.vehicleId && <p className="text-sm text-destructive">{errors.vehicleId.message}</p>}
          </div>

          {/* Provider and Subscription Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="providerName">Provider Name <span className="text-destructive">*</span></Label>
              <Input id="providerName" {...register('providerName')} placeholder="e.g., Tracker, Cartrack" className="h-12" />
              {errors.providerName && <p className="text-sm text-destructive">{errors.providerName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="subscriptionType">Subscription Type <span className="text-destructive">*</span></Label>
              <Select value={watch('subscriptionType')} onValueChange={(v) => setValue('subscriptionType', v as VehicleTrackingInput['subscriptionType'])}>
                <SelectTrigger id="subscriptionType" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TRACKING_SUBSCRIPTION_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Monthly Fee */}
          <div className="space-y-2">
            <Label htmlFor="monthlyFeeZar">Monthly Fee (R) <span className="text-destructive">*</span></Label>
            <Input id="monthlyFeeZar" {...register('monthlyFeeZar')} type="number" step="0.01" placeholder="199.00" className="h-12 text-lg font-semibold" />
            {errors.monthlyFeeZar && <p className="text-sm text-destructive">{errors.monthlyFeeZar.message}</p>}
          </div>

          {/* Total Display */}
          {monthlyFee > 0 && (
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Monthly Fee</span>
                <span className="text-2xl font-bold">{formatZAR(monthlyFee)}</span>
              </div>
            </div>
          )}

          {/* Contract Dates */}
          <div className="grid grid-cols-2 gap-4">
            <DatePickerField
              label="Contract Start"
              value={contractStartDate}
              onChange={(d) => d && setValue('contractStartDate', d)}
              error={errors.contractStartDate?.message}
              required
            />
            <DatePickerField
              label="Contract End"
              value={contractEndDate}
              onChange={(d) => setValue('contractEndDate', d)}
            />
          </div>

          {/* Device Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deviceSerialNumber">Device Serial Number</Label>
              <Input id="deviceSerialNumber" {...register('deviceSerialNumber')} placeholder="Serial number" className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deviceType">Device Type</Label>
              <Input id="deviceType" {...register('deviceType')} placeholder="e.g., OBD, Hardwired" className="h-12" />
            </div>
          </div>

          {/* Installation Date */}
          <DatePickerField
            label="Installation Date"
            value={installationDate}
            onChange={(d) => setValue('installationDate', d)}
          />

          {/* Recovery Included */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="recoveryIncluded">Recovery Service Included</Label>
              <p className="text-sm text-muted-foreground">Does this subscription include vehicle recovery?</p>
            </div>
            <Switch id="recoveryIncluded" checked={recoveryIncluded} onCheckedChange={(v) => setValue('recoveryIncluded', v)} />
          </div>

          {/* Support Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="appLoginEmail">App Login Email</Label>
              <Input id="appLoginEmail" {...register('appLoginEmail')} type="email" placeholder="app@example.com" className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportPhoneNumber">Support Phone</Label>
              <Input id="supportPhoneNumber" {...register('supportPhoneNumber')} placeholder="Support number" className="h-12" />
            </div>
          </div>

          {/* Features */}
          <div className="space-y-2">
            <Label htmlFor="features">Features</Label>
            <Textarea id="features" {...register('features')} placeholder="List of features included..." className="min-h-20" />
          </div>
        </CardContent>
      </Card>

      <ReceiptImageCapture
        previewUrl={previewUrl}
        imageError={imageError}
        isCompressing={isCompressing}
        compressionInfo={compressionInfo}
        onImageCapture={onImageCapture}
        onClearImage={onClearImage}
        isEditMode={isEditMode}
      />

      <Button type="submit" size="lg" className="w-full h-14 text-lg" disabled={isSubmitting || (!isEditMode && !receiptImage)}>
        {isSubmitting ? 'Saving...' : 'Save Vehicle Tracking'}
      </Button>
    </form>
  )
}

// ============================================================================
// E-TOLL FORM
// ============================================================================

interface ETollFormProps extends SharedFormProps {
  onSubmit: (data: FixedAdminFormData, receiptImage: File | null) => Promise<void>
  initialData?: ETollInput
  isEditMode?: boolean
}

function ETollForm({
  vehicles,
  onSubmit,
  receiptImage,
  previewUrl,
  imageError,
  isCompressing,
  compressionInfo,
  onImageCapture,
  onClearImage,
  isSubmitting,
  setIsSubmitting,
  initialData,
  isEditMode = false,
}: ETollFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ETollInput>({
    resolver: zodResolver(eTollSchema),
    defaultValues: initialData || {
      vehicleId: vehicles[0]?.id || '',
      vehicleRegistration: vehicles[0]?.registrationNumber || '',
      date: new Date(),
      paymentMethod: 'ETAG',
    },
  })

  const selectedVehicleId = watch('vehicleId')
  const periodStartDate = watch('periodStartDate')
  const periodEndDate = watch('periodEndDate')
  const totalAmount = watch('totalAmountZar')

  // Update vehicle registration when vehicle changes
  const handleVehicleChange = (vehicleId: string) => {
    setValue('vehicleId', vehicleId)
    const vehicle = vehicles.find(v => v.id === vehicleId)
    if (vehicle) {
      setValue('vehicleRegistration', vehicle.registrationNumber)
    }
  }

  const handleFormSubmit = async (data: ETollInput) => {
    if (!isEditMode && !receiptImage) {
      alert('Please capture a receipt image before saving')
      return
    }
    setIsSubmitting(true)
    try {
      await onSubmit({ type: 'ETOLL_SANRAL', data }, receiptImage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-chart-3" />
            E-Tolls (SANRAL) Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Vehicle */}
          <div className="space-y-2">
            <Label htmlFor="vehicleId">Vehicle <span className="text-destructive">*</span></Label>
            <Select value={selectedVehicleId} onValueChange={handleVehicleChange}>
              <SelectTrigger id="vehicleId" className="h-12">
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.registrationNumber} - {v.make} {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.vehicleId && <p className="text-sm text-destructive">{errors.vehicleId.message}</p>}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method <span className="text-destructive">*</span></Label>
            <Select value={watch('paymentMethod')} onValueChange={(v) => setValue('paymentMethod', v as ETollInput['paymentMethod'])}>
              <SelectTrigger id="paymentMethod" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ETOLL_PAYMENT_METHOD_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Account and Tag Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="accountNumber">E-Tag Account Number</Label>
              <Input id="accountNumber" {...register('accountNumber')} placeholder="Account number" className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagSerialNumber">Tag Serial Number</Label>
              <Input id="tagSerialNumber" {...register('tagSerialNumber')} placeholder="Tag serial" className="h-12" />
            </div>
          </div>

          {/* Total Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalAmountZar">Total Amount (R) <span className="text-destructive">*</span></Label>
              <Input id="totalAmountZar" {...register('totalAmountZar')} type="number" step="0.01" placeholder="350.00" className="h-12 text-lg font-semibold" />
              {errors.totalAmountZar && <p className="text-sm text-destructive">{errors.totalAmountZar.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="vatAmountZar">VAT Amount (R)</Label>
              <Input id="vatAmountZar" {...register('vatAmountZar')} type="number" step="0.01" placeholder="45.65" className="h-12" />
            </div>
          </div>

          {/* Total Display */}
          {totalAmount > 0 && (
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total E-Toll Amount</span>
                <span className="text-2xl font-bold">{formatZAR(totalAmount)}</span>
              </div>
            </div>
          )}

          {/* Period Dates */}
          <div className="grid grid-cols-2 gap-4">
            <DatePickerField
              label="Period Start"
              value={periodStartDate}
              onChange={(d) => setValue('periodStartDate', d)}
            />
            <DatePickerField
              label="Period End"
              value={periodEndDate}
              onChange={(d) => setValue('periodEndDate', d)}
            />
          </div>

          {/* Toll Routes and Gantries */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tollRoutes">Toll Routes</Label>
              <Input id="tollRoutes" {...register('tollRoutes')} placeholder="e.g., N1, N3, N12" className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalGantries">Total Gantries</Label>
              <Input id="totalGantries" {...register('totalGantries')} type="number" placeholder="Number of gantries" className="h-12" />
            </div>
          </div>

          {/* Reference Number */}
          <div className="space-y-2">
            <Label htmlFor="referenceNumber">Reference Number</Label>
            <Input id="referenceNumber" {...register('referenceNumber')} placeholder="Invoice/Reference number" className="h-12" />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register('notes')} placeholder="Any additional notes..." className="min-h-20" />
          </div>
        </CardContent>
      </Card>

      <ReceiptImageCapture
        previewUrl={previewUrl}
        imageError={imageError}
        isCompressing={isCompressing}
        compressionInfo={compressionInfo}
        onImageCapture={onImageCapture}
        onClearImage={onClearImage}
        isEditMode={isEditMode}
      />

      <Button type="submit" size="lg" className="w-full h-14 text-lg" disabled={isSubmitting || (!isEditMode && !receiptImage)}>
        {isSubmitting ? 'Saving...' : 'Save E-Toll Expense'}
      </Button>
    </form>
  )
}

// ============================================================================
// LICENSE RENEWAL FORM
// ============================================================================

interface LicenseRenewalFormProps extends SharedFormProps {
  onSubmit: (data: FixedAdminFormData, receiptImage: File | null) => Promise<void>
  initialData?: LicenseRenewalInput
  isEditMode?: boolean
}

function LicenseRenewalForm({
  vehicles,
  onSubmit,
  receiptImage,
  previewUrl,
  imageError,
  isCompressing,
  compressionInfo,
  onImageCapture,
  onClearImage,
  isSubmitting,
  setIsSubmitting,
  initialData,
  isEditMode = false,
}: LicenseRenewalFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LicenseRenewalInput>({
    resolver: zodResolver(licenseRenewalSchema),
    defaultValues: initialData || {
      vehicleId: vehicles[0]?.id || '',
      date: new Date(),
      licenseType: 'VEHICLE_LICENSE',
      renewalMethod: 'POST_OFFICE',
      newExpiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    },
  })

  const selectedVehicleId = watch('vehicleId')
  const previousExpiryDate = watch('previousExpiryDate')
  const newExpiryDate = watch('newExpiryDate')
  const renewalFee = watch('renewalFeeZar')
  const penalties = watch('penaltiesZar') || 0
  const arrears = watch('arrearsZar') || 0
  const totalAmount = renewalFee + penalties + arrears

  const handleFormSubmit = async (data: LicenseRenewalInput) => {
    if (!isEditMode && !receiptImage) {
      alert('Please capture a receipt image before saving')
      return
    }
    setIsSubmitting(true)
    try {
      await onSubmit({ type: 'LICENSE_RENEWAL', data }, receiptImage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-chart-4" />
            License Renewal Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Vehicle */}
          <div className="space-y-2">
            <Label htmlFor="vehicleId">Vehicle <span className="text-destructive">*</span></Label>
            <Select value={selectedVehicleId} onValueChange={(v) => setValue('vehicleId', v)}>
              <SelectTrigger id="vehicleId" className="h-12">
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.registrationNumber} - {v.make} {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.vehicleId && <p className="text-sm text-destructive">{errors.vehicleId.message}</p>}
          </div>

          {/* License Type and Renewal Method */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="licenseType">License Type <span className="text-destructive">*</span></Label>
              <Select value={watch('licenseType')} onValueChange={(v) => setValue('licenseType', v as LicenseRenewalInput['licenseType'])}>
                <SelectTrigger id="licenseType" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LICENSE_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="renewalMethod">Renewal Method <span className="text-destructive">*</span></Label>
              <Select value={watch('renewalMethod')} onValueChange={(v) => setValue('renewalMethod', v as LicenseRenewalInput['renewalMethod'])}>
                <SelectTrigger id="renewalMethod" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LICENSE_RENEWAL_METHOD_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* License Number and Authority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">License Number</Label>
              <Input id="licenseNumber" {...register('licenseNumber')} placeholder="License number" className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registrationAuthority">Registration Authority</Label>
              <Input id="registrationAuthority" {...register('registrationAuthority')} placeholder="e.g., City of Johannesburg" className="h-12" />
            </div>
          </div>

          {/* Expiry Dates */}
          <div className="grid grid-cols-2 gap-4">
            <DatePickerField
              label="Previous Expiry Date"
              value={previousExpiryDate}
              onChange={(d) => setValue('previousExpiryDate', d)}
            />
            <DatePickerField
              label="New Expiry Date"
              value={newExpiryDate}
              onChange={(d) => d && setValue('newExpiryDate', d)}
              error={errors.newExpiryDate?.message}
              required
            />
          </div>

          {/* Fees */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="renewalFeeZar">Renewal Fee (R) <span className="text-destructive">*</span></Label>
              <Input id="renewalFeeZar" {...register('renewalFeeZar')} type="number" step="0.01" placeholder="550.00" className="h-12 text-lg font-semibold" />
              {errors.renewalFeeZar && <p className="text-sm text-destructive">{errors.renewalFeeZar.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="penaltiesZar">Penalties (R)</Label>
              <Input id="penaltiesZar" {...register('penaltiesZar')} type="number" step="0.01" placeholder="0.00" className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="arrearsZar">Arrears (R)</Label>
              <Input id="arrearsZar" {...register('arrearsZar')} type="number" step="0.01" placeholder="0.00" className="h-12" />
            </div>
          </div>

          {/* Total Display */}
          {totalAmount > 0 && (
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="text-2xl font-bold">{formatZAR(totalAmount)}</span>
              </div>
              {(penalties > 0 || arrears > 0) && (
                <p className="text-xs text-muted-foreground mt-1">
                  Fee: {formatZAR(renewalFee)} + Penalties: {formatZAR(penalties)} + Arrears: {formatZAR(arrears)}
                </p>
              )}
            </div>
          )}

          {/* Transaction Number and Processing Days */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="transactionNumber">Transaction Number</Label>
              <Input id="transactionNumber" {...register('transactionNumber')} placeholder="Transaction/Receipt number" className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="processingDays">Processing Days</Label>
              <Input id="processingDays" {...register('processingDays')} type="number" placeholder="e.g., 21" className="h-12" />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register('notes')} placeholder="Any additional notes..." className="min-h-20" />
          </div>
        </CardContent>
      </Card>

      <ReceiptImageCapture
        previewUrl={previewUrl}
        imageError={imageError}
        isCompressing={isCompressing}
        compressionInfo={compressionInfo}
        onImageCapture={onImageCapture}
        onClearImage={onClearImage}
        isEditMode={isEditMode}
      />

      <Button type="submit" size="lg" className="w-full h-14 text-lg" disabled={isSubmitting || (!isEditMode && !receiptImage)}>
        {isSubmitting ? 'Saving...' : 'Save License Renewal'}
      </Button>
    </form>
  )
}

// ============================================================================
// ROADWORTHY FORM
// ============================================================================

interface RoadworthyFormProps extends SharedFormProps {
  onSubmit: (data: FixedAdminFormData, receiptImage: File | null) => Promise<void>
  initialData?: RoadworthyInput
  isEditMode?: boolean
}

function RoadworthyForm({
  vehicles,
  onSubmit,
  receiptImage,
  previewUrl,
  imageError,
  isCompressing,
  compressionInfo,
  onImageCapture,
  onClearImage,
  isSubmitting,
  setIsSubmitting,
  initialData,
  isEditMode = false,
}: RoadworthyFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RoadworthyInput>({
    resolver: zodResolver(roadworthySchema),
    defaultValues: initialData || {
      vehicleId: vehicles[0]?.id || '',
      date: new Date(),
      testDate: new Date(),
      testResult: 'PASS',
    },
  })

  const selectedVehicleId = watch('vehicleId')
  const testDate = watch('testDate')
  const expiryDate = watch('expiryDate')
  const testResult = watch('testResult')
  const testFee = watch('testFeeZar')
  const retestFee = watch('retestFeeZar') || 0
  const totalAmount = testFee + retestFee

  const handleFormSubmit = async (data: RoadworthyInput) => {
    if (!isEditMode && !receiptImage) {
      alert('Please capture a receipt image before saving')
      return
    }
    setIsSubmitting(true)
    try {
      await onSubmit({ type: 'ROADWORTHY', data }, receiptImage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="h-5 w-5 text-chart-5" />
            Roadworthy Certificate Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Vehicle */}
          <div className="space-y-2">
            <Label htmlFor="vehicleId">Vehicle <span className="text-destructive">*</span></Label>
            <Select value={selectedVehicleId} onValueChange={(v) => setValue('vehicleId', v)}>
              <SelectTrigger id="vehicleId" className="h-12">
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.registrationNumber} - {v.make} {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.vehicleId && <p className="text-sm text-destructive">{errors.vehicleId.message}</p>}
          </div>

          {/* Testing Station */}
          <div className="space-y-2">
            <Label htmlFor="testingStationName">Testing Station Name <span className="text-destructive">*</span></Label>
            <Input id="testingStationName" {...register('testingStationName')} placeholder="e.g., AA Test Centre" className="h-12" />
            {errors.testingStationName && <p className="text-sm text-destructive">{errors.testingStationName.message}</p>}
          </div>

          {/* Testing Station Address and Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="testingStationAddress">Station Address</Label>
              <Input id="testingStationAddress" {...register('testingStationAddress')} placeholder="Address" className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="testingStationName">Testing Station</Label>
              <Input id="testingStationName" {...register('testingStationName')} placeholder="e.g., AA Test Centre" className="h-12" />
            </div>
          </div>

          {/* Test Date and Result */}
          <div className="grid grid-cols-2 gap-4">
            <DatePickerField
              label="Test Date"
              value={testDate}
              onChange={(d) => d && setValue('testDate', d)}
              error={errors.testDate?.message}
              required
            />
            <div className="space-y-2">
              <Label htmlFor="testResult">Test Result <span className="text-destructive">*</span></Label>
              <Select value={watch('testResult')} onValueChange={(v) => setValue('testResult', v as RoadworthyInput['testResult'])}>
                <SelectTrigger id="testResult" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROADWORTHY_RESULT_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Certificate Number and Expiry */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="certificateNumber">Certificate Number</Label>
              <Input id="certificateNumber" {...register('certificateNumber')} placeholder="Certificate number" className="h-12" />
            </div>
            <DatePickerField
              label="Certificate Expiry"
              value={expiryDate}
              onChange={(d) => setValue('expiryDate', d)}
            />
          </div>

          {/* Fees */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="testFeeZar">Test Fee (R) <span className="text-destructive">*</span></Label>
              <Input id="testFeeZar" {...register('testFeeZar')} type="number" step="0.01" placeholder="450.00" className="h-12" />
              {errors.testFeeZar && <p className="text-sm text-destructive">{errors.testFeeZar.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="retestFeeZar">Retest Fee (R)</Label>
              <Input id="retestFeeZar" {...register('retestFeeZar')} type="number" step="0.01" placeholder="0.00" className="h-12" />
            </div>
          </div>

          {/* Total Display */}
          {totalAmount > 0 && (
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="text-2xl font-bold">{formatZAR(totalAmount)}</span>
              </div>
            </div>
          )}

          {/* Inspector and Odometer */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inspectorName">Inspector Name</Label>
              <Input id="inspectorName" {...register('inspectorName')} placeholder="Inspector name" className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleOdometer">Vehicle Odometer</Label>
              <Input id="vehicleOdometer" {...register('vehicleOdometer')} type="number" placeholder="Odometer reading" className="h-12" />
            </div>
          </div>

          {/* Failure Reasons (if failed) */}
          {testResult === 'FAIL' && (
            <div className="space-y-2">
              <Label htmlFor="failureReasons">Failure Reasons</Label>
              <Textarea id="failureReasons" {...register('failureReasons')} placeholder="List reasons for failure..." className="min-h-25" />
            </div>
          )}

          {/* Conditions (if conditional pass) */}
          {testResult === 'CONDITIONAL_PASS' && (
            <div className="space-y-2">
              <Label htmlFor="conditionsApplied">Conditions Applied</Label>
              <Textarea id="conditionsApplied" {...register('conditionsApplied')} placeholder="List conditions that must be met..." className="min-h-25" />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register('notes')} placeholder="Any additional notes..." className="min-h-20" />
          </div>
        </CardContent>
      </Card>

      <ReceiptImageCapture
        previewUrl={previewUrl}
        imageError={imageError}
        isCompressing={isCompressing}
        compressionInfo={compressionInfo}
        onImageCapture={onImageCapture}
        onClearImage={onClearImage}
        isEditMode={isEditMode}
      />

      <Button type="submit" size="lg" className="w-full h-14 text-lg" disabled={isSubmitting || (!isEditMode && !receiptImage)}>
        {isSubmitting ? 'Saving...' : 'Save Roadworthy Certificate'}
      </Button>
    </form>
  )
}

// ============================================================================
// OTHER EXPENSE FORM
// ============================================================================

interface OtherExpenseFormProps extends SharedFormProps {
  onSubmit: (data: FixedAdminFormData, receiptImage: File | null) => Promise<void>
  initialData?: OtherExpenseInput
  isEditMode?: boolean
}

function OtherExpenseForm({
  vehicles,
  onSubmit,
  receiptImage,
  previewUrl,
  imageError,
  isCompressing,
  compressionInfo,
  onImageCapture,
  onClearImage,
  isSubmitting,
  setIsSubmitting,
  initialData,
  isEditMode = false,
}: OtherExpenseFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OtherExpenseInput>({
    resolver: zodResolver(otherExpenseSchema),
    defaultValues: initialData || {
      vehicleId: vehicles[0]?.id || '',
      date: new Date(),
      isRecurring: false,
      recurrenceFrequency: 'ONCE_OFF',
    },
  })

  const selectedVehicleId = watch('vehicleId')
  const periodStartDate = watch('periodStartDate')
  const periodEndDate = watch('periodEndDate')
  const isRecurring = watch('isRecurring')
  const amount = watch('amountZar')

  const handleFormSubmit = async (data: OtherExpenseInput) => {
    if (!isEditMode && !receiptImage) {
      alert('Please capture a receipt image before saving')
      return
    }
    setIsSubmitting(true)
    try {
      await onSubmit({ type: 'OTHER', data }, receiptImage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
            Other Fixed Expense Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Vehicle */}
          <div className="space-y-2">
            <Label htmlFor="vehicleId">Vehicle <span className="text-destructive">*</span></Label>
            <Select value={selectedVehicleId} onValueChange={(v) => setValue('vehicleId', v)}>
              <SelectTrigger id="vehicleId" className="h-12">
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.registrationNumber} - {v.make} {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.vehicleId && <p className="text-sm text-destructive">{errors.vehicleId.message}</p>}
          </div>

          {/* Expense Description */}
          <div className="space-y-2">
            <Label htmlFor="expenseDescription">Expense Description <span className="text-destructive">*</span></Label>
            <Input id="expenseDescription" {...register('expenseDescription')} placeholder="Describe the expense" className="h-12" />
            {errors.expenseDescription && <p className="text-sm text-destructive">{errors.expenseDescription.message}</p>}
          </div>

          {/* Category Label and Provider */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="categoryLabel">Category Label</Label>
              <Input id="categoryLabel" {...register('categoryLabel')} placeholder="e.g., Parking, Storage" className="h-12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="providerName">Provider Name</Label>
              <Input id="providerName" {...register('providerName')} placeholder="Provider name" className="h-12" />
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amountZar">Amount (R) <span className="text-destructive">*</span></Label>
            <Input id="amountZar" {...register('amountZar')} type="number" step="0.01" placeholder="550.00" className="h-12 text-lg font-semibold" />
            {errors.amountZar && <p className="text-sm text-destructive">{errors.amountZar.message}</p>}
          </div>

          {/* Total Display */}
          {amount && amount > 0 && (
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="text-2xl font-bold">{formatZAR(amount)}</span>
              </div>
            </div>
          )}

          {/* Is Recurring */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="isRecurring">Recurring Expense</Label>
              <p className="text-sm text-muted-foreground">Is this a recurring expense?</p>
            </div>
            <Switch id="isRecurring" checked={isRecurring} onCheckedChange={(v) => setValue('isRecurring', v)} />
          </div>

          {/* Recurrence Frequency (if recurring) */}
          {isRecurring && (
            <div className="space-y-2">
              <Label htmlFor="recurrenceFrequency">Recurrence Frequency</Label>
              <Select value={watch('recurrenceFrequency')} onValueChange={(v) => setValue('recurrenceFrequency', v as OtherExpenseInput['recurrenceFrequency'])} name="recurrenceFrequency">
                <SelectTrigger id="recurrenceFrequency" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RECURRENCE_FREQUENCY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Period Dates */}
          <div className="grid grid-cols-2 gap-4">
            <DatePickerField
              label="Period Start"
              value={periodStartDate}
              onChange={(d) => setValue('periodStartDate', d)}
            />
            <DatePickerField
              label="Period End"
              value={periodEndDate}
              onChange={(d) => setValue('periodEndDate', d)}
            />
          </div>

          {/* Reference Number */}
          <div className="space-y-2">
            <Label htmlFor="referenceNumber">Reference Number</Label>
            <Input id="referenceNumber" {...register('referenceNumber')} placeholder="Invoice/Reference number" className="h-12" />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register('notes')} placeholder="Any additional notes..." className="min-h-20" />
          </div>
        </CardContent>
      </Card>

      <ReceiptImageCapture
        previewUrl={previewUrl}
        imageError={imageError}
        isCompressing={isCompressing}
        compressionInfo={compressionInfo}
        onImageCapture={onImageCapture}
        onClearImage={onClearImage}
        isEditMode={isEditMode}
      />

      <Button type="submit" size="lg" className="w-full h-14 text-lg" disabled={isSubmitting || (!isEditMode && !receiptImage)}>
        {isSubmitting ? 'Saving...' : 'Save Other Expense'}
      </Button>
    </form>
  )
}
