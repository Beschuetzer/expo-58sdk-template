import type {
  CreateRelationshipRuleInput,
  RelationshipRule,
  RelationshipSummary,
  UpdateRelationshipRuleInput,
} from '@expo-50sdk-template/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import {
  relationshipRuleQueryKeys,
  useAgreeToRelationshipRuleMutation,
  useAwaitingDecisionRelationshipRulesInfiniteQuery,
  useCreateRelationshipRuleMutation,
  useDeleteRelationshipRuleMutation,
  useRelationshipRuleQuery,
  useRelationshipRulesInfiniteQuery,
  useUpdateRelationshipRuleMutation,
} from './useRelationshipRules';
import * as relationshipRulesApi from '../api';

jest.mock('../api', () => ({
  agreeToRelationshipRule: jest.fn(),
  createRelationshipRule: jest.fn(),
  deleteRelationshipRule: jest.fn(),
  getRelationshipRule: jest.fn(),
  getRelationshipRules: jest.fn(),
  updateRelationshipRule: jest.fn(),
}));

function makeRule(
  id: string,
  relationshipId: string,
  overrides: Partial<RelationshipRule> = {},
): RelationshipRule {
  return {
    id,
    relationshipId,
    createdByUserId: 'user-2',
    name: id,
    labels: [],
    description: 'A shared rule.',
    status: 'pending_approval',
    remindMeToReview: null,
    createdAt: '2026-10-15T12:00:00.000Z',
    updatedAt: '2026-10-15T12:00:00.000Z',
    approvals: [{ memberUserId: 'user-1' }],
    ...overrides,
  };
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { gcTime: Infinity, retry: false },
    },
  });
}

let mountedRenderer: ReactTestRenderer | undefined;
let mountedQueryClient: QueryClient | undefined;

async function settleQueries() {
  await act(async () => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await Promise.resolve();
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  });
}

async function mountHook<T>(useHook: () => T) {
  const queryClient = createTestQueryClient();
  let current: T | undefined;
  mountedQueryClient = queryClient;

  function TestConsumer() {
    current = useHook();
    return null;
  }

  await act(async () => {
    mountedRenderer = renderer.create(
      <QueryClientProvider client={queryClient}>
        <TestConsumer />
      </QueryClientProvider>,
    );
  });
  await settleQueries();

  return {
    queryClient,
    getCurrent: () => current,
  };
}

