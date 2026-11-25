import { addDays, differenceInCalendarDays, format, subYears } from 'date-fns';
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FEATURED_SEED_RELATIONSHIPS,
  FEATURED_SEED_RULES,
  FEATURED_SEED_REQUESTS,
  FEATURED_SEED_JOINT_ACCOUNT_CHARGES,
  FEATURED_SEED_ME_TIME_ENTRIES,
  FEATURED_SEED_SEX_EVENT_COUNT,
  FEATURED_SEED_DATE_NIGHT_EVENT_COUNT,
  FEATURED_SEED_TASKS,
  FEATURED_SEED_BUDGETS,
  FEATURED_SEED_USERS,
  seedFeaturedUsers,
  type FeaturedUserSeedDatabase,
} from './seed-featured-users';

const RULE_LIST_PAGE_SIZE = 20;
const TIME_LIST_PAGE_SIZE = 20;

type MockUpsertInput = {
  create: Record<string, unknown>;
  where: Record<string, unknown>;
};

test('seeds two users into a shared and a single-member relationship each', async () => {
  const calls = {
    relationship: [] as MockUpsertInput[],
    relationshipMember: [] as MockUpsertInput[],
    relationshipInvitation: [] as MockUpsertInput[],
    relationshipJoinRequest: [] as MockUpsertInput[],
    rubric: [] as MockUpsertInput[],
    rubricVersion: [] as MockUpsertInput[],
    paymentRequest: [] as MockUpsertInput[],
    paymentRequestDecision: [] as MockUpsertInput[],
    paymentRequestEvaluation: [] as MockUpsertInput[],
    activityEvent: [] as MockUpsertInput[],
    notification: [] as MockUpsertInput[],
    jointAccountCharge: [] as MockUpsertInput[],
    meTime: [] as MockUpsertInput[],
    relationshipTask: [] as MockUpsertInput[],
    relationshipRule: [] as MockUpsertInput[],
    relationshipRuleApproval: [] as MockUpsertInput[],
    budget: [] as MockUpsertInput[],
    budgetApproval: [] as MockUpsertInput[],
    budgetItem: [] as MockUpsertInput[],
    sexEvent: [] as MockUpsertInput[],
    dateNightEvent: [] as MockUpsertInput[],
  };
  const notificationDeleteManyCalls: {
    where: Record<string, unknown>;
  }[] = [];
  const delegate = (name: keyof typeof calls) => ({
    upsert: async (input: MockUpsertInput) => {
      calls[name].push(input);
      return {};
    },
  });
  const db = {
    relationship: delegate('relationship'),
    relationshipMember: delegate('relationshipMember'),
    relationshipInvitation: delegate('relationshipInvitation'),
    relationshipJoinRequest: delegate('relationshipJoinRequest'),
    rubric: delegate('rubric'),
    rubricVersion: delegate('rubricVersion'),
    paymentRequest: delegate('paymentRequest'),
    paymentRequestDecision: delegate('paymentRequestDecision'),
    paymentRequestEvaluation: delegate('paymentRequestEvaluation'),
    activityEvent: delegate('activityEvent'),
    notification: {
      upsert: async (input: MockUpsertInput) => {
        calls.notification.push(input);
        return {};
      },
      deleteMany: async (input: { where: Record<string, unknown> }) => {
        notificationDeleteManyCalls.push(input);
        return { count: 0 };
      },
    },
    jointAccountCharge: delegate('jointAccountCharge'),
    meTime: delegate('meTime'),
    relationshipTask: delegate('relationshipTask'),
    relationshipRule: delegate('relationshipRule'),
    relationshipRuleApproval: delegate('relationshipRuleApproval'),
    budget: delegate('budget'),
    budgetApproval: delegate('budgetApproval'),
    budgetItem: delegate('budgetItem'),
    sexEvent: delegate('sexEvent'),
    dateNightEvent: delegate('dateNightEvent'),
  } as unknown as FeaturedUserSeedDatabase;

  const seededAt = new Date('2026-11-04T12:00:00.000Z');
  const result = await seedFeaturedUsers(db, seededAt);

  assert.deepEqual(result, {
    relationshipCount: 3,
    paymentRequestCount: 234,
    jointAccountChargeCount: FEATURED_SEED_JOINT_ACCOUNT_CHARGES.length,
    budgetCount: FEATURED_SEED_BUDGETS.length,
    budgetApprovalCount: FEATURED_SEED_BUDGETS.length,
    budgetItemCount: FEATURED_SEED_BUDGETS.reduce(
      (count, budget) => count + budget.items.length,
      0,
    ),
    meTimeCount: FEATURED_SEED_ME_TIME_ENTRIES.length,
    relationshipTaskCount: FEATURED_SEED_TASKS.length,
    relationshipRuleCount: FEATURED_SEED_RULES.length,
    relationshipInvitationCount: 1,
    relationshipJoinRequestCount: 1,
    sexEventCount: FEATURED_SEED_SEX_EVENT_COUNT,
    dateNightEventCount: FEATURED_SEED_DATE_NIGHT_EVENT_COUNT,
    notificationCount: calls.notification.length,
  });
  assert.equal(calls.relationship.length, 3);
  assert.equal(calls.relationshipMember.length, 4);

  for (const user of Object.values(FEATURED_SEED_USERS)) {
    const memberships = calls.relationshipMember
      .filter((call) => call.create.userId === user.userId)
      .map((call) => call.create.relationshipId);
    assert.equal(new Set(memberships).size, 2);
  }

  const sharedRelationshipId = FEATURED_SEED_RELATIONSHIPS.find(
    (relationship) => relationship.key === 'shared',
  )?.id;
  assert.ok(sharedRelationshipId);
  const budgets = calls.budget.map((call) => call.create);
  const budgetApprovals = calls.budgetApproval.map((call) => call.create);
  const budgetItems = calls.budgetItem.map((call) => call.create);
  const testUserIds = new Set(
    Object.values(FEATURED_SEED_USERS).map(({ userId }) => userId),
  );
  const budgetsById = new Map(
    budgets.map((budget) => [String(budget.id), budget]),
  );
  assert.equal(budgets.length, FEATURED_SEED_BUDGETS.length);
  assert.ok(budgets.length >= 12);
  assert.equal(budgetApprovals.length, budgets.length);
  assert.equal(
    budgetItems.length,
    FEATURED_SEED_BUDGETS.reduce(
      (count, budget) => count + budget.items.length,
      0,
    ),
  );
  assert.ok(budgetItems.length >= 50);
  assert.deepEqual(
    new Set(budgets.map((budget) => budget.period)),
    new Set(['monthly', 'quarterly', 'yearly']),
  );

  for (const [index, fixture] of FEATURED_SEED_BUDGETS.entries()) {
    const budget = budgets[index];
    assert.ok(budget);
    assert.equal(budget.relationshipId, sharedRelationshipId);
    assert.equal(budget.name, fixture.name);
    assert.equal(budget.period, fixture.period);
    assert.equal(budget.status, fixture.status);
    assert.equal(budget.renewedAt === null, !fixture.renewed);
    assert.ok(testUserIds.has(String(budget.createdByUserId)));

    const approval = budgetApprovals.find(
      (candidate) => candidate.budgetId === budget.id,
    );
    assert.ok(approval);
    assert.equal(
      approval.memberUserId,
      budget.createdByUserId === FEATURED_SEED_USERS.testy.userId
        ? FEATURED_SEED_USERS.shifty.userId
        : FEATURED_SEED_USERS.testy.userId,
    );
    assert.equal(
      approval.approvedAt === null,
      budget.status === 'pending_approval',
    );
    assert.equal(calls.budget[index]?.where.id, calls.budget[index]?.create.id);

    if (fixture.renewed) {
      assert.ok(
        budgets.some(
          (candidate) =>
            candidate.seriesId === budget.seriesId &&
            (candidate.periodStart as Date).getTime() >
              (budget.periodStart as Date).getTime(),
        ),
      );
    }
  }

  const itemTotalsByBudgetId = new Map<string, number>();
  for (const item of budgetItems) {
    const budget = budgetsById.get(String(item.budgetId));
    assert.ok(budget);
    assert.equal(budget.status, 'approved');
    assert.ok(testUserIds.has(String(item.createdByUserId)));
    assert.ok(
      (item.date as Date).getTime() >= (budget.periodStart as Date).getTime(),
    );
    assert.ok(
      (item.date as Date).getTime() <= (budget.periodEnd as Date).getTime(),
    );
    itemTotalsByBudgetId.set(
      String(item.budgetId),
      (itemTotalsByBudgetId.get(String(item.budgetId)) ?? 0) +
        Number(item.amountMinorUnits),
    );
  }
  assert.ok(
    budgets.every(
      (budget) =>
        (itemTotalsByBudgetId.get(String(budget.id)) ?? 0) <=
        Number(budget.amountMinorUnits),
    ),
  );
  for (const user of Object.values(FEATURED_SEED_USERS)) {
    assert.ok(budgets.some((budget) => budget.createdByUserId === user.userId));
    assert.ok(budgetItems.some((item) => item.createdByUserId === user.userId));
  }

  const sexEvents = calls.sexEvent.map((call) => call.create);
  assert.equal(sexEvents.length, FEATURED_SEED_SEX_EVENT_COUNT);
  assert.equal(
    new Set(sexEvents.map((event) => String(event.id))).size,
    FEATURED_SEED_SEX_EVENT_COUNT,
  );
  const expectedMemberUserIds = Object.values(FEATURED_SEED_USERS)
    .map(({ userId }) => userId)
    .sort();
  assert.ok(
    sexEvents.every(
      (event) =>
        event.relationshipId === sharedRelationshipId &&
        JSON.stringify(event.memberUserIds) ===
          JSON.stringify(expectedMemberUserIds),
    ),
  );
  for (const user of Object.values(FEATURED_SEED_USERS)) {
    assert.equal(
      sexEvents.filter((event) => event.createdByUserId === user.userId).length,
      FEATURED_SEED_SEX_EVENT_COUNT / 2,
    );
  }
  const sexEventStartDay = subYears(seededAt, 1);
  const expectedSexEventDays = Array.from(
    {
      length: differenceInCalendarDays(seededAt, sexEventStartDay) + 1,
    },
    (_, dayOffset) =>
      format(addDays(sexEventStartDay, dayOffset), 'yyyy-MM-dd'),
  );
  const sexEventDays = sexEvents.map((event) => String(event.day)).sort();
  assert.deepEqual([...new Set(sexEventDays)], expectedSexEventDays);
  assert.ok(
    calls.sexEvent.every((event) => event.where.id === event.create.id),
  );

  const dateNightEvents = calls.dateNightEvent.map((call) => call.create);
  assert.equal(dateNightEvents.length, FEATURED_SEED_DATE_NIGHT_EVENT_COUNT);
  assert.equal(
    new Set(dateNightEvents.map((event) => String(event.id))).size,
    FEATURED_SEED_DATE_NIGHT_EVENT_COUNT,
  );
  assert.ok(
    dateNightEvents.every(
      (event) => event.relationshipId === sharedRelationshipId,
    ),
  );
  for (const user of Object.values(FEATURED_SEED_USERS)) {
    const userDateNightEvents = dateNightEvents.filter(
      (event) => event.createdByUserId === user.userId,
    );
    assert.equal(
      userDateNightEvents.length,
      FEATURED_SEED_DATE_NIGHT_EVENT_COUNT / 2,
    );
    assert.ok(
      userDateNightEvents.some(
        (event) => typeof event.description === 'string',
      ),
    );
    assert.ok(userDateNightEvents.some((event) => event.description === null));
  }
  const dateNightStartDay = subYears(seededAt, 1);
  const dateNightDayCount =
    differenceInCalendarDays(seededAt, dateNightStartDay) + 1;
  const expectedDateNightDays = Array.from(
    { length: FEATURED_SEED_DATE_NIGHT_EVENT_COUNT },
    (_, index) =>
      format(
        addDays(
          dateNightStartDay,
          Math.floor(
            (index * (dateNightDayCount - 1)) /
              (FEATURED_SEED_DATE_NIGHT_EVENT_COUNT - 1),
          ),
        ),
        'yyyy-MM-dd',
      ),
  );
  const dateNightDays = dateNightEvents.map((event) => String(event.day));
  assert.deepEqual(dateNightDays, expectedDateNightDays);
  assert.ok(
    calls.dateNightEvent.every((event) => event.where.id === event.create.id),
  );

  const meTimeEntries = calls.meTime.map((call) => call.create);
  const sharedMeTimeEntries = meTimeEntries.filter(
    (entry) => entry.relationshipId === sharedRelationshipId,
  );
  assert.equal(sharedMeTimeEntries.length, 80);
  assert.ok(sharedMeTimeEntries.length > 3 * TIME_LIST_PAGE_SIZE);
  assert.ok(sharedMeTimeEntries.some((entry) => entry.description === null));
  assert.ok(
    new Set(sharedMeTimeEntries.map((entry) => String(entry.description)))
      .size >= 10,
  );
  assert.ok(
    sharedMeTimeEntries.every(
      (entry) =>
        (entry.endTime as Date).getTime() > (entry.startTime as Date).getTime(),
    ),
  );
  const startTimeValues = sharedMeTimeEntries.map((entry) =>
    (entry.startTime as Date).getTime(),
  );
  assert.ok(
    Math.max(...startTimeValues) - Math.min(...startTimeValues) >
      365 * 24 * 60 * 60 * 1000,
  );
  const sharedMeTimeEntriesByDay = new Map<
    string,
    typeof sharedMeTimeEntries
  >();
  sharedMeTimeEntries.forEach((entry) => {
    const dayId = format(entry.startTime as Date, 'yyyy-MM-dd');
    const dayEntries = sharedMeTimeEntriesByDay.get(dayId) ?? [];
    dayEntries.push(entry);
    sharedMeTimeEntriesByDay.set(dayId, dayEntries);
  });
  const clusteredMeTimeDays = [...sharedMeTimeEntriesByDay.values()].filter(
    (entries) => entries.length >= 10,
  );
  assert.equal(clusteredMeTimeDays.length, 3);
  assert.ok(
    clusteredMeTimeDays.every((entries) => {
      const creatorIds = new Set(
        entries.map((entry) => String(entry.createdByUserId)),
      );
      return (
        entries.length === 10 &&
        creatorIds.has(FEATURED_SEED_USERS.testy.userId) &&
        creatorIds.has(FEATURED_SEED_USERS.shifty.userId)
      );
    }),
  );

  const tasks = calls.relationshipTask.map((call) => call.create);
  const sharedTasks = tasks.filter(
    (task) => task.relationshipId === sharedRelationshipId,
  );
  assert.equal(sharedTasks.length, 80);
  assert.ok(sharedTasks.length > 3 * TIME_LIST_PAGE_SIZE);
  assert.ok(new Set(sharedTasks.map((task) => String(task.name))).size >= 10);
  assert.ok(sharedTasks.some((task) => task.completedAt === null));
  assert.ok(sharedTasks.some((task) => task.completedAt instanceof Date));

  for (const userKey of ['testy', 'shifty'] as const) {
    const user = FEATURED_SEED_USERS[userKey];
    const personalRelationship = FEATURED_SEED_RELATIONSHIPS.find(
      (relationship) => relationship.key === userKey,
    );
    assert.ok(personalRelationship);

    const ownSharedMeTimeEntries = sharedMeTimeEntries.filter(
      (entry) => entry.createdByUserId === user.userId,
    );
    assert.equal(ownSharedMeTimeEntries.length, 40);
    const ownPersonalMeTimeEntries = meTimeEntries.filter(
      (entry) => entry.relationshipId === personalRelationship.id,
    );
    assert.equal(ownPersonalMeTimeEntries.length, 24);
    assert.ok(ownPersonalMeTimeEntries.length > TIME_LIST_PAGE_SIZE);
    assert.ok(
      ownPersonalMeTimeEntries.every(
        (entry) => entry.createdByUserId === user.userId,
      ),
    );

    const ownSharedTasks = sharedTasks.filter(
      (task) => task.createdByUserId === user.userId,
    );
    assert.equal(ownSharedTasks.length, 40);
    assert.ok(
      sharedTasks.some((task) => task.completedByUserId === user.userId),
    );
    const ownPersonalTasks = tasks.filter(
      (task) => task.relationshipId === personalRelationship.id,
    );
    assert.equal(ownPersonalTasks.length, 24);
    assert.ok(ownPersonalTasks.length > TIME_LIST_PAGE_SIZE);
    assert.ok(
      ownPersonalTasks.every((task) => task.createdByUserId === user.userId),
    );
  }

  const sharedRules = calls.relationshipRule.map((call) => call.create);
  assert.equal(sharedRules.length, FEATURED_SEED_RULES.length);
  assert.ok(sharedRules.length >= 4 * RULE_LIST_PAGE_SIZE);
  assert.ok(
    sharedRules.every((rule) => rule.relationshipId === sharedRelationshipId),
  );
  assert.equal(
    new Set(sharedRules.map((rule) => rule.name)).size,
    FEATURED_SEED_RULES.length,
  );
  assert.ok(sharedRules.every((rule) => Array.isArray(rule.labels)));
  assert.ok(sharedRules.every((rule) => !('label' in rule)));
  assert.ok(
    sharedRules.some(
      (rule) => Array.isArray(rule.labels) && rule.labels.length > 1,
    ),
  );
  const seededLabels = sharedRules.flatMap((rule) =>
    Array.isArray(rule.labels) ? rule.labels : [],
  );
  assert.ok(new Set(seededLabels).size >= 8);

  const ruleStatusCounts = sharedRules.reduce<Record<string, number>>(
    (counts, rule) => {
      const status = String(rule.status);
      counts[status] = (counts[status] ?? 0) + 1;
      return counts;
    },
    {},
  );
  assert.deepEqual(ruleStatusCounts, {
    pending_approval: 16,
    ratified: 64,
  });
  for (const user of Object.values(FEATURED_SEED_USERS)) {
    assert.equal(
      sharedRules.filter((rule) => rule.createdByUserId === user.userId).length,
      40,
    );
  }

  const ruleCreatedAtTimes = sharedRules.map((rule) =>
    (rule.createdAt as Date).getTime(),
  );
  assert.ok(
    ruleCreatedAtTimes.every(
      (createdAt, index) =>
        index === 0 || createdAt < ruleCreatedAtTimes[index - 1]!,
    ),
  );
  assert.ok(
    Math.max(...ruleCreatedAtTimes) - Math.min(...ruleCreatedAtTimes) >
      365 * 24 * 60 * 60 * 1000,
  );

  const approvalByRuleId = new Map(
    calls.relationshipRuleApproval.map(({ create }) => [
      String(create.ruleId),
      create,
    ]),
  );
  assert.equal(
    calls.relationshipRuleApproval.length,
    FEATURED_SEED_RULES.length,
  );
  for (const rule of sharedRules) {
    const approval = approvalByRuleId.get(String(rule.id));
    assert.ok(approval);
    const expectedApproverUserId =
      rule.createdByUserId === FEATURED_SEED_USERS.testy.userId
        ? FEATURED_SEED_USERS.shifty.userId
        : FEATURED_SEED_USERS.testy.userId;
    assert.equal(approval.memberUserId, expectedApproverUserId);
    assert.equal(
      approval.agreedAt,
      rule.status === 'ratified' ? rule.ratifiedAt : null,
    );
  }

  const sharedCharges = calls.jointAccountCharge.map((call) => call.create);
  assert.equal(
    sharedCharges.length,
    FEATURED_SEED_JOINT_ACCOUNT_CHARGES.length,
  );
  assert.ok(sharedCharges.length > 25);
  assert.ok(
    sharedCharges.every(
      (charge) => charge.relationshipId === sharedRelationshipId,
    ),
  );
  for (const user of Object.values(FEATURED_SEED_USERS)) {
    for (const status of ['paid', 'unpaid']) {
      assert.ok(
        sharedCharges.some(
          (charge) =>
            charge.createdByUserId === user.userId && charge.status === status,
        ),
      );
    }
  }
  assert.ok(new Set(sharedCharges.map((charge) => charge.name)).size >= 8);
  assert.ok(
    new Set(sharedCharges.map((charge) => charge.amountMinorUnits)).size >= 10,
  );
  const chargeDateTimes = sharedCharges.map((charge) =>
    (charge.chargeDate as Date).getTime(),
  );
  assert.ok(
    Math.max(...chargeDateTimes) - Math.min(...chargeDateTimes) >
      180 * 24 * 60 * 60 * 1000,
  );

  const sharedStatuses = calls.paymentRequest
    .filter((call) => call.create.relationshipId === sharedRelationshipId)
    .map((call) => String(call.create.status));
  assert.deepEqual(
    sharedStatuses.reduce<Record<string, number>>((counts, status) => {
      counts[status] = (counts[status] ?? 0) + 1;
      return counts;
    }, {}),
    {
      draft: 12,
      pending_approval: 172,
      approved: 12,
      rejected: 12,
      cancelled: 22,
    },
  );
  assert.equal(sharedStatuses.length, 230);

  const sharedRequests = calls.paymentRequest
    .map((call) => call.create)
    .filter((request) => request.relationshipId === sharedRelationshipId);
  assert.ok(
    sharedRequests.every((request) => Array.isArray(request.categories)),
  );
  assert.ok(sharedRequests.every((request) => !('category' in request)));
  assert.ok(
    sharedRequests.some(
      (request) =>
        Array.isArray(request.categories) && request.categories.length > 1,
    ),
  );
  const getAwaitingDecisionRequests = (userId: string) => {
    const decisionRequestIds = new Set(
      calls.paymentRequestDecision
        .map((call) => {
          const composite = call.where.paymentRequestId_memberUserId as Record<
            string,
            string
          >;
          return composite.memberUserId === userId
            ? composite.paymentRequestId
            : undefined;
        })
        .filter((paymentRequestId): paymentRequestId is string =>
          Boolean(paymentRequestId),
        ),
    );
    return sharedRequests.filter(
      (request) =>
        request.status === 'pending_approval' &&
        !decisionRequestIds.has(String(request.id)),
    );
  };
  const awaitingTestyRequests = getAwaitingDecisionRequests(
    FEATURED_SEED_USERS.testy.userId,
  );
  assert.equal(awaitingTestyRequests.length, 91);
  assert.ok(
    awaitingTestyRequests.every(
      (request) =>
        request.createdByUserId === FEATURED_SEED_USERS.shifty.userId,
    ),
  );
  const awaitingShiftyRequests = getAwaitingDecisionRequests(
    FEATURED_SEED_USERS.shifty.userId,
  );
  assert.equal(awaitingShiftyRequests.length, 81);
  assert.ok(
    awaitingShiftyRequests.every(
      (request) => request.createdByUserId === FEATURED_SEED_USERS.testy.userId,
    ),
  );
  for (const awaitingRequests of [
    awaitingTestyRequests,
    awaitingShiftyRequests,
  ]) {
    assert.equal(
      new Set(awaitingRequests.map((request) => String(request.title))).size,
      awaitingRequests.length,
    );
    const categories = awaitingRequests.flatMap((request) =>
      Array.isArray(request.categories) ? request.categories.map(String) : [],
    );
    assert.ok(
      awaitingRequests.every((request) => Array.isArray(request.categories)),
    );
    assert.ok(awaitingRequests.every((request) => !('category' in request)));
    assert.ok(new Set(categories).size >= 10);
    assert.ok(
      awaitingRequests.some(
        (request) =>
          Array.isArray(request.categories) && request.categories.length > 1,
      ),
    );
    const amounts = awaitingRequests.map((request) =>
      Number(request.amountMinorUnits),
    );
    assert.ok(new Set(amounts).size >= 10);
    assert.ok(amounts.length > new Set(amounts).size);
    const purchaseDateTimes = awaitingRequests.map((request) =>
      (request.purchaseDate as Date).getTime(),
    );
    assert.ok(new Set(purchaseDateTimes).size >= 80);
    assert.ok(
      Math.max(...purchaseDateTimes) - Math.min(...purchaseDateTimes) >
        60 * 24 * 60 * 60 * 1000,
    );
  }
  const sharedRequestsById = new Map(
    sharedRequests.map((request) => [String(request.id), request]),
  );
  const amounts = new Set(
    sharedRequests.map((request) => request.amountMinorUnits),
  );
  const createdAtTimes = sharedRequests.map((request) =>
    (request.createdAt as Date).getTime(),
  );
  assert.ok(amounts.size >= 10);
  assert.ok(
    Math.max(...createdAtTimes) - Math.min(...createdAtTimes) >
      2 * 365 * 24 * 60 * 60 * 1000,
  );

  for (const call of calls.paymentRequestDecision) {
    const composite = call.where.paymentRequestId_memberUserId as Record<
      string,
      string
    >;
    const request = sharedRequestsById.get(composite.paymentRequestId);
    if (request) {
      assert.ok(
        (call.create.createdAt as Date).getTime() >=
          (request.createdAt as Date).getTime(),
      );
    }
  }

  assert.deepEqual(
    FEATURED_SEED_REQUESTS.filter(
      (request) => request.relationship !== 'shared',
    ).map((request) => request.workflow),
    ['draft', 'approved', 'draft', 'approved'],
  );
  assert.ok(calls.paymentRequestDecision.length >= 10);
  assert.ok(calls.paymentRequestEvaluation.length >= 9);
  assert.ok(calls.activityEvent.length > calls.paymentRequest.length);
  assert.equal(calls.notification.length, 14);
  assert.equal(calls.relationshipJoinRequest.length, 1);
  assert.equal(calls.relationshipJoinRequest[0]?.create.status, 'pending');
  assert.equal(calls.relationshipInvitation.length, 1);
  assert.equal(calls.relationshipInvitation[0]?.create.status, 'pending');
  assert.equal(notificationDeleteManyCalls.length, 1);

  const inboxNotifications = calls.notification.map((call) => call.create);
  const expectedNotificationTargets = [
    'budget',
    'budget',
    'budget',
    'budget',
    'jointAccountCharge',
    'jointAccountCharge',
    'meTime',
    'paymentRequest',
    'paymentRequest',
    'relationship',
    'relationshipJoinRequest',
    'relationshipJoinRequest',
    'relationshipRule',
    'relationshipTask',
  ];
  const targetIdsByType: Record<string, Set<unknown>> = {
    relationship: new Set(calls.relationship.map((call) => call.create.id)),
    relationshipJoinRequest: new Set(
      calls.relationshipJoinRequest.map((call) => call.create.id),
    ),
    paymentRequest: new Set(calls.paymentRequest.map((call) => call.create.id)),
    jointAccountCharge: new Set(
      calls.jointAccountCharge.map((call) => call.create.id),
    ),
    relationshipRule: new Set(
      calls.relationshipRule.map((call) => call.create.id),
    ),
    meTime: new Set(calls.meTime.map((call) => call.create.id)),
    relationshipTask: new Set(
      calls.relationshipTask.map((call) => call.create.id),
    ),
    budget: new Set(calls.budget.map((call) => call.create.id)),
  };
  const recordsById = (records: MockUpsertInput[]) => {
    const recordsById = new Map<string, Record<string, unknown>>();
    for (const { create } of records) {
      recordsById.set(String(create.id), create);
    }
    return recordsById;
  };
  const eventRecordsByType: Record<
    string,
    Map<string, Record<string, unknown>>
  > = {
    relationship: recordsById(calls.relationshipInvitation),
    relationshipJoinRequest: recordsById(calls.relationshipJoinRequest),
    paymentRequest: recordsById(
      calls.activityEvent.filter((call) => call.create.eventType === 'created'),
    ),
    jointAccountCharge: recordsById(calls.jointAccountCharge),
    relationshipRule: recordsById(calls.relationshipRule),
    meTime: recordsById(calls.meTime),
    relationshipTask: recordsById(calls.relationshipTask),
    budget: recordsById([...calls.budget, ...calls.budgetItem]),
  };
  const expectedNotificationTitles: Record<string, string | string[]> = {
    relationship: 'New relationship invitation',
    relationshipJoinRequest: 'New relationship join request',
    paymentRequest: 'New payment request',
    jointAccountCharge: 'New joint account charge',
    relationshipRule: 'New relationship rule',
    meTime: 'New Me time entry',
    relationshipTask: 'New shared task',
    budget: [
      'New budget created',
      'New budget created',
      'New budget item added',
      'New budget item added',
    ],
  };

  for (const user of Object.values(FEATURED_SEED_USERS)) {
    const userInboxNotifications = inboxNotifications.filter(
      (notification) => notification.recipientUserId === user.userId,
    );
    assert.equal(userInboxNotifications.length, 7);
  }

  assert.equal(inboxNotifications.length, 14);
  assert.deepEqual(
    inboxNotifications
      .map((notification) => String(notification.targetType))
      .sort(),
    expectedNotificationTargets,
  );
  assert.ok(
    inboxNotifications.some((notification) => notification.readAt === null),
  );
  assert.ok(
    inboxNotifications.some((notification) => notification.readAt !== null),
  );

  for (const notification of inboxNotifications) {
    const targetType = String(notification.targetType);
    const targetIds = targetIdsByType[targetType];
    const eventRecord = eventRecordsByType[targetType]?.get(
      String(notification.eventId),
    );
    assert.ok(targetIds?.has(notification.targetId));
    assert.ok(eventRecord);
    assert.equal(notification.eventId, eventRecord.id);
    const expectedTitle = expectedNotificationTitles[targetType];
    assert.ok(expectedTitle);
    if (Array.isArray(expectedTitle)) {
      assert.ok(expectedTitle.includes(String(notification.title)));
    } else {
      assert.equal(notification.title, expectedTitle);
    }
    assert.equal(
      (notification.createdAt as Date).getTime(),
      (eventRecord.createdAt as Date).getTime(),
    );
    assert.equal(notification.deliveryStatus, 'pending');

    const expectedTargetId =
      targetType === 'relationship'
        ? eventRecord.relationshipId
        : targetType === 'paymentRequest'
          ? eventRecord.paymentRequestId
          : targetType === 'budget'
            ? eventRecord.budgetId ?? eventRecord.id
            : eventRecord.id;
    assert.equal(notification.targetId, expectedTargetId);
    if (
      targetType === 'relationshipJoinRequest' ||
      targetType === 'meTime' ||
      targetType === 'relationshipTask'
    ) {
      assert.equal(notification.targetRelationshipId, sharedRelationshipId);
    } else {
      assert.equal(notification.targetRelationshipId, null);
    }

    const creatorUserId =
      targetType === 'relationship'
        ? eventRecord.inviterUserId
        : targetType === 'relationshipJoinRequest'
          ? eventRecord.requesterUserId
          : targetType === 'paymentRequest'
            ? eventRecord.actorUserId
            : eventRecord.createdByUserId;
    if (targetType !== 'relationshipJoinRequest') {
      assert.notEqual(notification.recipientUserId, creatorUserId);
    }
  }

  const joinRequestRecipients = inboxNotifications
    .filter(
      (notification) => notification.targetType === 'relationshipJoinRequest',
    )
    .map((notification) => notification.recipientUserId)
    .sort();
  assert.deepEqual(
    joinRequestRecipients,
    Object.values(FEATURED_SEED_USERS)
      .map((user) => user.userId)
      .sort(),
  );

  const paymentRequestNotifications = inboxNotifications.filter(
    (notification) => notification.targetType === 'paymentRequest',
  );
  assert.equal(paymentRequestNotifications.length, 2);
  for (const notification of paymentRequestNotifications) {
    const activity = calls.activityEvent.find(
      (call) => call.create.id === notification.eventId,
    );
    assert.ok(activity);
    assert.equal(notification.targetId, activity.create.paymentRequestId);
  }

  const legacyNotificationFilter = notificationDeleteManyCalls[0]?.where.id as
    | { in: unknown[] }
    | undefined;
  assert.ok(legacyNotificationFilter);
  assert.ok(legacyNotificationFilter.in.length > inboxNotifications.length);

  assert.deepEqual(Object.keys(FEATURED_SEED_USERS.testy).sort(), [
    'displayName',
    'userId',
  ]);
  assert.deepEqual(Object.keys(FEATURED_SEED_USERS.shifty).sort(), [
    'displayName',
    'userId',
  ]);
});
