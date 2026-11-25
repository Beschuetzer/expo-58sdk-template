## Expo 58 Aspire Starter Monorepo

A neutral Expo SDK 58 starter shell orchestrated by a C# Aspire 17 AppHost, with a minimal Node.js backend and hosted OAuth2/OIDC identity provider.

The workspace requires Node.js `>=22.13.0 <23` and npm `>=10`.

## AI / LLM onboarding

This repository is intentionally structured for AI-assisted development and extension. The most important repo rules are:

- The mobile app must remain internationalized. All visible user text goes through the translation map in `apps/mobile/utils/i18n.tsx`.
- The mobile app supports system, light, and dark themes. New UI should be theme-aware and should not assume a single fixed color scheme.
- Shared contracts live in `libs/shared-types/src` and should be reused across apps instead of duplicated.
- The API and mobile app each have separate responsibilities and should stay decoupled from the hosted identity provider.

For detailed repo instructions, see [AGENTS.md](AGENTS.md).

## Projects

- `mobile`: Expo Router app in `apps/mobile`, using Expo SDK 58 and gluestack UI v1.
- `api`: Express-based OAuth2 resource server in `apps/api`.
- `shared-types`: source-only TypeScript contracts in `libs/shared-types`, consumed by both apps.
- `logging`: cross-platform structured logger in `libs/logging`, consumed by both apps.

The API currently exposes public `GET /health` and protected `GET /api/v1/me`
on port `4200`.

The local hosted identity-provider settings are configured centrally in
`AppHost/Program.cs` and supplied to both API and Expo. The provider publishes
discovery and JWKS metadata and handles Google authentication upstream without
exposing provider secrets to the mobile app.

Run `npm run dev` to start the mobile app and API against the hosted issuer. The
login tab opens the provider's PKCE sign-in flow on first use, stores the
resulting access token in native SecureStore, and the API validates the Bearer
token with `GET /api/v1/me`.

Native access tokens are refreshed with rotating refresh tokens stored in
SecureStore. Web builds keep both tokens behind HttpOnly cookies managed by the
API BFF, so browser JavaScript does not access token values. Refresh failure
clears the session and requires a new PKCE sign-in.

## Shared Types

Cross-application request and response contracts belong in
`libs/shared-types/src`. Export them from `libs/shared-types/src/index.ts` and
import them with `@expo-50sdk-template/shared-types` from either the API or
mobile app. Keep this library limited to platform-independent TypeScript types:
it must not import React Native, Expo, Node runtime modules, or application
implementation code.

Development typechecks resolve library source directly. Production API builds
compile the shared libraries before the API so their declaration files are
available. Add a new contract under a focused folder such as `src/lib/api`,
export it from the library entry point, then run `npm run typecheck`.

## Logging

Mobile and API logs use the reusable structured logger in `libs/logging`.
`LOG_LEVEL` controls the API, while Expo uses `EXPO_PUBLIC_LOG_LEVEL` because
only `EXPO_PUBLIC_*` variables are available in the mobile bundle. Supported
levels are `debug`, `info`, `warn`, `error`, and `silent`; the selected level
is the minimum severity emitted (for example, `warn` emits warnings and
errors). The API defaults to `debug` in development and `info` in production.
Mobile defaults to `debug` in development and `warn` in production. The
AppHost supplies both local log levels from `AppHost/Program.cs`. Production
API and EAS builds use their deployment configuration. Mobile public
environment values are included in the client bundle, so never put credentials
or other secrets in them. The logger emits structured JSON and redacts common
credential and personal-data fields. Application logs should still avoid
including request bodies, tokens, claims, or raw user identifiers.

For local development, Aspire starts Grafana with the OpenTelemetry LGTM
backend at `http://localhost:3000` (login: `admin` / `admin`). The API exports
structured logs over OTLP/HTTP only in development, and exposes an
authenticated mobile-log endpoint only in that environment. The mobile app
queues logs in memory and relays batches through it, and the API forwards both
API and mobile logs to the local OTLP receiver. This keeps the unauthenticated
collector bound to the local development environment instead of exposing it to
the LAN. Configure `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` to override the API's
development receiver URL. The mobile relay is enabled in development, and
queued logs are sent after authentication is available.

## Mobile Architecture

Mobile code is organized by responsibility:

- `app`: Expo Router screens and navigation composition.
- `features`: product capabilities with their API functions, query hooks, and feature tests.
- `components`: reusable UI, domain-independent hooks, and shared services.
- `components/ui`: theme-aware primitives such as `ThemeAwareSurface`,
  `ThemeAwareText`, and `ThemeAwareHeading`.
