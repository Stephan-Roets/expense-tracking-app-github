'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useOdometerMemory } from '@/lib/hooks/useOdometerMemory';
import { OdometerInput } from '@/components/forms/odometer-input';
import RecurringTripToggle from '@/components/forms/recurring-trip-toggle';
import { api } from '@/lib/api/client';

export default function NewLogbookPage() {
  const searchParams = useSearchParams();
  const vehicleId = searchParams.get('vehicleId');
  const { lastOdometer, vehicleName } = useOdometerMemory(vehicleId);
  
  const [recurringData, setRecurringData] = useState<{
    isRecurring: boolean;
    days: string[];
    daysOfMonth: number[];
    startDate?: string;
    endDate?: string;
  }>({ isRecurring: false, days: [], daysOfMonth: [] });

  // Odometer state for controlled inputs
  const [startOdometer, setStartOdometer] = useState('');
  const [endOdometer, setEndOdometer] = useState('');

  const handleRecurringChange = (isRecurring: boolean, days: string[], daysOfMonth: number[], startDate?: string, endDate?: string) => {
    setRecurringData({ isRecurring, days, daysOfMonth, startDate, endDate });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Create the trip
    const tripData = {
      vehicleId: vehicleId!,
      tripDate: formData.get('tripDate'),
      startTime: formData.get('startTime'),
      endTime: formData.get('endTime'),
      startOdometer: parseInt(startOdometer) || lastOdometer || 0,
      endOdometer: parseInt(endOdometer),
      purpose: formData.get('purpose'),
      startLocation: formData.get('startLocation'),
      endLocation: formData.get('endLocation'),
      tollCostsZar: parseFloat(formData.get('tollCostsZar') as string) || 0,
      parkingCostsZar: parseFloat(formData.get('parkingCostsZar') as string) || 0,
    };

    await api.post('/trips', tripData);

    // If recurring, create recurring trip template
    if (recurringData.isRecurring && recurringData.days.length > 0) {
      const recurringTripData = {
        vehicleId: vehicleId!,
        userId: 'current-user-id', // Get from your auth context
        purpose: formData.get('purpose') as string,
        startLocation: formData.get('startLocation') as string,
        endLocation: formData.get('endLocation') as string,
        isRecurring: true,
        recurrenceDays: recurringData.days.join(','),
        recurrenceStartDate: formData.get('tripDate') as string,
        recurrenceEndDate: recurringData.endDate,
        defaultTollCostsZar: parseFloat(formData.get('tollCostsZar') as string) || 0,
        defaultParkingCostsZar: parseFloat(formData.get('parkingCostsZar') as string) || 0,
      };

      await api.post('/recurring-trips', recurringTripData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Odometer Section with Memory */}
      <OdometerInput 
        startOdometer={startOdometer}
        endOdometer={endOdometer}
        lastOdometer={lastOdometer}
        vehicleName={vehicleName}
        onStartOdometerChange={setStartOdometer}
        onEndOdometerChange={setEndOdometer}
      />

      {/* Recurring Trip Section */}
      <RecurringTripToggle onRecurringChange={handleRecurringChange} />

      {/* Your existing form fields... */}
      
      <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded">
        Save Trip
      </button>
    </form>
  );
}
