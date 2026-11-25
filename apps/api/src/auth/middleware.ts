import type { RequestHandler } from 'express';
import { auth, requiredScopes } from 'express-oauth2-jwt-bearer';

import type { ApiConfig } from '../config/env';
import { logDebug, logWarn } from '../logging';

export type AuthMiddleware = RequestHandler;

export function requireOAuthScopes(scopes: string[]): AuthMiddleware {
  if (scopes.length === 0) {
    return (_request, _response, next) => next();
  }
  return requiredScopes(scopes);
}

export function createOAuth2Middleware(config: ApiConfig): AuthMiddleware {
  const { audience, issuerBaseUrl } = config.oauth2;

  if (!issuerBaseUrl || !audience) {
    return (_request, response) => {
      logWarn('auth_not_configured', {
        requestId: response.locals.requestId,
      });
      response.status(503).json({
        message:
          'OAuth2 authentication is not configured. Set AUTH_ISSUER_BASE_URL and AUTH_AUDIENCE.',
        status: 'auth_not_configured',
      });
    };
  }

  const verifier = auth({ issuerBaseURL: issuerBaseUrl, audience });
  const scopeMiddleware = config.oauth2.requiredScopes.length
    ? requiredScopes(config.oauth2.requiredScopes)
    : undefined;

  return (request, response, next) => {
    const cookieToken = request.headers.cookie
      ?.split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith('bff_access_token='))
      ?.slice('bff_access_token='.length);
    const hasQueryToken = typeof request.query.access_token === 'string';
    const hasBodyToken =
      typeof request.body?.access_token === 'string' &&
      request.is('application/x-www-form-urlencoded');

    logDebug('auth_request_received', {
      hasAuthorization: Boolean(request.headers.authorization),
      hasBodyToken,
      hasQueryToken,
      hasSessionCookie: Boolean(cookieToken),
      requestId: response.locals.requestId,
    });

    if (!request.headers.authorization && cookieToken) {
      request.headers.authorization = `Bearer ${decodeURIComponent(cookieToken)}`;
    }

    if (!request.headers.authorization && !hasQueryToken && !hasBodyToken) {
      logDebug('auth_request_missing_credentials', {
        requestId: response.locals.requestId,
      });
      response.status(401).json({
        message: 'Authentication is required.',
        status: 'unauthorized',
      });
      return;
    }

    verifier(request, response, (error) => {
      if (error) {
        logWarn('auth_token_rejected', {
          errorName:
            error instanceof Error ? error.name : 'AuthenticationError',
          requestId: response.locals.requestId,
        });
        next(error);
        return;
      }

      if (scopeMiddleware) {
        scopeMiddleware(request, response, next);
        return;
      }

      next();
    });
  };
}
