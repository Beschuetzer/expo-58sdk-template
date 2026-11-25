import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack } from 'expo-router';
import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { ThemeAwareHeading } from '@/components/ui/ThemeAwareHeading';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import { ThemeAwareSurface } from '@/components/ui/ThemeAwareSurface';
import { ThemeAwareText } from '@/components/ui/ThemeAwareText';
import { useThemeAwareColors } from '@/components/ui/useThemeAwareColors';
import { VStack } from '@/components/ui/vstack';
import { COLORS } from '@/constants/colors';
import { useI18n, type TranslationKey } from '@/utils/i18n';

type OAuthRedirectScreenProps = {
  icon: ComponentProps<typeof FontAwesome>['name'];
  message: TranslationKey;
  title: TranslationKey;
};

export function OAuthRedirectScreen({
  icon,
  message,
  title,
}: OAuthRedirectScreenProps) {
  const { t } = useI18n();
  const { colorScheme } = useThemeAwareColors();

  return (
    <ThemeAwareScreen
      contentContainerStyle={styles.contentContainer}
      space="2xl"
      style={styles.container}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ThemeAwareSurface
        alignItems="center"
        borderRadius="$full"
        borderColor="$primary200"
        borderWidth={1}
        darkBackground="$backgroundDark900"
        h="$20"
        justifyContent="center"
        lightBackground="$primary50"
        w="$20"
      >
        <FontAwesome name={icon} color={COLORS[colorScheme].tint} size={32} />
      </ThemeAwareSurface>
      <VStack space="md" className="items-center max-w-[360px] w-[100%]">
        <ThemeAwareHeading size="2xl" textAlign="center">
          {t(title)}
        </ThemeAwareHeading>
        <ThemeAwareText
          maxWidth={300}
          textAlign="center"
          color={COLORS[colorScheme].mutedText}
          size="md"
        >
          {t(message)}
        </ThemeAwareText>
      </VStack>
      <ActivityIndicator
        accessibilityLabel={t('common.loading')}
        color={COLORS[colorScheme].tint}
      />
    </ThemeAwareScreen>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
});
