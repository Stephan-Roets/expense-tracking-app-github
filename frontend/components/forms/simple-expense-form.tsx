'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Camera, AlertCircle, CheckCircle2, CalendarIcon, Receipt, Lock } from 'lucide-react'
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
import { ExpenseCategory, FuelType, formatZAR } from '@/lib/types/database'
import {
  processReceiptImage,
  validateImageFile,
  formatFileSize
} from '@/lib/utils/image-converter'
import { ImageCropModal } from '@/components/ui/image-crop-modal'
import { VehicleLogo } from '@/components/vehicles/vehicle-logo'
import { useAuth } from '@/lib/contexts/auth-context'
import { usePermissions } from '@/hooks/usePermissions'

const simpleExpenseSchema = z.object({
  vehicleId: z.string().min(1, 'Select a vehicle'),
  date: z.date({ required_error: 'Select a date' }),
  amount: z.coerce.number().positive('Enter amount'),
  supplierName: z.string().optional(),
  description: z.string().optional(),
})

type SimpleExpenseInput = z.infer<typeof simpleExpenseSchema>

interface Vehicle {
  id: string
  registrationNumber: string
  make: string
  model: string
  fuelType: FuelType
  currentOdometer: number
}

interface SimpleExpenseFormProps {
  vehicles: Vehicle[]
  category: ExpenseCategory
  categoryLabel: string
  categoryIcon?: React.ReactNode
  onSubmit: (data: SimpleExpenseInput, receiptImage: File) => Promise<void>
  showVehicle?: boolean
}

const categoryDescriptions: Record<string, string> = {
  INSURANCE_PREMIUM: 'Vehicle insurance premium payment',
  VEHICLE_TRACKING: 'Vehicle tracking subscription payment',
  ETOLL_SANRAL: 'E-toll account payment',
  LICENSE_RENEWAL: 'Vehicle license disc renewal',
  ROADWORTHY: 'Roadworthy certificate testing',
  OTHER_FIXED: 'Other fixed vehicle expense',
  PERSONAL_LICENSE: 'Personal driver license renewal',
}

const categoryPlaceholders: Record<string, { supplier: string; description: string }> = {
  INSURANCE_PREMIUM: { supplier: 'e.g., OUTsurance, Discovery', description: 'e.g., Monthly premium, Annual renewal' },
  VEHICLE_TRACKING: { supplier: 'e.g., Tracker, Cartrack', description: 'e.g., Monthly subscription' },
  ETOLL_SANRAL: { supplier: 'SANRAL', description: 'e.g., Monthly e-toll payment' },
  LICENSE_RENEWAL: { supplier: 'e.g., Post Office, Online', description: 'e.g., Vehicle license renewal' },
  ROADWORTHY: { supplier: 'e.g., Testing Station Name', description: 'e.g., Roadworthy certificate test' },
  OTHER_FIXED: { supplier: 'e.g., Service Provider', description: 'e.g., Parking, Tolls, Other' },
  PERSONAL_LICENSE: { supplier: 'e.g., DLTC', description: 'e.g., Driver license renewal' },
}

