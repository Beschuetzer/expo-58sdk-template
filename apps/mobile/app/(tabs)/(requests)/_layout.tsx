import { Stack } from 'expo-router';

import { useColorScheme } from '@/components/hooks/useColorScheme';
import { AppRoutePaths } from '@/constants/navigation';
import { useI18n } from '@/utils/i18n';
import {
  createNavigationBackButton,
  stackPageTitleScreenOptions,
} from '@/utils/pageTitle';
import { getNavigationHeaderOptions } from '@/utils/theme';

export const unstable_settings = {
  anchor: 'index',
};

export default function PaymentRequestsLayout() {
  const colorScheme = useColorScheme();
  const { t } = useI18n();

  return (
    <Stack
      screenOptions={{
        ...stackPageTitleScreenOptions,
        ...getNavigationHeaderOptions(colorScheme),
        headerShown: true,
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen name="index" options={{ title: t('tabs.money') }} />
      <Stack.Screen
        name="BudgetsScreen"
        options={{
          title: t('budgets.title'),
          headerLeft: createNavigationBackButton(AppRoutePaths.money),
        }}
      />
      <Stack.Screen
        name="NewBudgetScreen"
        options={{
          title: t('budgets.create'),
          headerLeft: createNavigationBackButton(AppRoutePaths.budgets),
        }}
      />
      <Stack.Screen
        name="ViewAllRequestsScreen"
        options={{
          title: t('paymentRequests.viewAllRequests'),
          headerLeft: createNavigationBackButton(AppRoutePaths.money),
        }}
      />
      <Stack.Screen
        name="NewPaymentRequestScreen"
        options={{
          title: t('paymentRequests.createRequest'),
          headerLeft: createNavigationBackButton(AppRoutePaths.money),
        }}
      />
      <Stack.Screen
        name="AwaitingDecisionScreen"
        options={{
          title: t('paymentRequests.awaitingDecision'),
          headerLeft: createNavigationBackButton(AppRoutePaths.money),
        }}
      />
      <Stack.Screen
        name="JointAccountChargesScreen"
        options={{
          title: t('jointAccountCharges.title'),
        }}
      />
      <Stack.Screen
        name="budget/[id]"
        options={{
          headerLeft: createNavigationBackButton(AppRoutePaths.budgets),
        }}
      />
      <Stack.Screen
        name="payment-request/[id]"
        options={{
          headerLeft: createNavigationBackButton(AppRoutePaths.money),
        }}
      />
      <Stack.Screen
        name="joint-account-charge/[id]"
        options={{
          headerLeft: createNavigationBackButton(AppRoutePaths.money),
        }}
      />
      <Stack.Screen
        name="NewJointAccountChargeScreen"
        options={{
          title: t('jointAccountCharges.create'),
        }}
      />
    </Stack>
  );
}
