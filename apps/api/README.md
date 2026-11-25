# API

Node.js HTTP API for local development and production-oriented extension.

## Structure

- `src/config`: environment parsing and validated runtime configuration.
- `src/auth`: OAuth2 bearer-token middleware and the injectable auth boundary.
- `src/features/notifications`: reusable Expo push message sender.
- `src/routes`: health, current-user, and mobile telemetry route handlers.
- `prisma/seed-dev.ts`: development-only seed command for generic example data.
- `src/app.ts`: Express middleware and versioned route composition, independent of the listening socket.
- `src/server.ts`: server creation, startup, and shutdown lifecycle.
- `src/main.ts`: process entrypoint and signal handling.
- `src/app.spec.ts`: API contract tests using Node's built-in test runner.

## Runtime configuration

The local development values are supplied by the Aspire AppHost in
`AppHost/Program.cs`; use `npm run dev` from the repository root to start the
API with MongoDB and the mobile app. The API reads these environment variables
for deployed environments:

- `HOST`: bind address, default `0.0.0.0`.
- `PORT`: TCP port from `1` to `65535`, default `4200`.
- `NODE_ENV`: runtime environment label, default `development`.
- `LOG_LEVEL`: minimum emitted log severity (`debug`, `info`, `warn`, `error`, or `silent`); defaults to `debug` in development and `info` in production.
- `DATABASE_URL`: MongoDB connection string for Prisma. Required for database access.
- `AUTH_ISSUER_BASE_URL`: OAuth2/OIDC issuer base URL. Required for protected routes.
- `AUTH_AUDIENCE`: expected OAuth2 access-token audience. Required for protected routes.
- `AUTH_REQUIRED_SCOPES`: optional space- or comma-separated scopes required by all protected routes.
- `AUTH_CLIENT_ID`: OAuth client ID used by the BFF routes; defaults to `mobile-development-client`.
- `CORS_ORIGIN`: allowed browser origin; defaults to `http://localhost:8081`.

API and mobile logs use the shared structured logger in `libs/logging`. Set
`LOG_LEVEL` for the API or `EXPO_PUBLIC_LOG_LEVEL` for the Expo app. The chosen
level and higher severities are emitted; `silent` disables log output. Log
events intentionally omit credentials, tokens, request bodies, and raw
identifier-bearing paths.

## Prisma + MongoDB

This API is preconfigured for Prisma with a MongoDB datasource so you can
attach a document-backed database without custom driver glue. The schema
contains generic `Example`, `Notification`, and `NotificationPushToken` models;
keep or replace them as appropriate for your app.

The AppHost provisions local MongoDB and supplies `DATABASE_URL`. For deployed
environments, provide the database connection string through the hosting
platform's configuration.

1. Define your application models in `apps/api/prisma/schema.prisma`.
2. Run `npx prisma generate --schema=apps/api/prisma/schema.prisma` after changing the schema.
3. For MongoDB, use `npx prisma db push --schema=apps/api/prisma/schema.prisma` to apply schema changes.

For MongoDB, Prisma uses the native `mongodb` provider and document IDs are represented as `ObjectId` strings.

AppHost supplies the issuer, audience, and client configuration to the API and
Expo app. Deployed APIs must receive their own `AUTH_ISSUER_BASE_URL` and
`AUTH_AUDIENCE` values from deployment configuration. Clients must send the
OAuth access token as the bearer token. The ID token is for the OAuth client
and has the client ID as its audience, so it is correctly rejected by this
resource server.

## Routes and commands

- `GET /health` returns a public JSON health response for deployment probes.
- `GET /api/v1/me` is a protected example resource and requires a valid OAuth2 bearer token.
- `POST /api/v1/telemetry/logs` accepts authenticated mobile log batches in development.
- `POST /auth/token`, `POST /auth/refresh`, and `POST /auth/logout` support the
  OAuth2 BFF session flow; `GET /auth/session` checks the current session.
- `npm run prisma:seed:dev --workspace=api` upserts ten `Example` records. Set
  `NODE_ENV=development` and configure `DATABASE_URL` before running it.
- `npm run test --workspace=api` runs the API contract tests.
- `npm run typecheck --workspace=api` validates TypeScript without emitting files.
- `npm run api:build` generates Prisma and library artifacts, then emits the API to `dist/apps/api`.
- `npm run dev` starts the API, mobile app, and MongoDB through the C# Aspire 17 AppHost in `AppHost/`.

### OAuth2 architecture

The API is an OAuth2 resource server, not an identity provider. An external
OAuth2/OIDC provider issues access tokens; the API validates those tokens using
issuer discovery, audience validation, and cached JWKS keys through
`express-oauth2-jwt-bearer`. It does not store client secrets or passwords.

Protected routes opt into authentication at route registration and receive the
validated claims on `request.auth`. Keep provider-specific behavior inside
`src/auth/middleware.ts`; route handlers should consume claims and remain
independent of Auth0, Entra, Okta, or another provider. Tests can inject an
`AuthMiddleware` through `createApp` without contacting a real identity
provider.

Protected routes fail closed with `503 auth_not_configured` if the provider
settings are removed. Never replace that behavior with a development token
bypass in shared or production code.

## Deploy to Heroku

This is an npm-workspaces monorepo, so Heroku must be configured against the
repository root, not `apps/api`. The root `build` script generates the Prisma
client and builds the shared libraries and API, and the root `Procfile` starts
the compiled API with `npm run api:start`.

### Prerequisites

1. Install the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli).
2. Log in with `heroku login`.
3. Commit the repository changes you want to deploy.

From the repository root, run:

```sh
npm install
npm run heroku:setup -- my-api-name
```

The setup command:

- builds the API locally with `npm run api:build`;
- creates the Heroku app if it does not exist;
- adds or updates the `heroku` Git remote; and
- sets `NODE_ENV=production`.

It does not set `PORT` or `HOST`. Heroku supplies `PORT` dynamically, and the
API defaults to listening on `0.0.0.0`, which is the correct binding for a
Heroku dyno. Do not hard-code either value in Heroku config.

The setup command only configures the app. Deploy the current branch with:

```sh
git push heroku HEAD:main
```

Or configure and deploy in one explicit command:

```sh
npm run heroku:setup -- my-api-name --deploy
```

`npm run api:build` regenerates the Prisma client and compiles the API. Run it
after stopping the local API on Windows to avoid replacing Prisma's active
query engine.

Heroku will run the root `npm run build` lifecycle during deployment and then
use the `web` process from `Procfile`. After deployment, verify the API with:

```sh
heroku open /health --app my-api-name
```

The expected response contains `"status":"ok"`. Logs are available with:

```sh
heroku logs --tail --app my-api-name
```

### Deploy API and mobile build

From the repository root, deploy the API and then start the EAS production
build:

```sh
npm run deploy:all -- my-api-name
```

The platform defaults to `all`. To build a single platform, pass `android` or
`ios` as the second argument. The script waits for the Heroku deploy to finish
before starting EAS, then returns without waiting for the remote mobile build.
Commit the changes you want deployed first, and make sure the Heroku CLI and EAS
account are authenticated.

### Connecting the mobile app

The mobile app must use the deployed HTTPS URL in its production environment,
for example `https://my-api-name-abc123.herokuapp.com`. Do not use the local
`192.168.x.x:4200` address outside local development. Configure the mobile
Expo public environment values for the deployment before creating the mobile
build, including the production environment marker and API host expected by
the mobile URL resolver.

Heroku config variables are appropriate for server-side configuration and
secrets. Mobile `EXPO_PUBLIC_*` values are bundled into the client and are not
secret.