- `state`: Redux slices for client state and the shared TanStack Query client configuration.
- `utils`: cross-cutting concerns such as internationalization, theme resolution, storage, and platform helpers.

For a server-backed feature, keep the request function in
`apps/mobile/features/<feature>/api.ts`, the cache hook in
`apps/mobile/features/<feature>/hooks`, and consume the hook from a screen or
feature component. This keeps screens focused on rendering and user actions.

### Redux and TanStack Query boundaries

Redux is for client state that the application owns, such as form values,
preferences, authentication state, and UI flags. TanStack Query is for remote
server state, including request status, stale data, retries, invalidation, and
cache lifetimes. Do not copy query results into Redux; doing so creates two
sources of truth and removes much of TanStack Query's value.

The singleton QueryClient in `apps/mobile/state/queryClient.ts` persists its
cache through AsyncStorage and is mounted by `PersistQueryClientProvider` in
the root layout. Redux Persist uses the same storage mechanism for client
state, but the two persisted stores remain separate and independently
versioned.

The home screen is the relationship-space entry point. Authenticated users can
create a space, select an existing space, open shared requests, and create an
invitation link for another member. Invitation recipients authenticate through
the normal PKCE flow before they can preview or accept an invitation.

Redux DevTools are enabled in development through
`redux-devtools-expo-dev-plugin@2.0.0`, which supports Expo SDK 58. After starting the mobile app, press `Shift+M` in the
Expo CLI and choose `Open devtools plugin - redux-devtools-expo-dev-plugin`.
The enhancer is disabled in production builds.

### Lists

`@shopify/flash-list` is already installed for data-driven screens. Use it
for data-driven lists, provide a stable `keyExtractor`, and set an
`estimatedItemSize`. Prefer the shared theme-aware primitives for list rows so
light and dark mode behavior stays consistent across screens.

## Local Development

Install dependencies once. Starting the local stack also requires the .NET 10
SDK and a Docker-compatible container runtime:

```bash
npm install
```

When starting from a clone, initialize the deployment identity before building:

```bash
npm run init
```

The initializer assigns the Expo name, slug, deep-link scheme, iOS bundle ID,
Android package, and production API/OIDC URLs. If no valid EAS project ID is
configured, it runs EAS CLI to create or link a project and writes the UUID to
the app config; sign in to Expo or choose an account when prompted. It creates
no local API environment file. It also synchronizes the API audience and
OAuth callback scheme in both EAS profiles. Local API, OAuth, and Expo settings
are defined in `AppHost/Program.cs`; production credentials and other secrets
must still be supplied through deployment configuration.

Start the API, Expo, and MongoDB together:

```bash
npm run dev
```

This runs the C# Aspire 17 AppHost in `AppHost/`. Aspire starts a MongoDB
single-member replica set with a persistent data volume, then starts the API
and mobile app. The Aspire dashboard provides each resource's logs and an
interactive terminal for the Expo process.

The development seed is opt-in. On PowerShell, enable it before starting the
stack when you want the sample `a100`-`a199` relationships and owner records:

```powershell
$env:SEED_DEVELOPMENT_DATA = "true"
$env:SEED_DEVELOPMENT_USER_ID = "<authenticated-user-sub>"
npm run dev
```

`SEED_DEVELOPMENT_USER_ID` must be the logged-in user's JWT `sub` claim. The
seed is idempotent and runs only with `NODE_ENV=development`; it refuses to run
in production. Omit the seed flag or set it to `false` to start without
seeding.

The opt-in seed keeps the existing `a100`-`a199` import data and additionally
creates a shared relationship plus one personal relationship for each of the
two featured demo users. The shared relationship includes payment requests in
all five states, plus 80 additional pending requests from each featured user
for the other to review. This gives Testy 91 and Shifty 81 requests awaiting a
decision, with varied titles, categories, purchase dates, and amounts for
testing search, filters, sorting, and pagination. It also includes 32
joint-account charges across paid and unpaid statuses and both creators, with
varied names, amounts, and dates for filtering and pagination. The Time feature
includes 80 shared Me Time entries and 80 shared tasks, split between both
users, plus 24 Me Time entries and tasks in each user's personal relationship.
The Me Time entries span more than a year and vary in duration and description
(including blank descriptions). Tasks include completed and incomplete records,
created and completed by both users in the shared relationship. Each Time list
has enough entries for pagination when either user selects the shared or
personal relationship.
The shared relationship also includes 15 budget periods across monthly,
quarterly, and yearly ranges, with 15 approval records covering approved and
pending budgets and 55 dated budget items. Four historical periods are marked
renewed and have successor periods, so the API's startup rollover does not
create duplicates. Budget creation and item-added notifications are seeded for
both users.
Each personal relationship also includes draft and approved payment-request
examples. These fixtures use the users' IDs and display names only and do not
create or modify identity-provider accounts or credentials.

