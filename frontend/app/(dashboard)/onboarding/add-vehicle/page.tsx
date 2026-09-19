import { Suspense } from "react";
import { AddVehiclePageContent } from "./add-vehicle-page-content";

export const dynamic = 'force-dynamic'

export default function AddVehiclePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AddVehiclePageContent />
    </Suspense>
  )
}
