import { createLogger, parseLogLevel } from '@expo-50sdk-template/logging';
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { seedFeaturedUsers } from './seed-featured-users';

type ExtendedObjectId = { $oid: string };
type ExtendedDate = { $date: string };

type SeedRelationship = {
  _id: ExtendedObjectId;
  createdAt: ExtendedDate;
  updatedAt: ExtendedDate;
  name: string;
  shareCode: string;
  approvalPolicy: 'all_members';
};

type SeedMember = {
  _id: ExtendedObjectId;
  createdAt: ExtendedDate;
  updatedAt: ExtendedDate;
  relationshipId: ExtendedObjectId;
  userId: string;
  displayName: string;
  role: 'owner';
  active: boolean;
};

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../..',
);

const logger = createLogger({
  level: parseLogLevel(
    process.env.LOG_LEVEL,
    process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  ),
  service: 'api-seed',
});

function readSeedFile<T>(fileName: string) {
  return JSON.parse(
    readFileSync(resolve(repositoryRoot, fileName), 'utf8'),
  ) as T[];
}

async function seedDevelopmentData() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error(
      'Development seed refused: NODE_ENV must be exactly "development".',
    );
  }

  if (process.env.SEED_DEVELOPMENT_DATA !== 'true') {
    logger.info('development_seed_skipped', {
      reason: 'SEED_DEVELOPMENT_DATA is not enabled',
    });
    return;
  }

  const relationships = readSeedFile<SeedRelationship>(
    'relationship-import-a100-a199.json',
  );
  const members = readSeedFile<SeedMember>(
    'relationship-members-import-a100-a199.json',
  );
  const configuredOwnerUserId = process.env.SEED_DEVELOPMENT_USER_ID?.trim();
  if (configuredOwnerUserId) {
    logger.info('development_seed_owner_configured');
  } else {
    logger.warn('development_seed_owner_not_configured', {
      reason: 'Imported owner IDs will be used',
    });
  }
  logger.info('development_seed_started', {
    memberCount: members.length,
    relationshipCount: relationships.length,
  });
  const db = new PrismaClient();

  try {
    for (const relationship of relationships) {
      await db.relationship.upsert({
        where: { id: relationship._id.$oid },
        create: {
          id: relationship._id.$oid,
          createdAt: new Date(relationship.createdAt.$date),
          updatedAt: new Date(relationship.updatedAt.$date),
          name: relationship.name,
          shareCode: relationship.shareCode,
          approvalPolicy: relationship.approvalPolicy,
        },
        update: {
          updatedAt: new Date(relationship.updatedAt.$date),
          name: relationship.name,
          shareCode: relationship.shareCode,
          approvalPolicy: relationship.approvalPolicy,
        },
      });
    }

    for (const member of members) {
      await db.relationshipMember.upsert({
        where: { id: member._id.$oid },
        create: {
          id: member._id.$oid,
          createdAt: new Date(member.createdAt.$date),
          updatedAt: new Date(member.updatedAt.$date),
          relationshipId: member.relationshipId.$oid,
          userId: configuredOwnerUserId ?? member.userId,
          displayName: member.displayName,
          role: member.role,
          active: member.active,
        },
        update: {
          updatedAt: new Date(member.updatedAt.$date),
          relationshipId: member.relationshipId.$oid,
          userId: configuredOwnerUserId ?? member.userId,
          displayName: member.displayName,
          role: member.role,
          active: member.active,
        },
      });
    }

    const featuredUserSeed = await seedFeaturedUsers(db);
    logger.info('featured_user_seed_completed', featuredUserSeed);
    logger.info('development_seed_completed', {
      memberCount: members.length,
      relationshipCount:
        relationships.length + featuredUserSeed.relationshipCount,
      budgetCount: featuredUserSeed.budgetCount,
      budgetApprovalCount: featuredUserSeed.budgetApprovalCount,
      budgetItemCount: featuredUserSeed.budgetItemCount,
      meTimeCount: featuredUserSeed.meTimeCount,
      relationshipTaskCount: featuredUserSeed.relationshipTaskCount,
      relationshipRuleCount: featuredUserSeed.relationshipRuleCount,
      relationshipInvitationCount: featuredUserSeed.relationshipInvitationCount,
      relationshipJoinRequestCount:
        featuredUserSeed.relationshipJoinRequestCount,
      sexEventCount: featuredUserSeed.sexEventCount,
      dateNightEventCount: featuredUserSeed.dateNightEventCount,
      notificationCount: featuredUserSeed.notificationCount,
    });
  } finally {
    await db.$disconnect();
  }
}

seedDevelopmentData().catch((error: unknown) => {
  logger.error('development_seed_failed', { error });
  process.exitCode = 1;
});
