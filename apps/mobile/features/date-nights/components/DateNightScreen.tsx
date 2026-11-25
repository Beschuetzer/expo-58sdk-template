import { Stack, useRouter } from 'expo-router';

import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import {
  ThemeAwareHeading,
  ThemeAwareText,
} from '@/components/ui/ThemeAwareText';
import { VStack } from '@/components/ui/vstack';
import { AppRoutePaths } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import { DateNightTracker } from '@/features/date-nights/components/DateNightTracker';
import { useRelationshipsQuery } from '@/features/payment-requests/hooks/usePaymentRequests';
import { selectedRelationshipIdSelector } from '@/state/slices/generalSlice';
import { useAppSelector } from '@/state/store';
import { useI18n } from '@/utils/i18n';

export function DateNightScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { isAuthenticated, user } = useOAuth2Auth();
  const relationshipsQuery = useRelationshipsQuery(Boolean(user?.subject));
  const relationships = relationshipsQuery.data ?? [];
  const selectedRelationshipId = useAppSelector(selectedRelationshipIdSelector);
  const relationship = relationships.find(
    (candidate) => candidate.id === selectedRelationshipId,
  );

  return (
    <ThemeAwareScreen>
      <Stack.Screen options={{ title: t('dateNight.title') }} />
      <VStack space="md">
        <VStack space="xs">
          <ThemeAwareHeading>{t('dateNight.title')}</ThemeAwareHeading>
          <ThemeAwareText>{t('dateNight.screenDescription')}</ThemeAwareText>
        </VStack>
        {!isAuthenticated ? (
          <ThemeAwareText>{t('paymentRequests.signIn')}</ThemeAwareText>
        ) : !user?.subject ? (
          <ThemeAwareText>{t('auth.profileUnavailable')}</ThemeAwareText>
        ) : relationshipsQuery.isLoading ? (
          <ThemeAwareText>{t('common.loading')}</ThemeAwareText>
        ) : relationshipsQuery.error ? (
          <ThemeAwareText color="$error600">
            {t('common.relationshipLoadError')}
          </ThemeAwareText>
        ) : relationship ? (
          <DateNightTracker key={relationship.id} relationship={relationship} />
        ) : (
          <VStack space="md">
            <ThemeAwareText>{t('dateNight.noRelationship')}</ThemeAwareText>
            <ThemeAwareButton
              onPress={() => router.navigate(AppRoutePaths.home)}
            >
              {t('rules.openHome')}
            </ThemeAwareButton>
          </VStack>
        )}
      </VStack>
    </ThemeAwareScreen>
  );
}
