'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Camera, AlertCircle, CheckCircle2, CalendarIcon, IdCard, CreditCard, AlertTriangle } from 'lucide-react'
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { FuelType, formatZAR } from '@/lib/types/database'
import { 
  processReceiptImage, 
  validateImageFile, 
  formatFileSize 
} from '@/lib/utils/image-converter'
import { ReceiptSupportProps, ExpenseFormMode } from './form-types'
import { EntryImageManager } from '@/components/entries/entry-image-manager'
import { ImageCropModal } from '@/components/ui/image-crop-modal'

// Personal License Types
export type PersonalLicenseType = 'DRIVERS_LICENSE' | 'PERSONAL_ID_CARD' | 'PDP'

export const PERSONAL_LICENSE_TYPE_LABELS: Record<PersonalLicenseType, string> = {
  'DRIVERS_LICENSE': "Driver's License",
  'PERSONAL_ID_CARD': 'ID Card (Smart ID)',
  'PDP': 'Professional Driving Permit (PDP)',
}

// License code options for SA
const LICENSE_CODES = [
  { value: 'A', label: 'Code A - Motorcycle' },
  { value: 'A1', label: 'Code A1 - Motorcycle (under 125cc)' },
  { value: 'B', label: 'Code B - Light Motor Vehicle (LMV)' },
  { value: 'C', label: 'Code C - Heavy Motor Vehicle' },
  { value: 'C1', label: 'Code C1 - Heavy Motor Vehicle (3,500kg-16,000kg)' },
  { value: 'EB', label: 'Code EB - LMV with trailer' },
  { value: 'EC', label: 'Code EC - Articulated heavy vehicle' },
  { value: 'EC1', label: 'Code EC1 - Heavy vehicle with trailer' },
]

// PDP Categories
const PDP_CATEGORIES = [
  { value: 'G', label: 'Category G - Goods' },
  { value: 'P', label: 'Category P - Passengers' },
  { value: 'D', label: 'Category D - Dangerous Goods' },
]

const driversLicenseSchema = z.object({
  licenseNumber: z.string().min(1, 'Enter license number'),
  licenseCode: z.string().min(1, 'Select license code'),
  issueDate: z.date({ required_error: 'Select issue date' }),
  expiryDate: z.date({ required_error: 'Select expiry date' }),
  renewalFeeZar: z.coerce.number().positive('Enter renewal fee'),
  penaltiesZar: z.coerce.number().optional(),
  renewalMethod: z.enum(['ONLINE', 'DLTC', 'DRIVING_SCHOOL']),
  dlcName: z.string().optional(),
  dlcAddress: z.string().optional(),
  eyeTestDate: z.date().optional(),
  notes: z.string().optional(),
})

const idCardSchema = z.object({
  idNumber: z.string().min(13, 'Enter valid 13-digit ID number').max(13),
  issueDate: z.date({ required_error: 'Select issue date' }),
  expiryDate: z.date({ required_error: 'Select expiry date' }),
  renewalFeeZar: z.coerce.number().positive('Enter renewal fee'),
  renewalMethod: z.enum(['HOME_AFFAIRS', 'BANK']),
  homeAffairsOffice: z.string().optional(),
  applicationNumber: z.string().optional(),
  collectionDate: z.date().optional(),
  notes: z.string().optional(),
})

const pdpSchema = z.object({
  pdpNumber: z.string().min(1, 'Enter PDP number'),
  pdpCategory: z.string().min(1, 'Select PDP category'),
  issueDate: z.date({ required_error: 'Select issue date' }),
  expiryDate: z.date({ required_error: 'Select expiry date' }),
  renewalFeeZar: z.coerce.number().positive('Enter renewal fee'),
  medicalExamDate: z.date().optional(),
  medicalExamValid: z.boolean().default(true),
  trainingProvider: z.string().optional(),
  notes: z.string().optional(),
})

type DriversLicenseInput = z.infer<typeof driversLicenseSchema>
type IdCardInput = z.infer<typeof idCardSchema>
type PdpInput = z.infer<typeof pdpSchema>

export type PersonalLicenseFormData =
  | { type: 'DRIVERS_LICENSE'; data: DriversLicenseInput }
  | { type: 'PERSONAL_ID_CARD'; data: IdCardInput }
  | { type: 'PDP'; data: PdpInput }

interface Vehicle {
  id: string
  registrationNumber: string
  make: string
  model: string
  fuelType: FuelType
  currentOdometer: number
}

