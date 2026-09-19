export enum HandoffState {
  PENDING_HANDOFF_INITIATED = 'PENDING_HANDOFF_INITIATED',
  AWAITING_OLD_DRIVER_CONDITION = 'AWAITING_OLD_DRIVER_CONDITION',
  AWAITING_OLD_DRIVER_ODOMETER = 'AWAITING_OLD_DRIVER_ODOMETER',
  AWAITING_MANAGER_APPROVAL = 'AWAITING_MANAGER_APPROVAL',
  AWAITING_NEW_DRIVER_CONDITION = 'AWAITING_NEW_DRIVER_CONDITION',
  AWAITING_NEW_DRIVER_ODOMETER = 'AWAITING_NEW_DRIVER_ODOMETER',
  HANDOFF_COMPLETE = 'HANDOFF_COMPLETE',
  CANCELLED = 'CANCELLED',
}

export enum ConditionReportPurpose {
  ONBOARDING = 'ONBOARDING',
  HANDOFF = 'HANDOFF',
}

export enum OdometerConfirmationPurpose {
  ONBOARDING = 'ONBOARDING',
  HANDOFF = 'HANDOFF',
}

export interface VehicleHandoffDTO {
  id: string;
  vehicleId: string;
  vehicleRegistration: string;
  oldAssignmentId?: string;
  oldDriverId?: string;
  oldDriverName?: string;
  newAssignmentId: string;
  newDriverId: string;
  newDriverName: string;
  initiatedById: string;
  initiatedByName: string;
  state: HandoffState;
  managerApprovedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelledById?: string;
  cancelledByName?: string;
  cancellationReason?: string;
  overrideReason?: string;
  createdAt: string;
}

export interface VehicleHandoffInitiateRequest {
  vehicleId: string;
  newDriverId: string;
}
