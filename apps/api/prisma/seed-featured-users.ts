import type { NotificationTarget } from '@expo-50sdk-template/shared-types';
import { Prisma, PrismaClient } from '@prisma/client';
import { addDays, differenceInCalendarDays, format, subYears } from 'date-fns';
import { createHash } from 'node:crypto';

import { DEFAULT_RUBRIC_QUESTIONS } from '../src/features/paymentRequests/defaultRubric';

type UserKey = 'testy' | 'shifty';
type RelationshipKey = 'shared' | 'testy' | 'shifty';
type Workflow =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled_before_submission'
  | 'cancelled_after_submission';
type SeedStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'cancelled';
type SeedActivityType =
  | 'created'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'cancelled';

type FeaturedRequestFixture = {
  relationship: RelationshipKey;
  creator: UserKey;
  title: string;
  rationale: string;
  amountMinorUnits: number;
  categories: string[];
  purchaseDaysBefore: number;
  createdDaysBefore?: number;
  workflow: Workflow;
};

type FeaturedJointAccountChargeFixture = {
  creator: UserKey;
  name: string;
  amountMinorUnits: number;
  chargeDaysBefore: number;
  status: 'paid' | 'unpaid';
};

type FeaturedMeTimeFixture = {
  relationship: RelationshipKey;
  creator: UserKey;
  startDaysBefore: number;
  createdDaysBefore: number;
  durationMinutes: number;
  description: string | null;
};

type FeaturedRelationshipTaskFixture = {
  relationship: RelationshipKey;
  creator: UserKey;
  name: string;
  createdDaysBefore: number;
  completedBy: UserKey | null;
  completedDaysBefore: number | null;
};

type FeaturedRuleFixture = {
  relationship: 'shared';
  creator: UserKey;
  name: string;
  labels: string[];
  description: string;
  createdDaysBefore: number;
  status: 'pending_approval' | 'ratified';
  ratificationDaysAfter?: number;
};

type FeaturedBudgetPeriod = 'monthly' | 'quarterly' | 'yearly';
type FeaturedBudgetStatus = 'pending_approval' | 'approved';
type BudgetSeriesKey =
  | 'groceries'
  | 'utilities'
  | 'dining'
  | 'homeMaintenance'
  | 'travel'
  | 'petCare'
  | 'personalWellness'
  | 'homeOffice'
  | 'education'
  | 'subscriptions'
  | 'carCare';

type FeaturedBudgetItemFixture = {
  creator: UserKey;
  name: string;
  amountMinorUnits: number;
  dateOffsetDays: number;
};

type FeaturedBudgetFixture = {
  seriesKey: BudgetSeriesKey;
  creator: UserKey;
  name: string;
  period: FeaturedBudgetPeriod;
  periodOffset: number;
  amountMinorUnits: number;
  status: FeaturedBudgetStatus;
  renewed: boolean;
  items: FeaturedBudgetItemFixture[];
};

type SeedActivity = {
  actorUserId: string;
  eventType: SeedActivityType;
  comment?: string;
};

type SeedDecision = {
  memberUserId: string;
  decision: 'approved' | 'rejected';
  comment?: string;
};

export type FeaturedUserSeedDatabase = Pick<
  PrismaClient,
  | 'relationship'
  | 'relationshipMember'
  | 'rubric'
  | 'rubricVersion'
  | 'paymentRequest'
  | 'paymentRequestDecision'
  | 'paymentRequestEvaluation'
  | 'activityEvent'
  | 'notification'
  | 'relationshipInvitation'
  | 'relationshipJoinRequest'
  | 'jointAccountCharge'
  | 'meTime'
  | 'relationshipTask'
  | 'relationshipRule'
  | 'relationshipRuleApproval'
  | 'budget'
  | 'budgetApproval'
  | 'budgetItem'
  | 'sexEvent'
  | 'dateNightEvent'
>;

export const FEATURED_SEED_USERS: Record<
  UserKey,
  { userId: string; displayName: string }
> = {
  testy: {
    userId: '3fd55069-03ef-4205-8373-d2e456a0524b',
    displayName: 'Testy Tester',
  },
  shifty: {
    userId: '452374b2-4f7f-421e-9a91-fdc082029d5e',
    displayName: 'Shifty Tester',
  },
};

const OBJECT_ID_PREFIXES = {
  relationship: '6724a1',
  member: '6724a2',
  rubric: '6724a3',
  rubricVersion: '6724a4',
  paymentRequest: '6724a5',
  activity: '6724a6',
  decision: '6724a7',
  evaluation: '6724a8',
  notification: '6724a9',
  relationshipJoinRequest: '6724af',
  relationshipInvitation: '6724b0',
  jointAccountCharge: '6724aa',
  relationshipRule: '6724ab',
  relationshipRuleApproval: '6724ac',
  meTime: '6724ad',
  relationshipTask: '6724ae',
  sexEvent: '6724b1',
  dateNightEvent: '6724b2',
  budgetSeries: '6724b3',
  budget: '6724b4',
  budgetApproval: '6724b5',
  budgetItem: '6724b6',
} as const;

export const FEATURED_SEED_SEX_EVENT_COUNT = 1_000;
export const FEATURED_SEED_DATE_NIGHT_EVENT_COUNT = 52;
const DATE_NIGHT_SEED_DESCRIPTIONS = [
  'Dinner at the neighborhood bistro',
  'Movie night and dessert',
  'Walk through the botanical garden',
  'Coffee and an afternoon bookstore visit',
  'Cooked dinner together at home',
  'Live music downtown',
] as const;

function fixtureObjectId(
  prefix: (typeof OBJECT_ID_PREFIXES)[keyof typeof OBJECT_ID_PREFIXES],
  sequence: number,
): string {
  return `${prefix}${sequence.toString(16).padStart(18, '0')}`;
}

const RELATIONSHIP_IDS: Record<RelationshipKey, string> = {
  shared: fixtureObjectId(OBJECT_ID_PREFIXES.relationship, 1),
  testy: fixtureObjectId(OBJECT_ID_PREFIXES.relationship, 2),
  shifty: fixtureObjectId(OBJECT_ID_PREFIXES.relationship, 3),
};

const BUDGET_SERIES_IDS: Record<BudgetSeriesKey, string> = {
  groceries: fixtureObjectId(OBJECT_ID_PREFIXES.budgetSeries, 1),
  utilities: fixtureObjectId(OBJECT_ID_PREFIXES.budgetSeries, 2),
  dining: fixtureObjectId(OBJECT_ID_PREFIXES.budgetSeries, 3),
  homeMaintenance: fixtureObjectId(OBJECT_ID_PREFIXES.budgetSeries, 4),
  travel: fixtureObjectId(OBJECT_ID_PREFIXES.budgetSeries, 5),
  petCare: fixtureObjectId(OBJECT_ID_PREFIXES.budgetSeries, 6),
  personalWellness: fixtureObjectId(OBJECT_ID_PREFIXES.budgetSeries, 7),
  homeOffice: fixtureObjectId(OBJECT_ID_PREFIXES.budgetSeries, 8),
  education: fixtureObjectId(OBJECT_ID_PREFIXES.budgetSeries, 9),
  subscriptions: fixtureObjectId(OBJECT_ID_PREFIXES.budgetSeries, 10),
  carCare: fixtureObjectId(OBJECT_ID_PREFIXES.budgetSeries, 11),
};

const RUBRIC_IDS: Record<RelationshipKey, string> = {
  shared: fixtureObjectId(OBJECT_ID_PREFIXES.rubric, 1),
  testy: fixtureObjectId(OBJECT_ID_PREFIXES.rubric, 2),
  shifty: fixtureObjectId(OBJECT_ID_PREFIXES.rubric, 3),
};

const RUBRIC_VERSION_IDS: Record<RelationshipKey, string> = {
  shared: fixtureObjectId(OBJECT_ID_PREFIXES.rubricVersion, 1),
  testy: fixtureObjectId(OBJECT_ID_PREFIXES.rubricVersion, 2),
  shifty: fixtureObjectId(OBJECT_ID_PREFIXES.rubricVersion, 3),
};

export const FEATURED_SEED_RELATIONSHIPS = [
  {
    key: 'shared',
    id: RELATIONSHIP_IDS.shared,
    name: "Testy & Shifty's Shared Home",
    shareCode: 'TSHARE26',
  },
  {
    key: 'testy',
    id: RELATIONSHIP_IDS.testy,
    name: "Testy Tester's Home",
    shareCode: 'TESTY726',
  },
  {
    key: 'shifty',
    id: RELATIONSHIP_IDS.shifty,
    name: "Shifty Tester's Home",
    shareCode: 'SHIFTY26',
  },
] as const;

const PAGINATION_PURCHASES = [
  {
    title: 'Kitchen storage containers',
    rationale: 'Replace mismatched containers used for shared meal prep.',
    categories: ['Home', 'Household'],
  },
  {
    title: 'Pantry staples',
    rationale: 'Restock ingredients for meals we cook together.',
    categories: ['Groceries', 'Household'],
  },
  {
    title: 'Living-room light bulbs',
    rationale: 'Replace burned-out bulbs in the shared living space.',
    categories: ['Maintenance', 'Home'],
  },
  {
    title: 'Board game for game night',
    rationale: 'Add a cooperative game to our shared collection.',
    categories: ['Entertainment', 'Culture'],
  },
  {
    title: 'Laundry supplies',
    rationale: 'Pick up detergent and other shared household essentials.',
    categories: ['Household', 'Home'],
  },
  {
    title: 'Balcony planter supplies',
    rationale: 'Refresh the planters and soil on the shared balcony.',
    categories: ['Garden', 'Home'],
  },
  {
    title: 'Internet equipment replacement',
    rationale: 'Replace aging equipment used by both household members.',
    categories: ['Utilities', 'Household'],
  },
  {
    title: 'First-aid cabinet restock',
    rationale: 'Replace shared first-aid items that have run out.',
    categories: ['Health', 'Household'],
  },
  {
    title: 'Weekend museum tickets',
    rationale: 'Plan a visit to the local museum together.',
    categories: ['Culture', 'Entertainment'],
  },
  {
    title: 'Seasonal home maintenance',
    rationale: 'Take care of a routine task around the shared home.',
    categories: ['Home maintenance', 'Maintenance'],
  },
] as const;

