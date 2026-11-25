# Relationship Spaces and Invitations Plan

## Goal

Create a user-friendly relationship space experience where authenticated users can create a space, invite another person, and manage all relationship-specific data from that space.

The existing `Relationship` model is the foundation. It already owns members, payment requests, and rubrics. The current member flow should be replaced with an invitation flow instead of requiring users to enter an opaque OAuth `userId`.

## Target User Flow

1. The user opens the app.
2. The user selects **Create a space** or **Join a space**.
3. If signed out, the app opens the OAuth login flow and returns the user to the original action.
4. The authenticated user creates a space with a name.
5. The creator is automatically added as the space owner.
6. The owner selects **Invite someone**.
7. The owner enters an email address or generates a shareable invitation link.
8. The invited person opens the link and signs in.
9. The invited person reviews the space name and inviter, then accepts.
10. The API creates membership using the authenticated user's OAuth `sub` claim.
11. Both users can access payment requests, rubrics, notifications, and shared activity.

## OAuth and API Permissions

Identity scopes remain separate from API permissions:

```text
openid profile email offline_access
```

Add resource-server permissions for relationship features:

The hosted authorization server must register the granular permissions below
as supported resource-server scopes and authorize them for the mobile client.
The repository requests and enforces these values directly.

```text
relationships:read
relationships:create
relationships:invite
relationships:accept-invite
payment-requests:read
payment-requests:write
```

Recommended route permissions:

```text
GET  /api/v1/relationships                         relationships:read
POST /api/v1/relationships                         relationships:create
GET  /api/v1/relationships/:id/members              relationships:read
POST /api/v1/relationships/:id/invitations          relationships:invite
GET  /api/v1/invitations/:token                     relationships:accept-invite
POST /api/v1/invitations/:token/accept              relationships:accept-invite
```

Do not add every relationship permission to one global `AUTH_REQUIRED_SCOPES` value. The current API middleware supports global scopes, but relationship creation and member management need route-specific scope checks.

Provider configuration must:

- Register the new permissions on the API resource.
- Allow the mobile client and BFF client to request them.
- Add them to `EXPO_PUBLIC_OAUTH_SCOPES`.
- Replace or temporarily retain the existing `orders.read` scope for compatibility.
- Update `AUTH_REQUIRED_SCOPES` and API documentation.
- Preserve `offline_access` for refresh-token support.

All relationship routes must still require a valid authenticated access token with the configured API audience.

## Data Model

Keep the existing `Relationship` and `RelationshipMember` models. Add an invitation model:

```text
RelationshipInvitation
- id
- relationshipId
- inviterUserId
- inviteeEmail, optional
- tokenHash
- status: pending | accepted | declined | revoked | expired
- expiresAt
- createdAt
- acceptedAt
- acceptedByUserId
```

Rules:

- Store only a hash of the invitation token.
- Tokens are single-use and expire.
- Invitation acceptance uses the authenticated token subject, never a client-supplied `userId`.
- Acceptance and membership creation occur in one transaction.
- Duplicate acceptance is idempotent.
- Only active owners can create invitations.
- Users cannot invite themselves.
- Existing direct member creation should be removed or restricted to internal/admin use.
- Add indexes for relationship, status, expiration, and pending invite lookup.

## API Work

Add framework-neutral invitation contracts to `libs/shared-types`:

- Invitation summary.
- Create invitation input.
- Invitation preview response.
- Accept invitation response.
- Invitation status values.

Add API endpoints:

```text
POST /api/v1/relationships/:relationshipId/invitations
GET  /api/v1/invitations/:token
POST /api/v1/invitations/:token/accept
POST /api/v1/invitations/:id/revoke
```

Responsibilities:

- Validate all payloads at the API boundary.
- Enforce route-specific OAuth scopes.
- Enforce relationship membership and owner permissions.
- Normalize and validate invite email addresses when supplied.
- Return safe invitation previews without exposing token hashes.
- Reject expired, revoked, and already-consumed invitations.
- Use a transaction for acceptance and membership creation.
- Generate an in-app notification for the invited user when possible.
- Keep email delivery as a separate integration so invitation creation does not depend on an external mail provider.

