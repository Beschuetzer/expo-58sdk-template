import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareCardSurface } from '@/components/ui/ThemeAwareCardSurface';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import { ThemeAwareSurface } from '@/components/ui/ThemeAwareSurface';
import {
  ThemeAwareHeading,
  ThemeAwareText,
} from '@/components/ui/ThemeAwareText';
import { CARD_ARTWORK } from '@/constants/cardArtwork';
import { AppRoutePaths } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import { getDisplayNameFromClaims } from '@/features/auth/client';
import {
  useAcceptInvitationMutation,
  useInvitationPreviewQuery,
} from '@/features/payment-requests/hooks/usePaymentRequests';
import { useI18n } from '@/utils/i18n';

export default function InvitationScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { isAuthenticated, isReady, callAuthenticatedEndpoint, user } =
    useOAuth2Auth();
  const displayName = getDisplayNameFromClaims(user?.claims ?? {});
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const previewQuery = useInvitationPreviewQuery(token, isAuthenticated);
  const acceptMutation = useAcceptInvitationMutation();

  const onAccept = async () => {
    if (!token) return;
    await acceptMutation.mutateAsync({ token, displayName });
    router.replace(AppRoutePaths.home);
  };

  return (
    <ThemeAwareScreen>
      <Stack.Screen
        options={{ title: t('paymentRequests.invitationPreview') }}
      />
      <ThemeAwareSurface p="$4">
        {!token ? (
          <ThemeAwareText>
            {t('paymentRequests.invalidInvitation')}
          </ThemeAwareText>
        ) : !isAuthenticated ? (
          <ThemeAwareCardSurface
            backgroundImage={CARD_ARTWORK.relationships}
            borderRadius="$sm"
            p="$4"
          >
            <ThemeAwareHeading>
              {t('paymentRequests.invitationPreview')}
            </ThemeAwareHeading>
            <ThemeAwareText>
              {t('paymentRequests.invitationSignIn')}
            </ThemeAwareText>
            <ThemeAwareButton
              isDisabled={!isReady}
              onPress={() => callAuthenticatedEndpoint()}
            >
              {t('paymentRequests.signIn')}
            </ThemeAwareButton>
          </ThemeAwareCardSurface>
        ) : previewQuery.isLoading ? (
          <ThemeAwareText>{t('common.loading')}</ThemeAwareText>
        ) : previewQuery.error ? (
          <ThemeAwareText>{previewQuery.error.message}</ThemeAwareText>
        ) : previewQuery.data ? (
          <ThemeAwareCardSurface
            backgroundImage={CARD_ARTWORK.relationships}
            borderRadius="$sm"
            p="$4"
          >
            <ThemeAwareHeading>
              {previewQuery.data.relationshipName}
            </ThemeAwareHeading>
            <ThemeAwareText>
              {t('paymentRequests.invitationFrom')}{' '}
              {previewQuery.data.inviterUserId}
            </ThemeAwareText>
            <ThemeAwareButton
              isDisabled={acceptMutation.isPending}
              onPress={() => onAccept().catch(() => undefined)}
            >
              {t('paymentRequests.acceptInvitation')}
            </ThemeAwareButton>
            {acceptMutation.error ? (
              <ThemeAwareText>{acceptMutation.error.message}</ThemeAwareText>
            ) : null}
          </ThemeAwareCardSurface>
        ) : null}
      </ThemeAwareSurface>
    </ThemeAwareScreen>
  );
}
