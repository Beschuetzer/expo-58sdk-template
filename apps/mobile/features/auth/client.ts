import type { DiscoveryDocument } from 'expo-auth-session';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { StoredAccessToken } from './storage';
import { DefinitiveOAuthRejectionError } from './errors';

import { getBackendUrl } from '@/utils/platform';

export const MOBILE_OAUTH_CLIENT_ID =
  process.env.EXPO_PUBLIC_OAUTH_CLIENT_ID?.trim() ?? '';

const configuredIdentityProviderUrl =
  process.env.EXPO_PUBLIC_IDP_URL?.trim().replace(/\/+$/, '') ?? '';

export const MOBILE_OAUTH_AUDIENCE =
  process.env.EXPO_PUBLIC_OAUTH_AUDIENCE?.trim() ||
  (configuredIdentityProviderUrl
    ? `${configuredIdentityProviderUrl}/resources/api`
    : '');

const configuredOAuthScopes =
  process.env.EXPO_PUBLIC_OAUTH_SCOPES?.trim() ||
  'openid profile email offline_access';

export const MOBILE_OAUTH_SCOPES = Array.from(
  new Set([
    ...configuredOAuthScopes.split(/[ ,]+/).filter(Boolean),
    'offline_access',
  ]),
);

const configuredAppScheme = Constants.expoConfig?.scheme;
const defaultOAuthScheme = Array.isArray(configuredAppScheme)
  ? configuredAppScheme[0]
  : configuredAppScheme;

export const MOBILE_OAUTH_SCHEME =
  process.env.EXPO_PUBLIC_OAUTH_SCHEME?.trim() ||
  defaultOAuthScheme ||
  'myapp';

export const MOBILE_OAUTH_POST_LOGOUT_REDIRECT_URI =
  process.env.EXPO_PUBLIC_OAUTH_POST_LOGOUT_REDIRECT_URI?.trim() ?? '';

type TokenResponse = Record<string, unknown>;

const DEFINITIVE_OAUTH_REJECTION_CODES = new Set([
  'invalid_request',
  'invalid_client',
  'invalid_grant',
  'unauthorized_client',
  'unsupported_grant_type',
  'invalid_scope',
]);

function asRecord(value: unknown): TokenResponse | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  return value as TokenResponse;
}

function normalizeEndpointProtocol(
  endpoint: string | undefined,
  issuerUrl: string,
) {
  if (!endpoint) return endpoint;

  const endpointUrl = new URL(endpoint);
  const issuer = new URL(issuerUrl);
  if (
    issuer.protocol === 'https:' &&
    endpointUrl.protocol === 'http:' &&
    endpointUrl.host === issuer.host
  ) {
    endpointUrl.protocol = issuer.protocol;
  }
  return endpointUrl.toString();
}

export function normalizeIdentityProviderDiscovery(
  discovery: DiscoveryDocument,
  issuerUrl: string,
): DiscoveryDocument {
  const endSessionEndpoint = normalizeEndpointProtocol(
    discovery.endSessionEndpoint,
    issuerUrl,
  );

  return {
    ...discovery,
    authorizationEndpoint: normalizeEndpointProtocol(
      discovery.authorizationEndpoint,
      issuerUrl,
    ),
    revocationEndpoint: normalizeEndpointProtocol(
      discovery.revocationEndpoint,
      issuerUrl,
    ),
    tokenEndpoint: normalizeEndpointProtocol(discovery.tokenEndpoint, issuerUrl),
    ...(endSessionEndpoint ? { endSessionEndpoint } : {}),
  };
}

export async function fetchIdentityProviderDiscovery(
  issuerUrl: string,
  signal?: AbortSignal,
): Promise<DiscoveryDocument> {
  const normalizedIssuerUrl = issuerUrl.replace(/\/+$/, '');
  const response = await fetch(
    `${normalizedIssuerUrl}/.well-known/openid-configuration`,
    {
      headers: { Accept: 'application/json' },
      ...(signal ? { signal } : {}),
    },
  );
  if (!response.ok) {
    throw new Error(
      `Identity provider discovery failed with HTTP ${response.status}.`,
    );
  }

  const discoveryDocument: unknown = await response.json();
  const document = asRecord(discoveryDocument);
  if (
    !document ||
    typeof document.authorization_endpoint !== 'string' ||
    typeof document.token_endpoint !== 'string'
  ) {
    throw new Error('The identity provider discovery document is incomplete.');
  }

  return {
    discoveryDocument:
      discoveryDocument as NonNullable<DiscoveryDocument['discoveryDocument']>,
    authorizationEndpoint: document.authorization_endpoint,
    tokenEndpoint: document.token_endpoint,
    revocationEndpoint:
      typeof document.revocation_endpoint === 'string'
        ? document.revocation_endpoint
        : undefined,
    userInfoEndpoint:
      typeof document.userinfo_endpoint === 'string'
        ? document.userinfo_endpoint
        : undefined,
    endSessionEndpoint:
      typeof document.end_session_endpoint === 'string'
        ? document.end_session_endpoint
        : undefined,
    registrationEndpoint:
      typeof document.registration_endpoint === 'string'
        ? document.registration_endpoint
        : undefined,
  };
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    if (response.ok) throw error;
    return undefined;
  }
}