describe('awaiting-decision relationship rules query', () => {
  afterEach(() => {
    if (mountedRenderer) {
      act(() => mountedRenderer?.unmount());
      mountedRenderer = undefined;
    }
    mountedQueryClient?.clear();
    mountedQueryClient = undefined;
    jest.clearAllMocks();
  });

  it('filters to unsigned approvals for the user across relationships', async () => {
    const relationships: Pick<RelationshipSummary, 'id' | 'name'>[] = [
      { id: 'relationship-1', name: 'Shared space' },
      { id: 'relationship-2', name: 'Other space' },
    ];
    const pendingRule = makeRule('rule-1', 'relationship-1');
    const agreedRule = makeRule('rule-agreed', 'relationship-1', {
      approvals: [
        {
          memberUserId: 'user-1',
          agreedAt: '2026-10-16T12:00:00.000Z',
        },
      ],
    });
    const otherMemberRule = makeRule('rule-other-member', 'relationship-1', {
      approvals: [{ memberUserId: 'user-3' }],
    });
    const ratifiedRule = makeRule('rule-ratified', 'relationship-1', {
      status: 'ratified',
    });
    const otherRelationshipRule = makeRule('rule-2', 'relationship-2');
    jest
      .mocked(relationshipRulesApi.getRelationshipRules)
      .mockResolvedValueOnce({
        items: [pendingRule, agreedRule, otherMemberRule, ratifiedRule],
        nextCursor: 'rule-next',
      })
      .mockResolvedValueOnce({ items: [] })
      .mockResolvedValueOnce({ items: [otherRelationshipRule] });

    const queryClient = createTestQueryClient();
    mountedQueryClient = queryClient;
    let ruleQuery:
      | ReturnType<typeof useAwaitingDecisionRelationshipRulesInfiniteQuery>
      | undefined;
    function TestConsumer() {
      ruleQuery = useAwaitingDecisionRelationshipRulesInfiniteQuery(
        relationships,
        'user-1',
      );
      return null;
    }

    await act(async () => {
      mountedRenderer = renderer.create(
        <QueryClientProvider client={queryClient}>
          <TestConsumer />
        </QueryClientProvider>,
      );
    });
    await settleQueries();

    expect(relationshipRulesApi.getRelationshipRules).toHaveBeenCalledWith(
      'relationship-1',
      { cursor: undefined, limit: 20 },
    );
    expect(ruleQuery?.data?.pages.flatMap((page) => page.items)).toEqual([
      { rule: pendingRule, relationshipName: 'Shared space' },
    ]);
    expect(ruleQuery?.hasNextPage).toBe(true);

    await act(async () => {
      await ruleQuery?.fetchNextPage();
    });
    await settleQueries();

    expect(relationshipRulesApi.getRelationshipRules).toHaveBeenNthCalledWith(
      2,
      'relationship-1',
      { cursor: 'rule-next', limit: 20 },
    );
    expect(relationshipRulesApi.getRelationshipRules).toHaveBeenNthCalledWith(
      3,
      'relationship-2',
      { cursor: undefined, limit: 20 },
    );
    expect(ruleQuery?.data?.pages.flatMap((page) => page.items)).toEqual([
      { rule: pendingRule, relationshipName: 'Shared space' },
      { rule: otherRelationshipRule, relationshipName: 'Other space' },
    ]);
    expect(ruleQuery?.hasNextPage).toBe(false);
    queryClient.clear();
  });

  it('loads relationship-rule pages and details only when enabled', async () => {
    const rule = makeRule('rule-1', 'relationship-1');
    jest
      .mocked(relationshipRulesApi.getRelationshipRules)
      .mockResolvedValueOnce({ items: [rule], nextCursor: 'rule-next' })
      .mockResolvedValueOnce({ items: [] });
    jest
      .mocked(relationshipRulesApi.getRelationshipRule)
      .mockResolvedValue(rule);

    const mounted = await mountHook(() => ({
      list: useRelationshipRulesInfiniteQuery('relationship-1'),
      missingList: useRelationshipRulesInfiniteQuery(undefined),
      disabledList: useRelationshipRulesInfiniteQuery(
        'relationship-disabled',
        false,
      ),
      detail: useRelationshipRuleQuery('rule-1'),
      missingDetail: useRelationshipRuleQuery(undefined),
      disabledDetail: useRelationshipRuleQuery('rule-disabled', false),
    }));
    const queries = mounted.getCurrent();
    if (!queries) throw new Error('Expected relationship-rule queries.');

    expect(queries.list.data?.pages[0].items).toEqual([rule]);
    expect(queries.detail.data).toEqual(rule);
    expect(relationshipRulesApi.getRelationshipRules).toHaveBeenCalledWith(
      'relationship-1',
      { cursor: undefined, limit: 20 },
    );
    expect(relationshipRulesApi.getRelationshipRule).toHaveBeenCalledWith(
      'rule-1',
    );

    await act(async () => {
      await queries.list.fetchNextPage();
    });

    expect(relationshipRulesApi.getRelationshipRules).toHaveBeenNthCalledWith(
      2,
      'relationship-1',
      { cursor: 'rule-next', limit: 20 },
    );
    expect(relationshipRulesApi.getRelationshipRules).toHaveBeenCalledTimes(2);
    expect(relationshipRulesApi.getRelationshipRule).toHaveBeenCalledTimes(1);
  });

  it('rejects awaiting-rule pagination that repeats a cursor', async () => {
    const rule = makeRule('rule-1', 'relationship-1');
    jest
      .mocked(relationshipRulesApi.getRelationshipRules)
      .mockResolvedValueOnce({ items: [rule], nextCursor: 'rule-next' })
      .mockResolvedValueOnce({ items: [rule], nextCursor: 'rule-next' });

    const mounted = await mountHook(() =>
      useAwaitingDecisionRelationshipRulesInfiniteQuery(
        [{ id: 'relationship-1', name: 'Shared space' }],
        'user-1',
      ),
    );
    const query = mounted.getCurrent();
    if (!query) throw new Error('Expected the awaiting-rule query.');
    expect(query.hasNextPage).toBe(true);
    expect(query.isFetchNextPageError).toBe(false);
    expect(query.error).toBeNull();

    await act(async () => {
      await query.fetchNextPage();
    });
    await settleQueries();

    expect(relationshipRulesApi.getRelationshipRules).toHaveBeenNthCalledWith(
      2,
      'relationship-1',
      { cursor: 'rule-next', limit: 20 },
    );
    const queryState = mounted.queryClient.getQueryState(
      relationshipRuleQueryKeys.awaitingDecision('user-1', [
        { id: 'relationship-1', name: 'Shared space' },
      ]),
    );
    expect(queryState?.fetchFailureReason?.message).toBe(
      'Relationship rule pagination did not advance.',
    );
  });
});

