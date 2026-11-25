export const AUTH_REQUEST_TIMEOUT_MS = 15_000;

export class ApiRequestTimeoutError extends Error {
  constructor() {
    super('The request timed out.');
    this.name = 'ApiRequestTimeoutError';
  }
}

export class AuthenticatedRequestError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AuthenticatedRequestError';
  }
}

export class DefinitiveOAuthRejectionError extends Error {
  constructor(
    readonly oauthErrorCode: string,
    message: string,
  ) {
    super(message);
    this.name = 'DefinitiveOAuthRejectionError';
  }
}

export class MissingTokenEndpointError extends Error {
  constructor() {
    super('The identity provider does not publish a token endpoint.');
    this.name = 'MissingTokenEndpointError';
  }
}

export class RefreshOutcomeUnknownError extends Error {
  constructor() {
    super('The token refresh outcome could not be confirmed.');
    this.name = 'RefreshOutcomeUnknownError';
  }
}