function getOAuthError(result: unknown) {
  const record = asRecord(result);
  const errorCode =
    typeof record?.error === 'string' ? record.error : undefined;
  const description =
    typeof record?.error_description === 'string'
      ? record.error_description
      : undefined;
  return { errorCode, description };
}

function createTokenResponseError(
  response: Response,
  result: unknown,
  operation: string,
) {
  const { errorCode, description } = getOAuthError(result);
  const message =
    description ?? `${operation} failed with HTTP ${response.status}.`;
  if (
    response.status >= 400 &&
    response.status < 500 &&
    response.status !== 408 &&
    response.status !== 425 &&
    response.status !== 429 &&
    errorCode &&
    DEFINITIVE_OAUTH_REJECTION_CODES.has(errorCode)
  ) {
    return new DefinitiveOAuthRejectionError(errorCode, message);
  }
  return new Error(message);
}

function toStoredAccessToken(
  response: Response,
  result: unknown,
  operation: string,
  options: {
    allowMissingAccessToken?: boolean;
    previousToken?: StoredAccessToken;
  } = {},
): StoredAccessToken {
  const record = asRecord(result);
  const expiresIn = record?.expires_in;
  const tokenType = record?.token_type;
  const accessToken = record?.access_token;
  const hasValidMetadata =
    typeof expiresIn === 'number' &&
    Number.isFinite(expiresIn) &&
    expiresIn > 0 &&
    typeof tokenType === 'string' &&
    tokenType.toLowerCase() === 'bearer';

  if (
    !response.ok ||
    !record ||
    !hasValidMetadata ||
    (!options.allowMissingAccessToken && typeof accessToken !== 'string') ||
    (accessToken !== undefined && typeof accessToken !== 'string')
  ) {
    throw createTokenResponseError(response, result, operation);
  }

  return {
    accessToken: typeof accessToken === 'string' ? accessToken : '',
    idToken:
      typeof record.id_token === 'string'
        ? record.id_token
        : options.previousToken?.idToken,
    expiresAt: Date.now() + expiresIn * 1000,
    refreshToken:
      typeof record.refresh_token === 'string'
        ? record.refresh_token
        : options.previousToken?.refreshToken,
    scope:
      typeof record.scope === 'string'
        ? record.scope
        : options.previousToken?.scope ?? '',
    tokenType: 'Bearer',
  };
}

export function createProviderLogoutUrl(
  discovery: DiscoveryDocument,
  redirectUri: string,
  idTokenHint?: string,
) {
  if (!discovery.endSessionEndpoint) return null;

  const logoutUrl = new URL(discovery.endSessionEndpoint);
  logoutUrl.searchParams.set('client_id', MOBILE_OAUTH_CLIENT_ID);
  logoutUrl.searchParams.set('post_logout_redirect_uri', redirectUri);
  if (idTokenHint) logoutUrl.searchParams.set('id_token_hint', idTokenHint);
  return logoutUrl.toString();
}

export async function revokeRefreshToken(
  refreshToken: string,
  discovery: DiscoveryDocument,
) {
  if (Platform.OS === 'web' || !discovery.revocationEndpoint) return;
  if (!MOBILE_OAUTH_CLIENT_ID) {
    throw new Error('EXPO_PUBLIC_OAUTH_CLIENT_ID is required to revoke tokens.');
  }

  const response = await fetch(discovery.revocationEndpoint, {
    body: new URLSearchParams({
      client_id: MOBILE_OAUTH_CLIENT_ID,
      token: refreshToken,
      token_type_hint: 'refresh_token',
    }).toString(),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    method: 'POST',
  });
  if (!response.ok) {
    const result = await readJsonResponse(response);
    throw createTokenResponseError(response, result, 'Token revocation');
  }
}

