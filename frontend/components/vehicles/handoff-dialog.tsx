'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { handoffApi } from '@/lib/api/handoff';
import type { VehicleHandoffDTO } from '@/lib/types/handoff';

interface HandoffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  vehicleRegistration: string;
  permissions?: any;
  onSuccess?: (handoff: VehicleHandoffDTO) => void;
}

export function HandoffDialog({ open, onOpenChange, vehicleId, vehicleRegistration, permissions, onSuccess }: HandoffDialogProps) {
  const [newDriverId, setNewDriverId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canInitiateHandoff = permissions?.["VEHICLE_ASSIGNMENT"]?.["ASSIGN_VEHICLES"] || false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriverId) return;

    setIsSubmitting(true);
    try {
      const handoff = await handoffApi.initiate({ vehicleId, newDriverId });
      onSuccess?.(handoff);
      onOpenChange(false);
      setNewDriverId('');
    } catch (error) {
      console.error('Failed to initiate handoff:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canInitiateHandoff) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Initiate Vehicle Handoff</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Vehicle: {vehicleRegistration}
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="newDriver">New Driver</Label>
              <Select value={newDriverId} onValueChange={setNewDriverId} required>
                <SelectTrigger id="newDriver">
                  <SelectValue placeholder="Select new driver" />
                </SelectTrigger>
                <SelectContent>
                  {/* TODO: Load drivers from API */}
                  <SelectItem value="driver-1">Driver 1</SelectItem>
                  <SelectItem value="driver-2">Driver 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!newDriverId || isSubmitting}>
              {isSubmitting ? 'Initiating...' : 'Initiate Handoff'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
