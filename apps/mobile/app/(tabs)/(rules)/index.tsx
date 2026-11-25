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

export default function RulesHomeScreen() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const { tileSet } = useTileSet();

  const actionCards = [
    {
      key: 'rules.viewAll',
      title: t('rules.viewAll'),
      description: t('rules.viewAllDescription'),
      route: AppRoutePaths.viewAllRules,
      backgroundImage: getHomeTileArtwork(tileSet, 'viewRules'),
    },
    {
      key: 'rules.create',
      title: t('rules.create'),
      description: t('rules.createDescription'),
      route: AppRoutePaths.createRule,
      backgroundImage: getHomeTileArtwork(tileSet, 'createRule'),
    },
  ].sort((left, right) =>
    left.title.localeCompare(right.title, locale, { sensitivity: 'base' }),
  );

  const screenOptions = {
    title: t('tabs.rules'),
    headerLeft: () => <MainTabNavigationMenu />,
  };

  return (
    <ThemeAwareScreen>
      <Stack.Screen options={screenOptions} />
      <VStack space="md">
        <VStack space="xs">
          <ThemeAwareHeading>{t('rules.overviewTitle')}</ThemeAwareHeading>
          <ThemeAwareText>{t('rules.overviewDescription')}</ThemeAwareText>
        </VStack>
        {actionCards.map((card) => (
          <ThemeAwareActionCard
            accessibilityLabel={card.title}
            backgroundImage={card.backgroundImage}
            key={card.key}
            onPress={() => {
              if (card.route === AppRoutePaths.createRule) {
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
