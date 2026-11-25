# Joint Payment Requests Implementation Plan

## 1. Goal and Product Rules

Build a shared relationship workspace where members can propose purchases, evaluate them against agreed criteria, and approve or reject them with a durable history.

Initial product rules:

- The API is the source of truth.
- A request is approved only after every required relationship member approves it.
- A rubric provides structured context and a recommendation; it never automatically approves or rejects a request.
- Each member has an individual decision that cannot be overwritten.
- Approved requests are the source for spending statistics.
- WebSockets are deferred. Start with REST, TanStack Query invalidation, active-screen refresh, and notifications.
- The model must support more than two members even though the first UI may target two-person relationships.

## 2. Delivery Scope

### Initial release

- Create and view a relationship.
- Add and list relationship members.
- Create a payment request with amount, currency, title, rationale, date, split, and optional categories.
- Submit rubric answers with the request.
- Show requests by status and whether the current user is awaiting a decision.
- Approve, reject, or cancel a request.
- Record decisions and activity history.
- Notify members when a request is created or decided.
- Add focused API, shared-type, and mobile tests.

### Later releases

- Configurable rubric editor and rubric version management.
- Push notifications and deep links.
- Search, advanced filters, and saved views.
- Spending statistics and monthly trends.
- Live updates through Server-Sent Events or WebSockets if polling proves insufficient.
- Attachments, receipts, recurring requests, budgets, and custom categories.

## 3. Domain Model

Add the following Prisma models under `apps/api/prisma/schema.prisma`:

### Relationship

- `id`, `createdAt`, `updatedAt`
- `name`
- `approvalPolicy`: initially `all_members`

### RelationshipMember

- `id`, `createdAt`, `updatedAt`
- `relationshipId`
- `userId`: the OAuth subject claim
- `role`: `owner` or `member`
- `active`
- Unique constraint on `relationshipId` and `userId`

### PaymentRequest

- `id`, `createdAt`, `updatedAt`
- `relationshipId`, `createdByUserId`
- `title`, `rationale`, optional `categories`
- `amountMinorUnits`: integer, never a floating-point amount
- `currency`: normalized currency code
- `purchaseDate`
- `requestedSplit`: structured member amounts or percentages
- `status`: `draft`, `pending_approval`, `approved`, `rejected`, or `cancelled`
- `rubricVersionId`
- `resolvedAt`

### PaymentRequestDecision

- `id`, `createdAt`, `updatedAt`
- `paymentRequestId`, `memberUserId`
- `decision`: `approved`, `rejected`, or `changes_requested`
- Optional `comment`
- Unique constraint on `paymentRequestId` and `memberUserId`

Do not update a decision in place for the initial implementation. If decision revisions are needed later, add a decision-event history rather than losing the original action.

### Rubric and RubricVersion

Use versioned documents so old requests remain interpretable after the rubric changes.

- `Rubric`: relationship-owned rubric metadata.
- `RubricVersion`: immutable published version with questions and scoring configuration.
- A question contains an ID, label, answer type, options, weight, and required flag.

For the first release, seed one fixed rubric version instead of building an editor.

### PaymentRequestEvaluation

- `paymentRequestId`
- `rubricVersionId`
- Structured answers captured at submission time
- Optional calculated recommendation and score

The stored answers must remain valid even if the current rubric is edited later.

### ActivityEvent and Notification

`ActivityEvent` should record request creation, submission, approval, rejection, cancellation, and changes requested. Include actor, event type, timestamp, and structured metadata.

`Notification` should record recipient, event reference, read state, and delivery state. This supports in-app notifications before adding push delivery.

## 4. State and Authorization Rules

Implement transitions in one API domain/service module rather than spreading them across route handlers.

Allowed transitions:

```text
draft -> pending_approval
pending_approval -> approved
pending_approval -> rejected
pending_approval -> cancelled
```

Rules:

- Only an active relationship member can read or mutate its requests.
- Only the creator can submit or cancel a draft.
- A member cannot decide on behalf of another member.
- A member cannot approve a cancelled, rejected, or already approved request.
- A request moves to `approved` only when all required members have approved.
- A single rejection moves the request to `rejected` according to the initial `all_members` policy.
- Every mutation is checked against the current persisted state to prevent stale-client approvals.
- Never accept `userId` from the request body for authorization; derive identity from the authenticated OAuth claims.

## 5. Shared Contracts

Add framework-neutral request, response, enum, and error types under `libs/shared-types/src` and export them from the package index.

Include types for:

- Relationship summaries and members.
- Payment request summaries and details.
- Request status, decision, and activity-event values.
- Create-request payload and rubric evaluation payload.
- Submit-decision payload.
- Paginated/filterable request-list responses.

Keep Prisma and Express types out of the shared package.

## 6. API Implementation

Create a focused payment-request domain/service layer under `apps/api/src`, with route handlers responsible only for parsing input, invoking the service, and mapping responses.

Endpoints:

