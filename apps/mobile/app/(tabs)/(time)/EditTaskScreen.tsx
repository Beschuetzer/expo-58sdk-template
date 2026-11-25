import type { UpdateRelationshipTaskInput } from '@expo-50sdk-template/shared-types';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';

import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import { ThemeAwareText } from '@/components/ui/ThemeAwareText';
import { AppRoutePaths } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import { useRelationshipsQuery } from '@/features/payment-requests/hooks/usePaymentRequests';
import { RelationshipTaskForm } from '@/features/time/components/RelationshipTaskForm';
import { canUserCompleteRelationshipTask } from '@/features/time/filters';
import {
  useCompleteRelationshipTaskMutation,
  useRelationshipTaskQuery,
  useUpdateRelationshipTaskMutation,
} from '@/features/time/hooks/useTime';
import { useI18n } from '@/utils/i18n';

function renderScreenMessage(
  title: string,
  message: string,
  backButton?: ReactNode,
) {
  return (
    <>
      <Stack.Screen options={{ title }} />
      <ThemeAwareScreen bottomContent={backButton}>
        <ThemeAwareText>{message}</ThemeAwareText>
      </ThemeAwareScreen>
    </>
  );
}

export default function EditTaskScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { isAuthenticated, user } = useOAuth2Auth();
  const params = useLocalSearchParams<{
    id?: string | string[];
    detailNavigationId?: string | string[];
    detailNavigationSource?: string | string[];
    relationshipId?: string | string[];
  }>();
  const taskId = Array.isArray(params.id) ? params.id[0] : params.id;
  const detailNavigationId = Array.isArray(params.detailNavigationId)
    ? params.detailNavigationId[0]
    : params.detailNavigationId;
  const detailNavigationSource = Array.isArray(params.detailNavigationSource)
    ? params.detailNavigationSource[0]
    : params.detailNavigationSource;
  const relationshipId = Array.isArray(params.relationshipId)
    ? params.relationshipId[0]
    : params.relationshipId;
  const taskQuery = useRelationshipTaskQuery(
    relationshipId,
    taskId,
    Boolean(user?.subject),
  );
  const relationshipsQuery = useRelationshipsQuery(Boolean(user?.subject));
  const completeMutation = useCompleteRelationshipTaskMutation(
    relationshipId ?? '',
  );
  const updateMutation = useUpdateRelationshipTaskMutation(relationshipId);
  const title = t('time.editTask');
  const backToTasksButton = (
    <ThemeAwareButton
      onPress={() => router.dismissTo(AppRoutePaths.viewAllIncompleteTasks)}
    >
      {t('time.viewAllTasks')}
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
  const userId = user.subject;

  if (!taskId || !relationshipId) {
    return renderScreenMessage(
      title,
      t('time.taskNotFound'),
      backToTasksButton,
    );
  }

  if (taskQuery.isLoading || relationshipsQuery.isLoading) {
    return renderScreenMessage(title, t('common.loading'), backToTasksButton);
  }

  if (taskQuery.error) {
    return renderScreenMessage(
      title,
      taskQuery.error.message,
      backToTasksButton,
    );
  }

  if (relationshipsQuery.error) {
    return renderScreenMessage(
      title,
      relationshipsQuery.error.message,
      backToTasksButton,
    );
  }

  const task = taskQuery.data;
  if (!task) {
    return renderScreenMessage(
      title,
      t('time.taskNotFound'),
      backToTasksButton,
    );
  }
  const editableTask = task;

  if (!canUserCompleteRelationshipTask(editableTask, user.subject)) {
    return renderScreenMessage(
      title,
      t('time.taskEditForbidden'),
      backToTasksButton,
    );
  }

  const relationship = relationshipsQuery.data?.find(
    (candidate) => candidate.id === editableTask.relationshipId,
  );
  if (!relationship) {
    return renderScreenMessage(
      title,
      t('time.noRelationship'),
      backToTasksButton,
    );
  }

  const returnToTaskDetails = () =>
    router.dismissTo({
      pathname: AppRoutePaths.taskDetails,
      params: {
        id: editableTask.id,
        relationshipId: editableTask.relationshipId,
        ...(detailNavigationId ? { detailNavigationId } : {}),
        ...(detailNavigationSource ? { detailNavigationSource } : {}),
      },
    });

  async function saveTask(input: UpdateRelationshipTaskInput) {
    const updatedTask = await updateMutation.mutateAsync({
      taskId: editableTask.id,
      input,
    });
    if (
      updatedTask.visibleToUserIds.length > 0 &&
      !updatedTask.visibleToUserIds.includes(userId)
    ) {
      router.dismissTo(AppRoutePaths.viewAllIncompleteTasks);
      return;
    }

    returnToTaskDetails();
  }

  const completionError = completeMutation.error
    ? completeMutation.error.message
      ? completeMutation.error
      : new Error(t('time.taskCompleteError'))
    : null;

  return (
    <RelationshipTaskForm
      key={editableTask.id}
      additionalBottomAction={
        <ThemeAwareButton
          flex={1}
          isDisabled={updateMutation.isPending || completeMutation.isPending}
          onPress={() =>
            completeMutation.mutate(editableTask.id, {
              onSuccess: returnToTaskDetails,
            })
          }
          variant="outline"
        >
          {completeMutation.isPending
            ? t('time.completingTask')
            : t('time.markComplete')}
        </ThemeAwareButton>
      }
      descriptionText={t('time.editTaskDescription')}
      error={completionError ?? updateMutation.error}
      initialValue={editableTask}
      isPending={updateMutation.isPending || completeMutation.isPending}
      members={relationship.members}
      onSubmit={saveTask}
      submitLabel={t('time.saveTask')}
      title={title}
    />
  );
}
