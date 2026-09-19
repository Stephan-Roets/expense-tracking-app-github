'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api/client'
import { DrivetrainType, type TyreRotationWarning, type TyreRotationStatus } from '@/lib/types/database'

function mapWarning(row: Record<string, unknown>): TyreRotationWarning {
  const rotationStatus = String(row.rotationStatus ?? 'OK')
  
  return {
    trackingId: String(row.trackingId),
    organizationId: '',
    vehicleId: String(row.vehicleId),
    vehicleRegistration: String(row.vehicleRegistration ?? ''),
    vehicleName: String(row.vehicleName ?? ''),
    tyreBrand: String(row.tyreBrand ?? ''),
    installationDate: row.installationDate
      ? new Date(String(row.installationDate))
      : new Date(),
    drivetrainType: (row.drivetrainType as DrivetrainType) ?? DrivetrainType.FWD,
    rotationIntervalKm: Number(row.rotationIntervalKm ?? 8000),
    installationOdometer: Number(row.installationOdometer ?? 0),
    rotationCount: 0,
    nextRotationOdometer: Number(row.nextRotationOdometer ?? 0),
    latestFuelOdometer: row.latestFuelOdometer != null ? Number(row.latestFuelOdometer) : undefined,
    currentVehicleOdometer: Number(row.latestFuelOdometer ?? row.installationOdometer ?? 0),
    kmOverdue: Number(row.kmOverdue ?? 0),
    rotationStatus: rotationStatus as TyreRotationStatus,
    isActive: true,
    isDismissed: false,
  }
}

export interface UseTyreRotationWarningsResult {
  warnings: TyreRotationWarning[]
  warningCount: number
  criticalCount: number
  isLoading: boolean
  error: Error | null
  refetch: () => void
  dismissWarning: (trackingId: string) => Promise<void>
  recordRotation: (trackingId: string, rotationOdometer: number) => Promise<void>
}

export function useTyreRotationWarnings(): UseTyreRotationWarningsResult {
  const [warnings, setWarnings] = useState<TyreRotationWarning[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchWarnings = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await api.getOptional('/alerts/tyre-rotation')
      const rows = Array.isArray(data) ? data : []
      const mapped = rows
        .filter((r: Record<string, unknown>) => r != null)
        .map((r: Record<string, unknown>) => mapWarning(r))
        .filter((w) => ['WARNING', 'CRITICAL'].includes(w.rotationStatus))
      setWarnings(mapped)
    } catch (e) {
      setWarnings([])
      setError(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWarnings()
  }, [fetchWarnings])

  const dismissWarning = useCallback(
    async (trackingId: string) => {
      await api.post(`/alerts/tyre-rotation/${trackingId}/dismiss`, {})
      await fetchWarnings()
    },
    [fetchWarnings]
  )

  const recordRotation = useCallback(
    async (trackingId: string, rotationOdometer: number) => {
      await api.post(`/alerts/tyre-rotation/${trackingId}/rotate`, { rotationOdometer })
      await fetchWarnings()
    },
    [fetchWarnings]
  )

  const warningCount = warnings.length
  const criticalCount = warnings.filter((w) => w.rotationStatus === 'CRITICAL').length

  return {
    warnings,
    warningCount,
    criticalCount,
    isLoading,
    error,
    refetch: fetchWarnings,
    dismissWarning,
    recordRotation,
  }
}

/** Fuel logs update DB via expense API; tyre warnings refresh on next fetch. */
export function saveFuelLogOdometer(
  _vehicleId: string,
  _odometerReading: number,
  _date: Date
): void {
  // No-op: odometer is persisted when saving the fuel expense to the API.
}
