import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { DetailSwipeNavigator } from '@/components/ui/DetailSwipeNavigator';
import { EntityDeleteButton } from '@/components/ui/EntityDeleteButton';
import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareCardSurface } from '@/components/ui/ThemeAwareCardSurface';
import { ThemeAwareLoadingIndicator } from '@/components/ui/ThemeAwareLoadingIndicator';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import {
  ThemeAwareHeading,
  ThemeAwareText,
} from '@/components/ui/ThemeAwareText';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { CARD_ARTWORK } from '@/constants/cardArtwork';
import { AppRoutePaths, DetailNavigationSources } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import {
  useDecideRelationshipJoinRequestMutation,
  useDeleteRelationshipJoinRequestMutation,
  useRelationshipJoinRequestQuery,
  useRelationshipsQuery,
} from '@/features/payment-requests/hooks/usePaymentRequests';
import { useI18n } from '@/utils/i18n';

function renderScreenMessage(
  title: string,
  message: string,
  bottomContent?: ReactNode,
  showLoadingIndicator = false,
) {
  return (
    <>
      <Stack.Screen options={{ title }} />
      <ThemeAwareScreen bottomContent={bottomContent}>
        {showLoadingIndicator ? <ThemeAwareLoadingIndicator /> : null}
        <ThemeAwareText>{message}</ThemeAwareText>
      </ThemeAwareScreen>
    </>
  );
}

export default function RelationshipJoinRequestDetailsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { isAuthenticated, user } = useOAuth2Auth();
  const params = useLocalSearchParams<{
    id?: string | string[];
    detailNavigationId?: string | string[];
    relationshipId?: string | string[];
    detailNavigationSource?: string | string[];
  }>();
  const requestId = Array.isArray(params.id) ? params.id[0] : params.id;
  const detailNavigationId = Array.isArray(params.detailNavigationId)
    ? params.detailNavigationId[0]
    : params.detailNavigationId;
  const relationshipId = Array.isArray(params.relationshipId)
    ? params.relationshipId[0]
    : params.relationshipId;
  const detailNavigationSource = Array.isArray(params.detailNavigationSource)
    ? params.detailNavigationSource[0]
    : params.detailNavigationSource;
  const requestQuery = useRelationshipJoinRequestQuery(
    relationshipId,
    requestId,
    Boolean(user?.subject),
  );
  const relationshipsQuery = useRelationshipsQuery(Boolean(user?.subject));
  const relationship = relationshipsQuery.data?.find(
    (candidate) => candidate.id === relationshipId,
  );
  const isOwner = relationship?.members.some(
    (member) => member.userId === user?.subject && member.role === 'owner',
  );
  const returnToRequests =
    detailNavigationSource === DetailNavigationSources.awaitingDecision;
  const decisionMutation =
    useDecideRelationshipJoinRequestMutation(relationshipId);
  const deleteMutation =
    useDeleteRelationshipJoinRequestMutation(relationshipId);
  const title = t('home.joinRequestDetails');
  const backToJoinRequestsButton = relationshipId ? (
    <ThemeAwareButton
      onPress={() => {
        if (returnToRequests) {
          router.dismissTo(AppRoutePaths.awaitingDecision);
          return;
        }
        router.dismissTo({
          pathname: AppRoutePaths.relationshipDetails,
          params: {
            id: relationshipId,
            detailNavigationSource: DetailNavigationSources.relationships,
          },
        });
      }}
      variant="outline"
    >
      {t('home.pendingJoinRequestsTitle')}
    </ThemeAwareButton>
  ) : null;

  if (!isAuthenticated) {
    return renderScreenMessage(
      title,
      t('paymentRequests.signIn'),
      backToJoinRequestsButton,
    );
  }

  if (!user?.subject) {
    return renderScreenMessage(
      title,
      t('auth.profileUnavailable'),
      backToJoinRequestsButton,
    );
  }

  if (!requestId || !relationshipId) {
    return renderScreenMessage(
      title,
      t('home.joinRequestError'),
      backToJoinRequestsButton,
    );
  }

  if (requestQuery.isLoading) {
    return renderScreenMessage(
      title,
      t('common.loading'),
      backToJoinRequestsButton,
      true,
    );
  }

  if (requestQuery.error || !requestQuery.data) {
    return renderScreenMessage(
      title,
      requestQuery.error?.message ?? t('home.joinRequestError'),
      backToJoinRequestsButton,
    );
  }

  const joinRequest = requestQuery.data;
  const statusText = {
    pending: t('home.joinRequestPending'),
    approved: t('home.joinRequestApproved'),
    rejected: t('home.joinRequestRejected'),
  }[joinRequest.status];

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ThemeAwareScreen
        bottomContent={
          <HStack space="sm">
            <ThemeAwareButton
              flex={1}
              onPress={() => {
                if (returnToRequests) {
                  router.dismissTo(AppRoutePaths.awaitingDecision);
                  return;
                }
                router.dismissTo({
                  pathname: AppRoutePaths.relationshipDetails,
                  params: {
                    id: relationshipId,
                    detailNavigationSource:
                      DetailNavigationSources.relationships,
                  },
                });
              }}
              variant="outline"
            >
              {t('home.pendingJoinRequestsTitle')}
            </ThemeAwareButton>
            {joinRequest.requesterUserId === user.subject ? (
              <EntityDeleteButton
                disabled={deleteMutation.isPending}
                flex={1}
                onDelete={() =>
                  deleteMutation.mutate(joinRequest.id, {
                    onSuccess: () =>
                      router.dismissTo(
                        returnToRequests
                          ? AppRoutePaths.awaitingDecision
                          : AppRoutePaths.home,
                      ),
                  })
                }
              />
            ) : null}
          </HStack>
        }
        fixedHeaderContent={
          <ThemeAwareHeading>
            {joinRequest.requesterDisplayName ??
              t('home.pendingJoinRequestsTitle')}
          </ThemeAwareHeading>
        }
      >
        <DetailSwipeNavigator
          itemId={detailNavigationId ?? joinRequest.id}
          source={detailNavigationSource}
        >
          <ThemeAwareCardSurface
            backgroundImage={CARD_ARTWORK.relationships}
            borderRadius="$sm"
            p="$4"
          >
            <VStack space="md">
              <VStack space="xs">
                <ThemeAwareText fontWeight="$semibold" opacity={0.75} size="sm">
                  {t('home.joinRequestStatus')}
                </ThemeAwareText>
                <ThemeAwareText>{statusText}</ThemeAwareText>
              </VStack>
              {relationship ? (
                <VStack space="xs">
                  <ThemeAwareText
                    fontWeight="$semibold"
                    opacity={0.75}
                    size="sm"
                  >
                    {t('home.relationshipName')}
                  </ThemeAwareText>
                  <ThemeAwareText>{relationship.name}</ThemeAwareText>
                </VStack>
              ) : null}
            </VStack>
          </ThemeAwareCardSurface>
          {decisionMutation.isPending ? (
            <ThemeAwareText>
              {t('home.joinRequestDecisionPending')}
            </ThemeAwareText>
          ) : null}
          {isOwner && joinRequest.status === 'pending' ? (
            <HStack space="sm">
              <ThemeAwareButton
                disabled={decisionMutation.isPending}
                flex={1}
                onPress={() =>
                  decisionMutation.mutate({
                    requestId,
                    input: { decision: 'approved' },
                  })
                }
              >
                {t('home.approveJoinRequest')}
              </ThemeAwareButton>
              <ThemeAwareButton
                disabled={decisionMutation.isPending}
                flex={1}
                onPress={() =>
                  decisionMutation.mutate({
                    requestId,
                    input: { decision: 'rejected' },
                  })
                }
                variant="outline"
              >
                {t('home.rejectJoinRequest')}
              </ThemeAwareButton>
            </HStack>
          ) : null}
          {decisionMutation.error ? (
            <ThemeAwareText color="$error600">
              {decisionMutation.error.message}
            </ThemeAwareText>
          ) : null}
          {deleteMutation.error ? (
            <ThemeAwareText color="$error600">
              {deleteMutation.error.message}
            </ThemeAwareText>
          ) : null}
        </DetailSwipeNavigator>
      </ThemeAwareScreen>
    </>
  );
}
