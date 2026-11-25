import type { RelationshipMember } from '@expo-50sdk-template/shared-types';
import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { RelationshipMemberSelector } from './RelationshipMemberSelector';

jest.mock('@/components/ui/vstack', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    VStack: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement('VStackHost', props, children as React.ReactNode),
  };
});

jest.mock('@/components/ui/ThemeAwareCheckbox', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    ThemeAwareCheckbox: (props: Record<string, unknown>) =>
      React.createElement('ThemeAwareCheckboxHost', props),
  };
});

jest.mock('@/components/ui/ThemeAwareText', () => {
  const React = jest.requireActual('react') as typeof import('react');

  return {
    ThemeAwareText: ({ children, ...props }: Record<string, unknown>) =>
      React.createElement(
        'ThemeAwareTextHost',
        props,
        children as React.ReactNode,
      ),
  };
});

const members: RelationshipMember[] = [
  {
    active: true,
    displayName: 'Alex',
    id: 'member-1',
    relationshipId: 'relationship-1',
    role: 'owner',
    userId: 'user-1',
  },
  {
    active: true,
    displayName: 'Taylor',
    id: 'member-2',
    relationshipId: 'relationship-1',
    role: 'member',
    userId: 'user-2',
  },
  {
    active: false,
    displayName: 'Inactive',
    id: 'member-3',
    relationshipId: 'relationship-1',
    role: 'member',
    userId: 'user-3',
  },
];

describe('RelationshipMemberSelector', () => {
  it('shows eligible members as checkboxes and updates selected user IDs', () => {
    const onChange = jest.fn();
    const tree = renderer.create(
      <RelationshipMemberSelector
        excludedUserIds={['user-2']}
        label="Members"
        members={members}
        onChange={onChange}
        selectedUserIds={['user-1']}
      />,
    );
    const checkboxes = tree.root.findAll(
      (instance) => String(instance.type) === 'ThemeAwareCheckboxHost',
    );

    expect(checkboxes).toHaveLength(1);
    expect(checkboxes[0].props.label).toBe('Alex');
    expect(checkboxes[0].props.value).toBe(true);

    act(() => checkboxes[0].props.onValueChange(false));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('shows the empty message when no eligible members remain', () => {
    const tree = renderer.create(
      <RelationshipMemberSelector
        emptyMessage="No members"
        excludedUserIds={members.map(({ userId }) => userId)}
        label="Members"
        members={members}
        onChange={jest.fn()}
        selectedUserIds={[]}
      />,
    );

    expect(
      tree.root.findAll(
        (instance) => String(instance.type) === 'ThemeAwareCheckboxHost',
      ),
    ).toHaveLength(0);
    expect(
      tree.root.findAll(
        (instance) =>
          String(instance.type) === 'ThemeAwareTextHost' &&
          instance.props.children === 'No members',
      ),
    ).toHaveLength(1);
  });
});
