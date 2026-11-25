type AppStateChangeListener = (state: string) => void;

type RelayTestOptions = {
  getValidAccessToken?: jest.Mock;
  platform?: string;
  requestAuthenticatedJson?: jest.Mock;
};

function createLogEntry(event = 'relay_test') {
  return {
    timestamp: '2025-01-01T00:00:00.000Z',
    service: 'mobile',
    level: 'info' as const,
    event,
  };
}

function loadRelay(options: RelayTestOptions = {}) {
  let appStateChangeListener: AppStateChangeListener | undefined;
  const addEventListener = jest.fn(
    (_event: string, listener: AppStateChangeListener) => {
      appStateChangeListener = listener;
    },
  );
  const getValidAccessToken =
    options.getValidAccessToken ??
    jest.fn().mockResolvedValue({ accessToken: 'test-token' });
  const requestAuthenticatedJson =
    options.requestAuthenticatedJson ??
    jest.fn().mockResolvedValue({ data: { accepted: 1 }, token: null });

  jest.doMock('react-native', () => ({
    AppState: { addEventListener },
    Platform: { OS: options.platform ?? 'ios' },
  }));
  jest.doMock('@/features/auth/tokenManager', () => ({
    getValidAccessToken,
  }));
  jest.doMock('@/features/auth/authenticatedClient', () => ({
    requestAuthenticatedJson,
  }));

  const relay =
    require('./mobileLogRelay') as typeof import('./mobileLogRelay');

  return {
    ...relay,
    addEventListener,
    getAppStateChangeListener: () => appStateChangeListener,
    getValidAccessToken,
    requestAuthenticatedJson,
  };
}