interface PersonalLicenseFormProps extends ReceiptSupportProps {
  onSubmit: (data: PersonalLicenseFormData, receiptImage: File | null) => Promise<void>
  initialData?: PersonalLicenseFormData
  existingReceiptImageUrl?: string
}

export function PersonalLicenseForm({
  onSubmit,
  initialData,
  mode = 'create',
  existingReceiptImageUrl,
  existingImages = [],
  entryId,
  onImageUpload,
  onImageDelete,
  onImageReupload,
  onImageLock
}: PersonalLicenseFormProps) {
  const [activeTab, setActiveTab] = useState<PersonalLicenseType>(
    (initialData?.type as PersonalLicenseType) || 'DRIVERS_LICENSE'
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

    console.log('handleImageCapture called, file:', file.name)

    setImageError(null)
    setCompressionInfo(null)

    const validation = validateImageFile(file)
    if (!validation.valid) {
      setImageError(validation.error || 'Invalid file')
      return
    }

    console.log('Setting crop modal to show')
    setOriginalImageFile(file)
    setShowCropModal(true)
  }

  const handleCropConfirm = async (croppedFile: File, originalFile: File) => {
    console.log('handleCropConfirm called')
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
      setImageError(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsCompressing(false)
    }
  }

  const handleCropCancel = () => {
    console.log('handleCropCancel called')
    setShowCropModal(false)
    setOriginalImageFile(null)
  }

  const clearImage = () => {
    setReceiptImage(null)
    setPreviewUrl(null)
    setCompressionInfo(null)
  }

  // Calculate days until expiry for alert display
  const getDaysUntilExpiry = (expiryDate: Date | undefined): number | null => {
    if (!expiryDate) return null
    const today = new Date()
    const diffTime = expiryDate.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  return (
    <>
      <div className="space-y-6">
      {/* Info Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Expiry Alerts</AlertTitle>
        <AlertDescription>
          Personal license renewals are tracked for expiry alerts. You&apos;ll receive notifications 90 days, 30 days, and 7 days before expiry.
        </AlertDescription>
      </Alert>

      {/* License Type Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PersonalLicenseType)}>
        <TabsList className="grid grid-cols-3 h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger 
            value="DRIVERS_LICENSE"
            className="flex flex-col items-center gap-1 py-2 px-2 data-[state=active]:bg-background"
          >
            <IdCard className="h-4 w-4" />
            <span className="text-xs">License</span>
          </TabsTrigger>
          <TabsTrigger 
            value="PERSONAL_ID_CARD"
            className="flex flex-col items-center gap-1 py-2 px-2 data-[state=active]:bg-background"
          >
            <CreditCard className="h-4 w-4" />
            <span className="text-xs">ID Card</span>
          </TabsTrigger>
          <TabsTrigger 
            value="PDP"
            className="flex flex-col items-center gap-1 py-2 px-2 data-[state=active]:bg-background"
          >
            <IdCard className="h-4 w-4" />
            <span className="text-xs">PDP</span>
          </TabsTrigger>
        </TabsList>

        {/* Driver's License Form */}
        <TabsContent value="DRIVERS_LICENSE">
          <DriversLicenseFormContent
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
            initialData={initialData?.type === 'DRIVERS_LICENSE' ? initialData.data : undefined}
            mode={mode}
            getDaysUntilExpiry={getDaysUntilExpiry}
            existingImages={existingImages}
            entryId={entryId}
            onImageUpload={onImageUpload}
            onImageDelete={onImageDelete}
            onImageReupload={onImageReupload}
            onImageLock={onImageLock}
          />
        </TabsContent>

        {/* ID Card Form */}
        <TabsContent value="PERSONAL_ID_CARD">
          <IdCardFormContent
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
            initialData={initialData?.type === 'PERSONAL_ID_CARD' ? initialData.data : undefined}
            mode={mode}
            getDaysUntilExpiry={getDaysUntilExpiry}
            existingImages={existingImages}
            entryId={entryId}
            onImageUpload={onImageUpload}
            onImageDelete={onImageDelete}
            onImageReupload={onImageReupload}
            onImageLock={onImageLock}
          />
        </TabsContent>

        {/* PDP Form */}
        <TabsContent value="PDP">
          <PdpFormContent
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
            initialData={initialData?.type === 'PDP' ? initialData.data : undefined}
            mode={mode}
            getDaysUntilExpiry={getDaysUntilExpiry}
            existingImages={existingImages}
            entryId={entryId}
            onImageUpload={onImageUpload}
            onImageDelete={onImageDelete}
            onImageReupload={onImageReupload}
            onImageLock={onImageLock}
          />
        </TabsContent>
      </Tabs>
      </div>

      {/* Image Crop Modal */}
      {console.log('Render check - originalImageFile:', !!originalImageFile, 'showCropModal:', showCropModal)}
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

// Shared form props interface
interface SharedFormProps {
  receiptImage: File | null
  previewUrl: string | null
  imageError: string | null
  isCompressing: boolean
  compressionInfo: { originalSize: number; compressedSize: number } | null
  onImageCapture: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClearImage: () => void
  isSubmitting: boolean
  setIsSubmitting: (v: boolean) => void
  getDaysUntilExpiry: (date: Date | undefined) => number | null
  existingImages?: any[]
  entryId?: string
  onImageUpload?: (file: File, description?: string) => Promise<void>
  onImageDelete?: (imageId: string) => Promise<void>
  onImageReupload?: (imageId: string, file: File) => Promise<void>
  onImageLock?: (imageId: string, reason?: string) => Promise<void>
  mode?: ExpenseFormMode
}

// Receipt Image Capture Component
function ReceiptImageCapture({
  previewUrl,
  imageError,
  isCompressing,
  compressionInfo,
  onImageCapture,
  onClearImage,
}: Pick<SharedFormProps, 'previewUrl' | 'imageError' | 'isCompressing' | 'compressionInfo' | 'onImageCapture' | 'onClearImage'>) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Camera className="h-5 w-5 text-rose-500" />
          Upload Document
          <span className="text-muted-foreground text-sm font-normal">(Optional)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {previewUrl ? (
          <div className="space-y-3">
            <div className="relative">
              <img
                src={previewUrl}
                alt="Document preview"
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
                  Compressed: {formatFileSize(compressionInfo.originalSize)} to {formatFileSize(compressionInfo.compressedSize)}
                </span>
              </div>
            )}
          </div>
        ) : (
          <label htmlFor="documentImage" className={`
            flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors
            ${imageError ? 'border-destructive bg-destructive/5' : 'border-rose-500 hover:border-rose-500/80 hover:bg-rose-500/5'}
          `}>
            {isCompressing ? (
              <>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500 mb-2" />
                <span className="text-sm text-muted-foreground">Compressing...</span>
              </>
            ) : (
              <>
                <Camera className="h-8 w-8 text-rose-500 mb-2" />
                <span className="text-sm font-medium">Tap to upload document</span>
                <span className="text-xs text-muted-foreground">License card or receipt</span>
              </>
            )}
            <input
              id="documentImage"
              name="documentImage"
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

// Date Picker Field Component
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

// Expiry Warning Alert
function ExpiryWarningAlert({ daysUntilExpiry }: { daysUntilExpiry: number | null }) {
  if (daysUntilExpiry === null) return null
  
  if (daysUntilExpiry < 0) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Expired!</AlertTitle>
        <AlertDescription>
          This document expired {Math.abs(daysUntilExpiry)} days ago. Renew immediately.
        </AlertDescription>
      </Alert>
    )
  }
  
  if (daysUntilExpiry <= 30) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Expiring Soon!</AlertTitle>
        <AlertDescription>
          This document expires in {daysUntilExpiry} days. Start renewal process now.
        </AlertDescription>
      </Alert>
    )
  }
  
  if (daysUntilExpiry <= 90) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Upcoming Expiry</AlertTitle>
        <AlertDescription>
          This document expires in {daysUntilExpiry} days. Plan your renewal.
        </AlertDescription>
      </Alert>
    )
  }
  
  return null
}

