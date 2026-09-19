'use client'

import { AuthProvider, useAuth } from '@/lib/contexts/auth-context'
import { BottomNav } from '@/components/navigation/bottom-nav'
import { DashboardHeader } from '@/components/navigation/dashboard-header'
import { SidebarNav } from '@/components/navigation/sidebar-nav'
import { PasswordChangeWarningDialog } from '@/components/auth/password-change-warning-dialog'
import { useEffect, useState } from 'react'

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, isFleetMode } = useAuth()
  const [showPasswordWarning, setShowPasswordWarning] = useState(false)

  useEffect(() => {
    // Show password change warning only for fleet mode users with temporary passwords
    if (user && isFleetMode && !user.passwordChanged) {
      // Only show if user was invited by admin with temporary password
      setShowPasswordWarning(true)
    }
  }, [user, isFleetMode])

  return (
    <>
      <div className="flex min-h-screen flex-col bg-background">
        <DashboardHeader />
        <div className="flex flex-1">
          <SidebarNav />
          <main className="flex-1 pb-20 md:pb-0 md:pl-0 overflow-x-hidden w-full max-w-full">
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
      <PasswordChangeWarningDialog 
        isOpen={showPasswordWarning} 
        onClose={() => setShowPasswordWarning(false)} 
      />
    </>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <DashboardContent>{children}</DashboardContent>
    </AuthProvider>
  )
}
