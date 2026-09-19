'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api/client'
import type {
  ExpiryAlert,
  ExpiryAlertCounts,
  ExpiryItemType,
  ExpiryStatus,
} from '@/lib/types/database'

function mapApiAlert(row: Record<string, unknown>): ExpiryAlert | null {
  // Validate required fields
  if (!row.itemType || !row.itemId) {
    return null
  }

  const expiryDate = row.expiryDate
    ? new Date(String(row.expiryDate))
    : new Date()

  return {
    itemType: row.itemType as ExpiryItemType,
    itemId: String(row.itemId),
    relatedId: row.relatedId ? String(row.relatedId) : undefined,
    itemName: String(row.itemName ?? ''),
    itemDescription: String(row.itemDescription ?? ''),
    vehicleId: row.vehicleId ? String(row.vehicleId) : undefined,
    vehicleRegistration: row.vehicleRegistration ? String(row.vehicleRegistration) : undefined,
    vehicleName: row.vehicleName ? String(row.vehicleName) : undefined,
    userId: row.userId ? String(row.userId) : undefined,
    userName: row.userName ? String(row.userName) : undefined,
    expiryDate,
    daysUntilExpiry: Number(row.daysUntilExpiry ?? 0),
    expiryStatus: (row.expiryStatus as ExpiryStatus) ?? 'VALID',
    isDismissed: Boolean(row.isDismissed),
  }
}

export interface UseExpiryAlertsResult {
  alerts: ExpiryAlert[]
  activeAlerts: ExpiryAlert[]
  counts: ExpiryAlertCounts
  isLoading: boolean
  error: string | null
  dismissAlert: (itemType: ExpiryItemType, itemId: string) => Promise<void>
  undismissAlert: (itemType: ExpiryItemType, itemId: string) => Promise<void>
  refreshAlerts: () => Promise<void>
  getAlertsByType: (itemType: ExpiryItemType) => ExpiryAlert[]
  getAlertsByVehicle: (vehicleId: string) => ExpiryAlert[]
  getAlertsByStatus: (status: ExpiryStatus) => ExpiryAlert[]
}

export function useExpiryAlerts(): UseExpiryAlertsResult {
  const [alerts, setAlerts] = useState<ExpiryAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAlerts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await api.getOptional('/alerts/expiry?includeDismissed=true')
      const rows = Array.isArray(data) ? data : []
      const mapped = rows
        .filter((r: Record<string, unknown>) => r != null)
        .map((r: Record<string, unknown>) => mapApiAlert(r))
        .filter((alert): alert is ExpiryAlert => alert !== null)
      mapped.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
      setAlerts(mapped)
    } catch {
      setAlerts([])
      setError(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAlerts()
  }, [loadAlerts])

  const dismissAlert = useCallback(
    async (itemType: ExpiryItemType, itemId: string) => {
      if (!itemType || !itemId) {
        return
      }
      await api.post('/alerts/expiry/dismiss', { itemType, itemId })
      await loadAlerts()
    },
    [loadAlerts]
  )

  const undismissAlert = useCallback(
    async (itemType: ExpiryItemType, itemId: string) => {
      if (!itemType || !itemId) {
        return
      }
      await api.post('/alerts/expiry/undismiss', { itemType, itemId })
      await loadAlerts()
    },
    [loadAlerts]
  )

  const activeAlerts = alerts.filter((a) => !a.isDismissed)

  const counts: ExpiryAlertCounts = {
    totalAlerts: activeAlerts.length,
    expiredCount: activeAlerts.filter((a) => a.expiryStatus === 'EXPIRED').length,
    criticalCount: activeAlerts.filter((a) => a.expiryStatus === 'CRITICAL').length,
    warningCount: activeAlerts.filter((a) => a.expiryStatus === 'WARNING').length,
    upcomingCount: activeAlerts.filter((a) => a.expiryStatus === 'UPCOMING').length,
  }

  const getAlertsByType = useCallback(
    (itemType: ExpiryItemType) => alerts.filter((a) => a.itemType === itemType),
    [alerts]
  )

  const getAlertsByVehicle = useCallback(
    (vehicleId: string) => alerts.filter((a) => a.vehicleId === vehicleId),
    [alerts]
  )

  const getAlertsByStatus = useCallback(
    (status: ExpiryStatus) => alerts.filter((a) => a.expiryStatus === status),
    [alerts]
  )

  return {
    alerts,
    activeAlerts,
    counts,
    isLoading,
    error,
    dismissAlert,
    undismissAlert,
    refreshAlerts: loadAlerts,
    getAlertsByType,
    getAlertsByVehicle,
    getAlertsByStatus,
  }
}
