import { Stack, useRouter } from 'expo-router';

import { MainTabNavigationMenu } from '@/components/ui/MainTabNavigationMenu';
import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import {
  ThemeAwareHeading,
  ThemeAwareText,
} from '@/components/ui/ThemeAwareText';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { AppRoutePaths } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import { useRelationshipsQuery } from '@/features/payment-requests/hooks/usePaymentRequests';
import { selectedRelationshipIdSelector } from '@/state/slices/generalSlice';
import { useAppSelector } from '@/state/store';
import { useI18n } from '@/utils/i18n';

export function SexTabScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { isAuthenticated, user } = useOAuth2Auth();
  const relationshipsQuery = useRelationshipsQuery(Boolean(user?.subject));
  const relationships = relationshipsQuery.data ?? [];
  const selectedRelationshipId = useAppSelector(selectedRelationshipIdSelector);
  const relationship = relationships.find(
    (candidate) => candidate.id === selectedRelationshipId,
  );
  const bottomContent = (
    <HStack space="sm">
      <ThemeAwareButton
        className="flex-1"
        onPress={() => router.navigate(AppRoutePaths.loveMakingSessions)}
        size="sm"
      >
        {t('sex.sessionsTitle')}
      </ThemeAwareButton>
      <ThemeAwareButton
        className="flex-1"
        onPress={() => router.navigate(AppRoutePaths.dateNights)}
        size="sm"
      >
        {t('dateNight.title')}
      </ThemeAwareButton>
    </HStack>
  );

  return (
    <ThemeAwareScreen bottomContent={bottomContent}>
      <Stack.Screen
        options={{
          title: t('tabs.sex'),
          headerLeft: () => <MainTabNavigationMenu />,
        }}
      />
      <VStack space="md">
        <VStack space="xs">
          <ThemeAwareHeading>{t('sex.overviewTitle')}</ThemeAwareHeading>
          <ThemeAwareText>{t('sex.overviewDescription')}</ThemeAwareText>
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
        ) : relationship ? null : (
          <VStack space="md">
            <ThemeAwareText>{t('sex.noRelationship')}</ThemeAwareText>
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