For the first release, support shareable one-time links. Email delivery can be added after the invitation lifecycle is stable.

## Mobile Architecture

Create a dedicated feature area:

```text
apps/mobile/features/relationships/
  api.ts
  hooks/
  components/
  types/
```

Add screens and components for:

- Space list and current-space selection.
- Create space.
- Space overview.
- Members.
- Invite member.
- Invitation preview and acceptance.
- Expired, revoked, and already-accepted invitation states.

The home screen should show:

- **Create a space** when the user has no spaces.
- The current space when one exists.
- Member count and invitation status.
- A clear sign-in prompt when unauthenticated.
- A space switcher when multiple spaces exist.

Replace the current `relationshipsQuery.data?.[0]` behavior with a persisted selected relationship ID and explicit space selection.

All visible mobile copy must be added to `apps/mobile/utils/i18n.tsx`, and all new screens must support system, light, and dark themes.

## Authentication and Navigation

When an unauthenticated user starts a protected action:

1. Store the intended action or invitation token locally.
2. Start the normal PKCE login flow.
3. Return to the pending action after successful authentication.
4. Clear the pending action after success, cancellation, or expiration.

Invitation links should deep-link into the mobile app and provide a web-compatible fallback for browser users.

## Notifications

Initial delivery should use in-app notifications:

- Invitation created.
- Invitation accepted.
- Member joined a space.
- Payment request created or decided.

Persist the domain event first, then create notifications. Notification failure must not roll back relationship creation or invitation acceptance.

Push notifications and email delivery can follow after the in-app lifecycle works reliably.

## Testing Plan

### API tests

- Anonymous users cannot create spaces.
- Authenticated users without `relationships:create` receive `403` when creating a space.
- Authenticated users can create a space and become its owner.
- Non-owners cannot create invitations.
- Non-members cannot access a space or its invitations.
- Invitation tokens expire and cannot be reused.
- Revoked invitations cannot be accepted.
- Acceptance creates exactly one active membership.
- A user cannot accept an invitation for a different email when email matching is enabled.
- Duplicate acceptance is safe and idempotent.
- Scope checks are applied per route.

### Mobile tests

- OAuth requests include the new relationship scopes.
- Signed-out users are redirected to authentication before creating a space.
- The create-space form handles loading, success, and errors.
- Invitation links open the invitation preview.
- Acceptance returns the user to the correct space.
- Multiple spaces can be listed and selected.
- Queries invalidate after space creation, invitation creation, and acceptance.

### Manual acceptance flow

1. User A signs in.
2. User A creates a space.
3. User A generates an invitation link.
4. User B opens the link and signs in.
5. User B accepts the invitation.
6. Both users see the space and its member list.
7. User A creates a payment request.
8. User B receives an in-app notification and can act on the request.

## Delivery Order

1. Define provider permissions and route-level API scope support.
2. Add shared invitation types.
3. Add the Prisma invitation model and indexes.
4. Implement invitation creation, lookup, acceptance, expiration, and revocation.
5. Add API authorization and transaction tests.
6. Build the mobile space list and create-space flow.
7. Build invitation-link sharing and acceptance.
8. Move payment-request screens to use the selected space.
9. Add in-app invitation notifications.
10. Remove the manual `userId` member field.
11. Add email delivery and push notifications as follow-up integrations.

## Existing Implementation References

- `apps/api/prisma/schema.prisma`: existing relationship and membership models.
- `apps/api/src/auth/middleware.ts`: current OAuth audience and global scope middleware.
- `apps/api/src/config/env.ts`: current `AUTH_REQUIRED_SCOPES` parsing.
- `apps/api/src/features/paymentRequests`: current relationship and member service methods.
- `apps/mobile/app/(tabs)/payment-requests.tsx`: current create-relationship and direct-member UI.
- `apps/mobile/features/payment-requests`: current relationship API functions and TanStack Query hooks.
- `plans/joint-request-feature.md`: existing relationship and payment-request foundation plan.
