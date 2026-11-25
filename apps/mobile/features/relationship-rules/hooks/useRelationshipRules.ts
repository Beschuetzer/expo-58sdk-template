import type {
  CreateRelationshipRuleInput,
  RelationshipRule,
  RelationshipRuleListResponse,
  RelationshipSummary,
  UpdateRelationshipRuleInput,
} from '@expo-50sdk-template/shared-types';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';

import {
  agreeToRelationshipRule,
  createRelationshipRule,
  deleteRelationshipRule,
  getRelationshipRule,
  getRelationshipRules,
  updateRelationshipRule,
} from '../api';
import { canUserAgreeToRelationshipRule } from '../filters';

const RELATIONSHIP_RULE_PAGE_SIZE = 20;

export const relationshipRuleQueryKeys = {
  detail: (ruleId: string) => ['relationship-rules', 'detail', ruleId] as const,
  list: (relationshipId: string) =>
    ['relationship-rules', 'list', relationshipId] as const,
  listPrefix: (relationshipId: string) =>
    ['relationship-rules', 'list', relationshipId] as const,
  awaitingDecision: (
    userId: string,
    relationships: Pick<RelationshipSummary, 'id' | 'name'>[],
  ) =>
    [
      'relationship-rules',
      'awaiting-decision',
      userId,
      relationships.map(({ id, name }) => ({ id, name })),
    ] as const,
  awaitingDecisionPrefix: ['relationship-rules', 'awaiting-decision'] as const,
};

export type AwaitingDecisionRelationshipRule = {
  relationshipName: string;
  rule: RelationshipRule;
};

type AwaitingDecisionRelationshipRulePageParam = {
  relationshipIndex: number;
  cursor?: string;
};

type AwaitingDecisionRelationshipRulePage = {
  items: AwaitingDecisionRelationshipRule[];
  nextPageParam?: AwaitingDecisionRelationshipRulePageParam;
};

export function useRelationshipRulesInfiniteQuery(
  relationshipId: string | undefined,
  enabled = true,
) {
  return useInfiniteQuery<
    RelationshipRuleListResponse,
    Error,
    InfiniteData<RelationshipRuleListResponse>,
    ReturnType<typeof relationshipRuleQueryKeys.list>,
    string | undefined
  >({
    enabled: Boolean(relationshipId) && enabled,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
    queryFn: ({ pageParam }) =>
      getRelationshipRules(relationshipId as string, {
        cursor: pageParam,
        limit: RELATIONSHIP_RULE_PAGE_SIZE,
      }),
    queryKey: relationshipRuleQueryKeys.list(relationshipId ?? ''),
  });
}

export function useAwaitingDecisionRelationshipRulesInfiniteQuery(
  relationships: Pick<RelationshipSummary, 'id' | 'name'>[],
  userId: string | undefined,
) {
  return useInfiniteQuery<
    AwaitingDecisionRelationshipRulePage,
    Error,
    InfiniteData<AwaitingDecisionRelationshipRulePage>,
    ReturnType<typeof relationshipRuleQueryKeys.awaitingDecision>,
    AwaitingDecisionRelationshipRulePageParam
  >({
    enabled: Boolean(userId) && relationships.length > 0,
    getNextPageParam: (lastPage) => lastPage.nextPageParam,
    initialPageParam: { relationshipIndex: 0 },
    queryFn: async ({ pageParam }) => {
      let relationshipIndex = pageParam.relationshipIndex;
      let cursor = pageParam.cursor;

      while (relationshipIndex < relationships.length) {
        const relationship = relationships[relationshipIndex];
        const page = await getRelationshipRules(relationship.id, {
          cursor,
          limit: RELATIONSHIP_RULE_PAGE_SIZE,
        });
        const items = page.items
          .filter((rule) => canUserAgreeToRelationshipRule(rule, userId))
          .map((rule) => ({
            rule,
            relationshipName: relationship.name,
          }));

        if (items.length === 0) {
          if (page.nextCursor) {
            if (page.nextCursor === cursor) {
              throw new Error('Relationship rule pagination did not advance.');
            }
            cursor = page.nextCursor;
          } else {
            relationshipIndex += 1;
            cursor = undefined;
          }
          continue;
        }

        let nextPageParam:
          | AwaitingDecisionRelationshipRulePageParam
          | undefined;
        if (page.nextCursor) {
          if (page.nextCursor === cursor) {
            throw new Error('Relationship rule pagination did not advance.');
          }
          nextPageParam = {
            relationshipIndex,
            cursor: page.nextCursor,
          };
        } else if (relationshipIndex + 1 < relationships.length) {
          nextPageParam = { relationshipIndex: relationshipIndex + 1 };
        }

        return { items, nextPageParam };
      }

      return { items: [], nextPageParam: undefined };
    },
    queryKey: relationshipRuleQueryKeys.awaitingDecision(
      userId ?? '',
      relationships,
    ),
  });
}

export function useRelationshipRuleQuery(
  ruleId: string | undefined,
  enabled = true,
) {
  return useQuery({
    enabled: Boolean(ruleId) && enabled,
    queryFn: () => getRelationshipRule(ruleId as string),
    queryKey: relationshipRuleQueryKeys.detail(ruleId ?? ''),
  });
}

export function useCreateRelationshipRuleMutation(relationshipId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRelationshipRuleInput) =>
      createRelationshipRule(relationshipId, input),
    onSuccess: (rule: RelationshipRule) => {
      queryClient.setQueryData(relationshipRuleQueryKeys.detail(rule.id), rule);
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: relationshipRuleQueryKeys.listPrefix(relationshipId),
        }),
        queryClient.invalidateQueries({
          queryKey: relationshipRuleQueryKeys.awaitingDecisionPrefix,
        }),
      ]);
    },
  });
}

export function useUpdateRelationshipRuleMutation(
  relationshipId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      input,
      ruleId,
    }: {
      input: UpdateRelationshipRuleInput;
      ruleId: string;
    }) => updateRelationshipRule(ruleId, input),
    onSuccess: (rule: RelationshipRule) => {
      queryClient.setQueryData(relationshipRuleQueryKeys.detail(rule.id), rule);
      const invalidations = [
        queryClient.invalidateQueries({
          queryKey: relationshipRuleQueryKeys.awaitingDecisionPrefix,
        }),
      ];
      if (relationshipId) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: relationshipRuleQueryKeys.listPrefix(relationshipId),
          }),
        );
      }
      return Promise.all(invalidations);
    },
  });
}

export function useAgreeToRelationshipRuleMutation(
  relationshipId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: agreeToRelationshipRule,
    onSuccess: (rule: RelationshipRule) => {
      queryClient.setQueryData(relationshipRuleQueryKeys.detail(rule.id), rule);
      const invalidations = [
        queryClient.invalidateQueries({
          queryKey: relationshipRuleQueryKeys.awaitingDecisionPrefix,
        }),
      ];
      if (relationshipId) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: relationshipRuleQueryKeys.listPrefix(relationshipId),
          }),
        );
      }
      return Promise.all(invalidations);
    },
  });
}

export function useDeleteRelationshipRuleMutation(
  relationshipId: string | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteRelationshipRule,
    onSuccess: async (_result, ruleId) => {
      queryClient.removeQueries({
        queryKey: relationshipRuleQueryKeys.detail(ruleId),
        exact: true,
      });
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: relationshipRuleQueryKeys.awaitingDecisionPrefix,
        }),
        ...(relationshipId
          ? [
              queryClient.invalidateQueries({
                queryKey: relationshipRuleQueryKeys.listPrefix(relationshipId),
              }),
            ]
          : []),
      ]);
    },
  });
}
