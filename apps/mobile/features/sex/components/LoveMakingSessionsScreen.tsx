import FontAwesome from '@expo/vector-icons/FontAwesome';
import type {
  RelationshipMember,
  RelationshipSummary,
  SexCoinSide,
  SexDailyStatus,
} from '@expo-50sdk-template/shared-types';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { TouchableOpacity } from 'react-native';

import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareCardSurface } from '@/components/ui/ThemeAwareCardSurface';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import { ThemeAwareSurface } from '@/components/ui/ThemeAwareSurface';
import {
  ThemeAwareHeading,
  ThemeAwareText,
} from '@/components/ui/ThemeAwareText';
import { ThemeAwareTimePicker } from '@/components/ui/ThemeAwareTimePicker';
import { ThemedModal } from '@/components/ui/ThemedModal';
import { HStack } from '@/components/ui/hstack';
import { useThemeAwareColors } from '@/components/ui/useThemeAwareColors';
import { VStack } from '@/components/ui/vstack';
import { CARD_ARTWORK } from '@/constants/cardArtwork';
import { AppRoutePaths } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import { useRelationshipsQuery } from '@/features/payment-requests/hooks/usePaymentRequests';
import { RelationshipMemberSelector } from '@/features/relationships/components/RelationshipMemberSelector';
import { getMemberDisplayName } from '@/features/relationships/utils';
import { SexCoinSimulation } from '@/features/sex/components/SexCoinSimulation';
import { SexEventCalendarModal } from '@/features/sex/components/SexEventCalendarModal';
import {
  useCreateSexEventMutation,
  useFlipSexCoinMutation,
  useResetTodaySexCoinFlipMutation,
  useSexDailyStatusQuery,
} from '@/features/sex/hooks/useSex';
import { selectedRelationshipIdSelector } from '@/state/slices/generalSlice';
import { useAppSelector } from '@/state/store';
import { getIsDevelopmentMode } from '@/utils/environment';
import { useI18n, type TranslationKey } from '@/utils/i18n';

function dateFromDay(day: string) {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date, 12);
}

