import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Share } from 'react-native';

import {
  DetailNavigationCollectionRegistration,
  DetailSwipeNavigator,
} from '@/components/ui/DetailSwipeNavigator';
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
import { createInvitationUrl } from '@/features/auth/client';
import {
  useCreateRelationshipInvitationMutation,
  useDeleteRelationshipMutation,
  useDecideRelationshipJoinRequestMutation,
  useRelationshipJoinRequestsQuery,
  useRelationshipMembersQuery,
  useRelationshipsQuery,
} from '@/features/payment-requests/hooks/usePaymentRequests';
import { RelationshipActivationButton } from '@/features/relationships/components/RelationshipActivationButton';
import {
  selectedRelationshipIdSelector,
  setSelectedRelationshipId,
} from '@/state/slices/generalSlice';
import { useAppDispatch, useAppSelector } from '@/state/store';
import { useI18n } from '@/utils/i18n';
import { logError } from '@/utils/logging';

export default function RelationshipDetailsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const backToRelationshipsButton = (
    <ThemeAwareButton onPress={() => router.dismissTo(AppRoutePaths.home)}>
      {t('home.relationshipsTitle')}
    </ThemeAwareButton>
  );
  const { isAuthenticated, user } = useOAuth2Auth();
  const params = useLocalSearchParams<{
    id?: string | string[];
    detailNavigationSource?: string | string[];
  }>();
  const relationshipId = Array.isArray(params.id) ? params.id[0] : params.id;
  const detailNavigationSource = Array.isArray(params.detailNavigationSource)
    ? params.detailNavigationSource[0]
    : params.detailNavigationSource;
  const [invitationError, setInvitationError] = useState(false);
  const relationshipsQuery = useRelationshipsQuery(isAuthenticated);
  const relationships = relationshipsQuery.data ?? [];
  const dispatch = useAppDispatch();
  const selectedRelationshipId = useAppSelector(selectedRelationshipIdSelector);
  const relationship = relationships.find(
    (candidate) => candidate.id === relationshipId,
  );
  const membersQuery = useRelationshipMembersQuery(
    relationshipId,
    isAuthenticated,
  );
  const members = membersQuery.data ?? relationship?.members ?? [];
  const isOwner = members.some(
    (member) => member.userId === user?.subject && member.role === 'owner',
  );
  const joinRequestsQuery = useRelationshipJoinRequestsQuery(
    relationshipId,
    isAuthenticated && isOwner,
  );
  const decisionMutation =
    useDecideRelationshipJoinRequestMutation(relationshipId);
  const invitationMutation = useCreateRelationshipInvitationMutation(
    relationshipId ?? '',
  );
  const deleteMutation = useDeleteRelationshipMutation();

  if (!isAuthenticated) {
    return (
      <ThemeAwareScreen bottomContent={backToRelationshipsButton}>
        <ThemeAwareButton
          onPress={() => router.navigate(AppRoutePaths.account)}
        >
          {t('home.signIn')}
        </ThemeAwareButton>
      </ThemeAwareScreen>
    );
  }

  if (relationshipsQuery.isLoading || membersQuery.isLoading) {
    return (
      <ThemeAwareScreen bottomContent={backToRelationshipsButton}>
        <ThemeAwareLoadingIndicator />
        <ThemeAwareText>{t('common.loading')}</ThemeAwareText>
      </ThemeAwareScreen>
    );
  }

  if (relationshipsQuery.error || membersQuery.error || !relationship) {
    return (
      <ThemeAwareScreen bottomContent={backToRelationshipsButton}>
        <ThemeAwareText>
          {relationshipsQuery.error instanceof Error
            ? relationshipsQuery.error.message
            : membersQuery.error instanceof Error
              ? membersQuery.error.message
              : t('home.relationshipNotFound')}
        </ThemeAwareText>
      </ThemeAwareScreen>
    );
  }

  const currentRelationshipId = relationship.id;
  const joinRequestNavigationSource =
    DetailNavigationSources.relationshipJoinRequests(currentRelationshipId);
  const inviteSomeone = async () => {
    setInvitationError(false);

    try {
      const invitation = await invitationMutation.mutateAsync({});
      const invitationUrl = createInvitationUrl(invitation.token);
      await Share.share({
        message: [
          t('home.invitationShareMessage'),
          relationship.name,
          invitationUrl,
        ].join('\n\n'),
        title: t('home.invitationShareTitle'),
      });
    } catch (error) {
      logError('relationship_invitation_failed', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
      setInvitationError(true);
    }
  };

  return (
    <ThemeAwareScreen
      bottomContent={
        isOwner ? (
          <HStack space="sm">
            {backToRelationshipsButton}
            <EntityDeleteButton
              disabled={deleteMutation.isPending}
              flex={1}
              onDelete={() =>
                deleteMutation.mutate(currentRelationshipId, {
                  onSuccess: () => {
                    if (selectedRelationshipId === currentRelationshipId) {
                      dispatch(setSelectedRelationshipId(null));
                    }
                    router.dismissTo(AppRoutePaths.home);
                  },
                })
              }
            />
          </HStack>
        ) : (
          backToRelationshipsButton
        )
      }
    >
      <DetailNavigationCollectionRegistration
        source={joinRequestNavigationSource}
        itemIds={(joinRequestsQuery.data ?? []).map((request) => request.id)}
        hrefForId={(id) => ({
          pathname: AppRoutePaths.relationshipJoinRequestDetails,
          params: {
            id,
            relationshipId: currentRelationshipId,
            detailNavigationSource: joinRequestNavigationSource,
          },
        })}
      />
      <Stack.Screen
        options={{
          title: relationship.name,
        }}
      />
      <DetailSwipeNavigator
        itemId={relationship.id}
        source={detailNavigationSource}
      >
        <VStack space="lg" className="p-4">
          <VStack space="xs">
            <ThemeAwareHeading>{relationship.name}</ThemeAwareHeading>
            <ThemeAwareText>{t('home.detailsDescription')}</ThemeAwareText>
            <HStack space="xs" className="items-center">
              <ThemeAwareText>
                {t('home.relationshipShareCode')}:
              </ThemeAwareText>
              <ThemeAwareText>{relationship.shareCode}</ThemeAwareText>
            </HStack>
          </VStack>

          <ThemeAwareText size="sm">
            {t('home.relationshipActivationDescription')}
          </ThemeAwareText>
          <RelationshipActivationButton
            isActive={selectedRelationshipId === relationship.id}
            onActivate={() =>
              dispatch(setSelectedRelationshipId(relationship.id))
            }
          />

          <ThemeAwareCardSurface
            backgroundImage={CARD_ARTWORK.relationships}
            borderRadius="$lg"
            p="$5"
          >
            <VStack space="md">
              <ThemeAwareHeading>{t('home.membersTitle')}</ThemeAwareHeading>
              {members.map((member) => (
                <HStack
                  key={member.id}
                  className="justify-between items-center"
                >
                  <ThemeAwareText>
                    {member.displayName ?? member.userId}
                  </ThemeAwareText>
                  <ThemeAwareText>
                    {member.role === 'owner'
                      ? t('home.owner')
                      : t('home.member')}
                  </ThemeAwareText>
                </HStack>
              ))}
            </VStack>
          </ThemeAwareCardSurface>

          {isOwner ? (
            <ThemeAwareCardSurface
              backgroundImage={CARD_ARTWORK.relationships}
              borderRadius="$lg"
              p="$5"
            >
              <VStack space="md">
                <ThemeAwareHeading>
                  {t('home.pendingJoinRequestsTitle')}
                </ThemeAwareHeading>
                {joinRequestsQuery.isLoading ? (
                  <ThemeAwareText>{t('common.loading')}</ThemeAwareText>
                ) : joinRequestsQuery.error ? (
                  <ThemeAwareText>{t('home.joinRequestError')}</ThemeAwareText>
                ) : joinRequestsQuery.data?.length ? (
                  joinRequestsQuery.data.map((request) => (
                    <VStack key={request.id} space="sm">
                      <ThemeAwareButton
                        onPress={() =>
                          router.push({
                            pathname:
                              AppRoutePaths.relationshipJoinRequestDetails,
                            params: {
                              id: request.id,
                              relationshipId: currentRelationshipId,
                              detailNavigationSource:
                                joinRequestNavigationSource,
                            },
                          })
                        }
                        variant="link"
                      >
                        <ThemeAwareText>
                          {request.requesterDisplayName ??
                            request.requesterUserId}
                        </ThemeAwareText>
                      </ThemeAwareButton>
                      <HStack space="sm">
                        <ThemeAwareButton
                          disabled={decisionMutation.isPending}
                          flex={1}
                          onPress={() =>
                            decisionMutation.mutate({
                              requestId: request.id,
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
                              requestId: request.id,
                              input: { decision: 'rejected' },
                            })
                          }
                          variant="outline"
                        >
                          {t('home.rejectJoinRequest')}
                        </ThemeAwareButton>
                      </HStack>
                    </VStack>
                  ))
                ) : (
                  <ThemeAwareText>
                    {t('home.noPendingJoinRequests')}
                  </ThemeAwareText>
                )}
                {decisionMutation.error ? (
                  <ThemeAwareText>{t('home.joinRequestError')}</ThemeAwareText>
                ) : null}
              </VStack>
            </ThemeAwareCardSurface>
          ) : null}

          <VStack space="sm">
            <ThemeAwareButton
              onPress={() => router.navigate(AppRoutePaths.viewAllRequests)}
            >
              {t('home.viewRequests')}
            </ThemeAwareButton>
            {isOwner ? (
              <>
                <ThemeAwareButton
                  isDisabled={invitationMutation.isPending}
                  onPress={inviteSomeone}
                  variant="outline"
                >
                  {invitationMutation.isPending
                    ? t('home.invitationCreating')
                    : t('home.inviteMember')}
                </ThemeAwareButton>
                {invitationError ? (
                  <ThemeAwareText color="$error600">
                    {t('home.invitationFailed')}
                  </ThemeAwareText>
                ) : null}
              </>
            ) : null}
          </VStack>
          {deleteMutation.error ? (
            <ThemeAwareText color="$error600">
              {deleteMutation.error.message}
            </ThemeAwareText>
          ) : null}
        </VStack>
      </DetailSwipeNavigator>
    </ThemeAwareScreen>
  );
}
