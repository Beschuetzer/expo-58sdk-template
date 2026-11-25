import { checkExternalServiceConnections, getBackendHealth } from './api';

import { logWarn } from '@/utils/logging';

jest.mock('@/utils/logging', () => ({
  logDebug: jest.fn(),
  logWarn: jest.fn(),
}));

jest.mock('@/utils/helpers', () => ({
  getBackendUrl: jest.fn(() => 'http://localhost:4200'),
  getIdentityProviderUrl: jest.fn(() => 'https://identity.example.com/'),
}));

function makeResponse(body: unknown, status: number): Response {
  return {
    json: async () => body,
    ok: status >= 200 && status < 300,
    status,
  } as Response;
}

describe('backend API', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the health response', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(makeResponse({ status: 'ok', service: 'api' }, 200));

    await expect(getBackendHealth()).resolves.toEqual({
      service: 'api',
      status: 'ok',
    });
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:4200/health');
  });

  it('throws when the backend returns an error', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(makeResponse({ status: 'error' }, 503));

    await expect(getBackendHealth()).rejects.toThrow('HTTP 503');
  });

  it('logs and rethrows non-Error health-check failures', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue('network unavailable');

    await expect(getBackendHealth()).rejects.toBe('network unavailable');
    expect(logWarn).toHaveBeenCalledWith(
      'backend_health_check_failed',
      expect.objectContaining({ errorName: 'UnknownError' }),
    );
  });

  it('checks backend and identity-provider connectivity', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        makeResponse({ status: 'ok', service: 'api' }, 200),
      )
      .mockResolvedValueOnce(makeResponse({}, 200));

    await expect(checkExternalServiceConnections()).resolves.toEqual({
      backend: 'connected',
      identityProvider: 'connected',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:4200/health',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://identity.example.com/.well-known/openid-configuration',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('reports unavailable services when their checks fail', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(makeResponse({ status: 'degraded' }, 503))
      .mockResolvedValueOnce(makeResponse({}, 503));

    await expect(checkExternalServiceConnections()).resolves.toEqual({
      backend: 'unavailable',
      identityProvider: 'unavailable',
    });
  });

  it('logs the issuer URL when the identity-provider check throws', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(makeResponse({ status: 'ok' }, 200))
      .mockRejectedValueOnce(new TypeError('Network request failed'));

    await expect(checkExternalServiceConnections()).resolves.toEqual({
      backend: 'connected',
      identityProvider: 'unavailable',
    });
    expect(logWarn).toHaveBeenCalledWith(
      'external_service_check_failed',
      expect.objectContaining({
        issuerUrl: 'https://identity.example.com',
        service: 'identity_provider',
      }),
    );
  });
});
