'use client';

import { useState, useEffect } from 'react';
import { getRecurringTripsByVehicle, deleteRecurringTrip } from '@/lib/api/client';
import type { RecurringTrip } from '@/lib/types/database';

interface RecurringTripsListProps {
  vehicleId: string;
}

export default function RecurringTripsList({ vehicleId }: RecurringTripsListProps) {
  const [trips, setTrips] = useState<RecurringTrip[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTrips();
  }, [vehicleId]);

  const fetchTrips = async () => {
    if (!vehicleId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getRecurringTripsByVehicle(vehicleId);
      setTrips(response.data || []);
    } catch (err: any) {
      console.error('Failed to fetch recurring trips:', err);
      console.error('Error details:', err?.response?.data || err?.message);
      setError(`Failed to load recurring trips: ${err?.response?.data?.message || err?.message || 'Unknown error'}`);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this recurring trip?')) {
      await deleteRecurringTrip(id);
      fetchTrips();
    }
  };

  if (loading) return <div className="mt-8 text-sm text-muted-foreground">Loading...</div>;
  if (error) return <div className="mt-8 text-sm text-red-600">{error}</div>;
  if (trips.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="font-semibold mb-4">Recurring Work Trips</h3>
      <div className="space-y-2">
        {trips.map(trip => (
          <div key={trip.id} className="bg-muted p-3 rounded flex justify-between dark:bg-muted/50">
            <div>
              <p className="font-medium">{trip.startLocation} → {trip.endLocation}</p>
              <p className="text-sm text-muted-foreground">
                Days: {trip.recurrenceDays} | Purpose: {trip.purpose}
              </p>
            </div>
            <button 
              onClick={() => handleDelete(trip.id)}
              className="text-red-600 text-sm dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
