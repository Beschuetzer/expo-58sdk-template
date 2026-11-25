import {
  getPaymentRequests,
  getRelationships,
} from './features/payment-requests/api';

import { getValidAccessToken } from '@/features/auth/tokenManager';

jest.mock('@/features/auth/tokenManager', () => ({
  getValidAccessToken: jest.fn(),
}));

jest.mock('@/utils/helpers', () => ({
  getBackendUrl: jest.fn(() => 'http://localhost:4200'),
}));

jest.mock('@/utils/logging', () => ({
  logDebug: jest.fn(),
  logWarn: jest.fn(),
}));

function makeResponse(status: number, body: unknown): Response {
  return {
    body: null,
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe('payment request API authentication', () => {
  const currentToken = {
    accessToken: 'expired-access-token',
    expiresAt: Date.now() - 1,
    refreshToken: 'refresh-token',
    scope: 'payment-requests:read',
    tokenType: 'Bearer' as const,
  };
  const refreshedToken = {
    ...currentToken,
    accessToken: 'refreshed-access-token',
    expiresAt: Date.now() + 60_000,
  };
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(require('react-native'), 'Platform', {
      configurable: true,
      value: { OS: 'android' },
    });
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('returns the API payload without authentication metadata', async () => {
    jest.mocked(getValidAccessToken).mockResolvedValueOnce(refreshedToken);
    const relationships = [{ id: 'relationship-1', name: 'Shared space' }];
    fetchMock.mockResolvedValueOnce(makeResponse(200, relationships));

    await expect(getRelationships()).resolves.toEqual(relationships);
  });

  it('serializes multiple request categories as repeated query parameters', async () => {
    jest.mocked(getValidAccessToken).mockResolvedValueOnce(refreshedToken);
    fetchMock.mockResolvedValueOnce(makeResponse(200, { items: [] }));

    await expect(
      getPaymentRequests('relationship-1', {
        categories: ['Home', 'Groceries'],
      }),
    ).resolves.toEqual({ items: [] });

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'http://localhost:4200/api/v1/relationships/relationship-1/payment-requests?categories=Home&categories=Groceries',
    );
  });

  it('retries once with the refreshed token after a 401', async () => {
    jest
      .mocked(getValidAccessToken)
      .mockResolvedValueOnce(currentToken)
      .mockResolvedValueOnce(refreshedToken);
    fetchMock
      .mockResolvedValueOnce(makeResponse(401, { message: 'Token expired' }))
      .mockResolvedValueOnce(makeResponse(200, []));

    await expect(getRelationships()).resolves.toEqual([]);

    const requestSignal =
      jest.mocked(getValidAccessToken).mock.calls[0][0]?.signal;
    expect(requestSignal).toBeDefined();
    expect(getValidAccessToken).toHaveBeenNthCalledWith(1, {
      signal: requestSignal,
    });
    expect(getValidAccessToken).toHaveBeenNthCalledWith(2, {
      rejectedAccessToken: currentToken.accessToken,
      signal: requestSignal,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstHeaders = fetchMock.mock.calls[0][1]?.headers as Headers;
    const secondHeaders = fetchMock.mock.calls[1][1]?.headers as Headers;
    expect(firstHeaders.get('authorization')).toBe(
      `Bearer ${currentToken.accessToken}`,
    );
    expect(secondHeaders.get('authorization')).toBe(
      `Bearer ${refreshedToken.accessToken}`,
    );
  });

  it('does not retry more than once', async () => {
    jest
      .mocked(getValidAccessToken)
      .mockResolvedValueOnce(currentToken)
      .mockResolvedValueOnce(refreshedToken);
    fetchMock
      .mockResolvedValueOnce(makeResponse(401, { message: 'Token expired' }))
      .mockResolvedValueOnce(
        makeResponse(401, { message: 'Still unauthorized' }),
      );

    await expect(getRelationships()).rejects.toThrow('Still unauthorized');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry if refresh did not produce a different token', async () => {
    jest
      .mocked(getValidAccessToken)
      .mockResolvedValueOnce(currentToken)
      .mockResolvedValueOnce(currentToken);
    fetchMock.mockResolvedValueOnce(
      makeResponse(401, { message: 'Token expired' }),
    );

    await expect(getRelationships()).rejects.toThrow('Token expired');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
