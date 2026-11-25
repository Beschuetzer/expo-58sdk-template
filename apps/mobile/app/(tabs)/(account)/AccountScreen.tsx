import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Image } from 'expo-image';
import { useEffect, useState, type ComponentProps } from 'react';

import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareCardSurface } from '@/components/ui/ThemeAwareCardSurface';
import { ThemeAwareHeading } from '@/components/ui/ThemeAwareHeading';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import { ThemeAwareText } from '@/components/ui/ThemeAwareText';
import { ButtonText } from '@/components/ui/button';
import { HStack } from '@/components/ui/hstack';
import { useThemeAwareColors } from '@/components/ui/useThemeAwareColors';
import { VStack } from '@/components/ui/vstack';
import { CARD_ARTWORK } from '@/constants/cardArtwork';
import { COLORS } from '@/constants/colors';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import {
  type AccountProvider,
  getAccountProviderFromClaims,
  getDisplayNameFromClaims,
  getProfilePictureFromClaims,
} from '@/features/auth/client';
import {
  checkExternalServiceConnections,
  type ServiceConnectionStatus,
} from '@/features/backend/api';
import { useI18n, type TranslationKey } from '@/utils/i18n';

type DiagnosticStatus = ServiceConnectionStatus | 'checking';

function DiagnosticRow({
  label,
  status,
  statusLabel,
}: {
  label: string;
  status: DiagnosticStatus;
  statusLabel: string;
}) {
  const { colorScheme } = useThemeAwareColors();
  const iconName =
    status === 'connected'
      ? 'check-circle'
      : status === 'unavailable'
        ? 'times-circle'
        : 'circle-o-notch';
  const iconColor =
    status === 'connected'
      ? COLORS[colorScheme].selected
      : status === 'unavailable'
        ? colorScheme === 'dark'
          ? '#ff6b6b'
          : '#c0392b'
        : COLORS[colorScheme].mutedText;

  return (
    <HStack space="md" className="justify-between items-center">
      <ThemeAwareText>{label}</ThemeAwareText>
      <HStack space="xs" className="items-center">
        <FontAwesome name={iconName} color={iconColor} size={16} />
        <ThemeAwareText>{statusLabel}</ThemeAwareText>
      </HStack>
    </HStack>
  );
}

const initialDiagnosticStatuses: {
  identityProvider: DiagnosticStatus;
  backend: DiagnosticStatus;
} = {
  backend: 'checking',
  identityProvider: 'checking',
};

const accountProviderTranslationKeys: Record<AccountProvider, TranslationKey> =
  {
    apple: 'account.providerApple',
    discord: 'account.providerDiscord',
    facebook: 'account.providerFacebook',
    github: 'account.providerGitHub',
    gitlab: 'account.providerGitLab',
    google: 'account.providerGoogle',
    linkedin: 'account.providerLinkedIn',
    microsoft: 'account.providerMicrosoft',
    x: 'account.providerX',
  };

function AccountIcon(props: Omit<ComponentProps<typeof FontAwesome>, 'name'>) {
  return <FontAwesome {...props} name="user-circle" />;
}

function getClaimText(
  claims: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = claims[key];
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const values = value.filter(
      (item): item is string =>
        typeof item === 'string' && item.trim().length > 0,
    );
    return values.length > 0 ? values.join(', ') : undefined;
  }
  return undefined;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <HStack space="md" className="justify-between items-start">
      <ThemeAwareText flex={1} color="$textLight500" fontSize="$sm">
        {label}
      </ThemeAwareText>
      <ThemeAwareText flex={2} textAlign="right">
        {value}
      </ThemeAwareText>
    </HStack>
  );
}

