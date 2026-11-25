import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

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
import { AppRoutePaths } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import { parseRelationshipRuleLabels } from '@/features/relationship-rules/form';
import {
  useRelationshipRuleQuery,
  useUpdateRelationshipRuleMutation,
} from '@/features/relationship-rules/hooks/useRelationshipRules';
import { useI18n } from '@/utils/i18n';

export default function EditRelationshipRuleScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { isAuthenticated, user } = useOAuth2Auth();
  const params = useLocalSearchParams<{
    id?: string | string[];
    detailNavigationId?: string | string[];
    detailNavigationSource?: string | string[];
  }>();
  const ruleId = Array.isArray(params.id) ? params.id[0] : params.id;
  const detailNavigationId = Array.isArray(params.detailNavigationId)
    ? params.detailNavigationId[0]
    : params.detailNavigationId;
  const detailNavigationSource = Array.isArray(params.detailNavigationSource)
    ? params.detailNavigationSource[0]
    : params.detailNavigationSource;
  const ruleQuery = useRelationshipRuleQuery(ruleId, Boolean(user?.subject));
  const rule = ruleQuery.data;
  const updateMutation = useUpdateRelationshipRuleMutation(
    rule?.relationshipId,
  );
  const [name, setName] = useState('');
  const [labelsText, setLabelsText] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!rule) return;
    setName(rule.name);
    setLabelsText(rule.labels.join(', '));
    setDescription(rule.description);
  }, [rule?.description, rule?.id, rule?.labels, rule?.name]);

  if (!isAuthenticated) {
    return (
      <>
        <Stack.Screen options={{ title: t('rules.edit') }} />
        <ThemeAwareScreen>
          <ThemeAwareText>{t('paymentRequests.signIn')}</ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  if (!user?.subject) {
    return (
      <>
        <Stack.Screen options={{ title: t('rules.edit') }} />
        <ThemeAwareScreen>
          <ThemeAwareText>{t('auth.signedIn')}</ThemeAwareText>
          <ThemeAwareText>{t('auth.profileUnavailable')}</ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  if (!ruleId) {
    return (
      <>
        <Stack.Screen options={{ title: t('rules.edit') }} />
        <ThemeAwareScreen>
          <ThemeAwareText>{t('rules.notFound')}</ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  if (ruleQuery.isLoading || !rule) {
    return (
      <>
        <Stack.Screen options={{ title: t('rules.edit') }} />
        <ThemeAwareScreen>
          <ThemeAwareText>
            {ruleQuery.error?.message ?? t('common.loading')}
          </ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  const canEdit =
    rule.createdByUserId === user.subject ||
    rule.approvals.some((approval) => approval.memberUserId === user.subject);
  if (!canEdit) {
    return (
      <>
        <Stack.Screen options={{ title: t('rules.edit') }} />
        <ThemeAwareScreen>
          <ThemeAwareText>{t('rules.editNotAuthorized')}</ThemeAwareText>
        </ThemeAwareScreen>
      </>
    );
  }

  const editableRule = rule;
  const labels = parseRelationshipRuleLabels(labelsText);
  const hasOverlongLabel = labels.some((label) => label.length > 80);
  const hasChanges =
    name.trim() !== editableRule.name ||
    labels.length !== editableRule.labels.length ||
    labels.some((label, index) => label !== editableRule.labels[index]) ||
    description.trim() !== editableRule.description;
  const canSave =
    name.trim().length > 0 &&
    description.trim().length > 0 &&
    !hasOverlongLabel &&
    hasChanges;
  const saveButton = (
    <ThemeAwareButton
      isDisabled={updateMutation.isPending || !canSave}
      onPress={() => saveRule().catch(() => undefined)}
    >
      {t('rules.saveChanges')}
    </ThemeAwareButton>
  );

  async function saveRule() {
    await updateMutation.mutateAsync({
      ruleId: editableRule.id,
      input: {
        name: name.trim(),
        labels,
        description: description.trim(),
      },
    });
    router.dismissTo({
      pathname: AppRoutePaths.relationshipRuleDetails,
      params: {
        id: editableRule.id,
        ...(detailNavigationSource ? { detailNavigationSource } : {}),
        ...(detailNavigationId ? { detailNavigationId } : {}),
      },
    });
  }

  return (
    <>
      <Stack.Screen options={{ title: t('rules.edit') }} />
      <ThemeAwareScreen bottomContent={saveButton}>
        <ThemeAwareCardSurface
          backgroundImage={CARD_ARTWORK.planning}
          borderRadius="$sm"
          p="$4"
        >
          <VStack space="md">
            <VStack space="xs">
              <ThemeAwareHeading>{t('rules.edit')}</ThemeAwareHeading>
              <ThemeAwareText>{t('rules.editDescription')}</ThemeAwareText>
              <ThemeAwareText>{t('rules.reapprovalNotice')}</ThemeAwareText>
            </VStack>
            <VStack space="xs">
              <ThemeAwareText fontWeight="$semibold">
                {t('rules.name')}
              </ThemeAwareText>
              <ThemeAwareInput
                value={name}
                onChangeText={setName}
                inputFieldProps={{
                  maxLength: 160,
                  placeholder: t('rules.namePlaceholder'),
                }}
              />
            </VStack>
            <VStack space="xs">
              <ThemeAwareText fontWeight="$semibold">
                {t('rules.labels')}
              </ThemeAwareText>
              <ThemeAwareInput
                value={labelsText}
                onChangeText={setLabelsText}
                inputFieldProps={{
                  placeholder: t('rules.labelsPlaceholder'),
                }}
              />
              {hasOverlongLabel ? (
                <ThemeAwareText color="$error600" size="sm">
                  {t('rules.labelsTooLong')}
                </ThemeAwareText>
              ) : null}
            </VStack>
            <VStack space="xs">
              <ThemeAwareText fontWeight="$semibold">
                {t('rules.description')}
              </ThemeAwareText>
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
            </VStack>
            {updateMutation.error ? (
              <ThemeAwareText color="$error600">
                {updateMutation.error.message}
              </ThemeAwareText>
            ) : null}
          </VStack>
        </ThemeAwareCardSurface>
      </ThemeAwareScreen>
    </>
  );
}
