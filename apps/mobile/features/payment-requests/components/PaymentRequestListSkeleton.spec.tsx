import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { PaymentRequestListSkeleton } from './PaymentRequestListSkeleton';

jest.mock('@/components/ui/ThemeAwareSkeleton', () => ({
  ThemeAwareSkeleton: 'ThemeAwareSkeletonHost',
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

describe('PaymentRequestListSkeleton', () => {
  it('renders three request cards with consistent text placeholders', () => {
    const tree = renderer.create(<PaymentRequestListSkeleton />);
    const rows = tree.root.findAll(
      (instance) => String(instance.type) === 'ThemeAwareSurfaceHost',
    );
    const placeholders = tree.root.findAll(
      (instance) => String(instance.type) === 'ThemeAwareSkeletonHost',
    );

    expect(rows).toHaveLength(3);
    expect(rows[0].props).toEqual(
      expect.objectContaining({
        borderRadius: '$sm',
        borderWidth: '$1',
        p: '$4',
      }),
    );
    expect(placeholders).toHaveLength(12);
    expect(placeholders[0].props).toEqual(
      expect.objectContaining({
        height: 18,
        shape: 'text',
        width: '60%',
      }),
    );
    expect(placeholders[1].props.style).toEqual({ borderRadius: 999 });

    act(() => tree.unmount());
  });
});
