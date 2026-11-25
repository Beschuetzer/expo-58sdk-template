import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  seedExamples,
  type ExampleSeedClient,
} from './seed-examples';

type UpsertArgs = Parameters<ExampleSeedClient['example']['upsert']>[0];

test('upserts exactly ten stable Example records', async () => {
  const upserts: UpsertArgs[] = [];
  const database: ExampleSeedClient = {
    example: {
      async upsert(args) {
        upserts.push(args);
      },
    },
  };

  const count = await seedExamples(database);

  assert.equal(count, 10);
  assert.deepEqual(
    upserts,
    Array.from({ length: 10 }, (_, index) => {
      const number = index + 1;
      const example = {
        email: `example-${number}@example.test`,
        name: `Example ${number}`,
      };
      return {
        where: { email: example.email },
        create: example,
        update: { name: example.name },
      };
    }),
  );
});
