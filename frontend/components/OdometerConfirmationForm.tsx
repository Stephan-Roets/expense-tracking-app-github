'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { CheckCircle2, AlertCircle, Camera, Gauge, Edit2 } from 'lucide-react'
import { ImageCropModal } from '@/components/ui/image-crop-modal'
import { createOdometerConfirmation, getOdometerConfirmation, updateOdometerConfirmation, uploadOdometerConfirmationImage } from '@/lib/api/client'

const odometerSchema = z.object({
  reading: z.number().min(0, 'Odometer reading must be positive'),
})

type OdometerInput = z.infer<typeof odometerSchema>

interface OdometerConfirmationFormProps {
  assignmentId: string | null
  vehicleName?: string
  onComplete?: () => void
  onOdometerUpdate?: (newReading: number) => void
}

export function OdometerConfirmationForm({ assignmentId, vehicleName, onComplete, onOdometerUpdate }: OdometerConfirmationFormProps) {
  const [confirmation, setConfirmation] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  
  // Image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<OdometerInput>({
    resolver: zodResolver(odometerSchema),
  })

  useEffect(() => {
    if (assignmentId) {
      loadConfirmation()
    }
  }, [assignmentId])

  const loadConfirmation = async () => {
    if (!assignmentId) return
    setIsLoading(true)
    try {
      const response = await getOdometerConfirmation(assignmentId)
      setConfirmation(response.data)
      if (response.data) {
        reset({ reading: response.data.odometerReading })
      }
    } catch (error: any) {
      // Silently ignore all errors - confirmation may not exist yet
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: OdometerInput) => {
    if (!assignmentId) {
      setSubmitError('Cannot create odometer confirmation: Vehicle is not assigned to a driver')
      return
    }
    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)

    try {
      let response
      if (confirmation && isEditing) {
        // Update existing confirmation
        response = await updateOdometerConfirmation(confirmation.id, {
          odometerReading: data.reading,
        })
        setConfirmation(response.data)
      } else {
        // Create new confirmation
        response = await createOdometerConfirmation({
          assignmentId,
          reading: data.reading,
        })
        setConfirmation(response.data)
      }
      
      setSubmitSuccess(true)
      setIsEditing(false)
      
      // Notify parent component of odometer update
      if (onOdometerUpdate && response.data) {
        onOdometerUpdate(response.data.odometerReading)
      }
      
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to save odometer confirmation:', error)
      setSubmitError(error instanceof Error ? error.message : 'Failed to save odometer reading')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    if (confirmation) {
      reset({ reading: confirmation.odometerReading || confirmation.reading })
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    if (confirmation) {
      reset({ reading: confirmation.odometerReading || confirmation.reading })
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file)
      setShowCropModal(true)
    }
  }

  const handleCropConfirm = async (croppedFile: File) => {
    if (!confirmation) return

    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', croppedFile)
      
      await uploadOdometerConfirmationImage(confirmation.id, formData)
      
      // Reload confirmation to get updated image
      await loadConfirmation()
      
      setShowCropModal(false)
      setSelectedImage(null)
      
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to upload odometer image:', error)
      setSubmitError('Failed to upload odometer image')
    } finally {
      setIsUploadingImage(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading odometer confirmation...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            Odometer Confirmation
          </CardTitle>
          <CardDescription>
            {vehicleName ? `Confirm the odometer reading for ${vehicleName}` : 'Confirm the current odometer reading'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Success/Error Messages */}
          {submitSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Saved successfully!</span>
            </div>
          )}

          {submitError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">{submitError}</span>
            </div>
          )}

          {/* Odometer Reading Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="reading">Current Odometer Reading (km) *</Label>
                {confirmation && !isEditing && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleEdit}
                    className="h-8 text-xs"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
              <Input
                {...register('reading', { valueAsNumber: true })}
                id="reading"
                type="number"
                placeholder="e.g., 50000"
                className="h-12 text-lg font-semibold"
                disabled={!!confirmation && !isEditing}
              />
              {errors.reading && (
                <p className="text-sm text-destructive">{errors.reading.message}</p>
              )}
            </div>

            {!confirmation && (
              <Button
                type="submit"
                className="w-full h-12"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Odometer Reading'}
              </Button>
            )}

            {isEditing && confirmation && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-12"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Updating...' : 'Update Reading'}
                </Button>
              </div>
            )}
          </form>

          {/* Odometer Photo */}
          {confirmation && (
            <div className="space-y-4">
              <span className="text-sm font-medium">Odometer Photo (Proof of Reading)</span>
              <div className="relative">
                <label htmlFor="odometer-photo-upload" className="h-48 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/30 cursor-pointer">
                  <span className="sr-only">Upload odometer photo</span>
                  {confirmation.confirmationImageUrl ? (
                    <img 
                      src={confirmation.confirmationImageUrl.startsWith('http') 
                        ? confirmation.confirmationImageUrl 
                        : `${process.env.NEXT_PUBLIC_API_URL || 'https://fleet-expense-app.duckdns.org/api/v1'}${confirmation.confirmationImageUrl}`}
                      alt="Odometer reading"
                      className="h-full w-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-center">
                      <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Upload odometer photo</p>
                    </div>
                  )}
                  <input
                    id="odometer-photo-upload"
                    name="odometer-photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                    disabled={isUploadingImage}
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Take a clear photo of the odometer showing the current reading
              </p>
            </div>
          )}

          {/* Confirmation Details */}
          {confirmation && (
            <div className="p-4 bg-muted/30 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Reading:</span>
                <span className="font-semibold">{confirmation.odometerReading?.toLocaleString() || confirmation.reading?.toLocaleString() || 'N/A'} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Recorded:</span>
                <span className="text-sm">{new Date(confirmation.createdAt).toLocaleString()}</span>
              </div>
              {confirmation.confirmationImageUrl && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Photo:</span>
                  <span className="text-sm text-green-600">Uploaded</span>
                </div>
              )}
            </div>
          )}

          {/* Complete Button */}
          {confirmation && confirmation.confirmationImageUrl && onComplete && (
            <Button
              onClick={onComplete}
              className="w-full h-12"
              variant="default"
            >
              Complete Confirmation
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Image Crop Modal */}
      {selectedImage && (
        <ImageCropModal
          imageFile={selectedImage}
          mode="receipt"
          onConfirm={handleCropConfirm}
          onCancel={() => {
            setShowCropModal(false)
            setSelectedImage(null)
          }}
          isOpen={showCropModal}
        />
      )}
    </>
  )
}
