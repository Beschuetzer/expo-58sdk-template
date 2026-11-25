import { useRouter } from 'expo-router';

import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareCardSurface } from '@/components/ui/ThemeAwareCardSurface';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import {
  ThemeAwareHeading,
  ThemeAwareText,
} from '@/components/ui/ThemeAwareText';
import { VStack } from '@/components/ui/vstack';
import { CARD_ARTWORK } from '@/constants/cardArtwork';
import { AppRoutePaths } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import { getDisplayNameFromClaims } from '@/features/auth/client';
import { CreateRelationshipCard } from '@/features/relationships/components/CreateRelationshipCard';
import { useI18n } from '@/utils/i18n';

export default function CreateRelationshipScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { isAuthenticated, user } = useOAuth2Auth();
  const displayName = user ? getDisplayNameFromClaims(user.claims) : undefined;
  const title = t('paymentRequests.createRelationship');

  return isAuthenticated ? (
    <CreateRelationshipCard
      displayName={displayName}
      fixedSubmitButton
      onCreated={() => router.back()}
      submitLabel={title}
      title={title}
    />
  ) : (
    <ThemeAwareScreen>
      <ThemeAwareCardSurface
        backgroundImage={CARD_ARTWORK.relationships}
        borderRadius="$lg"
        p="$5"
      >
        <VStack space="md">
          <ThemeAwareHeading>{t('home.signedOutStatus')}</ThemeAwareHeading>
          <ThemeAwareText>{t('home.signedOutMessage')}</ThemeAwareText>
          <ThemeAwareButton
            onPress={() => router.navigate(AppRoutePaths.account)}
          >
            {t('home.signIn')}
          </ThemeAwareButton>
        </VStack>
      </ThemeAwareCardSurface>
    </ThemeAwareScreen>
  );
}
