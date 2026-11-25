import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { EntityDeleteButton } from '../components/ui/EntityDeleteButton';

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}));

jest.mock('@/components/ui/ThemeAwareButton', () => ({
  ThemeAwareButton: 'ThemeAwareButtonHost',
}));

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

const mockAlert = (
  jest.requireMock('react-native') as {
    Alert: { alert: jest.Mock };
  }
).Alert.alert;

describe('EntityDeleteButton', () => {
  beforeEach(() => {
    mockAlert.mockClear();
  });

  it('uses destructive theme colors and waits for confirmation', () => {
    const onDelete = jest.fn();
    let screen: ReactTestRenderer;
    act(() => {
      screen = renderer.create(
        <EntityDeleteButton flex={1} onDelete={onDelete} />,
      );
    });

    const button = screen!.root.find(
      (instance) => String(instance.type) === 'ThemeAwareButtonHost',
    );
    expect(button.props.children).toBe('common.delete');
    expect(button.props.darkBackground).toBe('$error700');
    expect(button.props.lightBackground).toBe('$error600');

    act(() => button.props.onPress());
    expect(mockAlert).toHaveBeenCalledWith(
      'common.delete',
      'common.deleteConfirmation',
      expect.any(Array),
    );
    expect(onDelete).not.toHaveBeenCalled();

    const actions = mockAlert.mock.calls[0]?.[2] as
      | { onPress?: () => void; style?: string; text: string }[]
      | undefined;
    expect(actions?.[0]).toMatchObject({
      style: 'cancel',
      text: 'common.cancel',
    });
    expect(actions?.[1]?.style).toBe('destructive');
    act(() => actions?.[1]?.onPress?.());
    expect(onDelete).toHaveBeenCalledTimes(1);

    act(() => screen!.unmount());
  });

  it('uses a feature-specific delete confirmation when provided', () => {
    let screen: ReactTestRenderer;
    act(() => {
      screen = renderer.create(
        <EntityDeleteButton
          confirmationMessage="budgets.deleteConfirmation"
          onDelete={jest.fn()}
        />,
      );
    });

    const button = screen!.root.find(
      (instance) => String(instance.type) === 'ThemeAwareButtonHost',
    );
    act(() => button.props.onPress());

    expect(mockAlert).toHaveBeenCalledWith(
      'common.delete',
      'budgets.deleteConfirmation',
      expect.any(Array),
    );

    act(() => screen!.unmount());
  });
});
