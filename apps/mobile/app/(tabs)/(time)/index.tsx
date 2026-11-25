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

export default function TimeHomeScreen() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const { tileSet } = useTileSet();

  const actionCards = [
    {
      key: 'time.viewAllMeTime',
      title: t('time.viewAllMeTime'),
      description: t('time.viewAllMeTimeDescription'),
      route: AppRoutePaths.viewAllMeTime,
      backgroundImage: getHomeTileArtwork(tileSet, 'viewMeTime'),
    },
    {
      key: 'time.createMeTime',
      title: t('time.createMeTime'),
      description: t('time.createMeTimeDescription'),
      route: AppRoutePaths.createMeTime,
      backgroundImage: getHomeTileArtwork(tileSet, 'createMeTime'),
    },
    {
      key: 'time.viewAllTasks',
      title: t('time.viewAllTasks'),
      description: t('time.viewAllTasksDescription'),
      route: AppRoutePaths.viewAllIncompleteTasks,
      backgroundImage: getHomeTileArtwork(tileSet, 'incompleteTasks'),
    },
    {
      key: 'time.viewCompletedTasks',
      title: t('time.viewCompletedTasks'),
      description: t('time.viewCompletedTasksDescription'),
      route: AppRoutePaths.viewAllCompletedTasks,
      backgroundImage: getHomeTileArtwork(tileSet, 'completedTasks'),
    },
    {
      key: 'time.createTask',
      title: t('time.createTask'),
      description: t('time.createTaskDescription'),
      route: AppRoutePaths.createTask,
      backgroundImage: getHomeTileArtwork(tileSet, 'createTask'),
    },
  ].sort((left, right) =>
    left.title.localeCompare(right.title, locale, { sensitivity: 'base' }),
  );

  return (
    <ThemeAwareScreen>
      <Stack.Screen
        options={{
          title: t('tabs.time'),
          headerLeft: () => <MainTabNavigationMenu />,
        }}
      />
      <VStack space="md">
        <VStack space="xs">
          <ThemeAwareHeading>{t('time.overviewTitle')}</ThemeAwareHeading>
          <ThemeAwareText>{t('time.overviewDescription')}</ThemeAwareText>
        </VStack>
        {actionCards.map((card) => (
          <ThemeAwareActionCard
            accessibilityLabel={card.title}
            backgroundImage={card.backgroundImage}
            key={card.key}
            onPress={() => {
              if (
                card.route === AppRoutePaths.createMeTime ||
                card.route === AppRoutePaths.createTask
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
