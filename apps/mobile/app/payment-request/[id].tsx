import type { ActivityEventType } from '@expo-50sdk-template/shared-types';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { DetailSwipeNavigator } from '@/components/ui/DetailSwipeNavigator';
import { EntityDeleteButton } from '@/components/ui/EntityDeleteButton';
import { ThemeAwareBadge } from '@/components/ui/ThemeAwareBadge';
import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareCardSurface } from '@/components/ui/ThemeAwareCardSurface';
import { ThemeAwareInput } from '@/components/ui/ThemeAwareInput';
import { ThemeAwareLoadingIndicator } from '@/components/ui/ThemeAwareLoadingIndicator';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import { ThemeAwareSkeleton } from '@/components/ui/ThemeAwareSkeleton';
import {
  ThemeAwareHeading,
  ThemeAwareText,
} from '@/components/ui/ThemeAwareText';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { CARD_ARTWORK } from '@/constants/cardArtwork';
import { AppRoutePaths, DetailNavigationSources } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import {
  getJointAccountPercentage,
  getMemberDisplayName,
  parseAmountToMinorUnits,
  withJointAccountPercentage,
} from '@/features/payment-requests/form';
import {
  useCancelPaymentRequestMutation,
  useDeletePaymentRequestMutation,
  useDecidePaymentRequestMutation,
  usePaymentRequestQuery,
  useRelationshipMembersQuery,
  useUpdatePaymentRequestMutation,
} from '@/features/payment-requests/hooks/usePaymentRequests';
import { useI18n, type TranslationKey } from '@/utils/i18n';
import { parseCommaSeparatedValues } from '@/utils/parseCommaSeparatedValues';

const activityLabels: Record<ActivityEventType, TranslationKey> = {
  created: 'paymentRequests.activityCreated',
  edited: 'paymentRequests.edited',
  submitted: 'paymentRequests.activitySubmitted',
  approved: 'paymentRequests.approved',
  rejected: 'paymentRequests.rejected',
  changes_requested: 'paymentRequests.changesRequested',
  cancelled: 'paymentRequests.cancelled',
};

function activityLabel(
  eventType: ActivityEventType,
  t: ReturnType<typeof useI18n>['t'],
) {
  const key = Object.prototype.hasOwnProperty.call(activityLabels, eventType)
    ? activityLabels[eventType]
    : undefined;
  return key ? t(key) : eventType;
}

function statusLabel(status: string): TranslationKey {
  switch (status) {
    case 'approved':
      return 'paymentRequests.approved';
    case 'rejected':
      return 'paymentRequests.rejected';
    case 'cancelled':
      return 'paymentRequests.cancelled';
    case 'draft':
      return 'paymentRequests.draft';
    default:
      return 'paymentRequests.submitted';
  }
}

function DetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <VStack space="xs">
      <ThemeAwareText fontWeight="$semibold" opacity={0.75} size="sm">
        {label}
      </ThemeAwareText>
      {children}
    </VStack>
  );
}