function dayFromDate(date: Date) {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sameMemberSelection(first: string[], second: string[]) {
  return [...first].sort().join('\u0000') === [...second].sort().join('\u0000');
}

function getStatusMessage(
  status: SexDailyStatus,
  coinFlipMatchesMembers: boolean,
  t: (key: TranslationKey) => string,
) {
  if (status.lastSexEvent?.day === status.today) {
    return t('sex.alreadyRecordedToday');
  }
  if (!status.requiresCoinFlip) {
    return t('sex.noFlipRequired');
  }
  if (!status.coinFlip) {
    return t('sex.flipRequired');
  }
  if (!coinFlipMatchesMembers) {
    return t('sex.flipRecordedForDifferentMembers');
  }
  return status.canHaveSex ? t('sex.guessMatched') : t('sex.guessMissed');
}

function formatDay(day: string, locale: string) {
  return dateFromDay(day).toLocaleDateString(locale, { dateStyle: 'long' });
}

function getMemberNames(userIds: string[], members: RelationshipMember[]) {
  return userIds
    .map((userId) => getMemberDisplayName(userId, members))
    .join(', ');
}

function SexRelationshipPanel({
  relationship,
}: {
  relationship: RelationshipSummary;
}) {
  const { locale, t } = useI18n();
  const { getTextColor } = useThemeAwareColors();
  const isDevelopmentMode = getIsDevelopmentMode();
  const activeMemberUserIds = useMemo(
    () =>
      relationship.members
        .filter((member) => member.active)
        .map((member) => member.userId),
    [relationship.members],
  );
  const activeMemberSelectionKey = [...activeMemberUserIds]
    .sort()
    .join('\u0000');
  const [memberUserIds, setMemberUserIds] = useState(activeMemberUserIds);
  const [guess, setGuess] = useState<SexCoinSide>('heads');
  const [eventDay, setEventDay] = useState<string>();
  const [isCalendarModalVisible, setIsCalendarModalVisible] = useState(false);
  const [isCoinAnimating, setIsCoinAnimating] = useState(false);
  const animationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasEnoughMembers = memberUserIds.length >= 2;
  const statusQuery = useSexDailyStatusQuery(
    relationship.id,
    memberUserIds,
    hasEnoughMembers,
  );
  const status = statusQuery.data;
  const flipMutation = useFlipSexCoinMutation(relationship.id);
  const resetFlipMutation = useResetTodaySexCoinFlipMutation(relationship.id);
  const eventMutation = useCreateSexEventMutation(relationship.id);
  const coinFlipMatchesMembers = Boolean(
    status?.coinFlip &&
      sameMemberSelection(status.coinFlip.memberUserIds, memberUserIds),
  );

  useEffect(() => {
    setMemberUserIds(
      activeMemberSelectionKey ? activeMemberSelectionKey.split('\u0000') : [],
    );
  }, [activeMemberSelectionKey]);

  useEffect(() => {
    if (status?.coinFlip && coinFlipMatchesMembers) {
      setGuess(status.coinFlip.guess);
    }
  }, [coinFlipMatchesMembers, status?.coinFlip?.guess, status?.coinFlip?.id]);

  useEffect(
    () => () => {
      if (animationTimer.current !== null) {
        clearTimeout(animationTimer.current);
      }
    },
    [],
  );

  const selectedEventDay = eventDay ?? status?.today;
  const isEventDayToday = selectedEventDay === status?.today;
  const canCreateEvent =
    Boolean(status && selectedEventDay) &&
    hasEnoughMembers &&
    (!isEventDayToday || Boolean(status?.canHaveSex));

  function flipCoin() {
    if (
      !status?.requiresCoinFlip ||
      status.coinFlip ||
      !hasEnoughMembers ||
      isCoinAnimating
    ) {
      return;
    }

    const startedAt = Date.now();
    setIsCoinAnimating(true);
    flipMutation.mutate(
      { guess, memberUserIds },
      {
        onSettled: () => {
          const animationDelay = Math.max(0, 900 - (Date.now() - startedAt));
          if (animationTimer.current !== null) {
            clearTimeout(animationTimer.current);
          }
          animationTimer.current = setTimeout(() => {
            setIsCoinAnimating(false);
            animationTimer.current = null;
          }, animationDelay);
        },
      },
    );
  }

  function createEvent() {
    if (!canCreateEvent || !selectedEventDay) return;
    eventMutation.mutate({ day: selectedEventDay, memberUserIds });
  }

  const outcomeLabel =
    status?.coinFlip?.outcome === 'heads'
      ? t('sex.heads')
      : status?.coinFlip
        ? t('sex.tails')
        : null;

  return (
    <VStack space="md">
      {activeMemberUserIds.length < 2 ? (
        <ThemeAwareText color="$error600">
          {t('sex.notEnoughActiveMembers')}
        </ThemeAwareText>
      ) : null}
      <RelationshipMemberSelector
        hint={t('sex.memberSelectionHint')}
        label={t('sex.memberSelection')}
        members={relationship.members}
        onChange={setMemberUserIds}
        selectedUserIds={memberUserIds}
      />
      {hasEnoughMembers ? null : (
        <ThemeAwareText color="$error600">
          {t('sex.needAtLeastTwoMembers')}
        </ThemeAwareText>
      )}

      <ThemeAwareCardSurface
        backgroundImage={CARD_ARTWORK.relationships}
        borderRadius="$sm"
        p="$4"
      >
        <VStack space="md">
          <ThemeAwareHeading>{t('sex.dailyFlipTitle')}</ThemeAwareHeading>
          <SexCoinSimulation
            accessibilityLabel={t('sex.coinSimulation')}
            isFlipping={isCoinAnimating || flipMutation.isPending}
            outcome={status?.coinFlip?.outcome ?? null}
          />
          <ThemeAwareText className="text-center text-xs">
            {t('sex.coinImageCredit')}
          </ThemeAwareText>
          {isCoinAnimating || flipMutation.isPending ? (
            <ThemeAwareText>{t('sex.flipping')}</ThemeAwareText>
          ) : null}
          {status?.coinFlip ? (
            <>
              <HStack space="sm">
                <ThemeAwareSurface
                  borderRadius="$sm"
                  className="flex-1"
                  darkBackground="$backgroundDark800"
                  lightBackground="$coolGray100"
                  p="$3"
                >
                  <VStack space="xs">
                    <ThemeAwareText
                      fontSize={12}
                      fontWeight="$semibold"
                      letterSpacing={0.5}
                      textAlign="center"
                      textTransform="uppercase"
                    >
                      {t('sex.guessResult')}
                    </ThemeAwareText>
                    <ThemeAwareText
                      fontSize={24}
                      fontWeight="$bold"
                      textAlign="center"
                    >
                      {status.coinFlip.guess === 'heads'
                        ? t('sex.heads')
                        : t('sex.tails')}
                    </ThemeAwareText>
                  </VStack>
                </ThemeAwareSurface>
                <ThemeAwareSurface
                  borderRadius="$sm"
                  className="flex-1"
                  darkBackground="$backgroundDark800"
                  lightBackground="$coolGray100"
                  p="$3"
                >
                  <VStack space="xs">
                    <ThemeAwareText
                      fontSize={12}
                      fontWeight="$semibold"
                      letterSpacing={0.5}
                      textAlign="center"
                      textTransform="uppercase"
                    >
                      {t('sex.coinResult')}
                    </ThemeAwareText>
                    <ThemeAwareText
                      color={
                        status.coinFlip.guess === status.coinFlip.outcome
                          ? '$success600'
                          : '$error600'
                      }
                      fontSize={24}
                      fontWeight="$bold"
                      textAlign="center"
                    >
                      {outcomeLabel}
                    </ThemeAwareText>
                  </VStack>
                </ThemeAwareSurface>
              </HStack>
              <ThemeAwareText>
                {`${t('sex.flipRecorded')} ${t('sex.memberSelection')}: ${getMemberNames(status.coinFlip.memberUserIds, relationship.members)}`}
              </ThemeAwareText>
            </>
          ) : null}
          {isDevelopmentMode && status?.coinFlip ? (
            <>
              <ThemeAwareButton
                action="negative"
                isDisabled={
                  resetFlipMutation.isPending || statusQuery.isLoading
                }
                onPress={() => resetFlipMutation.mutate()}
              >
                {t('sex.resetDailyFlip')}
              </ThemeAwareButton>
              {resetFlipMutation.error ? (
                <ThemeAwareText color="$error600">
                  {t('sex.actionError')}
                </ThemeAwareText>
              ) : null}
            </>
          ) : null}
          {statusQuery.isLoading ? (
            <ThemeAwareText>{t('common.loading')}</ThemeAwareText>
          ) : null}
          {statusQuery.error ? (
            <ThemeAwareText color="$error600">
              {t('sex.loadError')}
            </ThemeAwareText>
          ) : null}
          {status ? (
            <ThemeAwareText fontWeight="$semibold">
              {getStatusMessage(status, coinFlipMatchesMembers, t)}
            </ThemeAwareText>
          ) : null}
          {status?.requiresCoinFlip && !status.coinFlip ? (
            <VStack space="sm">
              <ThemeAwareText>{t('sex.guessPrompt')}</ThemeAwareText>
              <HStack space="sm">
                <ThemeAwareButton
                  accessibilityRole="radio"
                  accessibilityState={{ checked: guess === 'heads' }}
                  action={guess === 'heads' ? 'primary' : 'secondary'}
                  className="flex-1"
                  isDisabled={flipMutation.isPending || isCoinAnimating}
                  onPress={() => setGuess('heads')}
                >
                  {t('sex.heads')}
                </ThemeAwareButton>
                <ThemeAwareButton
                  accessibilityRole="radio"
                  accessibilityState={{ checked: guess === 'tails' }}
                  action={guess === 'tails' ? 'primary' : 'secondary'}
                  className="flex-1"
                  isDisabled={flipMutation.isPending || isCoinAnimating}
                  onPress={() => setGuess('tails')}
                >
                  {t('sex.tails')}
                </ThemeAwareButton>
              </HStack>
              <ThemeAwareButton
                isDisabled={
                  flipMutation.isPending ||
                  isCoinAnimating ||
                  !hasEnoughMembers ||
                  statusQuery.isLoading
                }
                onPress={flipCoin}
              >
                {t('sex.flipButton')}
              </ThemeAwareButton>
            </VStack>
          ) : null}
          {flipMutation.error ? (
            <ThemeAwareText color="$error600">
              {t('sex.actionError')}
            </ThemeAwareText>
          ) : null}
        </VStack>
      </ThemeAwareCardSurface>

      <ThemeAwareCardSurface
        backgroundImage={CARD_ARTWORK.relationships}
        borderRadius="$sm"
        p="$4"
      >
        <VStack space="sm">
          <HStack className="items-center justify-between">
            <ThemeAwareHeading className="flex-1">
              {t('sex.lastRecordedEncounter')}
            </ThemeAwareHeading>
            <TouchableOpacity
              accessibilityLabel={t('sex.showSessionCalendar')}
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => setIsCalendarModalVisible(true)}
              style={{ paddingHorizontal: 8, paddingVertical: 8 }}
            >
              <FontAwesome
                color={getTextColor(true)}
                name="question-circle"
                size={20}
              />
            </TouchableOpacity>
          </HStack>
          {status?.lastSexEvent ? (
            <>
              <ThemeAwareText>
                {formatDay(status.lastSexEvent.day, locale)}
              </ThemeAwareText>
              <ThemeAwareText>
                {`${t('sex.lastRecordedMembers')}: ${getMemberNames(status.lastSexEvent.memberUserIds, relationship.members)}`}
              </ThemeAwareText>
            </>
          ) : status ? (
            <ThemeAwareText>{t('sex.noLastSexRecorded')}</ThemeAwareText>
          ) : null}
        </VStack>
      </ThemeAwareCardSurface>

      <ThemeAwareCardSurface
        backgroundImage={CARD_ARTWORK.relationships}
        borderRadius="$sm"
        p="$4"
      >
        <VStack space="md">
          <ThemeAwareHeading>{t('sex.createEventTitle')}</ThemeAwareHeading>
          <ThemeAwareText>{t('sex.createEventDescription')}</ThemeAwareText>
          <ThemeAwareText fontWeight="$semibold">{t('sex.day')}</ThemeAwareText>
          <ThemeAwareTimePicker
            accessibilityLabel={t('sex.day')}
            formatDate={(date, currentLocale) =>
              date.toLocaleDateString(currentLocale)
            }
            maximumDate={status ? dateFromDay(status.today) : new Date()}
            mode="date"
            onChange={(_event, date) => {
              if (date) setEventDay(dayFromDate(date));
            }}
            value={selectedEventDay ? dateFromDay(selectedEventDay) : undefined}
          />
          <ThemeAwareButton
            isDisabled={
              !canCreateEvent ||
              eventMutation.isPending ||
              statusQuery.isLoading
            }
            onPress={createEvent}
          >
            {t('sex.createEvent')}
          </ThemeAwareButton>
          {eventMutation.isSuccess ? (
            <ThemeAwareText>{t('sex.eventCreated')}</ThemeAwareText>
          ) : null}
          {eventMutation.error ? (
            <ThemeAwareText color="$error600">
              {t('sex.actionError')}
            </ThemeAwareText>
          ) : null}
        </VStack>
      </ThemeAwareCardSurface>
      <SexEventCalendarModal
        isVisible={isCalendarModalVisible}
        onClose={() => setIsCalendarModalVisible(false)}
        relationship={relationship}
      />
    </VStack>
  );
}

