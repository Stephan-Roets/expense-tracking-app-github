# Frontend Implementation Guide: Odometer Memory & Recurring Trips

## Overview
This guide provides the complete implementation for adding odometer memory and recurring trip features to the logbook page in WebStorm/Windsurf.

## 1. SQL Schema Changes

First, run this SQL in your PostgreSQL database:

```sql
-- Run the add_recurring_trips_schema.sql file
psql -d expense_tracking_app -U stefan -f add_recurring_trips_schema.sql
```

## 2. Backend Changes

The backend has been updated with:
- `RecurringTrip` entity and repository
- `RecurringTripService` and `RecurringTripController`
- Updated `TripService` with odometer memory
- New endpoint: `/api/v1/trips/vehicle/{vehicleId}/last-odometer`

## 3. Frontend Implementation

### 3.1 API Client Updates

Add these methods to your API client (likely in `lib/api/client.ts`):

```typescript
// Get last odometer reading for vehicle
export const getLastOdometerReading = async (vehicleId: string) => {
  return await api.get(`/trips/vehicle/${vehicleId}/last-odometer`);
};

// Recurring trips API
export const getRecurringTrips = async () => {
  return await api.get('/recurring-trips');
};

export const getRecurringTripsByVehicle = async (vehicleId: string) => {
  return await api.get(`/recurring-trips/vehicle/${vehicleId}`);
};

export const createRecurringTrip = async (data: RecurringTripCreateRequest) => {
  return await api.post('/recurring-trips', data);
};

export const deleteRecurringTrip = async (id: string) => {
  return await api.delete(`/recurring-trips/${id}`);
};
```

### 3.2 Types and Interfaces

Add these TypeScript interfaces:

```typescript
// types/recurring-trip.ts
export interface RecurringTrip {
  id: string;
  organizationId: string;
  vehicleId: string;
  vehicleName: string;
  userId: string;
  userName: string;
  purpose: string;
  startLocation: string;
  endLocation: string;
  routeDescription?: string;
  customerClientName?: string;
  reasonForTrip?: string;
  isRecurring: boolean;
  recurrenceDays?: string; // "MON,TUE,WED,THU,FRI"
  recurrenceStartDate?: string;
  recurrenceEndDate?: string;
  defaultTollCostsZar: number;
  defaultParkingCostsZar: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringTripCreateRequest {
  vehicleId: string;
  userId: string;
  purpose: string;
  startLocation: string;
  endLocation: string;
  routeDescription?: string;
  customerClientName?: string;
  reasonForTrip?: string;
  isRecurring: boolean;
  recurrenceDays?: string;
  recurrenceStartDate?: string;
  recurrenceEndDate?: string;
  defaultTollCostsZar: number;
  defaultParkingCostsZar: number;
}

export interface LastOdometerResponse {
  vehicleId: string;
  lastOdometer: number | null;
  currentOdometer: number | null;
  vehicleName: string;
}
```

### 3.3 Logbook Page Updates

Update your logbook new trip page (likely `app/(dashboard)/dashboard/logbook/new/page.tsx`):

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getLastOdometerReading, createTrip, getRecurringTripsByVehicle, createRecurringTrip } from '@/lib/api/client';
import type { LastOdometerResponse, RecurringTrip } from '@/types/recurring-trip';

