import type {
  RelationshipMember,
  RelationshipSummary,
} from '@expo-50sdk-template/shared-types';
import { Stack, useRouter } from 'expo-router';
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
import { AppRoutePaths, DetailNavigationSources } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import {
  useRelationshipMembersQuery,
  useRelationshipsQuery,
} from '@/features/payment-requests/hooks/usePaymentRequests';
import { parseRelationshipRuleLabels } from '@/features/relationship-rules/form';
import { useCreateRelationshipRuleMutation } from '@/features/relationship-rules/hooks/useRelationshipRules';
import { RelationshipMemberSelector } from '@/features/relationships/components/RelationshipMemberSelector';
import { selectedRelationshipIdSelector } from '@/state/slices/generalSlice';
import { useAppSelector } from '@/state/store';
import { useI18n } from '@/utils/i18n';

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

function CreateRuleForm({
  currentUserId,
  members,
  relationship,
}: {
  currentUserId: string;
  members: RelationshipMember[];
  relationship: RelationshipSummary;
}) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const createMutation = useCreateRelationshipRuleMutation(relationship.id);
  const [name, setName] = useState('');
  const [labelsText, setLabelsText] = useState('');
  const [description, setDescription] = useState('');
  const [remindMeToReview, setRemindMeToReview] = useState<Date | null>(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date;
  });
  const [requiredApproverUserIds, setRequiredApproverUserIds] = useState<
    string[]
  >([]);
  const labels = parseRelationshipRuleLabels(labelsText);
  const hasOverlongLabel = labels.some((label) => label.length > 80);
  const hasEligibleApprover = members.some(
    (member) => member.active && member.userId !== currentUserId,
  );
  const isReminderInPast =
    remindMeToReview !== null && remindMeToReview.getTime() <= Date.now();
  const isPending = createMutation.isPending;
  const canCreate =
    name.trim().length > 0 &&
    description.trim().length > 0 &&
    !hasOverlongLabel &&
    requiredApproverUserIds.length > 0 &&
    hasEligibleApprover &&
    !isReminderInPast;

  const submitButton = (
    <ThemeAwareButton
      isDisabled={isPending || !canCreate}
      onPress={() => createRule().catch(() => undefined)}
    >
      {t('rules.create')}
    </ThemeAwareButton>
  );

  async function createRule() {
    const rule = await createMutation.mutateAsync({
      name: name.trim(),
      labels,
      description: description.trim(),
      requiredApproverUserIds,
      remindMeToReview: remindMeToReview?.toISOString() ?? null,
    });
    router.dismissTo(AppRoutePaths.viewAllRules);
    router.navigate({
      pathname: AppRoutePaths.relationshipRuleDetails,
      params: {
        id: rule.id,
        detailNavigationSource: DetailNavigationSources.relationshipRules,
      },
    });
  }

  return (
    <ThemeAwareScreen bottomContent={submitButton}>
      <Stack.Screen options={{ title: t('rules.create') }} />
      <VStack space="md">
        <ThemeAwareCardSurface
          backgroundImage={CARD_ARTWORK.planning}
          borderRadius="$sm"
          p="$4"
        >
          <VStack space="md">
            <VStack space="xs">
              <ThemeAwareHeading>{t('rules.create')}</ThemeAwareHeading>
              <ThemeAwareText>{t('rules.createDescription')}</ThemeAwareText>
            </VStack>
            <FormField label={t('rules.name')}>
              <ThemeAwareInput
                value={name}
                onChangeText={setName}
                inputFieldProps={{
                  maxLength: 160,
                  placeholder: t('rules.namePlaceholder'),
                }}
              />
            </FormField>
            <FormField label={t('rules.labels')}>
              <ThemeAwareInput
                value={labelsText}
                onChangeText={setLabelsText}
                inputFieldProps={{
                  placeholder: t('rules.labelsPlaceholder'),
                }}
              />
            </FormField>
            {hasOverlongLabel ? (
              <ThemeAwareText color="$error600" size="sm">
                {t('rules.labelsTooLong')}
              </ThemeAwareText>
            ) : null}
            <FormField label={t('rules.description')}>
              <ThemeAwareInput
                value={description}
                onChangeText={setDescription}
                inputFieldProps={{
                  maxLength: 4000,
                  multiline: true,
                  placeholder: t('rules.descriptionPlaceholder'),
                  textAlignVertical: 'top',
                }}
                inputProps={{ height: 128 }}
              />
            </FormField>
            <FormField label={t('rules.dateCreated')}>
              <ThemeAwareText>
                {new Date().toLocaleDateString(locale)}
              </ThemeAwareText>
            </FormField>
            <FormField label={t('rules.dateRatified')}>
              <ThemeAwareText>
                {t('rules.ratificationDateDescription')}
              </ThemeAwareText>
            </FormField>
            <FormField label={t('rules.remindMeToReview')}>
              <ThemeAwareTimePicker
                clearable
                mode="datetime"
                minimumDate={new Date()}
                onChange={(_event, date) => {
                  if (date) setRemindMeToReview(date);
                }}
                onClear={() => setRemindMeToReview(null)}
                placeholder={
                  remindMeToReview ? undefined : t('rules.reminderNever')
                }
                value={remindMeToReview}
              />
              <ThemeAwareText size="sm">
                {t('rules.reminderDescription')}
              </ThemeAwareText>
              {isReminderInPast ? (
                <ThemeAwareText color="$error600" size="sm">
                  {t('rules.reminderMustBeFuture')}
                </ThemeAwareText>
              ) : null}
            </FormField>
            <RelationshipMemberSelector
              emptyMessage={
                hasEligibleApprover ? undefined : t('rules.noEligibleApprovers')
              }
              excludedUserIds={[currentUserId]}
              hint={t('rules.requiredApproversHint')}
              label={t('rules.requiredApprovers')}
              members={members}
              onChange={setRequiredApproverUserIds}
              selectedUserIds={requiredApproverUserIds}
            />
            {createMutation.error ? (
              <ThemeAwareText color="$error600">
                {createMutation.error.message}
              </ThemeAwareText>
            ) : null}
          </VStack>
        </ThemeAwareCardSurface>
      </VStack>
    </ThemeAwareScreen>
  );
}

