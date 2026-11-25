import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { ThemeAwareColorPicker } from '@/components/ui/ThemeAwareColorPicker';
import { ThemeAwareText } from '@/components/ui/ThemeAwareText';
import { ThemedModal } from '@/components/ui/ThemedModal';
import { useThemeAwareColors } from '@/components/ui/useThemeAwareColors';
import { VStack } from '@/components/ui/vstack';
import { COLORS } from '@/constants/colors';
import { useI18n } from '@/utils/i18n';
import { isValidTileGradientColor } from '@/utils/tileGradient';

type ScreenBackgroundColorPickerModalProps = {
  initialColor: string;
  isVisible: boolean;
  onCancel: () => void;
  onSave: (color: string) => void;
};

export function ScreenBackgroundColorPickerModal({
  initialColor,
  isVisible,
  onCancel,
  onSave,
}: ScreenBackgroundColorPickerModalProps) {
  const { colorScheme } = useThemeAwareColors();
  const { t } = useI18n();
  const [color, setColor] = useState(initialColor);
  const isValidColor = isValidTileGradientColor(color);

  const save = () => {
    if (isValidColor) {
      onSave(color);
    }
  };

  useEffect(() => {
    if (isVisible) {
      setColor(initialColor);
    }
  }, [initialColor, isVisible]);

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
        isEnabled: isValidColor,
        onPress: save,
        text: t('screenBackground.applyColor'),
      }}
      isVisible={isVisible}
      onClose={onCancel}
      title={t('screenBackground.colorPickerTitle')}
    >
      <VStack space="sm">
        <ThemeAwareText>{t('screenBackground.customColorHint')}</ThemeAwareText>
        <View
          style={{
            backgroundColor: color,
            borderColor: COLORS[colorScheme].border,
            borderRadius: 16,
            borderWidth: 1,
            height: 32,
            width: 32,
          }}
        />
        <ThemeAwareColorPicker
          accessibilityLabel={t('screenBackground.colorPickerTitle')}
          hueAccessibilityLabel={t('screenBackground.hue')}
          onColorChange={setColor}
          value={color}
        />
      </VStack>
    </ThemedModal>
  );
}