const PAGINATION_AMOUNTS = [
  725, 1299, 2499, 4999, 8750, 12999, 25999, 49900, 89999, 149999, 399999,
];
const PAGINATION_WORKFLOWS: Workflow[] = [
  'draft',
  'pending',
  'approved',
  'rejected',
  'cancelled_after_submission',
  'cancelled_before_submission',
];
const AWAITING_DECISION_REQUEST_COUNT = 80;

function createPaginationRequestFixtures(): FeaturedRequestFixture[] {
  return Array.from({ length: 60 }, (_, index) => {
    const purchase = PAGINATION_PURCHASES[index % PAGINATION_PURCHASES.length];
    const sequence = index + 1;
    return {
      relationship: 'shared',
      creator: index % 2 === 0 ? 'testy' : 'shifty',
      title: `${purchase.title} ${String(sequence).padStart(2, '0')}`,
      rationale: purchase.rationale,
      amountMinorUnits:
        PAGINATION_AMOUNTS[(index * 7) % PAGINATION_AMOUNTS.length],
      categories: [...purchase.categories],
      purchaseDaysBefore: 1 + ((index * 11) % 90),
      createdDaysBefore: 30 + index * 18,
      workflow: PAGINATION_WORKFLOWS[index % PAGINATION_WORKFLOWS.length],
    };
  });
}

function createAwaitingDecisionRequestFixtures(
  creator: UserKey,
): FeaturedRequestFixture[] {
  return Array.from({ length: AWAITING_DECISION_REQUEST_COUNT }, (_, index) => {
    const purchase = PAGINATION_PURCHASES[index % PAGINATION_PURCHASES.length];
    const sequence = index + 1;
    const creatorName = creator === 'testy' ? 'Testy' : 'Shifty';
    return {
      relationship: 'shared',
      creator,
      title: `${creatorName} pagination test ${String(sequence).padStart(2, '0')}: ${purchase.title}`,
      rationale: purchase.rationale,
      amountMinorUnits: PAGINATION_AMOUNTS[index % PAGINATION_AMOUNTS.length],
      categories: [...purchase.categories],
      purchaseDaysBefore: 1 + ((index * 11) % 90),
      createdDaysBefore: sequence / 100,
      workflow: 'pending',
    };
  });
}

export const FEATURED_SEED_REQUESTS: FeaturedRequestFixture[] = [
  {
    relationship: 'shared',
    creator: 'testy',
    title: 'Weekend farmers market groceries',
    rationale: 'Fresh produce and pantry staples for meals we will share.',
    amountMinorUnits: 8642,
    categories: ['Groceries', 'Household'],
    purchaseDaysBefore: 1,
    workflow: 'draft',
  },
  {
    relationship: 'shared',
    creator: 'shifty',
    title: 'Entryway shoe rack',
    rationale: 'A compact rack will keep our shared entryway organized.',
    amountMinorUnits: 7299,
    categories: ['Home', 'Household'],
    purchaseDaysBefore: 3,
    workflow: 'draft',
  },
  {
    relationship: 'shared',
    creator: 'testy',
    title: 'Replacement laptop for home office',
    rationale:
      'The old computer is no longer reliable for shared household tasks.',
    amountMinorUnits: 119900,
    categories: ['Electronics', 'Home office'],
    purchaseDaysBefore: 8,
    workflow: 'pending',
  },
  {
    relationship: 'shared',
    creator: 'shifty',
    title: 'Patio herb garden supplies',
    rationale: 'Planters and soil for the small patio garden we both use.',
    amountMinorUnits: 5380,
    categories: ['Home', 'Garden'],
    purchaseDaysBefore: 5,
    workflow: 'pending',
  },
  {
    relationship: 'shared',
    creator: 'testy',
    title: 'Living-room reading lamp',
    rationale: 'A warm, efficient lamp for the shared reading corner.',
    amountMinorUnits: 12450,
    categories: ['Home', 'Household'],
    purchaseDaysBefore: 14,
    workflow: 'approved',
  },
  {
    relationship: 'shared',
    creator: 'shifty',
    title: 'Annual home maintenance visit',
    rationale: 'Routine maintenance helps keep shared appliances working well.',
    amountMinorUnits: 18500,
    categories: ['Maintenance', 'Home'],
    purchaseDaysBefore: 11,
    workflow: 'approved',
  },
  {
    relationship: 'shared',
    creator: 'testy',
    title: 'Premium smart speaker bundle',
    rationale: 'The requested bundle exceeds the shared budget for this month.',
    amountMinorUnits: 39999,
    categories: ['Electronics', 'Entertainment'],
    purchaseDaysBefore: 9,
    workflow: 'rejected',
  },
  {
    relationship: 'shared',
    creator: 'shifty',
    title: 'Duplicate streaming subscription',
    rationale:
      'We already have an active service that covers the same content.',
    amountMinorUnits: 1599,
    categories: ['Subscriptions', 'Entertainment'],
    purchaseDaysBefore: 7,
    workflow: 'rejected',
  },
  {
    relationship: 'shared',
    creator: 'testy',
    title: 'Monthly shared storage plan',
    rationale: 'We found a different plan that better fits our needs.',
    amountMinorUnits: 999,
    categories: ['Subscriptions', 'Technology'],
    purchaseDaysBefore: 2,
    workflow: 'cancelled_after_submission',
  },
  {
    relationship: 'shared',
    creator: 'shifty',
    title: 'Wireless headphones',
    rationale: 'I decided not to proceed with this personal-use purchase.',
    amountMinorUnits: 8999,
    categories: ['Electronics', 'Personal'],
    purchaseDaysBefore: 4,
    workflow: 'cancelled_before_submission',
  },
  {
    relationship: 'testy',
    creator: 'testy',
    title: 'Testy’s desk organizer',
    rationale: 'A small organizer for my personal workspace.',
    amountMinorUnits: 3499,
    categories: ['Personal', 'Home office'],
    purchaseDaysBefore: 2,
    workflow: 'draft',
  },
  {
    relationship: 'testy',
    creator: 'testy',
    title: 'Testy’s running shoes',
    rationale: 'Replacement shoes for my regular running route.',
    amountMinorUnits: 11900,
    categories: ['Personal', 'Health'],
    purchaseDaysBefore: 12,
    workflow: 'approved',
  },
  {
    relationship: 'shifty',
    creator: 'shifty',
    title: 'Shifty’s sketchbook set',
    rationale: 'A set of sketchbooks for my personal art projects.',
    amountMinorUnits: 2795,
    categories: ['Personal', 'Culture'],
    purchaseDaysBefore: 3,
    workflow: 'draft',
  },
  {
    relationship: 'shifty',
    creator: 'shifty',
    title: 'Shifty’s bicycle tune-up',
    rationale: 'A routine tune-up for my personal bicycle.',
    amountMinorUnits: 6800,
    categories: ['Personal', 'Maintenance'],
    purchaseDaysBefore: 10,
    workflow: 'approved',
  },
  ...createPaginationRequestFixtures(),
  ...createAwaitingDecisionRequestFixtures('shifty'),
  ...createAwaitingDecisionRequestFixtures('testy'),
];

const RULE_NAME_TEMPLATES = [
  'Quiet hours',
  'Shared chores',
  'Household budget',
  'Guest visits',
  'Digital downtime',
  'Weekly planning',
  'Grocery shopping',
  'Pet care',
  'Shared spaces',
  'Personal belongings',
  'Family visits',
  'Travel planning',
] as const;
const RULE_LABELS = [
  'Communication',
  'Home',
  'Budget',
  'Guests',
  'Digital wellbeing',
  'Planning',
  'Shopping',
  'Pets',
  'Boundaries',
  'Travel',
] as const;
const RULE_DESCRIPTIONS = [
  'Use low-noise activities after 10 PM on weeknights.',
  'Alternate weekly cleaning tasks and track them in the shared home.',
  'Discuss shared purchases above the agreed household budget before buying.',
  'Give each other advance notice before inviting overnight guests.',
  'Keep phones away during our shared evening meal.',
  'Review the weekly schedule together every Sunday afternoon.',
  'Ask before borrowing the other member’s personal items.',
  'Plan pet feeding and walks on the shared calendar.',
  'Set a monthly grocery target and review shared receipts together.',
  'Ask before sharing relationship photos on social platforms.',
  'Make a plan together before committing to travel dates.',
  'Leave common areas ready for the next person to use.',
] as const;
const FEATURED_RULE_COUNT = 80;

