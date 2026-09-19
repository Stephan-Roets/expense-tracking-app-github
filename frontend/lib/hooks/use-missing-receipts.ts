'use client'

import { useState, useEffect, useCallback } from 'react'
import { api, getExpensesWithoutReceipts } from '@/lib/api/client'

export interface ExpenseWithoutReceipt {
  id: string
  category: string
  description: string
  amount: number
  expenseDate: string
  vehicleId?: string
  vehicleRegistration?: string
}

export interface UseMissingReceiptsResult {
  expenses: ExpenseWithoutReceipt[]
  isLoading: boolean
  error: string | null
  refreshReceipts: () => Promise<void>
}

export function useMissingReceipts(): UseMissingReceiptsResult {
  const [expenses, setExpenses] = useState<ExpenseWithoutReceipt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadReceipts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await getExpensesWithoutReceipts()
      const list = Array.isArray(data) ? data : []
      setExpenses(list)
    } catch (err) {
      console.error('Failed to load expenses without receipts:', err)
      setError('Failed to load expenses missing receipts')
      setExpenses([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReceipts()
  }, [loadReceipts])

  return {
    expenses,
    isLoading,
    error,
    refreshReceipts: loadReceipts,
  }
}