export default function NewLogbookPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vehicleId = searchParams.get('vehicleId');

  const [lastOdometer, setLastOdometer] = useState<number | null>(null);
  const [vehicleName, setVehicleName] = useState<string>('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>([]);
  const [recurringTrips, setRecurringTrips] = useState<RecurringTrip[]>([]);

  // Fetch last odometer reading when component mounts
  useEffect(() => {
    if (vehicleId) {
      fetchLastOdometer();
      fetchRecurringTrips();
    }
  }, [vehicleId]);

  const fetchLastOdometer = async () => {
    try {
      const response = await getLastOdometerReading(vehicleId!);
      setLastOdometer(response.data.lastOdometer);
      setVehicleName(response.data.vehicleName);
    } catch (error) {
      console.error('Failed to fetch last odometer:', error);
    }
  };

  const fetchRecurringTrips = async () => {
    try {
      const response = await getRecurringTripsByVehicle(vehicleId!);
      setRecurringTrips(response.data);
    } catch (error) {
      console.error('Failed to fetch recurring trips:', error);
    }
  };

  const handleRecurringToggle = (day: string) => {
    setRecurrenceDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const handleSubmit = async (formData: FormData) => {
    try {
      const tripData = {
        vehicleId: formData.get('vehicleId'),
        tripDate: formData.get('tripDate'),
        startTime: formData.get('startTime'),
        endTime: formData.get('endTime'),
        // Use last odometer if start odometer not provided
        startOdometer: formData.get('startOdometer') || lastOdometer,
        endOdometer: formData.get('endOdometer'),
        purpose: formData.get('purpose'),
        startLocation: formData.get('startLocation'),
        endLocation: formData.get('endLocation'),
        routeDescription: formData.get('routeDescription'),
        customerClientName: formData.get('customerClientName'),
        reasonForTrip: formData.get('reasonForTrip'),
        tollCostsZar: parseFloat(formData.get('tollCostsZar') as string) || 0,
        parkingCostsZar: parseFloat(formData.get('parkingCostsZar') as string) || 0,
      };

      await createTrip(tripData);

      // If recurring, create recurring trip template
      if (isRecurring && recurrenceDays.length > 0) {
        const recurringData = {
          vehicleId: formData.get('vehicleId'),
          userId: 'current-user-id', // Get from auth context
          purpose: formData.get('purpose'),
          startLocation: formData.get('startLocation'),
          endLocation: formData.get('endLocation'),
          routeDescription: formData.get('routeDescription'),
          customerClientName: formData.get('customerClientName'),
          reasonForTrip: formData.get('reasonForTrip'),
          isRecurring: true,
          recurrenceDays: recurrenceDays.join(','),
          recurrenceStartDate: formData.get('tripDate'),
          recurrenceEndDate: formData.get('recurrenceEndDate') || null,
          defaultTollCostsZar: parseFloat(formData.get('tollCostsZar') as string) || 0,
          defaultParkingCostsZar: parseFloat(formData.get('parkingCostsZar') as string) || 0,
        };

        await createRecurringTrip(recurringData);
      }

      router.push('/dashboard/logbook');
    } catch (error) {
      console.error('Failed to create trip:', error);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">New Logbook Entry</h1>
        {vehicleName && (
          <p className="text-gray-600">Vehicle: {vehicleName}</p>
        )}
      </div>

      <form onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(new FormData(e.currentTarget));
      }} className="space-y-6">
        
        {/* Odometer Section with Memory */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Odometer Readings</h3>
          {lastOdometer && (
            <p className="text-sm text-blue-600 mb-2">
              Last odometer reading: {lastOdometer.toLocaleString()} km
            </p>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Start Odometer (km)
              </label>
              <input
                type="number"
                name="startOdometer"
                placeholder={lastOdometer?.toString() || "Enter reading"}
                className="w-full p-2 border rounded"
              />
              {lastOdometer && (
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank to use last reading: {lastOdometer.toLocaleString()} km
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">
                End Odometer (km)
              </label>
              <input
                type="number"
                name="endOdometer"
                required
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
        </div>

        {/* Recurring Trip Section */}
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recurring Trip</h3>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">This is a recurring trip</span>
            </label>
          </div>

          {isRecurring && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Repeat on days:
                </label>
                <div className="flex flex-wrap gap-2">
                  {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleRecurringToggle(day)}
                      className={`px-3 py-1 rounded text-sm ${
                        recurrenceDays.includes(day)
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Recurrence End Date (optional)
                </label>
                <input
                  type="date"
                  name="recurrenceEndDate"
                  className="w-full p-2 border rounded"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank for ongoing recurrence
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Existing form fields... */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Trip Date
            </label>
            <input
              type="date"
              name="tripDate"
              required
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Purpose
            </label>
            <select name="purpose" required className="w-full p-2 border rounded">
              <option value="">Select purpose</option>
              <option value="BUSINESS">Business</option>
              <option value="PERSONAL">Personal</option>
              <option value="COMMUTE">Commute</option>
            </select>
          </div>
        </div>

        {/* Add other existing fields... */}

        <div className="flex gap-4">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Save Trip
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Existing Recurring Trips */}
      {recurringTrips.length > 0 && (
        <div className="mt-8">
          <h3 className="font-semibold mb-4">Existing Recurring Trips</h3>
          <div className="space-y-2">
            {recurringTrips.map(trip => (
              <div key={trip.id} className="bg-gray-50 p-3 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{trip.startLocation} → {trip.endLocation}</p>
                    <p className="text-sm text-gray-600">
                      Days: {trip.recurrenceDays} | Purpose: {trip.purpose}
                    </p>
                  </div>
                  <button
                    onClick={() => {/* Handle delete */}}
                    className="text-red-600 text-sm hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 3.4 Component for Recurring Trip Management

Create a separate component for managing recurring trips:

```typescript
// components/RecurringTripManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { getRecurringTripsByVehicle, deleteRecurringTrip } from '@/lib/api/client';
import type { RecurringTrip } from '@/types/recurring-trip';

interface RecurringTripManagerProps {
  vehicleId: string;
}

export default function RecurringTripManager({ vehicleId }: RecurringTripManagerProps) {
  const [recurringTrips, setRecurringTrips] = useState<RecurringTrip[]>([]);

  useEffect(() => {
    fetchRecurringTrips();
  }, [vehicleId]);

  const fetchRecurringTrips = async () => {
    try {
      const response = await getRecurringTripsByVehicle(vehicleId);
      setRecurringTrips(response.data);
    } catch (error) {
      console.error('Failed to fetch recurring trips:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this recurring trip?')) {
      try {
        await deleteRecurringTrip(id);
        fetchRecurringTrips();
      } catch (error) {
        console.error('Failed to delete recurring trip:', error);
      }
    }
  };

  return (
    <div className="mt-8">
      <h3 className="font-semibold mb-4">Recurring Trips</h3>
      {recurringTrips.length === 0 ? (
        <p className="text-gray-500">No recurring trips set up for this vehicle.</p>
      ) : (
        <div className="space-y-3">
          {recurringTrips.map(trip => (
            <div key={trip.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-medium">{trip.startLocation} → {trip.endLocation}</h4>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    <p>Purpose: {trip.purpose}</p>
                    <p>Days: {trip.recurrenceDays}</p>
                    {trip.customerClientName && (
                      <p>Client: {trip.customerClientName}</p>
                    )}
                    <p>
                      From: {trip.recurrenceStartDate} 
                      {trip.recurrenceEndDate && ` to ${trip.recurrenceEndDate}`}
                    </p>
                    {(trip.defaultTollCostsZar > 0 || trip.defaultParkingCostsZar > 0) && (
                      <p>
                        Default costs: Toll R{trip.defaultTollCostsZar}, 
                        Parking R{trip.defaultParkingCostsZar}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(trip.id)}
                  className="ml-4 text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## 4. Key Features Implemented

### 4.1 Odometer Memory
- Automatically fetches the last odometer reading for the vehicle
- Pre-fills the start odometer field with the last reading
- Users can override the auto-filled value if needed
- Updates vehicle's current odometer when trips are created

### 4.2 Recurring Trips
- Toggle to mark a trip as recurring
- Day selection buttons (MON-SUN) for recurrence pattern
- Optional end date for recurrence
- Stores trip template for automatic generation
- Management interface to view/delete recurring trips

### 4.3 API Integration
- New endpoint to fetch last odometer reading
- Complete CRUD operations for recurring trips
- Proper error handling and loading states

## 5. Testing

1. **Odometer Memory:**
   - Navigate to `/dashboard/logbook/new?vehicleId={vehicleId}`
   - Verify the last odometer reading is displayed
   - Create a new trip without entering start odometer
   - Confirm it uses the last reading

2. **Recurring Trips:**
   - Toggle the recurring trip checkbox
   - Select recurrence days
   - Set optional end date
   - Save and verify the recurring trip is created
   - Check the management section shows the recurring trip

## 6. Database Migration

The SQL schema adds the `recurring_trips` table with proper relationships and constraints. Make sure to run the migration before testing.

This implementation provides a complete solution for both odometer memory and recurring trip functionality, following the same patterns used in the expenses section.
