import type {
  RelationshipMember,
  RubricAnswer,
  RubricQuestion,
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
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { CARD_ARTWORK } from '@/constants/cardArtwork';
import { AppRoutePaths, DetailNavigationSources } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import { getDisplayNameFromClaims } from '@/features/auth/client';
import {
  getSelectedMemberNames,
  hasRubricAnswer,
  parseAmountToMinorUnits,
  withJointAccountPercentage,
} from '@/features/payment-requests/form';
import {
  useCreatePaymentRequestMutation,
  useCreateRelationshipMutation,
  useRelationshipMembersQuery,
  useRelationshipRubricQuery,
  useRelationshipsQuery,
  useSubmitPaymentRequestMutation,
} from '@/features/payment-requests/hooks/usePaymentRequests';
import { RelationshipMemberSelector } from '@/features/relationships/components/RelationshipMemberSelector';
import { selectedRelationshipIdSelector } from '@/state/slices/generalSlice';
import { useAppSelector } from '@/state/store';
import { useI18n, type TranslationKey } from '@/utils/i18n';
import { parseCommaSeparatedValues } from '@/utils/parseCommaSeparatedValues';

function optionLabel(option: string, t: (key: TranslationKey) => string) {
  switch (option) {
    case 'both':
      return t('paymentRequests.benefitsBoth');
    case 'creator':
      return t('paymentRequests.benefitsCreator');
    case 'other_members':
      return t('paymentRequests.benefitsOther');
    default:
      return option;
  }
}

function questionLabel(
  question: RubricQuestion,
  t: (key: TranslationKey) => string,
) {
  switch (question.id) {
    case 'necessary':
      return t('paymentRequests.necessary');
    case 'beneficiary':
      return t('paymentRequests.beneficiary');
    default:
      return question.label;
  }
}

function FormField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <VStack space="xs">
      <HStack space="xs" className="items-center">
        <ThemeAwareText fontWeight="$semibold">{label}</ThemeAwareText>
        {required ? (
          <ThemeAwareText
            accessible
            accessibilityLabel={t('paymentRequests.required')}
            color="$error600"
            size="sm"
          >
            *
          </ThemeAwareText>
        ) : null}
      </HStack>
      {children}
    </VStack>
  );
}

function RubricQuestionInput({
  question,
  value,
  members,
  onChange,
}: {
  question: RubricQuestion;
  value: RubricAnswer | undefined;
  members: RelationshipMember[];
  onChange: (value: RubricAnswer | undefined) => void;
}) {
  const { t } = useI18n();
  const label = questionLabel(question, t);

  if (question.answerType === 'boolean') {
    return (
      <VStack space="sm">
        <ThemeAwareText fontWeight="$semibold">{label}</ThemeAwareText>
        <HStack space="sm">
          <ThemeAwareButton
            variant={value === true ? 'solid' : 'outline'}
            onPress={() => onChange(true)}
          >
            {t('paymentRequests.yes')}
          </ThemeAwareButton>
          <ThemeAwareButton
            variant={value === false ? 'solid' : 'outline'}
            onPress={() => onChange(false)}
          >
            {t('paymentRequests.no')}
          </ThemeAwareButton>
        </HStack>
      </VStack>
    );
  }

  if (question.id === 'beneficiary') {
    const selectedMemberIds = Array.isArray(value) ? value : [];

    return (
      <RelationshipMemberSelector
        hint={t('paymentRequests.benefitSelectionHint')}
        label={label}
        members={members}
        onChange={(nextSelection) =>
          onChange(nextSelection.length ? nextSelection : undefined)
        }
        selectedUserIds={selectedMemberIds}
      />
    );
  }

  if (question.answerType === 'single_choice') {
    return (
      <VStack space="sm">
        <ThemeAwareText fontWeight="$semibold">{label}</ThemeAwareText>
        <VStack space="xs">
          {(question.options ?? []).map((option) => (
            <ThemeAwareButton
              key={option}
              variant={value === option ? 'solid' : 'outline'}
              onPress={() => onChange(option)}
            >
              {optionLabel(option, t)}
            </ThemeAwareButton>
          ))}
        </VStack>
      </VStack>
    );
  }

  return (
    <VStack space="sm">
      <ThemeAwareText fontWeight="$semibold">{label}</ThemeAwareText>
      <ThemeAwareInput
        value={
          typeof value === 'string' || typeof value === 'number'
            ? String(value)
            : ''
        }
        inputType={question.answerType === 'number' ? 'number' : 'text'}
        onChangeText={(nextValue) =>
          onChange(
            nextValue.trim() === ''
              ? undefined
              : question.answerType === 'number'
                ? Number(nextValue)
                : nextValue,
          )
        }
        inputFieldProps={{ placeholder: label }}
      />
    </VStack>
  );
}

