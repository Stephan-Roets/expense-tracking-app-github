'use client'

import { useEffect, useState } from 'react'
import { 
  Fuel, 
  Wrench, 
  Droplets, 
  CircleDot, 
  ChevronRight,
  Sparkles,
  Shield,
  MapPin,
  CreditCard,
  FileCheck,
  Car,
  IdCard,
  MoreHorizontal,
  type LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ExpenseCategory, EXPENSE_CATEGORY_LABELS, UserRole } from '@/lib/types/database'
import { getExpenseCategories } from '@/lib/api/client'
import { useAuth } from '@/lib/contexts/auth-context'

interface ExpenseTypeOption {
  category: ExpenseCategory
  title: string
  description: string
  icon: LucideIcon
  bgColor: string
  iconColor: string
}

// Icon mapping for expense categories
const categoryIcons: Record<ExpenseCategory, LucideIcon> = {
  [ExpenseCategory.FUEL_LOG]: Fuel,
  [ExpenseCategory.MECHANIC_SERVICE]: Wrench,
  [ExpenseCategory.MAINTENANCE_TOPUP]: Droplets,
  [ExpenseCategory.TIRES]: CircleDot,
  [ExpenseCategory.CAR_WASH]: Sparkles,
  [ExpenseCategory.INSURANCE_PREMIUM]: Shield,
  [ExpenseCategory.VEHICLE_TRACKING]: MapPin,
  [ExpenseCategory.ETOLL_SANRAL]: CreditCard,
  [ExpenseCategory.LICENSE_RENEWAL]: FileCheck,
  [ExpenseCategory.PERSONAL_LICENSE]: IdCard,
  [ExpenseCategory.ROADWORTHY]: Car,
  [ExpenseCategory.OTHER_FIXED]: MoreHorizontal,
}

// Color mapping for expense categories
const categoryColors: Record<ExpenseCategory, { bgColor: string; iconColor: string }> = {
  [ExpenseCategory.FUEL_LOG]: { bgColor: 'bg-chart-1/10 hover:bg-chart-1/20', iconColor: 'text-chart-1' },
  [ExpenseCategory.CAR_WASH]: { bgColor: 'bg-sky-500/10 hover:bg-sky-500/20', iconColor: 'text-sky-500' },
  [ExpenseCategory.MECHANIC_SERVICE]: { bgColor: 'bg-chart-3/10 hover:bg-chart-3/20', iconColor: 'text-chart-3' },
  [ExpenseCategory.MAINTENANCE_TOPUP]: { bgColor: 'bg-chart-2/10 hover:bg-chart-2/20', iconColor: 'text-chart-2' },
  [ExpenseCategory.TIRES]: { bgColor: 'bg-chart-5/10 hover:bg-chart-5/20', iconColor: 'text-chart-5' },
  [ExpenseCategory.INSURANCE_PREMIUM]: { bgColor: 'bg-emerald-500/10 hover:bg-emerald-500/20', iconColor: 'text-emerald-500' },
  [ExpenseCategory.VEHICLE_TRACKING]: { bgColor: 'bg-violet-500/10 hover:bg-violet-500/20', iconColor: 'text-violet-500' },
  [ExpenseCategory.ETOLL_SANRAL]: { bgColor: 'bg-amber-500/10 hover:bg-amber-500/20', iconColor: 'text-amber-500' },
  [ExpenseCategory.LICENSE_RENEWAL]: { bgColor: 'bg-teal-500/10 hover:bg-teal-500/20', iconColor: 'text-teal-500' },
  [ExpenseCategory.PERSONAL_LICENSE]: { bgColor: 'bg-rose-500/10 hover:bg-rose-500/20', iconColor: 'text-rose-500' },
  [ExpenseCategory.ROADWORTHY]: { bgColor: 'bg-indigo-500/10 hover:bg-indigo-500/20', iconColor: 'text-indigo-500' },
  [ExpenseCategory.OTHER_FIXED]: { bgColor: 'bg-chart-4/10 hover:bg-chart-4/20', iconColor: 'text-chart-4' },
}

