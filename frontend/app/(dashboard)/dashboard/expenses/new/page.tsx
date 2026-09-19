'use client'

import { useState, useEffect, Suspense } from 'react'

// UUID generator for browsers without crypto.randomUUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ExpenseTypeSelector } from '@/components/forms/expense-type-selector'
import { FuelLogForm } from '@/components/forms/fuel-log-form'
import { MechanicServiceForm } from '@/components/forms/mechanic-service-form'
import { MaintenanceTopupForm } from '@/components/forms/maintenance-topup-form'
import { TyrePurchaseForm } from '@/components/forms/tyre-purchase-form'
import { CarWashForm } from '@/components/forms/car-wash-form'
import { InsuranceForm } from '@/components/forms/insurance-form'
import { TrackingForm } from '@/components/forms/tracking-form'
import { ETollForm } from '@/components/forms/etoll-form'
import { LicenseRenewalForm } from '@/components/forms/license-renewal-form'
import { RoadworthyForm } from '@/components/forms/roadworthy-form'
import { PersonalLicenseForm } from '@/components/forms/personal-license-form-simple'
import { OtherExpenseForm } from '@/components/forms/other-expense-form'
import RecurringExpensesList from '@/components/forms/recurring-expenses-list'
import { ExpenseCategory, Vehicle } from '@/lib/types/database'
import { api, apiPostMultipart, createRecurringExpense } from '@/lib/api/client'
import { useExpiryAlerts } from '@/lib/hooks/use-expiry-alerts'

const categoryMap: Record<string, ExpenseCategory> = {
  fuel: ExpenseCategory.FUEL_LOG,
  carwash: ExpenseCategory.CAR_WASH,
  service: ExpenseCategory.MECHANIC_SERVICE,
  topup: ExpenseCategory.MAINTENANCE_TOPUP,
  tyres: ExpenseCategory.TIRES,
  insurance: ExpenseCategory.INSURANCE_PREMIUM,
  tracking: ExpenseCategory.VEHICLE_TRACKING,
  etoll: ExpenseCategory.ETOLL_SANRAL,
  license: ExpenseCategory.LICENSE_RENEWAL,
  personal: ExpenseCategory.PERSONAL_LICENSE,
  roadworthy: ExpenseCategory.ROADWORTHY,
  other: ExpenseCategory.OTHER_FIXED,
}

function NewExpenseContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get('category')
  const { refreshAlerts } = useExpiryAlerts()
  
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(
    categoryParam ? categoryMap[categoryParam] || null : null
  )
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch vehicles from API
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setIsLoading(true)
        const response = await api.get('/vehicles')
        let list: Vehicle[] = response.data || []

        // If a vehicleId query param is present (from dashboard), prioritize that vehicle
        const vehicleIdParam = searchParams.get('vehicleId')
        if (vehicleIdParam) {
          const idx = list.findIndex(v => v.id === vehicleIdParam)
          if (idx > 0) {
            const [selected] = list.splice(idx, 1)
            list = [selected, ...list]
          }
        }

        setVehicles(list)
      } catch (err) {
        console.error('Failed to fetch vehicles:', err)
        setError('Failed to load vehicles. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchVehicles()
  }, [])

  interface GpsPosition {
    latitude: number
    longitude: number
    accuracy: number
  }

  const handleFuelLogSubmit = async (data: unknown, receiptImage?: File, gpsPosition?: GpsPosition) => {
    try {
      const expenseData = data as Record<string, unknown>
      
      // Calculate total cost from liters and price per liter
      const liters = Number(expenseData.liters) || 0
      const pricePerLiter = Number(expenseData.pricePerLiter) || 0
      const totalCost = liters * pricePerLiter
      
      // Get vehicle registration
      const vehicle = vehicles.find(v => v.id === expenseData.vehicleId)
      const vehicleReg = vehicle?.registrationNumber || 'Unknown'
      
      // Serialize date properly and add calculated fields
      const dataToSend: Record<string, unknown> = {
        ...expenseData,
        date: expenseData.date instanceof Date 
          ? expenseData.date.toISOString() 
          : new Date().toISOString(),
        totalCost: totalCost,
        amount: totalCost,
        description: expenseData.stationName 
          ? `Fuel at ${expenseData.stationName}` 
          : 'Fuel Purchase',
        vehicleReg: vehicleReg,
        supplierName: expenseData.stationName,
      }
      
      // Add GPS coordinates if captured
      if (gpsPosition) {
        dataToSend.gpsLatitude = gpsPosition.latitude
        dataToSend.gpsLongitude = gpsPosition.longitude
        dataToSend.gpsAccuracyMeters = gpsPosition.accuracy
      }
      
      const formData = new FormData()
      formData.append('data', JSON.stringify(dataToSend))
      if (receiptImage) formData.append('receipt', receiptImage)

      const response = await apiPostMultipart('/expenses/fuel', formData)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to save fuel expense: ${errorText}`)
      }
      
      await response.json()
      
      router.push('/dashboard/expenses')
    } catch (error) {
      console.error('Fuel expense submission error:', error)
      alert('Failed to save fuel expense. Please try again.')
    }
  }

  const handleMechanicServiceSubmit = async (data: unknown, invoiceImage: File | null) => {
    try {
      const expenseData = data as Record<string, unknown>
      
      // Serialize date properly
      const expenseDate = expenseData.date instanceof Date 
        ? expenseData.date.toISOString() 
        : new Date().toISOString()
      
      // Get vehicle registration
      const vehicle = vehicles.find(v => v.id === expenseData.vehicleId)
      const vehicleReg = vehicle?.registrationNumber || 'Unknown'
      
      // Prepare data for API
      const dataToSend = {
        ...expenseData,
        date: expenseDate,
        amount: (expenseData.totalCostZar as number) || 0,
        description: (expenseData.workDescription as string) || 'Mechanic Service',
        vehicleReg: vehicleReg,
        supplierName: expenseData.workshopName as string,
      }
      
      const formData = new FormData()
      formData.append('data', JSON.stringify(dataToSend))
      if (invoiceImage) formData.append('receipt', invoiceImage)

      const response = await apiPostMultipart('/expenses/mechanic', formData)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to save mechanic service: ${errorText}`)
      }
      
      await response.json()
      
      router.push('/dashboard/expenses')
    } catch (error) {
      console.error('Mechanic service submission error:', error)
      alert('Failed to save service record. Please try again.')
    }
  }

  const handleMaintenanceTopupSubmit = async (data: unknown, receiptImage: File | null) => {
    try {
      const expenseData = data as Record<string, unknown>
      
      // Serialize date properly
      const expenseDate = expenseData.date instanceof Date 
        ? expenseData.date.toISOString() 
        : new Date().toISOString()
      
      // Get vehicle registration
      const vehicle = vehicles.find(v => v.id === expenseData.vehicleId)
      const vehicleReg = vehicle?.registrationNumber || 'Unknown'
      
      // Prepare data for API
      const dataToSend = {
        ...expenseData,
        date: expenseDate,
        amount: (expenseData.priceZar as number) || (expenseData.totalCostZar as number) || (expenseData.costZar as number) || 0,
        description: `Maintenance: ${expenseData.itemType || 'Top-up'}`,
        vehicleReg: vehicleReg,
        supplierName: expenseData.shopName as string,
      }
      
      const formData = new FormData()
      formData.append('data', JSON.stringify(dataToSend))
      if (receiptImage) formData.append('receipt', receiptImage)

      const response = await apiPostMultipart('/expenses/maintenance', formData)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to save maintenance topup: ${errorText}`)
      }
      
      await response.json()
      
      router.push('/dashboard/expenses')
    } catch (error) {
      console.error('Maintenance topup submission error:', error)
      alert('Failed to save maintenance record. Please try again.')
    }
  }

  const handleTyrePurchaseSubmit = async (data: unknown, receiptImage: File | null) => {
    try {
      const expenseData = data as Record<string, unknown>
      
      // Serialize date properly
      const expenseDate = expenseData.date instanceof Date 
        ? expenseData.date.toISOString() 
        : new Date().toISOString()
      
      // Get vehicle registration
      const vehicle = vehicles.find(v => v.id === expenseData.vehicleId)
      const vehicleReg = vehicle?.registrationNumber || 'Unknown'
      
      // Prepare data for API
      const dataToSend = {
        ...expenseData,
        date: expenseDate,
        amount: (expenseData.priceZar as number) || 0,
        description: `${expenseData.quantity}x ${expenseData.brand} Tyres`,
        vehicleReg: vehicleReg,
        odometerReading: expenseData.odometerReading as number,
        supplierName: expenseData.supplier as string,
        enableRotationTracking: expenseData.enableRotationTracking as boolean || false,
        drivetrainType: expenseData.drivetrainType as string,
      }
      
      const formData = new FormData()
      formData.append('data', JSON.stringify(dataToSend))
      if (receiptImage) formData.append('receipt', receiptImage)

      const response = await apiPostMultipart('/expenses/tyres', formData)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to save tyre purchase: ${errorText}`)
      }
      
      await response.json()
      
      // Refresh alerts for tyres (rotation tracking)
      await refreshAlerts()

      router.push('/dashboard/expenses')
    } catch (error) {
      console.error('Tyre purchase submission error:', error)
      alert('Failed to save tyre purchase. Please try again.')
    }
  }

  interface SimpleExpenseData {
    vehicleId?: string
    date: Date
    amount: number
    supplierName?: string
    description?: string
  }

  const handleSimpleExpenseSubmit = async (
    data: SimpleExpenseData,
    receiptImage: File | null,
    endpoint: string,
    expenseType: string
  ) => {
    try {
      // Serialize date properly
      const expenseDate = data.date instanceof Date
        ? data.date.toISOString()
        : new Date().toISOString()

      // Get vehicle registration
      const vehicle = vehicles.find(v => v.id === data.vehicleId)
      const vehicleReg = vehicle?.registrationNumber || 'Unknown'

      // Prepare data for API
      const dataToSend = {
        vehicleId: data.vehicleId,
        date: expenseDate,
        amount: data.amount,
        description: data.description || expenseType,
        vehicleReg: vehicleReg,
        supplierName: data.supplierName,
        expenseType: expenseType,
      }

      const formData = new FormData()
      formData.append('data', JSON.stringify(dataToSend))
      if (receiptImage) formData.append('receipt', receiptImage)

      const response = await apiPostMultipart(`/expenses/${endpoint}`, formData)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to save expense: ${errorText}`)
      }

      await response.json()

      // Refresh expiry alerts for relevant types
      if (['LICENSE_RENEWAL', 'ROADWORTHY', 'INSURANCE_PREMIUM', 'VEHICLE_TRACKING', 'PERSONAL_LICENSE'].includes(expenseType)) {
        await refreshAlerts()
      }

      router.push('/dashboard/expenses')
    } catch (error) {
      console.error('Simple expense submission error:', error)
      alert(`Failed to save expense: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleInsuranceSubmit = async (data: unknown, receiptImage: File | null, odometerImage: File | null) => {
    try {
      const expenseData = data as Record<string, unknown>

      // Serialize dates properly
      const expenseDate = expenseData.date instanceof Date
        ? expenseData.date.toISOString()
        : new Date().toISOString()
      const coverageStart = expenseData.coverageStartDate instanceof Date
        ? expenseData.coverageStartDate.toISOString()
        : new Date().toISOString()
      const coverageEnd = expenseData.coverageEndDate instanceof Date
        ? expenseData.coverageEndDate.toISOString()
        : new Date().toISOString()

      // Get vehicle registration
      const vehicle = vehicles.find(v => v.id === expenseData.vehicleId)
      const vehicleReg = vehicle?.registrationNumber || 'Unknown'

      // Prepare data for API
      const dataToSend = {
        vehicleId: expenseData.vehicleId,
        date: expenseDate,
        amount: (expenseData.monthlyPremiumZar as number) || 0,
        description: `Insurance: ${expenseData.insurerName} - ${expenseData.policyNumber}`,
        vehicleReg: vehicleReg,
        supplierName: expenseData.insurerName as string,
        insurerName: expenseData.insurerName,
        policyNumber: expenseData.policyNumber,
        policyType: expenseData.policyType,
        coverageStartDate: coverageStart,
        coverageEndDate: coverageEnd,
        monthlyPremiumZar: expenseData.monthlyPremiumZar,
        excessAmountZar: expenseData.excessAmountZar,
        odometerReading: expenseData.odometerReading,
        odometerReadingDate: expenseData.odometerReadingDate,
        brokerName: expenseData.brokerName,
        brokerPhone: expenseData.brokerPhone,
        claimPhoneNumber: expenseData.claimPhoneNumber,
        coverDetails: expenseData.coverDetails,
      }

      const formData = new FormData()
      formData.append('data', JSON.stringify(dataToSend))
      if (receiptImage) formData.append('receipt', receiptImage)
      if (odometerImage) formData.append('odometerPhoto', odometerImage)

      const response = await apiPostMultipart('/expenses/insurance', formData)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to save insurance: ${errorText}`)
      }

      const result = await response.json()

      // Upload odometer photo as separate entry image with type ODOMETER
      if (odometerImage && result.id) {
        try {
          await api.post(`/entry-images`, {
            entryType: 'EXPENSE',
            entryId: result.id,
            imageType: 'ODOMETER',
            description: 'Odometer reading proof',
          })
          // Note: The actual image upload would need to be handled by a separate endpoint
          // For now, we'll assume the backend handles the odometerPhoto field
        } catch (error) {
          console.warn('Failed to upload odometer photo metadata:', error)
        }
      }

      // Refresh expiry alerts
      await refreshAlerts()

      router.push('/dashboard/expenses')
    } catch (error) {
      console.error('Insurance submission error:', error)
      alert(`Failed to save insurance: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleTrackingSubmit = async (data: unknown, receiptImage: File | null, odometerImage: File | null) => {
    try {
      const expenseData = data as Record<string, unknown>

      // Serialize dates properly
      const expenseDate = expenseData.date instanceof Date
        ? expenseData.date.toISOString()
        : new Date().toISOString()
      const subscriptionStart = expenseData.subscriptionStartDate instanceof Date
        ? expenseData.subscriptionStartDate.toISOString()
        : new Date().toISOString()
      const subscriptionEnd = expenseData.subscriptionEndDate instanceof Date
        ? expenseData.subscriptionEndDate.toISOString()
        : undefined
      const installDate = expenseData.installationDate instanceof Date
        ? expenseData.installationDate.toISOString()
        : undefined

      if (!receiptImage) {
        throw new Error('Receipt image is required for tracking subscriptions')
      }

      // Get vehicle registration
      const vehicle = vehicles.find(v => v.id === expenseData.vehicleId)
      const vehicleReg = vehicle?.registrationNumber || 'Unknown'

      // Prepare data for API
      const dataToSend: Record<string, unknown> = {
        vehicleId: expenseData.vehicleId,
        date: expenseDate,
        amount: (expenseData.monthlyFeeZar as number) || 0,
        description: `Tracking: ${expenseData.providerName} - ${expenseData.subscriptionType}`,
        vehicleReg: vehicleReg,
        supplierName: expenseData.providerName as string,
        providerName: expenseData.providerName,
        subscriptionType: expenseData.subscriptionType,
        monthlyFeeZar: expenseData.monthlyFeeZar,
        subscriptionStartDate: subscriptionStart,
        subscriptionEndDate: subscriptionEnd,
        deviceSerialNumber: expenseData.deviceSerialNumber,
        deviceType: expenseData.deviceType,
        installationDate: installDate,
        installationFeeZar: expenseData.installationFeeZar,
        contractDurationMonths: expenseData.contractDurationMonths,
        recoveryIncluded: expenseData.recoveryIncluded,
        odometerReading: expenseData.odometerReading,
        odometerReadingDate: expenseData.odometerReadingDate,
        appLoginEmail: expenseData.appLoginEmail,
        supportPhone: expenseData.supportPhone,
        features: expenseData.features,
        notes: expenseData.notes,
      }

      const formData = new FormData()
      formData.append('data', JSON.stringify(dataToSend))
      formData.append('receipt', receiptImage)
      if (odometerImage) formData.append('odometerPhoto', odometerImage)

      const response = await apiPostMultipart('/expenses/tracking', formData)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to save tracking subscription: ${errorText}`)
      }

      await response.json()

      // Refresh expiry alerts
      await refreshAlerts()

      router.push('/dashboard/expenses')
    } catch (error) {
      console.error('Tracking submission error:', error)
      alert(`Failed to save tracking subscription: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleETollSubmit = async (data: unknown, receiptImage: File | null) => {
    try {
      const expenseData = data as Record<string, unknown>

      if (!receiptImage) {
        throw new Error('Receipt image is required for new E-Toll expenses')
      }

      const expenseDate = expenseData.date instanceof Date
        ? expenseData.date.toISOString()
        : new Date().toISOString()
      const periodStart = expenseData.periodStartDate instanceof Date
        ? expenseData.periodStartDate.toISOString()
        : undefined
      const periodEnd = expenseData.periodEndDate instanceof Date
        ? expenseData.periodEndDate.toISOString()
        : undefined

      const vehicle = vehicles.find(v => v.id === expenseData.vehicleId)
      const vehicleReg = vehicle?.registrationNumber || 'Unknown'

      const dataToSend: Record<string, unknown> = {
        vehicleId: expenseData.vehicleId,
        date: expenseDate,
        amount: (expenseData.totalAmountZar as number) || 0,
        description: `E-Toll: ${expenseData.paymentMethod} - ${expenseData.vehicleRegistration}`,
        vehicleReg: vehicleReg,
        supplierName: 'SANRAL',
        accountNumber: expenseData.accountNumber,
        tagSerialNumber: expenseData.tagSerialNumber,
        vehicleRegistration: expenseData.vehicleRegistration,
        paymentMethod: expenseData.paymentMethod,
        tollRoutes: expenseData.tollRoutes,
        periodStartDate: periodStart,
        periodEndDate: periodEnd,
        totalGantries: expenseData.totalGantries,
        totalAmountZar: expenseData.totalAmountZar,
        vatAmountZar: expenseData.vatAmountZar,
        referenceNumber: expenseData.referenceNumber,
        notes: expenseData.notes,
      }

      const formData = new FormData()
      formData.append('data', JSON.stringify(dataToSend))
      formData.append('receipt', receiptImage)

      const response = await apiPostMultipart('/expenses/etoll', formData)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to save e-toll: ${errorText}`)
      }

      await response.json()
      router.push('/dashboard/expenses')
    } catch (error) {
      console.error('E-toll submission error:', error)
      alert(`Failed to save e-toll: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleLicenseSubmit = async (data: unknown, receiptImage: File | null) => {
    try {
      const expenseData = data as Record<string, unknown>

      const expenseDate = expenseData.date instanceof Date
        ? expenseData.date.toISOString()
        : new Date().toISOString()
      const prevExpiry = expenseData.previousExpiryDate instanceof Date
        ? expenseData.previousExpiryDate.toISOString()
        : undefined
      const newExpiry = expenseData.newExpiryDate instanceof Date
        ? expenseData.newExpiryDate.toISOString()
        : new Date().toISOString()

      const vehicle = vehicles.find(v => v.id === expenseData.vehicleId)
      const vehicleReg = vehicle?.registrationNumber || 'Unknown'

      const dataToSend: Record<string, unknown> = {
        vehicleId: expenseData.vehicleId,
        date: expenseDate,
        amount: (expenseData.renewalFeeZar as number) || 0,
        description: `License: ${expenseData.licenseType} - ${vehicleReg}`,
        vehicleReg: vehicleReg,
        licenseType: expenseData.licenseType,
        licenseNumber: expenseData.licenseNumber,
        registrationAuthority: expenseData.registrationAuthority,
        previousExpiryDate: prevExpiry,
        newExpiryDate: newExpiry,
        renewalFeeZar: expenseData.renewalFeeZar,
        penaltiesZar: expenseData.penaltiesZar,
        arrearsZar: expenseData.arrearsZar,
        transactionNumber: expenseData.transactionNumber,
        renewalMethod: expenseData.renewalMethod,
        processingDays: expenseData.processingDays,
        odometerReading: expenseData.odometerReading,
        notes: expenseData.notes,
      }

      const formData = new FormData()
      formData.append('data', JSON.stringify(dataToSend))
      if (receiptImage) formData.append('receipt', receiptImage)

      const response = await apiPostMultipart('/expenses/license', formData)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to save license renewal: ${errorText}`)
      }

      await response.json()
      await refreshAlerts()
      router.push('/dashboard/expenses')
    } catch (error) {
      console.error('License renewal submission error:', error)
      alert(`Failed to save license renewal: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleRoadworthySubmit = async (data: unknown, receiptImage: File | null) => {
    try {
      const expenseData = data as Record<string, unknown>

      const expenseDate = expenseData.date instanceof Date
        ? expenseData.date.toISOString()
        : new Date().toISOString()
      const testDate = expenseData.testDate instanceof Date
        ? expenseData.testDate.toISOString()
        : new Date().toISOString()
      const expiryDate = expenseData.expiryDate instanceof Date
        ? expenseData.expiryDate.toISOString()
        : undefined

      const vehicle = vehicles.find(v => v.id === expenseData.vehicleId)
      const vehicleReg = vehicle?.registrationNumber || 'Unknown'

      const dataToSend: Record<string, unknown> = {
        vehicleId: expenseData.vehicleId,
        date: expenseDate,
        amount: (expenseData.testFeeZar as number) || 0,
        description: `Roadworthy: ${expenseData.testResult} - ${expenseData.testingStationName}`,
        vehicleReg: vehicleReg,
        supplierName: expenseData.testingStationName,
        testingStationName: expenseData.testingStationName,
        testingStationAddress: expenseData.testingStationAddress,
        testingStationPhone: expenseData.testingStationPhone,
        testDate: testDate,
        certificateNumber: expenseData.certificateNumber,
        expiryDate: expiryDate,
        testResult: expenseData.testResult,
        testFeeZar: expenseData.testFeeZar,
        retestFeeZar: expenseData.retestFeeZar,
        inspectorName: expenseData.inspectorName,
        vehicleOdometer: expenseData.vehicleOdometer,
        failureReasons: expenseData.failureReasons,
        conditionsApplied: expenseData.conditionsApplied,
        notes: expenseData.notes,
      }

      const formData = new FormData()
      formData.append('data', JSON.stringify(dataToSend))
      if (receiptImage) formData.append('receipt', receiptImage)

      const response = await apiPostMultipart('/expenses/roadworthy', formData)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to save roadworthy: ${errorText}`)
      }

      await response.json()
      await refreshAlerts()
      router.push('/dashboard/expenses')
    } catch (error) {
      console.error('Roadworthy submission error:', error)
      alert(`Failed to save roadworthy: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handlePersonalLicenseSubmit = async (data: unknown, receiptImage: File | null) => {
    try {
      const expenseData = data as Record<string, unknown>

      const expenseDate = expenseData.date instanceof Date
        ? expenseData.date.toISOString()
        : new Date().toISOString()
      const issueDate = expenseData.issueDate instanceof Date
        ? expenseData.issueDate.toISOString()
        : new Date().toISOString()
      const expiryDate = expenseData.expiryDate instanceof Date
        ? expenseData.expiryDate.toISOString()
        : new Date().toISOString()

      const dataToSend: Record<string, unknown> = {
        date: expenseDate,
        amount: (expenseData.renewalFeeZar as number) || 0,
        description: `Personal License: ${expenseData.licenseType} - ${expenseData.licenseNumber}`,
        licenseType: expenseData.licenseType,
        licenseNumber: expenseData.licenseNumber,
        licenseCode: expenseData.licenseCode,
        issueDate: issueDate,
        expiryDate: expiryDate,
        renewalFeeZar: expenseData.renewalFeeZar,
        penaltiesZar: expenseData.penaltiesZar,
        renewalMethod: expenseData.renewalMethod,
        issuingAuthority: expenseData.issuingAuthority,
        notes: expenseData.notes,
      }

      const formData = new FormData()
      formData.append('data', JSON.stringify(dataToSend))
      if (receiptImage) formData.append('receipt', receiptImage)

      const response = await apiPostMultipart('/expenses/personal-license', formData)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to save personal license: ${errorText}`)
      }

      await response.json()
      await refreshAlerts()
      router.push('/dashboard/expenses')
    } catch (error) {
      console.error('Personal license submission error:', error)
      alert(`Failed to save personal license: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleOtherExpenseSubmit = async (data: unknown, receiptImage: File | null) => {
    try {
      const expenseData = data as Record<string, unknown>

      const expenseDate = expenseData.date instanceof Date
        ? expenseData.date.toISOString()
        : new Date().toISOString()
      const periodStart = expenseData.periodStartDate instanceof Date
        ? expenseData.periodStartDate.toISOString()
        : undefined
      const periodEnd = expenseData.periodEndDate instanceof Date
        ? expenseData.periodEndDate.toISOString()
        : undefined

      const vehicle = vehicles.find(v => v.id === expenseData.vehicleId)
      const vehicleReg = vehicle?.registrationNumber || 'Unknown'

      // If recurring, create the recurring expense template instead of a single expense
      if (expenseData.isRecurring) {
        const recurringData = {
          vehicleId: expenseData.vehicleId as string,
          userId: localStorage.getItem('user_id') || '',
          category: expenseData.categoryLabel as string || 'OTHER_FIXED',
          description: expenseData.expenseDescription as string,
          amountZar: (expenseData.amountZar as number) || 0,
          supplierName: expenseData.providerName as string,
          invoiceNumber: expenseData.referenceNumber as string,
          isRecurring: true,
          recurrenceDays: Array.isArray(expenseData.recurrenceDaysOfWeek)
            ? (expenseData.recurrenceDaysOfWeek as string[]).join(',')
            : undefined,
          recurrenceDaysOfMonth: Array.isArray(expenseData.recurrenceDaysOfMonth)
            ? (expenseData.recurrenceDaysOfMonth as number[]).join(',')
            : undefined,
          recurrenceStartDate: periodStart,
          recurrenceEndDate: periodEnd,
        }

        await createRecurringExpense(recurringData)
        router.push('/dashboard/expenses')
        return
      }

      // Otherwise, create a single expense
      const dataToSend: Record<string, unknown> = {
        vehicleId: expenseData.vehicleId,
        date: expenseDate,
        amount: (expenseData.amountZar as number) || 0,
        description: expenseData.expenseDescription as string,
        vehicleReg: vehicleReg,
        supplierName: expenseData.providerName,
        categoryLabel: expenseData.categoryLabel,
        providerName: expenseData.providerName,
        referenceNumber: expenseData.referenceNumber,
        amountZar: expenseData.amountZar,
        isRecurring: expenseData.isRecurring,
        recurrenceFrequency: expenseData.recurrenceFrequency,
        recurrenceDaysOfWeek: expenseData.recurrenceDaysOfWeek,
        recurrenceDaysOfMonth: expenseData.recurrenceDaysOfMonth,
        periodStartDate: periodStart,
        periodEndDate: periodEnd,
        notes: expenseData.notes,
      }

      const formData = new FormData()
      formData.append('data', JSON.stringify(dataToSend))
      if (receiptImage) formData.append('receipt', receiptImage)

      // Use parking endpoint if categoryLabel is "Parking", otherwise use other-fixed
      const endpoint = expenseData.categoryLabel === 'Parking' ? '/expenses/parking' : '/expenses/other-fixed'
      const response = await apiPostMultipart(endpoint, formData)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to save other expense: ${errorText}`)
      }

      await response.json()
      router.push('/dashboard/expenses')
    } catch (error) {
      console.error('Other expense submission error:', error)
      alert(`Failed to save other expense: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleCarWashSubmit = async (data: unknown, receiptImage: File | null) => {
    try {
      const expenseData = data as Record<string, unknown>
      
      // Serialize date properly
      const expenseDate = expenseData.date instanceof Date 
        ? expenseData.date.toISOString() 
        : new Date().toISOString()
      
      // Get vehicle registration
      const vehicle = vehicles.find(v => v.id === expenseData.vehicleId)
      const vehicleReg = vehicle?.registrationNumber || 'Unknown'
      
      // Prepare data for API
      const dataToSend = {
        ...expenseData,
        date: expenseDate,
        amount: (expenseData.costZar as number) || 0,
        description: `Car Wash: ${expenseData.washType || 'Standard'}`,
        vehicleReg: vehicleReg,
        supplierName: expenseData.washName as string,
      }
      
      const formData = new FormData()
      formData.append('data', JSON.stringify(dataToSend))
      if (receiptImage) formData.append('receipt', receiptImage)

      const response = await apiPostMultipart('/expenses/carwash', formData)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to save car wash expense: ${errorText}`)
      }
      
      await response.json()
      
      router.push('/dashboard/expenses')
    } catch (error) {
      console.error('Car wash submission error:', error)
      alert('Failed to save car wash expense. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading vehicles...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  const renderForm = () => {
    switch (selectedCategory) {
      case ExpenseCategory.FUEL_LOG:
        return (
          <FuelLogForm 
            key="fuel-log-create"
            vehicles={vehicles} 
            onSubmit={handleFuelLogSubmit}
            mode="create"
          />
        )
      case ExpenseCategory.CAR_WASH:
        return (
          <CarWashForm
            vehicles={vehicles}
            onSubmit={handleCarWashSubmit}
            mode="create"
          />
        )
      case ExpenseCategory.MECHANIC_SERVICE:
        return (
          <MechanicServiceForm
            vehicles={vehicles}
            onSubmit={handleMechanicServiceSubmit}
            mode="create"
          />
        )
      case ExpenseCategory.MAINTENANCE_TOPUP:
        return (
          <MaintenanceTopupForm
            vehicles={vehicles}
            onSubmit={handleMaintenanceTopupSubmit}
            mode="create"
          />
        )
      case ExpenseCategory.TIRES:
        return (
          <TyrePurchaseForm
            vehicles={vehicles}
            onSubmit={handleTyrePurchaseSubmit}
            mode="create"
          />
        )
      case ExpenseCategory.INSURANCE_PREMIUM:
        return (
          <InsuranceForm
            vehicles={vehicles}
            onSubmit={handleInsuranceSubmit}
            mode="create"
          />
        )
      case ExpenseCategory.VEHICLE_TRACKING:
        return (
          <TrackingForm
            vehicles={vehicles}
            onSubmit={handleTrackingSubmit}
            mode="create"
          />
        )
      case ExpenseCategory.ETOLL_SANRAL:
        return (
          <ETollForm
            vehicles={vehicles}
            onSubmit={handleETollSubmit}
            mode="create"
          />
        )
      case ExpenseCategory.LICENSE_RENEWAL:
        return (
          <LicenseRenewalForm
            vehicles={vehicles.map(v => ({ ...v, currentOdometer: v.currentOdometer }))}
            onSubmit={handleLicenseSubmit}
            mode="create"
          />
        )
      case ExpenseCategory.PERSONAL_LICENSE:
        return (
          <PersonalLicenseForm
            onSubmit={handlePersonalLicenseSubmit}
            mode="create"
          />
        )
      case ExpenseCategory.ROADWORTHY:
        return (
          <RoadworthyForm
            vehicles={vehicles}
            onSubmit={handleRoadworthySubmit}
            mode="create"
          />
        )
      case ExpenseCategory.OTHER_FIXED:
        return (
          <OtherExpenseForm
            vehicles={vehicles}
            onSubmit={handleOtherExpenseSubmit}
            mode="create"
          />
        )
      default:
        return (
          <ExpenseTypeSelector
            selectedCategory={selectedCategory}
            onSelect={setSelectedCategory}
          />
        )
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="flex items-center gap-3 px-4 py-2">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-sm">Add Expense</h1>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-xs text-primary hover:underline"
              >
                Change type
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pb-24">
        {renderForm()}
      </div>
    </div>
  )
}

export default function NewExpensePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <NewExpenseContent />
    </Suspense>
  )
}