// Driver's License Form Content
function DriversLicenseFormContent({
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
  mode = 'create',
  getDaysUntilExpiry,
  existingImages,
  entryId,
  onImageUpload,
  onImageDelete,
  onImageReupload,
  onImageLock,
}: SharedFormProps & {
  onSubmit: (data: PersonalLicenseFormData, receiptImage: File | null) => Promise<void>
  initialData?: DriversLicenseInput
}) {
  const form = useForm<DriversLicenseInput>({
    resolver: zodResolver(driversLicenseSchema),
    defaultValues: initialData || {
      renewalMethod: 'DLTC',
    },
  })

  const expiryDate = form.watch('expiryDate')
  const daysUntilExpiry = getDaysUntilExpiry(expiryDate)

  const handleSubmit = async (data: DriversLicenseInput) => {
    setIsSubmitting(true)
    try {
      await onSubmit({ type: 'DRIVERS_LICENSE', data }, receiptImage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-4">
      <ExpiryWarningAlert daysUntilExpiry={daysUntilExpiry} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">License Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">License Number <span className="text-destructive">*</span></Label>
              <Input
                id="licenseNumber"
                placeholder="e.g., 1234567890123"
                {...form.register('licenseNumber')}
                className="h-12"
              />
              {form.formState.errors.licenseNumber && (
                <p className="text-sm text-destructive">{form.formState.errors.licenseNumber.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="licenseCode">License Code <span className="text-destructive">*</span></Label>
              <Select
                value={form.watch('licenseCode')}
                onValueChange={(v) => form.setValue('licenseCode', v)}
                name="licenseCode"
              >
                <SelectTrigger id="licenseCode" className="h-12">
                  <SelectValue placeholder="Select code" />
                </SelectTrigger>
                <SelectContent>
                  {LICENSE_CODES.map((code) => (
                    <SelectItem key={code.value} value={code.value}>
                      {code.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.licenseCode && (
                <p className="text-sm text-destructive">{form.formState.errors.licenseCode.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DatePickerField
              label="Issue Date"
              value={form.watch('issueDate')}
              onChange={(date) => form.setValue('issueDate', date as Date)}
              error={form.formState.errors.issueDate?.message}
              required
              id="issueDate"
            />

            <DatePickerField
              label="Expiry Date"
              value={form.watch('expiryDate')}
              onChange={(date) => form.setValue('expiryDate', date as Date)}
              error={form.formState.errors.expiryDate?.message}
              required
              id="expiryDate"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Renewal Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="renewalFeeZar">Renewal Fee (ZAR) <span className="text-destructive">*</span></Label>
              <Input
                id="renewalFeeZar"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...form.register('renewalFeeZar')}
                className="h-12"
              />
              {form.formState.errors.renewalFeeZar && (
                <p className="text-sm text-destructive">{form.formState.errors.renewalFeeZar.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="penaltiesZar">Penalties (ZAR)</Label>
              <Input
                id="penaltiesZar"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...form.register('penaltiesZar')}
                className="h-12"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="renewalMethod">Renewal Method <span className="text-destructive">*</span></Label>
            <Select
              value={form.watch('renewalMethod')}
              onValueChange={(v) => form.setValue('renewalMethod', v as 'ONLINE' | 'DLTC' | 'DRIVING_SCHOOL')}
            >
              <SelectTrigger id="renewalMethod" className="h-12">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ONLINE">Online (NaTIS)</SelectItem>
                <SelectItem value="DLTC">DLTC (Driving License Testing Centre)</SelectItem>
                <SelectItem value="DRIVING_SCHOOL">Driving School</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dlcName">DLTC / Testing Centre Name</Label>
            <Input
              id="dlcName"
              placeholder="e.g., Randburg DLTC"
              {...form.register('dlcName')}
              className="h-12"
            />
          </div>

          <DatePickerField
            label="Eye Test Date"
            value={form.watch('eyeTestDate')}
            onChange={(date) => form.setValue('eyeTestDate', date)}
            id="eyeTestDate"
          />

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes..."
              {...form.register('notes')}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {mode === 'create' && (
        <ReceiptImageCapture
          previewUrl={previewUrl}
          imageError={imageError}
          isCompressing={isCompressing}
          compressionInfo={compressionInfo}
          onImageCapture={onImageCapture}
          onClearImage={onClearImage}
        />
      )}

      <Button type="submit" className="w-full h-12" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Update License' : 'Save License'}
      </Button>

      {/* Receipt Images Manager for Edit Mode */}
      {mode === 'edit' && entryId && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-5 w-5 text-chart-1" />
              Receipt Images
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Attach or manage receipt images for this expense.
            </p>
          </CardHeader>
          <CardContent>
            {onImageUpload && onImageDelete && onImageReupload && onImageLock ? (
              <EntryImageManager
                entryId={entryId}
                entryType="EXPENSE"
                images={existingImages || []}
                onUpload={onImageUpload}
                onDelete={onImageDelete}
                onReupload={onImageReupload}
                onLock={onImageLock}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Image management not available</p>
            )}
          </CardContent>
        </Card>
      )}
    </form>
  )
}

// ID Card Form Content
function IdCardFormContent({
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
  mode = 'create',
  getDaysUntilExpiry,
  existingImages,
  entryId,
  onImageUpload,
  onImageDelete,
  onImageReupload,
  onImageLock,
}: SharedFormProps & {
  onSubmit: (data: PersonalLicenseFormData, receiptImage: File | null) => Promise<void>
  initialData?: IdCardInput
}) {
  const form = useForm<IdCardInput>({
    resolver: zodResolver(idCardSchema),
    defaultValues: initialData || {
      renewalMethod: 'HOME_AFFAIRS',
    },
  })

  const expiryDate = form.watch('expiryDate')
  const daysUntilExpiry = getDaysUntilExpiry(expiryDate)

  const handleSubmit = async (data: IdCardInput) => {
    setIsSubmitting(true)
    try {
      await onSubmit({ type: 'PERSONAL_ID_CARD', data }, receiptImage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-4">
      <ExpiryWarningAlert daysUntilExpiry={daysUntilExpiry} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ID Card Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="idNumber">ID Number <span className="text-destructive">*</span></Label>
            <Input
              id="idNumber"
              placeholder="13-digit SA ID number"
              maxLength={13}
              {...form.register('idNumber')}
              className="h-12"
            />
            {form.formState.errors.idNumber && (
              <p className="text-sm text-destructive">{form.formState.errors.idNumber.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DatePickerField
              label="Issue Date"
              value={form.watch('issueDate')}
              onChange={(date) => form.setValue('issueDate', date as Date)}
              error={form.formState.errors.issueDate?.message}
              required
              id="issueDate"
            />

            <DatePickerField
              label="Expiry Date"
              value={form.watch('expiryDate')}
              onChange={(date) => form.setValue('expiryDate', date as Date)}
              error={form.formState.errors.expiryDate?.message}
              required
              id="expiryDate"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Renewal Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="renewalFeeZar">Renewal Fee (ZAR) <span className="text-destructive">*</span></Label>
              <Input
                id="renewalFeeZar"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...form.register('renewalFeeZar')}
                className="h-12"
              />
              {form.formState.errors.renewalFeeZar && (
                <p className="text-sm text-destructive">{form.formState.errors.renewalFeeZar.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="renewalMethod">Renewal Location <span className="text-destructive">*</span></Label>
              <Select
                value={form.watch('renewalMethod')}
                onValueChange={(v) => form.setValue('renewalMethod', v as 'HOME_AFFAIRS' | 'BANK')}
              >
                <SelectTrigger id="renewalMethod" className="h-12">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOME_AFFAIRS">Home Affairs Office</SelectItem>
                  <SelectItem value="BANK">Bank (Standard Bank, ABSA, etc.)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="homeAffairsOffice">Office / Branch Name</Label>
            <Input
              id="homeAffairsOffice"
              placeholder="e.g., Pretoria Home Affairs"
              {...form.register('homeAffairsOffice')}
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="applicationNumber">Application Number</Label>
            <Input
              id="applicationNumber"
              placeholder="Reference number from application"
              {...form.register('applicationNumber')}
              className="h-12"
            />
          </div>

          <DatePickerField
            label="Expected Collection Date"
            value={form.watch('collectionDate')}
            onChange={(date) => form.setValue('collectionDate', date)}
            id="collectionDate"
          />

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes..."
              {...form.register('notes')}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {mode === 'create' && (
        <ReceiptImageCapture
          previewUrl={previewUrl}
          imageError={imageError}
          isCompressing={isCompressing}
          compressionInfo={compressionInfo}
          onImageCapture={onImageCapture}
          onClearImage={onClearImage}
        />
      )}

      <Button type="submit" className="w-full h-12" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Update ID Card' : 'Save ID Card'}
      </Button>

      {/* Receipt Images Manager for Edit Mode */}
      {mode === 'edit' && entryId && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-5 w-5 text-chart-1" />
              Receipt Images
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Attach or manage receipt images for this expense.
            </p>
          </CardHeader>
          <CardContent>
            {onImageUpload && onImageDelete && onImageReupload && onImageLock ? (
              <EntryImageManager
                entryId={entryId}
                entryType="EXPENSE"
                images={existingImages || []}
                onUpload={onImageUpload}
                onDelete={onImageDelete}
                onReupload={onImageReupload}
                onLock={onImageLock}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Image management not available</p>
            )}
          </CardContent>
        </Card>
      )}
    </form>
  )
}

// PDP Form Content
function PdpFormContent({
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
  mode = 'create',
  getDaysUntilExpiry,
  existingImages,
  entryId,
  onImageUpload,
  onImageDelete,
  onImageReupload,
  onImageLock,
}: SharedFormProps & {
  onSubmit: (data: PersonalLicenseFormData, receiptImage: File | null) => Promise<void>
  initialData?: PdpInput
}) {
  const form = useForm<PdpInput>({
    resolver: zodResolver(pdpSchema),
    defaultValues: initialData || {
      medicalExamValid: true,
    },
  })

  const expiryDate = form.watch('expiryDate')
  const daysUntilExpiry = getDaysUntilExpiry(expiryDate)

  const handleSubmit = async (data: PdpInput) => {
    setIsSubmitting(true)
    try {
      await onSubmit({ type: 'PDP', data }, receiptImage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 mt-4">
      <ExpiryWarningAlert daysUntilExpiry={daysUntilExpiry} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">PDP Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pdpNumber">PDP Number <span className="text-destructive">*</span></Label>
              <Input
                id="pdpNumber"
                placeholder="PDP permit number"
                {...form.register('pdpNumber')}
                className="h-12"
              />
              {form.formState.errors.pdpNumber && (
                <p className="text-sm text-destructive">{form.formState.errors.pdpNumber.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pdpCategory">PDP Category <span className="text-destructive">*</span></Label>
              <Select
                value={form.watch('pdpCategory')}
                onValueChange={(v) => form.setValue('pdpCategory', v)}
              >
                <SelectTrigger id="pdpCategory" className="h-12">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {PDP_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.pdpCategory && (
                <p className="text-sm text-destructive">{form.formState.errors.pdpCategory.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DatePickerField
              label="Issue Date"
              value={form.watch('issueDate')}
              onChange={(date) => form.setValue('issueDate', date as Date)}
              error={form.formState.errors.issueDate?.message}
              required
              id="issueDate"
            />

            <DatePickerField
              label="Expiry Date"
              value={form.watch('expiryDate')}
              onChange={(date) => form.setValue('expiryDate', date as Date)}
              error={form.formState.errors.expiryDate?.message}
              required
              id="expiryDate"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Renewal & Medical</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="renewalFeeZar">Renewal Fee (ZAR) <span className="text-destructive">*</span></Label>
            <Input
              id="renewalFeeZar"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...form.register('renewalFeeZar')}
              className="h-12"
            />
            {form.formState.errors.renewalFeeZar && (
              <p className="text-sm text-destructive">{form.formState.errors.renewalFeeZar.message}</p>
            )}
          </div>

          <DatePickerField
            label="Medical Exam Date"
            value={form.watch('medicalExamDate')}
            onChange={(date) => form.setValue('medicalExamDate', date)}
            id="medicalExamDate"
          />

          <div className="space-y-2">
            <Label htmlFor="trainingProvider">Training Provider</Label>
            <Input
              id="trainingProvider"
              placeholder="e.g., SA Driving Academy"
              {...form.register('trainingProvider')}
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes..."
              {...form.register('notes')}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {mode === 'create' && (
        <ReceiptImageCapture
          previewUrl={previewUrl}
          imageError={imageError}
          isCompressing={isCompressing}
          compressionInfo={compressionInfo}
          onImageCapture={onImageCapture}
          onClearImage={onClearImage}
        />
      )}

      <Button type="submit" className="w-full h-12" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Update PDP' : 'Save PDP'}
      </Button>

      {/* Receipt Images Manager for Edit Mode */}
      {mode === 'edit' && entryId && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-5 w-5 text-chart-1" />
              Receipt Images
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Attach or manage receipt images for this expense.
            </p>
          </CardHeader>
          <CardContent>
            {onImageUpload && onImageDelete && onImageReupload && onImageLock ? (
              <EntryImageManager
                entryId={entryId}
                entryType="EXPENSE"
                images={existingImages || []}
                onUpload={onImageUpload}
                onDelete={onImageDelete}
                onReupload={onImageReupload}
                onLock={onImageLock}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Image management not available</p>
            )}
          </CardContent>
        </Card>
      )}
    </form>
  )
}
