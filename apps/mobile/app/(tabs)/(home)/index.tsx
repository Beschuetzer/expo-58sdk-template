import { Stack, useRouter } from 'expo-router';

import { HomeScreenList } from '@/components/ui/HomeScreenList';
import type { HomeScreenListItem } from '@/components/ui/HomeScreenList';
import { MainTabNavigationMenu } from '@/components/ui/MainTabNavigationMenu';
import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareCardSurface } from '@/components/ui/ThemeAwareCardSurface';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import {
  ThemeAwareHeading,
  ThemeAwareText,
} from '@/components/ui/ThemeAwareText';
import { VStack } from '@/components/ui/vstack';
import { CARD_ARTWORK } from '@/constants/cardArtwork';
import { getHomeTileArtwork } from '@/constants/homeTileArtwork';
import { AppRoutePaths } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import { getDisplayNameFromClaims } from '@/features/auth/client';
import { useRelationshipsQuery } from '@/features/payment-requests/hooks/usePaymentRequests';
import { CreateRelationshipCard } from '@/features/relationships/components/CreateRelationshipCard';
import { SelectedRelationshipNotice } from '@/features/relationships/components/SelectedRelationshipNotice';
import {
  selectedRelationshipIdSelector,
  setSelectedRelationshipId,
} from '@/state/slices/generalSlice';
import { useAppDispatch, useAppSelector } from '@/state/store';
import { useI18n } from '@/utils/i18n';
import { useTileSet } from '@/utils/tileSet';

const ADD_RELATIONSHIP_OPTION_VALUE = '__add_relationship__';

