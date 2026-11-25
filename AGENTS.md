# AGENTS.md

This repository is a monorepo template for a mobile app and an API backed by a hosted identity provider.

## Purpose of the repo

- `apps/mobile`: Expo SDK 58 React Native application using React Native 0.88, Expo Router, Redux Toolkit, Redux Persist, TanStack Query, Gluestack UI v5, and NativeWind v4.
- `apps/api`: Express OAuth2 resource server with TypeScript, Prisma-ready MongoDB configuration, and lightweight health/auth endpoints.
- Hosted OAuth2/OIDC identity provider: issues tokens for mobile PKCE flows and is configured through environment variables.
- `libs/shared-types`: platform-neutral TypeScript contracts that are shared across apps.

## Core rules for AI-assisted changes

1. Keep app responsibilities separated.
   - Mobile UI lives in `apps/mobile/app` and `apps/mobile/components`.
   - Feature logic should live under `apps/mobile/features/<feature>/`.
   - Shared contracts belong in `libs/shared-types/src`.
   - API routes and middleware live under `apps/api/src`.

2. Mobile app text must not be hard-coded.
   - Add user-facing strings to the i18n map in `apps/mobile/utils/i18n.tsx`.
   - Use `useI18n().t('section.key')` or `getMessage(...)` rather than literal text in screens/components.
   - Do not add raw English or Spanish UI labels directly into components unless the string is non-user-facing, such as a developer debug label.

3. Theme support is required.
   - The mobile app supports system, light, and dark mode.
   - Theme mode logic lives in `apps/mobile/utils/theme.tsx`.
   - New screens and components should be styled to work in both light and dark themes.
   - Avoid fixed light-only or dark-only colors; prefer theme-aware tokens or values derived from the active color scheme.

4. Respect the existing i18n and theming architecture.
   - If a screen or component needs user-visible text, add translation keys.
   - If a screen or component changes visual treatment, ensure it still renders correctly under both themes.
   - If a new feature requires settings persistence or UI selections, prefer the existing AsyncStorage-backed patterns used by the app.

5. Keep cross-app contracts typed and shared.
   - Add or update shared request/response interfaces in `libs/shared-types/src`.
   - Import them via `@expo-50sdk-template/shared-types` rather than duplicating interfaces in each app.
   - Shared types should remain framework-agnostic and not import React Native, Express, or app-specific runtime code.

6. Prefer minimal, targeted edits.
   - Do not broaden a fix beyond the root cause.
   - Preserve existing patterns and naming conventions used in the repository.
   - Favor the regression-tested path instead of introducing new abstractions unless required.

## Repo-specific gotchas to avoid

- Expo SDK 58 uses React Native 0.88 and React 19.3. Keep Expo modules aligned with the SDK using `npx expo install --fix`, then run `npx expo-doctor`.
  - Barcode scanning uses `CameraView` from `expo-camera`; `expo-barcode-scanner` is not part of this SDK.
  - Reanimated 4 requires `react-native-worklets` and its Babel plugin as the final plugin.
- The mobile app uses Gluestack UI v5 with locally generated components under `apps/mobile/components/ui` and NativeWind v4.
  - Import the local UI components rather than the removed `@gluestack-ui/themed` package.
  - Use NativeWind `className` utilities and theme-aware styles consistent with the existing wrappers.
- Local services are orchestrated by the C# Aspire 17 AppHost in `AppHost/`. Use `npm run dev` to start the API, mobile app, and MongoDB together.
- Do not commit secrets or local environment values. Local API and Expo configuration is managed by `AppHost/Program.cs`, which injects the mobile API URL directly without requiring `.env` files.

## Local development

Use Node.js `>=22.13.0 <23` and npm `>=10` for the workspace and Expo CLI.

```bash
npm install
npm run dev
npm run typecheck
npm run test
npm run test:coverage
```

Useful workspace commands:

```bash
npm run test:all
npm run typecheck
npm run api:build
npm run validate:mobile
```

Running the AppHost requires the .NET 10 SDK and a Docker-compatible container runtime.

## Testing expectations

- Add or update tests for behavior that changes.
- Favor real behavior checks over mock-heavy assertions.
- When a bug is fixed, verify the relevant target or test file before deciding the issue is resolved.

## Security and production posture

- The hosted identity provider is external to this repository. Do not add local token or password fallbacks to the API or mobile app.
- Do not store production credentials or signing keys in the repository.
- API configuration should be environment-driven and validated using `process.env` or explicit config objects.
- Keep OAuth2 and database configuration behind clear env variables and do not hard-code issuer URLs or secrets.

## Recommended working style for future contributors

- When adding new product features, start in `apps/mobile/features/<feature>`.
- Use the shared types package for API contracts.
- Keep the mobile app text translatable and theme-safe.
- Keep backend integrations behind small, typed boundaries and test them accordingly.
- Prefer maintainable, domain-specific layering over broad rewrites.

This repository is intentionally a starter template: keep it neutral, extensible, and easy to replace with a real product domain while preserving the quality gates and architecture conventions already in place.
