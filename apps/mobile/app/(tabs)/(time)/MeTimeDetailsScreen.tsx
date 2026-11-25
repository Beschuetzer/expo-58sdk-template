import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { DetailSwipeNavigator } from '@/components/ui/DetailSwipeNavigator';
import { EntityDeleteButton } from '@/components/ui/EntityDeleteButton';
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
import { AppRoutePaths } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import { useRelationshipMembersQuery } from '@/features/payment-requests/hooks/usePaymentRequests';
import { getMemberDisplayName } from '@/features/relationships/utils';
import { getMeTimeCreatedByDisplayName } from '@/features/time/filters';
import {
  useDeleteMeTimeMutation,
  useMeTimeEntryQuery,
} from '@/features/time/hooks/useTime';
import { useI18n } from '@/utils/i18n';

function formatDateTime(value: string, locale: string) {
  return new Date(value).toLocaleString(locale);
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

export default function MeTimeDetailsScreen() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const { isAuthenticated, user } = useOAuth2Auth();
  const params = useLocalSearchParams<{
    id?: string | string[];
    relationshipId?: string | string[];
    detailNavigationSource?: string | string[];
  }>();
  const meTimeId = Array.isArray(params.id) ? params.id[0] : params.id;
  const relationshipId = Array.isArray(params.relationshipId)
    ? params.relationshipId[0]
    : params.relationshipId;
  const detailNavigationSource = Array.isArray(params.detailNavigationSource)
    ? params.detailNavigationSource[0]
    : params.detailNavigationSource;
  const entryQuery = useMeTimeEntryQuery(
    relationshipId,
    meTimeId,
    Boolean(user?.subject),
  );
  const deleteMutation = useDeleteMeTimeMutation(relationshipId);
  const membersQuery = useRelationshipMembersQuery(
    entryQuery.data?.relationshipId,
    Boolean(user?.subject),
  );
  const title = t('time.meTimeDetails');
  const backToMeTimeButton = (
    <ThemeAwareButton
      onPress={() => router.dismissTo(AppRoutePaths.viewAllMeTime)}
    >
      {t('time.viewAllMeTime')}
    </ThemeAwareButton>
  );

  if (!isAuthenticated) {
    return renderScreenMessage(
      title,
      t('paymentRequests.signIn'),
      backToMeTimeButton,
    );
  }

  if (!user?.subject) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <ThemeAwareScreen bottomContent={backToMeTimeButton}>
          <ThemeAwareText>{t('auth.signedIn')}</ThemeAwareText>
          <ThemeAwareText>{t('auth.profileUnavailable')}</ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  if (!meTimeId || !relationshipId) {
    return renderScreenMessage(
      title,
      t('time.meTimeNotFound'),
      backToMeTimeButton,
    );
  }

  if (entryQuery.isLoading) {
    return renderScreenMessage(
      title,
      t('common.loading'),
      backToMeTimeButton,
      true,
    );
  }

  if (entryQuery.error) {
    return renderScreenMessage(
      title,
      entryQuery.error.message,
      backToMeTimeButton,
    );
  }

  const entry = entryQuery.data;
  if (!entry) {
    return renderScreenMessage(
      title,
      t('time.meTimeNotFound'),
      backToMeTimeButton,
    );
  }

  const canEdit = entry.createdByUserId === user.subject;

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ThemeAwareScreen
        bottomContent={
          <VStack space="sm">
            <HStack space="sm">
              <ThemeAwareButton
                flex={1}
                onPress={() => router.dismissTo(AppRoutePaths.viewAllMeTime)}
              >
                {t('time.viewAllMeTime')}
              </ThemeAwareButton>
              {canEdit ? (
                <ThemeAwareButton
                  flex={1}
                  onPress={() =>
                    router.push({
                      pathname: AppRoutePaths.editMeTime,
                      params: {
                        id: entry.id,
                        relationshipId: entry.relationshipId,
                        ...(detailNavigationSource
                          ? { detailNavigationSource }
                          : {}),
                      },
                    })
                  }
                >
                  {t('time.editMeTime')}
                </ThemeAwareButton>
              ) : null}
            </HStack>
            {canEdit ? (
              <HStack>
                <EntityDeleteButton
                  disabled={deleteMutation.isPending}
                  flex={1}
                  onDelete={() =>
                    deleteMutation.mutate(entry.id, {
                      onSuccess: () =>
                        router.dismissTo(AppRoutePaths.viewAllMeTime),
                    })
                  }
                />
              </HStack>
            ) : null}
          </VStack>
        }
        fixedHeaderContent={
          <ThemeAwareHeading>
            {entry.description || t('time.meTime')}
          </ThemeAwareHeading>
        }
      >
        <DetailSwipeNavigator itemId={entry.id} source={detailNavigationSource}>
          <ThemeAwareCardSurface
            backgroundImage={CARD_ARTWORK.personalTime}
            borderRadius="$sm"
            p="$4"
          >
            <VStack space="md">
              {entry.description ? (
                <DetailField label={t('time.description')}>
                  <ThemeAwareText>{entry.description}</ThemeAwareText>
                </DetailField>
              ) : null}
              <DetailField label={t('time.startTime')}>
                <ThemeAwareText>
                  {formatDateTime(entry.startTime, locale)}
                </ThemeAwareText>
              </DetailField>
              <DetailField label={t('time.endTime')}>
                <ThemeAwareText>
                  {formatDateTime(entry.endTime, locale)}
                </ThemeAwareText>
              </DetailField>
              <DetailField label={t('time.createdBy')}>
                {membersQuery.isLoading ? (
                  <ThemeAwareSkeleton height={14} width={96} />
                ) : (
                  <ThemeAwareText>
                    {getMeTimeCreatedByDisplayName(
                      entry,
                      membersQuery.data ?? [],
                    )}
                  </ThemeAwareText>
                )}
              </DetailField>
              <DetailField label={t('time.recordedAt')}>
                <ThemeAwareText>
                  {formatDateTime(entry.createdAt, locale)}
                </ThemeAwareText>
              </DetailField>
              {entry.updatedByUserId ? (
                <DetailField label={t('time.lastEditedBy')}>
                  {membersQuery.isLoading ? (
                    <ThemeAwareSkeleton height={14} width={96} />
                  ) : (
                    <ThemeAwareText>
                      {getMemberDisplayName(
                        entry.updatedByUserId,
                        membersQuery.data ?? [],
                      )}
                    </ThemeAwareText>
                  )}
                </DetailField>
              ) : null}
              {entry.updatedByUserId ? (
                <DetailField label={t('time.lastEditedAt')}>
                  <ThemeAwareText>
                    {formatDateTime(entry.updatedAt, locale)}
                  </ThemeAwareText>
                </DetailField>
              ) : null}
            </VStack>
          </ThemeAwareCardSurface>
          {membersQuery.error ? (
            <ThemeAwareText color="$error600">
              {membersQuery.error.message}
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
