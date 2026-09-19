"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AddVehicleForm } from "@/components/vehicles/add-vehicle-form";
import { Truck } from "lucide-react";
import { useAuth } from "@/lib/contexts/auth-context";
import { UserRole } from "@/lib/types/database";

export function AddVehiclePageContent() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show loading or redirect while checking role
  if (user?.role === UserRole.RENTAL_CUSTOMER) {
    return null;
  }

  useEffect(() => {
    // Prevent RENTAL_CUSTOMER from accessing add vehicle page
    if (!isLoading && user?.role === UserRole.RENTAL_CUSTOMER) {
      router.replace("/dashboard");
    }
  }, [user, router, isLoading]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 pb-24">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center" suppressHydrationWarning>
          <Truck className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Vehicle Expense</h1>
          <p className="text-xs text-muted-foreground">SA Fleet Management</p>
        </div>
      </div>

      <AddVehicleForm />

      <p className="mt-8 text-xs text-muted-foreground text-center max-w-sm">
        After adding your vehicle, you will be asked to photograph your odometer
        as required by SARS for logbook compliance.
      </p>
    </div>
  )
}
