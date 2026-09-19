'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api/client'

export interface OdometerDriftAlert {
  id: string
  vehicleId: string
  vehicleRegistration: string
  storedOdometer: number
  computedOdometer: number
  isDismissed: boolean
  createdAt: string
  updatedAt: string
}

export interface UseOdometerDriftAlertsResult {
  alerts: OdometerDriftAlert[]
  activeAlerts: OdometerDriftAlert[]
  isLoading: boolean
  error: string | null
  dismissAlert: (vehicleId: string) => Promise<void>
  deleteAlert: (vehicleId: string) => Promise<void>
  refreshAlerts: () => Promise<void>
  checkAllVehicles: () => Promise<number>
}

export function useOdometerDriftAlerts(): UseOdometerDriftAlertsResult {
  const [alerts, setAlerts] = useState<OdometerDriftAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAlerts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await api.getOptional('/alerts/odometer-drift')
      const rows = Array.isArray(data) ? data : []
      setAlerts(rows)
    } catch (err) {
      console.error('[useOdometerDriftAlerts] Failed to load alerts:', err)
      setAlerts([])
      setError(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAlerts()
  }, [loadAlerts])

  const dismissAlert = useCallback(async (vehicleId: string) => {
    try {
      await api.post(`/alerts/odometer-drift/${vehicleId}/dismiss`, {})
      await loadAlerts()
    } catch (err) {
      console.error('[useOdometerDriftAlerts] Failed to dismiss alert:', err)
      throw err
    }
  }, [loadAlerts])

  const deleteAlert = useCallback(async (vehicleId: string) => {
    try {
      await api.delete(`/alerts/odometer-drift/${vehicleId}`)
      await loadAlerts()
    } catch (err) {
      console.error('[useOdometerDriftAlerts] Failed to delete alert:', err)
      throw err
    }
  }, [loadAlerts])

  const checkAllVehicles = useCallback(async () => {
    try {
      const { data } = await api.post('/alerts/odometer-drift/check-all', {})
      await loadAlerts()
      return data.alertsCreated || 0
    } catch (err) {
      console.error('[useOdometerDriftAlerts] Failed to check all vehicles:', err)
      throw err
    }
  }, [loadAlerts])

  const activeAlerts = alerts.filter((a) => !a.isDismissed)

  return {
    alerts,
    activeAlerts,
    isLoading,
    error,
    dismissAlert,
    deleteAlert,
    refreshAlerts: loadAlerts,
    checkAllVehicles,
  }
}
