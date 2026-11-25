import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { AwaitingDecisionListSkeleton } from '../features/awaiting-decision/components/AwaitingDecisionListSkeleton';
import { BudgetsListSkeleton } from '../features/budgets/components/BudgetsListSkeleton';
import { JointAccountChargeListSkeleton } from '../features/joint-account-charges/components/JointAccountChargeListSkeleton';
import { PaymentRequestListSkeleton } from '../features/payment-requests/components/PaymentRequestListSkeleton';
import { RelationshipRuleListSkeleton } from '../features/relationship-rules/components/RelationshipRuleListSkeleton';
import { MeTimeListSkeleton } from '../features/time/components/MeTimeListSkeleton';
import { RelationshipTaskListSkeleton } from '../features/time/components/RelationshipTaskListSkeleton';

import { CARD_ARTWORK } from '@/constants/cardArtwork';

jest.mock('@/components/ui/ThemeAwareSkeleton', () => ({
  ThemeAwareSkeleton: 'ThemeAwareSkeletonHost',
}));

jest.mock('@/components/ui/ThemeAwareCardSurface', () => ({
  ThemeAwareCardSurface: 'ThemeAwareCardSurfaceHost',
}));

jest.mock('@/components/ui/ThemeAwareSurface', () => ({
  ThemeAwareSurface: 'ThemeAwareSurfaceHost',
}));

jest.mock('@/components/ui/hstack', () => ({
  HStack: 'HStackHost',
}));

jest.mock('@/components/ui/vstack', () => ({
  VStack: 'VStackHost',
}));

const LIST_SKELETONS: [string, () => React.ReactElement][] = [
  ['awaiting decisions', () => <AwaitingDecisionListSkeleton />],
  ['budgets', () => <BudgetsListSkeleton />],
  ['joint account charges', () => <JointAccountChargeListSkeleton />],
  ['payment requests', () => <PaymentRequestListSkeleton />],
  ['relationship rules', () => <RelationshipRuleListSkeleton />],
  ['me time', () => <MeTimeListSkeleton />],
  [
    'completed tasks',
    () => <RelationshipTaskListSkeleton status="completed" />,
  ],
];

describe.each(LIST_SKELETONS)('%s list skeleton', (_name, renderSkeleton) => {
  it('stretches its cards and placeholders to fill the available height', () => {
    const tree = renderer.create(renderSkeleton());
    const root = tree.root.find(
      (instance) => String(instance.type) === 'VStackHost',
    );
    const cards = tree.root.findAll(
      (instance) =>
        (String(instance.type) === 'ThemeAwareSurfaceHost' ||
          String(instance.type) === 'ThemeAwareCardSurfaceHost') &&
        instance.props.borderRadius !== undefined,
    );

    expect(root.props.style).toEqual({ flex: 1 });
    expect(cards.length).toBeGreaterThan(0);

    for (const card of cards) {
      expect(card.props.flex).toBe(1);
      expect(
        card.find((instance) => String(instance.type) === 'VStackHost').props
          .style,
      ).toEqual(expect.objectContaining({ flex: 1 }));
    }

    act(() => tree.unmount());
  });
});

describe('RelationshipTaskListSkeleton', () => {
  it('fills the viewport with incomplete placeholders sized like task tiles', () => {
    const tree = renderer.create(
      <RelationshipTaskListSkeleton status="incomplete" />,
    );
    const root = tree.root.find(
      (instance) => String(instance.type) === 'VStackHost',
    );
    const rows = tree.root.findAll(
      (instance) =>
        String(instance.type) === 'VStackHost' &&
        instance.props.className === 'pb-2',
    );

    expect(root.props.style).toEqual({
      flex: 1,
      justifyContent: 'space-between',
    });
    expect(rows).toHaveLength(6);

    for (const row of rows) {
      expect(row.props.style).toBeUndefined();
      const card = row.find(
        (instance) => String(instance.type) === 'ThemeAwareCardSurfaceHost',
      );
      expect(card.props.flex).toBeUndefined();
      expect(card.props.p).toBe('$4');
      expect(
        card.find((instance) => String(instance.type) === 'HStackHost').props
          .style,
      ).toBeUndefined();
    }

    act(() => tree.unmount());
  });
});

describe('BudgetsListSkeleton', () => {
  it('uses the budgeting artwork and tile-shaped content layout', () => {
    const tree = renderer.create(<BudgetsListSkeleton />);
    const card = tree.root.findAll(
      (instance) => String(instance.type) === 'ThemeAwareCardSurfaceHost',
    )[0];

    expect(card.props).toEqual(
      expect.objectContaining({
        backgroundImage: CARD_ARTWORK.budgeting,
        borderRadius: '$sm',
        flex: 1,
        p: '$4',
      }),
    );
    expect(
      card.find((instance) => String(instance.type) === 'HStackHost').props,
    ).toEqual(
      expect.objectContaining({
        className: 'items-center',
        space: 'sm',
      }),
    );

    act(() => tree.unmount());
  });
});
