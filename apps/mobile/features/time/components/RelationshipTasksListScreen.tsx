import FontAwesome from '@expo/vector-icons/FontAwesome';
import type {
  RelationshipSummary,
  RelationshipTask,
  RelationshipTaskStatus,
} from '@expo-50sdk-template/shared-types';
import { Stack, useRouter } from 'expo-router';
import { startTransition, useOptimistic, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

import { useColorScheme } from '@/components/hooks/useColorScheme';
import { ThemeAwareButton } from '@/components/ui/ThemeAwareButton';
import { ThemeAwareCardSurface } from '@/components/ui/ThemeAwareCardSurface';
import { ThemeAwareCheckbox } from '@/components/ui/ThemeAwareCheckbox';
import { ThemeAwareInfiniteScrollList } from '@/components/ui/ThemeAwareInfiniteScrollList';
import { ThemeAwareScreen } from '@/components/ui/ThemeAwareScreen';
import { ThemeAwareSearch } from '@/components/ui/ThemeAwareSearch';
import type {
  ThemeAwareSearchSortConfig,
  ThemeAwareSearchSortOption,
} from '@/components/ui/ThemeAwareSearch';
import {
  ThemeAwareHeading,
  ThemeAwareText,
} from '@/components/ui/ThemeAwareText';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { CARD_ARTWORK } from '@/constants/cardArtwork';
import { COLORS } from '@/constants/colors';
import { AppRoutePaths, DetailNavigationSources } from '@/constants/navigation';
import { useOAuth2Auth } from '@/features/auth/OAuth2AuthProvider';
import { useRelationshipsQuery } from '@/features/payment-requests/hooks/usePaymentRequests';
import { getMemberDisplayName } from '@/features/relationships/utils';
import { RelationshipTaskCalendarModal } from '@/features/time/components/RelationshipTaskCalendarModal';
import { RelationshipTaskListSkeleton } from '@/features/time/components/RelationshipTaskListSkeleton';
import {
  canUserCompleteRelationshipTask,
  filterRelationshipTasks,
} from '@/features/time/filters';
import {
  useCompleteRelationshipTaskMutation,
  useRelationshipTasksInfiniteQuery,
} from '@/features/time/hooks/useTime';
import {
  selectedRelationshipIdSelector,
  setError,
} from '@/state/slices/generalSlice';
import { useAppDispatch, useAppSelector } from '@/state/store';
import { useI18n } from '@/utils/i18n';

const COMPLETION_CHECK_FEEDBACK_DELAY_MS = 300;

function formatDateTime(value: string, locale: string) {
  return new Date(value).toLocaleString(locale);
}

function TaskDetail({ label, value }: { label: string; value: string }) {
  return (
    <VStack space="xs">
      <ThemeAwareText fontWeight="$semibold" opacity={0.75} size="sm">
        {label}
      </ThemeAwareText>
      <ThemeAwareText>{value}</ThemeAwareText>
    </VStack>
  );
}

function IncompleteTaskRow({
  canComplete,
  isChecked,
  locale,
  onComplete,
  onPress,
  task,
}: {
  canComplete: boolean;
  isChecked: boolean;
  locale: string;
  onComplete: () => void;
  onPress: () => void;
  task: RelationshipTask;
}) {
  const { t } = useI18n();
  const handleValueChange = (checked: boolean) => {
    if (checked) onComplete();
  };

  return (
    <ThemeAwareCardSurface
      backgroundImage={CARD_ARTWORK.planning}
      borderRadius="$sm"
      p="$4"
    >
      <HStack space="md" className="items-center justify-between">
        <TouchableOpacity
          accessibilityLabel={task.name}
          accessibilityRole="button"
          onPress={onPress}
          style={{ flex: 1 }}
        >
          <VStack space="xs">
            <ThemeAwareText fontWeight="$semibold">{task.name}</ThemeAwareText>
            {task.dueDate ? (
              <ThemeAwareText opacity={0.75} size="sm">
                {`${t('time.taskDueDate')}: ${formatDateTime(task.dueDate, locale)}`}
              </ThemeAwareText>
            ) : null}
          </VStack>
        </TouchableOpacity>
        <ThemeAwareCheckbox
          accessibilityLabel={`${t('time.markComplete')}: ${task.name}`}
          checkboxPosition="right"
          disabled={!canComplete || isChecked}
          label={t('time.markComplete')}
          onValueChange={handleValueChange}
          value={isChecked}
        />
      </HStack>
    </ThemeAwareCardSurface>
  );
}

function CompletedTaskRow({
  locale,
  members,
  onPress,
  task,
}: {
  locale: string;
  members: RelationshipSummary['members'];
  onPress: () => void;
  task: RelationshipTask;
}) {
  const { t } = useI18n();

  return (
    <TouchableOpacity
      accessibilityLabel={task.name}
      accessibilityRole="button"
      onPress={onPress}
    >
      <ThemeAwareCardSurface
        backgroundImage={CARD_ARTWORK.planning}
        borderRadius="$sm"
        p="$4"
      >
        <VStack space="md">
          <ThemeAwareHeading>{task.name}</ThemeAwareHeading>
          <TaskDetail
            label={t('time.completedAt')}
            value={
              task.completedAt
                ? formatDateTime(task.completedAt, locale)
                : t('time.notCompletedYet')
            }
          />
          {task.dueDate ? (
            <TaskDetail
              label={t('time.taskDueDate')}
              value={formatDateTime(task.dueDate, locale)}
            />
          ) : null}
          {task.completedByUserId ? (
            <TaskDetail
              label={t('time.completedBy')}
              value={getMemberDisplayName(task.completedByUserId, members)}
            />
          ) : null}
        </VStack>
      </ThemeAwareCardSurface>
    </TouchableOpacity>
  );
}

function renderScreenMessage(title: string, message: string) {
  return (
    <ThemeAwareScreen>
      <Stack.Screen options={{ title }} />
      <ThemeAwareText>{message}</ThemeAwareText>
    </ThemeAwareScreen>
  );
}

export function RelationshipTasksListScreen({
  status,
}: {
  status: RelationshipTaskStatus;
}) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const { isAuthenticated, user } = useOAuth2Auth();
  const dispatch = useAppDispatch();
  const relationshipsQuery = useRelationshipsQuery(Boolean(user?.subject));
  const relationships = relationshipsQuery.data ?? [];
  const selectedRelationshipId = useAppSelector(selectedRelationshipIdSelector);
  const relationship = relationships.find(
    (candidate) => candidate.id === selectedRelationshipId,
  );
  const tasksQuery = useRelationshipTasksInfiniteQuery(
    relationship?.id,
    status,
    Boolean(user?.subject),
    status === 'completed' ? 50 : undefined,
  );
  const tasks = tasksQuery.data?.pages.flatMap((page) => page.items) ?? [];
  const [optimisticTaskState, updateOptimisticTask] = useOptimistic(
    { tasks, checkedTaskIds: [] as string[] },
    (currentState, action: { type: 'check' | 'remove'; taskId: string }) => {
      if (action.type === 'check') {
        return {
          ...currentState,
          checkedTaskIds: currentState.checkedTaskIds.includes(action.taskId)
            ? currentState.checkedTaskIds
            : [...currentState.checkedTaskIds, action.taskId],
        };
      }

      return {
        tasks: currentState.tasks.filter((task) => task.id !== action.taskId),
        checkedTaskIds: currentState.checkedTaskIds.filter(
          (taskId) => taskId !== action.taskId,
        ),
      };
    },
  );
  const completeMutation = useCompleteRelationshipTaskMutation(
    relationship?.id ?? '',
  );
  const showTaskCompletionError = (error: unknown) => {
    dispatch(
      setError({
        message:
          error instanceof Error && error.message.trim()
            ? error.message
            : t('time.taskCompleteError'),
        ...(error instanceof Error
          ? { name: error.name, stack: error.stack }
          : {}),
      }),
    );
  };
  const completeTask = (taskId: string) => {
    startTransition(async () => {
      updateOptimisticTask({ type: 'check', taskId });

      const checkFeedbackDelay = new Promise<void>((resolve) => {
        setTimeout(resolve, COMPLETION_CHECK_FEEDBACK_DELAY_MS);
      });
      const completionResult = completeMutation.mutateAsync(taskId).then(
        () => ({ success: true as const }),
        (error: unknown) => ({ success: false as const, error }),
      );
      const resultBeforeRemoval = await Promise.race([
        completionResult,
        checkFeedbackDelay.then(() => null),
      ]);

      if (resultBeforeRemoval && !resultBeforeRemoval.success) {
        showTaskCompletionError(resultBeforeRemoval.error);
        return;
      }

      if (resultBeforeRemoval?.success) {
        await checkFeedbackDelay;
      }
      updateOptimisticTask({ type: 'remove', taskId });

      if (!resultBeforeRemoval) {
        const result = await completionResult;
        if (!result.success) {
          showTaskCompletionError(result.error);
        }
      }
    });
  };
  const sortOptions: ThemeAwareSearchSortOption<RelationshipTask>[] = [
    {
      label: t('time.dateCreated'),
      value: 'createdAt',
      getValue: (task) => task.createdAt,
    },
    {
      label: t('time.taskName'),
      value: 'name',
      getValue: (task) => task.name,
    },
  ];
  const initialSortField = status === 'completed' ? 'completedAt' : 'createdAt';
  if (status === 'completed') {
    sortOptions.unshift({
      label: t('time.completedAt'),
      value: 'completedAt',
      getValue: (task) => task.completedAt,
    });
  }
  const sortConfig: ThemeAwareSearchSortConfig<RelationshipTask> = {
    field: {
      label: t('paymentRequests.sortBy'),
      initialValue: initialSortField,
      placeholder: t('paymentRequests.sortBy'),
      options: sortOptions,
    },
    order: {
      label: t('paymentRequests.sortOrder'),
      initialValue: 'descending',
      placeholder: t('paymentRequests.sortOrder'),
      options: [
        {
          label: t('paymentRequests.ascending'),
          value: 'ascending',
        },
        {
          label: t('paymentRequests.descending'),
          value: 'descending',
        },
      ],
    },
    tieBreaker: (left, right) => left.id.localeCompare(right.id),
  };
  const title =
    status === 'completed'
      ? t('time.viewCompletedTasks')
      : t('time.viewAllTasks');
  const screenOptions = {
    title,
    headerRight: () => (
      <View style={{ alignItems: 'center', flexDirection: 'row' }}>
        {relationship ? (
          <TouchableOpacity
            accessibilityLabel={t(
              status === 'completed'
                ? 'time.showCompletedTasksCalendar'
                : 'time.showTodoCalendar',
            )}
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => setIsCalendarVisible(true)}
            style={{ paddingHorizontal: 12, paddingVertical: 8 }}
          >
            <FontAwesome
              color={COLORS[colorScheme].text}
              name="calendar"
              size={20}
            />
          </TouchableOpacity>
        ) : null}
        {status === 'incomplete' ? (
          <TouchableOpacity
            accessibilityLabel={t('time.createTask')}
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => router.push(AppRoutePaths.createTask)}
            style={{ paddingHorizontal: 12, paddingVertical: 8 }}
          >
            <FontAwesome
              color={COLORS[colorScheme].text}
              name="plus"
              size={20}
            />
          </TouchableOpacity>
        ) : null}
      </View>
    ),
  };
  const listFooterComponent = tasksQuery.isFetchNextPageError ? (
    <VStack space="sm" className="px-4 pb-4">
      <ThemeAwareText color="$error600">
        {tasksQuery.error?.message ?? t('time.loadMoreTasksError')}
      </ThemeAwareText>
      <ThemeAwareButton
        isDisabled={tasksQuery.isFetchingNextPage}
        onPress={() => {
          tasksQuery.fetchNextPage().catch(() => undefined);
        }}
        variant="outline"
      >
        {t('home.retry')}
      </ThemeAwareButton>
    </VStack>
  ) : undefined;

  if (!isAuthenticated) {
    return renderScreenMessage(title, t('paymentRequests.signIn'));
  }

  if (!user?.subject) {
    return renderScreenMessage(title, t('auth.profileUnavailable'));
  }

  if (relationshipsQuery.isLoading) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <ThemeAwareScreen fillAvailableSpace>
          <RelationshipTaskListSkeleton status={status} />
        </ThemeAwareScreen>
      </>
    );
  }

  if (relationshipsQuery.error) {
    return renderScreenMessage(title, relationshipsQuery.error.message);
  }

  if (!relationship) {
    return (
      <ThemeAwareScreen>
        <Stack.Screen options={screenOptions} />
        <VStack space="md">
          <ThemeAwareText>{t('time.noRelationship')}</ThemeAwareText>
          <ThemeAwareButton onPress={() => router.navigate(AppRoutePaths.home)}>
            {t('rules.openHome')}
          </ThemeAwareButton>
        </VStack>
      </ThemeAwareScreen>
    );
  }

  const switchLabel =
    status === 'completed' ? t('time.viewIncomplete') : t('time.viewCompleted');
  const switchRoute =
    status === 'completed'
      ? AppRoutePaths.viewAllIncompleteTasks
      : AppRoutePaths.viewAllCompletedTasks;
  const currentUserId = user.subject;

  return (
    <>
      <ThemeAwareSearch<RelationshipTask, Record<string, never>>
        items={optimisticTaskState.tasks}
        controlsPresentation="modal"
        initialFilters={{}}
        filterItems={(items, { search }) =>
          filterRelationshipTasks(items, search, relationship.members)
        }
        loadMoreWhileFiltered={{
          fetchNextPage: tasksQuery.fetchNextPage,
          hasNextPage: tasksQuery.hasNextPage,
          isFetchingNextPage: tasksQuery.isFetchingNextPage,
          isFetchNextPageError: tasksQuery.isFetchNextPageError,
        }}
        search={{
          label: t('time.searchTasks'),
          placeholder: t('time.searchTasksPlaceholder'),
          inputFieldProps: {
            autoCapitalize: 'none',
            returnKeyType: 'search',
          },
        }}
        sort={sortConfig}
      >
        {({
          items: filteredTasks,
          searchControls,
          hasActiveFilters,
          isFilterStateValid,
        }) => {
          const hasUnloadedFilteredResults =
            hasActiveFilters &&
            isFilterStateValid &&
            filteredTasks.length === 0 &&
            tasksQuery.hasNextPage &&
            !tasksQuery.isFetchNextPageError;
          const listEmptyComponent =
            tasksQuery.error && tasks.length === 0 ? (
              <ThemeAwareText>
                {tasksQuery.error.message || t('time.tasksError')}
              </ThemeAwareText>
            ) : hasUnloadedFilteredResults ? null : tasks.length === 0 &&
              !hasActiveFilters ? (
              <ThemeAwareText>
                {status === 'completed'
                  ? t('time.emptyCompletedTasks')
                  : t('time.emptyTasks')}
              </ThemeAwareText>
            ) : (
              <ThemeAwareText>{t('time.noFilteredTasks')}</ThemeAwareText>
            );

          return (
            <ThemeAwareInfiniteScrollList<RelationshipTask>
              data={filteredTasks}
              fixedHeaderContent={searchControls}
              detailNavigation={{
                source:
                  status === 'completed'
                    ? DetailNavigationSources.completedTasks
                    : DetailNavigationSources.incompleteTasks,
                hrefForId: (id) => ({
                  pathname: AppRoutePaths.taskDetails,
                  params: {
                    id,
                    relationshipId: relationship.id,
                    detailNavigationSource:
                      status === 'completed'
                        ? DetailNavigationSources.completedTasks
                        : DetailNavigationSources.incompleteTasks,
                  },
                }),
                pageKey: tasksQuery.data?.pages.length ?? 0,
                isFetching: tasksQuery.isFetching,
                errorMessage: tasksQuery.error?.message,
              }}
              fetchNextPage={tasksQuery.fetchNextPage}
              hasNextPage={tasksQuery.hasNextPage}
              isLoading={tasksQuery.isLoading}
              isFetchNextPageError={tasksQuery.isFetchNextPageError}
              isFetchingNextPage={tasksQuery.isFetchingNextPage}
              onRefresh={tasksQuery.refetch}
              refreshing={tasksQuery.isRefetching}
              keyExtractor={(task) => task.id}
              ListEmptyComponent={listEmptyComponent}
              ListFooterComponent={listFooterComponent}
              loadingSpinner={<RelationshipTaskListSkeleton status={status} />}
              onEndReachedThreshold={0.5}
              bottomContent={({ scrollToTop }) => (
                <HStack space="sm">
                  <ThemeAwareButton
                    flex={1}
                    onPress={() => router.navigate(switchRoute)}
                    variant="outline"
                  >
                    {switchLabel}
                  </ThemeAwareButton>
                  <ThemeAwareButton
                    accessibilityLabel={t('common.backToTop')}
                    flex={1}
                    onPress={scrollToTop}
                    variant="outline"
                  >
                    {t('common.backToTop')}
                  </ThemeAwareButton>
                </HStack>
              )}
              renderItem={({ item }) => (
                <VStack className="pb-2">
                  {status === 'completed' ? (
                    <CompletedTaskRow
                      locale={locale}
                      members={relationship.members}
                      onPress={() =>
                        router.navigate({
                          pathname: AppRoutePaths.taskDetails,
                          params: {
                            id: item.id,
                            relationshipId: relationship.id,
                            detailNavigationSource:
                              DetailNavigationSources.completedTasks,
                          },
                        })
                      }
                      task={item}
                    />
                  ) : (
                    <IncompleteTaskRow
                      canComplete={canUserCompleteRelationshipTask(
                        item,
                        currentUserId,
                      )}
                      isChecked={optimisticTaskState.checkedTaskIds.includes(
                        item.id,
                      )}
                      locale={locale}
                      onComplete={() => completeTask(item.id)}
                      onPress={() =>
                        router.navigate({
                          pathname: AppRoutePaths.taskDetails,
                          params: {
                            id: item.id,
                            relationshipId: relationship.id,
                            detailNavigationSource:
                              DetailNavigationSources.incompleteTasks,
                          },
                        })
                      }
                      task={item}
                    />
                  )}
                </VStack>
              )}
            >
              <Stack.Screen options={screenOptions} />
            </ThemeAwareInfiniteScrollList>
          );
        }}
      </ThemeAwareSearch>
      <RelationshipTaskCalendarModal
        isVisible={isCalendarVisible}
        onClose={() => setIsCalendarVisible(false)}
        relationship={relationship}
        status={status}
      />
    </>
  );
}
