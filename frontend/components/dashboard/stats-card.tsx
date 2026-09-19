"use client"

import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string
  subtitle?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive'
  className?: string
}

const variantStyles = {
  default: {
    icon: 'bg-muted text-muted-foreground',
    card: '',
    glow: '',
  },
  primary: {
    icon: 'bg-primary/15 text-primary',
    card: 'hover:border-primary/30',
    glow: 'group-hover:shadow-[0_0_20px_-5px_var(--primary)]',
  },
  success: {
    icon: 'bg-success/15 text-success',
    card: 'hover:border-success/30',
    glow: 'group-hover:shadow-[0_0_20px_-5px_var(--success)]',
  },
  warning: {
    icon: 'bg-warning/15 text-warning',
    card: 'hover:border-warning/30',
    glow: 'group-hover:shadow-[0_0_20px_-5px_var(--warning)]',
  },
  destructive: {
    icon: 'bg-destructive/15 text-destructive',
    card: 'hover:border-destructive/30',
    glow: 'group-hover:shadow-[0_0_20px_-5px_var(--destructive)]',
  },
}

export function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  variant = 'default',
  className,
}: StatsCardProps) {
  const styles = variantStyles[variant]
  
  return (
    <Card className={cn(
      "group border-border/50 transition-all duration-300 ease-out hover:-translate-y-0.5",
      styles.card,
      styles.glow,
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-medium text-muted-foreground truncate">
              {title}
            </p>
            <p className="text-2xl font-bold tracking-tight animate-number">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {subtitle}
              </p>
            )}
            {trend && (
              <div className={cn(
                'flex items-center gap-1 text-xs font-medium',
                trend.isPositive ? 'text-success' : 'text-destructive'
              )}>
                {trend.isPositive ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
                <span className="text-muted-foreground font-normal">vs last month</span>
              </div>
            )}
          </div>
          <div className={cn(
            'stat-icon shrink-0 rounded-xl',
            styles.icon
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
