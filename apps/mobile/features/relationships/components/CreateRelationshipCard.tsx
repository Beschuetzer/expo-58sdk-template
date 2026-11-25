import { useState } from 'react';

import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareCardSurface } from '@/components/ui/ThemeAwareCardSurface';
import { ThemeAwareInput } from '@/components/ui/ThemeAwareInput';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import {
  ThemeAwareHeading,
  ThemeAwareText,
} from '@/components/ui/ThemeAwareText';
import { VStack } from '@/components/ui/vstack';
import { CARD_ARTWORK } from '@/constants/cardArtwork';
import { useCreateRelationshipMutation } from '@/features/payment-requests/hooks/usePaymentRequests';
import { useI18n } from '@/utils/i18n';

export function CreateRelationshipCard({
  displayName,
  fixedSubmitButton = false,
  onCreated,
  submitLabel,
  title,
}: {
  displayName?: string;
  fixedSubmitButton?: boolean;
  onCreated?: () => void;
  submitLabel: string;
  title: string;
}) {
  const { t } = useI18n();
  const [relationshipName, setRelationshipName] = useState('');
  const createRelationshipMutation = useCreateRelationshipMutation();

  const onCreate = () => {
    createRelationshipMutation.mutate(
      { name: relationshipName.trim(), displayName },
      {
        onSuccess: () => {
          setRelationshipName('');
          onCreated?.();
        },
      },
    );
  };

  const submitButton = (
    <ThemeAwareButton
      isDisabled={
        createRelationshipMutation.isPending ||
        relationshipName.trim().length === 0
      }
      onPress={onCreate}
    >
      {submitLabel}
    </ThemeAwareButton>
  );
  const card = (
    <ThemeAwareCardSurface
      backgroundImage={CARD_ARTWORK.relationships}
      borderRadius="$lg"
      p="$5"
    >
      <VStack space="md">
        <ThemeAwareHeading>{title}</ThemeAwareHeading>
        <ThemeAwareText>{t('home.noSpacesMessage')}</ThemeAwareText>
        <ThemeAwareInput
          value={relationshipName}
          onChangeText={setRelationshipName}
          inputFieldProps={{ placeholder: t('home.spaceNamePlaceholder') }}
        />
        {fixedSubmitButton ? null : submitButton}
        {createRelationshipMutation.error ? (
          <ThemeAwareText>
            {createRelationshipMutation.error.message}
          </ThemeAwareText>
        ) : null}
      </VStack>
    </ThemeAwareCardSurface>
  );

  return fixedSubmitButton ? (
    <ThemeAwareScreen bottomContent={submitButton}>{card}</ThemeAwareScreen>
  ) : (
    card
  );
}
