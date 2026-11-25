import type { useRouter } from 'expo-router';

import { AppRoutePaths } from '@/constants/navigation';

export type NotificationRouter = Pick<ReturnType<typeof useRouter>, 'push'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function navigateToNotificationTarget(
  target: unknown,
  router: NotificationRouter,
): boolean {
  if (!isRecord(target)) return false;

  const { id, relationshipId, type } = target;
  if (!nonEmptyString(id)) return false;

  switch (type) {
    case 'relationship':
      router.push({
        pathname: AppRoutePaths.relationshipDetails,
        params: { id },
      });
      return true;
    case 'relationshipJoinRequest':
      if (nonEmptyString(relationshipId)) {
        router.push({
          pathname: AppRoutePaths.relationshipJoinRequestDetails,
          params: { id, relationshipId },
        });
        return true;
      }
      return false;
    case 'paymentRequest':
      router.push({
        pathname: AppRoutePaths.paymentRequestDetails,
        params: { id },
      });
      return true;
    case 'jointAccountCharge':
      router.push({
        pathname: AppRoutePaths.jointAccountChargeDetails,
        params: { id },
      });
      return true;
    case 'budget':
      router.push({
        pathname: AppRoutePaths.budgetDetails,
        params: { id },
      });
      return true;
    case 'relationshipRule':
      router.push({
        pathname: AppRoutePaths.relationshipRuleDetails,
        params: { id },
      });
      return true;
    case 'meTime':
      if (nonEmptyString(relationshipId)) {
        router.push({
          pathname: AppRoutePaths.meTimeDetails,
          params: { id, relationshipId },
        });
        return true;
      }
      return false;
    case 'relationshipTask':
      if (nonEmptyString(relationshipId)) {
        router.push({
          pathname: AppRoutePaths.taskDetails,
          params: { id, relationshipId },
        });
        return true;
      }
      return false;
    default:
      return false;
  }
}
