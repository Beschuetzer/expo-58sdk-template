global.alert = jest.fn();

jest.mock('expo-image', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    Image: (props: Record<string, unknown>) =>
      React.createElement('ExpoImageHost', props),
  };
});

jest.mock('expo-linear-gradient', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    LinearGradient: (props: Record<string, unknown>) =>
      React.createElement('ExpoLinearGradientHost', props),
  };
});

jest.mock('react-test-renderer', () => {
  const renderer = jest.requireActual<typeof import('react-test-renderer')>(
    'react-test-renderer',
  );
  let actDepth = 0;
  const act = (callback: () => void | Promise<void>) => {
    actDepth += 1;
    let released = false;
    const release = () => {
      if (released) return;
      actDepth -= 1;
      released = true;
    };

    try {
      let callbackResult: void | Promise<void> = undefined;
      const wrappedCallback: () => void = () => {
        callbackResult = callback();
        return callbackResult as void;
      };
      const result = renderer.act(wrappedCallback);
      if (callbackResult !== undefined) {
        Promise.resolve(callbackResult).then(release, release);
      } else {
        release();
      }
      return result;
    } catch (error) {
      release();
      throw error;
    }
  };
  const create = (...args: Parameters<typeof renderer.create>) => {
    if (actDepth > 0) {
      return renderer.create(...args);
    }

    let testRenderer: ReturnType<typeof renderer.create> | undefined;
    act(() => {
      testRenderer = renderer.create(...args);
    });

    if (!testRenderer) {
      throw new Error('React test renderer did not create a test instance');
    }

    return testRenderer;
  };
  const defaultExport = { ...renderer, act, create };

  return {
    __esModule: true,
    ...defaultExport,
    default: defaultExport,
  };
});

const resetExpoEnv = () => {
  const nextEnv = { ...process.env };
  for (const key of ['EXPO_PUBLIC_ENV']) {
    delete nextEnv[key];
  }

  Object.defineProperty(process, 'env', {
    value: nextEnv,
    configurable: true,
    writable: true,
  });
};

resetExpoEnv();

if (typeof global.fetch !== 'function') {
  global.fetch = jest.fn();
}

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(() => jest.fn()),
}));

jest.mock('react-native-css-interop', () => {
  const React = jest.requireActual('react') as typeof import('react');
  return {
    createElement: React.createElement,
    createInteropElement: React.createElement,
  };
});

jest.mock('nativewind', () => ({
  cssInterop: (component: unknown) => component,
  useColorScheme: () => ({
    colorScheme: 'light',
    setColorScheme: jest.fn(),
  }),
  vars: (variables: Record<string, string>) => variables,
}));