```text
GET    /api/v1/relationships
POST   /api/v1/relationships
GET    /api/v1/relationships/:relationshipId/members
GET    /api/v1/relationships/:relationshipId/payment-requests
POST   /api/v1/relationships/:relationshipId/payment-requests
GET    /api/v1/payment-requests/:paymentRequestId
POST   /api/v1/payment-requests/:paymentRequestId/submit
POST   /api/v1/payment-requests/:paymentRequestId/decisions
POST   /api/v1/payment-requests/:paymentRequestId/cancel
GET    /api/v1/payment-requests/:paymentRequestId/activity
GET    /api/v1/notifications
POST   /api/v1/notifications/:notificationId/read
```

List requests with server-side filters for `status`, `awaitingMyDecision`, categories, and date range. Add pagination before the dataset becomes large.

Validate all payloads at the API boundary. Reject invalid currency codes, non-positive amounts, invalid split totals, unknown rubric question IDs, duplicate decisions, and unsupported state transitions with consistent error responses.

Use a transaction or the database's equivalent atomic operation when recording a decision and recalculating the request status. The operation must be safe to retry.

## 7. Mobile Implementation

Add a mobile feature area under `apps/mobile/features/payment-requests` containing:

- Typed API functions.
- TanStack Query keys and hooks for lists and details.
- Mutations for create, submit, decide, and cancel.
- Request status and decision presentation helpers.

Add screens/components for:

- Request list with status tabs or filters.
- Create-request form.
- Rubric evaluation step.
- Request detail with split, answers, activity, and member decisions.
- Approve/reject/cancel actions with confirmation and optional comments.
- Empty, loading, error, and offline states.

All visible mobile strings must be added to `apps/mobile/utils/i18n.tsx`. Use theme-aware components and colors for system, light, and dark modes.

After successful mutations, invalidate the relevant list, detail, notification, and statistics queries. Prevent duplicate submissions while a mutation is pending.

## 8. Notifications and Refresh Strategy

Initial delivery:

1. Write an in-app notification as part of the successful domain mutation.
2. Show unread notifications in the mobile app.
3. Refresh the active request list/detail while focused.
4. Invalidate queries after local mutations.

Do not make notification delivery part of the approval transaction if it can cause the approval to fail. Persist the domain event first, then process notification delivery with retryable work.

Add push notifications only after the in-app event model is working. Consider WebSockets or Server-Sent Events only if users need updates while actively viewing a request and focused refresh is demonstrably insufficient.

## 9. Statistics and History

Do not build statistics before request status semantics are stable.

First statistics query set:

- Approved total by currency and date range.
- Requested versus approved totals.
- Approved total by member and category.
- Approval/rejection counts.
- Average time from submission to resolution.

Exclude rejected, cancelled, and draft requests from approved-spending totals. Document the aggregation rules in the API types or endpoint documentation.

Use `ActivityEvent` for audit history rather than trying to reconstruct history from mutable request fields.

## 10. Test Plan

### API and domain tests

- A member can create a draft request.
- A non-member cannot access the relationship or its requests.
- A request cannot be submitted with invalid amount, split, currency, or rubric answers.
- Submission snapshots the rubric version and answers.
- Every required member must approve before the request becomes approved.
- One rejection produces a rejected request under `all_members` policy.
- Duplicate or stale decisions are rejected safely.
- Cancelled and resolved requests cannot be mutated.
- Activity events and notifications are created for each relevant mutation.

### Shared-type and client tests

- Request and decision payloads match the API contract.
- Query keys and mutation invalidation target the correct resources.
- API errors are surfaced without leaving stale optimistic state.

### Manual acceptance flow

1. User A creates a request and submits the rubric.
2. User B sees an unread notification and the pending request.
3. User B rejects or approves with a comment.
4. User A sees the updated status and activity history.
5. Both users see approved spending reflected in statistics only after final approval.

## 11. Delivery Milestones

### Milestone 1: Foundation

- Add Prisma models and indexes.
- Add shared enums and DTOs.
- Add relationship membership authorization.
- Add migration/schema validation and seed data.

### Milestone 2: Core workflow

- Add create/list/detail endpoints.
- Add fixed rubric version and evaluation persistence.
- Add submit, decide, cancel, and state-transition tests.

### Milestone 3: Mobile workflow

- Add query hooks and mutations.
- Add list, create, evaluation, and detail screens.
- Add i18n strings, theme support, and mutation error states.

### Milestone 4: History and notifications

- Add activity events.
- Add in-app notifications and unread state.
- Add focused refresh and query invalidation.

### Milestone 5: Reporting and refinement

- Add filters and pagination.
- Add approved-spending statistics.
- Add rubric configuration only after observing real usage.

## 12. Definition of Done

- The full two-member request flow works through the API and mobile app.
- Authorization is enforced from authenticated claims at every endpoint.
- Amounts, splits, statuses, decisions, and rubric answers are persisted with stable semantics.
- Historical requests retain the rubric version used at submission.
- Activity history and notifications are available for request mutations.
- Tests cover successful and invalid state transitions.
- `npm run typecheck` and the relevant API/mobile test targets pass.
- No WebSocket infrastructure is required for the initial release.
