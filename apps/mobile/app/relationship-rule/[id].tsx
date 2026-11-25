import type { RelationshipRuleStatus } from '@expo-50sdk-template/shared-types';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { DetailSwipeNavigator } from '@/components/ui/DetailSwipeNavigator';
import { EntityDeleteButton } from '@/components/ui/EntityDeleteButton';
import { ThemeAwareBadge } from '@/components/ui/ThemeAwareBadge';
import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareCardSurface } from '@/components/ui/ThemeAwareCardSurface';
import { ThemeAwareLoadingIndicator } from '@/components/ui/ThemeAwareLoadingIndicator';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import { ThemeAwareSkeleton } from '@/components/ui/ThemeAwareSkeleton';
import {
  ThemeAwareHeading,
  ThemeAwareText,
} from '@/components/ui/ThemeAwareText';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { CARD_ARTWORK } from '@/constants/cardArtwork';
import { AppRoutePaths, DetailNavigationSources } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import { useRelationshipMembersQuery } from '@/features/payment-requests/hooks/usePaymentRequests';
import {
  useAgreeToRelationshipRuleMutation,
  useDeleteRelationshipRuleMutation,
  useRelationshipRuleQuery,
} from '@/features/relationship-rules/hooks/useRelationshipRules';
import { getMemberDisplayName } from '@/features/relationships/utils';
import { useI18n, type Locale, type TranslationKey } from '@/utils/i18n';

function statusLabel(status: RelationshipRuleStatus): TranslationKey {
  return status === 'ratified' ? 'rules.ratified' : 'rules.pendingApproval';
}

function formatDate(value: string, locale: Locale) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(locale);
}

function DetailField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <VStack space="xs">
      <ThemeAwareText fontWeight="$semibold" opacity={0.75} size="sm">
        {label}
      </ThemeAwareText>
      {children}
    </VStack>
  );
}