// Description mapping for expense categories
const categoryDescriptions: Record<ExpenseCategory, string> = {
  [ExpenseCategory.FUEL_LOG]: 'Diesel or Petrol purchase',
  [ExpenseCategory.CAR_WASH]: 'Car wash, full valet, engine clean',
  [ExpenseCategory.MECHANIC_SERVICE]: 'Workshop invoice, windscreen, glass',
  [ExpenseCategory.MAINTENANCE_TOPUP]: 'Oil, battery, fuses, brake fluid',
  [ExpenseCategory.TIRES]: 'Purchase and rotation tracking',
  [ExpenseCategory.INSURANCE_PREMIUM]: 'Vehicle insurance premiums',
  [ExpenseCategory.VEHICLE_TRACKING]: 'Vehicle tracking subscriptions',
  [ExpenseCategory.ETOLL_SANRAL]: 'SANRAL e-toll payments',
  [ExpenseCategory.LICENSE_RENEWAL]: 'Vehicle license disc renewal',
  [ExpenseCategory.PERSONAL_LICENSE]: "Driver's license & ID card renewal",
  [ExpenseCategory.ROADWORTHY]: 'Roadworthy certificate testing',
  [ExpenseCategory.OTHER_FIXED]: 'Parking, tolls, other vehicle costs',
}

interface ExpenseTypeSelectorProps {
  selectedCategory: ExpenseCategory | null
  onSelect: (category: ExpenseCategory) => void
}

export function ExpenseTypeSelector({ 
  selectedCategory, 
  onSelect 
}: ExpenseTypeSelectorProps) {
  const { user } = useAuth()
  const [expenseTypes, setExpenseTypes] = useState<ExpenseTypeOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await getExpenseCategories()
        const categories = (response as any).data || response
        
        if (Array.isArray(categories)) {
          let types: ExpenseTypeOption[] = categories.map((cat: string) => {
            const category = cat as ExpenseCategory
            const icon = categoryIcons[category] || MoreHorizontal
            const colors = categoryColors[category] || { bgColor: 'bg-muted', iconColor: 'text-muted-foreground' }
            
            return {
              category,
              title: EXPENSE_CATEGORY_LABELS[category] || category,
              description: categoryDescriptions[category] || '',
              icon,
              bgColor: colors.bgColor,
              iconColor: colors.iconColor,
            }
          })
          
          // RENTAL_CUSTOMER can only see FUEL_LOG
          if (user?.role === UserRole.RENTAL_CUSTOMER) {
            types = types.filter(type => type.category === ExpenseCategory.FUEL_LOG)
          }
          
          setExpenseTypes(types)
        }
      } catch (error) {
        console.error('Failed to fetch expense categories:', error)
        // Fallback to all categories if API fails
        let types: ExpenseTypeOption[] = Object.values(ExpenseCategory).map((category) => {
          const icon = categoryIcons[category] || MoreHorizontal
          const colors = categoryColors[category] || { bgColor: 'bg-muted', iconColor: 'text-muted-foreground' }
          
          return {
            category,
            title: EXPENSE_CATEGORY_LABELS[category] || category,
            description: categoryDescriptions[category] || '',
            icon,
            bgColor: colors.bgColor,
            iconColor: colors.iconColor,
          }
        })
        
        // RENTAL_CUSTOMER can only see FUEL_LOG
        if (user?.role === UserRole.RENTAL_CUSTOMER) {
          types = types.filter(type => type.category === ExpenseCategory.FUEL_LOG)
        }
        
        setExpenseTypes(types)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [user?.role])

  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">What type of expense?</h2>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-full h-20 rounded-xl border border-border animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">What type of expense?</h2>
      <div className="space-y-2">
        {expenseTypes.map((type) => {
          const Icon = type.icon
          const isSelected = selectedCategory === type.category

          return (
            <button
              key={type.category}
              type="button"
              onClick={() => onSelect(type.category)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl border transition-all touch-target',
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border hover:border-muted-foreground'
              )}
            >
              <div className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                type.bgColor
              )}>
                <Icon className={cn('h-5 w-5', type.iconColor)} />
              </div>

              <div className="flex-1 text-left">
                <h3 className="font-semibold text-sm">{type.title}</h3>
                <p className="text-xs text-muted-foreground">{type.description}</p>
              </div>

              <ChevronRight className={cn(
                'h-4 w-4 shrink-0 transition-colors',
                isSelected ? 'text-primary' : 'text-muted-foreground'
              )} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
