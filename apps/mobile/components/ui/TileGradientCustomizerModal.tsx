import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareColorPicker } from '@/components/ui/ThemeAwareColorPicker';
import { ThemeAwareInput } from '@/components/ui/ThemeAwareInput';
import { ThemeAwareText } from '@/components/ui/ThemeAwareText';
import { ThemedModal } from '@/components/ui/ThemedModal';
import { HStack } from '@/components/ui/hstack';
import { useThemeAwareColors } from '@/components/ui/useThemeAwareColors';
import { VStack } from '@/components/ui/vstack';
import { COLORS } from '@/constants/colors';
import { useI18n } from '@/utils/i18n';
import {
  DEFAULT_TILE_GRADIENT_SETTINGS,
  getTileGradientColors,
  getTileGradientLocations,
  getTileGradientPoints,
  isValidTileGradientColor,
  type TileGradientColorOverrides,
  type TileGradientCustomization,
  type TileGradientSettings,
} from '@/utils/tileGradient';

type StopIndex = 0 | 1 | 2;

type GradientDraft = {
  angle: string;
  colors: [string, string, string];
  locations: [string, string, string];
  opacity: string;
};

type TileGradientCustomizerModalProps = {
  initialSettings: TileGradientSettings;
  isVisible: boolean;
  onCancel: () => void;
  onSave: (customization: TileGradientCustomization) => void;
};

const STOP_INDEXES: StopIndex[] = [0, 1, 2];

function createDraft(settings: TileGradientSettings): GradientDraft {
  return {
    angle: String(settings.angle),
    colors: settings.colors.map((color) => color ?? '') as [
      string,
      string,
      string,
    ],
    locations: settings.locations.map(String) as [string, string, string],
    opacity: String(settings.opacity),
  };
}

function parseBoundedInteger(value: string, minimum: number, maximum: number) {
  const trimmedValue = value.trim();
  if (!/^\d+$/.test(trimmedValue)) {
    return null;
  }

  const parsedValue = Number(trimmedValue);
  return parsedValue >= minimum && parsedValue <= maximum ? parsedValue : null;
}

function parseDraft(draft: GradientDraft): TileGradientCustomization | null {
  const angle = parseBoundedInteger(draft.angle, 0, 359);
  const opacity = parseBoundedInteger(draft.opacity, 0, 100);
  const locations = draft.locations.map((location) =>
    parseBoundedInteger(location, 0, 100),
  );
  const colors = draft.colors.map((color) => {
    const trimmedColor = color.trim();
    if (trimmedColor.length === 0) {
      return null;
    }

    return isValidTileGradientColor(trimmedColor)
      ? trimmedColor.toUpperCase()
      : undefined;
  });

  if (
    angle === null ||
    opacity === null ||
    locations.some((location) => location === null) ||
    colors.some((color) => color === undefined)
  ) {
    return null;
  }

  const parsedLocations = locations as [number, number, number];
  if (
    parsedLocations[0] >= parsedLocations[1] ||
    parsedLocations[1] >= parsedLocations[2]
  ) {
    return null;
  }

  return {
    angle,
    colors: colors as TileGradientColorOverrides,
    locations: parsedLocations,
    opacity,
  };
}