describe('relationship rule mutations', () => {
  afterEach(() => {
    if (mountedRenderer) {
      act(() => mountedRenderer?.unmount());
      mountedRenderer = undefined;
    }
    mountedQueryClient?.clear();
    mountedQueryClient = undefined;
    jest.clearAllMocks();
  });

  it('updates the rule cache and invalidates the appropriate lists', async () => {
    const createdRule = makeRule('created-rule', 'relationship-1');
    const updatedRule = makeRule('updated-rule', 'relationship-1');
    const agreedRule = makeRule('agreed-rule', 'relationship-1');
    jest
      .mocked(relationshipRulesApi.createRelationshipRule)
      .mockResolvedValue(createdRule);
    jest
      .mocked(relationshipRulesApi.updateRelationshipRule)
      .mockResolvedValue(updatedRule);
    jest
      .mocked(relationshipRulesApi.agreeToRelationshipRule)
      .mockResolvedValue(agreedRule);
    jest
      .mocked(relationshipRulesApi.deleteRelationshipRule)
      .mockResolvedValue(undefined);

    const mounted = await mountHook(() => ({
      create: useCreateRelationshipRuleMutation('relationship-1'),
      update: useUpdateRelationshipRuleMutation('relationship-1'),
      updateWithoutRelationship: useUpdateRelationshipRuleMutation(undefined),
      agree: useAgreeToRelationshipRuleMutation('relationship-1'),
      agreeWithoutRelationship: useAgreeToRelationshipRuleMutation(undefined),
      delete: useDeleteRelationshipRuleMutation('relationship-1'),
      deleteWithoutRelationship: useDeleteRelationshipRuleMutation(undefined),
    }));
    const mutations = mounted.getCurrent();
    if (!mutations) throw new Error('Expected relationship-rule mutations.');
    const invalidateQueries = jest.spyOn(
      mounted.queryClient,
      'invalidateQueries',
    );
    const createInput: CreateRelationshipRuleInput = {
      name: 'New rule',
      description: 'A new shared rule.',
      requiredApproverUserIds: ['user-1'],
    };
    const updateInput: UpdateRelationshipRuleInput = {
      name: 'Updated rule',
      description: 'An updated shared rule.',
    };

    await act(async () => {
      await mutations.create.mutateAsync(createInput);
      await mutations.update.mutateAsync({
        ruleId: updatedRule.id,
        input: updateInput,
      });
      await mutations.updateWithoutRelationship.mutateAsync({
        ruleId: updatedRule.id,
        input: updateInput,
      });
      await mutations.agree.mutateAsync(agreedRule.id);
      await mutations.agreeWithoutRelationship.mutateAsync(agreedRule.id);
      mounted.queryClient.setQueryData(
        relationshipRuleQueryKeys.detail('deleted-rule'),
        makeRule('deleted-rule', 'relationship-1'),
      );
      await mutations.delete.mutateAsync('deleted-rule');
      await mutations.deleteWithoutRelationship.mutateAsync(
        'other-deleted-rule',
      );
    });

    expect(
      mounted.queryClient.getQueryData(
        relationshipRuleQueryKeys.detail(createdRule.id),
      ),
    ).toEqual(createdRule);
    expect(
      mounted.queryClient.getQueryData(
        relationshipRuleQueryKeys.detail(updatedRule.id),
      ),
    ).toEqual(updatedRule);
    expect(
      mounted.queryClient.getQueryData(
        relationshipRuleQueryKeys.detail(agreedRule.id),
      ),
    ).toEqual(agreedRule);
    expect(
      mounted.queryClient.getQueryState(
        relationshipRuleQueryKeys.detail('deleted-rule'),
      ),
    ).toBeUndefined();
    expect(relationshipRulesApi.createRelationshipRule).toHaveBeenCalledWith(
      'relationship-1',
      createInput,
    );
    expect(relationshipRulesApi.updateRelationshipRule).toHaveBeenCalledTimes(
      2,
    );
    expect(relationshipRulesApi.agreeToRelationshipRule).toHaveBeenCalledTimes(
      2,
    );
    expect(relationshipRulesApi.deleteRelationshipRule).toHaveBeenCalledTimes(
      2,
    );
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: relationshipRuleQueryKeys.awaitingDecisionPrefix,
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: relationshipRuleQueryKeys.listPrefix('relationship-1'),
    });
  });
});