export default function RelationshipRuleDetailsScreen() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const { isAuthenticated, user } = useOAuth2Auth();
  const params = useLocalSearchParams<{
    id?: string | string[];
    detailNavigationId?: string | string[];
    detailNavigationSource?: string | string[];
  }>();
  const ruleId = Array.isArray(params.id) ? params.id[0] : params.id;
  const detailNavigationId = Array.isArray(params.detailNavigationId)
    ? params.detailNavigationId[0]
    : params.detailNavigationId;
  const detailNavigationSource = Array.isArray(params.detailNavigationSource)
    ? params.detailNavigationSource[0]
    : params.detailNavigationSource;
  const returnToRules =
    detailNavigationSource === DetailNavigationSources.awaitingDecision
      ? AppRoutePaths.awaitingDecision
      : AppRoutePaths.viewAllRules;
  const ruleQuery = useRelationshipRuleQuery(ruleId, Boolean(user?.subject));
  const rule = ruleQuery.data;
  const membersQuery = useRelationshipMembersQuery(
    rule?.relationshipId,
    Boolean(user?.subject),
  );
  const agreeMutation = useAgreeToRelationshipRuleMutation(
    rule?.relationshipId,
  );
  const deleteMutation = useDeleteRelationshipRuleMutation(
    rule?.relationshipId,
  );
  const canEdit =
    rule?.createdByUserId === user?.subject ||
    Boolean(
      rule?.approvals.some(
        (approval) => approval.memberUserId === user?.subject,
      ),
    );
  const backToRulesButton = (
    <ThemeAwareButton onPress={() => router.dismissTo(returnToRules)}>
      {t('rules.viewAll')}
    </ThemeAwareButton>
  );

  if (!isAuthenticated) {
    return (
      <>
        <Stack.Screen options={{ title: t('rules.ruleDetails') }} />
        <ThemeAwareScreen bottomContent={backToRulesButton}>
          <ThemeAwareText>{t('paymentRequests.signIn')}</ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  if (!user?.subject) {
    return (
      <>
        <Stack.Screen options={{ title: t('rules.ruleDetails') }} />
        <ThemeAwareScreen bottomContent={backToRulesButton}>
          <ThemeAwareText>{t('auth.signedIn')}</ThemeAwareText>
          <ThemeAwareText>{t('auth.profileUnavailable')}</ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  if (!ruleId) {
    return (
      <>
        <Stack.Screen options={{ title: t('rules.ruleDetails') }} />
        <ThemeAwareScreen bottomContent={backToRulesButton}>
          <ThemeAwareText>{t('rules.notFound')}</ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  if (ruleQuery.isLoading || !rule) {
    return (
      <>
        <Stack.Screen options={{ title: t('rules.ruleDetails') }} />
        <ThemeAwareScreen bottomContent={backToRulesButton}>
          {!ruleQuery.error ? <ThemeAwareLoadingIndicator /> : null}
          <ThemeAwareText>
            {ruleQuery.error?.message ?? t('common.loading')}
          </ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  const members = membersQuery.data ?? [];
  const currentApproval = rule.approvals.find(
    (approval) => approval.memberUserId === user.subject,
  );
  const canAgree =
    rule.status === 'pending_approval' &&
    currentApproval !== undefined &&
    !currentApproval.agreedAt;
  const canDelete = rule.createdByUserId === user.subject;
  const creatorName = getMemberDisplayName(rule.createdByUserId, members);

  return (
    <>
      <Stack.Screen options={{ title: t('rules.ruleDetails') }} />
      <ThemeAwareScreen
        fixedHeaderContent={<ThemeAwareHeading>{rule.name}</ThemeAwareHeading>}
        bottomContent={
          <VStack space="sm">
            {agreeMutation.isPending ? (
              <ThemeAwareText>{t('rules.agreementPending')}</ThemeAwareText>
            ) : null}
            {canAgree ? (
              <ThemeAwareButton
                isDisabled={agreeMutation.isPending}
                onPress={() => agreeMutation.mutate(rule.id)}
              >
                {t('rules.agree')}
              </ThemeAwareButton>
            ) : null}
            {canEdit ? (
              <ThemeAwareButton
                onPress={() =>
                  router.push({
                    pathname: AppRoutePaths.editRule,
                    params: {
                      id: rule.id,
                      ...(detailNavigationSource
                        ? { detailNavigationSource }
                        : {}),
                      ...(detailNavigationId ? { detailNavigationId } : {}),
                    },
                  })
                }
              >
                {t('rules.edit')}
              </ThemeAwareButton>
            ) : null}
            <HStack space="sm">
              <ThemeAwareButton
                flex={1}
                onPress={() => router.dismissTo(returnToRules)}
              >
                {t('rules.viewAll')}
              </ThemeAwareButton>
              {canDelete ? (
                <EntityDeleteButton
                  disabled={deleteMutation.isPending}
                  flex={1}
                  onDelete={() =>
                    deleteMutation.mutate(rule.id, {
                      onSuccess: () => router.dismissTo(returnToRules),
                    })
                  }
                />
              ) : null}
            </HStack>
          </VStack>
        }
      >
        <DetailSwipeNavigator
          itemId={detailNavigationId ?? rule.id}
          source={detailNavigationSource}
        >
          <VStack space="md">
            <ThemeAwareCardSurface
              backgroundImage={CARD_ARTWORK.planning}
              borderRadius="$sm"
              p="$4"
            >
              <VStack space="md">
                <HStack space="md" className="items-start justify-between">
                  <DetailField label={t('rules.status')}>
                    <ThemeAwareBadge>
                      {t(statusLabel(rule.status))}
                    </ThemeAwareBadge>
                  </DetailField>
                  <DetailField label={t('rules.createdBy')}>
                    {membersQuery.isLoading ? (
                      <ThemeAwareSkeleton height={14} width={92} />
                    ) : (
                      <ThemeAwareText>{creatorName}</ThemeAwareText>
                    )}
                  </DetailField>
                </HStack>
                {rule.labels.length > 0 ? (
                  <DetailField label={t('rules.labels')}>
                    <HStack space="xs" className="flex-wrap">
                      {rule.labels.map((label) => (
                        <ThemeAwareBadge key={label}>{label}</ThemeAwareBadge>
                      ))}
                    </HStack>
                  </DetailField>
                ) : null}
                <DetailField label={t('rules.dateCreated')}>
                  <ThemeAwareText>
                    {formatDate(rule.createdAt, locale)}
                  </ThemeAwareText>
                </DetailField>
                <DetailField label={t('rules.dateRatified')}>
                  <ThemeAwareText>
                    {rule.ratifiedAt
                      ? formatDate(rule.ratifiedAt, locale)
                      : t('rules.notRatified')}
                  </ThemeAwareText>
                </DetailField>
                <DetailField label={t('rules.description')}>
                  <ThemeAwareText>{rule.description}</ThemeAwareText>
                </DetailField>
                <DetailField label={t('rules.approvals')}>
                  <VStack space="sm">
                    {rule.approvals.map((approval) => (
                      <ThemeAwareCardSurface
                        backgroundImage={CARD_ARTWORK.planning}
                        key={approval.memberUserId}
                        borderRadius="$sm"
                        p="$3"
                      >
                        <HStack
                          space="sm"
                          className="items-center justify-between"
                        >
                          {membersQuery.isLoading ? (
                            <ThemeAwareSkeleton height={14} width="55%" />
                          ) : (
                            <ThemeAwareText flex={1}>
                              {getMemberDisplayName(
                                approval.memberUserId,
                                members,
                              )}
                            </ThemeAwareText>
                          )}
                          <ThemeAwareBadge
                            darkBackground={
                              approval.agreedAt ? '$success900' : '$warning900'
                            }
                            darkTextColor={
                              approval.agreedAt ? '$success100' : '$warning100'
                            }
                            lightBackground={
                              approval.agreedAt ? '$success100' : '$warning100'
                            }
                            lightTextColor={
                              approval.agreedAt ? '$success800' : '$warning800'
                            }
                          >
                            {t(
                              approval.agreedAt
                                ? 'rules.agreed'
                                : 'rules.awaitingAgreement',
                            )}
                          </ThemeAwareBadge>
                        </HStack>
                        {approval.agreedAt ? (
                          <ThemeAwareText opacity={0.75} size="sm" pt="$1">
                            {formatDate(approval.agreedAt, locale)}
                          </ThemeAwareText>
                        ) : null}
                      </ThemeAwareCardSurface>
                    ))}
                  </VStack>
                </DetailField>
                {membersQuery.error ? (
                  <ThemeAwareText color="$error600">
                    {membersQuery.error.message}
                  </ThemeAwareText>
                ) : null}
                {agreeMutation.error ? (
                  <ThemeAwareText color="$error600">
                    {agreeMutation.error.message}
                  </ThemeAwareText>
                ) : null}
                {deleteMutation.error ? (
                  <ThemeAwareText color="$error600">
                    {deleteMutation.error.message}
                  </ThemeAwareText>
                ) : null}
              </VStack>
            </ThemeAwareCardSurface>
          </VStack>
        </DetailSwipeNavigator>
      </ThemeAwareScreen>
    </>
  );
}
