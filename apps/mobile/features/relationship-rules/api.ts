import type {
  CreateRelationshipRuleInput,
  RelationshipRule,
  RelationshipRuleListFilters,
  RelationshipRuleListResponse,
  UpdateRelationshipRuleInput,
} from '@expo-50sdk-template/shared-types';

import { requestAuthenticatedJson } from '@/features/auth/authenticatedClient';

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { data } = await requestAuthenticatedJson<T>(path, init);
  return data;
}

function buildQuery(filters: RelationshipRuleListFilters) {
  const search = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

export function getRelationshipRules(
  relationshipId: string,
  filters: RelationshipRuleListFilters = {},
) {
  return requestJson<RelationshipRuleListResponse>(
    `/api/v1/relationships/${encodeURIComponent(relationshipId)}/rules${buildQuery(filters)}`,
  );
}

export function createRelationshipRule(
  relationshipId: string,
  input: CreateRelationshipRuleInput,
) {
  return requestJson<RelationshipRule>(
    `/api/v1/relationships/${encodeURIComponent(relationshipId)}/rules`,
    { method: 'POST', body: JSON.stringify(input) },
  );
}

export function updateRelationshipRule(
  ruleId: string,
  input: UpdateRelationshipRuleInput,
) {
  return requestJson<RelationshipRule>(
    `/api/v1/relationship-rules/${encodeURIComponent(ruleId)}`,
    { method: 'PATCH', body: JSON.stringify(input) },
  );
}

export function getRelationshipRule(ruleId: string) {
  return requestJson<RelationshipRule>(
    `/api/v1/relationship-rules/${encodeURIComponent(ruleId)}`,
  );
}

export function deleteRelationshipRule(ruleId: string) {
  return requestJson<void>(
    `/api/v1/relationship-rules/${encodeURIComponent(ruleId)}`,
    { method: 'DELETE' },
  );
}

export function agreeToRelationshipRule(ruleId: string) {
  return requestJson<RelationshipRule>(
    `/api/v1/relationship-rules/${encodeURIComponent(ruleId)}/agree`,
    { method: 'POST' },
  );
}
