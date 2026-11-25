import type { UpdateMeTimeInput } from '@expo-50sdk-template/shared-types';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import { ThemeAwareText } from '@/components/ui/ThemeAwareText';
import { AppRoutePaths } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import { MeTimeForm } from '@/features/time/components/MeTimeForm';
import {
  useMeTimeEntryQuery,
  useUpdateMeTimeMutation,
} from '@/features/time/hooks/useTime';
import { useI18n } from '@/utils/i18n';

export default function EditMeTimeScreen() {
  const { t } = useI18n();
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
  const updateMutation = useUpdateMeTimeMutation(relationshipId);
  const title = t('time.editMeTime');
  const backToMeTimeButton = (
    <ThemeAwareButton
      onPress={() => router.dismissTo(AppRoutePaths.viewAllMeTime)}
    >
      {t('time.viewAllMeTime')}
    </ThemeAwareButton>
  );

  if (!isAuthenticated) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <ThemeAwareScreen bottomContent={backToMeTimeButton}>
          <ThemeAwareText>{t('paymentRequests.signIn')}</ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  if (!user?.subject) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <ThemeAwareScreen bottomContent={backToMeTimeButton}>
          <ThemeAwareText>{t('auth.profileUnavailable')}</ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  if (!meTimeId || !relationshipId) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <ThemeAwareScreen bottomContent={backToMeTimeButton}>
          <ThemeAwareText>{t('time.meTimeNotFound')}</ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  if (entryQuery.isLoading) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <ThemeAwareScreen bottomContent={backToMeTimeButton}>
          <ThemeAwareText>{t('common.loading')}</ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  if (entryQuery.error) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <ThemeAwareScreen bottomContent={backToMeTimeButton}>
          <ThemeAwareText>{entryQuery.error.message}</ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  const entry = entryQuery.data;
  if (!entry) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <ThemeAwareScreen bottomContent={backToMeTimeButton}>
          <ThemeAwareText>{t('time.meTimeNotFound')}</ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  if (entry.createdByUserId !== user.subject) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <ThemeAwareScreen bottomContent={backToMeTimeButton}>
          <ThemeAwareText>{t('time.meTimeEditForbidden')}</ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  const editableEntry = entry;

  async function saveMeTime(input: UpdateMeTimeInput) {
    await updateMutation.mutateAsync({ meTimeId: editableEntry.id, input });
    router.dismissTo({
      pathname: AppRoutePaths.meTimeDetails,
      params: {
        id: editableEntry.id,
        relationshipId: editableEntry.relationshipId,
        ...(detailNavigationSource ? { detailNavigationSource } : {}),
      },
    });
  }

  return (
    <>
      <Stack.Screen options={{ title }} />
      <MeTimeForm
        error={updateMutation.error}
        initialValue={editableEntry}
        isPending={updateMutation.isPending}
        onSubmit={saveMeTime}
        submitLabel={t('time.saveMeTime')}
        title={title}
      />
    </>
  );
}
