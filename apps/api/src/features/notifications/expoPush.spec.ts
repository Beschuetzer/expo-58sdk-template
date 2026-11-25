import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  MAX_EXPO_PUSH_BATCH_SIZE,
  sendExpoPushMessages,
  type ExpoPushMessage,
} from '../notifications/expoPush';

const message: ExpoPushMessage = {
  to: 'ExpoPushToken[device-123]',
  title: 'Example notification',
  body: 'A notification is ready.',
  sound: 'default',
  channelId: 'default',
  data: {
    eventId: 'event-123',
    notificationId: 'notification-123',
  },
};

test('sends a batch to Expo and returns validated delivery tickets', async (t) => {
  const originalFetch = globalThis.fetch;
  let receivedUrl = '';
  let receivedBody = '';
  globalThis.fetch = async (input, init) => {
    receivedUrl = String(input);
    receivedBody = String(init?.body);
    return new Response(
      JSON.stringify({
        data: [
          { status: 'ok', id: 'ticket-1' },
          {
            status: 'error',
            message: 'Device is no longer registered',
            details: { error: 'DeviceNotRegistered' },
          },
        ],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const tickets = await sendExpoPushMessages([message, message]);

  assert.equal(receivedUrl, 'https://exp.host/--/api/v2/push/send');
  assert.deepEqual(JSON.parse(receivedBody), [message, message]);
  assert.deepEqual(tickets, [
    { status: 'ok' },
    {
      status: 'error',
      message: 'Device is no longer registered',
      errorCode: 'DeviceNotRegistered',
    },
  ]);
});

test('rejects Expo responses with a mismatched ticket count', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ data: [] }), { status: 200 });
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await assert.rejects(
    sendExpoPushMessages([message]),
    /unexpected ticket count/,
  );
});

test('rejects batches larger than the Expo push service limit', async () => {
  const messages = Array.from(
    { length: MAX_EXPO_PUSH_BATCH_SIZE + 1 },
    () => message,
  );

  await assert.rejects(
    sendExpoPushMessages(messages),
    /cannot exceed 100 messages/,
  );
});
