'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  AlertTriangle, 
  Camera, 
  X,
  Calendar,
  Car
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getTaxYearReadingWindow, OdometerReadingType } from '@/lib/types/database'
import { api } from '@/lib/api/client'

interface TaxAlertBannerProps {
  vehicleId?: string
  vehicleReg?: string
  className?: string
}

interface VerificationStatus {
  vehicleId: string
  taxYear: number
  hasOpeningReading: boolean
  hasClosingReading: boolean
  isOpeningWindow: boolean
  isClosingWindow: boolean
}

/**
 * Tax Alert Banner
 * 
 * High-priority dashboard component that appears when:
 * - It's March and OPENING reading is missing
 * - It's February and CLOSING reading is missing
 * 
 * Designed to be highly visible with a red/orange background
 * and a clear call-to-action to capture the odometer photo.
 */
export function TaxAlertBanner({ 
  vehicleId, 
  vehicleReg = 'Your vehicle',
  className 
}: TaxAlertBannerProps) {
  const router = useRouter()
  const [status, setStatus] = useState<VerificationStatus | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const { isOpeningWindow, isClosingWindow, currentTaxYear } = getTaxYearReadingWindow()

  useEffect(() => {
    const checkStatus = async () => {
      if (!vehicleId) {
        setIsLoading(false)
        return
      }

      try {
        const { data } = await api.getOptional(
          `/compliance/odometer/status/${vehicleId}`
        )
        if (data && typeof data === 'object') {
          const row = data as Record<string, unknown>
          setStatus({
            vehicleId: String(row.vehicleId ?? vehicleId),
            taxYear: Number(row.taxYear ?? 0),
            hasOpeningReading: Boolean(row.hasOpeningReading),
            hasClosingReading: Boolean(row.hasClosingReading),
            isOpeningWindow: Boolean(row.isOpeningWindow),
            isClosingWindow: Boolean(row.isClosingWindow),
          })
        }
      } catch (error) {
        console.error('Failed to check verification status:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkStatus()
  }, [vehicleId])

  // Don't show if dismissed, loading, or no action needed
  if (isDismissed || isLoading) {
    return null
  }

  // Determine if we need to show an alert
  const needsOpening = isOpeningWindow && !status?.hasOpeningReading
  const needsClosing = isClosingWindow && !status?.hasClosingReading

  if (!needsOpening && !needsClosing) {
    return null
  }

  const readingType = needsOpening ? OdometerReadingType.OPENING : OdometerReadingType.CLOSING
  const monthName = needsOpening ? 'March' : 'February'
  const taxYearDisplay = needsOpening 
    ? `${currentTaxYear}/${currentTaxYear + 1}` 
    : `${currentTaxYear - 1}/${currentTaxYear}`

  const handleSnapDashboard = () => {
    router.push(`/dashboard/odometer-verification?vehicleId=${vehicleId}&type=${readingType}`)
  }

  return (
    <Card className={cn(
      'border-2 border-destructive/50 bg-destructive/10 relative overflow-hidden',
      className
    )}>
      {/* Pulsing background effect for urgency */}
      <div className="absolute inset-0 bg-gradient-to-r from-destructive/5 to-destructive/10 animate-pulse" />
      
      <CardContent className="relative p-4">
        <div className="flex items-start gap-4">
          {/* Alert Icon */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive/20">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-destructive">
                SARS Tax Compliance Required
              </h3>
              <Badge variant="destructive" className="text-xs">
                Action Needed
              </Badge>
            </div>
            
            <p className="text-sm text-foreground mb-3">
              Submit your <strong>{readingType.toLowerCase()} odometer reading</strong> for{' '}
              <span className="font-medium">{vehicleReg}</span> before the end of {monthName}.
              This is required for tax year {taxYearDisplay} compliance.
            </p>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-4">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {monthName} {readingType === OdometerReadingType.OPENING ? '1st' : '28th'} deadline
              </span>
              <span className="flex items-center gap-1">
                <Car className="h-3 w-3" />
                {vehicleReg}
              </span>
            </div>

            {/* CTA Button */}
            <Button 
              onClick={handleSnapDashboard}
              className="w-full sm:w-auto h-12 text-base font-semibold gap-2"
              size="lg"
            >
              <Camera className="h-5 w-5" />
              Snap Dashboard Now
            </Button>
          </div>

          {/* Dismiss button */}
          <button
            onClick={() => setIsDismissed(true)}
            className="shrink-0 p-1 rounded-full hover:bg-muted/50 text-muted-foreground"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