describe('mobile log relay', () => {
  const originalEnvironment = process.env.EXPO_PUBLIC_ENV;

  afterEach(() => {
    if (originalEnvironment === undefined) {
      delete process.env.EXPO_PUBLIC_ENV;
    } else {
      process.env.EXPO_PUBLIC_ENV = originalEnvironment;
    }
    jest.useRealTimers();
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it('keeps logs queued until an access token is available', async () => {
    process.env.EXPO_PUBLIC_ENV = 'development';
    jest.useFakeTimers();

    const getValidAccessToken = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ accessToken: 'test-token' });
    const requestAuthenticatedJson = jest
      .fn()
      .mockResolvedValue({ data: { accepted: 1 }, token: null });
    jest.doMock('@/features/auth/tokenManager', () => ({
      getValidAccessToken,
    }));
    jest.doMock('@/features/auth/authenticatedClient', () => ({
      requestAuthenticatedJson,
    }));

    const { queueMobileLogEntry } =
      require('./mobileLogRelay') as typeof import('./mobileLogRelay');
    queueMobileLogEntry({
      timestamp: '2025-01-01T00:00:00.000Z',
      service: 'mobile',
      level: 'info',
      event: 'relay_test',
    });

    expect(require('./environment').getIsDevelopmentMode()).toBe(true);
    expect(jest.getTimerCount()).toBe(1);
    await jest.advanceTimersByTimeAsync(500);
    expect(getValidAccessToken).toHaveBeenCalledTimes(1);
    expect(requestAuthenticatedJson).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(5000);
    expect(requestAuthenticatedJson).toHaveBeenCalledWith(
      '/api/v1/telemetry/logs',
      expect.objectContaining({ method: 'POST' }),
      { suppressLogging: true },
    );
    expect(
      JSON.parse(requestAuthenticatedJson.mock.calls[0][1].body as string),
    ).toMatchObject({
      entries: [
        {
          timestamp: '2025-01-01T00:00:00.000Z',
          service: 'mobile',
          level: 'info',
          event: 'relay_test',
        },
      ],
    });
  });

  it('does not queue logs outside development', () => {
    process.env.EXPO_PUBLIC_ENV = 'production';
    jest.useFakeTimers();

    const getValidAccessToken = jest.fn();
    const relay = loadRelay({ getValidAccessToken });
    relay.queueMobileLogEntry(createLogEntry());

    expect(getValidAccessToken).not.toHaveBeenCalled();
    expect(relay.addEventListener).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('sends web logs without resolving a native access token', async () => {
    process.env.EXPO_PUBLIC_ENV = 'development';
    jest.useFakeTimers();

    const getValidAccessToken = jest.fn();
    const requestAuthenticatedJson = jest.fn().mockResolvedValue(undefined);
    const relay = loadRelay({
      getValidAccessToken,
      platform: 'web',
      requestAuthenticatedJson,
    });
    relay.queueMobileLogEntry(createLogEntry());

    await jest.advanceTimersByTimeAsync(500);

    expect(getValidAccessToken).not.toHaveBeenCalled();
    expect(requestAuthenticatedJson).toHaveBeenCalledTimes(1);
  });

  it('drops auth-token logs generated while resolving the relay token', async () => {
    process.env.EXPO_PUBLIC_ENV = 'development';
    jest.useFakeTimers();

    let relay: ReturnType<typeof loadRelay> | undefined;
    const getValidAccessToken = jest.fn(() => {
      relay?.queueMobileLogEntry(createLogEntry('auth_access_token_refresh'));
      return Promise.resolve({ accessToken: 'test-token' });
    });
    const requestAuthenticatedJson = jest.fn().mockResolvedValue(undefined);
    relay = loadRelay({ getValidAccessToken, requestAuthenticatedJson });
    relay.queueMobileLogEntry(createLogEntry('application_ready'));

    await jest.advanceTimersByTimeAsync(500);

    const body = JSON.parse(
      requestAuthenticatedJson.mock.calls[0][1].body as string,
    );
    expect(body.entries.map((entry: { event: string }) => entry.event)).toEqual(
      ['application_ready'],
    );
  });

  it('limits unauthenticated retries before sending a later batch', async () => {
    process.env.EXPO_PUBLIC_ENV = 'development';
    jest.useFakeTimers();

    const getValidAccessToken = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ accessToken: 'test-token' });
    const requestAuthenticatedJson = jest.fn().mockResolvedValue(undefined);
    const relay = loadRelay({ getValidAccessToken, requestAuthenticatedJson });
    relay.queueMobileLogEntry(createLogEntry());

    await jest.advanceTimersByTimeAsync(500);
    await jest.advanceTimersByTimeAsync(5000);
    await jest.advanceTimersByTimeAsync(500);

    expect(getValidAccessToken).toHaveBeenCalledTimes(3);
    expect(requestAuthenticatedJson).toHaveBeenCalledTimes(1);
  });

  it('retries when access-token resolution throws an unknown error', async () => {
    process.env.EXPO_PUBLIC_ENV = 'development';
    jest.useFakeTimers();

    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const getValidAccessToken = jest
      .fn()
      .mockRejectedValueOnce('auth unavailable')
      .mockResolvedValueOnce({ accessToken: 'test-token' });
    const requestAuthenticatedJson = jest.fn().mockResolvedValue(undefined);
    const relay = loadRelay({ getValidAccessToken, requestAuthenticatedJson });
    relay.queueMobileLogEntry(createLogEntry());

    await jest.advanceTimersByTimeAsync(500);
    expect(warning).toHaveBeenCalledWith('mobile_log_relay_auth_unavailable', {
      errorName: 'UnknownError',
    });

    await jest.advanceTimersByTimeAsync(5000);
    expect(requestAuthenticatedJson).toHaveBeenCalledTimes(1);
  });

  it('drops rejected batches and retries unexpected request failures', async () => {
    process.env.EXPO_PUBLIC_ENV = 'development';
    jest.useFakeTimers();

    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => {});
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const requestAuthenticatedJson = jest
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error('payload rejected'), { statusCode: 413 }),
      )
      .mockRejectedValueOnce(
        Object.assign(new Error('server unavailable'), { statusCode: 500 }),
      )
      .mockResolvedValueOnce(undefined);
    const relay = loadRelay({ requestAuthenticatedJson });
    relay.queueMobileLogEntry(createLogEntry('rejected'));

    await jest.advanceTimersByTimeAsync(500);
    expect(errorLog).toHaveBeenCalledWith('mobile_log_relay_rejected', {
      statusCode: 413,
    });

    relay.queueMobileLogEntry(createLogEntry('retry'));
    await jest.advanceTimersByTimeAsync(500);
    expect(warning).toHaveBeenCalledWith('mobile_log_relay_failed', {
      errorName: 'Error',
    });

    await jest.advanceTimersByTimeAsync(5000);
    expect(requestAuthenticatedJson).toHaveBeenCalledTimes(3);
  });

  it('bounds the pending queue and sends batches of at most 25 entries', async () => {
    process.env.EXPO_PUBLIC_ENV = 'development';
    jest.useFakeTimers();

    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const requestAuthenticatedJson = jest.fn().mockResolvedValue(undefined);
    const relay = loadRelay({ requestAuthenticatedJson });
    for (let index = 0; index <= 500; index += 1) {
      relay.queueMobileLogEntry(createLogEntry(`relay_${index}`));
    }

    expect(warning).toHaveBeenCalledTimes(1);
    expect(warning).toHaveBeenCalledWith('mobile_log_relay_queue_overflow');

    await jest.advanceTimersByTimeAsync(500);

    const batch = JSON.parse(
      requestAuthenticatedJson.mock.calls[0][1].body as string,
    ).entries as { event: string }[];
    expect(batch).toHaveLength(25);
    expect(batch[0].event).toBe('relay_1');
  });

  it('flushes immediately for active and background app-state changes', async () => {
    process.env.EXPO_PUBLIC_ENV = 'development';
    jest.useFakeTimers();

    const requestAuthenticatedJson = jest.fn().mockResolvedValue(undefined);
    const relay = loadRelay({
      platform: 'web',
      requestAuthenticatedJson,
    });
    relay.queueMobileLogEntry(createLogEntry('first'));
    relay.queueMobileLogEntry(createLogEntry('second'));

    const onAppStateChange = relay.getAppStateChangeListener();
    expect(onAppStateChange).toBeDefined();
    onAppStateChange?.('inactive');
    onAppStateChange?.('active');
    onAppStateChange?.('background');

    await jest.advanceTimersByTimeAsync(0);

    expect(requestAuthenticatedJson).toHaveBeenCalledTimes(1);
  });
});
