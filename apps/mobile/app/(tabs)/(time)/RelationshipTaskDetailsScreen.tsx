import type { RelationshipTaskEditableField } from '@expo-50sdk-template/shared-types';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { startTransition, useOptimistic, type ReactNode } from 'react';

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
import { useRelationshipMembersQuery } from '@/features/payment-requests/hooks/usePaymentRequests';
import { getMemberDisplayName } from '@/features/relationships/utils';
import { canUserCompleteRelationshipTask } from '@/features/time/filters';
import {
  useCompleteRelationshipTaskMutation,
  useDeleteRelationshipTaskMutation,
  useRelationshipTaskQuery,
} from '@/features/time/hooks/useTime';
import { useI18n } from '@/utils/i18n';

function formatDateTime(value: string, locale: string) {
  return new Date(value).toLocaleString(locale);
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

export default function RelationshipTaskDetailsScreen() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const { isAuthenticated, user } = useOAuth2Auth();
  const params = useLocalSearchParams<{
    id?: string | string[];
    detailNavigationId?: string | string[];
    relationshipId?: string | string[];
    detailNavigationSource?: string | string[];
  }>();
  const taskId = Array.isArray(params.id) ? params.id[0] : params.id;
  const detailNavigationId = Array.isArray(params.detailNavigationId)
    ? params.detailNavigationId[0]
    : params.detailNavigationId;
  const relationshipId = Array.isArray(params.relationshipId)
    ? params.relationshipId[0]
    : params.relationshipId;
  const detailNavigationSource = Array.isArray(params.detailNavigationSource)
    ? params.detailNavigationSource[0]
    : params.detailNavigationSource;
  const taskQuery = useRelationshipTaskQuery(
    relationshipId,
    taskId,
    Boolean(user?.subject),
  );
  const task = taskQuery.data;
  const membersQuery = useRelationshipMembersQuery(
    task?.relationshipId,
    Boolean(user?.subject),
  );
  const completeMutation = useCompleteRelationshipTaskMutation(
    relationshipId ?? '',
  );
  const [isOptimisticallyCompleting, setOptimisticallyCompleting] =
    useOptimistic(false, (_current, next: boolean) => next);
  const isCompleting = completeMutation.isPending || isOptimisticallyCompleting;
  const deleteMutation = useDeleteRelationshipTaskMutation(relationshipId);
  const title = t('time.taskDetails');
  const returnToTaskList =
    detailNavigationSource === DetailNavigationSources.awaitingDecision
      ? AppRoutePaths.awaitingDecision
      : task?.completedAt
        ? AppRoutePaths.viewAllCompletedTasks
        : AppRoutePaths.viewAllIncompleteTasks;
  const backToTasksButton = (
    <ThemeAwareButton
      onPress={() => router.dismissTo(returnToTaskList)}
      variant="outline"
    >
      {task?.completedAt
        ? t('time.viewCompletedTasks')
        : t('time.viewAllTasks')}
    </ThemeAwareButton>
  );

  if (!isAuthenticated) {
    return renderScreenMessage(
      title,
      t('paymentRequests.signIn'),
      backToTasksButton,
    );
  }

  if (!user?.subject) {
    return renderScreenMessage(
      title,
      t('auth.profileUnavailable'),
      backToTasksButton,
    );
  }

  if (!taskId || !relationshipId) {
    return renderScreenMessage(
      title,
      t('time.taskNotFound'),
      backToTasksButton,
    );
  }

  if (taskQuery.isLoading) {
    return renderScreenMessage(
      title,
      t('common.loading'),
      backToTasksButton,
      true,
    );
  }

  if (taskQuery.error || !task) {
    return renderScreenMessage(
      title,
      taskQuery.error?.message ?? t('time.taskNotFound'),
      backToTasksButton,
    );
  }

  const memberList = membersQuery.data ?? [];
  const visibleTo =
    task.visibleToUserIds.length > 0
      ? task.visibleToUserIds
          .map((userId) => getMemberDisplayName(userId, memberList))
          .join(', ')
      : t('time.allMembers');
  const completableBy =
    task.completableByUserIds.length > 0
      ? task.completableByUserIds
          .map((userId) => getMemberDisplayName(userId, memberList))
          .join(', ')
      : t('time.allMembers');
  const canComplete = canUserCompleteRelationshipTask(task, user.subject);
  const canEdit = canComplete;
  const canDelete = task.createdByUserId === user.subject;
  const lastEditedFieldLabels: Record<RelationshipTaskEditableField, string> = {
    name: t('time.taskName'),
    dueDate: t('time.taskDueDate'),
    reminderFrequencyDays: t('time.taskReminderFrequency'),
    visibleToUserIds: t('time.taskVisibleTo'),
    completableByUserIds: t('time.taskCompletableBy'),
  };
  const lastEditedChanges = (task.lastEditedFields ?? [])
    .map((field) => lastEditedFieldLabels[field])
    .join(', ');
  const completeTask = () => {
    startTransition(async () => {
      setOptimisticallyCompleting(true);
      try {
        await completeMutation.mutateAsync(task.id);
      } catch {
        // The mutation error is rendered below.
      }
    });
  };

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ThemeAwareScreen
        bottomContent={
          <VStack space="sm">
            <HStack space="sm">
              <ThemeAwareButton
                flex={1}
                onPress={() => router.dismissTo(returnToTaskList)}
                variant="outline"
              >
                {task.completedAt
                  ? t('time.viewCompletedTasks')
                  : t('time.viewAllTasks')}
              </ThemeAwareButton>
              {canEdit ? (
                <ThemeAwareButton
                  flex={1}
                  onPress={() =>
                    router.push({
                      pathname: AppRoutePaths.editTask,
                      params: {
                        id: task.id,
                        relationshipId: task.relationshipId,
                        ...(detailNavigationId ? { detailNavigationId } : {}),
                        ...(detailNavigationSource
                          ? { detailNavigationSource }
                          : {}),
                      },
                    })
                  }
                >
                  {t('time.editTask')}
                </ThemeAwareButton>
              ) : canDelete ? (
                <EntityDeleteButton
                  disabled={deleteMutation.isPending}
                  flex={1}
                  onDelete={() =>
                    deleteMutation.mutate(task.id, {
                      onSuccess: () => router.dismissTo(returnToTaskList),
                    })
                  }
                />
              ) : null}
            </HStack>
            {canComplete || (canEdit && canDelete) ? (
              <HStack space="sm">
                {canComplete ? (
                  <ThemeAwareButton
                    flex={1}
                    isDisabled={isCompleting}
                    onPress={completeTask}
                    variant="outline"
                  >
                    {isCompleting
                      ? t('time.completingTask')
                      : t('time.markComplete')}
                  </ThemeAwareButton>
                ) : null}
                {canEdit && canDelete ? (
                  <EntityDeleteButton
                    disabled={deleteMutation.isPending}
                    flex={1}
                    onDelete={() =>
                      deleteMutation.mutate(task.id, {
                        onSuccess: () => router.dismissTo(returnToTaskList),
                      })
                    }
                  />
                ) : null}
              </HStack>
            ) : null}
          </VStack>
        }
        fixedHeaderContent={<ThemeAwareHeading>{task.name}</ThemeAwareHeading>}
      >
        <DetailSwipeNavigator
          itemId={detailNavigationId ?? task.id}
          source={detailNavigationSource}
        >
          <ThemeAwareCardSurface
            backgroundImage={CARD_ARTWORK.planning}
            borderRadius="$sm"
            p="$4"
          >
            <VStack space="md">
              <VStack space="xs">
                <ThemeAwareText fontWeight="$semibold" opacity={0.75} size="sm">
                  {t('time.createdBy')}
                </ThemeAwareText>
                <ThemeAwareText>
                  {getMemberDisplayName(task.createdByUserId, memberList)}
                </ThemeAwareText>
              </VStack>
              <VStack space="xs">
                <ThemeAwareText fontWeight="$semibold" opacity={0.75} size="sm">
                  {t('time.recordedAt')}
                </ThemeAwareText>
                <ThemeAwareText>
                  {formatDateTime(task.createdAt, locale)}
                </ThemeAwareText>
              </VStack>
              {task.updatedByUserId ? (
                <VStack space="xs">
                  <ThemeAwareText
                    fontWeight="$semibold"
                    opacity={0.75}
                    size="sm"
                  >
                    {t('time.lastEditedBy')}
                  </ThemeAwareText>
                  <ThemeAwareText>
                    {getMemberDisplayName(task.updatedByUserId, memberList)}
                  </ThemeAwareText>
                </VStack>
              ) : null}
              {task.lastEditedAt ? (
                <VStack space="xs">
                  <ThemeAwareText
                    fontWeight="$semibold"
                    opacity={0.75}
                    size="sm"
                  >
                    {t('time.lastEditedAt')}
                  </ThemeAwareText>
                  <ThemeAwareText>
                    {formatDateTime(task.lastEditedAt, locale)}
                  </ThemeAwareText>
                </VStack>
              ) : null}
              {lastEditedChanges ? (
                <VStack space="xs">
                  <ThemeAwareText
                    fontWeight="$semibold"
                    opacity={0.75}
                    size="sm"
                  >
                    {t('time.lastEditedChanges')}
                  </ThemeAwareText>
                  <ThemeAwareText>{lastEditedChanges}</ThemeAwareText>
                </VStack>
              ) : null}
              {task.dueDate ? (
                <VStack space="xs">
                  <ThemeAwareText
                    fontWeight="$semibold"
                    opacity={0.75}
                    size="sm"
                  >
                    {t('time.taskDueDate')}
                  </ThemeAwareText>
                  <ThemeAwareText>
                    {formatDateTime(task.dueDate, locale)}
                  </ThemeAwareText>
                </VStack>
              ) : null}
              {task.dueDate ? (
                <VStack space="xs">
                  <ThemeAwareText
                    fontWeight="$semibold"
                    opacity={0.75}
                    size="sm"
                  >
                    {t('time.taskReminderFrequency')}
                  </ThemeAwareText>
                  <ThemeAwareText>
                    {task.reminderFrequencyDays ?? 1}
                  </ThemeAwareText>
                </VStack>
              ) : null}
              <VStack space="xs">
                <ThemeAwareText fontWeight="$semibold" opacity={0.75} size="sm">
                  {t('time.completedAt')}
                </ThemeAwareText>
                <ThemeAwareText>
                  {task.completedAt
                    ? formatDateTime(task.completedAt, locale)
                    : t('time.notCompletedYet')}
                </ThemeAwareText>
              </VStack>
              {task.completedByUserId ? (
                <VStack space="xs">
                  <ThemeAwareText
                    fontWeight="$semibold"
                    opacity={0.75}
                    size="sm"
                  >
                    {t('time.completedBy')}
                  </ThemeAwareText>
                  <ThemeAwareText>
                    {getMemberDisplayName(task.completedByUserId, memberList)}
                  </ThemeAwareText>
                </VStack>
              ) : null}
              <VStack space="xs">
                <ThemeAwareText fontWeight="$semibold" opacity={0.75} size="sm">
                  {t('time.taskVisibleTo')}
                </ThemeAwareText>
                <ThemeAwareText>{visibleTo}</ThemeAwareText>
              </VStack>
              <VStack space="xs">
                <ThemeAwareText fontWeight="$semibold" opacity={0.75} size="sm">
                  {t('time.taskCompletableBy')}
                </ThemeAwareText>
                <ThemeAwareText>{completableBy}</ThemeAwareText>
              </VStack>
            </VStack>
          </ThemeAwareCardSurface>
          {!canComplete && !task.completedAt ? (
            <ThemeAwareText>{t('time.cannotCompleteTask')}</ThemeAwareText>
          ) : null}
          {completeMutation.error ? (
            <ThemeAwareText color="$error600">
              {completeMutation.error.message || t('time.taskCompleteError')}
            </ThemeAwareText>
          ) : null}
          {deleteMutation.error ? (
            <ThemeAwareText color="$error600">
              {deleteMutation.error.message}
            </ThemeAwareText>
          ) : null}
          {membersQuery.error ? (
            <ThemeAwareText color="$error600">
              {membersQuery.error.message}
            </ThemeAwareText>
          ) : null}
        </DetailSwipeNavigator>
      </ThemeAwareScreen>
    </>
  );
}
