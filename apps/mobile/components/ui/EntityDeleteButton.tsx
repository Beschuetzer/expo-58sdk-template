import { Alert } from 'react-native';

import { ThemeAwareButton } from './ThemeAwareButton';

import { useI18n } from '@/utils/i18n';

type EntityDeleteButtonProps = {
  confirmationMessage?: string;
  disabled?: boolean;
  flex?: number;
  onDelete: () => void;
};

export function EntityDeleteButton({
  confirmationMessage,
  disabled = false,
  flex,
  onDelete,
}: EntityDeleteButtonProps) {
  const { t } = useI18n();
  const label = t('common.delete');

  return (
    <ThemeAwareButton
      darkBackground="$error700"
      disabled={disabled}
      flex={flex}
      lightBackground="$error600"
      onPress={() =>
        Alert.alert(
          label,
          confirmationMessage ?? t('common.deleteConfirmation'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            { text: label, style: 'destructive', onPress: onDelete },
          ],
        )
      }
    >
      {label}
    </ThemeAwareButton>
  );
}