function RelationshipSetup({ displayName }: { displayName?: string }) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const mutation = useCreateRelationshipMutation();

  const submitButton = (
    <ThemeAwareButton
      isDisabled={mutation.isPending || name.trim().length === 0}
      onPress={() => mutation.mutate({ name, displayName })}
    >
      {t('paymentRequests.save')}
    </ThemeAwareButton>
  );

  const formContent = (
    <ThemeAwareCardSurface
      backgroundImage={CARD_ARTWORK.relationships}
      borderRadius="$sm"
      p="$4"
    >
      <VStack space="md">
        <ThemeAwareHeading>
          {t('paymentRequests.createRelationship')}
        </ThemeAwareHeading>
        <ThemeAwareText>{t('paymentRequests.noRelationship')}</ThemeAwareText>
        <ThemeAwareInput
          value={name}
          onChangeText={setName}
          inputFieldProps={{
            placeholder: t('paymentRequests.relationshipName'),
          }}
        />
        {mutation.error ? (
          <ThemeAwareText>{mutation.error.message}</ThemeAwareText>
        ) : null}
      </VStack>
    </ThemeAwareCardSurface>
  );

  return (
    <ThemeAwareScreen bottomContent={submitButton}>
      {formContent}
    </ThemeAwareScreen>
  );
}