export const FEATURED_SEED_RULES: FeaturedRuleFixture[] = Array.from(
  { length: FEATURED_RULE_COUNT },
  (_, index) => {
    const sequence = index + 1;
    const status = index % 5 === 0 ? 'pending_approval' : 'ratified';

    return {
      relationship: 'shared',
      creator: index % 2 === 0 ? 'testy' : 'shifty',
      name: `${RULE_NAME_TEMPLATES[index % RULE_NAME_TEMPLATES.length]} ${String(sequence).padStart(3, '0')}`,
      labels:
        index % 10 === 0
          ? []
          : [
              RULE_LABELS[(index * 3) % RULE_LABELS.length],
              RULE_LABELS[(index * 3 + 1) % RULE_LABELS.length],
            ],
      description: `${RULE_DESCRIPTIONS[index % RULE_DESCRIPTIONS.length]} Seed scenario ${String(sequence).padStart(3, '0')}.`,
      createdDaysBefore: 30 + index * 6,
      status,
      ...(status === 'ratified'
        ? { ratificationDaysAfter: 1 + ((index * 7) % 7) }
        : {}),
    };
  },
);

const JOINT_ACCOUNT_CHARGE_NAMES = [
  'Farmers market groceries',
  'Electricity bill',
  'Plumbing repair',
  'Pet supplies',
  'Pharmacy prescription',
  'Parking and tolls',
  'Cleaning supplies',
  'Shared dinner ingredients',
] as const;
const JOINT_ACCOUNT_CHARGE_AMOUNTS_MINOR_UNITS = [
  1299, 1899, 2450, 3799, 4999, 7250, 8999, 12450, 21900, 78500,
] as const;

export const FEATURED_SEED_JOINT_ACCOUNT_CHARGES: FeaturedJointAccountChargeFixture[] =
  Array.from({ length: 32 }, (_, index) => ({
    creator: index % 2 === 0 ? 'testy' : 'shifty',
    name: `${JOINT_ACCOUNT_CHARGE_NAMES[Math.floor(index / 4)]} ${String(index + 1).padStart(2, '0')}`,
    amountMinorUnits:
      JOINT_ACCOUNT_CHARGE_AMOUNTS_MINOR_UNITS[
        index % JOINT_ACCOUNT_CHARGE_AMOUNTS_MINOR_UNITS.length
      ],
    chargeDaysBefore: index * 7,
    status: index % 4 < 2 ? 'unpaid' : 'paid',
  }));

const ME_TIME_ACTIVITIES = [
  'Read a novel',
  'Take a morning walk',
  'Practice meditation',
  'Work on a sketch',
  'Tend the garden',
  'Listen to a podcast',
  'Practice yoga',
  'Play guitar',
  'Enjoy a quiet coffee',
  'Write in a journal',
] as const;
const ME_TIME_DURATIONS_MINUTES = [15, 30, 45, 60, 90, 120, 180] as const;
const SHARED_ME_TIME_ENTRY_COUNT = 80;
const PERSONAL_TIME_ENTRY_COUNT = 24;
const SHARED_ME_TIME_CLUSTER_DAY_COUNT = 3;
const SHARED_ME_TIME_ENTRIES_PER_CLUSTER_DAY = 10;

function getSharedMeTimeStartDaysBefore(index: number) {
  const clusteredEntryCount =
    SHARED_ME_TIME_CLUSTER_DAY_COUNT * SHARED_ME_TIME_ENTRIES_PER_CLUSTER_DAY;
  return index < clusteredEntryCount
    ? 1 + Math.floor(index / SHARED_ME_TIME_ENTRIES_PER_CLUSTER_DAY)
    : 1 + index * 5;
}

function createMeTimeFixture(
  relationship: RelationshipKey,
  creator: UserKey,
  sequence: number,
  startDaysBefore: number,
): FeaturedMeTimeFixture {
  return {
    relationship,
    creator,
    startDaysBefore,
    createdDaysBefore: Math.max(0, startDaysBefore - 1 - (sequence % 3)),
    durationMinutes:
      ME_TIME_DURATIONS_MINUTES[sequence % ME_TIME_DURATIONS_MINUTES.length],
    description:
      sequence % 9 === 0
        ? null
        : `${ME_TIME_ACTIVITIES[sequence % ME_TIME_ACTIVITIES.length]} ${String(sequence).padStart(3, '0')}`,
  };
}

export const FEATURED_SEED_ME_TIME_ENTRIES: FeaturedMeTimeFixture[] = [
  ...Array.from({ length: SHARED_ME_TIME_ENTRY_COUNT }, (_, index) => {
    const sequence = index + 1;
    return createMeTimeFixture(
      'shared',
      index % 2 === 0 ? 'testy' : 'shifty',
      sequence,
      getSharedMeTimeStartDaysBefore(index),
    );
  }),
  ...(['testy', 'shifty'] as const).flatMap((user, userIndex) =>
    Array.from({ length: PERSONAL_TIME_ENTRY_COUNT }, (_, index) =>
      createMeTimeFixture(
        user,
        user,
        SHARED_ME_TIME_ENTRY_COUNT +
          userIndex * PERSONAL_TIME_ENTRY_COUNT +
          index +
          1,
        1 + userIndex * 2 + index * 7,
      ),
    ),
  ),
];

const RELATIONSHIP_TASK_NAME_TEMPLATES = [
  'Water the houseplants',
  'Plan the weekly meals',
  'Take out the recycling',
  'Restock pet supplies',
  'Clean the refrigerator',
  'Update the grocery list',
  'Check the smoke alarms',
  'Sort the shared mail',
  'Change the air filters',
  'Tidy the entryway',
  'Schedule home maintenance',
  'Organize the pantry',
] as const;

export const FEATURED_SEED_TASKS: FeaturedRelationshipTaskFixture[] = [
  ...Array.from({ length: 80 }, (_, index) => {
    const creator = index % 2 === 0 ? 'testy' : 'shifty';
    const completedBy =
      index % 5 === 0 ? null : index % 3 === 0 ? creator : otherUser(creator);

    return {
      relationship: 'shared',
      creator,
      name: `${RELATIONSHIP_TASK_NAME_TEMPLATES[index % RELATIONSHIP_TASK_NAME_TEMPLATES.length]} ${String(index + 1).padStart(3, '0')}`,
      createdDaysBefore: 90 + index * 3,
      completedBy,
      completedDaysBefore: completedBy === null ? null : index % 45,
    } satisfies FeaturedRelationshipTaskFixture;
  }),
  ...(['testy', 'shifty'] as const).flatMap((user, userIndex) =>
    Array.from({ length: PERSONAL_TIME_ENTRY_COUNT }, (_, index) => {
      const completedBy = index % 4 === 0 ? null : user;
      return {
        relationship: user,
        creator: user,
        name: `${RELATIONSHIP_TASK_NAME_TEMPLATES[(index + userIndex) % RELATIONSHIP_TASK_NAME_TEMPLATES.length]} ${String(index + 1).padStart(2, '0')}`,
        createdDaysBefore: 30 + index * 3,
        completedBy,
        completedDaysBefore: completedBy === null ? null : index % 20,
      } satisfies FeaturedRelationshipTaskFixture;
    }),
  ),
];

