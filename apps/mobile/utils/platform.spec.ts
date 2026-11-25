import {
  delay,
  displayAlert,
  getBackendUrl,
  getIdentityProviderUrl,
  measureExecutionTime,
  wait,
} from './helpers';

const mockLogWhenDevelopmentMode = jest.fn();
const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
const originalIdpUrl = process.env.EXPO_PUBLIC_IDP_URL;

jest.mock('expo/virtual/env', () => ({
  env: process.env,
}));

jest.mock('./logging', () => ({
  logWhenDevelopmentMode: (...args: unknown[]) =>
    mockLogWhenDevelopmentMode(...args),
}));

describe('platform utilities', () => {
  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_API_URL;
    delete process.env.EXPO_PUBLIC_IDP_URL;
    mockLogWhenDevelopmentMode.mockReset();
  });

  afterEach(() => {
    if (originalApiUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
    }
    if (originalIdpUrl === undefined) {
      delete process.env.EXPO_PUBLIC_IDP_URL;
    } else {
      process.env.EXPO_PUBLIC_IDP_URL = originalIdpUrl;
    }
    jest.useRealTimers();
  });

  it('logs objects and a fallback message for null alerts', () => {
    const alert = { message: 'Network unavailable' };

    displayAlert(alert);
    displayAlert(null);

    expect(mockLogWhenDevelopmentMode).toHaveBeenNthCalledWith(
      1,
      JSON.stringify(alert, null, 2),
    );
    expect(mockLogWhenDevelopmentMode).toHaveBeenNthCalledWith(
      2,
      'displayAlert called',
    );
  });

  it('uses a configured backend URL after trimming whitespace and a trailing slash', () => {
    process.env.EXPO_PUBLIC_API_URL = ' https://api.example.test/v1/ ';

    expect(getBackendUrl()).toBe('https://api.example.test/v1');
  });

  it('requires an AppHost- or EAS-configured backend URL', () => {
    process.env.EXPO_PUBLIC_API_URL = '  ';

    expect(() => getBackendUrl()).toThrow(
      'EXPO_PUBLIC_API_URL must be supplied by AppHost or EAS.',
    );
  });

  it('requires the AppHost- or EAS-configured identity-provider URL', () => {
    expect(() => getIdentityProviderUrl()).toThrow(
      'EXPO_PUBLIC_IDP_URL must be supplied by AppHost or EAS.',
    );
    process.env.EXPO_PUBLIC_IDP_URL = ' https://idp.example.test/ ';
    expect(getIdentityProviderUrl()).toBe('https://idp.example.test');
  });

  it('measures execution time and honors the logging option', async () => {
    const now = jest
      .spyOn(performance, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(175)
      .mockReturnValueOnce(200)
      .mockReturnValueOnce(225);
    const callback = jest.fn().mockResolvedValue(undefined);

    await measureExecutionTime(callback, 'Request');
    await measureExecutionTime(callback, 'Silent', false);

    expect(callback).toHaveBeenCalledTimes(2);
    expect(mockLogWhenDevelopmentMode).toHaveBeenCalledTimes(1);
    expect(mockLogWhenDevelopmentMode).toHaveBeenCalledWith({
      executionTimeOfRequest: 75,
    });
    now.mockRestore();
  });

  it('waits only for positive durations', async () => {
    jest.useFakeTimers();

    expect(wait(0)).toBeUndefined();
    expect(wait(-1)).toBeUndefined();

    const waiting = wait(10);
    jest.advanceTimersByTime(10);
    await expect(waiting).resolves.toBeNull();
  });

  it('delays only for positive durations', async () => {
    jest.useFakeTimers();

    await expect(delay(0)).resolves.toBeUndefined();
    await expect(delay(-1)).resolves.toBeUndefined();

    const waiting = delay(10);
    jest.advanceTimersByTime(10);
    await expect(waiting).resolves.toBeNull();
  });
});