export function LoveMakingSessionsScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { textColor } = useThemeAwareColors();
  const { isAuthenticated, user } = useOAuth2Auth();
  const relationshipsQuery = useRelationshipsQuery(Boolean(user?.subject));
  const relationships = relationshipsQuery.data ?? [];
  const [isRulesModalVisible, setIsRulesModalVisible] = useState(false);
  const selectedRelationshipId = useAppSelector(selectedRelationshipIdSelector);
  const relationship = relationships.find(
    (candidate) => candidate.id === selectedRelationshipId,
  );

  return (
    <ThemeAwareScreen>
      <Stack.Screen
        options={{
          title: t('sex.sessionsTitle'),
          headerRight: () => (
            <TouchableOpacity
              accessibilityLabel={t('sex.showHowItWorks')}
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => setIsRulesModalVisible(true)}
              style={{ paddingHorizontal: 12, paddingVertical: 8 }}
            >
              <FontAwesome color={textColor} name="question-circle" size={20} />
            </TouchableOpacity>
          ),
        }}
      />
      <VStack space="md">
        <VStack space="xs">
          <ThemeAwareHeading>{t('sex.sessionsTitle')}</ThemeAwareHeading>
          <ThemeAwareText>{t('sex.sessionsDescription')}</ThemeAwareText>
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
          <SexRelationshipPanel
            key={relationship.id}
            relationship={relationship}
          />
        ) : (
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
      <ThemedModal
        confirmButton={{
          action: 'secondary',
          onPress: () => setIsRulesModalVisible(false),
          text: t('sex.closeRules'),
        }}
        isVisible={isRulesModalVisible}
        onClose={() => setIsRulesModalVisible(false)}
        title={t('sex.rulesTitle')}
      >
        <ThemeAwareText>{t('sex.rulesDescription')}</ThemeAwareText>
      </ThemedModal>
    </ThemeAwareScreen>
  );
}
