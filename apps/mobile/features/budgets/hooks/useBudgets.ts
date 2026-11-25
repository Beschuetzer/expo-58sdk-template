import type {
  Budget,
  BudgetItem,
  CreateBudgetInput,
  CreateBudgetItemInput,
  UpdateBudgetInput,
} from '@expo-50sdk-template/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  approveBudget,
  createBudget,
  createBudgetItem,
  deleteBudget,
  getBudget,
  getBudgets,
  updateBudget,
} from '../api';

export const budgetQueryKeys = {
  detail: (budgetId: string) => ['budgets', 'detail', budgetId] as const,
  list: (relationshipId: string) =>
    ['budgets', 'list', relationshipId] as const,
  listPrefix: (relationshipId: string) =>
    ['budgets', 'list', relationshipId] as const,
};

export function useBudgetsQuery(
  relationshipId: string | undefined,
  enabled = true,
) {
  return useQuery({
    enabled: Boolean(relationshipId) && enabled,
    queryFn: () => getBudgets(relationshipId as string),
    queryKey: budgetQueryKeys.list(relationshipId ?? ''),
  });
}

export function useBudgetQuery(budgetId: string | undefined, enabled = true) {
  return useQuery({
    enabled: Boolean(budgetId) && enabled,
    queryFn: () => getBudget(budgetId as string),
    queryKey: budgetQueryKeys.detail(budgetId ?? ''),
  });
}

function updateBudgetQueryCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  budget: Budget,
) {
  queryClient.setQueryData(budgetQueryKeys.detail(budget.id), budget);
  return queryClient.invalidateQueries({
    queryKey: budgetQueryKeys.listPrefix(budget.relationshipId),
  });
}

export function useCreateBudgetMutation(relationshipId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBudgetInput) =>
      createBudget(relationshipId, input),
    onSuccess: (budget: Budget) => updateBudgetQueryCaches(queryClient, budget),
  });
}

export function useUpdateBudgetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      budgetId,
      input,
    }: {
      budgetId: string;
      input: UpdateBudgetInput;
    }) => updateBudget(budgetId, input),
    onSuccess: (budget: Budget) => updateBudgetQueryCaches(queryClient, budget),
  });
}

export function useApproveBudgetMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: approveBudget,
    onSuccess: (budget: Budget) => updateBudgetQueryCaches(queryClient, budget),
  });
}

export function useCreateBudgetItemMutation(relationshipId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      budgetId,
      input,
    }: {
      budgetId: string;
      input: CreateBudgetItemInput;
    }) => createBudgetItem(budgetId, input),
    onSuccess: (item: BudgetItem) => {
      queryClient.invalidateQueries({
        queryKey: budgetQueryKeys.detail(item.budgetId),
      });
      return queryClient.invalidateQueries({
        queryKey: budgetQueryKeys.listPrefix(relationshipId),
      });
    },
  });
}

export function useDeleteBudgetMutation(relationshipId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteBudget,
    onSuccess: async (_result, budgetId) => {
      queryClient.removeQueries({
        queryKey: budgetQueryKeys.detail(budgetId),
        exact: true,
      });
      await queryClient.invalidateQueries({
        queryKey: budgetQueryKeys.listPrefix(relationshipId),
      });
    },
  });
}