export function SimpleExpenseForm({
  vehicles,
  category,
  categoryLabel,
  categoryIcon,
  onSubmit,
  showVehicle = true,
}: SimpleExpenseFormProps) {
  const { user } = useAuth()
  const { data: permissions, isLoading: isLoadingPermissions } = usePermissions(user?.organizationId || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [receiptImage, setReceiptImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [isCompressing, setIsCompressing] = useState(false)
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: number
    compressedSize: number
  } | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null)
  const [dateInput, setDateInput] = useState("")

  // Check if user has permission to add expenses for this category
  const categoryPermissionKey = category as string
  const canAddExpense = permissions?.["EXPENSE_CATEGORY"]?.[categoryPermissionKey] ||
                       user?.role === "SUPER_ADMIN" ||
                       user?.role === "ADMIN" ||
                       user?.role === "MANAGER" ||
                       (user?.role === "ASSISTANT" && user?.assistantRole === "ASSISTANT_HIGH") ||
                       (user?.role === "ASSISTANT" && user?.assistantRole === "ASSISTANT_LOW" && 
                        ["FUEL_LOG", "MAINTENANCE_TOPUP", "CAR_WASH", "PARKING"].includes(categoryPermissionKey))

  // Show loading state while checking permissions
  if (isLoadingPermissions) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading permissions...</div>
      </div>
    )
  }

  // Show locked message if user doesn't have permission
  if (!canAddExpense) {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
        <CardContent className="flex items-center gap-4 p-6">
          <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-100">
              Permission Required
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              You don't have permission to add {categoryLabel.toLowerCase()} expenses. Please contact your organization administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SimpleExpenseInput>({
    resolver: zodResolver(simpleExpenseSchema),
    defaultValues: {
      vehicleId: vehicles[0]?.id || '',
      date: new Date(),
      supplierName: '',
      description: '',
    },
  })

  const selectedVehicleId = watch('vehicleId')
  const date = watch('date')
  const amount = watch('amount')
  const placeholders = categoryPlaceholders[category] || { supplier: 'Supplier name', description: 'Description' }

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
      console.error('Image compression error:', error)
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
    setImageError(null)
  }

  const handleFormSubmit = async (data: SimpleExpenseInput) => {
    if (!receiptImage) {
      alert('Please capture a receipt image before saving')
      return
    }
    setIsSubmitting(true)
    try {
      await onSubmit(data, receiptImage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Expense Details Card */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {categoryIcon || <Receipt className="h-5 w-5 text-chart-1" />}
            {categoryLabel}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Vehicle (if applicable) */}
          {showVehicle && (
            <div className="space-y-2">
              <Label htmlFor="vehicleId">Vehicle <span className="text-destructive">*</span></Label>
              <Select value={selectedVehicleId} onValueChange={(v) => setValue('vehicleId', v)} name="vehicleId">
                <SelectTrigger id="vehicleId" className="h-12">
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      <div className="flex items-center gap-2">
                        <VehicleLogo make={v.make} size="sm"  />
                        <span>{v.registrationNumber} - {v.make} {v.model}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.vehicleId && <p className="text-sm text-destructive">{errors.vehicleId.message}</p>}
            </div>
          )}

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date <span className="text-destructive">*</span></Label>
            <Input
              id="date"
              name="date"
              type="text"
              inputMode="numeric"
              pattern="\d{4}-\d{2}-\d{2}"
              placeholder="YYYY-MM-DD"
              value={dateInput || (date ? format(date, "yyyy-MM-dd") : "")}
              onChange={(e) => {
                let value = e.target.value;
                value = value.replace(/[^\d-]/g, '');
                const digits = value.replace(/\D/g, '');
                if (digits.length > 0) {
                  let formatted = digits.slice(0, 4);
                  if (digits.length > 4) {
                    formatted += '-' + digits.slice(4, 6);
                  }
                  if (digits.length > 6) {
                    formatted += '-' + digits.slice(6, 8);
                  }
                  value = formatted;
                }
                setDateInput(value);
                if (value && value.length >= 4) {
                  const year = parseInt(value.slice(0, 4));
                  if (year < 1900 || year > 2099) {
                    return;
                  }
                }
                if (value.length === 10) {
                  const year = parseInt(value.slice(0, 4));
                  const month = parseInt(value.slice(5, 7));
                  const day = parseInt(value.slice(8, 10));
                  
                  // Validate month
                  if (month < 1 || month > 12) {
                    return;
                  }
                  
                  // Validate day based on month
                  const daysInMonth = new Date(year, month, 0).getDate();
                  if (day < 1 || day > daysInMonth) {
                    return;
                  }
                  
                  setValue('date', new Date(value));
                }
              }}
              maxLength={10}
              className="h-12"
            />
            {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (R) <span className="text-destructive">*</span></Label>
            <Input
              id="amount"
              {...register('amount')}
              type="number"
              step="0.01"
              placeholder="0.00"
              className="h-12 text-lg font-semibold"
            />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>

          {/* Total Display */}
          {amount > 0 && (
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="text-2xl font-bold">{formatZAR(amount)}</span>
              </div>
            </div>
          )}

          {/* Supplier Name */}
          <div className="space-y-2">
            <Label htmlFor="supplierName">Supplier / Provider</Label>
            <Input
              id="supplierName"
              {...register('supplierName')}
              placeholder={placeholders.supplier}
              className="h-12"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder={placeholders.description}
              className="min-h-20"
            />
          </div>
        </CardContent>
      </Card>

      {/* Receipt Image Card */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-5 w-5 text-chart-4" />
            Capture Receipt
            <span className="text-destructive text-sm font-normal">(Required)</span>
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
                  onClick={clearImage}
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
            <label htmlFor="receiptImage" className={`
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
              <label htmlFor="receiptImage" className="sr-only">
                Upload Receipt Image
              </label>
              <input
                id="receiptImage"
                name="receiptImage"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageCapture}
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

      {/* Submit Button */}
      <Button
        type="submit"
        size="lg"
        className="w-full h-14 text-lg"
        disabled={isSubmitting || !receiptImage}
      >
        {isSubmitting ? 'Saving...' : `Save ${categoryLabel}`}
      </Button>

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
    </form>
  )
}
