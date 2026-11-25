describe('mobile logging', () => {
  const originalEnvironment = process.env.EXPO_PUBLIC_ENV;
  const originalLogLevel = process.env.EXPO_PUBLIC_LOG_LEVEL;
  const consoleDebug = jest
    .spyOn(console, 'debug')
    .mockImplementation(() => undefined);
  const consoleInfo = jest
    .spyOn(console, 'info')
    .mockImplementation(() => undefined);
  const consoleWarn = jest
    .spyOn(console, 'warn')
    .mockImplementation(() => undefined);
  const consoleError = jest
    .spyOn(console, 'error')
    .mockImplementation(() => undefined);

  afterEach(() => {
    if (originalEnvironment === undefined) {
      delete process.env.EXPO_PUBLIC_ENV;
    } else {
      process.env.EXPO_PUBLIC_ENV = originalEnvironment;
    }
    if (originalLogLevel === undefined) {
      delete process.env.EXPO_PUBLIC_LOG_LEVEL;
    } else {
      process.env.EXPO_PUBLIC_LOG_LEVEL = originalLogLevel;
    }
    jest.resetModules();
    consoleDebug.mockClear();
    consoleInfo.mockClear();
    consoleWarn.mockClear();
    consoleError.mockClear();
  });

  afterAll(() => {
    consoleDebug.mockRestore();
    consoleInfo.mockRestore();
    consoleWarn.mockRestore();
    consoleError.mockRestore();
  });

  it('forwards enabled severities to the matching console methods', () => {
    process.env.EXPO_PUBLIC_ENV = 'development';
    process.env.EXPO_PUBLIC_LOG_LEVEL = 'debug';

    jest.isolateModules(() => {
      const logging = require('./logging') as typeof import('./logging');
      logging.logDebug('debug_event');
      logging.logInfo('info_event');
      logging.logWarn('warn_event');
      logging.logError('error_event');
      logging.logWhenDevelopmentMode('development detail');
    });

    expect(consoleDebug).toHaveBeenCalledTimes(2);
    expect(consoleInfo).toHaveBeenCalledTimes(1);
    expect(consoleWarn).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it('suppresses development-only logs outside development', () => {
    process.env.EXPO_PUBLIC_ENV = 'production';
    process.env.EXPO_PUBLIC_LOG_LEVEL = 'debug';

    jest.isolateModules(() => {
      const logging = require('./logging') as typeof import('./logging');
      logging.logWhenDevelopmentMode('private development detail');
    });

    expect(consoleDebug).not.toHaveBeenCalled();
  });
});
