import type { CurrencyCode } from './currencies';

export type BudgetPeriod = 'monthly' | 'quarterly' | 'yearly';

export type BudgetStatus = 'pending_approval' | 'approved';

export type BudgetApproval = {
  memberUserId: string;
  approvedAt?: string;
};

export type BudgetItem = {
  id: string;
  budgetId: string;
  name: string;
  amountMinorUnits: number;
  date: string;
  createdAt: string;
  createdByUserId: string;
};

export type BudgetSummary = {
  id: string;
  relationshipId: string;
  createdByUserId: string;
  updatedByUserId?: string;
  name: string;
  currency: CurrencyCode;
  amountMinorUnits: number;
  amountRemainingMinorUnits: number;
  period: BudgetPeriod;
  periodStart: string;
  periodEnd: string;
  status: BudgetStatus;
  createdAt: string;
  updatedAt: string;
};

export type Budget = BudgetSummary & {
  approvals: BudgetApproval[];
  items: BudgetItem[];
};

export type CreateBudgetInput = {
  name: string;
  currency: CurrencyCode;
  amountMinorUnits: number;
  period: BudgetPeriod;
  requiredApproverUserIds: string[];
};

export type UpdateBudgetInput = Omit<CreateBudgetInput, 'currency'>;

export type CreateBudgetItemInput = {
  name: string;
  amountMinorUnits: number;
  date: string;
};

export type BudgetListResponse = {
  items: BudgetSummary[];
};
