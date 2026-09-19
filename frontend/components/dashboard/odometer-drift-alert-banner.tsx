'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  AlertTriangle, 
  RefreshCw, 
  X,
  Car
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOdometerDriftAlerts } from '@/lib/hooks/use-odometer-drift-alerts'

interface OdometerDriftAlertBannerProps {
  vehicleId?: string
  vehicleReg?: string
  className?: string
}

/**
 * Odometer Drift Alert Banner
 * 
 * Dashboard component that appears when a vehicle's stored odometer baseline
 * is out of sync with the computed value from expenses (stored < computed).
 * 
 * This typically happens when expenses are deleted or edited, causing the
 * stored baseline to become stale.
 */
export function OdometerDriftAlertBanner({ 
  vehicleId, 
  vehicleReg = 'Your vehicle',
  className 
}: OdometerDriftAlertBannerProps) {
  const router = useRouter()
  const { activeAlerts, dismissAlert } = useOdometerDriftAlerts()
  const [isDismissed, setIsDismissed] = useState(false)
  
  // Find alert for this specific vehicle
  const vehicleAlert = activeAlerts.find(alert => alert.vehicleId === vehicleId)

  useEffect(() => {
    // Reset dismissed state when alert changes
    if (vehicleAlert && isDismissed) {
      setIsDismissed(false)
    }
  }, [vehicleAlert, isDismissed])

  // Don't show if dismissed or no alert for this vehicle
  if (isDismissed || !vehicleAlert) {
    return null
  }

  const handleRecalculate = () => {
    router.push(`/dashboard/vehicles/${vehicleId}/edit`)
  }

  const handleDismiss = async () => {
    try {
      await dismissAlert(vehicleAlert.vehicleId)
      setIsDismissed(true)
    } catch (error) {
      console.error('Failed to dismiss alert:', error)
    }
  }

  return (
    <Card className={cn(
      'border-2 border-amber-500/50 bg-amber-500/10 relative overflow-hidden',
      className
    )}>
      <CardContent className="relative p-4">
        <div className="flex items-start gap-4">
          {/* Alert Icon */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-amber-900">
                Odometer Needs Recalculating
              </h3>
              <Badge variant="outline" className="text-xs border-amber-500 text-amber-700">
                Action Recommended
              </Badge>
            </div>
            
            <p className="text-sm text-foreground mb-2">
              Vehicle <span className="font-medium">{vehicleReg}</span> has a mismatch between stored and computed odometer readings.
            </p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1">
                <Car className="h-3 w-3" />
                Stored: {vehicleAlert.storedOdometer.toLocaleString()} km
              </span>
              <span className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                Computed: {vehicleAlert.computedOdometer.toLocaleString()} km
              </span>
            </div>

            <p className="text-xs text-muted-foreground mb-4">
              This can happen when expenses are deleted or edited. Use the recalculate button to sync the stored baseline with the highest odometer from expenses.
            </p>

            {/* CTA Button */}
            <Button 
              onClick={handleRecalculate}
              className="w-full sm:w-auto h-10 text-sm font-semibold gap-2"
              variant="default"
            >
              <RefreshCw className="h-4 w-4" />
              Recalculate Odometer
            </Button>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
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
