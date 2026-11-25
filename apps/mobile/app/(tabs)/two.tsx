import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useI18n, type Locale } from '@/utils/i18n';
import { useThemeMode, type ThemeMode } from '@/utils/theme';

const availableThemeModes: ThemeMode[] = ['system', 'light', 'dark'];
const availableLocales: Locale[] = ['en', 'es', 'de'];

export default function SettingsScreen() {
  const { locale, locales, setLocale, t } = useI18n();
  const { colorScheme, mode, setMode } = useThemeMode();
  const [preferenceError, setPreferenceError] = useState(false);
  const colors = Colors[colorScheme];

  const selectTheme = (nextMode: ThemeMode) => {
    setPreferenceError(false);
    setMode(nextMode);
  };
  const selectLocale = (nextLocale: Locale) => {
    setPreferenceError(false);
    setLocale(nextLocale);
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
    >
      <Text style={styles.title}>{t('settings.title')}</Text>
      <Text style={styles.description}>{t('settings.themeDescription')}</Text>
      <Text style={styles.sectionTitle}>{t('settings.theme')}</Text>
      <View style={styles.options}>
        {availableThemeModes.map((availableMode) => {
          const isSelected = mode === availableMode;
          return (
            <Pressable
              key={availableMode}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => selectTheme(availableMode)}
              style={[
                styles.option,
                {
                  backgroundColor: isSelected ? colors.tint : colors.background,
                  borderColor: colors.tint,
                },
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  isSelected && styles.selectedOptionText,
                ]}
              >
                {t(`theme.${availableMode}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.description}>{t('settings.languageDescription')}</Text>
      <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
      <View style={styles.options}>
        {availableLocales.map((availableLocale) => {
          const isSelected = locale === availableLocale;
          return (
            <Pressable
              key={availableLocale}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => selectLocale(availableLocale)}
              style={[
                styles.option,
                {
                  backgroundColor: isSelected ? colors.tint : colors.background,
                  borderColor: colors.tint,
                },
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  isSelected && styles.selectedOptionText,
                ]}
              >
                {locales[availableLocale]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {preferenceError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {t('settings.preferenceSaveFailed')}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  option: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 84,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionText: {
    fontSize: 15,
  },
  selectedOptionText: {
    color: '#fff',
    fontWeight: '600',
  },
  error: {
    color: '#c0392b',
    marginTop: 8,
  },
});