export const FEATURED_SEED_BUDGETS: FeaturedBudgetFixture[] = [
  {
    seriesKey: 'groceries',
    creator: 'testy',
    name: 'Household groceries',
    period: 'monthly',
    periodOffset: -1,
    amountMinorUnits: 85_000,
    status: 'approved',
    renewed: true,
    items: [
      {
        creator: 'testy',
        name: 'Produce and pantry staples',
        amountMinorUnits: 12_450,
        dateOffsetDays: 3,
      },
      {
        creator: 'shifty',
        name: 'Bulk grains and beans',
        amountMinorUnits: 8_350,
        dateOffsetDays: 7,
      },
      {
        creator: 'testy',
        name: 'Dairy and eggs',
        amountMinorUnits: 4_760,
        dateOffsetDays: 10,
      },
      {
        creator: 'shifty',
        name: 'Freezer meals',
        amountMinorUnits: 15_999,
        dateOffsetDays: 16,
      },
      {
        creator: 'testy',
        name: 'Household paper goods',
        amountMinorUnits: 8_300,
        dateOffsetDays: 22,
      },
    ],
  },
  {
    seriesKey: 'groceries',
    creator: 'testy',
    name: 'Household groceries',
    period: 'monthly',
    periodOffset: 0,
    amountMinorUnits: 90_000,
    status: 'approved',
    renewed: false,
    items: [
      {
        creator: 'testy',
        name: 'Fresh produce',
        amountMinorUnits: 8_450,
        dateOffsetDays: 2,
      },
      {
        creator: 'shifty',
        name: 'Pantry restock',
        amountMinorUnits: 6_200,
        dateOffsetDays: 4,
      },
      {
        creator: 'testy',
        name: 'Dairy and eggs',
        amountMinorUnits: 4_350,
        dateOffsetDays: 6,
      },
      {
        creator: 'shifty',
        name: 'Bakery and snacks',
        amountMinorUnits: 3_200,
        dateOffsetDays: 9,
      },
      {
        creator: 'testy',
        name: 'Cleaning supplies',
        amountMinorUnits: 7_600,
        dateOffsetDays: 12,
      },
      {
        creator: 'shifty',
        name: 'Household staples',
        amountMinorUnits: 12_350,
        dateOffsetDays: 16,
      },
      {
        creator: 'testy',
        name: 'Monthly bulk order',
        amountMinorUnits: 24_900,
        dateOffsetDays: 22,
      },
    ],
  },
  {
    seriesKey: 'utilities',
    creator: 'shifty',
    name: 'Utilities and internet',
    period: 'monthly',
    periodOffset: -1,
    amountMinorUnits: 42_000,
    status: 'approved',
    renewed: true,
    items: [
      {
        creator: 'shifty',
        name: 'Electricity',
        amountMinorUnits: 8_200,
        dateOffsetDays: 4,
      },
      {
        creator: 'testy',
        name: 'Internet service',
        amountMinorUnits: 6_500,
        dateOffsetDays: 12,
      },
      {
        creator: 'shifty',
        name: 'Water and sewer',
        amountMinorUnits: 5_400,
        dateOffsetDays: 22,
      },
    ],
  },
  {
    seriesKey: 'utilities',
    creator: 'shifty',
    name: 'Utilities and internet',
    period: 'monthly',
    periodOffset: 0,
    amountMinorUnits: 45_000,
    status: 'approved',
    renewed: false,
    items: [
      {
        creator: 'shifty',
        name: 'Electricity',
        amountMinorUnits: 11_500,
        dateOffsetDays: 3,
      },
      {
        creator: 'testy',
        name: 'Internet service',
        amountMinorUnits: 6_800,
        dateOffsetDays: 8,
      },
      {
        creator: 'shifty',
        name: 'Water and sewer',
        amountMinorUnits: 4_900,
        dateOffsetDays: 14,
      },
      {
        creator: 'testy',
        name: 'Heating',
        amountMinorUnits: 8_500,
        dateOffsetDays: 21,
      },
    ],
  },
  {
    seriesKey: 'dining',
    creator: 'shifty',
    name: 'Dining out',
    period: 'monthly',
    periodOffset: 0,
    amountMinorUnits: 35_000,
    status: 'pending_approval',
    renewed: false,
    items: [],
  },
  {
    seriesKey: 'homeMaintenance',
    creator: 'testy',
    name: 'Home maintenance',
    period: 'quarterly',
    periodOffset: -1,
    amountMinorUnits: 150_000,
    status: 'approved',
    renewed: true,
    items: [
      {
        creator: 'testy',
        name: 'Plumbing repair',
        amountMinorUnits: 22_500,
        dateOffsetDays: 8,
      },
      {
        creator: 'shifty',
        name: 'Air filters',
        amountMinorUnits: 4_500,
        dateOffsetDays: 30,
      },
      {
        creator: 'testy',
        name: 'Light fixtures',
        amountMinorUnits: 17_999,
        dateOffsetDays: 58,
      },
    ],
  },
  {
    seriesKey: 'homeMaintenance',
    creator: 'testy',
    name: 'Home maintenance',
    period: 'quarterly',
    periodOffset: 0,
    amountMinorUnits: 180_000,
    status: 'approved',
    renewed: false,
    items: [
      {
        creator: 'testy',
        name: 'HVAC inspection',
        amountMinorUnits: 18_900,
        dateOffsetDays: 3,
      },
      {
        creator: 'shifty',
        name: 'Paint supplies',
        amountMinorUnits: 7_200,
        dateOffsetDays: 12,
      },
      {
        creator: 'testy',
        name: 'Hardware store repairs',
        amountMinorUnits: 12_350,
        dateOffsetDays: 28,
      },
      {
        creator: 'shifty',
        name: 'Lawn care',
        amountMinorUnits: 15_000,
        dateOffsetDays: 47,
      },
      {
        creator: 'testy',
        name: 'Water filter replacement',
        amountMinorUnits: 6_100,
        dateOffsetDays: 72,
      },
    ],
  },
  {
    seriesKey: 'travel',
    creator: 'shifty',
    name: 'Travel and weekends',
    period: 'yearly',
    periodOffset: -1,
    amountMinorUnits: 420_000,
    status: 'approved',
    renewed: true,
    items: [
      {
        creator: 'shifty',
        name: 'Cabin weekend',
        amountMinorUnits: 88_900,
        dateOffsetDays: 35,
      },
      {
        creator: 'testy',
        name: 'Train tickets',
        amountMinorUnits: 45_000,
        dateOffsetDays: 95,
      },
      {
        creator: 'shifty',
        name: 'Museum passes',
        amountMinorUnits: 20_999,
        dateOffsetDays: 170,
      },
      {
        creator: 'testy',
        name: 'Road trip lodging',
        amountMinorUnits: 45_000,
        dateOffsetDays: 260,
      },
    ],
  },
  {
    seriesKey: 'travel',
    creator: 'shifty',
    name: 'Travel and weekends',
    period: 'yearly',
    periodOffset: 0,
    amountMinorUnits: 500_000,
    status: 'approved',
    renewed: false,
    items: [
      {
        creator: 'shifty',
        name: 'Spring lodging deposit',
        amountMinorUnits: 129_900,
        dateOffsetDays: 22,
      },
      {
        creator: 'testy',
        name: 'Flight tickets',
        amountMinorUnits: 43_900,
        dateOffsetDays: 62,
      },
      {
        creator: 'shifty',
        name: 'Weekend activities',
        amountMinorUnits: 32_500,
        dateOffsetDays: 115,
      },
      {
        creator: 'testy',
        name: 'Rental car',
        amountMinorUnits: 67_900,
        dateOffsetDays: 180,
      },
      {
        creator: 'shifty',
        name: 'Summer accommodation',
        amountMinorUnits: 54_250,
        dateOffsetDays: 245,
      },
      {
        creator: 'testy',
        name: 'Travel insurance',
        amountMinorUnits: 28_999,
        dateOffsetDays: 310,
      },
    ],
  },
  {
    seriesKey: 'petCare',
    creator: 'testy',
    name: 'Pet care',
    period: 'quarterly',
    periodOffset: 0,
    amountMinorUnits: 75_000,
    status: 'approved',
    renewed: false,
    items: [
      {
        creator: 'testy',
        name: 'Food and treats',
        amountMinorUnits: 4_500,
        dateOffsetDays: 9,
      },
      {
        creator: 'shifty',
        name: 'Leash replacement',
        amountMinorUnits: 1_299,
        dateOffsetDays: 20,
      },
      {
        creator: 'testy',
        name: 'Grooming supplies',
        amountMinorUnits: 2_599,
        dateOffsetDays: 38,
      },
      {
        creator: 'shifty',
        name: 'Routine checkup',
        amountMinorUnits: 6_800,
        dateOffsetDays: 61,
      },
      {
        creator: 'testy',
        name: 'Pet sitter',
        amountMinorUnits: 17_500,
        dateOffsetDays: 82,
      },
    ],
  },
  {
    seriesKey: 'personalWellness',
    creator: 'testy',
    name: 'Wellness and fitness',
    period: 'yearly',
    periodOffset: 0,
    amountMinorUnits: 120_000,
    status: 'approved',
    renewed: false,
    items: [
      {
        creator: 'testy',
        name: 'Fitness class pass',
        amountMinorUnits: 1_999,
        dateOffsetDays: 12,
      },
      {
        creator: 'shifty',
        name: 'Running shoes',
        amountMinorUnits: 8_900,
        dateOffsetDays: 47,
      },
      {
        creator: 'testy',
        name: 'Yoga equipment',
        amountMinorUnits: 3_150,
        dateOffsetDays: 114,
      },
      {
        creator: 'shifty',
        name: 'Wellness workshop',
        amountMinorUnits: 5_500,
        dateOffsetDays: 221,
      },
    ],
  },
  {
    seriesKey: 'homeOffice',
    creator: 'testy',
    name: 'Home office upgrades',
    period: 'quarterly',
    periodOffset: 0,
    amountMinorUnits: 250_000,
    status: 'pending_approval',
    renewed: false,
    items: [],
  },
  {
    seriesKey: 'education',
    creator: 'shifty',
    name: 'Learning and books',
    period: 'yearly',
    periodOffset: 0,
    amountMinorUnits: 160_000,
    status: 'pending_approval',
    renewed: false,
    items: [],
  },
  {
    seriesKey: 'subscriptions',
    creator: 'shifty',
    name: 'Annual subscriptions',
    period: 'yearly',
    periodOffset: 0,
    amountMinorUnits: 120_000,
    status: 'approved',
    renewed: false,
    items: [
      {
        creator: 'shifty',
        name: 'Music service',
        amountMinorUnits: 1_299,
        dateOffsetDays: 15,
      },
      {
        creator: 'testy',
        name: 'Cloud storage',
        amountMinorUnits: 799,
        dateOffsetDays: 45,
      },
      {
        creator: 'shifty',
        name: 'Password manager',
        amountMinorUnits: 1_499,
        dateOffsetDays: 95,
      },
      {
        creator: 'testy',
        name: 'Streaming service',
        amountMinorUnits: 1_999,
        dateOffsetDays: 145,
      },
      {
        creator: 'shifty',
        name: 'Domain renewal',
        amountMinorUnits: 4_999,
        dateOffsetDays: 245,
      },
    ],
  },
  {
    seriesKey: 'carCare',
    creator: 'shifty',
    name: 'Car maintenance',
    period: 'quarterly',
    periodOffset: 0,
    amountMinorUnits: 90_000,
    status: 'approved',
    renewed: false,
    items: [
      {
        creator: 'shifty',
        name: 'Oil change',
        amountMinorUnits: 1_890,
        dateOffsetDays: 5,
      },
      {
        creator: 'testy',
        name: 'Tire rotation',
        amountMinorUnits: 5_100,
        dateOffsetDays: 23,
      },
      {
        creator: 'shifty',
        name: 'Wiper blades',
        amountMinorUnits: 2_499,
        dateOffsetDays: 41,
      },
      {
        creator: 'testy',
        name: 'Seasonal service',
        amountMinorUnits: 32_000,
        dateOffsetDays: 68,
      },
    ],
  },
];

const statusForWorkflow: Record<Workflow, SeedStatus> = {
  draft: 'draft',
  pending: 'pending_approval',
  approved: 'approved',
  rejected: 'rejected',
  cancelled_before_submission: 'cancelled',
  cancelled_after_submission: 'cancelled',
};

function otherUser(user: UserKey): UserKey {
  return user === 'testy' ? 'shifty' : 'testy';
}

