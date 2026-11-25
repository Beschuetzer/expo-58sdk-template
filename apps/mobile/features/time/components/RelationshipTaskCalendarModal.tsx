import type {
  RelationshipSummary,
  RelationshipTask,
  RelationshipTaskStatus,
} from '@expo-50sdk-template/shared-types';
import { useState } from 'react';

import { DateEntriesCalendarModal } from '@/components/ui/DateEntriesCalendarModal';
import { ThemeAwareSurface } from '@/components/ui/ThemeAwareSurface';
import { ThemeAwareText } from '@/components/ui/ThemeAwareText';
import { VStack } from '@/components/ui/vstack';
import { getMemberDisplayName } from '@/features/relationships/utils';
import { useRelationshipTaskCalendarQuery } from '@/features/time/hooks/useTime';
import {
  getCurrentCalendarMonthId,
  type CalendarMonthData,
} from '@/utils/calendar';
import { useI18n } from '@/utils/i18n';

type RelationshipTaskCalendarModalProps = {
  isVisible: boolean;
  onClose: () => void;
  relationship: RelationshipSummary;
  status: RelationshipTaskStatus;
};

function formatTaskDate(value: string, locale: string) {
  return new Date(value).toLocaleString(locale);
}

export function RelationshipTaskCalendarModal({
  isVisible,
  onClose,
  relationship,
  status,
}: RelationshipTaskCalendarModalProps) {
  const { locale, t } = useI18n();
  const [calendarMonthId, setCalendarMonthId] = useState(
    getCurrentCalendarMonthId,
  );
  const calendarQuery = useRelationshipTaskCalendarQuery(
    relationship.id,
    status,
    calendarMonthId.slice(0, 7),
    isVisible,
  );
  const isCompleted = status === 'completed';

  function renderTask(task: RelationshipTask) {
    const taskDate = isCompleted ? task.completedAt : task.createdAt;

    return (
      <ThemeAwareSurface borderRadius="$sm" borderWidth="$1" p="$4">
        <VStack space="xs">
          <ThemeAwareText fontWeight="$semibold">{task.name}</ThemeAwareText>
          {taskDate ? (
            <ThemeAwareText size="sm">
              {`${t(isCompleted ? 'time.completedAt' : 'time.dateCreated')}: ${formatTaskDate(
                taskDate,
                locale,
              )}`}
            </ThemeAwareText>
          ) : null}
          {task.dueDate ? (
            <ThemeAwareText opacity={0.75} size="sm">
              {`${t('time.taskDueDate')}: ${formatTaskDate(task.dueDate, locale)}`}
            </ThemeAwareText>
          ) : null}
          {isCompleted && task.completedByUserId ? (
            <ThemeAwareText opacity={0.75} size="sm">
              {`${t('time.completedBy')}: ${getMemberDisplayName(
                task.completedByUserId,
                relationship.members,
              )}`}
            </ThemeAwareText>
          ) : !isCompleted ? (
            <ThemeAwareText opacity={0.75} size="sm">
              {`${t('time.createdBy')}: ${getMemberDisplayName(
                task.createdByUserId,
                relationship.members,
              )}`}
            </ThemeAwareText>
          ) : null}
        </VStack>
      </ThemeAwareSurface>
    );
  }

  const calendarData: CalendarMonthData<RelationshipTask> | undefined =
    calendarQuery.data;

  return (
    <DateEntriesCalendarModal
      boundsKey={`${relationship.id}:${status}`}
      calendarMonthId={calendarMonthId}
      closeButtonText={t('time.closeTaskCalendar')}
      data={calendarData}
      emptyCalendarText={
        isCompleted ? t('time.emptyCompletedTasks') : t('time.emptyTasks')
      }
      emptyMonthText={t('time.noTasksThisMonth')}
      error={calendarQuery.error}
      errorFallbackText={t('time.tasksError')}
      getEntryDate={(task) => (isCompleted ? task.completedAt : task.createdAt)}
      getEntryId={(task) => task.id}
      isCalendarLoading={calendarQuery.isLoading && !calendarQuery.data}
      isVisible={isVisible}
      loadingLabel={t('common.loading')}
      locale={locale}
      nextMonthLabel={t('time.nextTaskCalendarMonth')}
      onClose={onClose}
      onMonthChange={setCalendarMonthId}
      previousMonthLabel={t('time.previousTaskCalendarMonth')}
      renderEntry={renderTask}
      selectDayText={t('time.selectTaskDay')}
      title={
        isCompleted
          ? t('time.completedTasksCalendarTitle')
          : t('time.todoCalendarTitle')
      }
    />
  );
}
