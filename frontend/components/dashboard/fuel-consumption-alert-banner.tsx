"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, AlertCircle, X, Fuel } from "lucide-react"
import { api } from "@/lib/api/client"
import { cn } from "@/lib/utils"

interface FuelConsumptionAlert {
  vehicleId: string
  averageConsumptionLPer100km: number
  recentAverageConsumptionLPer100km: number
  degradationPercent: number
  severity: "MEDIUM" | "HIGH"
  message: string
}

interface FuelConsumptionAlertBannerProps {
  vehicleId: string
}

export function FuelConsumptionAlertBanner({ vehicleId }: FuelConsumptionAlertBannerProps) {
  const [alert, setAlert] = useState<FuelConsumptionAlert | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setAlert(null)
    setDismissed(false)
    api
      .getOptional(`/vehicles/${vehicleId}/fuel-stats/consumption-alert`)
      .then(({ data }) => {
        if (data) setAlert(data as FuelConsumptionAlert)
      })
      .catch(() => {})
  }, [vehicleId])

  if (!alert || dismissed) return null

  const isHigh = alert.severity === "HIGH"

  return (
    <div
      className={cn(
        "relative flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
        isHigh
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-amber-400/40 bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400"
      )}
    >
      <div className="mt-0.5 shrink-0">
        {isHigh ? (
          <AlertCircle className="h-5 w-5" />
        ) : (
          <AlertTriangle className="h-5 w-5" />
        )}
      </div>

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 font-semibold">
          <Fuel className="h-4 w-4" />
          {isHigh ? "High Fuel Consumption Warning" : "Fuel Efficiency Declining"}
        </div>
        <p className="text-xs leading-relaxed opacity-90">{alert.message}</p>
        <div className="flex items-center gap-4 pt-1 text-xs font-medium">
          <span>
            All-time avg:{" "}
            <span className="font-bold">
              {alert.averageConsumptionLPer100km.toFixed(1)} L/100km
            </span>
          </span>
          <span>
            Recent avg:{" "}
            <span className={cn("font-bold", isHigh ? "text-destructive" : "text-amber-700 dark:text-amber-400")}>
              {alert.recentAverageConsumptionLPer100km.toFixed(1)} L/100km
            </span>
          </span>
          <span className={cn("rounded-full px-2 py-0.5 font-semibold", isHigh ? "bg-destructive/20" : "bg-amber-200/60 dark:bg-amber-900/40")}>
            +{alert.degradationPercent.toFixed(1)}% worse
          </span>
        </div>
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="ml-2 mt-0.5 shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
