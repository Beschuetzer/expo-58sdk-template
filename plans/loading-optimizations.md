# Mobile Loading and Lazy-Loading Plan

## Goal

Show useful screen content as soon as its required data is ready. Replace generic initial-load spinners with theme-aware skeletons, run independent queries in parallel, and defer requests for content the user has not opened. Preserve existing authentication, empty, retry, and error behavior.

For this plan, **lazy loading means deferring data queries until their content is needed**. Do not add route-level JavaScript code splitting unless profiling shows that bundle evaluation, rather than API/query sequencing, is the bottleneck.

## Current Findings

- No shared skeleton component or explicit `React.lazy`/`Suspense` usage was found in the mobile UI.
- [ThemeAwareInfiniteScrollList](../apps/mobile/components/ui/ThemeAwareInfiniteScrollList.tsx) currently uses an activity indicator for an initially empty list. It accepts a `loadingSpinner` override, which can support a skeleton without changing pagination behavior.
- [JointAccountChargesScreen](<../apps/mobile/app/(tabs)/(requests)/JointAccountChargesScreen.tsx>) loads relationships first, derives the selected relationship from that response, and only then enables the charges query. It returns a whole-screen loading state while relationships are loading, even though the main list can be requested earlier when a valid selected relationship ID is already known.
- The joint-charge owed total is included in the first charges-list response. Keep it with that request and show a summary placeholder while the first page loads; do not introduce a separate total request.
- [JointAccountChargeCalendarModal](../apps/mobile/features/joint-account-charges/components/JointAccountChargeCalendarModal.tsx) already enables its calendar query only while the modal is visible. Preserve this pattern.
- The Phase 1 dependency inventory is recorded below. The five selected-relationship lists share a cold-load waterfall; the decision inbox needs relationship discovery first, then starts its category queries in parallel.

## Implementation Phases

### 1. Inventory query dependencies and baselines — code audit complete

The inventory covers the joint-charge list and the five related screens named above. It is based on the screen components, query hooks, and app persistence configuration:

| Screen | Current initial query flow | Data needed for primary content vs. display | Deferred data and current loading gate |
|---|---|---|---|
| [JointAccountChargesScreen](<../apps/mobile/app/(tabs)/(requests)/JointAccountChargesScreen.tsx>) | `useRelationshipsQuery` → `useJointAccountChargesInfiniteQuery`. The charges query is enabled only after a selected relationship object is found, the user subject exists, and the amount/date filters are valid. | A relationship ID is required for the charges list. Charge rows and the unpaid summary come from the list response. Relationship members supply creator names and creator-filter choices; creator names can fall back to user IDs. | The calendar query is enabled only while its modal is visible and can reuse a complete fresh list cache before calling the month endpoint. A full-screen loading return currently waits for relationships before exposing any list content. |
| [ViewAllRequestsScreen](<../apps/mobile/app/(tabs)/(requests)/ViewAllRequestsScreen.tsx>) | `useRelationshipsQuery` → `usePaymentRequestsInfiniteQuery`, keyed by the selected relationship ID and authenticated subject. | A relationship ID is required. Request rows contain their own title, status, categories, amount, and date. Relationship members supply creator-filter choices, not the row contents. | The calendar query is enabled only while its modal is visible and can reuse a complete fresh list cache. The screen returns a full-screen loading state while relationships load. |
| [ViewAllMeTimeScreen](<../apps/mobile/app/(tabs)/(time)/ViewAllMeTimeScreen.tsx>) | `useRelationshipsQuery` → `useMeTimeInfiniteQuery`, keyed by the selected relationship ID and authenticated subject. | A relationship ID is required. Entries contain their times and descriptions. Relationship members supply creator names and improve creator-name search/sorting; the display-name helper falls back to the user ID. | The calendar query is enabled only while its modal is visible and can reuse list data. The screen currently returns a loading message until relationships load. |
| [BudgetsScreen](<../apps/mobile/app/(tabs)/(requests)/BudgetsScreen.tsx>) | `useRelationshipsQuery` → `useBudgetsQuery` for the selected relationship. | A relationship ID is required. Budget cards are self-contained; they do not need relationship names or member data to render. | `BudgetItemModal` performs a create mutation only when submitted; it has no read query to defer. The screen uses separate full-screen loading returns for relationship and budget queries. |
| [ViewAllRulesScreen](<../apps/mobile/app/(tabs)/(rules)/ViewAllRulesScreen.tsx>) | `useRelationshipsQuery` → `useRelationshipRulesInfiniteQuery` for the selected relationship. | A relationship ID is required. Rule rows use rule name, status, and labels. Relationship members are used by creator/approver filters and member-aware filtering, not to render the basic row. | No hidden list query was found. The screen returns a full-screen loading state while relationships load. |
| [AwaitingDecisionScreen](<../apps/mobile/app/(tabs)/(requests)/AwaitingDecisionScreen.tsx>) | `useRelationshipsQuery` → four category queries: payment requests, relationship rules, join requests, and tasks. All four start after the relationship list is available and run concurrently. | This inbox spans relationships, so it needs the relationship IDs and names. The join-request query also needs member roles to identify owned relationships. The authenticated user ID drives each category's eligibility/decision filter. Relationship names are attached to returned rows. | The screen returns a full-screen loading state while relationships load. Afterward, category results can appear progressively when any source returns items; if there are no items yet, the combined `isLoading` remains true until all four queries finish. Each payment/rule/task query walks relationship IDs serially within its page request; join-request fetches for owned relationships use `Promise.all`. |

