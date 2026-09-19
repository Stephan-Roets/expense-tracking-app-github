'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { CheckCircle2, AlertCircle, Edit2, Lock } from 'lucide-react'
import { createUserAddress, updateUserAddress } from '@/lib/api/client'
import { cn } from '@/lib/utils'

const addressSchema = z.object({
  addressLine1: z.string().min(1, 'Address line 1 is required'),
  addressLine2: z.string().optional(),
  suburb: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  province: z.string().min(1, 'Province is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
})

type AddressInput = z.infer<typeof addressSchema>

interface AddressFormProps {
  existingAddress?: {
    id?: string
    streetNumber?: string
    streetName?: string
    addressLine1?: string
    addressLine2?: string
    suburb?: string
    cityTown?: string
    city?: string
    province?: string
    postalCode?: string
    country?: string
  }
  onSuccess?: () => void
}

const SOUTH_AFRICAN_PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
]

export function AddressForm({ existingAddress, onSuccess }: AddressFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(!existingAddress) // Start in edit mode if no address exists
  
  // Update edit mode when existingAddress changes
  useEffect(() => {
    if (existingAddress) {
      setIsEditing(false)
    } else {
      setIsEditing(true)
    }
  }, [existingAddress])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      addressLine1: existingAddress?.addressLine1 || (existingAddress?.streetNumber && existingAddress?.streetName ? `${existingAddress.streetNumber} ${existingAddress.streetName}` : ''),
      addressLine2: existingAddress?.addressLine2 || '',
      suburb: existingAddress?.suburb || '',
      city: existingAddress?.city || existingAddress?.cityTown || '',
      province: existingAddress?.province || '',
      postalCode: existingAddress?.postalCode || '',
      country: existingAddress?.country || 'South Africa',
    },
  })

  // Reset form when entering edit mode with existing address data
  useEffect(() => {
    if (isEditing && existingAddress) {
      reset({
        addressLine1: existingAddress.addressLine1 || (existingAddress.streetNumber && existingAddress.streetName ? `${existingAddress.streetNumber} ${existingAddress.streetName}` : ''),
        addressLine2: existingAddress.addressLine2 || '',
        suburb: existingAddress.suburb || '',
        city: existingAddress.city || existingAddress.cityTown || '',
        province: existingAddress.province || '',
        postalCode: existingAddress.postalCode || '',
        country: existingAddress.country || 'South Africa',
      })
    }
  }, [isEditing, existingAddress, reset])

  const onSubmit = async (data: AddressInput) => {
    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)

    try {
      if (existingAddress && existingAddress.id) {
        await updateUserAddress(existingAddress.id, data)
      } else {
        await createUserAddress(data)
      }
      
      setSubmitSuccess(true)
      reset()
      onSuccess?.() // Reload data first
      
      // Exit edit mode after parent has had time to reload data
      setTimeout(() => {
        setIsEditing(false)
      }, 100)
      
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to save address:', error)
      setSubmitError(error instanceof Error ? error.message : 'Failed to save address')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Check if address is complete (has all required fields)
  const isAddressComplete = existingAddress && 
    (existingAddress.addressLine1 || (existingAddress.streetNumber && existingAddress.streetName)) &&
    (existingAddress.city || existingAddress.cityTown) &&
    existingAddress.province &&
    existingAddress.postalCode &&
    existingAddress.country

  // Get border color based on completion status
  const getBorderColor = () => {
    if (!existingAddress) return 'border-border'
    if (isAddressComplete) return 'border-green-500'
    return 'border-orange-500'
  }

  return (
    <Card className={cn(getBorderColor(), 'border-2')}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <CardTitle>Postal Address</CardTitle>
              <CardDescription>
                Add your residential or postal address for fleet records
              </CardDescription>
            </div>
            {existingAddress && isAddressComplete && !isEditing && (
              <div className="flex items-center gap-1 text-green-600">
                <Lock className="h-4 w-4" />
                <span className="text-xs font-medium">Complete</span>
              </div>
            )}
          </div>
          {existingAddress && !isEditing && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* View Mode */}
        {existingAddress && !isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Street Address</span>
                <p className="font-medium">{existingAddress.addressLine1 || (existingAddress.streetNumber && existingAddress.streetName ? `${existingAddress.streetNumber} ${existingAddress.streetName}` : '-')}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Apartment / Suite</span>
                <p className="font-medium">{existingAddress.addressLine2 || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Suburb / Neighborhood</span>
                <p className="font-medium">{existingAddress.suburb || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">City / Town</span>
                <p className="font-medium">{existingAddress.city || existingAddress.cityTown || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Province</span>
                <p className="font-medium">{existingAddress.province || '-'}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Postal Code</span>
                <p className="font-medium">{existingAddress.postalCode || '-'}</p>
              </div>
              <div className="md:col-span-2">
                <span className="text-sm text-muted-foreground">Country</span>
                <p className="font-medium">{existingAddress.country || '-'}</p>
              </div>
            </div>
          </div>
        ) : (
          /* Edit Mode */
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Success Message */}
            {submitSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">Address saved successfully!</span>
              </div>
            )}

            {/* Error Message */}
            {submitError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm font-medium">{submitError}</span>
              </div>
            )}

            {/* Address Line 1 */}
            <div className="space-y-2">
              <Label htmlFor="addressLine1">Street Address *</Label>
              <Input
                {...register('addressLine1')}
                id="addressLine1"
                placeholder="123 Main Street"
                className="h-12"
                autoComplete="street-address"
              />
              {errors.addressLine1 && (
                <p className="text-sm text-destructive">{errors.addressLine1.message}</p>
              )}
            </div>

            {/* Address Line 2 */}
            <div className="space-y-2">
              <Label htmlFor="addressLine2">Apartment / Suite (Optional)</Label>
              <Input
                {...register('addressLine2')}
                id="addressLine2"
                placeholder="Apt 4B"
                className="h-12"
                autoComplete="address-line2"
              />
            </div>

            {/* Suburb */}
            <div className="space-y-2">
              <Label htmlFor="suburb">Suburb / Neighborhood (Optional)</Label>
              <Input
                {...register('suburb')}
                id="suburb"
                placeholder="e.g., Rosebank"
                className="h-12"
                autoComplete="address-level3"
              />
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="city">City / Town *</Label>
              <Input
                {...register('city')}
                id="city"
                placeholder="Johannesburg"
                className="h-12"
                autoComplete="address-level2"
              />
              {errors.city && (
                <p className="text-sm text-destructive">{errors.city.message}</p>
              )}
            </div>

            {/* Province */}
            <div className="space-y-2">
              <Label htmlFor="province">Province *</Label>
              <select
                {...register('province')}
                id="province"
                className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                autoComplete="address-level1"
              >
                <option value="">Select province</option>
                {SOUTH_AFRICAN_PROVINCES.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
              {errors.province && (
                <p className="text-sm text-destructive">{errors.province.message}</p>
              )}
            </div>

            {/* Postal Code */}
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code *</Label>
              <Input
                {...register('postalCode')}
                id="postalCode"
                placeholder="2000"
                className="h-12"
                autoComplete="postal-code"
              />
              {errors.postalCode && (
                <p className="text-sm text-destructive">{errors.postalCode.message}</p>
              )}
            </div>

            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Input
                {...register('country')}
                id="country"
                placeholder="South Africa"
                className="h-12"
                autoComplete="country-name"
              />
              {errors.country && (
                <p className="text-sm text-destructive">{errors.country.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 h-12"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Address'}
              </Button>
              {existingAddress && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-12"
                  onClick={() => setIsEditing(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
