import type {
  CreateMeTimeInput,
  RelationshipSummary,
} from '@expo-50sdk-template/shared-types';
import { Stack, useRouter } from 'expo-router';

import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import { ThemeAwareText } from '@/components/ui/ThemeAwareText';
import { VStack } from '@/components/ui/vstack';
import { AppRoutePaths } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import { useRelationshipsQuery } from '@/features/payment-requests/hooks/usePaymentRequests';
import { MeTimeForm } from '@/features/time/components/MeTimeForm';
import { useCreateMeTimeMutation } from '@/features/time/hooks/useTime';
import { selectedRelationshipIdSelector } from '@/state/slices/generalSlice';
import { useAppSelector } from '@/state/store';
import { useI18n } from '@/utils/i18n';

function CreateMeTimeForm({
  relationship,
}: {
  relationship: RelationshipSummary;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const createMutation = useCreateMeTimeMutation(relationship.id);

  async function createEntry(input: CreateMeTimeInput) {
    await createMutation.mutateAsync(input);
    router.dismissTo(AppRoutePaths.viewAllMeTime);
  }

  return (
    <>
      <Stack.Screen options={{ title: t('time.createMeTime') }} />
      <MeTimeForm
        descriptionText={t('time.createMeTimeDescription')}
        error={createMutation.error}
        isPending={createMutation.isPending}
        onSubmit={createEntry}
        submitLabel={t('time.createMeTime')}
        title={t('time.createMeTime')}
      />
    </>
  );
}

export default function NewMeTimeScreen() {
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
        <Stack.Screen options={{ title: t('time.createMeTime') }} />
        <ThemeAwareText>{t('paymentRequests.signIn')}</ThemeAwareText>
      </ThemeAwareScreen>
    );
  }

  if (!user?.subject) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={{ title: t('time.createMeTime') }} />
        <ThemeAwareText>{t('auth.profileUnavailable')}</ThemeAwareText>
      </ThemeAwareScreen>
    );
  }

  if (relationshipsQuery.isLoading) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={{ title: t('time.createMeTime') }} />
        <ThemeAwareText>{t('common.loading')}</ThemeAwareText>
      </ThemeAwareScreen>
    );
  }

  if (relationshipsQuery.error) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={{ title: t('time.createMeTime') }} />
        <ThemeAwareText>{relationshipsQuery.error.message}</ThemeAwareText>
      </ThemeAwareScreen>
    );
  }

  if (!relationship) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={{ title: t('time.createMeTime') }} />
        <VStack space="md">
          <ThemeAwareText>{t('time.noRelationship')}</ThemeAwareText>
          <ThemeAwareButton onPress={() => router.navigate(AppRoutePaths.home)}>
            {t('rules.openHome')}
          </ThemeAwareButton>
        </VStack>
      </ThemeAwareScreen>
    );
  }

  return <CreateMeTimeForm relationship={relationship} />;
}