The seed runs as an Aspire one-time resource and completes before the API
starts. Aspire supplies the local database connection string to both processes.
The MongoDB data volume is named `relationship-app-mongodb-data`; remove that
volume with your container runtime when you want a clean database.

The AppHost exposes an interactive terminal for Expo, so its QR code and
keyboard shortcuts (`a`, `w`, `r`, `?`, etc.) remain available.

The mobile app's `Test Backend Connection` button calls the API health endpoint.
`AppHost/Program.cs` supplies API and OAuth settings to both resources.
AppHost detects a usable LAN IPv4 address and injects the API URL directly into
Expo, so no generated `.env` file or separate mobile setup script is needed.
To override the detected address (for example, when using a custom network),
set `EXPO_PUBLIC_API_URL` in the AppHost configuration.

Run `npm run init` to populate the EAS `preview` and `production` profiles with
the production API and identity-provider URLs, OAuth audience, and callback
scheme. Custom EAS profiles and other production builds must provide
`EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_IDP_URL`; the mobile config fails early
if either is missing rather than relying on a hard-coded service URL.

The mobile app includes a typed i18n provider with English, Spanish, and German
translations. The device locale selects the initial language, and the language
selector in the Settings tab persists the user's choice with AsyncStorage. Add
new messages for all supported languages in `apps/mobile/utils/i18n.tsx` and
reference them with `useI18n().t('section.key')` instead of hard-coding
user-facing text. Android's native date and time picker uses the Android system
or per-app language for its calendar contents. Notification titles and bodies
generated by the API are displayed as received and are not translated by the
mobile i18n provider.

Theme support is provided by `apps/mobile/utils/theme.tsx`. The Settings tab
allows users to choose System, Light, or Dark mode, and the choice is persisted
with AsyncStorage. The selected mode is shared by React Navigation, Gluestack,
the tab bar, and legacy themed components. Use `useColorScheme()` or
`useThemeMode()` for theme-aware behavior, and avoid fixed light-only colors in
new screens.

The Settings tab also provides five screen background choices: None, a
theme-aware solid color, or a subtle Default, Futuristic, or Classic wallpaper.
The selected background and color persist with AsyncStorage and apply to screens
that use `ThemeAwareScreen`.

Tile gradients can be customized by angle, color stops, stop positions, and
opacity. These preferences are stored locally through Redux Persist.

### Mobile releases

Pull requests run check-only ESLint plus `expo config` and `expo-doctor`.
Production mobile builds are started manually from the GitHub Actions `Mobile
release` workflow. Configure the real EAS project ID in `apps/mobile/app.json`
and add an `EXPO_TOKEN` repository secret before starting a build; the workflow
offers Android, iOS, and combined production builds. To start both platform
builds from the repository root, run `npm run build:production`; it uses the
`production` profile in `apps/mobile/eas.json`. Run
`npm run build-and-submit:production:android` to build and auto-submit Android
with that profile. Submissions go to the internal track as drafts and are not
published automatically.

### Push notifications

The app uses the SDK 58-compatible `expo-notifications`
package. On iOS and Android, signing in prompts for notification permission and
registers the Expo push token with the API. Notifications are sent for new
relationship join requests and their decisions, submitted joint payment
requests, payment-request decisions, and cancellations, budget creation and
edits, and budget items. Draft payment requests do not notify other members
until submitted for approval. Existing in-app notifications remain available
when push permission is denied.

Push delivery uses the Expo Push Service. The app registers an Expo push token
with the API; EAS stores the credentials Expo needs to forward notifications to
FCM and APNs. These credentials are not device tokens and must not be embedded
in the app, added to `eas.json`, or committed to the repository.

Run `npm run init` to create or link the EAS project and write its project ID
to [`apps/mobile/app.json`](./apps/mobile/app.json). Use an Expo account with
access to that project when managing credentials. Device tokens are associated
with the authenticated account, and mobile sign-out attempts to unregister the
device token.

#### Enabling notifications for the preview profile

The `preview` profile in [`apps/mobile/eas.json`](./apps/mobile/eas.json) uses
internal distribution and points to the production API. The notifications
plugin in [`apps/mobile/app.config.js`](./apps/mobile/app.config.js) sets the
default Android notification channel. It does not select an APNs entitlement
by EAS profile; Xcode changes the development entitlement to production when
archiving a release build. The same config applies Android CMake 4.1.2 only
during local development prebuilds. This workspace has `preview` and
`production` EAS build profiles; use `preview` for internal testing.

