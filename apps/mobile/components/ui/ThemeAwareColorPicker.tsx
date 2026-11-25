import ColorPicker, { HueSlider, Panel1 } from 'reanimated-color-picker';

type ThemeAwareColorPickerProps = {
  accessibilityLabel: string;
  hueAccessibilityLabel: string;
  onColorChange: (color: string) => void;
  value: string;
};

function normalizeColorPickerHex(hex: string) {
  const opaqueHex = /^#[\da-f]{8}$/i.test(hex) ? hex.slice(0, 7) : hex;
  return opaqueHex.toUpperCase();
}

export function ThemeAwareColorPicker({
  accessibilityLabel,
  hueAccessibilityLabel,
  onColorChange,
  value,
}: ThemeAwareColorPickerProps) {
  return (
    <ColorPicker
      colorAnnouncementFormat="hex"
      onCompleteJS={({ hex }) => onColorChange(normalizeColorPickerHex(hex))}
      sliderThickness={24}
      style={{ width: '100%' }}
      thumbSize={24}
      value={value}
    >
      <Panel1
        accessibilityLabel={accessibilityLabel}
        style={{ borderRadius: 10, height: 160 }}
      />
      <HueSlider
        accessibilityLabel={hueAccessibilityLabel}
        style={{ marginTop: 12 }}
      />
    </ColorPicker>
  );
}