function CreateRequestForm({
  relationshipId,
  relationshipName,
  members,
  currentUserId,
  onCreated,
}: {
  relationshipId: string;
  relationshipName: string;
  members: RelationshipMember[];
  currentUserId: string;
  onCreated: (requestId: string) => void;
}) {
  const { t } = useI18n();
  const rubricQuery = useRelationshipRubricQuery(relationshipId);
  const createMutation = useCreatePaymentRequestMutation(relationshipId);
  const submitMutation = useSubmitPaymentRequestMutation(relationshipId);
  const [title, setTitle] = useState('');
  const [rationale, setRationale] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [categoriesText, setCategoriesText] = useState('');
  const [jointAccountPercentage, setJointAccountPercentage] = useState('50');
  const [answers, setAnswers] = useState<Record<string, RubricAnswer>>({});
  const [draftRequestId, setDraftRequestId] = useState<string>();
  const memberUserIds = members.map((member) => member.userId);
  const otherMemberId = memberUserIds.find((id) => id !== currentUserId);
  const isPending = createMutation.isPending || submitMutation.isPending;
  const amountMinorUnits = parseAmountToMinorUnits(amount);
  const categories = parseCommaSeparatedValues(categoriesText);
  const hasOverlongCategory = categories.some(
    (category) => category.length > 80,
  );
  const isCurrencyValid = /^[A-Za-z]{3}$/.test(currency.trim());
  const jointAccountShare = Number(jointAccountPercentage);
  const isJointAccountShareValid =
    jointAccountPercentage.trim().length > 0 &&
    Number.isFinite(jointAccountShare) &&
    jointAccountShare >= 0 &&
    jointAccountShare <= 100;
  const questions = (rubricQuery.data?.questions ?? []).filter(
    (question) => question.id !== 'benefit_level',
  );
  const hasAllRequiredAnswers = questions
    .filter((question) => question.required)
    .every((question) => hasRubricAnswer(answers[question.id]));

  async function submit() {
    if (!otherMemberId || hasOverlongCategory) return;
    const rubric = rubricQuery.data;
    if (!rubric) return;
    if (
      amountMinorUnits === undefined ||
      !isCurrencyValid ||
      !isJointAccountShareValid
    ) {
      return;
    }
    const submissionAnswers: Record<string, RubricAnswer> = { ...answers };
    if (Array.isArray(submissionAnswers.beneficiary)) {
      submissionAnswers.beneficiary = getSelectedMemberNames(
        submissionAnswers.beneficiary,
        members,
      );
    }
    const createdRequestId =
      draftRequestId ??
      (
        await createMutation.mutateAsync({
          title: title.trim(),
          rationale: rationale.trim(),
          amountMinorUnits,
          currency: currency.trim().toUpperCase(),
          purchaseDate: new Date().toISOString(),
          categories: categories.length > 0 ? categories : undefined,
          requestedSplit: withJointAccountPercentage(
            [],
            currentUserId,
            jointAccountShare,
            [otherMemberId],
          ),
        })
      ).id;
    if (!draftRequestId) {
      setDraftRequestId(createdRequestId);
    }
    const submitted = await submitMutation.mutateAsync({
      paymentRequestId: createdRequestId,
      input: {
        evaluation: {
          rubricVersionId: rubric.id,
          answers: submissionAnswers,
        },
      },
    });
    onCreated(submitted.id);
  }

  const submitButton = (
    <ThemeAwareButton
      isDisabled={
        isPending ||
        !title.trim() ||
        !rationale.trim() ||
        amountMinorUnits === undefined ||
        !isCurrencyValid ||
        !isJointAccountShareValid ||
        hasOverlongCategory ||
        !otherMemberId ||
        !rubricQuery.data ||
        rubricQuery.isLoading ||
        Boolean(rubricQuery.error) ||
        !hasAllRequiredAnswers
      }
      onPress={() => submit().catch(() => undefined)}
    >
      {t('paymentRequests.submit')}
    </ThemeAwareButton>
  );

  const formContent = (
    <ThemeAwareCardSurface
      backgroundImage={CARD_ARTWORK.budgeting}
      borderRadius="$sm"
      p="$4"
    >
      <VStack space="md">
        <ThemeAwareHeading>
          {t('paymentRequests.createRequest')}
        </ThemeAwareHeading>
        {!otherMemberId ? (
          <ThemeAwareText>{t('paymentRequests.setupMember')}</ThemeAwareText>
        ) : null}
        <FormField label={t('paymentRequests.requestTitle')} required>
          <ThemeAwareInput
            value={title}
            onChangeText={setTitle}
            inputFieldProps={{ maxLength: 160 }}
          />
        </FormField>
        <FormField label={t('paymentRequests.rationale')} required>
          <ThemeAwareInput
            value={rationale}
            onChangeText={setRationale}
            inputFieldProps={{
              multiline: true,
              textAlignVertical: 'top',
              maxLength: 4000,
              height: 112,
            }}
            inputProps={{ height: 120 }}
          />
        </FormField>
        <HStack space="sm" className="items-start">
          <VStack space="xs" className="flex-1">
            <FormField label={t('paymentRequests.amountMinorUnits')} required>
              <ThemeAwareInput
                value={amount}
                onChangeText={setAmount}
                inputFieldProps={{
                  keyboardType: 'decimal-pad',
                  placeholder: t('paymentRequests.amountPlaceholder'),
                }}
              />
            </FormField>
            {amount.length > 0 && amountMinorUnits === undefined ? (
              <ThemeAwareText size="xs" color="$error600">
                {t('paymentRequests.amountInvalid')}
              </ThemeAwareText>
            ) : null}
          </VStack>
          <VStack space="xs" className="flex-1">
            <FormField label={t('paymentRequests.currency')} required>
              <ThemeAwareInput
                value={currency}
                onChangeText={setCurrency}
                inputFieldProps={{
                  autoCapitalize: 'characters',
                  maxLength: 3,
                }}
              />
            </FormField>
            {!isCurrencyValid ? (
              <ThemeAwareText size="xs" color="$error600">
                {t('paymentRequests.currencyInvalid')}
              </ThemeAwareText>
            ) : null}
          </VStack>
        </HStack>
        <FormField label={t('paymentRequests.categories')}>
          <ThemeAwareInput
            value={categoriesText}
            onChangeText={setCategoriesText}
            inputFieldProps={{
              placeholder: t('paymentRequests.categoriesPlaceholder'),
            }}
          />
        </FormField>
        {hasOverlongCategory ? (
          <ThemeAwareText size="xs" color="$error600">
            {t('paymentRequests.categoriesTooLong')}
          </ThemeAwareText>
        ) : null}
        <FormField label={t('paymentRequests.jointAccountPercentage')} required>
          <ThemeAwareInput
            value={jointAccountPercentage}
            onChangeText={setJointAccountPercentage}
            inputFieldProps={{ keyboardType: 'decimal-pad' }}
          />
        </FormField>
        {!isJointAccountShareValid ? (
          <ThemeAwareText size="xs" color="$error600">
            {t('paymentRequests.splitInvalid')}
          </ThemeAwareText>
        ) : null}
        <VStack space="sm">
          <ThemeAwareHeading>{t('paymentRequests.rubric')}</ThemeAwareHeading>
          {rubricQuery.isLoading ? (
            <ThemeAwareText>
              {t('paymentRequests.rubricLoading')}
            </ThemeAwareText>
          ) : rubricQuery.error ? (
            <VStack space="sm">
              <ThemeAwareText>
                {t('paymentRequests.rubricError')}
              </ThemeAwareText>
              <ThemeAwareButton
                variant="outline"
                isDisabled={rubricQuery.isFetching}
                onPress={() => rubricQuery.refetch()}
              >
                {t('paymentRequests.retry')}
              </ThemeAwareButton>
            </VStack>
          ) : (
            <>
              {questions.map((question) => (
                <RubricQuestionInput
                  key={question.id}
                  question={question}
                  value={answers[question.id]}
                  members={members}
                  onChange={(value) =>
                    setAnswers((current) => {
                      const next = { ...current };
                      if (value === undefined) {
                        delete next[question.id];
                      } else {
                        next[question.id] = value;
                      }
                      return next;
                    })
                  }
                />
              ))}
              {!hasAllRequiredAnswers ? (
                <ThemeAwareText size="xs" opacity={0.75}>
                  {t('paymentRequests.requiredAnswers')}
                </ThemeAwareText>
              ) : null}
            </>
          )}
        </VStack>
        {createMutation.error || submitMutation.error ? (
          <ThemeAwareText color="$error600">
            {(createMutation.error ?? submitMutation.error)?.message}
          </ThemeAwareText>
        ) : null}
      </VStack>
    </ThemeAwareCardSurface>
  );

  return (
    <ThemeAwareScreen bottomContent={submitButton}>
      <Stack.Screen options={{ title: t('paymentRequests.createRequest') }} />
      <VStack space="md">{formContent}</VStack>
    </ThemeAwareScreen>
  );
}

