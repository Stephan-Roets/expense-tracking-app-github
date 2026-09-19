"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-4 page-enter">
      {/* Welcome skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 skeleton-shimmer" />
        <Skeleton className="h-4 w-40 skeleton-shimmer" />
      </div>

      {/* Vehicle selector skeleton */}
      <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3">
        <Skeleton className="h-4 w-4 rounded skeleton-shimmer" />
        <Skeleton className="h-4 w-20 skeleton-shimmer" />
        <Skeleton className="h-9 flex-1 rounded-lg skeleton-shimmer" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-20 skeleton-shimmer" />
                  <Skeleton className="h-8 w-24 skeleton-shimmer" />
                  <Skeleton className="h-3 w-32 skeleton-shimmer" />
                </div>
                <Skeleton className="h-10 w-10 rounded-xl skeleton-shimmer" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts section skeleton */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-40 skeleton-shimmer" />
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-40 skeleton-shimmer" />
                <Skeleton className="h-3 w-32 skeleton-shimmer" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[200px] w-full rounded-lg skeleton-shimmer" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Vehicles section skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32 skeleton-shimmer" />
          <Skeleton className="h-9 w-28 rounded-lg skeleton-shimmer" />
        </div>
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="flex items-center gap-3 p-4">
              <Skeleton className="h-10 w-10 rounded-xl skeleton-shimmer" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40 skeleton-shimmer" />
                <Skeleton className="h-3 w-56 skeleton-shimmer" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full skeleton-shimmer" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Expense categories skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-28 skeleton-shimmer" />
          <Skeleton className="h-3 w-24 skeleton-shimmer" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="border-border/50">
              <CardContent className="flex items-center gap-3 p-4">
                <Skeleton className="h-10 w-10 rounded-xl skeleton-shimmer" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-20 skeleton-shimmer" />
                  <Skeleton className="h-3 w-32 skeleton-shimmer" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent activity skeleton */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg skeleton-shimmer" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-32 skeleton-shimmer" />
              <Skeleton className="h-3 w-24 skeleton-shimmer" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                <Skeleton className="h-11 w-11 rounded-xl skeleton-shimmer" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-32 skeleton-shimmer" />
                    <Skeleton className="h-4 w-12 rounded-full skeleton-shimmer" />
                  </div>
                  <Skeleton className="h-3 w-40 skeleton-shimmer" />
                </div>
                <Skeleton className="h-4 w-20 skeleton-shimmer" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