#### Code-derived request baseline

- On a cold feature-cache load, each of the five selected-relationship lists waits for the relationship-list request to resolve before it can request its first list page. The critical path is therefore **relationships → selected relationship's list**. Each list uses infinite-query pagination, so later pages are fetched separately.
- The inbox has a different baseline: **relationships → four category query groups in parallel**. A category may make serial requests across relationships to find its first non-empty page; the join-request group fetches all owned relationships concurrently.
- The charge, request, and me-time calendars are deferred until opened. If list data is complete and fresh, the calendar hook can derive the month locally; otherwise it makes a month-range request. The budget-item modal is write-only until submit.
- `selectedRelationshipId` is persisted in the Redux `general` slice and can be null or stale. Relationship summaries are not persisted by the query persister: its dehydration rule stores only the backend-health query. The query client keeps in-memory data for up to 24 hours and treats it as fresh for one minute, so revisiting a screen in the same process can avoid the cold waterfall or render cached data during a background refetch; this is not guaranteed after app restart.
- The root `PersistGate` also displays a generic loading message while Redux restores. This is an app-startup gate, separate from the per-screen relationship/list waterfall.
- **Timing baseline not yet measured:** this audit establishes request ordering and gates from code, not wall-clock latency. Capture cold-cache and warm-cache time-to-first-useful-content on a consistent device/network in Phase 5 before comparing implementation results.

#### Prioritization from the inventory

1. Start with the five selected-relationship lists. Their persisted selected ID can be used to explore loading the scoped list in parallel with relationship metadata, provided stale/null selections are reconciled and API authorization remains authoritative. Member names and filter options can then fill in after the list.
2. Keep the decision inbox relationship discovery as a real prerequisite: it needs all relationship IDs and owner roles, and it already fans its four data sources out in parallel afterward. Prioritize a relationship-loading skeleton and preserve its existing progressive category results rather than inventing duplicate client requests.
3. Measure cold and warm behavior separately. Query-cache persistence currently excludes these feature queries, while in-process cache freshness can make the same screen appear to have no waterfall.

Do not parallelize requests without a valid identifier or authenticated user. For selected-relationship lists, an ID from persisted state can be stale; validate/reconcile it when the relationship query completes and preserve each screen's existing no-relationship/error behavior.

### 2. Add reusable, theme-aware skeleton building blocks — complete

- Added [ThemeAwareSkeleton](../apps/mobile/components/ui/ThemeAwareSkeleton.tsx) with text, card, and row shapes, adjustable dimensions, and light/dark theme colors.
- Added [JointAccountChargeListSkeleton](../apps/mobile/features/joint-account-charges/components/JointAccountChargeListSkeleton.tsx), composed to match the current charge card layout. It is ready to be wired into the first-page loading state in Phase 3; other screen-specific layouts will be composed alongside their Phase 4 rollout.
- Kept the existing `loadingSpinner` override for the empty first-page state in [ThemeAwareInfiniteScrollList](../apps/mobile/components/ui/ThemeAwareInfiniteScrollList.tsx), and kept pagination on the compact theme-aware activity indicator.
- Skeletons are static and hidden from accessibility services; they add no user-facing labels and require no reduced-motion handling.

