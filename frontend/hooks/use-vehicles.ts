import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export function useVehicles() {
  return useQuery({
    queryKey: ['vehicles'],
    queryFn: async () => {
      const data = await api.get('/vehicles');
      const responseData = (data as any).data || data;
      // Ensure vehicles is always an array
      let vehiclesArray: any[] = [];
      if (Array.isArray(responseData)) {
        vehiclesArray = responseData;
      } else if (responseData && typeof responseData === 'object') {
        // Handle paginated response or wrapped response
        vehiclesArray =
          (responseData as any).content || (responseData as any).vehicles || [];
      }
      return vehiclesArray;
    },
  });
}
