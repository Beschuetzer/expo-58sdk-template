import { Stack, useRouter } from 'expo-router';
import { useDeferredValue, useState } from 'react';

import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareCardSurface } from '@/components/ui/ThemeAwareCardSurface';
import { ThemeAwareHeading } from '@/components/ui/ThemeAwareHeading';
import { ThemeAwareInput } from '@/components/ui/ThemeAwareInput';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import { ThemeAwareSurface } from '@/components/ui/ThemeAwareSurface';
import { ThemeAwareText } from '@/components/ui/ThemeAwareText';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { CARD_ARTWORK } from '@/constants/cardArtwork';
import { AppRoutePaths } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import { getDisplayNameFromClaims } from '@/features/auth/client';
import {
  useRelationshipSearchQuery,
  useRequestToJoinRelationshipMutation,
} from '@/features/payment-requests/hooks/usePaymentRequests';
import { useI18n } from '@/utils/i18n';

export default function SearchRelationshipsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { isAuthenticated, user } = useOAuth2Auth();
  const [searchText, setSearchText] = useState('');
  const deferredSearchText = useDeferredValue(searchText);
  const searchQuery = useRelationshipSearchQuery(
    deferredSearchText,
    isAuthenticated,
  );
  const requestMutation = useRequestToJoinRelationshipMutation();
  const displayName = user ? getDisplayNameFromClaims(user.claims) : undefined;
  const results = searchQuery.data ?? [];

  if (!isAuthenticated) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={{ title: t('home.findRelationship') }} />
        <VStack space="md" className="p-4">
          <ThemeAwareText>{t('home.signIn')}</ThemeAwareText>
          <ThemeAwareButton
            onPress={() => router.navigate(AppRoutePaths.account)}
          >
            {t('home.signIn')}
          </ThemeAwareButton>
        </VStack>
      </ThemeAwareScreen>
    );
  }

  return (
    <ThemeAwareScreen>
      <Stack.Screen options={{ title: t('home.findRelationship') }} />
      <VStack space="lg" className="p-4">
        <VStack space="xs">
          <ThemeAwareHeading size="2xl">
            {t('home.searchRelationshipsTitle')}
          </ThemeAwareHeading>
          <ThemeAwareText>
            {t('home.searchRelationshipsDescription')}
          </ThemeAwareText>
        </VStack>

        <ThemeAwareInput
          value={searchText}
          onChangeText={setSearchText}
          inputFieldProps={{
            autoCapitalize: 'none',
            autoCorrect: false,
            placeholder: t('home.searchRelationshipsPlaceholder'),
            returnKeyType: 'search',
          }}
        />

        {deferredSearchText.trim().length < 2 ? (
          <ThemeAwareText color="$textLight500">
            {t('home.searchRelationshipsMinimum')}
          </ThemeAwareText>
        ) : searchQuery.isLoading ? (
          <ThemeAwareText>{t('common.loading')}</ThemeAwareText>
        ) : searchQuery.isError ? (
          <ThemeAwareText>{t('home.searchRelationshipsError')}</ThemeAwareText>
        ) : results.length === 0 ? (
          <ThemeAwareText>{t('home.searchRelationshipsEmpty')}</ThemeAwareText>
        ) : (
          <VStack space="sm">
            {results.map((result) => (
              <ThemeAwareCardSurface
                backgroundImage={CARD_ARTWORK.relationships}
                key={result.id}
                borderRadius="$lg"
                p="$4"
                shadowColor="$backgroundDark950"
                shadowOffset={{ width: 0, height: 2 }}
                shadowOpacity={0.08}
                shadowRadius={6}
                elevation={2}
              >
                <VStack space="md">
                  <VStack space="sm">
                    <ThemeAwareText size="lg" fontWeight="$bold">
                      {result.name}
                    </ThemeAwareText>
                    <ThemeAwareSurface
                      lightBackground="$coolGray100"
                      darkBackground="$backgroundDark800"
                      borderRadius="$md"
                      alignSelf="flex-start"
                      px="$2"
                      py="$1"
                    >
                      <ThemeAwareText
                        size="xs"
                        color="$textLight500"
                        fontWeight="$semibold"
                      >
                        {t('home.relationshipShareCode')}: {result.shareCode}
                      </ThemeAwareText>
                    </ThemeAwareSurface>
                    <ThemeAwareText
                      size="sm"
                      color="$textLight500"
                      numberOfLines={1}
                    >
                      {t('home.owner')}:{' '}
                      {result.owner?.displayName?.trim() ||
                        result.owner?.userId ||
                        t('home.unknownOwner')}
                    </ThemeAwareText>
                  </VStack>

                  <HStack space="md" className="items-center justify-between">
                    <ThemeAwareText size="sm" color="$textLight500">
                      {result.memberCount} {t('home.relationshipMemberCount')}
                    </ThemeAwareText>
                    {result.membershipStatus === 'available' ? (
                      <ThemeAwareButton
                        disabled={requestMutation.isPending}
                        onPress={() =>
                          requestMutation.mutate({
                            relationshipId: result.id,
                            displayName,
                          })
                        }
                        size="sm"
                        width="auto"
                        alignSelf="flex-start"
                        flexGrow={0}
                        flexShrink={0}
                        px="$4"
                      >
                        {t('home.requestToJoin')}
                      </ThemeAwareButton>
                    ) : (
                      <ThemeAwareSurface
                        lightBackground="$coolGray100"
                        darkBackground="$backgroundDark800"
                        borderRadius="$full"
                        px="$3"
                        py="$1"
                      >
                        <ThemeAwareText
                          color={
                            result.membershipStatus === 'pending'
                              ? '$primary500'
                              : '$textLight500'
                          }
                          fontWeight="$semibold"
                          size="sm"
                        >
                          {result.membershipStatus === 'pending'
                            ? requestMutation.isPending &&
                              requestMutation.variables?.relationshipId ===
                                result.id
                              ? t('home.requestSending')
                              : t('home.requestPending')
                            : t('home.alreadyMember')}
                        </ThemeAwareText>
                      </ThemeAwareSurface>
                    )}
                  </HStack>
                </VStack>
              </ThemeAwareCardSurface>
            ))}
          </VStack>
        )}
        {requestMutation.isError ? (
          <ThemeAwareText>{requestMutation.error.message}</ThemeAwareText>
        ) : null}
        {requestMutation.isSuccess ? (
          <ThemeAwareText>{t('home.requestPending')}</ThemeAwareText>
        ) : null}
      </VStack>
    </ThemeAwareScreen>
  );
}
