import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';

import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareButtonPaletteProvider } from '@/components/ui/ThemeAwareButtonPalette';
import { ThemeAwareMenu } from '@/components/ui/ThemeAwareMenu';
import { ThemeAwareHeading } from '@/components/ui/ThemeAwareText';
import { VStack } from '@/components/ui/vstack';
import { AppRoutePaths } from '@/constants/navigation';
import { useI18n } from '@/utils/i18n';

/**
 * Main navigation menu items.  Do NOT include the root tabs themselves.  Keep this list focused on additional navigation options within the app.  Alphabetize them too.
 */
const NAVIGATION_ITEMS = [
  {
    id: 'create-budget',
    label: 'budgets.create',
    route: AppRoutePaths.createBudget,
  },
  {
    id: 'create-joint-account-charge',
    label: 'jointAccountCharges.create',
    route: AppRoutePaths.createJointAccountCharge,
  },
  {
    id: 'create-relationship',
    label: 'paymentRequests.createRelationship',
    route: AppRoutePaths.createRelationship,
  },
  {
    id: 'create-rule',
    label: 'rules.create',
    route: AppRoutePaths.createRule,
  },
  {
    id: 'create-me-time',
    label: 'time.createMeTime',
    route: AppRoutePaths.createMeTime,
  },
  {
    id: 'create-task',
    label: 'time.createTask',
    route: AppRoutePaths.createTask,
  },
  {
    id: 'create-request',
    label: 'paymentRequests.createRequest',
    route: AppRoutePaths.createRequest,
  },
  {
    id: 'search-relationships',
    label: 'home.findRelationship',
    route: AppRoutePaths.searchRelationships,
  },
  {
    id: 'notifications-inbox',
    label: 'notifications.inbox',
    route: AppRoutePaths.notifications,
  },
  { id: 'settings', label: 'tabs.settings', route: AppRoutePaths.settings },
  {
    id: 'view-all-me-time',
    label: 'time.viewAllMeTime',
    route: AppRoutePaths.viewAllMeTime,
  },
  {
    id: 'view-budgets',
    label: 'budgets.viewAll',
    route: AppRoutePaths.budgets,
  },
  {
    id: 'view-all-requests',
    label: 'paymentRequests.viewAllRequests',
    route: AppRoutePaths.viewAllRequests,
  },
  {
    id: 'view-all-rules',
    label: 'rules.viewAll',
    route: AppRoutePaths.viewAllRules,
  },
  {
    id: 'view-all-tasks',
    label: 'time.viewAllTasks',
    route: AppRoutePaths.viewAllIncompleteTasks,
  },
  {
    id: 'view-completed-tasks',
    label: 'time.viewCompletedTasks',
    route: AppRoutePaths.viewAllCompletedTasks,
  },
  {
    id: 'view-joint-account-charges',
    label: 'jointAccountCharges.viewAll',
    route: AppRoutePaths.viewJointAccountCharges,
  },
  {
    id: 'awaiting-decision',
    label: 'paymentRequests.awaitingDecision',
    route: AppRoutePaths.awaitingDecision,
  },
] as const;

const PUSH_NAVIGATION_ROUTES = new Set<string>([
  AppRoutePaths.createBudget,
  AppRoutePaths.createJointAccountCharge,
  AppRoutePaths.createRelationship,
  AppRoutePaths.createRule,
  AppRoutePaths.createMeTime,
  AppRoutePaths.createTask,
  AppRoutePaths.createRequest,
  AppRoutePaths.viewAllMeTime,
  AppRoutePaths.budgets,
  AppRoutePaths.viewAllRequests,
  AppRoutePaths.viewAllRules,
  AppRoutePaths.viewAllIncompleteTasks,
  AppRoutePaths.viewAllCompletedTasks,
  AppRoutePaths.viewJointAccountCharges,
]);

export function MainTabNavigationMenu() {
  const { t } = useI18n();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <ThemeAwareMenu
      header={<ThemeAwareHeading>{t('menu.navigation')}</ThemeAwareHeading>}
      onOpenChange={setIsOpen}
      open={isOpen}
      side="left"
    >
      <ThemeAwareButtonPaletteProvider>
        <ScrollView style={{ flex: 1 }}>
          <VStack space="sm" className="p-4">
            {NAVIGATION_ITEMS.map((item) => (
              <ThemeAwareButton
                key={item.id}
                onPress={() => {
                  setIsOpen(false);
                  if (PUSH_NAVIGATION_ROUTES.has(item.route)) {
                    router.push(item.route);
                    return;
                  }
                  router.navigate(item.route);
                }}
                variant="outline"
                width="100%"
              >
                {t(item.label)}
              </ThemeAwareButton>
            ))}
          </VStack>
        </ScrollView>
      </ThemeAwareButtonPaletteProvider>
    </ThemeAwareMenu>
  );
}