function getSeedBudgetPeriodRange(
  period: FeaturedBudgetPeriod,
  periodOffset: number,
  seededAt: Date,
) {
  const monthCount = period === 'monthly' ? 1 : period === 'quarterly' ? 3 : 12;
  const currentStartMonth =
    period === 'monthly'
      ? seededAt.getUTCMonth()
      : period === 'quarterly'
        ? Math.floor(seededAt.getUTCMonth() / 3) * 3
        : 0;
  const start = new Date(
    Date.UTC(
      seededAt.getUTCFullYear(),
      currentStartMonth + periodOffset * monthCount,
      1,
    ),
  );
  const end = new Date(
    Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth() + monthCount,
      0,
      23,
      59,
      59,
      999,
    ),
  );
  return { start, end };
}

function getFeaturedBudgetSeedRows(seededAt: Date) {
  let itemSequence = 0;
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return FEATURED_SEED_BUDGETS.map((fixture, index) => {
    const { start, end } = getSeedBudgetPeriodRange(
      fixture.period,
      fixture.periodOffset,
      seededAt,
    );
    const id = fixtureObjectId(OBJECT_ID_PREFIXES.budget, index + 1);
    const createdByUserId = FEATURED_SEED_USERS[fixture.creator].userId;
    const approverUserId =
      FEATURED_SEED_USERS[otherUser(fixture.creator)].userId;
    const createdAt = start;
    const renewedAt = fixture.renewed ? seededAt : null;
    const approvedAt =
      fixture.status === 'approved'
        ? new Date(
            Math.min(seededAt.getTime(), createdAt.getTime() + 60 * 60 * 1000),
          )
        : null;
    const data = {
      createdAt,
      updatedAt: renewedAt ?? createdAt,
      relationshipId: RELATIONSHIP_IDS.shared,
      seriesId: BUDGET_SERIES_IDS[fixture.seriesKey],
      createdByUserId,
      updatedByUserId: null,
      name: fixture.name,
      amountMinorUnits: fixture.amountMinorUnits,
      period: fixture.period,
      periodStart: start,
      periodEnd: end,
      renewedAt,
      status: fixture.status,
    };
    const approval = {
      id: fixtureObjectId(OBJECT_ID_PREFIXES.budgetApproval, index + 1),
      data: {
        createdAt,
        updatedAt: approvedAt ?? createdAt,
        budgetId: id,
        memberUserId: approverUserId,
        approvedAt,
      },
    };
    const items = fixture.items.map((item) => {
      const itemDate = new Date(
        start.getTime() + item.dateOffsetDays * millisecondsPerDay,
      );
      if (itemDate > end) {
        throw new Error(
          `Featured budget item "${item.name}" is outside its budget period.`,
        );
      }
      itemSequence += 1;
      const itemCreatedAt = new Date(
        Math.min(
          seededAt.getTime(),
          Math.max(createdAt.getTime(), itemDate.getTime() + 60 * 60 * 1000),
        ),
      );
      return {
        id: fixtureObjectId(OBJECT_ID_PREFIXES.budgetItem, itemSequence),
        fixture: item,
        data: {
          createdAt: itemCreatedAt,
          budgetId: id,
          createdByUserId: FEATURED_SEED_USERS[item.creator].userId,
          name: item.name,
          amountMinorUnits: item.amountMinorUnits,
          date: itemDate,
        },
      };
    });

    if (fixture.status !== 'approved' && items.length > 0) {
      throw new Error(
        `Featured pending budget "${fixture.name}" cannot contain items.`,
      );
    }

    return { id, fixture, data, approval, items };
  });
}

type FeaturedBudgetSeedRow = ReturnType<
  typeof getFeaturedBudgetSeedRows
>[number];

function isSubmitted(workflow: Workflow): boolean {
  return workflow !== 'draft' && workflow !== 'cancelled_before_submission';
}

function isResolved(workflow: Workflow): boolean {
  return (
    workflow === 'approved' ||
    workflow === 'rejected' ||
    workflow === 'cancelled_before_submission' ||
    workflow === 'cancelled_after_submission'
  );
}

function getRequestCreatedAt(
  request: FeaturedRequestFixture,
  sequence: number,
) {
  if (request.createdDaysBefore !== undefined) {
    return new Date(
      Date.UTC(2026, 9, 25, 16) -
        request.createdDaysBefore * 24 * 60 * 60 * 1000,
    );
  }
  return new Date(Date.UTC(2026, 9, 1 + sequence, 16));
}

function getActivities(
  request: FeaturedRequestFixture,
  sequence: number,
): {
  id: string;
  actorUserId: string;
  eventType: SeedActivityType;
  metadata: Prisma.InputJsonValue;
  createdAt: Date;
}[] {
  const creatorId = FEATURED_SEED_USERS[request.creator].userId;
  const activities: SeedActivity[] = [
    { actorUserId: creatorId, eventType: 'created' },
  ];

  if (isSubmitted(request.workflow)) {
    activities.push({ actorUserId: creatorId, eventType: 'submitted' });
  }

  if (request.workflow === 'approved' && request.relationship === 'shared') {
    activities.push({
      actorUserId: FEATURED_SEED_USERS[otherUser(request.creator)].userId,
      eventType: 'approved',
      comment: 'Approved for the shared household.',
    });
  } else if (request.workflow === 'rejected') {
    activities.push({
      actorUserId: FEATURED_SEED_USERS[otherUser(request.creator)].userId,
      eventType: 'rejected',
      comment: 'This purchase is not a fit for the shared budget.',
    });
  } else if (request.workflow.startsWith('cancelled_')) {
    activities.push({ actorUserId: creatorId, eventType: 'cancelled' });
  }

  const createdAt = getRequestCreatedAt(request, sequence);
  return activities.map((activity, index) => {
    const eventCreatedAt = new Date(
      createdAt.getTime() + index * 5 * 60 * 1000,
    );
    return {
      id: fixtureObjectId(
        OBJECT_ID_PREFIXES.activity,
        sequence * 10 + index + 1,
      ),
      actorUserId: activity.actorUserId,
      eventType: activity.eventType,
      metadata: activity.comment ? { comment: activity.comment } : {},
      createdAt: eventCreatedAt,
    };
  });
}

function getDecisions(
  request: FeaturedRequestFixture,
  sequence: number,
): {
  id: string;
  memberUserId: string;
  decision: 'approved' | 'rejected';
  comment: string | null;
  createdAt: Date;
}[] {
  if (!isSubmitted(request.workflow)) return [];

  const creatorId = FEATURED_SEED_USERS[request.creator].userId;
  const reviewerId = FEATURED_SEED_USERS[otherUser(request.creator)].userId;
  const decisions: SeedDecision[] = [
    { memberUserId: creatorId, decision: 'approved' },
  ];
  if (request.workflow === 'approved' && request.relationship === 'shared') {
    decisions.push({
      memberUserId: reviewerId,
      decision: 'approved',
      comment: 'Approved for the shared household.',
    });
  } else if (request.workflow === 'rejected') {
    decisions.push({
      memberUserId: reviewerId,
      decision: 'rejected',
      comment: 'This purchase is not a fit for the shared budget.',
    });
  }

  const createdAt = new Date(
    getRequestCreatedAt(request, sequence).getTime() + 5 * 60 * 1000,
  );
  return decisions.map((decision, index) => ({
    id: fixtureObjectId(OBJECT_ID_PREFIXES.decision, sequence * 10 + index + 1),
    memberUserId: decision.memberUserId,
    decision: decision.decision,
    comment: decision.comment ?? null,
    createdAt: new Date(createdAt.getTime() + index * 5 * 60 * 1000),
  }));
}

type FeaturedInboxNotificationFixture = {
  recipientUserId: string;
  eventId: string;
  target: NotificationTarget;
  title: string;
  body: string;
  createdAt: Date;
  readAt: Date | null;
};

type InboxNotificationSeedContext = {
  invitationId: string;
  invitationCreatedAt: Date;
  joinRequestId: string;
  joinRequestCreatedAt: Date;
  chargeCreatedAt: Date;
  timeSeededAt: number;
  rulesSeededAt: number;
  budgetSeedRows: FeaturedBudgetSeedRow[];
  seededAt: number;
};

function notificationReadAt(createdAt: Date, seededAt: number): Date | null {
  const readAt = new Date(createdAt.getTime() + 60 * 60 * 1000);
  return readAt.getTime() < seededAt ? readAt : null;
}

function getBudgetInboxNotificationFixtures(
  budgetSeedRows: FeaturedBudgetSeedRow[],
  seededAt: number,
): FeaturedInboxNotificationFixture[] {
  const notifications: FeaturedInboxNotificationFixture[] = [];
  const currentApprovedBudgets = budgetSeedRows.filter(
    (row) =>
      row.fixture.periodOffset === 0 && row.fixture.status === 'approved',
  );

  for (const creator of ['testy', 'shifty'] as const) {
    const budget = currentApprovedBudgets.find(
      (row) =>
        row.fixture.creator === creator &&
        !budgetSeedRows.some(
          (candidate) =>
            candidate.fixture.seriesKey === row.fixture.seriesKey &&
            candidate.fixture.periodOffset < row.fixture.periodOffset,
        ),
    );
    const itemEntry = currentApprovedBudgets
      .flatMap((row) =>
        row.items.map((item) => ({
          budget: row,
          item,
        })),
      )
      .find(({ item }) => item.fixture.creator === creator);
    if (!budget || !itemEntry) {
      throw new Error(
        `Featured seed requires an approved budget and item for ${creator}.`,
      );
    }

    notifications.push(
      {
        recipientUserId: FEATURED_SEED_USERS[otherUser(creator)].userId,
        eventId: budget.id,
        target: { type: 'budget', id: budget.id },
        title: 'New budget created',
        body: budget.fixture.name,
        createdAt: budget.data.createdAt,
        readAt: notificationReadAt(budget.data.createdAt, seededAt),
      },
      {
        recipientUserId: FEATURED_SEED_USERS[otherUser(creator)].userId,
        eventId: itemEntry.item.id,
        target: { type: 'budget', id: itemEntry.budget.id },
        title: 'New budget item added',
        body: itemEntry.item.fixture.name,
        createdAt: itemEntry.item.data.createdAt,
        readAt: notificationReadAt(itemEntry.item.data.createdAt, seededAt),
      },
    );
  }

  return notifications;
}

