import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useI18n } from '@/utils/i18n';

export default function TabOneScreen() {
  const { t } = useI18n();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('home.title')}</Text>
      <Text style={styles.description}>{t('home.description')}</Text>
      <Text style={styles.description}>{t('home.accountSettings')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
    maxWidth: 420,
    textAlign: 'center',
  },
});
