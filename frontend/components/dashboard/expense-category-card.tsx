'use client'

import Link from 'next/link'
import { type LucideIcon, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ExpenseCategoryCardProps {
  title: string
  description: string
  href: string
  icon: LucideIcon
  iconBgColor: string
  iconColor: string
  count?: number
  totalAmount?: string
}

export function ExpenseCategoryCard({
  title,
  description,
  href,
  icon: Icon,
  iconBgColor,
  iconColor,
  count,
  totalAmount
}: ExpenseCategoryCardProps) {
  return (
    <Link href={href}>
      <Card className="border-border/50 transition-colors hover:border-border hover:bg-muted/50 active:bg-muted">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
              iconBgColor
            )}>
              <Icon className={cn('h-6 w-6', iconColor)} />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{title}</h3>
                {count !== undefined && (
                  <span className="text-sm text-muted-foreground">
                    {count} entries
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {description}
              </p>
              {totalAmount && (
                <p className="mt-1 text-sm font-medium text-foreground">
                  {totalAmount}
                </p>
              )}
            </div>
            
            {/* Arrow */}
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
