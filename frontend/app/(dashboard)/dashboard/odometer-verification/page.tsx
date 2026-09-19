'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { OdometerCaptureForm } from '@/components/forms/odometer-capture-form'
import { OdometerReadingType } from '@/lib/types/database'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api/client'
import { useAuth } from '@/lib/contexts/auth-context'
import { UserRole } from '@/lib/types/database'
import { useRouter } from 'next/navigation'

function OdometerVerificationContent() {
  const router = useRouter()
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const vehicleId = searchParams.get('vehicleId')
  const typeParam = searchParams.get('type')

  const readingType =
    typeParam === 'CLOSING' ? OdometerReadingType.CLOSING : OdometerReadingType.OPENING

  const [vehicle, setVehicle] = useState<{ reg: string; lastOdometer: number } | null>(null)
  const [loading, setLoading] = useState(true)

  // Prevent RENTAL_CUSTOMER from accessing odometer verification
  useEffect(() => {
    if (user?.role === UserRole.RENTAL_CUSTOMER) {
      router.replace('/dashboard')
      return
    }
  }, [user, router])

  useEffect(() => {
    if (!vehicleId) {
      setLoading(false)
      return
    }
    api
      .get('/vehicles')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : []
        const v = list.find((x: { id: string }) => x.id === vehicleId)
        if (v) {
          setVehicle({
            reg: v.registrationNumber,
            lastOdometer: v.currentOdometer ?? 0,
          })
        } else {
          setVehicle({ reg: 'Unknown', lastOdometer: 0 })
        }
      })
      .catch(() => setVehicle({ reg: 'Unknown', lastOdometer: 0 }))
      .finally(() => setLoading(false))
  }, [vehicleId])

  if (!vehicleId) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Missing vehicle. Open this page from your vehicle onboarding flow.</p>
      </div>
    )
  }

  if (loading || !vehicle) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-4">
        <h1 className="text-2xl font-bold">Odometer Verification</h1>
        <p className="text-sm text-muted-foreground">SARS Tax Year Compliance</p>
      </div>

      <div className="px-4 py-6">
        <OdometerCaptureForm
          vehicleId={vehicleId}
          vehicleReg={vehicle.reg}
          readingType={readingType}
          lastKnownOdometer={vehicle.lastOdometer}
        />
      </div>
    </div>
  )
}

export default function OdometerVerificationPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <OdometerVerificationContent />
    </Suspense>
  )
}
