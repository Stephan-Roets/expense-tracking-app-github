'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { handoffApi } from '@/lib/api/handoff';
import type { VehicleHandoffDTO, HandoffState } from '@/lib/types/handoff';
import { useState } from 'react';

interface HandoffStatusCardProps {
  handoff: VehicleHandoffDTO;
  vehicleRegistration?: string;
  vehicleName?: string;
  permissions?: any;
  userId?: string;
  onRefresh?: () => void;
}

const stateLabels: Record<HandoffState, string> = {
  PENDING_HANDOFF_INITIATED: 'Pending Initiation',
  AWAITING_OLD_DRIVER_CONDITION: 'Old Driver: Submit Condition Report',
  AWAITING_OLD_DRIVER_ODOMETER: 'Old Driver: Submit Odometer Reading',
  AWAITING_MANAGER_APPROVAL: 'Awaiting Manager Approval',
  AWAITING_NEW_DRIVER_CONDITION: 'New Driver: Submit Condition Report',
  AWAITING_NEW_DRIVER_ODOMETER: 'New Driver: Submit Odometer Reading',
  HANDOFF_COMPLETE: 'Handoff Complete',
  CANCELLED: 'Cancelled',
};

const stateDescriptions: Record<HandoffState, string> = {
  PENDING_HANDOFF_INITIATED: 'Handoff has been initiated and is being processed.',
  AWAITING_OLD_DRIVER_CONDITION: 'The current driver must submit a vehicle condition report.',
  AWAITING_OLD_DRIVER_ODOMETER: 'The current driver must submit an odometer reading.',
  AWAITING_MANAGER_APPROVAL: 'A manager must approve the handoff before proceeding.',
  AWAITING_NEW_DRIVER_CONDITION: 'The new driver must submit a vehicle condition report.',
  AWAITING_NEW_DRIVER_ODOMETER: 'The new driver must submit an odometer reading.',
  HANDOFF_COMPLETE: 'The vehicle handoff has been completed successfully.',
  CANCELLED: 'The vehicle handoff was cancelled.',
};

export function HandoffStatusCard({ handoff, vehicleRegistration, vehicleName, permissions, userId, onRefresh }: HandoffStatusCardProps) {
  const [isAdvancing, setIsAdvancing] = useState(false);

  const isOldDriver = handoff.oldDriverId === userId;
  const isNewDriver = handoff.newDriverId === userId;
  const isManager = permissions?.["VEHICLE_ASSIGNMENT"]?.["APPROVE_ASSIGNMENTS"] || false;

  const canAdvance = (() => {
    switch (handoff.state) {
      case 'AWAITING_OLD_DRIVER_CONDITION':
      case 'AWAITING_OLD_DRIVER_ODOMETER':
        return isOldDriver;
      case 'AWAITING_MANAGER_APPROVAL':
        return isManager;
      case 'AWAITING_NEW_DRIVER_CONDITION':
      case 'AWAITING_NEW_DRIVER_ODOMETER':
        return isNewDriver;
      default:
        return false;
    }
  })();

  const handleAdvance = async () => {
    setIsAdvancing(true);
    try {
      await handoffApi.advance(handoff.id);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to advance handoff:', error);
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleCancel = async () => {
    const reason = prompt('Enter cancellation reason:');
    if (!reason) return;

    try {
      await handoffApi.cancel(handoff.id, reason);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to cancel handoff:', error);
    }
  };

  const handleForceComplete = async () => {
    const reason = prompt('Enter reason for force completion:');
    if (!reason) return;

    try {
      await handoffApi.forceComplete(handoff.id, reason);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to force complete handoff:', error);
    }
  };

  const isComplete = handoff.state === 'HANDOFF_COMPLETE';
  const isCancelled = handoff.cancelledAt !== null;

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Vehicle Handoff in Progress</CardTitle>
          <Badge variant={isComplete ? 'default' : 'secondary'}>
            {stateLabels[handoff.state]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm">
          <p className="font-medium">Vehicle: {handoff.vehicleRegistration}</p>
          {handoff.oldDriverName && (
            <p className="text-muted-foreground">From: {handoff.oldDriverName}</p>
          )}
          <p className="text-muted-foreground">To: {handoff.newDriverName}</p>
        </div>

        <p className="text-sm text-muted-foreground">
          {stateDescriptions[handoff.state]}
        </p>

        {handoff.overrideReason && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Override:</strong> {handoff.overrideReason}
            </p>
          </div>
        )}

        {!isComplete && !isCancelled && (
          <div className="flex gap-2">
            {canAdvance && (
              <Button onClick={handleAdvance} disabled={isAdvancing} size="sm">
                {isAdvancing ? 'Processing...' : 'Complete Step'}
              </Button>
            )}
            {isManager && (
              <>
                <Button
                  variant="outline"
                  onClick={handleForceComplete}
                  size="sm"
                  className="text-yellow-600 border-yellow-600"
                >
                  Force Complete
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  size="sm"
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        )}

        {isCancelled && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              <strong>Cancelled:</strong> {handoff.cancellationReason}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