export default function AccountScreen() {
  const { t } = useI18n();
  const { colorScheme } = useThemeAwareColors();
  const accountIconColor = COLORS[colorScheme].tint;
  const [diagnosticStatuses, setDiagnosticStatuses] = useState(
    initialDiagnosticStatuses,
  );
  const [diagnosticRun, setDiagnosticRun] = useState(0);
  const {
    callAuthenticatedEndpoint,
    hasSetupError,
    isAuthenticated,
    isReady,
    retryAuthenticationSetup,
    resetAuthentication,
    state: authState,
    user,
  } = useOAuth2Auth();
  const displayName = user
    ? getDisplayNameFromClaims(user.claims) ?? user.subject
    : undefined;
  const picture = user ? getProfilePictureFromClaims(user.claims) : undefined;
  const accountProvider = user
    ? getAccountProviderFromClaims(user.claims)
    : undefined;
  const email = user ? getClaimText(user.claims, 'email') : undefined;
  const username = user
    ? getClaimText(user.claims, 'preferred_username') ??
      getClaimText(user.claims, 'nickname')
    : undefined;
  const subject =
    user?.subject ?? (user ? getClaimText(user.claims, 'sub') : undefined);
  const issuer = user ? getClaimText(user.claims, 'iss') : undefined;
  const audience = user ? getClaimText(user.claims, 'aud') : undefined;
  const isBusy = authState === 'authenticating' || authState === 'loading';
  const onPressSignIn = async () => {
    await callAuthenticatedEndpoint();
  };
  const onPressLogout = async () => {
    await resetAuthentication();
  };

  const statusMessage =
    authState === 'authenticating'
      ? 'status.authenticating'
      : authState === 'loading'
        ? 'status.loadingAuthenticatedRequest'
        : authState === 'cancelled'
          ? 'status.authenticationCancelled'
          : authState === 'success'
            ? 'auth.signedIn'
            : authState === 'error'
              ? 'errors.authenticationFailed'
              : null;

  useEffect(() => {
    let isCurrent = true;
    checkExternalServiceConnections().then((result) => {
      if (isCurrent) setDiagnosticStatuses(result);
    });
    return () => {
      isCurrent = false;
    };
  }, [diagnosticRun]);

  const isCheckingDiagnostics =
    diagnosticStatuses.backend === 'checking' ||
    diagnosticStatuses.identityProvider === 'checking';
  const retryDiagnostics = () => {
    setDiagnosticStatuses(initialDiagnosticStatuses);
    setDiagnosticRun((run) => run + 1);
  };
  const getDiagnosticStatusLabel = (status: DiagnosticStatus) =>
    status === 'checking'
      ? t('status.connectionChecking')
      : status === 'connected'
        ? t('status.connectionConnected')
        : t('status.connectionUnavailable');

  return (
    <ThemeAwareScreen space="md">
      <HStack space="md" className="items-center">
        {picture ? (
          <Image
            accessibilityLabel={displayName ?? t('account.title')}
            contentFit="cover"
            source={picture}
            style={{ borderRadius: 28, height: 56, width: 56 }}
          />
        ) : (
          <AccountIcon color={accountIconColor} size={42} />
        )}
        <VStack space="xs" className="flex-1">
          <ThemeAwareHeading size="2xl">{t('account.title')}</ThemeAwareHeading>
          {displayName ? <ThemeAwareText>{displayName}</ThemeAwareText> : null}
        </VStack>
      </HStack>
      <ThemeAwareCardSurface
        backgroundImage={CARD_ARTWORK.relationships}
        borderRadius="$lg"
        p="$5"
      >
        {isAuthenticated ? (
          <VStack space="md">
            <HStack space="sm" className="items-center">
              <FontAwesome name="check-circle" color="#27AE60" size={20} />
              <VStack space="xs" className="flex-1">
                <ThemeAwareText fontWeight="$bold">
                  {t('account.signedInStatus')}
                </ThemeAwareText>
                <ThemeAwareText size="sm">
                  {t('account.signedInMessage')}
                </ThemeAwareText>
              </VStack>
            </HStack>
            <ThemeAwareButton disabled={isBusy} onPress={onPressLogout}>
              {t('actions.logout')}
            </ThemeAwareButton>
          </VStack>
        ) : (
          <VStack space="md">
            <VStack space="xs">
              <ThemeAwareText fontWeight="$bold">
                {t('account.signedOutStatus')}
              </ThemeAwareText>
              <ThemeAwareText size="sm">
                {t('account.signedOutMessage')}
              </ThemeAwareText>
            </VStack>
            <ThemeAwareButton
              disabled={!isReady || isBusy}
              onPress={onPressSignIn}
            >
              <ButtonText>{t('actions.signIn')}</ButtonText>
            </ThemeAwareButton>
          </VStack>
        )}
      </ThemeAwareCardSurface>
      <VStack space="md">
        <HStack space="sm" className="justify-between items-center">
          <ThemeAwareHeading size="lg">
            {t('account.diagnosticsTitle')}
          </ThemeAwareHeading>
          <ThemeAwareButton
            disabled={isCheckingDiagnostics}
            onPress={retryDiagnostics}
            variant="outline"
          >
            <VStack space="xs" className="items-center">
              {/* <FontAwesome name="refresh" color={accountIconColor} size={14} /> */}
              <ButtonText>{t('actions.checkConnections')}</ButtonText>
            </VStack>
          </ThemeAwareButton>
        </HStack>
        <ThemeAwareCardSurface
          backgroundImage={CARD_ARTWORK.planning}
          borderRadius="$lg"
          p="$5"
        >
          <VStack space="md">
            <DiagnosticRow
              label={t('account.backendService')}
              status={diagnosticStatuses.backend}
              statusLabel={getDiagnosticStatusLabel(diagnosticStatuses.backend)}
            />
            <DiagnosticRow
              label={t('account.identityProviderService')}
              status={diagnosticStatuses.identityProvider}
              statusLabel={getDiagnosticStatusLabel(
                diagnosticStatuses.identityProvider,
              )}
            />
          </VStack>
        </ThemeAwareCardSurface>
      </VStack>
      {isAuthenticated && user ? (
        <VStack space="md">
          <ThemeAwareHeading size="lg">
            {t('account.profileTitle')}
          </ThemeAwareHeading>
          <ThemeAwareCardSurface
            backgroundImage={CARD_ARTWORK.relationships}
            borderRadius="$lg"
            p="$5"
          >
            <VStack space="md">
              <DetailRow
                label={t('account.displayName')}
                value={displayName ?? t('account.unavailable')}
              />
              <DetailRow
                label={t('account.email')}
                value={email ?? t('account.unavailable')}
              />
              <DetailRow
                label={t('account.username')}
                value={username ?? t('account.unavailable')}
              />
              <DetailRow
                label={t('account.provider')}
                value={
                  accountProvider
                    ? t(accountProviderTranslationKeys[accountProvider])
                    : t('account.custom')
                }
              />
            </VStack>
          </ThemeAwareCardSurface>
        </VStack>
      ) : null}
      {isAuthenticated && user ? (
        <VStack space="md">
          <ThemeAwareHeading size="lg">
            {t('account.identityTitle')}
          </ThemeAwareHeading>
          <ThemeAwareCardSurface
            backgroundImage={CARD_ARTWORK.relationships}
            borderRadius="$lg"
            p="$5"
          >
            <VStack space="md">
              <DetailRow
                label={t('account.accountId')}
                value={subject ?? t('account.unavailable')}
              />
              <DetailRow
                label={t('account.issuer')}
                value={issuer ?? t('account.unavailable')}
              />
              <DetailRow
                label={t('account.audience')}
                value={audience ?? t('account.unavailable')}
              />
            </VStack>
          </ThemeAwareCardSurface>
        </VStack>
      ) : null}
      {!isReady && authState === 'idle' && !hasSetupError ? (
        <ThemeAwareText>{t('status.preparingAuthentication')}</ThemeAwareText>
      ) : null}
      {!isReady && hasSetupError ? (
        <VStack space="sm">
          <ThemeAwareText>
            {t('errors.authenticationSetupFailed')}
          </ThemeAwareText>
          <ThemeAwareButton
            disabled={isBusy}
            onPress={retryAuthenticationSetup}
          >
            <ButtonText>{t('home.retry')}</ButtonText>
          </ThemeAwareButton>
        </VStack>
      ) : null}
    </ThemeAwareScreen>
  );
}
