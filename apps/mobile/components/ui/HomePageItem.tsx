import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Image } from 'expo-image';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { ThemeAwareCardSurface } from '@/components/ui/ThemeAwareCardSurface';
import { ThemeAwareText } from '@/components/ui/ThemeAwareText';
import { ThemedModal } from '@/components/ui/ThemedModal';
import { HStack } from '@/components/ui/hstack';
import { useThemeAwareColors } from '@/components/ui/useThemeAwareColors';
import { VStack } from '@/components/ui/vstack';
import { useI18n } from '@/utils/i18n';
import { useTileSet } from '@/utils/tileSet';

const HELP_BUTTON_SIZE = 44;
const HELP_BUTTON_INSET = 17;
const CARD_ICON_BADGE_STYLE = {
  alignItems: 'center' as const,
  backgroundColor: 'rgba(255,255,255,0.16)',
  borderColor: 'transparent',
  borderRadius: 14,
  borderWidth: 1,
  height: 42,
  justifyContent: 'center' as const,
  width: 42,
};

type HomePageItemProps = {
  accessibilityHint?: string;
  backgroundImage?: ComponentProps<typeof Image>['source'];
  description?: string;
  icon: ComponentProps<typeof FontAwesome>['name'];
  itemHeight?: number;
  isUrgent?: boolean;
  onHeightMeasured?: (height: number) => void;
  onPress: () => void;
  title: string;
};

export function HomePageItem({
  accessibilityHint,
  backgroundImage,
  description = '',
  icon,
  itemHeight,
  isUrgent = false,
  onHeightMeasured,
  onPress,
  title,
}: HomePageItemProps) {
  const { getTextColor } = useThemeAwareColors();
  const foregroundColor = getTextColor(true);
  const { t } = useI18n();
  const { tileGradientsEnabled } = useTileSet();
  const [isDescriptionVisible, setIsDescriptionVisible] = useState(false);

  return (
    <View
      onLayout={(event) => onHeightMeasured?.(event.nativeEvent.layout.height)}
      style={{ height: itemHeight, position: 'relative' }}
    >
      <TouchableOpacity
        accessibilityHint={accessibilityHint}
        accessibilityLabel={title}
        accessibilityRole="button"
        onPress={onPress}
        style={itemHeight === undefined ? undefined : { flex: 1 }}
      >
        <ThemeAwareCardSurface
          backgroundImage={backgroundImage}
          customGradientEnabled={tileGradientsEnabled}
          borderRadius="$md"
          borderWidth="$1"
          flex={1}
          minHeight={128}
          paletteKey={title}
          p="$4"
          style={{ overflow: 'hidden' }}
        >
          <VStack space="md" className="flex-1 justify-start">
            <HStack className="items-center justify-between">
              <View style={CARD_ICON_BADGE_STYLE}>
                <FontAwesome color={foregroundColor} name={icon} size={18} />
              </View>
              <HStack className="items-center" space="xs">
                {isUrgent ? (
                  <FontAwesome
                    color={foregroundColor}
                    name="exclamation-circle"
                    size={18}
                  />
                ) : null}
                {description ? (
                  <View
                    style={{
                      height: HELP_BUTTON_SIZE,
                      width: HELP_BUTTON_SIZE,
                    }}
                  />
                ) : null}
              </HStack>
            </HStack>
            <ThemeAwareText
              fontWeight="$semibold"
              numberOfLines={2}
              style={{ color: foregroundColor }}
            >
              {title}
            </ThemeAwareText>
          </VStack>
        </ThemeAwareCardSurface>
      </TouchableOpacity>
      {description ? (
        <TouchableOpacity
          accessibilityHint={t('home.showDescriptionHint')}
          accessibilityLabel={t('home.showDescription')}
          accessibilityRole="button"
          onPress={() => setIsDescriptionVisible(true)}
          style={{
            alignItems: 'center',
            height: HELP_BUTTON_SIZE,
            justifyContent: 'center',
            position: 'absolute',
            right: HELP_BUTTON_INSET,
            top: HELP_BUTTON_INSET,
            width: HELP_BUTTON_SIZE,
            zIndex: 1,
          }}
        >
          <FontAwesome
            color={foregroundColor}
            name="question-circle"
            size={20}
          />
        </TouchableOpacity>
      ) : null}
      <ThemedModal
        confirmButton={{
          action: 'primary',
          onPress: () => setIsDescriptionVisible(false),
          text: t('home.closeDescription'),
        }}
        isVisible={isDescriptionVisible}
        onClose={() => setIsDescriptionVisible(false)}
        title={title}
      >
        <ThemeAwareText>{description}</ThemeAwareText>
      </ThemedModal>
    </View>
  );
}