export async function exchangeAuthorizationCode({
  code,
  codeVerifier,
  discovery,
  redirectUri,
}: {
  code: string;
  codeVerifier: string;
  discovery: DiscoveryDocument;
  redirectUri: string;
}): Promise<StoredAccessToken> {
  if (!discovery.tokenEndpoint) {
    throw new Error('The identity provider does not publish a token endpoint.');
  }
  if (!MOBILE_OAUTH_CLIENT_ID) {
    throw new Error('EXPO_PUBLIC_OAUTH_CLIENT_ID must be configured.');
  }

  const response = await fetch(discovery.tokenEndpoint, {
    body: new URLSearchParams({
      client_id: MOBILE_OAUTH_CLIENT_ID,
      code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }).toString(),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    method: 'POST',
  });
  const result = await readJsonResponse(response);
  return toStoredAccessToken(response, result, 'Token exchange');
}

export async function exchangeAuthorizationCodeForCurrentPlatform(input: {
  code: string;
  codeVerifier: string;
  discovery: DiscoveryDocument;
  redirectUri: string;
}): Promise<StoredAccessToken> {
  if (Platform.OS !== 'web') {
    return exchangeAuthorizationCode(input);
  }

  const response = await fetch(`${getBackendUrl()}/auth/token`, {
    body: new URLSearchParams({
      code: input.code,
      code_verifier: input.codeVerifier,
      redirect_uri: input.redirectUri,
    }),
    credentials: 'include',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    method: 'POST',
  });
  const result = await readJsonResponse(response);
  return toStoredAccessToken(response, result, 'Token exchange', {
    allowMissingAccessToken: true,
  });
}

export async function refreshAccessToken(
  token: StoredAccessToken | undefined,
  discovery: DiscoveryDocument,
): Promise<StoredAccessToken> {
  if (Platform.OS === 'web') {
    const response = await fetch(`${getBackendUrl()}/auth/refresh`, {
      credentials: 'include',
      method: 'POST',
    });
    const result = await readJsonResponse(response);
    return toStoredAccessToken(response, result, 'Token refresh', {
      allowMissingAccessToken: true,
      previousToken: token,
    });
  }

  if (!token?.refreshToken || !discovery.tokenEndpoint) {
    throw new Error('No refresh token is available.');
  }
  if (!MOBILE_OAUTH_CLIENT_ID) {
    throw new Error('EXPO_PUBLIC_OAUTH_CLIENT_ID must be configured.');
  }

  const response = await fetch(discovery.tokenEndpoint, {
    body: new URLSearchParams({
      client_id: MOBILE_OAUTH_CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken,
    }).toString(),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    method: 'POST',
  });
  const result = await readJsonResponse(response);
  return toStoredAccessToken(response, result, 'Token refresh', {
    previousToken: token,
  });
}

export function getDisplayNameFromClaims(claims: Record<string, unknown>) {
  for (const claim of ['name', 'preferred_username', 'email', 'nickname']) {
    const value = claims[claim];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

export function getProfilePictureFromClaims(claims: Record<string, unknown>) {
  const picture = claims.picture;
  if (typeof picture !== 'string' || !picture.trim()) return undefined;

  const url = new URL(picture.trim());
  return url.protocol === 'http:' || url.protocol === 'https:'
    ? url.toString()
    : undefined;
}

export type AccountProvider =
  | 'apple'
  | 'discord'
  | 'facebook'
  | 'github'
  | 'gitlab'
  | 'google'
  | 'linkedin'
  | 'microsoft'
  | 'x';

export function getAccountProviderFromClaims(
  claims: Record<string, unknown>,
): AccountProvider | undefined {
  const provider = ['provider', 'idp', 'identity_provider', 'connection']
    .map((key) => claims[key])
    .find(
      (value): value is string =>
        typeof value === 'string' && value.trim().length > 0,
    );
  if (!provider) return undefined;

  const normalizedProvider = provider
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
  const knownProviders: { key: AccountProvider; values: string[] }[] = [
    { key: 'apple', values: ['apple'] },
    { key: 'discord', values: ['discord'] },
    { key: 'facebook', values: ['facebook'] },
    { key: 'github', values: ['github'] },
    { key: 'gitlab', values: ['gitlab'] },
    { key: 'google', values: ['google'] },
    { key: 'linkedin', values: ['linkedin'] },
    { key: 'microsoft', values: ['microsoft', 'azuread', 'entra'] },
    { key: 'x', values: ['twitter', 'x'] },
  ];

  return knownProviders.find(({ values }) =>
    values.some((value) => normalizedProvider.includes(value)),
  )?.key;
}
