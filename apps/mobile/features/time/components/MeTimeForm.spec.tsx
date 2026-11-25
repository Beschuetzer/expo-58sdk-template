import type {
  CreateMeTimeInput,
  MeTime,
} from '@expo-50sdk-template/shared-types';
import React from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';

import { MeTimeForm } from './MeTimeForm';

jest.mock('@/components/ui/ThemeAwareButton', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareButton: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement('ButtonHost', props, children),
  };
});

jest.mock('@/components/ui/ThemeAwareInput', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareInput: (props: Record<string, unknown>) =>
      React.createElement('InputHost', props),
  };
});

jest.mock('@/components/ui/ThemeAwareScreen', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareScreen: ({
      bottomContent,
      children,
      ...props
    }: {
      bottomContent?: React.ReactNode;
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => React.createElement('ScreenHost', props, children, bottomContent),
  };
});

jest.mock('@/components/ui/ThemeAwareSurface', () => ({
  ThemeAwareSurface: 'SurfaceHost',
}));

jest.mock('@/components/ui/ThemeAwareText', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareHeading: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement('HeadingHost', props, children),
    ThemeAwareText: ({
      children,
      ...props
    }: Record<string, unknown> & { children?: React.ReactNode }) =>
      React.createElement('TextHost', props, children),
  };
});

jest.mock('@/components/ui/ThemeAwareTimePicker', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    ThemeAwareTimePicker: (props: Record<string, unknown>) =>
      React.createElement('TimePickerHost', props),
  };
});

jest.mock('@/components/ui/vstack', () => ({
  VStack: 'VStackHost',
}));

jest.mock('@/utils/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

let mountedRenderer: ReactTestRenderer | undefined;

describe('MeTimeForm', () => {
  afterEach(() => {
    if (mountedRenderer) {
      act(() => mountedRenderer?.unmount());
      mountedRenderer = undefined;
    }
  });

  it('creates a default one-hour range and submits a trimmed description', async () => {
    const onSubmit = jest.fn(async (_input: CreateMeTimeInput) => undefined);
    act(() => {
      mountedRenderer = renderer.create(
        <MeTimeForm
          error={null}
          isPending={false}
          onSubmit={onSubmit}
          submitLabel="Save"
          title="New Me Time"
        />,
      );
    });

    const [startPicker, endPicker] = mountedRenderer!.root.findAll(
      (instance) => String(instance.type) === 'TimePickerHost',
    );
    const startTime = startPicker.props.value as Date;
    const endTime = endPicker.props.value as Date;
    expect(endTime.getSeconds()).toBe(0);
    expect(endTime.getMilliseconds()).toBe(0);
    expect(endTime.getTime() - startTime.getTime()).toBe(60 * 60 * 1000);

    const descriptionInput = mountedRenderer!.root.find(
      (instance) => String(instance.type) === 'InputHost',
    );
    act(() => descriptionInput.props.onChangeText('  Reading time  '));
    await act(async () => {
      submitButton().props.onPress();
      await Promise.resolve();
    });

    expect(onSubmit).toHaveBeenCalledWith({
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      description: 'Reading time',
    });
  });

  it('accepts picker changes only when a date is selected and validates the range', () => {
    const initialValue: Pick<MeTime, 'startTime' | 'endTime' | 'description'> =
      {
        startTime: '2026-10-29T10:00:00.000Z',
        endTime: '2026-10-29T11:00:00.000Z',
      };
    act(() => {
      mountedRenderer = renderer.create(
        <MeTimeForm
          descriptionText="Choose a time range."
          error={new Error('Save failed.')}
          initialValue={initialValue}
          isPending={false}
          onSubmit={async () => undefined}
          submitLabel="Save"
          title="Edit Me Time"
        />,
      );
    });

    const getPickers = () =>
      mountedRenderer!.root.findAll(
        (instance) => String(instance.type) === 'TimePickerHost',
      );
    const originalStart = getPickers()[0].props.value;
    const laterStart = new Date('2026-10-29T12:00:00.000Z');
    act(() => {
      getPickers()[0].props.onChange(
        { type: 'dismissed' },
        new Date('2026-10-29T09:00:00.000Z'),
      );
      getPickers()[0].props.onChange({ type: 'set' }, undefined);
    });
    expect(getPickers()[0].props.value).toBe(originalStart);

    act(() => {
      getPickers()[0].props.onChange({ type: 'set' }, laterStart);
    });
    expect(textChildren()).toContain('time.endBeforeStart');
    expect(submitButton().props.isDisabled).toBe(true);

    act(() => {
      getPickers()[1].props.onChange(
        { type: 'set' },
        new Date('2026-10-29T13:00:00.000Z'),
      );
    });
    expect(textChildren()).not.toContain('time.endBeforeStart');
    expect(textChildren()).toContain('Choose a time range.');
    expect(textChildren()).toContain('Save failed.');
    expect(submitButton().props.isDisabled).toBe(false);
  });

  it('disables the form while pending and omits blank descriptions on submit', async () => {
    const onSubmit = jest.fn(async (_input: CreateMeTimeInput) => undefined);
    act(() => {
      mountedRenderer = renderer.create(
        <MeTimeForm
          error={null}
          initialValue={{
            startTime: '2026-10-29T10:00:00.000Z',
            endTime: '2026-10-29T11:00:00.000Z',
            description: '   ',
          }}
          isPending
          onSubmit={onSubmit}
          submitLabel="Save"
          title="Edit Me Time"
        />,
      );
    });

    expect(submitButton().props.isDisabled).toBe(true);
    expect(
      mountedRenderer!.root
        .findAll((instance) => String(instance.type) === 'TimePickerHost')
        .every((picker) => picker.props.isDisabled),
    ).toBe(true);

    act(() => mountedRenderer?.unmount());
    mountedRenderer = undefined;
    act(() => {
      mountedRenderer = renderer.create(
        <MeTimeForm
          error={null}
          initialValue={{
            startTime: '2026-10-29T10:00:00.000Z',
            endTime: '2026-10-29T11:00:00.000Z',
          }}
          isPending={false}
          onSubmit={onSubmit}
          submitLabel="Save"
          title="Edit Me Time"
        />,
      );
    });
    await act(async () => {
      submitButton().props.onPress();
      await Promise.resolve();
    });

    expect(onSubmit).toHaveBeenCalledWith({
      startTime: '2026-10-29T10:00:00.000Z',
      endTime: '2026-10-29T11:00:00.000Z',
      description: undefined,
    });
  });
});

function submitButton() {
  return mountedRenderer!.root.find(
    (instance) =>
      String(instance.type) === 'ButtonHost' &&
      instance.props.children === 'Save',
  );
}

function textChildren() {
  return mountedRenderer!.root
    .findAll((instance) => String(instance.type) === 'TextHost')
    .map((text) => text.props.children);
}
