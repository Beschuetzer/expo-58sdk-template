import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import { ThemeAwareText } from '@/components/ui/ThemeAwareText';
import { useI18n } from '@/utils/i18n';

export default function NotFoundScreen() {
  const { t } = useI18n();

  return (
    <>
      <Stack.Screen options={{ title: t('errors.notFoundTitle') }} />
      <ThemeAwareScreen
        contentContainerStyle={styles.contentContainer}
        style={styles.container}
      >
        <ThemeAwareText style={styles.title}>
          {t('errors.notFoundMessage')}
        </ThemeAwareText>

        <View style={styles.link}>
          <Link href="/">
            <ThemeAwareText style={styles.linkText}>
              {t('errors.goHome')}
            </ThemeAwareText>
          </Link>
        </View>
      </ThemeAwareScreen>
    </>
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
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
  },
});