export default function NewRelationshipRuleScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { isAuthenticated, user } = useOAuth2Auth();
  const relationshipsQuery = useRelationshipsQuery(Boolean(user?.subject));
  const relationships = relationshipsQuery.data ?? [];
  const selectedRelationshipId = useAppSelector(selectedRelationshipIdSelector);
  const relationship = relationships.find(
    (candidate) => candidate.id === selectedRelationshipId,
  );
  const membersQuery = useRelationshipMembersQuery(
    relationship?.id,
    Boolean(user?.subject),
  );

  if (!isAuthenticated) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={{ title: t('rules.create') }} />
        <ThemeAwareText>{t('paymentRequests.signIn')}</ThemeAwareText>
      </ThemeAwareScreen>
    );
  }

  if (!user?.subject) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={{ title: t('rules.create') }} />
        <ThemeAwareText>{t('auth.signedIn')}</ThemeAwareText>
        <ThemeAwareText>{t('auth.profileUnavailable')}</ThemeAwareText>
      </ThemeAwareScreen>
    );
  }

  if (relationshipsQuery.isLoading) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={{ title: t('rules.create') }} />
        <ThemeAwareText>{t('common.loading')}</ThemeAwareText>
      </ThemeAwareScreen>
    );
  }

  if (relationshipsQuery.error) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={{ title: t('rules.create') }} />
        <ThemeAwareText>{relationshipsQuery.error.message}</ThemeAwareText>
      </ThemeAwareScreen>
    );
  }

  if (!relationship) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={{ title: t('rules.create') }} />
        <VStack space="md">
          <ThemeAwareText>{t('rules.noRelationship')}</ThemeAwareText>
          <ThemeAwareButton onPress={() => router.navigate(AppRoutePaths.home)}>
            {t('rules.openHome')}
          </ThemeAwareButton>
        </VStack>
      </ThemeAwareScreen>
    );
  }

  if (membersQuery.error) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={{ title: t('rules.create') }} />
        <ThemeAwareText>{membersQuery.error.message}</ThemeAwareText>
      </ThemeAwareScreen>
    );
  }

  return (
    <CreateRuleForm
      currentUserId={user.subject}
      members={membersQuery.data ?? relationship.members}
      relationship={relationship}
    />
  );
}