export default function HomeScreen() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const { tileSet } = useTileSet();
  const { isAuthenticated, user } = useOAuth2Auth();
  const displayName = user ? getDisplayNameFromClaims(user.claims) : undefined;
  const dispatch = useAppDispatch();
  const relationshipsQuery = useRelationshipsQuery(isAuthenticated);
  const relationships = [...(relationshipsQuery.data ?? [])].sort(
    (left, right) =>
      left.name.localeCompare(right.name, locale, { sensitivity: 'base' }),
  );
  const selectedRelationshipId = useAppSelector(selectedRelationshipIdSelector);
  const activeRelationship = isAuthenticated
    ? relationships.find(
        (relationship) => relationship.id === selectedRelationshipId,
      )
    : undefined;
  const relationshipOptions = [
    {
      label: t('home.addRelationship'),
      value: ADD_RELATIONSHIP_OPTION_VALUE,
    },
    ...relationships.map((relationship) => ({
      label: relationship.name,
      value: relationship.id,
    })),
  ];
  const relationshipDropdown = isAuthenticated
    ? {
        onValueChange: (value: string) => {
          if (value === ADD_RELATIONSHIP_OPTION_VALUE) {
            router.push(AppRoutePaths.createRelationship);
            return;
          }
          dispatch(setSelectedRelationshipId(value));
        },
        options: relationshipOptions,
        placeholder: t('home.selectActiveRelationship'),
        selectedValue: activeRelationship?.id ?? '',
      }
    : undefined;
  const homePageSections: {
    id: string;
    items: HomeScreenListItem[];
    title: string;
  }[] = [
    {
      id: 'decision-items',
      title: t('home.awaitingDecision'),
      items: [
        {
          id: 'awaiting-decision',
          props: {
            accessibilityHint: t('home.awaitingDecisionHint'),
            backgroundImage: getHomeTileArtwork(tileSet, 'awaitingDecision'),
            description: t('home.awaitingDecisionDescription'),
            icon: 'bell',
            isUrgent: true,
            onPress: () => router.navigate(AppRoutePaths.awaitingDecision),
            title: t('home.awaitingDecision'),
          },
        },
      ],
    },
    {
      id: 'relationships',
      title: t('home.relationshipsTitle'),
      items: [
        {
          id: 'find-relationship',
          props: {
            accessibilityHint: t('home.findRelationshipHint'),
            backgroundImage: getHomeTileArtwork(tileSet, 'findRelationship'),
            description: t('home.searchRelationshipsDescription'),
            icon: 'search',
            onPress: () => router.navigate(AppRoutePaths.searchRelationships),
            title: t('home.findRelationship'),
          },
        },
        {
          id: 'create-relationship',
          props: {
            accessibilityHint: t('home.createRelationshipHint'),
            backgroundImage: getHomeTileArtwork(tileSet, 'createRelationship'),
            description: t('home.createRelationshipDescription'),
            icon: 'plus',
            onPress: () => router.push(AppRoutePaths.createRelationship),
            title: t('paymentRequests.createRelationship'),
          },
        },
      ],
    },
    {
      id: 'tasks',
      title: t('time.tasks'),
      items: [
        {
          id: 'incomplete-tasks',
          props: {
            backgroundImage: getHomeTileArtwork(tileSet, 'incompleteTasks'),
            description: t('time.viewAllTasksDescription'),
            icon: 'check-square',
            onPress: () =>
              router.navigate(AppRoutePaths.viewAllIncompleteTasks),
            title: t('time.viewAllTasks'),
          },
        },
        {
          id: 'completed-tasks',
          props: {
            backgroundImage: getHomeTileArtwork(tileSet, 'completedTasks'),
            description: t('time.viewCompletedTasksDescription'),
            icon: 'check',
            onPress: () => router.navigate(AppRoutePaths.viewAllCompletedTasks),
            title: t('time.viewCompletedTasks'),
          },
        },
        {
          id: 'create-task',
          props: {
            backgroundImage: getHomeTileArtwork(tileSet, 'createTask'),
            description: t('time.createTaskDescription'),
            icon: 'plus',
            onPress: () => router.push(AppRoutePaths.createTask),
            title: t('time.createTask'),
          },
        },
      ],
    },
    {
      id: 'requests',
      title: t('paymentRequests.requests'),
      items: [
        {
          id: 'view-requests',
          props: {
            backgroundImage: getHomeTileArtwork(tileSet, 'viewRequests'),
            description: t('paymentRequests.viewAllRequestsDescription'),
            icon: 'list',
            onPress: () => router.navigate(AppRoutePaths.viewAllRequests),
            title: t('paymentRequests.viewAllRequests'),
          },
        },
        {
          id: 'create-request',
          props: {
            backgroundImage: getHomeTileArtwork(tileSet, 'createRequest'),
            description: t('paymentRequests.createRequestDescription'),
            icon: 'plus',
            onPress: () => router.push(AppRoutePaths.createRequest),
            title: t('paymentRequests.createRequest'),
          },
        },
      ],
    },
    {
      id: 'charges',
      title: t('jointAccountCharges.title'),
      items: [
        {
          id: 'view-joint-account-charges',
          props: {
            backgroundImage: getHomeTileArtwork(
              tileSet,
              'viewJointAccountCharges',
            ),
            description: t('jointAccountCharges.viewAllDescription'),
            icon: 'credit-card',
            onPress: () =>
              router.navigate(AppRoutePaths.viewJointAccountCharges),
            title: t('jointAccountCharges.viewAll'),
          },
        },
        {
          id: 'create-joint-account-charge',
          props: {
            backgroundImage: getHomeTileArtwork(
              tileSet,
              'createJointAccountCharge',
            ),
            description: t('jointAccountCharges.createDescription'),
            icon: 'plus',
            onPress: () => router.push(AppRoutePaths.createJointAccountCharge),
            title: t('jointAccountCharges.create'),
          },
        },
      ],
    },
    {
      id: 'budgets',
      title: t('budgets.title'),
      items: [
        {
          id: 'view-budgets',
          props: {
            backgroundImage: getHomeTileArtwork(tileSet, 'viewBudgets'),
            description: t('budgets.viewAllDescription'),
            icon: 'pie-chart',
            onPress: () => router.navigate(AppRoutePaths.budgets),
            title: t('budgets.viewAll'),
          },
        },
        {
          id: 'create-budget',
          props: {
            backgroundImage: getHomeTileArtwork(tileSet, 'createBudget'),
            description: t('budgets.createDescription'),
            icon: 'plus',
            onPress: () => router.push(AppRoutePaths.createBudget),
            title: t('budgets.create'),
          },
        },
      ],
    },
    {
      id: 'me-time',
      title: t('time.meTime'),
      items: [
        {
          id: 'view-me-time',
          props: {
            backgroundImage: getHomeTileArtwork(tileSet, 'viewMeTime'),
            description: t('time.viewAllMeTimeDescription'),
            icon: 'clock-o',
            onPress: () => router.navigate(AppRoutePaths.viewAllMeTime),
            title: t('time.viewAllMeTime'),
          },
        },
        {
          id: 'create-me-time',
          props: {
            backgroundImage: getHomeTileArtwork(tileSet, 'createMeTime'),
            description: t('time.createMeTimeDescription'),
            icon: 'plus',
            onPress: () => router.push(AppRoutePaths.createMeTime),
            title: t('time.createMeTime'),
          },
        },
      ],
    },
    {
      id: 'love',
      title: t('tabs.sex'),
      items: [
        {
          id: 'love-making-sessions',
          props: {
            backgroundImage: getHomeTileArtwork(tileSet, 'loveMakingSessions'),
            description: t('sex.sessionsDescription'),
            icon: 'heart',
            onPress: () => router.navigate(AppRoutePaths.loveMakingSessions),
            title: t('sex.sessionsTitle'),
          },
        },
        {
          id: 'date-nights',
          props: {
            backgroundImage: getHomeTileArtwork(tileSet, 'dateNights'),
            description: t('dateNight.screenDescription'),
            icon: 'calendar',
            onPress: () => router.navigate(AppRoutePaths.dateNights),
            title: t('dateNight.title'),
          },
        },
      ],
    },
    {
      id: 'rules',
      title: t('rules.title'),
      items: [
        {
          id: 'view-rules',
          props: {
            backgroundImage: getHomeTileArtwork(tileSet, 'viewRules'),
            description: t('rules.viewAllDescription'),
            icon: 'book',
            onPress: () => router.navigate(AppRoutePaths.viewAllRules),
            title: t('rules.viewAll'),
          },
        },
        {
          id: 'create-rule',
          props: {
            backgroundImage: getHomeTileArtwork(tileSet, 'createRule'),
            description: t('rules.createDescription'),
            icon: 'plus',
            onPress: () => router.push(AppRoutePaths.createRule),
            title: t('rules.create'),
          },
        },
      ],
    },
  ];

  const screenContent = (
    <>
      <Stack.Screen options={{ headerLeft: () => <MainTabNavigationMenu /> }} />
      <VStack space="lg">
        <SelectedRelationshipNotice
          dropdown={relationshipDropdown}
          heading={t('home.activeRelationshipHeader')}
        />
        {isAuthenticated ? (
          <VStack space="xl">
            {homePageSections.map((section) => (
              <HomeScreenList
                items={section.items}
                key={section.id}
                title={section.title}
              />
            ))}
          </VStack>
        ) : null}

        {!isAuthenticated ? (
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
        ) : relationshipsQuery.isLoading ? (
          <ThemeAwareText>{t('common.loading')}</ThemeAwareText>
        ) : relationshipsQuery.isError ? (
          <ThemeAwareCardSurface
            backgroundImage={CARD_ARTWORK.relationships}
            borderRadius="$lg"
            p="$5"
          >
            <VStack space="md">
              <ThemeAwareText>{t('home.spaceLoadFailed')}</ThemeAwareText>
              <ThemeAwareText>
                {relationshipsQuery.error instanceof Error
                  ? relationshipsQuery.error.message
                  : t('errors.backendRequestFailed')}
              </ThemeAwareText>
              <ThemeAwareButton
                onPress={() => relationshipsQuery.refetch()}
                variant="outline"
              >
                {t('home.retry')}
              </ThemeAwareButton>
            </VStack>
          </ThemeAwareCardSurface>
        ) : relationships.length === 0 ? (
          <CreateRelationshipCard
            displayName={displayName}
            submitLabel={t('home.createSpace')}
            title={t('home.createSpaceTitle')}
          />
        ) : null}
      </VStack>
    </>
  );

  return <ThemeAwareScreen>{screenContent}</ThemeAwareScreen>;
}