function getInboxNotificationFixtures({
  invitationId,
  invitationCreatedAt,
  joinRequestId,
  joinRequestCreatedAt,
  chargeCreatedAt,
  timeSeededAt,
  rulesSeededAt,
  budgetSeedRows,
  seededAt,
}: InboxNotificationSeedContext): FeaturedInboxNotificationFixture[] {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const sharedRelationship = FEATURED_SEED_RELATIONSHIPS.find(
    (relationship) => relationship.key === 'shared',
  );
  const ruleIndex = FEATURED_SEED_RULES.findIndex(
    (rule) => rule.creator === 'shifty',
  );
  const meTimeIndex = FEATURED_SEED_ME_TIME_ENTRIES.findIndex(
    (entry) => entry.relationship === 'shared' && entry.creator === 'testy',
  );
  const taskIndex = FEATURED_SEED_TASKS.findIndex(
    (task) => task.relationship === 'shared' && task.creator === 'shifty',
  );
  const rule = FEATURED_SEED_RULES[ruleIndex];
  const meTime = FEATURED_SEED_ME_TIME_ENTRIES[meTimeIndex];
  const task = FEATURED_SEED_TASKS[taskIndex];

  if (
    !sharedRelationship ||
    ruleIndex < 0 ||
    meTimeIndex < 0 ||
    taskIndex < 0 ||
    !rule ||
    !meTime ||
    !task
  ) {
    throw new Error(
      'Featured seed requires shared fixtures for every notification target.',
    );
  }

  const ruleCreatedAt = new Date(
    rulesSeededAt - rule.createdDaysBefore * millisecondsPerDay,
  );
  const meTimeCreatedAt = new Date(
    timeSeededAt - meTime.createdDaysBefore * millisecondsPerDay,
  );
  const taskCreatedAt = new Date(
    timeSeededAt - task.createdDaysBefore * millisecondsPerDay,
  );
  const notifications: FeaturedInboxNotificationFixture[] = [
    {
      recipientUserId: FEATURED_SEED_USERS.shifty.userId,
      eventId: invitationId,
      target: { type: 'relationship', id: RELATIONSHIP_IDS.shared },
      title: 'New relationship invitation',
      body: `An invitation was created for ${sharedRelationship.name}.`,
      createdAt: invitationCreatedAt,
      readAt: notificationReadAt(invitationCreatedAt, seededAt),
    },
    ...(['testy', 'shifty'] as const).map((recipient) => ({
      recipientUserId: FEATURED_SEED_USERS[recipient].userId,
      eventId: joinRequestId,
      target: {
        type: 'relationshipJoinRequest' as const,
        id: joinRequestId,
        relationshipId: RELATIONSHIP_IDS.shared,
      },
      title: 'New relationship join request',
      body: `A new member requested to join ${sharedRelationship.name}.`,
      createdAt: joinRequestCreatedAt,
      readAt: notificationReadAt(joinRequestCreatedAt, seededAt),
    })),
    ...(['testy', 'shifty'] as const).map((creator) => {
      const requestIndex = FEATURED_SEED_REQUESTS.findIndex(
        (request) =>
          request.relationship === 'shared' && request.creator === creator,
      );
      const request = FEATURED_SEED_REQUESTS[requestIndex];
      if (!request) {
        throw new Error(
          `Featured seed requires a shared payment request created by ${creator}.`,
        );
      }

      const requestSequence = requestIndex + 1;
      const createdActivity = getActivities(request, requestSequence).find(
        (activity) => activity.eventType === 'created',
      );
      if (!createdActivity) {
        throw new Error('Featured seed payment request has no create event.');
      }

      return {
        recipientUserId: FEATURED_SEED_USERS[otherUser(creator)].userId,
        eventId: createdActivity.id,
        target: {
          type: 'paymentRequest' as const,
          id: fixtureObjectId(
            OBJECT_ID_PREFIXES.paymentRequest,
            requestSequence,
          ),
        },
        title: 'New payment request',
        body: request.title,
        createdAt: createdActivity.createdAt,
        readAt: notificationReadAt(createdActivity.createdAt, seededAt),
      };
    }),
    ...(['testy', 'shifty'] as const).map((creator) => {
      const chargeIndex = FEATURED_SEED_JOINT_ACCOUNT_CHARGES.findIndex(
        (charge) => charge.creator === creator,
      );
      const charge = FEATURED_SEED_JOINT_ACCOUNT_CHARGES[chargeIndex];
      if (!charge) {
        throw new Error(
          `Featured seed requires a joint-account charge created by ${creator}.`,
        );
      }

      const chargeId = fixtureObjectId(
        OBJECT_ID_PREFIXES.jointAccountCharge,
        chargeIndex + 1,
      );
      return {
        recipientUserId: FEATURED_SEED_USERS[otherUser(creator)].userId,
        eventId: chargeId,
        target: { type: 'jointAccountCharge' as const, id: chargeId },
        title: 'New joint account charge',
        body: charge.name,
        createdAt: chargeCreatedAt,
        readAt: notificationReadAt(chargeCreatedAt, seededAt),
      };
    }),
    {
      recipientUserId: FEATURED_SEED_USERS.testy.userId,
      eventId: fixtureObjectId(
        OBJECT_ID_PREFIXES.relationshipRule,
        ruleIndex + 1,
      ),
      target: {
        type: 'relationshipRule',
        id: fixtureObjectId(OBJECT_ID_PREFIXES.relationshipRule, ruleIndex + 1),
      },
      title: 'New relationship rule',
      body: rule.name,
      createdAt: ruleCreatedAt,
      readAt: notificationReadAt(ruleCreatedAt, seededAt),
    },
    {
      recipientUserId: FEATURED_SEED_USERS.shifty.userId,
      eventId: fixtureObjectId(OBJECT_ID_PREFIXES.meTime, meTimeIndex + 1),
      target: {
        type: 'meTime',
        id: fixtureObjectId(OBJECT_ID_PREFIXES.meTime, meTimeIndex + 1),
        relationshipId: RELATIONSHIP_IDS.shared,
      },
      title: 'New Me time entry',
      body: meTime.description
        ? `New Me time was recorded: ${meTime.description}`
        : 'A new Me time entry was recorded.',
      createdAt: meTimeCreatedAt,
      readAt: notificationReadAt(meTimeCreatedAt, seededAt),
    },
    {
      recipientUserId: FEATURED_SEED_USERS.testy.userId,
      eventId: fixtureObjectId(
        OBJECT_ID_PREFIXES.relationshipTask,
        taskIndex + 1,
      ),
      target: {
        type: 'relationshipTask',
        id: fixtureObjectId(OBJECT_ID_PREFIXES.relationshipTask, taskIndex + 1),
        relationshipId: RELATIONSHIP_IDS.shared,
      },
      title: 'New shared task',
      body: task.name,
      createdAt: taskCreatedAt,
      readAt: notificationReadAt(taskCreatedAt, seededAt),
    },
    ...getBudgetInboxNotificationFixtures(budgetSeedRows, seededAt),
  ];

  return notifications;
}

function getLegacyFeaturedNotificationIds(): string[] {
  const legacyNotificationIds: string[] = [];

  for (const [index, request] of FEATURED_SEED_REQUESTS.entries()) {
    if (request.relationship !== 'shared') continue;
    let notificationIndex = 0;
    for (const activity of getActivities(request, index + 1)) {
      if (activity.eventType === 'created') continue;
      notificationIndex += 1;
      legacyNotificationIds.push(
        fixtureObjectId(
          OBJECT_ID_PREFIXES.notification,
          (index + 1) * 10 + notificationIndex,
        ),
      );
    }
  }

  for (const userIndex of [0, 1]) {
    for (let fixtureIndex = 0; fixtureIndex < 7; fixtureIndex += 1) {
      legacyNotificationIds.push(
        fixtureObjectId(
          OBJECT_ID_PREFIXES.notification,
          1_000_000 + userIndex * 100 + fixtureIndex + 1,
        ),
      );
    }
  }

  return legacyNotificationIds;
}

