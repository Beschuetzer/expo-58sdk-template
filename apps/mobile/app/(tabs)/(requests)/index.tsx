import { Stack, useRouter } from 'expo-router';

import { MainTabNavigationMenu } from '@/components/ui/MainTabNavigationMenu';
import { ThemeAwareActionCard } from '@/components/ui/ThemeAwareActionCard';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import {
  ThemeAwareHeading,
  ThemeAwareText,
} from '@/components/ui/ThemeAwareText';
import { VStack } from '@/components/ui/vstack';
import { getHomeTileArtwork } from '@/constants/homeTileArtwork';
import { AppRoutePaths } from '@/constants/navigation';
import { useI18n } from '@/utils/i18n';
import { useTileSet } from '@/utils/tileSet';

export default function MoneyHomeScreen() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const { tileSet } = useTileSet();

  const actionCards = [
    {
      key: 'budgets.create',
      title: t('budgets.create'),
      description: t('budgets.createDescription'),
      route: AppRoutePaths.createBudget,
      backgroundImage: getHomeTileArtwork(tileSet, 'createBudget'),
    },
    {
      key: 'budgets.viewAll',
      title: t('budgets.viewAll'),
      description: t('budgets.viewAllDescription'),
      route: AppRoutePaths.budgets,
      backgroundImage: getHomeTileArtwork(tileSet, 'viewBudgets'),
    },
    {
      key: 'paymentRequests.viewAllRequests',
      title: t('paymentRequests.viewAllRequests'),
      description: t('paymentRequests.viewAllRequestsDescription'),
      route: AppRoutePaths.viewAllRequests,
      backgroundImage: getHomeTileArtwork(tileSet, 'viewRequests'),
    },
    {
      key: 'paymentRequests.createRequest',
      title: t('paymentRequests.createRequest'),
      description: t('paymentRequests.createRequestDescription'),
      route: AppRoutePaths.createRequest,
      backgroundImage: getHomeTileArtwork(tileSet, 'createRequest'),
    },
    {
      key: 'paymentRequests.awaitingDecision',
      title: t('paymentRequests.awaitingDecision'),
      description: t('paymentRequests.awaitingDecisionDescription'),
      route: AppRoutePaths.awaitingDecision,
      backgroundImage: getHomeTileArtwork(tileSet, 'awaitingDecision'),
    },
    {
      key: 'jointAccountCharges.viewAll',
      title: t('jointAccountCharges.viewAll'),
      description: t('jointAccountCharges.viewAllDescription'),
      route: AppRoutePaths.viewJointAccountCharges,
      backgroundImage: getHomeTileArtwork(tileSet, 'viewJointAccountCharges'),
    },
    {
      key: 'jointAccountCharges.create',
      title: t('jointAccountCharges.create'),
      description: t('jointAccountCharges.createDescription'),
      route: AppRoutePaths.createJointAccountCharge,
      backgroundImage: getHomeTileArtwork(tileSet, 'createJointAccountCharge'),
    },
  ].sort((left, right) =>
    left.title.localeCompare(right.title, locale, { sensitivity: 'base' }),
  );

  const screenOptions = {
    title: t('tabs.money'),
    headerLeft: () => <MainTabNavigationMenu />,
  };

  return (
    <ThemeAwareScreen>
      <Stack.Screen options={screenOptions} />
      <VStack space="md">
        <VStack space="xs">
          <ThemeAwareHeading>
            {t('paymentRequests.moneyOverviewTitle')}
          </ThemeAwareHeading>
          <ThemeAwareText>
            {t('paymentRequests.moneyOverviewDescription')}
          </ThemeAwareText>
        </VStack>
        {actionCards.map((card) => (
          <ThemeAwareActionCard
            accessibilityLabel={card.title}
            backgroundImage={card.backgroundImage}
            key={card.key}
            onPress={() => {
              if (
                card.route === AppRoutePaths.createBudget ||
                card.route === AppRoutePaths.createJointAccountCharge ||
                card.route === AppRoutePaths.createRequest
              ) {
                router.push(card.route);
                return;
              }
              router.navigate(card.route);
            }}
          >
            <VStack space="xs">
              <ThemeAwareText fontWeight="$semibold">
                {card.title}
              </ThemeAwareText>
              <ThemeAwareText>{card.description}</ThemeAwareText>
            </VStack>
          </ThemeAwareActionCard>
        ))}
      </VStack>
    </ThemeAwareScreen>
  );
}