export function TileGradientCustomizerModal({
  initialSettings,
  isVisible,
  onCancel,
  onSave,
}: TileGradientCustomizerModalProps) {
  const { colorScheme } = useThemeAwareColors();
  const { t } = useI18n();
  const [draft, setDraft] = useState(() => createDraft(initialSettings));
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });
  const customization = parseDraft(draft);
  const colorOverrides = draft.colors.map((color) =>
    isValidTileGradientColor(color.trim()) ? color.trim() : null,
  ) as TileGradientColorOverrides;
  const previewColors = getTileGradientColors(
    colorScheme,
    COLORS[colorScheme].buttonBackgrounds[0],
    colorOverrides,
  );
  const previewLocations = getTileGradientLocations(
    customization?.locations ?? DEFAULT_TILE_GRADIENT_SETTINGS.locations,
  );
  const previewPoints = getTileGradientPoints(
    customization?.angle ?? DEFAULT_TILE_GRADIENT_SETTINGS.angle,
    previewSize.width,
    previewSize.height,
  );
  const stopLabels = [
    t('tileSet.gradientStartColor'),
    t('tileSet.gradientMiddleColor'),
    t('tileSet.gradientEndColor'),
  ];
  const positionLabels = [
    t('tileSet.gradientStartPosition'),
    t('tileSet.gradientMiddlePosition'),
    t('tileSet.gradientEndPosition'),
  ];

  useEffect(() => {
    if (isVisible) {
      setDraft(createDraft(initialSettings));
    }
  }, [initialSettings, isVisible]);

  const updateColor = (index: StopIndex, value: string) => {
    setDraft((currentDraft) => {
      const colors: GradientDraft['colors'] = [...currentDraft.colors];
      colors[index] = value;
      return { ...currentDraft, colors };
    });
  };

  const updateLocation = (index: StopIndex, value: string) => {
    setDraft((currentDraft) => {
      const locations: GradientDraft['locations'] = [...currentDraft.locations];
      locations[index] = value;
      return { ...currentDraft, locations };
    });
  };

  const save = () => {
    if (customization) {
      onSave(customization);
    }
  };

  return (
    <ThemedModal
      cancelButton={{
        action: 'secondary',
        onPress: onCancel,
        text: t('common.cancel'),
      }}
      closeOnOverlayClick={false}
      confirmButton={{
        action: 'primary',
        isEnabled: customization !== null,
        onPress: save,
        text: t('tileSet.gradientApply'),
      }}
      isVisible={isVisible}
      onClose={onCancel}
      title={t('tileSet.gradientSettingsTitle')}
    >
      <VStack space="md">
        <VStack space="xs">
          <ThemeAwareText>{t('tileSet.gradientPreview')}</ThemeAwareText>
          <LinearGradient
            colors={previewColors}
            end={previewPoints.end}
            locations={previewLocations}
            onLayout={(event) => {
              const { height, width } = event.nativeEvent.layout;
              setPreviewSize((currentSize) =>
                currentSize.width === width && currentSize.height === height
                  ? currentSize
                  : { width, height },
              );
            }}
            start={previewPoints.start}
            style={{
              borderRadius: 12,
              height: 64,
              opacity:
                (customization?.opacity ??
                  DEFAULT_TILE_GRADIENT_SETTINGS.opacity) / 100,
              width: '100%',
            }}
          />
        </VStack>

        <VStack space="xs">
          <ThemeAwareText>{t('tileSet.gradientAngle')}</ThemeAwareText>
          <ThemeAwareInput
            inputFieldProps={{
              accessibilityLabel: t('tileSet.gradientAngle'),
              maxLength: 3,
            }}
            inputType="number"
            max={359}
            min={0}
            onChangeText={(angle) =>
              setDraft((currentDraft) => ({ ...currentDraft, angle }))
            }
            value={draft.angle}
          />
          <ThemeAwareText>{t('tileSet.gradientAngleHint')}</ThemeAwareText>
        </VStack>

        <VStack space="xs">
          <ThemeAwareText>{t('tileSet.gradientOpacity')}</ThemeAwareText>
          <ThemeAwareInput
            inputFieldProps={{
              accessibilityLabel: t('tileSet.gradientOpacity'),
              maxLength: 3,
            }}
            inputType="number"
            max={100}
            min={0}
            onChangeText={(opacity) =>
              setDraft((currentDraft) => ({ ...currentDraft, opacity }))
            }
            value={draft.opacity}
          />
        </VStack>

        <VStack space="sm">
          <ThemeAwareText>{t('tileSet.gradientColorStops')}</ThemeAwareText>
          {STOP_INDEXES.map((index) => (
            <VStack key={index} space="xs">
              <ThemeAwareText>{stopLabels[index]}</ThemeAwareText>
              <HStack className="items-center justify-between">
                <View
                  style={{
                    backgroundColor: previewColors[index],
                    borderColor: COLORS[colorScheme].border,
                    borderRadius: 16,
                    borderWidth: 1,
                    height: 32,
                    width: 32,
                  }}
                />
                <ThemeAwareButton
                  accessibilityRole="button"
                  isDisabled={draft.colors[index].length === 0}
                  onPress={() => updateColor(index, '')}
                  size="sm"
                  variant="link"
                >
                  {t('tileSet.gradientUseDefaultColor')}
                </ThemeAwareButton>
              </HStack>
              <ThemeAwareColorPicker
                accessibilityLabel={stopLabels[index]}
                hueAccessibilityLabel={t('tileSet.gradientHue')}
                onColorChange={(color) => updateColor(index, color)}
                value={draft.colors[index] || previewColors[index]}
              />
              <ThemeAwareText>{positionLabels[index]}</ThemeAwareText>
              <ThemeAwareInput
                inputFieldProps={{
                  accessibilityLabel: positionLabels[index],
                  maxLength: 3,
                }}
                inputType="number"
                max={100}
                min={0}
                onChangeText={(location) => updateLocation(index, location)}
                value={draft.locations[index]}
              />
            </VStack>
          ))}
          <ThemeAwareText>{t('tileSet.gradientColorHint')}</ThemeAwareText>
        </VStack>

        {customization === null ? (
          <ThemeAwareText>{t('tileSet.gradientInputInvalid')}</ThemeAwareText>
        ) : null}

        <ThemeAwareButton
          accessibilityRole="button"
          onPress={() => setDraft(createDraft(DEFAULT_TILE_GRADIENT_SETTINGS))}
          variant="link"
        >
          {t('tileSet.gradientReset')}
        </ThemeAwareButton>
      </VStack>
    </ThemedModal>
  );
}