export async function seedFeaturedUsers(
  db: FeaturedUserSeedDatabase,
  seededAt = new Date(),
): Promise<{
  relationshipCount: number;
  paymentRequestCount: number;
  jointAccountChargeCount: number;
  budgetCount: number;
  budgetApprovalCount: number;
  budgetItemCount: number;
  meTimeCount: number;
  relationshipTaskCount: number;
  relationshipRuleCount: number;
  relationshipInvitationCount: number;
  relationshipJoinRequestCount: number;
  sexEventCount: number;
  dateNightEventCount: number;
  notificationCount: number;
}> {
  const memberRows = [
    {
      id: fixtureObjectId(OBJECT_ID_PREFIXES.member, 1),
      relationshipId: RELATIONSHIP_IDS.shared,
      user: 'testy' as const,
      role: 'owner' as const,
    },
    {
      id: fixtureObjectId(OBJECT_ID_PREFIXES.member, 2),
      relationshipId: RELATIONSHIP_IDS.shared,
      user: 'shifty' as const,
      role: 'member' as const,
    },
    {
      id: fixtureObjectId(OBJECT_ID_PREFIXES.member, 3),
      relationshipId: RELATIONSHIP_IDS.testy,
      user: 'testy' as const,
      role: 'owner' as const,
    },
    {
      id: fixtureObjectId(OBJECT_ID_PREFIXES.member, 4),
      relationshipId: RELATIONSHIP_IDS.shifty,
      user: 'shifty' as const,
      role: 'owner' as const,
    },
  ];

  for (const relationship of FEATURED_SEED_RELATIONSHIPS) {
    await db.relationship.upsert({
      where: { id: relationship.id },
      create: {
        id: relationship.id,
        name: relationship.name,
        shareCode: relationship.shareCode,
        approvalPolicy: 'all_members',
      },
      update: {
        name: relationship.name,
        shareCode: relationship.shareCode,
        approvalPolicy: 'all_members',
      },
    });
  }

  for (const member of memberRows) {
    const user = FEATURED_SEED_USERS[member.user];
    await db.relationshipMember.upsert({
      where: {
        relationshipId_userId: {
          relationshipId: member.relationshipId,
          userId: user.userId,
        },
      },
      create: {
        id: member.id,
        relationshipId: member.relationshipId,
        userId: user.userId,
        displayName: user.displayName,
        role: member.role,
        active: true,
      },
      update: {
        displayName: user.displayName,
        role: member.role,
        active: true,
      },
    });
  }

  const budgetSeedRows = getFeaturedBudgetSeedRows(seededAt);
  for (const budget of budgetSeedRows) {
    await db.budget.upsert({
      where: { id: budget.id },
      create: { id: budget.id, ...budget.data },
      update: budget.data,
    });
    await db.budgetApproval.upsert({
      where: {
        budgetId_memberUserId: {
          budgetId: budget.id,
          memberUserId: budget.approval.data.memberUserId,
        },
      },
      create: { id: budget.approval.id, ...budget.approval.data },
      update: budget.approval.data,
    });
    for (const item of budget.items) {
      await db.budgetItem.upsert({
        where: { id: item.id },
        create: { id: item.id, ...item.data },
        update: item.data,
      });
    }
  }

  const sexEventStartDay = subYears(seededAt, 1);
  const sexEventDayCount =
    differenceInCalendarDays(seededAt, sexEventStartDay) + 1;
  const testyUserId = FEATURED_SEED_USERS.testy.userId;
  const shiftyUserId = FEATURED_SEED_USERS.shifty.userId;
  const memberUserIds = [testyUserId, shiftyUserId].sort();
  const memberSetKey = createHash('sha256')
    .update(JSON.stringify(memberUserIds))
    .digest('hex');
  for (let index = 0; index < FEATURED_SEED_SEX_EVENT_COUNT; index += 1) {
    const dayOffset = Math.floor(
      (index * (sexEventDayCount - 1)) / (FEATURED_SEED_SEX_EVENT_COUNT - 1),
    );
    const eventDate = addDays(sexEventStartDay, dayOffset);
    const day = format(eventDate, 'yyyy-MM-dd');
    const id = fixtureObjectId(OBJECT_ID_PREFIXES.sexEvent, index + 1);
    const data = {
      createdAt: eventDate,
      relationshipId: RELATIONSHIP_IDS.shared,
      day,
      memberSetKey,
      memberUserIds,
      createdByUserId: index % 2 === 0 ? testyUserId : shiftyUserId,
    };

    await db.sexEvent.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
  }

  const dateNightStartDay = subYears(seededAt, 1);
  const dateNightDayCount =
    differenceInCalendarDays(seededAt, dateNightStartDay) + 1;
  for (
    let index = 0;
    index < FEATURED_SEED_DATE_NIGHT_EVENT_COUNT;
    index += 1
  ) {
    const dayOffset = Math.floor(
      (index * (dateNightDayCount - 1)) /
        (FEATURED_SEED_DATE_NIGHT_EVENT_COUNT - 1),
    );
    const eventDate = addDays(dateNightStartDay, dayOffset);
    const id = fixtureObjectId(OBJECT_ID_PREFIXES.dateNightEvent, index + 1);
    const data = {
      createdAt: eventDate,
      relationshipId: RELATIONSHIP_IDS.shared,
      day: format(eventDate, 'yyyy-MM-dd'),
      description:
        index % 5 === 0
          ? null
          : DATE_NIGHT_SEED_DESCRIPTIONS[
              Math.floor(index / 2) % DATE_NIGHT_SEED_DESCRIPTIONS.length
            ],
      createdByUserId: index % 2 === 0 ? testyUserId : shiftyUserId,
    };

    await db.dateNightEvent.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
  }

  const chargeSeededAt = Date.now();
  const chargeCreatedAt = new Date(chargeSeededAt);
  for (const [index, charge] of FEATURED_SEED_JOINT_ACCOUNT_CHARGES.entries()) {
    const id = fixtureObjectId(
      OBJECT_ID_PREFIXES.jointAccountCharge,
      index + 1,
    );
    const createdByUserId = FEATURED_SEED_USERS[charge.creator].userId;
    const chargeDate = new Date(
      chargeSeededAt - charge.chargeDaysBefore * 24 * 60 * 60 * 1000,
    );
    await db.jointAccountCharge.upsert({
      where: { id },
      create: {
        id,
        createdAt: chargeCreatedAt,
        relationshipId: RELATIONSHIP_IDS.shared,
        createdByUserId,
        name: charge.name,
        amountMinorUnits: charge.amountMinorUnits,
        chargeDate,
        status: charge.status,
      },
      update: {
        createdAt: chargeCreatedAt,
        relationshipId: RELATIONSHIP_IDS.shared,
        createdByUserId,
        name: charge.name,
        amountMinorUnits: charge.amountMinorUnits,
        chargeDate,
        status: charge.status,
      },
    });
  }

  const timeSeededAt = Date.now();
  const millisecondsPerTimeDay = 24 * 60 * 60 * 1000;
  for (const [index, entry] of FEATURED_SEED_ME_TIME_ENTRIES.entries()) {
    const id = fixtureObjectId(OBJECT_ID_PREFIXES.meTime, index + 1);
    const createdAt = new Date(
      timeSeededAt - entry.createdDaysBefore * millisecondsPerTimeDay,
    );
    const startTime = new Date(
      timeSeededAt - entry.startDaysBefore * millisecondsPerTimeDay,
    );
    const endTime = new Date(
      startTime.getTime() + entry.durationMinutes * 60 * 1000,
    );
    const relationshipId = RELATIONSHIP_IDS[entry.relationship];
    const createdByUserId = FEATURED_SEED_USERS[entry.creator].userId;

    await db.meTime.upsert({
      where: { id },
      create: {
        id,
        relationshipId,
        createdByUserId,
        startTime,
        endTime,
        description: entry.description,
        createdAt,
        updatedAt: createdAt,
      },
      update: {
        relationshipId,
        createdByUserId,
        startTime,
        endTime,
        description: entry.description,
        createdAt,
        updatedAt: createdAt,
      },
    });
  }

  for (const [index, task] of FEATURED_SEED_TASKS.entries()) {
    const id = fixtureObjectId(OBJECT_ID_PREFIXES.relationshipTask, index + 1);
    const createdAt = new Date(
      timeSeededAt - task.createdDaysBefore * millisecondsPerTimeDay,
    );
    const completedAt =
      task.completedDaysBefore === null
        ? null
        : new Date(
            timeSeededAt - task.completedDaysBefore * millisecondsPerTimeDay,
          );
    const updatedAt = completedAt ?? createdAt;
    const relationshipId = RELATIONSHIP_IDS[task.relationship];
    const createdByUserId = FEATURED_SEED_USERS[task.creator].userId;
    const completedByUserId =
      task.completedBy === null
        ? null
        : FEATURED_SEED_USERS[task.completedBy].userId;

    await db.relationshipTask.upsert({
      where: { id },
      create: {
        id,
        relationshipId,
        createdByUserId,
        name: task.name,
        createdAt,
        updatedAt,
        completedAt,
        completedByUserId,
      },
      update: {
        relationshipId,
        createdByUserId,
        name: task.name,
        createdAt,
        updatedAt,
        completedAt,
        completedByUserId,
      },
    });
  }

  const questions = JSON.parse(
    JSON.stringify(DEFAULT_RUBRIC_QUESTIONS),
  ) as Prisma.InputJsonValue;
  for (const relationship of FEATURED_SEED_RELATIONSHIPS) {
    const rubricId = RUBRIC_IDS[relationship.key];
    const rubricVersionId = RUBRIC_VERSION_IDS[relationship.key];
    await db.rubric.upsert({
      where: { id: rubricId },
      create: {
        id: rubricId,
        relationshipId: relationship.id,
        name: 'Purchase review',
      },
      update: { name: 'Purchase review' },
    });
    await db.rubricVersion.upsert({
      where: { id: rubricVersionId },
      create: {
        id: rubricVersionId,
        rubricId,
        version: 1,
        questions,
        published: true,
      },
      update: { questions, published: true },
    });
  }

  const rulesSeededAt = Date.now();
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  for (const [index, rule] of FEATURED_SEED_RULES.entries()) {
    const id = fixtureObjectId(OBJECT_ID_PREFIXES.relationshipRule, index + 1);
    const createdAt = new Date(
      rulesSeededAt - rule.createdDaysBefore * millisecondsPerDay,
    );
    const ratifiedAt =
      rule.status === 'ratified'
        ? new Date(
            createdAt.getTime() +
              (rule.ratificationDaysAfter ?? 1) * millisecondsPerDay,
          )
        : null;
    const updatedAt = ratifiedAt ?? createdAt;
    const createdByUserId = FEATURED_SEED_USERS[rule.creator].userId;
    const approverUserId = FEATURED_SEED_USERS[otherUser(rule.creator)].userId;

    await db.relationshipRule.upsert({
      where: { id },
      create: {
        id,
        relationshipId: RELATIONSHIP_IDS[rule.relationship],
        createdByUserId,
        name: rule.name,
        labels: rule.labels,
        description: rule.description,
        status: rule.status,
        createdAt,
        updatedAt,
        ratifiedAt,
      },
      update: {
        relationshipId: RELATIONSHIP_IDS[rule.relationship],
        createdByUserId,
        name: rule.name,
        labels: rule.labels,
        description: rule.description,
        status: rule.status,
        createdAt,
        updatedAt,
        ratifiedAt,
      },
    });

    await db.relationshipRuleApproval.upsert({
      where: {
        ruleId_memberUserId: {
          ruleId: id,
          memberUserId: approverUserId,
        },
      },
      create: {
        id: fixtureObjectId(
          OBJECT_ID_PREFIXES.relationshipRuleApproval,
          index + 1,
        ),
        ruleId: id,
        memberUserId: approverUserId,
        agreedAt: ratifiedAt,
        createdAt,
        updatedAt,
      },
      update: {
        agreedAt: ratifiedAt,
        createdAt,
        updatedAt,
      },
    });
  }

  for (const [index, request] of FEATURED_SEED_REQUESTS.entries()) {
    const requestSequence = index + 1;
    const creator = FEATURED_SEED_USERS[request.creator];
    const shared = request.relationship === 'shared';
    const split: Prisma.InputJsonValue = shared
      ? [
          { memberUserId: creator.userId, percentage: 50 },
          {
            memberUserId:
              FEATURED_SEED_USERS[otherUser(request.creator)].userId,
            percentage: 50,
          },
        ]
      : [{ memberUserId: creator.userId, percentage: 100 }];
    const activities = getActivities(request, requestSequence);
    const decisions = getDecisions(request, requestSequence);
    const createdAt = activities[0].createdAt;
    const lastActivity = activities[activities.length - 1].createdAt;
    const resolvedAt = isResolved(request.workflow) ? lastActivity : null;
    const paymentRequestId = fixtureObjectId(
      OBJECT_ID_PREFIXES.paymentRequest,
      requestSequence,
    );
    const rubricVersionId = RUBRIC_VERSION_IDS[request.relationship];
    const purchaseDate = new Date(
      createdAt.getTime() - request.purchaseDaysBefore * 24 * 60 * 60 * 1000,
    );
    const evaluationAnswers: Prisma.InputJsonValue = {
      necessary: true,
      beneficiary: shared ? 'both' : 'creator',
    };

    await db.paymentRequest.upsert({
      where: { id: paymentRequestId },
      create: {
        id: paymentRequestId,
        createdAt,
        updatedAt: lastActivity,
        relationshipId: RELATIONSHIP_IDS[request.relationship],
        createdByUserId: creator.userId,
        title: request.title,
        rationale: request.rationale,
        amountMinorUnits: request.amountMinorUnits,
        currency: 'USD',
        purchaseDate,
        categories: request.categories,
        requestedSplit: split,
        status: statusForWorkflow[request.workflow],
        rubricVersionId,
        resolvedAt,
      },
      update: {
        updatedAt: lastActivity,
        relationshipId: RELATIONSHIP_IDS[request.relationship],
        createdByUserId: creator.userId,
        title: request.title,
        rationale: request.rationale,
        amountMinorUnits: request.amountMinorUnits,
        currency: 'USD',
        purchaseDate,
        categories: request.categories,
        requestedSplit: split,
        status: statusForWorkflow[request.workflow],
        rubricVersionId,
        resolvedAt,
      },
    });

    if (isSubmitted(request.workflow)) {
      await db.paymentRequestEvaluation.upsert({
        where: { paymentRequestId },
        create: {
          id: fixtureObjectId(OBJECT_ID_PREFIXES.evaluation, requestSequence),
          paymentRequestId,
          rubricVersionId,
          answers: evaluationAnswers,
          recommendation: 'Reviewed against the relationship purchase rubric.',
          score: 1,
        },
        update: {
          rubricVersionId,
          answers: evaluationAnswers,
          recommendation: 'Reviewed against the relationship purchase rubric.',
          score: 1,
        },
      });
    }

    for (const decision of decisions) {
      await db.paymentRequestDecision.upsert({
        where: {
          paymentRequestId_memberUserId: {
            paymentRequestId,
            memberUserId: decision.memberUserId,
          },
        },
        create: { paymentRequestId, ...decision },
        update: {
          decision: decision.decision,
          comment: decision.comment,
          createdAt: decision.createdAt,
        },
      });
    }

    for (const activity of activities) {
      await db.activityEvent.upsert({
        where: { id: activity.id },
        create: {
          id: activity.id,
          paymentRequestId,
          actorUserId: activity.actorUserId,
          eventType: activity.eventType,
          metadata: activity.metadata,
          createdAt: activity.createdAt,
        },
        update: {
          paymentRequestId,
          actorUserId: activity.actorUserId,
          eventType: activity.eventType,
          metadata: activity.metadata,
          createdAt: activity.createdAt,
        },
      });
    }
  }

  const inboxSeededAt = Date.now();
  const invitationId = fixtureObjectId(
    OBJECT_ID_PREFIXES.relationshipInvitation,
    1,
  );
  const invitationCreatedAt = new Date(inboxSeededAt - 2 * 24 * 60 * 60 * 1000);
  const invitationExpiresAt = new Date(
    invitationCreatedAt.getTime() + 7 * 24 * 60 * 60 * 1000,
  );
  const invitationTokenHash = createHash('sha256')
    .update(`featured-seed-invitation-${invitationId}`)
    .digest('hex');
  await db.relationshipInvitation.upsert({
    where: { id: invitationId },
    create: {
      id: invitationId,
      relationshipId: RELATIONSHIP_IDS.shared,
      inviterUserId: FEATURED_SEED_USERS.testy.userId,
      inviteeEmail: 'sample-member@example.test',
      tokenHash: invitationTokenHash,
      status: 'pending',
      createdAt: invitationCreatedAt,
      expiresAt: invitationExpiresAt,
    },
    update: {
      relationshipId: RELATIONSHIP_IDS.shared,
      inviterUserId: FEATURED_SEED_USERS.testy.userId,
      inviteeEmail: 'sample-member@example.test',
      tokenHash: invitationTokenHash,
      status: 'pending',
      createdAt: invitationCreatedAt,
      expiresAt: invitationExpiresAt,
      acceptedAt: null,
      acceptedByUserId: null,
    },
  });

  const joinRequestId = fixtureObjectId(
    OBJECT_ID_PREFIXES.relationshipJoinRequest,
    1,
  );
  const joinRequestCreatedAt = new Date(inboxSeededAt - 15 * 60 * 1000);
  await db.relationshipJoinRequest.upsert({
    where: { id: joinRequestId },
    create: {
      id: joinRequestId,
      relationshipId: RELATIONSHIP_IDS.shared,
      requesterUserId: 'featured-notification-requester',
      requesterDisplayName: 'Sample Member',
      status: 'pending',
      createdAt: joinRequestCreatedAt,
      updatedAt: joinRequestCreatedAt,
    },
    update: {
      relationshipId: RELATIONSHIP_IDS.shared,
      requesterUserId: 'featured-notification-requester',
      requesterDisplayName: 'Sample Member',
      status: 'pending',
      respondedAt: null,
      respondedByUserId: null,
      createdAt: joinRequestCreatedAt,
      updatedAt: joinRequestCreatedAt,
    },
  });

  await db.notification.deleteMany({
    where: { id: { in: getLegacyFeaturedNotificationIds() } },
  });

  const notificationFixtures = getInboxNotificationFixtures({
    invitationId,
    invitationCreatedAt,
    joinRequestId,
    joinRequestCreatedAt,
    chargeCreatedAt,
    timeSeededAt,
    rulesSeededAt,
    budgetSeedRows,
    seededAt: inboxSeededAt,
  });
  for (const [index, fixture] of notificationFixtures.entries()) {
    const notificationId = fixtureObjectId(
      OBJECT_ID_PREFIXES.notification,
      2_000_000 + index + 1,
    );
    const targetRelationshipId =
      'relationshipId' in fixture.target ? fixture.target.relationshipId : null;
    const data = {
      recipientUserId: fixture.recipientUserId,
      eventId: fixture.eventId,
      title: fixture.title,
      body: fixture.body,
      createdAt: fixture.createdAt,
      readAt: fixture.readAt,
      deliveryStatus: 'pending' as const,
      targetType: fixture.target.type,
      targetId: fixture.target.id,
      targetRelationshipId,
    };

    await db.notification.upsert({
      where: { id: notificationId },
      create: { id: notificationId, ...data },
      update: data,
    });
  }

  return {
    relationshipCount: FEATURED_SEED_RELATIONSHIPS.length,
    paymentRequestCount: FEATURED_SEED_REQUESTS.length,
    jointAccountChargeCount: FEATURED_SEED_JOINT_ACCOUNT_CHARGES.length,
    budgetCount: budgetSeedRows.length,
    budgetApprovalCount: budgetSeedRows.length,
    budgetItemCount: budgetSeedRows.reduce(
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
    notificationCount: notificationFixtures.length,
  };
}
