'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Sparkles, Camera, AlertCircle, CheckCircle2, MapPin, CalendarIcon } from 'lucide-react'
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
import { 
  CarWashType, 
  CAR_WASH_TYPE_LABELS, 
  FuelType,
  formatZAR 
} from '@/lib/types/database'
import { 
  processReceiptImage, 
  validateImageFile, 
  formatFileSize 
} from '@/lib/utils/image-converter'
import { ReceiptSupportProps } from './form-types'
import { EntryImageManager } from '@/components/entries/entry-image-manager'
import { API_URL } from '@/lib/api/client'
import { ImageCropModal } from '@/components/ui/image-crop-modal'

const carWashSchema = z.object({
  vehicleId: z.string().optional(),
  date: z.date({ required_error: 'Select a date' }),
  washType: z.nativeEnum(CarWashType),
  costZar: z.coerce.number().positive('Enter cost'),
  location: z.string().optional(),
  notes: z.string().optional(),
})

type CarWashInput = z.infer<typeof carWashSchema>

interface Vehicle {
  id: string
  registrationNumber: string
  make: string
  model: string
  fuelType: FuelType
  currentOdometer: number
}

interface CarWashFormProps extends ReceiptSupportProps {
  vehicles: Vehicle[]
  onSubmit: (data: CarWashInput, receiptImage: File | null) => Promise<void>
  initialData?: Partial<CarWashInput>
}

export function CarWashForm({ vehicles, onSubmit, initialData, mode, existingImages = [], entryId, onImageUpload, onImageDelete, onImageReupload, onImageLock }: CarWashFormProps) {
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

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CarWashInput>({
    resolver: zodResolver(carWashSchema),
    defaultValues: initialData || {
      vehicleId: vehicles[0]?.id || '',
      date: new Date(),
      washType: CarWashType.WASH_AND_GO,
    },
  })

  // Initialize date input from watched value when in edit mode
  useEffect(() => {
    if (mode === 'edit' && watch('date')) {
      setDateInput(format(watch('date'), 'yyyy-MM-dd'))
    }
  }, [mode, watch('date')])

  // Set preview from existing images when in edit mode
  useEffect(() => {
    console.log('CarWashForm - useEffect triggered:', { mode, existingImagesLength: existingImages.length });
    if (mode === 'edit' && existingImages.length > 0) {
      const firstImage = existingImages[0]
      console.log('CarWashForm - Setting previewUrl from:', firstImage);
      setPreviewUrl(firstImage.imageUrl)
    }
  }, [mode, existingImages])

  const selectedVehicleId = watch('vehicleId')
  const costZar = watch('costZar')

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
      setImageError('Failed to process image. Please try again.')
      console.error('Image compression error:', error)
    } finally {
      setIsCompressing(false)
    }
  }

  const handleCropCancel = () => {
    setShowCropModal(false)
    setOriginalImageFile(null)
  }

  const handleFormSubmit = async (data: CarWashInput) => {
    if (mode === 'create' && !receiptImage) {
      setImageError('Receipt image is required')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(data, mode === 'create' ? receiptImage : null)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Car Wash Details */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-sky-500" />
            Wash & Valet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Vehicle */}
          {mode === 'create' ? (
            <div className="space-y-2">
              <Label htmlFor="vehicleId">Vehicle</Label>
              <Select
                value={selectedVehicleId}
                onValueChange={(value) => setValue('vehicleId', value)}
                name="vehicleId"
              >
                <SelectTrigger id="vehicleId" className="h-12 touch-target">
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.registrationNumber} - {vehicle.make} {vehicle.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.vehicleId && (
                <p className="text-sm text-destructive">{errors.vehicleId.message}</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium">Vehicle</p>
              <div className="h-12 px-3 flex items-center rounded-md border border-input bg-muted text-sm">
                {initialData?.vehicleId ? (() => {
                  const vehicle = vehicles.find(v => v.id === initialData.vehicleId);
                  return vehicle ? `${vehicle.registrationNumber} - ${vehicle.make} ${vehicle.model}` : 'Unknown';
                })() : 'Unknown'}
              </div>
            </div>
          )}

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="text"
              inputMode="numeric"
              pattern="\d{4}-\d{2}-\d{2}"
              placeholder="YYYY-MM-DD"
              value={dateInput || (watch('date') ? format(watch('date'), 'yyyy-MM-dd') : '')}
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
              className="h-12 touch-target"
            />
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date.message}</p>
            )}
          </div>

          {/* Wash Type - Large touch targets */}
          <div className="space-y-2">
            <Label htmlFor="washType">Wash Type</Label>
            <Select
              value={watch('washType')}
              onValueChange={(value) => setValue('washType', value as CarWashType)}
              name="washType"
            >
              <SelectTrigger id="washType" className="h-12 touch-target">
                <SelectValue placeholder="Select wash type" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(CarWashType).map((type) => (
                  <SelectItem key={type} value={type} className="py-3">
                    {CAR_WASH_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cost */}
          <div className="space-y-2">
            <Label htmlFor="costZar">Cost (R)</Label>
            <Input
              id="costZar"
              {...register('costZar')}
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="150.00"
              className="h-12 touch-target text-lg font-semibold"
            />
            {errors.costZar && (
              <p className="text-sm text-destructive">{errors.costZar.message}</p>
            )}
          </div>

          {/* Total Display */}
          {costZar > 0 && (
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="text-2xl font-bold">{formatZAR(costZar)}</span>
              </div>
            </div>
          )}

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location (Optional)
            </Label>
            <Input
              id="location"
              {...register('location')}
              placeholder="e.g., Engen N1 City"
              className="h-12 touch-target"
            />
          </div>
        </CardContent>
      </Card>

      {mode === 'create' && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-5 w-5 text-sky-500" />
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
                    onClick={() => {
                      setReceiptImage(null)
                      setPreviewUrl(null)
                      setCompressionInfo(null)
                    }}
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
                ${imageError ? 'border-destructive bg-destructive/5' : 'border-sky-500 hover:border-sky-500/80 hover:bg-sky-500/5'}
              `}>
                {isCompressing ? (
                  <>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500 mb-2" />
                    <span className="text-sm text-muted-foreground">Compressing image...</span>
                  </>
                ) : (
                  <>
                    <Camera className="h-10 w-10 text-sky-500 mb-2" />
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
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        size="lg"
        className="w-full h-14 text-lg touch-target-lg"
        disabled={isSubmitting || (mode === 'create' && !receiptImage)}
      >
        {isSubmitting ? 'Saving...' : 'Save Wash & Valet'}
      </Button>

      {/* Receipt Images Manager for Edit Mode */}
      {mode === 'edit' && entryId && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-chart-4" />
            <h3 className="text-base font-semibold">Receipt Images</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Attach or manage receipt images for this expense.
          </p>
          {onImageUpload && onImageDelete && onImageReupload && onImageLock ? (
            <EntryImageManager
              entryId={entryId}
              entryType="EXPENSE"
              images={existingImages}
              onUpload={onImageUpload}
              onDelete={onImageDelete}
              onReupload={onImageReupload}
              onLock={onImageLock}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Image management not available</p>
          )}
        </div>
      )}
    </form>

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
