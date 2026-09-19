'use client';

import { useState, useEffect } from 'react';
import { getLastOdometerReading } from '@/lib/api/client';
import type { LastOdometerResponse } from '@/lib/types/database';

export function useOdometerMemory(vehicleId: string | null) {
  const [lastOdometer, setLastOdometer] = useState<number | null>(null);
  const [currentOdometer, setCurrentOdometer] = useState<number | null>(null);
  const [vehicleName, setVehicleName] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!vehicleId) {
      setLastOdometer(null);
      setCurrentOdometer(null);
      setVehicleName('');
      return;
    }

    const fetchOdometer = async () => {
      setLoading(true);
      try {
        const response = await getLastOdometerReading(vehicleId);
        const data: LastOdometerResponse = response.data;
        setLastOdometer(data.lastOdometer);
        setCurrentOdometer(data.currentOdometer);
        setVehicleName(data.vehicleName);
      } catch (error) {
        console.error('Failed to fetch last odometer:', error);
        setLastOdometer(null);
        setCurrentOdometer(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOdometer();
  }, [vehicleId]);

  return { lastOdometer, currentOdometer, vehicleName, loading };
}
