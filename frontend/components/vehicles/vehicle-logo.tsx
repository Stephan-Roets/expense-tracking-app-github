import React from 'react';
import { Car } from 'lucide-react';
import { getManufacturerLogo } from '@/lib/utils/vehicle-logos';
import { cn } from '@/lib/utils';

export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface VehicleLogoProps {
  make: string;
  size?: LogoSize;
  className?: string;
  fallback?: React.ReactNode;
}

const sizeClasses: Record<LogoSize, string> = {
  xs: 'h-4 w-4',
  sm: 'h-5 w-5',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-10 w-10',
};

/**
 * VehicleLogo Component
 * 
 * Displays the manufacturer logo for a vehicle make.
 * Falls back to a generic Car icon if no logo is available locally.
 * 
 * @param make - Vehicle make (e.g., "Toyota", "toyota", "TOYOTA")
 * @param size - Logo size (xs, sm, md, lg, xl)
 * @param className - Additional CSS classes
 * @param fallback - Custom fallback component (defaults to Car icon)
 */
export function VehicleLogo({ 
  make, 
  size = 'md', 
  className,
  fallback
}: VehicleLogoProps) {
  const logoUrl = getManufacturerLogo(make);

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${make} logo`}
        className={cn(sizeClasses[size], className)}
        onError={(e) => {
          // Fallback to Car icon if image fails to load
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  // Fallback to Car icon or custom fallback
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <Car className={cn(sizeClasses[size], 'text-muted-foreground', className)} />
  );
}
