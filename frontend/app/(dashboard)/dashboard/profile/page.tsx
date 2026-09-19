'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, User, Mail, Shield, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Camera, X, Edit2, Save } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/lib/contexts/auth-context'
import { api, apiForm, getUserProfile, getUserAddress } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { ImageCropModal } from '@/components/ui/image-crop-modal'
import { UserProfileForm } from '@/components/UserProfileForm'
import { AddressForm } from '@/components/AddressForm'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type ChangePasswordInput = z.infer<typeof changePasswordSchema>

export default function ProfilePage() {
  const router = useRouter()
  const { user, refreshUser, isFleetMode } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // Profile edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState(false)
  
  // Photo upload state
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [showCropModal, setShowCropModal] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

  // Fleet credentials state
  const [userProfile, setUserProfile] = useState<any>(null)
  const [userAddress, setUserAddress] = useState<any>(null)
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(false)
  const [isEditingCredentials, setIsEditingCredentials] = useState(false)

  const loadFleetCredentials = async () => {
    setIsLoadingCredentials(true)
    try {
      const [profileRes, addressRes] = await Promise.all([
        getUserProfile().catch(() => ({ data: null })),
        getUserAddress().catch(() => ({ data: null })),
      ])
      setUserProfile(profileRes.data)
      setUserAddress(addressRes.data)
    } catch (error) {
      console.error('Failed to load fleet credentials:', error)
    } finally {
      setIsLoadingCredentials(false)
    }
  }

  // Load fleet credentials on mount
  useEffect(() => {
    if (isFleetMode) {
      loadFleetCredentials()
    }
  }, [isFleetMode])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  })

  const handleChangePassword = async (data: ChangePasswordInput) => {
    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)

    try {
      await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })

      setSubmitSuccess(true)
      reset()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedPhoto(file)
      setShowCropModal(true)
    }
  }

  const handleCropConfirm = async (croppedFile: File) => {
    setIsUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('file', croppedFile)
      
      await apiForm.post('/users/profile-photo', formData)
      
      await refreshUser()
      setShowCropModal(false)
      setSelectedPhoto(null)
    } catch (error) {
      console.error('Failed to upload photo:', error)
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handleRemovePhoto = async () => {
    setIsUploadingPhoto(true)
    try {
      await api.delete('/users/profile-photo')
      await refreshUser()
    } catch (error) {
      console.error('Failed to remove photo:', error)
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handleStartEditProfile = () => {
    setEditFirstName(user?.firstName || '')
    setEditLastName(user?.lastName || '')
    setIsEditingProfile(true)
    setProfileUpdateSuccess(false)
  }

  const handleUpdateProfile = async () => {
    if (!editFirstName.trim() || !editLastName.trim()) return

    setIsUpdatingProfile(true)
    setProfileUpdateSuccess(false)
    try {
      await api.put('/users/me', {
        firstName: editFirstName.trim(),
        lastName: editLastName.trim(),
      })
      
      await refreshUser()
      setProfileUpdateSuccess(true)
      setIsEditingProfile(false)
      
      setTimeout(() => setProfileUpdateSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to update profile:', error)
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'default'
      case 'MANAGER':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <div className="container mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 px-3 py-2 sm:gap-3 sm:px-4 sm:py-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8 sm:h-9 sm:w-9">
          <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
        <div>
          <h1 className="text-sm font-semibold sm:text-base">Profile</h1>
          <p className="text-[10px] text-muted-foreground sm:text-xs">Manage your account details</p>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* User Details Card */}
        <Card className="rounded-xl shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              User Details
            </CardTitle>
            <CardDescription>
              Your account information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar and Name */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                  {user?.profilePhotoUrl ? (
                    <img 
                      src={user.profilePhotoUrl} 
                      alt="Profile" 
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                  )}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <label htmlFor="photo-upload" className="cursor-pointer sr-only">
                    Upload Profile Photo
                  </label>
                  <button
                    type="button"
                    onClick={() => document.getElementById('photo-upload')?.click()}
                    className="cursor-pointer"
                    aria-label="Upload Profile Photo"
                  >
                    <Camera className="h-5 w-5 text-white" />
                  </button>
                  <input
                    id="photo-upload"
                    name="photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoSelect}
                    disabled={isUploadingPhoto}
                  />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-lg">
                  {user?.firstName} {user?.lastName}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={getRoleBadgeVariant(user?.role || '')}>
                    {user?.role}
                  </Badge>
                </div>
              </div>
              {user?.profilePhotoUrl && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemovePhoto}
                  disabled={isUploadingPhoto}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <Separator />

            {/* Details List */}
            <div className="space-y-4">
              {profileUpdateSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">Profile updated successfully!</span>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  {isEditingProfile ? (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="editFirstName">First Name</Label>
                        <Input
                          id="editFirstName"
                          name="editFirstName"
                          value={editFirstName}
                          onChange={(e) => setEditFirstName(e.target.value)}
                          placeholder="First name"
                          className="h-8"
                          disabled={isUpdatingProfile}
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="editLastName">Last Name</Label>
                        <Input
                          id="editLastName"
                          name="editLastName"
                          value={editLastName}
                          onChange={(e) => setEditLastName(e.target.value)}
                          placeholder="Last name"
                          className="h-8"
                          disabled={isUpdatingProfile}
                        />
                      </div>
                      <Button
                        size="icon"
                        className="h-8 w-8 mt-6"
                        onClick={handleUpdateProfile}
                        disabled={isUpdatingProfile || !editFirstName.trim() || !editLastName.trim()}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 mt-6"
                        onClick={() => setIsEditingProfile(false)}
                        disabled={isUpdatingProfile}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={handleStartEditProfile}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Email Address</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Role</p>
                  <p className="font-medium capitalize">{user?.role?.toLowerCase()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fleet Credentials - Only shown for fleet mode */}
        {isFleetMode && (
          <>
            <UserProfileForm 
              existingProfile={userProfile}
              onSuccess={loadFleetCredentials}
            />
            <AddressForm 
              existingAddress={userAddress}
              onSuccess={loadFleetCredentials}
            />
          </>
        )}

        {/* Change Password Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(handleChangePassword)} className="space-y-4">
              {/* Success Message */}
              {submitSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-medium">Password changed successfully!</span>
                </div>
              )}

              {/* Error Message */}
              {submitError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">{submitError}</span>
                </div>
              )}

              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Input
                    {...register('currentPassword')}
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="Enter current password"
                    className="h-12 pr-10"
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-10 w-10"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.currentPassword && (
                  <p className="text-sm text-destructive">{errors.currentPassword.message}</p>
                )}
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    {...register('newPassword')}
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    className="h-12 pr-10"
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-10 w-10"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.newPassword && (
                  <p className="text-sm text-destructive">{errors.newPassword.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Minimum 8 characters with uppercase, lowercase, and a number
                </p>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    {...register('confirmPassword')}
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    className="h-12 pr-10"
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-10 w-10"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Changing Password...' : 'Change Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Photo Crop Modal */}
      {selectedPhoto && (
        <ImageCropModal
          imageFile={selectedPhoto}
          mode="receipt"
          onConfirm={handleCropConfirm}
          onCancel={() => {
            setShowCropModal(false)
            setSelectedPhoto(null)
          }}
          isOpen={showCropModal}
        />
      )}
    </div>
  )
}
