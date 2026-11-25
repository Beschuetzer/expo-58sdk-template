import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Switch, View } from 'react-native';

import { ScreenBackgroundColorPickerModal } from '@/components/ui/ScreenBackgroundColorPickerModal';
import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareHeading } from '@/components/ui/ThemeAwareHeading';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import { ThemeAwareText } from '@/components/ui/ThemeAwareText';
import { TileGradientCustomizerModal } from '@/components/ui/TileGradientCustomizerModal';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { COLORS } from '@/constants/colors';
import { AppRoutePaths } from '@/constants/navigation';
import { useFont, type FontFamily } from '@/utils/font';
import { useI18n } from '@/utils/i18n';
import {
  SCREEN_BACKGROUND_COLORS,
  SCREEN_BACKGROUND_COLOR_OPTIONS,
  SCREEN_BACKGROUND_OPTIONS,
  useScreenBackground,
} from '@/utils/screenBackground';
import { useThemeMode } from '@/utils/theme';
import { useTileSet } from '@/utils/tileSet';

export default function SettingsScreen() {
  const [isGradientCustomizerVisible, setIsGradientCustomizerVisible] =
    useState(false);
  const [
    isScreenBackgroundColorPickerVisible,
    setIsScreenBackgroundColorPickerVisible,
  ] = useState(false);
  const router = useRouter();
  const { locale, locales, setLocale, t } = useI18n();
  const { font, fonts, setFont } = useFont();
  const { colorScheme, mode, modes, setMode } = useThemeMode();
  const {
    tileSet,
    tileSets,
    setTileSet,
    tileGradientsEnabled,
    setTileGradientsEnabled,
    tileGradientSettings,
    setTileGradientCustomization,
  } = useTileSet();
  const {
    screenBackground,
    screenBackgroundColor,
    customScreenBackgroundColor,
    setScreenBackground,
    setScreenBackgroundColor,
    setCustomScreenBackgroundColor,
  } = useScreenBackground();
  const screenBackgroundPickerInitialColor =
    screenBackgroundColor === 'custom'
      ? customScreenBackgroundColor
      : SCREEN_BACKGROUND_COLORS[screenBackgroundColor][colorScheme];

  const handleTileGradientsEnabledChange = (enabled: boolean) => {
    setTileGradientsEnabled(enabled);
    if (enabled) {
      setIsGradientCustomizerVisible(true);
    }
  };

  return (
    <ThemeAwareScreen>
      <ThemeAwareHeading size="lg">{t('settings.title')}</ThemeAwareHeading>
      <VStack space="md">
        <HStack className="justify-between items-center">
          <ThemeAwareText>{t('theme.label')}</ThemeAwareText>
          <HStack space="sm">
            {(Object.keys(modes) as (keyof typeof modes)[]).map(
              (availableMode) => {
                const isSelected = mode === availableMode;

                return (
                  <ThemeAwareButton
                    key={availableMode}
                    disabled={isSelected}
                    variant={isSelected ? 'solid' : 'outline'}
                    size="sm"
                    onPress={() => setMode(availableMode)}
                  >
                    {t(`theme.${availableMode}`)}
                  </ThemeAwareButton>
                );
              },
            )}
          </HStack>
        </HStack>
        <VStack space="sm">
          <ThemeAwareText>{t('tileSet.label')}</ThemeAwareText>
          <HStack space="sm" className="w-[100%] flex-wrap">
            {tileSets.map((availableTileSet) => {
              const isSelected = tileSet === availableTileSet;

              return (
                <ThemeAwareButton
                  key={availableTileSet}
                  testID={`tile-set-${availableTileSet}`}
                  disabled={isSelected}
                  variant={isSelected ? 'solid' : 'outline'}
                  size="sm"
                  onPress={() => setTileSet(availableTileSet)}
                >
                  {t(`tileSet.${availableTileSet}`)}
                </ThemeAwareButton>
              );
            })}
          </HStack>
        </VStack>
        <VStack space="sm">
          <ThemeAwareText>{t('screenBackground.label')}</ThemeAwareText>
          <HStack space="sm" className="w-[100%] flex-wrap">
            {SCREEN_BACKGROUND_OPTIONS.map((availableBackground) => {
              const isSelected = screenBackground === availableBackground;

              return (
                <ThemeAwareButton
                  key={availableBackground}
                  testID={`screen-background-${availableBackground}`}
                  accessibilityLabel={t(
                    `screenBackground.${availableBackground}`,
                  )}
                  disabled={isSelected}
                  variant={isSelected ? 'solid' : 'outline'}
                  size="sm"
                  onPress={() => setScreenBackground(availableBackground)}
                >
                  {t(`screenBackground.${availableBackground}`)}
                </ThemeAwareButton>
              );
            })}
          </HStack>
          {screenBackground === 'color' ? (
            <VStack space="sm">
              <ThemeAwareText>
                {t('screenBackground.chooseColor')}
              </ThemeAwareText>
              <HStack space="sm" className="w-[100%] flex-wrap">
                {SCREEN_BACKGROUND_COLOR_OPTIONS.map((availableColor) => {
                  const isSelected = screenBackgroundColor === availableColor;

                  return (
                    <Pressable
                      key={availableColor}
                      testID={`screen-background-color-${availableColor}`}
                      accessibilityRole="button"
                      accessibilityLabel={t(
                        `screenBackground.${availableColor}`,
                      )}
                      disabled={isSelected}
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => setScreenBackgroundColor(availableColor)}
                      style={{
                        alignItems: 'center',
                        borderColor: isSelected
                          ? COLORS[colorScheme].primaryButtonBackground
                          : COLORS[colorScheme].border,
                        borderRadius: 999,
                        borderWidth: isSelected ? 2 : 1,
                        height: 44,
                        justifyContent: 'center',
                        width: 44,
                      }}
                    >
                      <View
                        style={{
                          backgroundColor:
                            SCREEN_BACKGROUND_COLORS[availableColor][
                              colorScheme
                            ],
                          borderRadius: 14,
                          height: 28,
                          width: 28,
                        }}
                      />
                    </Pressable>
                  );
                })}
                <ThemeAwareButton
                  testID="screen-background-custom-color"
                  accessibilityLabel={t('screenBackground.customColor')}
                  accessibilityState={{
                    selected: screenBackgroundColor === 'custom',
                  }}
                  disabled={screenBackgroundColor === 'custom'}
                  variant={
                    screenBackgroundColor === 'custom' ? 'solid' : 'outline'
                  }
                  size="sm"
                  onPress={() => setIsScreenBackgroundColorPickerVisible(true)}
                >
                  {t('screenBackground.customColor')}
                </ThemeAwareButton>
                {screenBackgroundColor === 'custom' ? (
                  <ThemeAwareButton
                    testID="screen-background-custom-color-edit"
                    onPress={() =>
                      setIsScreenBackgroundColorPickerVisible(true)
                    }
                    variant="outline"
                    size="sm"
                  >
                    {t('screenBackground.changeCustomColor')}
                  </ThemeAwareButton>
                ) : null}
              </HStack>
            </VStack>
          ) : null}
        </VStack>
        <ScreenBackgroundColorPickerModal
          initialColor={screenBackgroundPickerInitialColor}
          isVisible={isScreenBackgroundColorPickerVisible}
          onCancel={() => setIsScreenBackgroundColorPickerVisible(false)}
          onSave={(color) => {
            setCustomScreenBackgroundColor(color);
            setIsScreenBackgroundColorPickerVisible(false);
          }}
        />
        <HStack className="justify-between items-center">
          <ThemeAwareText>{t('tileSet.gradients')}</ThemeAwareText>
          <HStack space="sm" className="items-center">
            {tileGradientsEnabled ? (
              <ThemeAwareButton
                accessibilityRole="button"
                onPress={() => setIsGradientCustomizerVisible(true)}
                variant="outline"
                size="sm"
              >
                {t('tileSet.customizeGradients')}
              </ThemeAwareButton>
            ) : null}
            <Switch
              accessibilityLabel={t('tileSet.gradients')}
              accessibilityRole="switch"
              accessibilityState={{ checked: tileGradientsEnabled }}
              onValueChange={handleTileGradientsEnabledChange}
              trackColor={{
                false: COLORS[colorScheme].border,
                true: COLORS[colorScheme].primaryButtonBackground,
              }}
              thumbColor={
                tileGradientsEnabled
                  ? COLORS[colorScheme].background
                  : COLORS[colorScheme].muted
              }
              value={tileGradientsEnabled}
            />
          </HStack>
        </HStack>
        <TileGradientCustomizerModal
          initialSettings={tileGradientSettings}
          isVisible={isGradientCustomizerVisible}
          onCancel={() => setIsGradientCustomizerVisible(false)}
          onSave={(customization) => {
            setTileGradientCustomization(customization);
            setIsGradientCustomizerVisible(false);
          }}
        />
        <VStack space="sm">
          <ThemeAwareText>{t('font.label')}</ThemeAwareText>
          <HStack space="sm" className="w-[100%] flex-wrap">
            {(Object.keys(fonts) as FontFamily[]).map((availableFont) => {
              const isSelected = font === availableFont;

              return (
                <ThemeAwareButton
                  key={availableFont}
                  disabled={isSelected}
                  variant={isSelected ? 'solid' : 'outline'}
                  size="sm"
                  onPress={() => setFont(availableFont)}
                >
                  {t(`font.${availableFont}`)}
                </ThemeAwareButton>
              );
            })}
          </HStack>
        </VStack>
        <HStack className="justify-between items-center">
          <ThemeAwareText>{t('settings.notifications')}</ThemeAwareText>
          <ThemeAwareButton
            onPress={() => router.navigate(AppRoutePaths.notifications)}
            variant="outline"
            size="sm"
          >
            {t('settings.viewInbox')}
          </ThemeAwareButton>
        </HStack>
        <HStack className="justify-between items-center">
          <ThemeAwareText>{t('settings.privacy')}</ThemeAwareText>
          <ThemeAwareButton variant="outline" size="sm">
            {t('settings.review')}
          </ThemeAwareButton>
        </HStack>

        <VStack space="sm">
          <ThemeAwareText>{t('language.label')}</ThemeAwareText>
          <HStack space="sm" className="w-[100%] flex-wrap">
            {(Object.keys(locales) as (keyof typeof locales)[]).map(
              (availableLocale) => {
                const isSelected = locale === availableLocale;

                return (
                  <ThemeAwareButton
                    key={availableLocale}
                    disabled={isSelected}
                    variant={isSelected ? 'solid' : 'outline'}
                    size="sm"
                    onPress={() => setLocale(availableLocale)}
                  >
                    {locales[availableLocale]}
                  </ThemeAwareButton>
                );
              },
            )}
          </HStack>
        </VStack>
      </VStack>
    </ThemeAwareScreen>
  );
}
