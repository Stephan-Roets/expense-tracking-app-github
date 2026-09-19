'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Receipt,
  Car,
  BookOpen,
  Settings,
  Plus,
  Building2,
  Calculator,
} from 'lucide-react'
import { cn, getSarsTaxYear } from '@/lib/utils'
import { useAuth } from '@/lib/contexts/auth-context'
import { UserRole } from '@/lib/types/database'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

function getNavItems(role: UserRole): NavItem[] {
  const isDriver = role === UserRole.DRIVER;
  const isAssistant = role === UserRole.ASSISTANT;

  const items: NavItem[] = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/dashboard/expenses', label: isDriver || isAssistant ? 'My Expenses' : 'Expenses', icon: Receipt },
    { href: '/dashboard/vehicles', label: isDriver || isAssistant ? 'My Vehicle' : 'Vehicles', icon: Car },
    { href: '/dashboard/logbook', label: isDriver || isAssistant ? 'My Logbook' : 'Logbook', icon: BookOpen },
    { href: '/dashboard/tax-summary', label: 'Tax', icon: Calculator },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ]

  if (!isDriver && !isAssistant) {
    items.splice(5, 0, { href: '/dashboard/organization', label: 'Org', icon: Building2 })
  }

  return items
}

export function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { dateRange } = getSarsTaxYear()
  const role = user?.role ?? UserRole.DRIVER
  const navItems = getNavItems(role)
  const [isLandscape, setIsLandscape] = useState(false)

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight)
    }

    checkOrientation()
    window.addEventListener('resize', checkOrientation)
    window.addEventListener('orientationchange', checkOrientation)

    return () => {
      window.removeEventListener('resize', checkOrientation)
      window.removeEventListener('orientationchange', checkOrientation)
    }
  }, [])

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card safe-bottom md:hidden">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center py-2 px-3 touch-target transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className={cn('h-6 w-6', isActive && 'stroke-[2.5]')} />
                <span className="text-xs mt-1 font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
      {/* SARS Tax Year indicator for mobile landscape mode only */}
      {isLandscape && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-4 md:hidden">
          <div className="bg-primary/5 rounded-lg px-3 py-2 border border-primary/10">
            <p className="text-xs font-medium text-primary">SARS Tax Year</p>
            <p className="text-xs text-muted-foreground">{dateRange}</p>
          </div>
        </div>
      )}
    </>
  )
}

