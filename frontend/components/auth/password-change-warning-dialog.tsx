'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Lock, AlertTriangle, X } from 'lucide-react'
import Link from 'next/link'

interface PasswordChangeWarningDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function PasswordChangeWarningDialog({ isOpen, onClose }: PasswordChangeWarningDialogProps) {
  const handleDismiss = () => {
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-xl">Security Alert: Change Your Password</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <Alert className="bg-red-50 border-red-200">
            <Lock className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-sm text-red-900">
              <strong>Important:</strong> You are using a temporary password assigned by your administrator.
            </AlertDescription>
          </Alert>

          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              For your account security, you <strong>must change your password immediately</strong> after your first login.
            </p>
            
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <p className="font-medium text-foreground">Steps to change your password:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Click the button below to go to your Profile page</li>
                <li>Scroll down to the &quot;Change Password&quot; section</li>
                <li>Enter your current temporary password</li>
                <li>Enter and confirm your new secure password</li>
                <li>Click &quot;Change Password&quot; to save</li>
              </ol>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Link href="/dashboard/profile" onClick={onClose} className="w-full">
              <Button className="w-full h-12 bg-red-600 hover:bg-red-700">
                <Lock className="h-4 w-4 mr-2" />
                Change Password Now
              </Button>
            </Link>
            
            <Button 
              variant="outline" 
              onClick={handleDismiss}
              className="w-full h-12"
            >
              <X className="h-4 w-4 mr-2" />
              I'll do it later (Not Recommended)
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            You can always change your password from your Profile page
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