export default function PaymentRequestDetailsScreen() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const { isAuthenticated, user } = useOAuth2Auth();
  const params = useLocalSearchParams<{
    id?: string | string[];
    detailNavigationId?: string | string[];
    detailNavigationSource?: string | string[];
  }>();
  const paymentRequestId = Array.isArray(params.id) ? params.id[0] : params.id;
  const detailNavigationId = Array.isArray(params.detailNavigationId)
    ? params.detailNavigationId[0]
    : params.detailNavigationId;
  const detailNavigationSource = Array.isArray(params.detailNavigationSource)
    ? params.detailNavigationSource[0]
    : params.detailNavigationSource;
  const returnToRequests =
    detailNavigationSource === DetailNavigationSources.awaitingDecision
      ? AppRoutePaths.awaitingDecision
      : AppRoutePaths.viewAllRequests;
  const requestQuery = usePaymentRequestQuery(
    paymentRequestId,
    Boolean(user?.subject),
  );
  const relationshipId = requestQuery.data?.relationshipId;
  const membersQuery = useRelationshipMembersQuery(
    relationshipId,
    Boolean(user?.subject),
  );
  const decideMutation = useDecidePaymentRequestMutation(relationshipId);
  const cancelMutation = useCancelPaymentRequestMutation(relationshipId);
  const deleteMutation = useDeletePaymentRequestMutation(relationshipId);
  const updateMutation = useUpdatePaymentRequestMutation(relationshipId);
  const [comment, setComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [rationale, setRationale] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('');
  const [categoriesText, setCategoriesText] = useState('');
  const [jointAccountPercentage, setJointAccountPercentage] = useState('');
  const [necessary, setNecessary] = useState<boolean>();
  const currentRequest = requestQuery.data;

  useEffect(() => {
    if (!currentRequest) return;
    setTitle(currentRequest.title);
    setRationale(currentRequest.rationale);
    setAmount((currentRequest.amountMinorUnits / 100).toFixed(2));
    setCurrency(currentRequest.currency);
    setCategoriesText(currentRequest.categories.join(', '));
    setJointAccountPercentage(
      String(
        getJointAccountPercentage(
          currentRequest.requestedSplit,
          currentRequest.createdByUserId,
        ),
      ),
    );
    const necessaryAnswer = currentRequest.evaluation?.answers.necessary;
    setNecessary(
      typeof necessaryAnswer === 'boolean' ? necessaryAnswer : undefined,
    );
  }, [
    currentRequest?.amountMinorUnits,
    currentRequest?.categories,
    currentRequest?.currency,
    currentRequest?.createdByUserId,
    currentRequest?.evaluation?.answers,
    currentRequest?.id,
    currentRequest?.rationale,
    currentRequest?.requestedSplit,
    currentRequest?.title,
  ]);
  const backToRequestsButton = (
    <ThemeAwareButton
      flex={1}
      onPress={() => router.dismissTo(returnToRequests)}
    >
      {t('paymentRequests.viewAllRequests')}
    </ThemeAwareButton>
  );

  if (!isAuthenticated) {
    return (
      <ThemeAwareScreen bottomContent={backToRequestsButton}>
        <ThemeAwareText>{t('paymentRequests.signIn')}</ThemeAwareText>
      </ThemeAwareScreen>
    );
  }

  if (!user?.subject) {
    return (
      <ThemeAwareScreen bottomContent={backToRequestsButton}>
        <ThemeAwareText>{t('auth.signedIn')}</ThemeAwareText>
        <ThemeAwareText>{t('auth.profileUnavailable')}</ThemeAwareText>
      </ThemeAwareScreen>
    );
  }

  if (requestQuery.isLoading || !requestQuery.data) {
    return (
      <ThemeAwareScreen bottomContent={backToRequestsButton}>
        {!requestQuery.error ? <ThemeAwareLoadingIndicator /> : null}
        <ThemeAwareText>
          {requestQuery.error?.message ?? t('common.loading')}
        </ThemeAwareText>
      </ThemeAwareScreen>
    );
  }

  const request = requestQuery.data;
  const currentDecision = request.decisions.find(
    (decision) => decision.memberUserId === user.subject,
  );
  const isCreator = request.createdByUserId === user.subject;
  const canEdit =
    request.status === 'pending_approval' ||
    (request.status === 'draft' && isCreator);
  const canDecide = request.status === 'pending_approval' && !currentDecision;
  const canCancel =
    (request.status === 'draft' || request.status === 'pending_approval') &&
    isCreator;
  const canDelete = isCreator;
  const amountMinorUnits = parseAmountToMinorUnits(amount);
  const isCurrencyValid = /^[A-Za-z]{3}$/.test(currency.trim());
  const categories = parseCommaSeparatedValues(categoriesText);
  const hasOverlongCategory = categories.some(
    (category) => category.length > 80,
  );
  const jointAccountShare = Number(jointAccountPercentage);
  const isJointAccountShareValid =
    jointAccountPercentage.trim().length > 0 &&
    Number.isFinite(jointAccountShare) &&
    jointAccountShare >= 0 &&
    jointAccountShare <= 100;
  const hasOtherMembers =
    request.requestedSplit.some(
      (allocation) => allocation.memberUserId !== request.createdByUserId,
    ) ||
    (membersQuery.data ?? []).some(
      (member) => member.userId !== request.createdByUserId,
    );
  const canRepresentJointAccountShare =
    hasOtherMembers ||
    jointAccountShare ===
      getJointAccountPercentage(
        request.requestedSplit,
        request.createdByUserId,
      );
  const canSave =
    canEdit &&
    title.trim().length > 0 &&
    rationale.trim().length > 0 &&
    amountMinorUnits !== undefined &&
    isCurrencyValid &&
    !hasOverlongCategory &&
    isJointAccountShareValid &&
    canRepresentJointAccountShare &&
    (request.status !== 'pending_approval' || typeof necessary === 'boolean') &&
    !updateMutation.isPending;
  const lastEditedEvent = request.activity
    .filter((event) => event.eventType === 'edited')
    .sort(
      (left, right) =>
        new Date(left.createdAt).getTime() -
        new Date(right.createdAt).getTime(),
    )
    .pop();

  function startEditing() {
    updateMutation.reset();
    setTitle(request.title);
    setRationale(request.rationale);
    setAmount((request.amountMinorUnits / 100).toFixed(2));
    setCurrency(request.currency);
    setCategoriesText(request.categories.join(', '));
    setJointAccountPercentage(
      String(
        getJointAccountPercentage(
          request.requestedSplit,
          request.createdByUserId,
        ),
      ),
    );
    const necessaryAnswer = request.evaluation?.answers.necessary;
    setNecessary(
      typeof necessaryAnswer === 'boolean' ? necessaryAnswer : undefined,
    );
    setIsEditing(true);
  }

  function saveChanges() {
    if (
      amountMinorUnits === undefined ||
      !isJointAccountShareValid ||
      !canRepresentJointAccountShare ||
      (request.status === 'pending_approval' && typeof necessary !== 'boolean')
    ) {
      return;
    }
    const evaluation =
      typeof necessary === 'boolean'
        ? {
            ...(request.evaluation ?? {}),
            answers: {
              ...(request.evaluation?.answers ?? {}),
              necessary,
            },
          }
        : undefined;
    updateMutation.mutate(
      {
        paymentRequestId: request.id,
        input: {
          title: title.trim(),
          rationale: rationale.trim(),
          amountMinorUnits,
          currency: currency.trim().toUpperCase(),
          purchaseDate: request.purchaseDate,
          categories,
          requestedSplit: withJointAccountPercentage(
            request.requestedSplit,
            request.createdByUserId,
            jointAccountShare,
            (membersQuery.data ?? []).map((member) => member.userId),
          ),
          ...(evaluation ? { evaluation } : {}),
        },
      },
      { onSuccess: () => setIsEditing(false) },
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: t('paymentRequests.requestDetails') }} />
      <ThemeAwareScreen
        fixedHeaderContent={
          <ThemeAwareHeading>
            {isEditing && title.trim() ? title : request.title}
          </ThemeAwareHeading>
        }
        bottomContent={
          <VStack space="sm">
            {isEditing ? (
              <>
                {updateMutation.error ? (
                  <ThemeAwareText color="$error600">
                    {updateMutation.error.message}
                  </ThemeAwareText>
                ) : null}
                <HStack space="sm">
                  <ThemeAwareButton
                    flex={1}
                    isDisabled={updateMutation.isPending}
                    onPress={() => {
                      setIsEditing(false);
                      updateMutation.reset();
                    }}
                  >
                    {t('paymentRequests.discardChanges')}
                  </ThemeAwareButton>
                  <ThemeAwareButton
                    flex={1}
                    isDisabled={!canSave}
                    onPress={saveChanges}
                  >
                    {t('paymentRequests.saveChanges')}
                  </ThemeAwareButton>
                </HStack>
                {backToRequestsButton}
              </>
            ) : (
              <>
                {decideMutation.isPending ? (
                  <ThemeAwareText>
                    {t('paymentRequests.decisionPending')}
                  </ThemeAwareText>
                ) : null}
                {cancelMutation.isPending ? (
                  <ThemeAwareText>
                    {t('paymentRequests.cancellationPending')}
                  </ThemeAwareText>
                ) : null}
                {canEdit ? (
                  <ThemeAwareButton variant="outline" onPress={startEditing}>
                    {t('paymentRequests.editRequest')}
                  </ThemeAwareButton>
                ) : null}
                {canDecide ? (
                  <>
                    <ThemeAwareInput
                      value={comment}
                      onChangeText={setComment}
                      inputFieldProps={{
                        placeholder: t('paymentRequests.comment'),
                        multiline: true,
                      }}
                    />
                    <HStack space="sm" className="flex-1">
                      <ThemeAwareButton
                        flex={1}
                        isDisabled={decideMutation.isPending}
                        onPress={() =>
                          decideMutation.mutate({
                            paymentRequestId: request.id,
                            input: {
                              decision: 'approved',
                              comment: comment || undefined,
                            },
                          })
                        }
                      >
                        {t('paymentRequests.approve')}
                      </ThemeAwareButton>
                      <ThemeAwareButton
                        darkBackground="$error700"
                        flex={1}
                        isDisabled={decideMutation.isPending}
                        lightBackground="$error600"
                        onPress={() =>
                          decideMutation.mutate({
                            paymentRequestId: request.id,
                            input: {
                              decision: 'rejected',
                              comment: comment || undefined,
                            },
                          })
                        }
                      >
                        {t('paymentRequests.reject')}
                      </ThemeAwareButton>
                    </HStack>
                  </>
                ) : null}
                {canCancel ? (
                  <HStack space="sm" className="flex-1">
                    <ThemeAwareButton
                      flex={1}
                      isDisabled={cancelMutation.isPending}
                      onPress={() => cancelMutation.mutate(request.id)}
                      darkBackground="$error700"
                      lightBackground="$error600"
                    >
                      {t('paymentRequests.cancel')}
                    </ThemeAwareButton>
                    {canDelete ? (
                      <EntityDeleteButton
                        disabled={deleteMutation.isPending}
                        flex={1}
                        onDelete={() =>
                          deleteMutation.mutate(request.id, {
                            onSuccess: () => router.dismissTo(returnToRequests),
                          })
                        }
                      />
                    ) : null}
                  </HStack>
                ) : null}
                <HStack space="sm" className="flex-1">
                  {backToRequestsButton}
                  {!canCancel && canDelete ? (
                    <EntityDeleteButton
                      disabled={deleteMutation.isPending}
                      flex={1}
                      onDelete={() =>
                        deleteMutation.mutate(request.id, {
                          onSuccess: () => router.dismissTo(returnToRequests),
                        })
                      }
                    />
                  ) : null}
                </HStack>
              </>
            )}
          </VStack>
        }
      >
        <DetailSwipeNavigator
          itemId={detailNavigationId ?? request.id}
          source={detailNavigationSource}
        >
          <VStack space="md">
            {isEditing ? (
              <ThemeAwareCardSurface
                backgroundImage={CARD_ARTWORK.budgeting}
                borderRadius="$sm"
                p="$4"
              >
                <VStack space="md">
                  <DetailField label={t('paymentRequests.requestTitle')}>
                    <ThemeAwareInput
                      value={title}
                      onChangeText={setTitle}
                      inputFieldProps={{ maxLength: 160 }}
                    />
                  </DetailField>
                  <DetailField label={t('paymentRequests.rationale')}>
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
                  </DetailField>
                  <HStack space="sm" className="items-start">
                    <VStack space="xs" className="flex-1">
                      <DetailField
                        label={t('paymentRequests.amountMinorUnits')}
                      >
                        <ThemeAwareInput
                          value={amount}
                          onChangeText={setAmount}
                          inputFieldProps={{
                            keyboardType: 'decimal-pad',
                            placeholder: t('paymentRequests.amountPlaceholder'),
                          }}
                        />
                      </DetailField>
                      {amount.length > 0 && amountMinorUnits === undefined ? (
                        <ThemeAwareText size="xs" color="$error600">
                          {t('paymentRequests.amountInvalid')}
                        </ThemeAwareText>
                      ) : null}
                    </VStack>
                    <VStack space="xs" className="flex-1">
                      <DetailField label={t('paymentRequests.currency')}>
                        <ThemeAwareInput
                          value={currency}
                          onChangeText={setCurrency}
                          inputFieldProps={{
                            autoCapitalize: 'characters',
                            maxLength: 3,
                          }}
                        />
                      </DetailField>
                      {!isCurrencyValid ? (
                        <ThemeAwareText size="xs" color="$error600">
                          {t('paymentRequests.currencyInvalid')}
                        </ThemeAwareText>
                      ) : null}
                    </VStack>
                  </HStack>
                  <DetailField label={t('paymentRequests.categories')}>
                    <ThemeAwareInput
                      value={categoriesText}
                      onChangeText={setCategoriesText}
                      inputFieldProps={{
                        placeholder: t('paymentRequests.categoriesPlaceholder'),
                      }}
                    />
                  </DetailField>
                  {hasOverlongCategory ? (
                    <ThemeAwareText size="xs" color="$error600">
                      {t('paymentRequests.categoriesTooLong')}
                    </ThemeAwareText>
                  ) : null}
                  <DetailField
                    label={t('paymentRequests.jointAccountPercentage')}
                  >
                    <ThemeAwareInput
                      value={jointAccountPercentage}
                      onChangeText={setJointAccountPercentage}
                      inputFieldProps={{ keyboardType: 'decimal-pad' }}
                    />
                  </DetailField>
                  {!isJointAccountShareValid ||
                  !canRepresentJointAccountShare ? (
                    <ThemeAwareText size="xs" color="$error600">
                      {t('paymentRequests.splitInvalid')}
                    </ThemeAwareText>
                  ) : null}
                  <DetailField label={t('paymentRequests.necessary')}>
                    <HStack space="sm">
                      <ThemeAwareButton
                        variant={necessary === true ? 'solid' : 'outline'}
                        onPress={() => setNecessary(true)}
                      >
                        {t('paymentRequests.yes')}
                      </ThemeAwareButton>
                      <ThemeAwareButton
                        variant={necessary === false ? 'solid' : 'outline'}
                        onPress={() => setNecessary(false)}
                      >
                        {t('paymentRequests.no')}
                      </ThemeAwareButton>
                    </HStack>
                  </DetailField>
                </VStack>
              </ThemeAwareCardSurface>
            ) : (
              <ThemeAwareCardSurface
                backgroundImage={CARD_ARTWORK.budgeting}
                borderRadius="$sm"
                p="$4"
              >
                <VStack space="md">
                  <HStack space="md" className="items-start justify-between">
                    <VStack space="xs" className="flex-1">
                      <ThemeAwareText
                        fontWeight="$semibold"
                        opacity={0.75}
                        size="sm"
                      >
                        {t('paymentRequests.amountMinorUnits')}
                      </ThemeAwareText>
                      <ThemeAwareText fontWeight="$bold" size="lg">
                        {`${(request.amountMinorUnits / 100).toFixed(2)} ${request.currency}`}
                      </ThemeAwareText>
                    </VStack>
                    <VStack space="xs" className="items-end">
                      <ThemeAwareText
                        fontWeight="$semibold"
                        opacity={0.75}
                        size="sm"
                      >
                        {t('paymentRequests.statusLabel')}
                      </ThemeAwareText>
                      <ThemeAwareBadge>
                        {t(statusLabel(request.status))}
                      </ThemeAwareBadge>
                    </VStack>
                  </HStack>
                  <DetailField label={t('paymentRequests.purchaseDate')}>
                    <ThemeAwareText>
                      {new Date(request.purchaseDate).toLocaleDateString(
                        locale,
                      )}
                    </ThemeAwareText>
                  </DetailField>
                  <DetailField
                    label={t('paymentRequests.jointAccountPercentage')}
                  >
                    <ThemeAwareText>
                      {`${getJointAccountPercentage(request.requestedSplit, request.createdByUserId)}%`}
                    </ThemeAwareText>
                  </DetailField>
                  {request.categories.length > 0 ? (
                    <DetailField label={t('paymentRequests.categories')}>
                      <HStack space="xs" className="flex-wrap">
                        {request.categories.map((category, index) => (
                          <ThemeAwareBadge key={`${category}-${index}`}>
                            {category}
                          </ThemeAwareBadge>
                        ))}
                      </HStack>
                    </DetailField>
                  ) : null}
                  <DetailField label={t('paymentRequests.requestReason')}>
                    <ThemeAwareText>{request.rationale}</ThemeAwareText>
                  </DetailField>
                  <DetailField label={t('paymentRequests.requiredApprovers')}>
                    {membersQuery.isLoading ? (
                      <ThemeAwareText>{t('common.loading')}</ThemeAwareText>
                    ) : membersQuery.isError ? (
                      <ThemeAwareText color="$error600">
                        {membersQuery.error instanceof Error
                          ? membersQuery.error.message
                          : t('errors.backendRequestFailed')}
                      </ThemeAwareText>
                    ) : (
                      <VStack space="xs">
                        {(membersQuery.data ?? []).map((member) => {
                          const decision = request.decisions.find(
                            (current) => current.memberUserId === member.userId,
                          );
                          const name = getMemberDisplayName(
                            member.userId,
                            membersQuery.data ?? [],
                          );
                          const status =
                            request.status === 'pending_approval'
                              ? decision
                                ? activityLabel(decision.decision, t)
                                : t('paymentRequests.awaitingApprovalStatus')
                              : undefined;

                          return (
                            <ThemeAwareText key={member.id}>
                              {status ? `${name}: ${status}` : name}
                            </ThemeAwareText>
                          );
                        })}
                      </VStack>
                    )}
                  </DetailField>
                </VStack>
              </ThemeAwareCardSurface>
            )}
            <ThemeAwareCardSurface
              backgroundImage={CARD_ARTWORK.budgeting}
              borderRadius="$sm"
              p="$4"
            >
              <ThemeAwareHeading>
                {t('paymentRequests.decisions')}
              </ThemeAwareHeading>
              {request.decisions.length ? (
                <VStack space="xs">
                  {membersQuery.isLoading
                    ? request.decisions.map((decision) => (
                        <HStack
                          key={decision.id}
                          space="sm"
                          className="items-center"
                        >
                          <ThemeAwareSkeleton height={14} width={92} />
                          <ThemeAwareText>
                            {`${activityLabel(decision.decision, t)}${decision.comment ? ` - ${decision.comment}` : ''}`}
                          </ThemeAwareText>
                        </HStack>
                      ))
                    : request.decisions.map((decision) => (
                        <ThemeAwareText key={decision.id}>
                          {`${getMemberDisplayName(decision.memberUserId, membersQuery.data ?? [])}: ${activityLabel(decision.decision, t)}${decision.comment ? ` - ${decision.comment}` : ''}`}
                        </ThemeAwareText>
                      ))}
                </VStack>
              ) : (
                <ThemeAwareText>
                  {t('paymentRequests.awaitingApprovalStatus')}
                </ThemeAwareText>
              )}
            </ThemeAwareCardSurface>
            {request.evaluation ? (
              <ThemeAwareCardSurface
                backgroundImage={CARD_ARTWORK.budgeting}
                borderRadius="$sm"
                p="$4"
              >
                <ThemeAwareHeading>
                  {t('paymentRequests.rubric')}
                </ThemeAwareHeading>
                {Object.entries(request.evaluation.answers).map(
                  ([questionId, answer]) => (
                    <ThemeAwareText key={questionId}>
                      {`${questionId}: ${String(answer)}`}
                    </ThemeAwareText>
                  ),
                )}
              </ThemeAwareCardSurface>
            ) : null}
            {decideMutation.error || cancelMutation.error ? (
              <ThemeAwareText color="$error600">
                {(decideMutation.error ?? cancelMutation.error)?.message}
              </ThemeAwareText>
            ) : null}
            {deleteMutation.error ? (
              <ThemeAwareText color="$error600">
                {deleteMutation.error.message}
              </ThemeAwareText>
            ) : null}
            <ThemeAwareCardSurface
              backgroundImage={CARD_ARTWORK.budgeting}
              borderRadius="$sm"
              p="$4"
            >
              <ThemeAwareHeading>
                {t('paymentRequests.activity')}
              </ThemeAwareHeading>
              {lastEditedEvent ? (
                <DetailField label={t('paymentRequests.lastEdited')}>
                  {membersQuery.isLoading ? (
                    <HStack space="sm" className="items-center">
                      <ThemeAwareSkeleton height={14} width={92} />
                      <ThemeAwareText>
                        {new Date(lastEditedEvent.createdAt).toLocaleString(
                          locale,
                        )}
                      </ThemeAwareText>
                    </HStack>
                  ) : (
                    <ThemeAwareText>
                      {`${getMemberDisplayName(lastEditedEvent.actorUserId, membersQuery.data ?? [])}: ${new Date(lastEditedEvent.createdAt).toLocaleString(locale)}`}
                    </ThemeAwareText>
                  )}
                </DetailField>
              ) : null}
              {request.activity.map((event) => (
                <ThemeAwareText key={event.id}>
                  {`${activityLabel(event.eventType, t)}: ${new Date(event.createdAt).toLocaleString(locale)}`}
                </ThemeAwareText>
              ))}
            </ThemeAwareCardSurface>
          </VStack>
        </DetailSwipeNavigator>
      </ThemeAwareScreen>
    </>
  );
}
