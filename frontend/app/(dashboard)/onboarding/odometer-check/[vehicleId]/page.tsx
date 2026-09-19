"use client"

import React, { useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Camera, CheckCircle2, Shield } from "lucide-react"
import { apiFormFetch } from "@/lib/api/client"
import { ImageCropModal } from "@/components/ui/image-crop-modal"
import { processReceiptImage, validateImageFile } from "@/lib/utils/image-converter"

export default function OdometerCheckPage() {
  const router = useRouter()
  const params = useParams()
  const vehicleId = params.vehicleId as string

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [odometerValue, setOdometerValue] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateImageFile(file)
    if (!validation.valid) {
      setError(validation.error || "Invalid image file")
      return
    }

    // Store original file and show crop modal
    setOriginalImageFile(file)
    setShowCropModal(true)
  }

  const handleCropConfirm = async (croppedFile: File, originalFile: File) => {
    setShowCropModal(false)
    setError(null)

    try {
      const result = await processReceiptImage(croppedFile)
      const compressedFile = new File(
        [result.blob],
        croppedFile.name.replace(/\.[^.]+$/, '.avif'),
        { type: result.format }
      )

      setPhoto(compressedFile)
      const reader = new FileReader()
      reader.onloadend = () => setPhotoPreview(reader.result as string)
      reader.readAsDataURL(result.blob)
    } catch (err) {
      setError(`Failed to process image: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleCropCancel = () => {
    setShowCropModal(false)
    setOriginalImageFile(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    console.log("[Odometer Submit] ===== STARTING SUBMISSION =====")

    if (!odometerValue || parseInt(odometerValue) < 0) {
      setError("Please enter a valid odometer reading")
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      const currentTaxYear = new Date().getFullYear()
      console.log("[Odometer Submit] Tax year:", currentTaxYear, "Vehicle:", vehicleId)

      const formData = new FormData()
      formData.append("vehicleId", vehicleId)
      formData.append("readingType", "OPENING")
      formData.append("odometerValue", odometerValue)
      formData.append("taxYear", String(currentTaxYear))
      if (photo) formData.append("photo", photo)

      console.log("[Odometer Submit] Calling apiFormFetch...")
      const response = await apiFormFetch("/compliance/odometer", formData)
      console.log("[Odometer Submit] Response received:", response.status, response.ok)

      // If we get here, response is OK (apiFormFetch throws on error)
      const data = await response.json()
      console.log("[Odometer Submit] Success data:", data)

      console.log("[Odometer Submit] ===== SUCCESS - Redirecting to dashboard =====")
      // Force full page reload with cache-busting to get fresh vehicle data
      window.location.href = `/dashboard?t=${Date.now()}`
    } catch (err) {
      console.error("[Odometer Submit] ===== ERROR CAUGHT =====", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsLoading(false)
      console.log("[Odometer Submit] ===== END =====")
    }
  }

  const handleSkip = () => {
    // Allow skip during dev — in production this should be blocked
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 pb-24">
      {/* SARS Badge */}
      <Badge variant="outline" className="mb-6 gap-2 px-4 py-2 text-sm border-green-600 text-green-700">
        <span suppressHydrationWarning>
          <Shield className="h-4 w-4" />
        </span>
        SARS Compliance Required
      </Badge>

      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Opening Odometer Reading</CardTitle>
          <CardDescription className="text-sm leading-relaxed mt-2">
            South African Tax Law (SARS) requires a timestamped photo of your
            odometer at the <strong>start of each tax year</strong> (1 March) to
            claim vehicle expenses as a tax deduction.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive" className="border-red-500 bg-red-50">
                <span suppressHydrationWarning>
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </span>
                <AlertDescription className="text-red-800 font-medium">
                  Error: {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Odometer Reading */}
            <div className="space-y-2">
              <Label htmlFor="odometer">
                Current Odometer Reading (km) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="odometer"
                name="odometer"
                type="number"
                min={0}
                placeholder="e.g. 45230"
                value={odometerValue}
                onChange={e => setOdometerValue(e.target.value)}
                className="h-12 text-lg"
                required
              />
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label htmlFor="photo">
                Odometer Photo{" "}
                <span className="text-muted-foreground text-xs">(recommended for SARS audit)</span>
              </Label>

              {photoPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photoPreview}
                    alt="Odometer"
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-green-600 gap-1">
                      <span suppressHydrationWarning>
                        <CheckCircle2 className="h-3 w-3" />
                      </span>
                      Photo added
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="absolute bottom-2 right-2"
                    onClick={() => { setPhoto(null); setPhotoPreview(null) }}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-36 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span suppressHydrationWarning>
                    <Camera className="h-8 w-8" />
                  </span>
                  <span className="text-sm font-medium">Tap to take / upload photo</span>
                  <span className="text-xs">JPG, PNG or HEIC accepted</span>
                </button>
              )}

              <label htmlFor="photo" className="sr-only">
                Capture Odometer Photo
              </label>
              <input
                ref={fileInputRef}
                id="photo"
                name="photo"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={isLoading || !odometerValue}
            >
              {isLoading ? "Saving…" : "✓ Submit & Go to Dashboard"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground text-sm"
              onClick={handleSkip}
            >
              Skip for now (photo required later for SARS compliance)
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground text-center max-w-sm">
        Your photo is stored securely. SARS logbook compliance requires this
        photo to verify your opening odometer at the start of each tax year.
      </p>

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
