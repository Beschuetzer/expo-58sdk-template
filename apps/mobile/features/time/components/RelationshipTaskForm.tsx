import type {
  RelationshipMember,
  RelationshipTask,
  UpdateRelationshipTaskInput,
} from '@expo-50sdk-template/shared-types';
import { Stack } from 'expo-router';
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
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { CARD_ARTWORK } from '@/constants/cardArtwork';
import { RelationshipMemberSelector } from '@/features/relationships/components/RelationshipMemberSelector';
import { useI18n } from '@/utils/i18n';

const MAX_TASK_REMINDER_FREQUENCY_DAYS = 365;

function parseReminderFrequencyDays(value: string) {
  if (!/^\d+$/.test(value)) return undefined;
  const days = Number(value);
  return days >= 1 && days <= MAX_TASK_REMINDER_FREQUENCY_DAYS
    ? days
    : undefined;
}

function getInitialSelectedUserIds(
  userIds: string[] | undefined,
  members: RelationshipMember[],
) {
  const activeUserIds = members
    .filter((member) => member.active)
    .map((member) => member.userId);
  if (!userIds?.length) return activeUserIds;

  const activeUserIdSet = new Set(activeUserIds);
  return [...new Set(userIds.filter((userId) => activeUserIdSet.has(userId)))];
}

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

type RelationshipTaskFormProps = {
  additionalBottomAction?: ReactNode;
  descriptionText?: string;
  error?: Error | null;
  initialValue?: Pick<
    RelationshipTask,
    | 'name'
    | 'dueDate'
    | 'reminderFrequencyDays'
    | 'visibleToUserIds'
    | 'completableByUserIds'
  >;
  isPending: boolean;
  members: RelationshipMember[];
  onSubmit: (input: UpdateRelationshipTaskInput) => Promise<void>;
  submitLabel: string;
  title: string;
};

export function RelationshipTaskForm({
  additionalBottomAction,
  descriptionText,
  error,
  initialValue,
  isPending,
  members,
  onSubmit,
  submitLabel,
  title,
}: RelationshipTaskFormProps) {
  const { t } = useI18n();
  const [name, setName] = useState(initialValue?.name ?? '');
  const [dueDate, setDueDate] = useState<Date | null>(() =>
    initialValue?.dueDate ? new Date(initialValue.dueDate) : null,
  );
  const [reminderFrequencyDays, setReminderFrequencyDays] = useState(() =>
    String(initialValue?.reminderFrequencyDays ?? 1),
  );
  const [visibleToUserIds, setVisibleToUserIds] = useState(() =>
    getInitialSelectedUserIds(initialValue?.visibleToUserIds, members),
  );
  const [completableByUserIds, setCompletableByUserIds] = useState(() =>
    getInitialSelectedUserIds(initialValue?.completableByUserIds, members),
  );
  const parsedReminderFrequencyDays = parseReminderFrequencyDays(
    reminderFrequencyDays,
  );
  const hasValidMemberSelections =
    visibleToUserIds.length > 0 && completableByUserIds.length > 0;
  const canSubmit =
    name.trim().length > 0 &&
    name.trim().length <= 160 &&
    hasValidMemberSelections &&
    (!dueDate || parsedReminderFrequencyDays !== undefined);
  const submitButton = (
    <ThemeAwareButton
      {...(additionalBottomAction ? { flex: 1 } : {})}
      isDisabled={isPending || !canSubmit}
      onPress={() => {
        const input: UpdateRelationshipTaskInput = {
          name: name.trim(),
          ...(dueDate ? { dueDate: dueDate.toISOString() } : {}),
          ...(dueDate && parsedReminderFrequencyDays !== undefined
            ? { reminderFrequencyDays: parsedReminderFrequencyDays }
            : {}),
          visibleToUserIds,
          completableByUserIds,
        };
        onSubmit(input).catch(() => undefined);
      }}
    >
      {submitLabel}
    </ThemeAwareButton>
  );
  const bottomContent = additionalBottomAction ? (
    <HStack space="sm">
      {additionalBottomAction}
      {submitButton}
    </HStack>
  ) : (
    submitButton
  );

  return (
    <ThemeAwareScreen bottomContent={bottomContent}>
      <Stack.Screen options={{ title }} />
      <VStack space="md">
        <ThemeAwareCardSurface
          backgroundImage={CARD_ARTWORK.planning}
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
            <FormField label={t('time.taskName')}>
              <ThemeAwareInput
                value={name}
                onChangeText={setName}
                inputFieldProps={{
                  maxLength: 160,
                  placeholder: t('time.taskNamePlaceholder'),
                  returnKeyType: 'done',
                }}
              />
            </FormField>
            <FormField label={t('time.taskDueDate')}>
              <ThemeAwareTimePicker
                accessibilityLabel={t('time.taskDueDate')}
                clearable
                mode="datetime"
                onChange={(_event, selectedDate) => {
                  if (selectedDate) setDueDate(selectedDate);
                }}
                onClear={() => setDueDate(null)}
                placeholder={t('time.taskDueDatePlaceholder')}
                value={dueDate}
              />
            </FormField>
            {dueDate ? (
              <FormField label={t('time.taskReminderFrequency')}>
                <ThemeAwareInput
                  inputType="number"
                  max={MAX_TASK_REMINDER_FREQUENCY_DAYS}
                  min={1}
                  onChangeText={setReminderFrequencyDays}
                  inputFieldProps={{
                    keyboardType: 'number-pad',
                    maxLength: 3,
                    placeholder: t('time.taskReminderFrequencyPlaceholder'),
                  }}
                  value={reminderFrequencyDays}
                />
                <ThemeAwareText size="sm">
                  {t('time.taskReminderFrequencyHint')}
                </ThemeAwareText>
                {parsedReminderFrequencyDays === undefined ? (
                  <ThemeAwareText color="$error600">
                    {t('time.taskReminderFrequencyInvalid')}
                  </ThemeAwareText>
                ) : null}
              </FormField>
            ) : null}
            <RelationshipMemberSelector
              hint={t('time.taskVisibleToHint')}
              label={t('time.taskVisibleTo')}
              members={members}
              onChange={setVisibleToUserIds}
              selectedUserIds={visibleToUserIds}
            />
            {visibleToUserIds.length === 0 ? (
              <ThemeAwareText color="$error600">
                {t('time.taskMemberSelectionRequired')}
              </ThemeAwareText>
            ) : null}
            <RelationshipMemberSelector
              hint={t('time.taskCompletableByHint')}
              label={t('time.taskCompletableBy')}
              members={members}
              onChange={setCompletableByUserIds}
              selectedUserIds={completableByUserIds}
            />
            {completableByUserIds.length === 0 ? (
              <ThemeAwareText color="$error600">
                {t('time.taskMemberSelectionRequired')}
              </ThemeAwareText>
            ) : null}
            {error ? (
              <ThemeAwareText color="$error600">{error.message}</ThemeAwareText>
            ) : null}
          </VStack>
        </ThemeAwareCardSurface>
      </VStack>
    </ThemeAwareScreen>
  );
}
