import type {
  Budget,
  BudgetItem,
  BudgetListResponse,
  CreateBudgetInput,
  CreateBudgetItemInput,
  UpdateBudgetInput,
} from '@expo-50sdk-template/shared-types';

import { requestAuthenticatedJson } from '@/features/auth/authenticatedClient';

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { data } = await requestAuthenticatedJson<T>(path, init);
  return data;
}

export function getBudgets(relationshipId: string) {
  return requestJson<BudgetListResponse>(
    `/api/v1/relationships/${encodeURIComponent(relationshipId)}/budgets`,
  );
}

export function getBudget(budgetId: string) {
  return requestJson<Budget>(`/api/v1/budgets/${encodeURIComponent(budgetId)}`);
}

export function createBudget(relationshipId: string, input: CreateBudgetInput) {
  return requestJson<Budget>(
    `/api/v1/relationships/${encodeURIComponent(relationshipId)}/budgets`,
    { method: 'POST', body: JSON.stringify(input) },
  );
}

export function updateBudget(budgetId: string, input: UpdateBudgetInput) {
  return requestJson<Budget>(
    `/api/v1/budgets/${encodeURIComponent(budgetId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
}

export function approveBudget(budgetId: string) {
  return requestJson<Budget>(
    `/api/v1/budgets/${encodeURIComponent(budgetId)}/approval`,
    { method: 'POST' },
  );
}

export function createBudgetItem(
  budgetId: string,
  input: CreateBudgetItemInput,
) {
  return requestJson<BudgetItem>(
    `/api/v1/budgets/${encodeURIComponent(budgetId)}/items`,
    { method: 'POST', body: JSON.stringify(input) },
  );
}

export function deleteBudget(budgetId: string) {
  return requestJson<void>(`/api/v1/budgets/${encodeURIComponent(budgetId)}`, {
    method: 'DELETE',
  });
}
