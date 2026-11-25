import type { CalendarDateBounds } from './calendar';

export type JointAccountChargeStatus = 'unpaid' | 'paid';

export type JointAccountCharge = {
  id: string;
  relationshipId: string;
  paymentRequestId?: string;
  createdByUserId: string;
  updatedByUserId?: string;
  name: string;
  amountMinorUnits: number;
  chargeDate: string;
  status: JointAccountChargeStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateJointAccountChargeInput = {
  name: string;
  amountMinorUnits: number;
};

export type UpdateJointAccountChargeInput = CreateJointAccountChargeInput & {
  chargeDate: string;
};

export type JointAccountChargeListFilters = {
  name?: string;
  status?: JointAccountChargeStatus;
  createdByUserId?: string;
  minimumAmountMinorUnits?: number;
  maximumAmountMinorUnits?: number;
  fromDate?: string;
  toDate?: string;
  cursor?: string;
  limit?: number;
};

export type JointAccountChargeUnpaidSummary = {
  totalAmountMinorUnits: number;
  currentUserChargeCount: number;
};

export type JointAccountChargeListResponse = {
  items: JointAccountCharge[];
  nextCursor?: string;
  calendarDateBounds?: CalendarDateBounds;
  unpaidSummary?: JointAccountChargeUnpaidSummary;
};

export type MarkAllJointAccountChargesPaidResponse = {
  updatedCount: number;
};
