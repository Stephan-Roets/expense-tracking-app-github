'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { 
  Camera, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw,
  Upload,
  Gauge
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { OdometerReadingType, getTaxYearReadingWindow } from '@/lib/types/database'
import { API_URL } from '@/lib/api/client'
import { ImageCropModal } from '@/components/ui/image-crop-modal'

interface OdometerCaptureFormProps {
  vehicleId: string
  vehicleReg: string
  readingType: OdometerReadingType
  lastKnownOdometer?: number
}

interface GpsPosition {
  latitude: number
  longitude: number
  accuracy: number
}

/**
 * Odometer Capture Form
 * 
 * "Monkey-simple" workflow:
 * 1. User clicks camera button
 * 2. Camera opens, user takes photo of dashboard
 * 3. Photo is compressed to AVIF
 * 4. GPS coordinates captured
 * 5. User enters odometer reading manually (for verification)
 * 6. Submit to backend
 */
export function OdometerCaptureForm({
  vehicleId,
  vehicleReg,
  readingType,
  lastKnownOdometer = 0
}: OdometerCaptureFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [step, setStep] = useState<'capture' | 'confirm' | 'success'>('capture')
  const [imageData, setImageData] = useState<string | null>(null)
  const [odometerValue, setOdometerValue] = useState('')
  const [gpsPosition, setGpsPosition] = useState<GpsPosition | null>(null)
  const [capturedAt, setCapturedAt] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null)

  const { currentTaxYear } = getTaxYearReadingWindow()

  // Get GPS position
  const getGpsPosition = useCallback((): Promise<GpsPosition | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setGpsError('Geolocation not supported')
        resolve(null)
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          }
          setGpsPosition(pos)
          setGpsError(null)
          resolve(pos)
        },
        (error) => {
          console.warn('GPS error:', error?.message || error)
          setGpsError('Could not get location. Photo will still be accepted.')
          resolve(null)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )
    })
  }, [])

  // Compress image to AVIF (with WebP fallback)
  const compressImage = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = async () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not get canvas context'))
          return
        }

        // Resize if needed (max 1920px width)
        const maxWidth = 1920
        const scale = img.width > maxWidth ? maxWidth / img.width : 1
        canvas.width = img.width * scale
        canvas.height = img.height * scale

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        // Try AVIF first, fall back to WebP
        let dataUrl: string
        try {
          dataUrl = canvas.toDataURL('image/avif', 0.8)
          // Check if AVIF is actually supported (some browsers return PNG)
          if (dataUrl.startsWith('data:image/png')) {
            dataUrl = canvas.toDataURL('image/webp', 0.8)
          }
        } catch {
          dataUrl = canvas.toDataURL('image/webp', 0.8)
        }

        resolve(dataUrl)
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = URL.createObjectURL(file)
    })
  }, [])

  // Handle camera capture
  const handleCapture = useCallback(async () => {
    setIsCapturing(true)
    setError(null)

    // Capture timestamp immediately
    const timestamp = new Date().toISOString()
    setCapturedAt(timestamp)

    // Get GPS in parallel
    getGpsPosition()

    // Trigger file input for camera
    fileInputRef.current?.click()
    setIsCapturing(false)
  }, [getGpsPosition])

  // Handle file selection (from camera)
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Store original file and show crop modal
    setOriginalImageFile(file)
    setShowCropModal(true)
  }, [])

  const handleCropConfirm = async (croppedFile: File, originalFile: File) => {
    setShowCropModal(false)
    setIsCapturing(true)
    setError(null)

    try {
      // Compress image
      const compressed = await compressImage(croppedFile)
      setImageData(compressed)
      setStep('confirm')
    } catch (err) {
      console.error('Image processing error:', err)
      setError('Failed to process image. Please try again.')
    } finally {
      setIsCapturing(false)
    }
  }

  const handleCropCancel = () => {
    setShowCropModal(false)
    setOriginalImageFile(null)
  }

  // Handle retake
  const handleRetake = useCallback(() => {
    setImageData(null)
    setOdometerValue('')
    setStep('capture')
    setError(null)
  }, [])

  // Handle submit
  const handleSubmit = useCallback(async () => {
    // Photo is optional (recommended for SARS audit but not required)
    if (!odometerValue) {
      setError('Please enter the odometer reading')
      return
    }

    const odometerNum = parseInt(odometerValue.replace(/\D/g, ''), 10)
    if (isNaN(odometerNum) || odometerNum < 0) {
      setError('Please enter a valid odometer reading')
      return
    }

    if (odometerNum < lastKnownOdometer) {
      setError(`Odometer reading cannot be less than the last known value (${lastKnownOdometer.toLocaleString()} km)`)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('vehicleId', vehicleId)
      formData.append('readingType', readingType)
      formData.append('odometerValue', String(odometerNum))
      formData.append('taxYear', String(currentTaxYear))

      // Add GPS coordinates if available
      if (gpsPosition) {
        formData.append('gpsLatitude', String(gpsPosition.latitude))
        formData.append('gpsLongitude', String(gpsPosition.longitude))
        formData.append('gpsAccuracy', String(gpsPosition.accuracy))
      }

      if (imageData) {
        const blob = await fetch(imageData).then((r) => r.blob())
        formData.append('photo', blob, 'odometer.jpg')
      }

      const headers: HeadersInit = {}
      const token = typeof window !== 'undefined' ? localStorage.getItem('jwt_token') : null
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch(`${API_URL}/compliance/odometer`, {
        method: 'POST',
        headers,
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error((data as { message?: string }).message || 'Failed to submit verification')
      }

      setStep('success')
    } catch (err) {
      console.error('Submit error:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }, [imageData, odometerValue, vehicleId, currentTaxYear, readingType, capturedAt, gpsPosition, lastKnownOdometer])

  // Success state
  if (step === 'success') {
    return (
      <Card className="border-green-500/50 bg-green-500/5">
        <CardContent className="p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-green-600 mb-2">
            Verification Submitted!
          </h2>
          <p className="text-muted-foreground mb-6">
            Your {readingType.toLowerCase()} odometer reading for {vehicleReg} has been recorded
            for tax year {currentTaxYear}/{currentTaxYear + 1}.
          </p>
          <Button onClick={() => router.back()}>
            Return to Dashboard
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={readingType === OdometerReadingType.OPENING ? 'default' : 'secondary'}>
            {readingType} Reading
          </Badge>
          <Badge variant="outline">
            Tax Year {currentTaxYear}/{currentTaxYear + 1}
          </Badge>
        </div>
        <h1 className="text-2xl font-bold">Snap Dashboard</h1>
        <p className="text-muted-foreground">
          Capture your odometer reading for {vehicleReg}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step 1: Capture */}
      {step === 'capture' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Step 1: Take Photo
            </CardTitle>
            <CardDescription>
              Position your phone to clearly show the odometer reading on your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Hidden file input for camera */}
            <label htmlFor="odometerImage" className="sr-only">
              Capture Odometer Photo
            </label>
            <input
              id="odometerImage"
              name="odometerImage"
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Camera button */}
            <Button
              onClick={handleCapture}
              disabled={isCapturing}
              className="w-full h-32 text-lg gap-3"
              size="lg"
            >
              {isCapturing ? (
                <>
                  <Spinner className="h-6 w-6" />
                  Processing...
                </>
              ) : (
                <>
                  <Camera className="h-8 w-8" />
                  Open Camera
                </>
              )}
            </Button>

            {/* GPS Status */}
            <div className={cn(
              'flex items-center gap-2 text-sm p-3 rounded-lg',
              gpsPosition ? 'bg-green-500/10 text-green-600' : 
              gpsError ? 'bg-yellow-500/10 text-yellow-600' : 
              'bg-muted text-muted-foreground'
            )}>
              <MapPin className="h-4 w-4" />
              {gpsPosition ? (
                <span>Location captured ({gpsPosition.accuracy.toFixed(0)}m accuracy)</span>
              ) : gpsError ? (
                <span>{gpsError}</span>
              ) : (
                <span>Location will be captured with photo</span>
              )}
            </div>

            {/* Tips */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <p className="font-medium">Tips for a clear photo:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Turn on the ignition so the dashboard is lit</li>
                <li>Hold the phone steady and parallel to the dashboard</li>
                <li>Ensure the odometer numbers are clearly visible</li>
                <li>Avoid glare from sunlight or reflections</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Confirm */}
      {step === 'confirm' && imageData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Step 2: Confirm Reading
            </CardTitle>
            <CardDescription>
              Review the photo and enter the odometer value
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Image preview */}
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
              <img
                src={imageData}
                alt="Dashboard photo"
                className="w-full h-full object-contain"
              />
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2 gap-1"
                onClick={handleRetake}
              >
                <RotateCcw className="h-4 w-4" />
                Retake
              </Button>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{capturedAt ? new Date(capturedAt).toLocaleString() : 'Now'}</span>
              </div>
              {gpsPosition && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{gpsPosition.latitude.toFixed(4)}, {gpsPosition.longitude.toFixed(4)}</span>
                </div>
              )}
            </div>

            {/* Odometer input */}
            <div className="space-y-2">
              <Label htmlFor="odometer" className="text-base font-medium">
                Enter Odometer Reading (km)
              </Label>
              <Input
                id="odometer"
                type="number"
                inputMode="numeric"
                placeholder="e.g., 45230"
                value={odometerValue}
                onChange={(e) => setOdometerValue(e.target.value)}
                className="h-14 text-2xl font-mono text-center"
              />
              {lastKnownOdometer > 0 && (
                <p className="text-xs text-muted-foreground">
                  Last known reading: {lastKnownOdometer.toLocaleString()} km
                </p>
              )}
            </div>

            {/* Submit button */}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !odometerValue}
              className="w-full h-14 text-lg gap-2"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Spinner className="h-5 w-5" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  Submit Verification
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
      <video ref={videoRef} className="hidden" />

      {/* Image Crop Modal */}
      {originalImageFile && (
        <ImageCropModal
          imageFile={originalImageFile}
          mode="odometer"
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
          isOpen={showCropModal}
        />
      )}
    </div>
  )
}