### 3. Implement a progressive-loading joint-charges screen — complete

- The selected relationship ID now starts the charges query while relationship metadata is loading or being retried. Once relationship data resolves successfully, an unmatched or missing selection stops the scoped query and shows the localized relationship-selection state; query errors retain a retry action.
- The screen renders its search/filter controls and an owed-total placeholder while the first charge page loads, and uses the Phase 2 charge-row skeleton. Loaded rows and totals remain visible during background refetches.
- Creator names and filter options use relationship members when available; charge rows fall back to user IDs while that display metadata is unavailable.
- The calendar modal remains gated on visibility and relationship metadata, so its query still starts only when opened and can reuse its existing cache.
- Screen tests cover charges resolving before relationship metadata, charge-page loading after relationship metadata, stale selections, metadata retry, fallback creator IDs, and retaining rows during refetch.
- Runtime time-to-first-content was not measured in this code/test environment; capture and compare it as part of Phase 5.

### 4. Roll out by dependency pattern — complete

- Payment requests, me-time, budgets, and relationship rules now start their relationship-scoped query from the persisted selection while relationship metadata loads or errors. A successful relationship response validates the selection; stale selections stop the query and show the selection/setup state. Lists retain their content during background refetches and use layout-specific first-page skeletons.
- Relationship-query errors remain visible with retry actions while a persisted selection allows the scoped list to load. The awaiting-decision inbox still waits for relationship discovery because its aggregated queries need every relationship ID and owner role; it now shows a list skeleton during discovery and offers retry on discovery errors.
- Payment-request, me-time, budget, and relationship-rule detail screens render their primary records independently of member metadata and skeleton only creator, approver, or editor-name fields. Budget editing stays disabled until member data is available, and member lookup failures are shown inline with retry.
- The me-time calendar remains deferred until opened and can now query from the relationship ID without waiting for the full relationship summary. Existing deferred-query behavior for other calendars and the write-only budget-item modal is unchanged; visible form data remains eager.
- Added screen tests for persisted-ID loading, stale selections, metadata errors/retries, first-page skeletons, member-name placeholders, and the calendar's independent relationship-ID requirement. Authentication, scoping, filters, pagination, and existing cache keys remain unchanged.
- Runtime time-to-first-content remains unmeasured; capture comparable cold- and warm-cache timings in Phase 5.

### 5. Verify behavior and performance

- Add tests for cold loading, partially resolved data, cached/stale data, background refetch, empty results, query errors/retry, and disabled deferred queries.
- Confirm each skeleton is theme-safe in system, light, and dark modes and does not change screen layout when real content replaces it.
- Compare the before/after request waterfall for the joint-charges screen and record time to first useful content. Use the same measure for later screens to prioritize rollout.
- Run the affected mobile tests and `npx nx run mobile:typecheck`; run the full mobile test target before completing the rollout.
- Phase 4 verification: six focused screen suites passed (69 tests) and mobile typecheck passed. The full mobile target reported four unrelated failures: `TaskScreens.spec.tsx`, `PaymentRequestDetailsScreen.spec.tsx`, and `RelationshipInviteScreen.spec.tsx` fail while loading native gesture-handler code; `HomeScreen.spec.tsx` expects a `love-overview` item absent from its rendered results. Jest reported test completion but remained open on an active handle, so rerun the full target after those issues are addressed.

## Acceptance Criteria

- A delayed secondary query does not block a screen section whose data is already available.
- Initial loads show layout-matched skeletons, while background refetches retain existing content.
- Errors and empty results replace skeletons with their established error/empty states; no request failure leaves a screen loading indefinitely.
- Queries for hidden or later-step content do not run before that content is needed, and opening it triggers or reuses the expected query.
- Authentication, relationship isolation, filters, pagination, accessibility, translations, and all three supported color schemes remain intact.

## Risks and Guardrails

- A persisted selected relationship ID may be stale. Validate or reconcile it against relationship data and preserve the current invalid-selection behavior.
- Do not use `isFetching` alone to decide whether to show a skeleton; it also covers background refetches.
- Do not delay a query that supplies visible content merely to reduce request count. Parallelize only independent calls and defer only non-visible data.
- Introduce the pattern screen by screen. Avoid a broad route rewrite or dynamic imports until measurements show they are needed.
