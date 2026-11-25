import type {
  CreateMeTimeInput,
  MeTime,
} from '@expo-50sdk-template/shared-types';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareCardSurface } from '@/components/ui/ThemeAwareCardSurface';
import { ThemeAwareInput } from '@/components/ui/ThemeAwareInput';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import {
  ThemeAwareHeading,
  ThemeAwareText,
} from '@/components/ui/ThemeAwareText';
import { ThemeAwareTimePicker } from '@/components/ui/ThemeAwareTimePicker';
import { VStack } from '@/components/ui/vstack';
import { CARD_ARTWORK } from '@/constants/cardArtwork';
import { isValidMeTimeRange } from '@/features/time/form';
import { useI18n } from '@/utils/i18n';

type MeTimeFormProps = {
  descriptionText?: string;
  error: Error | null;
  initialValue?: Pick<MeTime, 'startTime' | 'endTime' | 'description'>;
  isPending: boolean;
  onSubmit: (input: CreateMeTimeInput) => Promise<void>;
  submitLabel: string;
  title: string;
};

function FormField({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <VStack space="xs">
      <ThemeAwareText fontWeight="$semibold">{label}</ThemeAwareText>
      {children}
    </VStack>
  );
}

function createDefaultRange() {
  const endTime = new Date();
  endTime.setSeconds(0, 0);
  return {
    startTime: new Date(endTime.getTime() - 60 * 60 * 1000),
    endTime,
  };
}

export function MeTimeForm({
  descriptionText,
  error,
  initialValue,
  isPending,
  onSubmit,
  submitLabel,
  title,
}: MeTimeFormProps) {
  const { t } = useI18n();
  const [range, setRange] = useState(() =>
    initialValue
      ? {
          startTime: new Date(initialValue.startTime),
          endTime: new Date(initialValue.endTime),
        }
      : createDefaultRange(),
  );
  const [description, setDescription] = useState(
    initialValue?.description ?? '',
  );
  const isValidRange = isValidMeTimeRange(range.startTime, range.endTime);

  const submitButton = (
    <ThemeAwareButton
      isDisabled={isPending || !isValidRange}
      onPress={() => {
        onSubmit({
          startTime: range.startTime.toISOString(),
          endTime: range.endTime.toISOString(),
          description: description.trim() || undefined,
        }).catch(() => undefined);
      }}
    >
      {submitLabel}
    </ThemeAwareButton>
  );

  return (
    <ThemeAwareScreen bottomContent={submitButton}>
      <VStack space="md">
        <ThemeAwareCardSurface
          backgroundImage={CARD_ARTWORK.personalTime}
          borderRadius="$sm"
          p="$4"
        >
          <VStack space="md">
            <VStack space="xs">
              <ThemeAwareHeading>{title}</ThemeAwareHeading>
              {descriptionText ? (
                <ThemeAwareText>{descriptionText}</ThemeAwareText>
              ) : null}
            </VStack>
            <FormField label={t('time.startTime')}>
              <ThemeAwareTimePicker
                accessibilityLabel={t('time.startTime')}
                isDisabled={isPending}
                mode="datetime"
                onChange={(event, date) => {
                  if (event.type === 'set' && date) {
                    setRange((current) => ({ ...current, startTime: date }));
                  }
                }}
                value={range.startTime}
              />
            </FormField>
            <FormField label={t('time.endTime')}>
              <ThemeAwareTimePicker
                accessibilityLabel={t('time.endTime')}
                isDisabled={isPending}
                mode="datetime"
                onChange={(event, date) => {
                  if (event.type === 'set' && date) {
                    setRange((current) => ({ ...current, endTime: date }));
                  }
                }}
                value={range.endTime}
              />
            </FormField>
            {!isValidRange ? (
              <ThemeAwareText color="$error600" size="sm">
                {t('time.endBeforeStart')}
              </ThemeAwareText>
            ) : null}
            <FormField label={t('time.description')}>
              <ThemeAwareInput
                value={description}
                onChangeText={setDescription}
                inputFieldProps={{
                  maxLength: 2000,
                  multiline: true,
                  placeholder: t('time.descriptionPlaceholder'),
                  textAlignVertical: 'top',
                }}
                inputProps={{ height: 112 }}
              />
            </FormField>
            {error ? (
              <ThemeAwareText color="$error600">{error.message}</ThemeAwareText>
            ) : null}
          </VStack>
        </ThemeAwareCardSurface>
      </VStack>
    </ThemeAwareScreen>
  );
}
