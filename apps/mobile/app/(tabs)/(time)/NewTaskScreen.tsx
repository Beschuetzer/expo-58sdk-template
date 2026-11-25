import type { RelationshipSummary } from '@expo-50sdk-template/shared-types';
import { Stack, useRouter } from 'expo-router';

import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import { ThemeAwareText } from '@/components/ui/ThemeAwareText';
import { VStack } from '@/components/ui/vstack';
import { AppRoutePaths } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import { useRelationshipsQuery } from '@/features/payment-requests/hooks/usePaymentRequests';
import { RelationshipTaskForm } from '@/features/time/components/RelationshipTaskForm';
import { useCreateRelationshipTaskMutation } from '@/features/time/hooks/useTime';
import { selectedRelationshipIdSelector } from '@/state/slices/generalSlice';
import { useAppSelector } from '@/state/store';
import { useI18n } from '@/utils/i18n';

function CreateTaskForm({
  relationship,
}: {
  relationship: RelationshipSummary;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const createMutation = useCreateRelationshipTaskMutation(relationship.id);

  async function createTask(
    input: Parameters<typeof createMutation.mutateAsync>[0],
  ) {
    await createMutation.mutateAsync(input);
    router.dismissTo(AppRoutePaths.viewAllIncompleteTasks);
  }

  return (
    <RelationshipTaskForm
      descriptionText={t('time.createTaskDescription')}
      error={createMutation.error}
      isPending={createMutation.isPending}
      members={relationship.members}
      onSubmit={createTask}
      submitLabel={t('time.createTask')}
      title={t('time.createTask')}
    />
  );
}

export default function NewTaskScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { isAuthenticated, user } = useOAuth2Auth();
  const relationshipsQuery = useRelationshipsQuery(Boolean(user?.subject));
  const relationships = relationshipsQuery.data ?? [];
  const selectedRelationshipId = useAppSelector(selectedRelationshipIdSelector);
  const relationship = relationships.find(
    (candidate) => candidate.id === selectedRelationshipId,
  );

  if (!isAuthenticated) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={{ title: t('time.createTask') }} />
        <ThemeAwareText>{t('paymentRequests.signIn')}</ThemeAwareText>
      </ThemeAwareScreen>
    );
  }

  if (!user?.subject) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={{ title: t('time.createTask') }} />
        <ThemeAwareText>{t('auth.profileUnavailable')}</ThemeAwareText>
      </ThemeAwareScreen>
    );
  }

  if (relationshipsQuery.isLoading) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={{ title: t('time.createTask') }} />
        <ThemeAwareText>{t('common.loading')}</ThemeAwareText>
      </ThemeAwareScreen>
    );
  }

  if (relationshipsQuery.error) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={{ title: t('time.createTask') }} />
        <ThemeAwareText>{relationshipsQuery.error.message}</ThemeAwareText>
      </ThemeAwareScreen>
    );
  }

  if (!relationship) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={{ title: t('time.createTask') }} />
        <VStack space="md">
          <ThemeAwareText>{t('time.noRelationship')}</ThemeAwareText>
          <ThemeAwareButton onPress={() => router.navigate(AppRoutePaths.home)}>
            {t('rules.openHome')}
          </ThemeAwareButton>
        </VStack>
      </ThemeAwareScreen>
    );
  }

  return <CreateTaskForm key={relationship.id} relationship={relationship} />;
}