**Android (FCM V1)**

The app-side Firebase configuration is already present:
[`apps/mobile/google-services.json`](./apps/mobile/google-services.json) and
[`apps/mobile/GoogleService-Info.plist`](./apps/mobile/GoogleService-Info.plist)
refer to the `relationship-app-notifications` Firebase project. The Android
package name is `com.adammajor.relationshipapp`, as configured in
[`apps/mobile/app.json`](./apps/mobile/app.json). These files contain public
client configuration; they are not the private FCM sending credential.

1. In Firebase Console, select the same Firebase project and open **Project
   settings** > **Service accounts** > **Firebase Admin SDK**. Select
   **Generate new private key** and securely save the downloaded JSON outside
   the repository. If using an existing service account, grant it the
   **Firebase Cloud Messaging API Admin** role.
2. From `apps/mobile`, run:

   ```powershell
   npx --yes eas-cli@latest credentials
   ```

   Select **Android** > **production** > **Google Service Account** >
   **Manage your Google Service Account Key for Push Notifications (FCM V1)**

   > **Set up a Google Service Account Key for Push Notifications (FCM V1)** >
   > **Upload a new service account key**, then select the JSON key file.

3. Alternatively, in the linked project's EAS dashboard, open **Project
   settings** > **Credentials** > **Android**. Add or select the application
   identifier `com.adammajor.relationshipapp`, then under **Service
   credentials** > **FCM V1 service account key**, choose **Add a service
   account key** and upload the JSON file.

Never commit the service-account JSON, put it in `eas.json`, or add it to
`EXPO_PUBLIC_*` environment variables. It is a private server credential.

See [Expo's FCM V1 setup guide](https://docs.expo.dev/push-notifications/fcm-credentials/)
for screenshots and troubleshooting.

**iOS (optional)**

An Apple Developer Program membership is required. The bundle identifier is
`com.adammajor.relationshipapp`. Register each iPhone used for internal
distribution with EAS before building.

The easiest setup is to let EAS create and store the APNs key during the first
iOS preview build. From `apps/mobile`, run:

```powershell
npx --yes eas-cli@latest build --platform ios --profile preview
```

When prompted, approve setting up push notifications and generating a new
Apple Push Notifications service key. Alternatively, run
`npx --yes eas-cli@latest credentials` from `apps/mobile` and use the iOS
push-notification credential option to manage or upload a key. To create a key
manually, use **Certificates, Identifiers & Profiles** > **Keys** in the Apple
Developer portal, enable **Apple Push Notifications service (APNs)**, and keep
the downloaded `.p8` file, Key ID, and Apple Team ID private. Upload the key to
EAS; do not commit it or put it in app environment variables.

**Build and test**

After changing native configuration or credentials, create a new build.
`npm run build:preview` from the repository root builds the Android preview
profile. The iOS command above builds the iOS preview profile. Install the
build on a device, sign in, and grant notification permission. Trigger a
join-request or payment-request event from another member's test account to
verify delivery.

The preview app registers its push token with the API URL configured in
`eas.json`; deploy the notification-enabled API before testing against that
profile. The preview profile points to the production API, so use accounts and
data you control. No APNs or FCM private key belongs in the preview environment
variables. See [Expo's push-notification setup guide](https://docs.expo.dev/push-notifications/push-notifications-setup/)
for more detail.

## Workspace Commands

```bash
npm run typecheck
npm run test:all
npm run api:build
npm run validate:mobile
```

## Mobile Testing

The mobile Jest setup remains under `apps/mobile`:

```bash
npm test
npm run test:coverage
```

`npm run test:coverage` runs Jest once, prints the coverage statement, and
writes reports to `apps/mobile/coverage`. The HTML report is available at
`apps/mobile/coverage/lcov-report/index.html`; the machine-readable summary is
at `apps/mobile/coverage/coverage-summary.json`. The command fails when global
statements, branches, functions, or lines coverage falls below 90%.

### API testing

The API suite exercises real HTTP request/response flows. Test doubles are
limited to explicit external boundaries, such as an unavailable database or
an injected authentication adapter, so tests remain deterministic without
mocking internal route or OAuth logic.

## Development Configuration

The local API port, bind address, OAuth settings, CORS origin, and log levels
are configured in `AppHost/Program.cs`. Use `npm run dev` to start or restart
the complete local environment through Aspire.
