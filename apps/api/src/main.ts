import { loadConfig } from './config/env';
import { PrismaBudgetService } from './features/budgets/service';
import { PrismaRelationshipRuleService } from './features/relationshipRules/service';
import { PrismaTimeService } from './features/time/service';
import prisma, { connectPrisma } from './lib/prisma';
import { logError, logInfo, shutdownApiLogging } from './logging';
import { createApiServer, startApiServer, stopApiServer } from './server';

const config = loadConfig();
const server = startApiServer(createApiServer(config), config);
connectPrisma(config.databaseUrl).catch((error: unknown) => {
  logError('database_connection_unexpected_failure', { error });
});
const budgetService = new PrismaBudgetService(prisma);
const budgetRolloverTimer = setInterval(() => {
  budgetService.rolloverExpiredBudgets().catch((error: unknown) => {
    logError('budget_rollover_failed', { error });
  });
}, 60_000);
budgetService.rolloverExpiredBudgets().catch((error: unknown) => {
  logError('budget_rollover_failed', { error });
});
const relationshipRuleService = new PrismaRelationshipRuleService(prisma);
const reminderTimer = setInterval(() => {
  relationshipRuleService
    .deliverDueReviewReminders()
    .catch((error: unknown) => {
      logError('relationship_rule_reminders_failed', { error });
    });
}, 60_000);
relationshipRuleService.deliverDueReviewReminders().catch((error: unknown) => {
  logError('relationship_rule_reminders_failed', { error });
});
const timeService = new PrismaTimeService(prisma);
const taskReminderTimer = setInterval(() => {
  timeService.deliverDueTaskReminders().catch((error: unknown) => {
    logError('relationship_task_reminders_failed', { error });
  });
}, 60_000);
timeService.deliverDueTaskReminders().catch((error: unknown) => {
  logError('relationship_task_reminders_failed', { error });
});

function shutdown(signal: string) {
  logInfo('api_shutdown_started', { signal });
  clearInterval(budgetRolloverTimer);
  clearInterval(reminderTimer);
  clearInterval(taskReminderTimer);
  stopApiServer(server)
    .then(() => shutdownApiLogging())
    .then(() => process.exit(0))
    .catch((error: unknown) => {
      logError('api_shutdown_failed', { error });
      process.exit(1);
    });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
