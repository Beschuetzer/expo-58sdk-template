import type { Request, Response } from 'express';

import { logDebug } from '../logging';

export function meRoute(request: Request, response: Response) {
  const subject = request.auth?.payload.sub ?? null;
  if (process.env.NODE_ENV === 'development') {
    logDebug('authenticated_profile_requested', {
      authenticated: Boolean(subject),
    });
  }

  response.json({
    subject,
    claims: request.auth?.payload ?? {},
  });
}
