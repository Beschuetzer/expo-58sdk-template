import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { useI18n } from '@/utils/i18n';

export function RelationshipActivationButton({
  isActive,
  onActivate,
}: {
  isActive: boolean;
  onActivate: () => void;
}) {
  const { t } = useI18n();
  const labelKey = isActive
    ? 'home.activeRelationship'
    : 'home.inactiveRelationship';

  return (
    <ThemeAwareButton
      accessibilityHint={t(
        isActive
          ? 'home.activeRelationshipHint'
          : 'home.inactiveRelationshipHint',
      )}
      accessibilityLabel={t(labelKey)}
      accessibilityRole="button"
      accessibilityState={{ disabled: isActive, selected: isActive }}
      isDisabled={isActive}
      onPress={onActivate}
      variant={isActive ? 'solid' : 'outline'}
      width="100%"
    >
      {t(labelKey)}
    </ThemeAwareButton>
  );
}
