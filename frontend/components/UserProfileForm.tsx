'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ImageCropModal } from '@/components/ui/image-crop-modal'
import { Camera, CheckCircle2, AlertCircle, Edit2, Trash2, Lock } from 'lucide-react'
import { createUserProfile, updateUserProfile } from '@/lib/api/client'
import { useAuth } from '@/lib/contexts/auth-context'

const userProfileSchema = z.object({
  idNumber: z.string().min(1, 'ID Number is required'),
  homePhone: z.string().optional(),
  workPhone: z.string().optional(),
  mobilePhone: z.string().min(1, 'Mobile phone is required'),
  driversLicenseNumber: z.string().min(1, 'Driver license number is required'),
  driversLicenseExpiry: z.string().min(1, 'License expiry date is required'),
})

type UserProfileInput = z.infer<typeof userProfileSchema>

interface UserProfileFormProps {
  existingProfile?: {
    idNumber?: string
    homePhone?: string
    workPhone?: string
    mobilePhone?: string
    driversLicenseNumber?: string
    driversLicenseExpiry?: string
    driversLicenseFrontUrl?: string
    driversLicenseBackUrl?: string
  }
  onSuccess?: () => void
}

export function UserProfileForm({ existingProfile, onSuccess }: UserProfileFormProps) {
  const { user, refreshUser } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(!existingProfile) // Start in edit mode if no profile exists
  
  // Update edit mode when existingProfile changes
  useEffect(() => {
    if (existingProfile) {
      setIsEditing(false)
    } else {
      setIsEditing(true)
    }
  }, [existingProfile])
  
  // Driver license upload state
  const [selectedLicenseFront, setSelectedLicenseFront] = useState<File | null>(null)
  const [selectedLicenseBack, setSelectedLicenseBack] = useState<File | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null)
  const [expiryInput, setExpiryInput] = useState("")

  // Initialize expiry input from watched value when in edit mode
  useEffect(() => {
    if (existingProfile?.driversLicenseExpiry) {
      const date = new Date(existingProfile.driversLicenseExpiry)
      setExpiryInput(format(date, 'yyyy-MM-dd'))
    }
  }, [existingProfile])
  
  const [cropTarget, setCropTarget] = useState<'front' | 'back'>('front')
  const [isUploadingLicense, setIsUploadingLicense] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UserProfileInput>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: existingProfile || {
      idNumber: '',
      homePhone: '',
      workPhone: '',
      mobilePhone: '',
      driversLicenseNumber: '',
      driversLicenseExpiry: '',
    },
  })
  
  // Reset form when entering edit mode with existing profile data
  useEffect(() => {
    if (isEditing && existingProfile) {
      reset({
        idNumber: existingProfile.idNumber || '',
        homePhone: existingProfile.homePhone || '',
        workPhone: existingProfile.workPhone || '',
        mobilePhone: existingProfile.mobilePhone || '',
        driversLicenseNumber: existingProfile.driversLicenseNumber || '',
        driversLicenseExpiry: existingProfile.driversLicenseExpiry || '',
      })
    }
  }, [isEditing, existingProfile, reset])

  const handleLicenseFrontSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedLicenseFront(file)
      setCropTarget('front')
      setShowCropModal(true)
    }
  }

  const handleLicenseBackSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedLicenseBack(file)
      setCropTarget('back')
      setShowCropModal(true)
    }
  }

  const handleCropConfirm = async (croppedFile: File) => {
    setIsUploadingLicense(true)
    try {
      const formData = new FormData()
      formData.append('file', croppedFile)
      formData.append('type', cropTarget === 'front' ? 'front' : 'back')
      
      // Upload to backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/driver-license-images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
        },
        body: formData,
      })
      
      if (!response.ok) {
        throw new Error('Failed to upload image')
      }
      
      const data = await response.json()
      
      if (cropTarget === 'front') {
        setSelectedLicenseFront(croppedFile)
        // Store the URL in a ref or state to be used when saving profile
        ;(window as any).tempLicenseFrontUrl = data.url
      } else {
        setSelectedLicenseBack(croppedFile)
        ;(window as any).tempLicenseBackUrl = data.url
      }
      
      setShowCropModal(false)
    } catch (error) {
      console.error('Failed to upload license image:', error)
      setSubmitError('Failed to upload license image')
    } finally {
      setIsUploadingLicense(false)
    }
  }

  // Convert relative storage URLs to absolute URLs
  const getAbsoluteUrl = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    // Remove /api/v1 prefix since API_URL already includes it
    const storagePath = url.replace('/api/v1', '');
    return `${process.env.NEXT_PUBLIC_API_URL}${storagePath}`;
  }

  const onSubmit = async (data: UserProfileInput) => {
    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)

    try {
      // Include uploaded image URLs if available
      const profileData = {
        ...data,
        driversLicenseNumber: data.driversLicenseNumber,
        driversLicenseExpiry: data.driversLicenseExpiry,
        driversLicenseFrontUrl: (window as any).tempLicenseFrontUrl || existingProfile?.driversLicenseFrontUrl,
        driversLicenseBackUrl: (window as any).tempLicenseBackUrl || existingProfile?.driversLicenseBackUrl,
      }
      
      if (existingProfile) {
        await updateUserProfile(profileData)
      } else {
        await createUserProfile(profileData)
      }
      
      setSubmitSuccess(true)
      setIsEditing(false) // Exit edit mode after successful save
      onSuccess?.()
      
      // Clear temporary URLs
      ;(window as any).tempLicenseFrontUrl = null
      ;(window as any).tempLicenseBackUrl = null
      
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to save user profile:', error)
      setSubmitError(error instanceof Error ? error.message : 'Failed to save profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Check if profile is complete (has all required fields)
  const isProfileComplete = existingProfile && 
    existingProfile.idNumber && 
    existingProfile.mobilePhone &&
    existingProfile.driversLicenseNumber &&
    existingProfile.driversLicenseExpiry &&
    existingProfile.driversLicenseFrontUrl &&
    existingProfile.driversLicenseBackUrl

  // Get border color based on completion status
  const getBorderColor = () => {
    if (!existingProfile) return 'border-border'
    if (isProfileComplete) return 'border-green-500'
    return 'border-orange-500'
  }

  return (
    <>
      <Card className={cn(getBorderColor(), 'border-2')}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div>
                <CardTitle>User Credentials</CardTitle>
                <CardDescription>
                  Complete your profile information for fleet management
                </CardDescription>
              </div>
              {existingProfile && isProfileComplete && !isEditing && (
                <div className="flex items-center gap-1 text-green-600">
                  <Lock className="h-4 w-4" />
                  <span className="text-xs font-medium">Complete</span>
                </div>
              )}
            </div>
            {existingProfile && !isEditing && (
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
          {existingProfile && !isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">ID Number</span>
                  <p className="font-medium">{existingProfile.idNumber || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Mobile Phone</span>
                  <p className="font-medium">{existingProfile.mobilePhone || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Home Phone</span>
                  <p className="font-medium">{existingProfile.homePhone || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Work Phone</span>
                  <p className="font-medium">{existingProfile.workPhone || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Driver License Number</span>
                  <p className="font-medium">{existingProfile.driversLicenseNumber || '-'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">License Expiry Date</span>
                  <p className="font-medium">
                    {existingProfile.driversLicenseExpiry 
                      ? format(new Date(existingProfile.driversLicenseExpiry), 'yyyy-MM-dd')
                      : '-'}
                  </p>
                </div>
              </div>

              {/* Driver License Images */}
              <div className="space-y-4">
                <p className="text-sm font-medium">Driver License Photos</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-sm">Front of License</span>
                    {existingProfile.driversLicenseFrontUrl ? (
                      <div className="relative">
                        <img
                          src={getAbsoluteUrl(existingProfile.driversLicenseFrontUrl) || undefined}
                          alt="License Front"
                          className="h-32 w-full object-cover rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/30">
                        <p className="text-sm text-muted-foreground">Not uploaded</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm">Back of License</span>
                    {existingProfile.driversLicenseBackUrl ? (
                      <div className="relative">
                        <img
                          src={getAbsoluteUrl(existingProfile.driversLicenseBackUrl) || undefined}
                          alt="License Back"
                          className="h-32 w-full object-cover rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/30">
                        <p className="text-sm text-muted-foreground">Not uploaded</p>
                      </div>
                    )}
                  </div>
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
                  <span className="text-sm font-medium">Profile saved successfully!</span>
                </div>
              )}

              {/* Error Message */}
              {submitError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">{submitError}</span>
                </div>
              )}

              {/* ID Number */}
              <div className="space-y-2">
                <Label htmlFor="idNumber">ID Number</Label>
                <Input
                  {...register('idNumber')}
                  id="idNumber"
                  placeholder="Enter your South African ID number"
                  className="h-12"
                  autoComplete="off"
                />
                {errors.idNumber && (
                  <p className="text-sm text-destructive">{errors.idNumber.message}</p>
                )}
              </div>

              {/* Phone Numbers */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="homePhone">Home Phone</Label>
                  <Input
                    {...register('homePhone')}
                    id="homePhone"
                    placeholder="012 345 6789"
                    className="h-12"
                    autoComplete="tel home"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workPhone">Work Phone</Label>
                  <Input
                    {...register('workPhone')}
                    id="workPhone"
                    placeholder="012 345 6789"
                    className="h-12"
                    autoComplete="tel work"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobilePhone">Mobile Phone *</Label>
                  <Input
                    {...register('mobilePhone')}
                    id="mobilePhone"
                    placeholder="082 123 4567"
                    className="h-12"
                    autoComplete="tel mobile"
                  />
                  {errors.mobilePhone && (
                    <p className="text-sm text-destructive">{errors.mobilePhone.message}</p>
                  )}
                </div>
              </div>

              {/* Driver License Number */}
              <div className="space-y-2">
                <Label htmlFor="driversLicenseNumber">Driver License Number *</Label>
                <Input
                  {...register('driversLicenseNumber')}
                  id="driversLicenseNumber"
                  placeholder="Enter your driver license number"
                  className="h-12"
                  autoComplete="off"
                />
                {errors.driversLicenseNumber && (
                  <p className="text-sm text-destructive">{errors.driversLicenseNumber.message}</p>
                )}
              </div>

              {/* Driver License Expiry */}
              <div className="space-y-2">
                <Label htmlFor="driversLicenseExpiry">License Expiry Date *</Label>
                <Input
                  {...register('driversLicenseExpiry')}
                  id="driversLicenseExpiry"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{4}-\d{2}-\d{2}"
                  placeholder="YYYY-MM-DD"
                  value={expiryInput}
                  className="h-12"
                  autoComplete="off"
                  onChange={(e) => {
                    let value = e.target.value;
                    value = value.replace(/[^\d-]/g, '');
                    const digits = value.replace(/\D/g, '');
                    if (digits.length > 0) {
                      let formatted = digits.slice(0, 4);
                      if (digits.length > 4) {
                        formatted += '-' + digits.slice(4, 6);
                      }
                      if (digits.length > 6) {
                        formatted += '-' + digits.slice(6, 8);
                      }
                      value = formatted;
                    }
                    setExpiryInput(value);
                    if (value && value.length >= 4) {
                      const year = parseInt(value.slice(0, 4));
                      if (year < 1900 || year > 2099) {
                        return;
                      }
                    }
                    if (value.length === 10) {
                      const year = parseInt(value.slice(0, 4));
                      const month = parseInt(value.slice(5, 7));
                      const day = parseInt(value.slice(8, 10));
                      
                      // Validate month
                      if (month < 1 || month > 12) {
                        return;
                      }
                      
                      // Validate day based on month
                      const daysInMonth = new Date(year, month, 0).getDate();
                      if (day < 1 || day > daysInMonth) {
                        return;
                      }
                      
                      register('driversLicenseExpiry').onChange({ target: { value } });
                    }
                  }}
                  maxLength={10}
                />
                {errors.driversLicenseExpiry && (
                  <p className="text-sm text-destructive">{errors.driversLicenseExpiry.message}</p>
                )}
              </div>

              {/* Driver License Images */}
              <div className="space-y-4">
                <p className="text-sm font-medium">Driver License Photos</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Front of License */}
                  <div className="space-y-2">
                    <Label htmlFor="licenseFront">Front of License</Label>
                    <div className="relative">
                      <div className="h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/30">
                        {existingProfile?.driversLicenseFrontUrl || selectedLicenseFront ? (
                          <>
                            <img 
                              src={selectedLicenseFront ? URL.createObjectURL(selectedLicenseFront) : getAbsoluteUrl(existingProfile?.driversLicenseFrontUrl) || undefined}
                              alt="License Front"
                              className="h-full w-full object-cover rounded-lg"
                            />
                            {existingProfile?.driversLicenseFrontUrl && !selectedLicenseFront && (
                              <button
                                type="button"
                                onClick={() => setSelectedLicenseFront(null)}
                                className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="text-center">
                            <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Upload front</p>
                          </div>
                        )}
                      </div>
                      <label htmlFor="licenseFront" className="absolute inset-0 cursor-pointer">
                        <input
                          id="licenseFront"
                          name="licenseFront"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLicenseFrontSelect}
                          disabled={isUploadingLicense}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Back of License */}
                  <div className="space-y-2">
                    <Label htmlFor="licenseBack">Back of License</Label>
                    <div className="relative">
                      <div className="h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center bg-muted/30">
                        {existingProfile?.driversLicenseBackUrl || selectedLicenseBack ? (
                          <>
                            <img 
                              src={selectedLicenseBack ? URL.createObjectURL(selectedLicenseBack) : getAbsoluteUrl(existingProfile?.driversLicenseBackUrl) || undefined}
                              alt="License Back"
                              className="h-full w-full object-cover rounded-lg"
                            />
                            {existingProfile?.driversLicenseBackUrl && !selectedLicenseBack && (
                              <button
                                type="button"
                                onClick={() => setSelectedLicenseBack(null)}
                                className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="text-center">
                            <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Upload back</p>
                          </div>
                        )}
                      </div>
                      <label htmlFor="licenseBack" className="absolute inset-0 cursor-pointer">
                        <input
                          id="licenseBack"
                          name="licenseBack"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLicenseBackSelect}
                          disabled={isUploadingLicense}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1 h-12"
                  disabled={isSubmitting || isUploadingLicense}
                >
                  {isSubmitting ? 'Saving...' : 'Save Profile'}
                </Button>
                {existingProfile && (
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

      {/* Image Crop Modal */}
      {(selectedLicenseFront || selectedLicenseBack) && (
        <ImageCropModal
          imageFile={cropTarget === 'front' ? selectedLicenseFront! : selectedLicenseBack!}
          mode="receipt"
          onConfirm={handleCropConfirm}
          onCancel={() => {
            setShowCropModal(false)
            setCropTarget('front')
            setSelectedLicenseFront(null)
            setSelectedLicenseBack(null)
          }}
          isOpen={showCropModal}
        />
      )}
    </>
  )
}
