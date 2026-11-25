import React from 'react';
import { Image } from 'react-native';
import renderer, { act } from 'react-test-renderer';

import { SexCoinSimulation } from './SexCoinSimulation';

jest.mock('react-native-reanimated', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const ReactNative = jest.requireActual(
    'react-native',
  ) as typeof import('react-native');

  return {
    __esModule: true,
    default: { View: ReactNative.View },
    cancelAnimation: jest.fn(),
    Easing: {
      cubic: 'cubic',
      linear: 'linear',
      out: (easing: unknown) => easing,
    },
    useAnimatedStyle: (callback: () => object) => callback(),
    useSharedValue: (value: number) => React.useRef({ value }).current,
    withRepeat: jest.fn((animation: number) => animation),
    withSequence: jest.fn((...animations: number[]) => animations[0]),
    withTiming: jest.fn((value: number) => value),
  };
});

const reanimated = jest.requireMock('react-native-reanimated') as {
  withRepeat: jest.Mock;
  withSequence: jest.Mock;
  withTiming: jest.Mock;
};

describe('SexCoinSimulation', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('renders the default heads face before the first result', () => {
    const screen = renderer.create(
      <SexCoinSimulation
        accessibilityLabel="Animated coin"
        isFlipping={false}
        outcome={null}
      />,
    );

    expect(
      screen.root.findByProps({ testID: 'sex-coin' }).props.accessible,
    ).toBe(true);
    const headsFace = screen.root.findByProps({ testID: 'sex-coin-heads' });
    expect(headsFace.findByType(Image).props.source).toBeDefined();
    expect(
      screen.root.findAllByProps({ testID: 'sex-coin-tails' }),
    ).toHaveLength(0);
  });

  it('shows both coin sides while spinning and settles on the reported side', () => {
    jest.useFakeTimers();

    const screen = renderer.create(
      <SexCoinSimulation
        accessibilityLabel="Animated coin"
        isFlipping={false}
        outcome={null}
      />,
    );

    const headsPhotoSource = screen.root
      .findByProps({ testID: 'sex-coin-heads' })
      .findByType(Image).props.source;

    act(() => {
      screen.update(
        <SexCoinSimulation
          accessibilityLabel="Animated coin"
          isFlipping
          outcome={null}
        />,
      );
    });

    expect(reanimated.withRepeat).toHaveBeenCalledWith(
      expect.anything(),
      -1,
      false,
    );

    act(() => {
      jest.advanceTimersByTime(90);
    });

    const tailsFace = screen.root.findByProps({ testID: 'sex-coin-tails' });
    const tailsPhotoSource = tailsFace.findByType(Image).props.source;
    expect(tailsPhotoSource).not.toEqual(headsPhotoSource);

    act(() => {
      jest.advanceTimersByTime(180);
    });

    expect(screen.root.findByProps({ testID: 'sex-coin-heads' })).toBeDefined();

    act(() => {
      screen.update(
        <SexCoinSimulation
          accessibilityLabel="Animated coin"
          isFlipping={false}
          outcome="tails"
        />,
      );
    });

    act(() => {
      jest.advanceTimersByTime(90);
    });

    const settledTails = screen.root.findByProps({
      testID: 'sex-coin-tails',
    });
    expect(settledTails.findByType(Image).props.source).toEqual(
      tailsPhotoSource,
    );
    expect(
      screen.root.findAllByProps({ testID: 'sex-coin-heads' }),
    ).toHaveLength(0);
    act(() => screen.unmount());
  });

  it('uses the latest outcome when it changes during a landing animation', () => {
    jest.useFakeTimers();

    const screen = renderer.create(
      <SexCoinSimulation
        accessibilityLabel="Animated coin"
        isFlipping={false}
        outcome={null}
      />,
    );

    act(() => {
      screen.update(
        <SexCoinSimulation
          accessibilityLabel="Animated coin"
          isFlipping={false}
          outcome="tails"
        />,
      );
    });
    expect(screen.root.findByProps({ testID: 'sex-coin-tails' })).toBeDefined();

    act(() => {
      screen.update(
        <SexCoinSimulation
          accessibilityLabel="Animated coin"
          isFlipping
          outcome="tails"
        />,
      );
    });
    act(() => jest.advanceTimersByTime(90));
    act(() => {
      screen.update(
        <SexCoinSimulation
          accessibilityLabel="Animated coin"
          isFlipping={false}
          outcome="heads"
        />,
      );
    });
    act(() => {
      screen.update(
        <SexCoinSimulation
          accessibilityLabel="Animated coin"
          isFlipping={false}
          outcome="tails"
        />,
      );
    });
    expect(screen.root.findByProps({ testID: 'sex-coin-heads' })).toBeDefined();

    act(() => jest.advanceTimersByTime(90));
    expect(screen.root.findByProps({ testID: 'sex-coin-tails' })).toBeDefined();
    act(() => screen.unmount());
  });

  it('clears side-change and landing timers on restart and unmount', () => {
    jest.useFakeTimers();

    const intervalScreen = renderer.create(
      <SexCoinSimulation
        accessibilityLabel="Animated coin"
        isFlipping={false}
        outcome={null}
      />,
    );
    act(() => {
      intervalScreen.update(
        <SexCoinSimulation
          accessibilityLabel="Animated coin"
          isFlipping
          outcome={null}
        />,
      );
    });
    act(() => jest.advanceTimersByTime(90));
    act(() => intervalScreen.unmount());
    expect(jest.getTimerCount()).toBe(0);

    const landingScreen = renderer.create(
      <SexCoinSimulation
        accessibilityLabel="Animated coin"
        isFlipping={false}
        outcome={null}
      />,
    );
    act(() => {
      landingScreen.update(
        <SexCoinSimulation
          accessibilityLabel="Animated coin"
          isFlipping
          outcome={null}
        />,
      );
    });
    act(() => {
      landingScreen.update(
        <SexCoinSimulation
          accessibilityLabel="Animated coin"
          isFlipping={false}
          outcome="tails"
        />,
      );
    });
    act(() => landingScreen.unmount());
    expect(jest.getTimerCount()).toBe(0);

    const restartedScreen = renderer.create(
      <SexCoinSimulation
        accessibilityLabel="Animated coin"
        isFlipping={false}
        outcome={null}
      />,
    );
    act(() => {
      restartedScreen.update(
        <SexCoinSimulation
          accessibilityLabel="Animated coin"
          isFlipping
          outcome={null}
        />,
      );
    });
    act(() => jest.advanceTimersByTime(90));
    act(() => {
      restartedScreen.update(
        <SexCoinSimulation
          accessibilityLabel="Animated coin"
          isFlipping={false}
          outcome="tails"
        />,
      );
    });
    act(() => {
      restartedScreen.update(
        <SexCoinSimulation
          accessibilityLabel="Animated coin"
          isFlipping
          outcome="heads"
        />,
      );
    });
    act(() => restartedScreen.unmount());
    expect(jest.getTimerCount()).toBe(0);
  });
});
