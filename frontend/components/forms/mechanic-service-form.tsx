'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { Wrench, Camera, AlertCircle, CheckCircle2, CalendarIcon } from 'lucide-react'
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
import { 
  ServiceType, 
  SERVICE_TYPE_LABELS, 
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

const mechanicServiceSchema = z.object({
  vehicleId: z.string().optional(),
  serviceType: z.nativeEnum(ServiceType),
  date: z.date({ required_error: 'Select a date' }),
  workshopName: z.string().min(1, 'Workshop name is required'),
  odometerReading: z.coerce.number().int().min(0, 'Enter odometer reading'),
  totalCostZar: z.coerce.number().positive('Enter total cost'),
  laborCostZar: z.coerce.number().min(0).optional(),
  partsCostZar: z.coerce.number().min(0).optional(),
  workDescription: z.string().optional(),
  invoiceNumber: z.string().optional(),
  // Windscreen & Glass specific fields
  glassProvider: z.string().optional(),
  excessAmountZar: z.coerce.number().min(0).optional(),
})

type MechanicServiceInput = z.infer<typeof mechanicServiceSchema>

interface Vehicle {
  id: string
  registrationNumber: string
  make: string
  model: string
  fuelType: FuelType
  currentOdometer: number
}

interface MechanicServiceFormProps extends ReceiptSupportProps {
  vehicles: Vehicle[]
  onSubmit: (data: MechanicServiceInput, invoiceImage: File | null) => Promise<void>
  initialData?: Partial<MechanicServiceInput>
}

export function MechanicServiceForm({ vehicles, onSubmit, initialData, mode = 'create', existingImages = [], entryId, onImageUpload, onImageDelete, onImageReupload, onImageLock }: MechanicServiceFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [invoiceImage, setInvoiceImage] = useState<File | null>(null)
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
  } = useForm<MechanicServiceInput>({
    resolver: zodResolver(mechanicServiceSchema),
    defaultValues: initialData || {
      vehicleId: vehicles[0]?.id || '',
      serviceType: ServiceType.MINOR_SERVICE,
      date: new Date(),
      odometerReading: vehicles[0]?.currentOdometer || 0,
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
    console.log('MechanicServiceForm - useEffect triggered:', { mode, existingImagesLength: existingImages.length });
    if (mode === 'edit' && existingImages.length > 0) {
      const firstImage = existingImages[0]
      console.log('MechanicServiceForm - Setting previewUrl from:', firstImage);
      setPreviewUrl(firstImage.imageUrl)
    }
  }, [mode, existingImages])

  const selectedVehicleId = watch('vehicleId')
  const totalCost = watch('totalCostZar')
  const laborCost = watch('laborCostZar')
  const partsCost = watch('partsCostZar')
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId)

  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId)
    if (vehicle) {
      setValue('vehicleId', vehicleId)
      setValue('odometerReading', vehicle.currentOdometer)
    }
  }

  const handleLaborChange = (value: string) => {
    const labor = parseFloat(value) || 0
    setValue('laborCostZar', labor)
    
    // Auto-calculate parts as difference
    if (totalCost && totalCost > 0) {
      const calculatedParts = Math.max(0, Math.min(totalCost - labor, totalCost))
      setValue('partsCostZar', calculatedParts)
    }
  }

  const handlePartsChange = (value: string) => {
    const parts = parseFloat(value) || 0
    setValue('partsCostZar', parts)
    
    // Auto-calculate labor as difference
    if (totalCost && totalCost > 0) {
      const calculatedLabor = Math.max(0, Math.min(totalCost - parts, totalCost))
      setValue('laborCostZar', calculatedLabor)
    }
  }

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageError(null)
    setCompressionInfo(null)

    // Validate file
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
      // Process and compress to AVIF
      const result = await processReceiptImage(croppedFile)
      
      // Create a new File from the blob
      const compressedFile = new File(
        [result.blob], 
        croppedFile.name.replace(/\.[^.]+$/, '.avif'),
        { type: result.format }
      )

      setInvoiceImage(compressedFile)
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

  const handleFormSubmit = async (data: MechanicServiceInput) => {
    if (mode === 'create' && !invoiceImage) {
      setImageError('Invoice image is required')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(data, mode === 'create' ? invoiceImage : null)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Service Details */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-5 w-5 text-chart-3" />
            Mechanic Service
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Vehicle */}
          {mode === 'create' ? (
            <div className="space-y-2">
              <Label htmlFor="vehicleId">Vehicle</Label>
              <Select
                value={selectedVehicleId}
                onValueChange={handleVehicleChange}
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
                {(() => {
                  const vehicle = initialData?.vehicleId ? vehicles.find(v => v.id === initialData.vehicleId) : null;
                  return vehicle ? `${vehicle.registrationNumber} - ${vehicle.make} ${vehicle.model}` : 'Unknown';
                })()}
              </div>
            </div>
          )}

          {/* Service Type */}
          <div className="space-y-2">
            <Label htmlFor="serviceType">Service Type</Label>
            <Select
              value={watch('serviceType')}
              onValueChange={(value) => setValue('serviceType', value as ServiceType)}
              name="serviceType"
            >
              <SelectTrigger id="serviceType" className="h-12 touch-target">
                <SelectValue placeholder="Select service type" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(ServiceType).map((type) => (
                  <SelectItem key={type} value={type}>
                    {SERVICE_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          {/* Workshop Name */}
          <div className="space-y-2">
            <Label htmlFor="workshopName">Workshop Name</Label>
            <Input
              id="workshopName"
              {...register('workshopName')}
              placeholder="e.g., ABC Auto Services"
              className="h-12 touch-target text-lg"
            />
            {errors.workshopName && (
              <p className="text-sm text-destructive">{errors.workshopName.message}</p>
            )}
          </div>

          {/* Odometer */}
          <div className="space-y-2">
            <Label htmlFor="odometerReading">Odometer (km)</Label>
            <Input
              id="odometerReading"
              {...register('odometerReading')}
              type="number"
              inputMode="numeric"
              placeholder={selectedVehicle?.currentOdometer.toString() || '0'}
              className="h-12 touch-target text-lg"
            />
            {errors.odometerReading && (
              <p className="text-sm text-destructive">{errors.odometerReading.message}</p>
            )}
            {selectedVehicle && (
              <p className="text-xs text-muted-foreground">
                Current: {selectedVehicle.currentOdometer.toLocaleString()} km
              </p>
            )}
          </div>

          {/* Total Cost */}
          <div className="space-y-2">
            <Label htmlFor="totalCostZar">Total Cost (R)</Label>
            <Input
              id="totalCostZar"
              {...register('totalCostZar')}
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="2500.00"
              className="h-12 touch-target text-lg font-semibold"
            />
            {errors.totalCostZar && (
              <p className="text-sm text-destructive">{errors.totalCostZar.message}</p>
            )}
          </div>

          {/* Total Display */}
          {totalCost > 0 && (
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="text-2xl font-bold">{formatZAR(totalCost)}</span>
              </div>
            </div>
          )}

          {/* Optional: Cost Breakdown */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="laborCostZar">Labour (R) - Optional</Label>
              <Input
                id="laborCostZar"
                {...register('laborCostZar')}
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0.00"
                className="h-12 touch-target"
                onChange={(e) => handleLaborChange(e.target.value)}
                max={totalCost || undefined}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partsCostZar">Parts (R) - Optional</Label>
              <Input
                id="partsCostZar"
                {...register('partsCostZar')}
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="0.00"
                className="h-12 touch-target"
                onChange={(e) => handlePartsChange(e.target.value)}
                max={totalCost || undefined}
              />
            </div>
          </div>

          {/* Work Description */}
          <div className="space-y-2">
            <Label htmlFor="workDescription">Work Description (Optional)</Label>
            <Textarea
              id="workDescription"
              {...register('workDescription')}
              placeholder="Describe the work performed..."
              className="min-h-[100px] touch-target"
            />
          </div>

          {/* Invoice Number */}
          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">Invoice Number (Optional)</Label>
            <Input
              id="invoiceNumber"
              {...register('invoiceNumber')}
              placeholder="INV-12345"
              className="h-12 touch-target"
            />
          </div>

          {/* Windscreen & Glass specific fields */}
          {watch('serviceType') === ServiceType.WINDSCREEN_GLASS && (
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-sm text-muted-foreground">Windscreen & Glass Details</h4>
              <div className="space-y-2">
                <Label htmlFor="glassProvider">Glass Provider</Label>
                <Input
                  id="glassProvider"
                  {...register('glassProvider')}
                  placeholder="e.g., PG Glass, Autoglass"
                  className="h-12 touch-target"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="excessAmountZar">Insurance Excess (R)</Label>
                <Input
                  id="excessAmountZar"
                  {...register('excessAmountZar')}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  placeholder="0.00"
                  className="h-12 touch-target"
                />
                <p className="text-xs text-muted-foreground">
                  Amount paid as excess if claimed through insurance
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {mode === 'create' && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-5 w-5 text-chart-3" />
              Capture Invoice
              <span className="text-destructive text-sm font-normal">(Required)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {previewUrl ? (
              <div className="space-y-3">
                <div className="relative">
                  <img
                    src={previewUrl}
                    alt="Invoice preview"
                    className="w-full max-h-48 object-contain rounded-lg bg-muted"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setInvoiceImage(null)
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
              <label htmlFor="invoiceImage" className={`
                flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                ${imageError ? 'border-destructive bg-destructive/5' : 'border-chart-3 hover:border-chart-3/80 hover:bg-chart-3/5'}
              `}>
                {isCompressing ? (
                  <>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-chart-3 mb-2" />
                    <span className="text-sm text-muted-foreground">Compressing image...</span>
                  </>
                ) : (
                  <>
                    <Camera className="h-10 w-10 text-chart-3 mb-2" />
                    <span className="text-sm font-medium text-foreground">Tap to capture invoice</span>
                    <span className="text-xs text-muted-foreground mt-1">Photo will be compressed automatically</span>
                  </>
                )}
                <label htmlFor="invoiceImage" className="sr-only">
                  Upload Invoice Image
                </label>
                <input
                  id="invoiceImage"
                  name="invoiceImage"
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
        disabled={isSubmitting || (mode === 'create' && !invoiceImage)}
      >
        {isSubmitting ? 'Saving...' : 'Save Mechanic Service'}
      </Button>

      {/* Receipt Images Manager for Edit Mode */}
      {mode === 'edit' && entryId && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-chart-3" />
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
