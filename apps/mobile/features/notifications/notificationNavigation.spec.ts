import {
  navigateToNotificationTarget,
  type NotificationRouter,
} from './notificationNavigation';

describe('navigateToNotificationTarget', () => {
  it.each([
    [
      { type: 'relationship', id: 'relationship-1' },
      {
        pathname: '/(tabs)/(home)/relationship/[id]',
        params: { id: 'relationship-1' },
      },
    ],
    [
      {
        type: 'relationshipJoinRequest',
        id: 'join-request-1',
        relationshipId: 'relationship-1',
      },
      {
        pathname: '/(tabs)/(home)/relationship-join-request/[id]',
        params: { id: 'join-request-1', relationshipId: 'relationship-1' },
      },
    ],
    [
      { type: 'paymentRequest', id: 'payment-request-1' },
      {
        pathname: '/(tabs)/(requests)/payment-request/[id]',
        params: { id: 'payment-request-1' },
      },
    ],
    [
      { type: 'jointAccountCharge', id: 'charge-1' },
      {
        pathname: '/(tabs)/(requests)/joint-account-charge/[id]',
        params: { id: 'charge-1' },
      },
    ],
    [
      { type: 'budget', id: 'budget-1' },
      {
        pathname: '/(tabs)/(requests)/budget/[id]',
        params: { id: 'budget-1' },
      },
    ],
    [
      { type: 'relationshipRule', id: 'rule-1' },
      {
        pathname: '/(tabs)/(rules)/relationship-rule/[id]',
        params: { id: 'rule-1' },
      },
    ],
    [
      { type: 'meTime', id: 'me-time-1', relationshipId: 'relationship-1' },
      {
        pathname: '/(tabs)/(time)/MeTimeDetailsScreen',
        params: { id: 'me-time-1', relationshipId: 'relationship-1' },
      },
    ],
    [
      {
        type: 'relationshipTask',
        id: 'task-1',
        relationshipId: 'relationship-1',
      },
      {
        pathname: '/(tabs)/(time)/RelationshipTaskDetailsScreen',
        params: { id: 'task-1', relationshipId: 'relationship-1' },
      },
    ],
  ])('routes %j to its detail page', (target, destination) => {
    const destinations: unknown[] = [];
    const router = {
      push: (href: unknown) => destinations.push(href),
    } satisfies NotificationRouter;

    expect(navigateToNotificationTarget(target, router)).toBe(true);
    expect(destinations).toEqual([destination]);
  });

  it.each([
    undefined,
    null,
    [],
    {},
    { type: 'paymentRequest' },
    { type: 'meTime', id: 'me-time-1' },
    { type: 'relationshipJoinRequest', id: 'join-request-1' },
    { type: 'relationshipTask', id: 'task-1' },
    { type: 'unknown', id: 'unknown-1' },
  ])('does not navigate for an invalid target: %j', (target) => {
    const destinations: unknown[] = [];
    const router = {
      push: (href: unknown) => destinations.push(href),
    } satisfies NotificationRouter;

    expect(navigateToNotificationTarget(target, router)).toBe(false);
    expect(destinations).toEqual([]);
  });
});
