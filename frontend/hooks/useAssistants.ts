import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

export interface UserAssistantDTO {
  id: string;
  ownerId: string;
  assistantId: string;
  assistantEmail?: string;
  assistantFirstName?: string;
  assistantLastName?: string;
  assistantRole: 'ASSISTANT_LOW' | 'ASSISTANT_HIGH';
  assignedDateRangeStart?: string;
  assignedDateRangeEnd?: string;
  assignedVehicleId?: string;
  assignedVehicleRegistration?: string;
  isActive?: boolean;
  removedAt?: string;
  removedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddAssistantRequest {
  assistantEmail: string;
  assistantFirstName?: string;
  assistantLastName?: string;
  assistantRole: 'ASSISTANT_LOW' | 'ASSISTANT_HIGH';
  dateRangeStart?: string;
  dateRangeEnd?: string;
  assignedVehicleId?: string;
  password?: string;
}

export interface UpdateAssistantRequest {
  assistantRole: 'ASSISTANT_LOW' | 'ASSISTANT_HIGH';
  dateRangeStart?: string;
  dateRangeEnd?: string;
  assignedVehicleId?: string;
}

export function useAssistants(options?: { enabled?: boolean }) {
  const queryClient = useQueryClient();

  const { data: assistants, isLoading } = useQuery({
    queryKey: ['assistants'],
    queryFn: async () => {
      const response = await api.get('/assistants');
      return response.data as UserAssistantDTO[];
    },
    enabled: options?.enabled ?? true,
  });

  const addMutation = useMutation({
    mutationFn: async (request: AddAssistantRequest) => {
      const response = await api.post('/assistants', request);
      return response.data as UserAssistantDTO;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistants'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ assistantId, request }: { assistantId: string; request: UpdateAssistantRequest }) => {
      const response = await api.put(`/assistants/${assistantId}`, request);
      return response.data as UserAssistantDTO;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistants'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (assistantId: string) => {
      await api.delete(`/assistants/${assistantId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistants'] });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (assistantId: string) => {
      const response = await api.put(`/assistants/${assistantId}`, {
        isActive: true,
      });
      return response.data as UserAssistantDTO;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistants'] });
    },
  });

  return {
    assistants,
    isLoading,
    addAssistant: addMutation.mutate,
    updateAssistant: updateMutation.mutate,
    removeAssistant: removeMutation.mutate,
    reactivateAssistant: reactivateMutation.mutate,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isRemoving: removeMutation.isPending,
    isReactivating: reactivateMutation.isPending,
  };
}