export default function NewPaymentRequestScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { isAuthenticated, user } = useOAuth2Auth();
  const displayName = getDisplayNameFromClaims(user?.claims ?? {});
  const relationshipsQuery = useRelationshipsQuery(Boolean(user?.subject));
  const relationships = relationshipsQuery.data ?? [];
  const selectedRelationshipId = useAppSelector(selectedRelationshipIdSelector);
  const relationship = relationships.find(
    (candidate) => candidate.id === selectedRelationshipId,
  );
  const membersQuery = useRelationshipMembersQuery(relationship?.id);
  const members = membersQuery.data ?? relationship?.members ?? [];

  if (!isAuthenticated) {
    return (
      <ThemeAwareScreen>
        <ThemeAwareText>{t('paymentRequests.signIn')}</ThemeAwareText>
      </ThemeAwareScreen>
    );
  }

  if (!user?.subject) {
    return (
      <ThemeAwareScreen>
        <ThemeAwareText>{t('auth.signedIn')}</ThemeAwareText>
        <ThemeAwareText>{t('auth.profileUnavailable')}</ThemeAwareText>
      </ThemeAwareScreen>
    );
  }

  if (
    relationshipsQuery.isLoading ||
    (relationships.length > 0 && !relationship)
  ) {
    return (
      <ThemeAwareScreen>
        <ThemeAwareText>{t('common.loading')}</ThemeAwareText>
      </ThemeAwareScreen>
    );
  }

  if (relationshipsQuery.error) {
    return (
      <ThemeAwareScreen>
        <ThemeAwareText>{t('paymentRequests.error')}</ThemeAwareText>
      </ThemeAwareScreen>
    );
  }

  if (!relationship) {
    return <RelationshipSetup displayName={displayName} />;
  }

  return (
    <CreateRequestForm
      relationshipId={relationship.id}
      relationshipName={relationship.name}
      members={members}
      currentUserId={user.subject}
      onCreated={(requestId) => {
        router.dismissTo(AppRoutePaths.viewAllRequests);
        router.navigate({
          pathname: AppRoutePaths.paymentRequestDetails,
          params: {
            id: requestId,
            detailNavigationSource: DetailNavigationSources.paymentRequests,
          },
        });
      }}
    />
  );
}
