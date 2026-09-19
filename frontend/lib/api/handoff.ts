import { api } from './client';
import type { VehicleHandoffDTO, VehicleHandoffInitiateRequest } from '@/lib/types/handoff';

export const handoffApi = {
  initiate: async (request: VehicleHandoffInitiateRequest): Promise<VehicleHandoffDTO> => {
    const response = await api.post('/handoffs/initiate', request);
    return response.data;
  },

  advance: async (handoffId: string): Promise<VehicleHandoffDTO> => {
    const response = await api.post(`/handoffs/${handoffId}/advance`, {});
    return response.data;
  },

  cancel: async (handoffId: string, reason: string): Promise<VehicleHandoffDTO> => {
    const response = await api.post(`/handoffs/${handoffId}/cancel`, { reason });
    return response.data;
  },

  forceComplete: async (handoffId: string, reason: string): Promise<VehicleHandoffDTO> => {
    const response = await api.post(`/handoffs/${handoffId}/force-complete`, { reason });
    return response.data;
  },

  getActiveByVehicle: async (vehicleId: string): Promise<VehicleHandoffDTO | null> => {
    try {
      const response = await api.get(`/handoffs/vehicle/${vehicleId}`);
      return response.data;
    } catch (error) {
      if ((error as any).response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  list: async (): Promise<VehicleHandoffDTO[]> => {
    const response = await api.get('/handoffs');
    return response.data;
  },
};
