# Audit: Search, Settings, and Security Workspaces

Scope: source-only audit of `src/pages/SearchPage.tsx`, `src/pages/Settings.tsx`, all files under `src/features/settings/components/`, `src/pages/Security.tsx`, `src/pages/Encryption.tsx`, `src/pages/Webhooks.tsx`, `src/features/command-palette/CommandPalette.tsx`, `src/pages/ApiKeys.tsx`, `src/pages/NotificationsPage.tsx`, and `src/features/shortcuts/ShortcutsHelp.tsx`.

## Executive Summary

Top 5 gaps ranked by severity:

1. **High - API key permissions are not editable after creation.** Scopes are selectable in the create dialog and displayed in the table, but the only per-key action is revoke, forcing administrators to recreate keys to change permissions.
2. **High - Security workspace has no observable certificate status surface.** The routed `Security` page delegates to `SecurityDashboard`, whose tabs cover overview, policies, approvals, encryption, departments, and logs, but not certificate status.
3. **High - Command palette does not cover major administrative actions.** It provides navigation, recent documents, upload, create case, workflow, scan, settings/profile/shortcut commands, but not create API key, add webhook, rotate key, notification filtering, or saved-search actions.
4. **Medium - Notification preferences are not granular for every notification type shown in the UI.** The routed settings page exposes six event rows and two channels, while the notifications page renders additional notification types that are not individually configurable there.
5. **Medium - Webhook signature verification status is not visible.** Webhooks have signing secrets, delivery logs, HTTP status, attempts, retry, and test ping, but no per-webhook or per-delivery signature verification health.

Confirmed coverage:

- Search has debounced search-as-you-type, URL sync, filters, facets, saved search application, highlighted result excerpts, grouping, sorting, and pagination.
- Webhooks have create/edit/enable/test/delete controls, delivery logs, and retry for undelivered attempts.
- Encryption key management exists in both the standalone encryption page and the security dashboard's delegated encryption tab.
- Settings exist in two source surfaces: the routed `src/pages/Settings.tsx` and the richer but not routed `src/features/settings/components/SettingsPage.tsx` tree.

## Per-Component Findings

### SearchPage

- **Component:** `SearchPage`
- **File:** `src/pages/SearchPage.tsx`
- **Severity:** Low
- **Finding:** The core search UX criteria are implemented in this file. Full-text query state is debounced at lines 224-227 and sent to `useSearchDocuments` with filters, page, page size, and sort at lines 255-261. Facets load through `useSearchFacets` at line 263. Filters include document type, tags, OCR status, date range, quality, operator, project, annotations, and exceptions at lines 560-613. Saved searches are available through `SavedSearchPanel` with current query/filter application at lines 615-630. Result highlighting uses query terms at lines 197-213 and result cards render highlighted excerpts at lines 1302-1306.
- **Missing/partial:** No source-observable gap against the requested search UX checklist in this component.

### Routed Settings Page

- **Component:** `Settings`
- **File:** `src/pages/Settings.tsx`
- **Severity:** Medium
- **Finding:** The routed `/settings` page exposes only seven tabs: general, appearance, notifications, security, storage, OCR, and integrations at lines 52-59 and 192-200. It does not expose the richer settings sections present under `src/features/settings/components`, such as users/access, services, workers, queues, scheduler, search settings, scanner notes, or privacy notes. The active route maps `/settings` to `Settings`, not `SettingsPage`, in `src/App.tsx` at line 191.
- **What exists:** General, appearance, notification, security, storage, OCR, and integration fields are editable and saved per tab through `saveTab` at lines 504-522.
- **What is missing:** Every configurable system aspect is not reachable from the routed settings UI. Search engine settings, queue/service worker controls, and users/access settings exist in the feature settings component tree but are not surfaced by the routed page.

- **Component:** `Settings` notification tab
- **File:** `src/pages/Settings.tsx`
- **Severity:** Medium
- **Finding:** Notification preferences are granular only for six hard-coded events: Document Uploaded, OCR Complete, Workflow Triggered, Approval Needed, Share Received, and System Alerts at lines 174-181. The table provides only In-App and Email toggles at lines 736-760. `NotificationsPage` renders additional types including `classification_done`, `system_alert`, `error`, `warning`, and `success` at `src/pages/NotificationsPage.tsx` lines 40-51, so several visible notification types cannot be configured per event in the routed preferences table.

### Feature Settings Components

- **Component:** `SettingsPage`
- **File:** `src/features/settings/components/SettingsPage.tsx`
- **Severity:** Medium
- **Finding:** The component defines a richer settings shell and filters admin-only sections at lines 66-77. It can render search, security, notification, services, workers, queues, and scheduler sections at lines 168-225. However, the app route maps `/settings` to `src/pages/Settings.tsx`, not this component, at `src/App.tsx` line 191. This makes the richer settings workspace source-present but not reachable through the main settings route.

- **Component:** `SettingsContent`
- **File:** `src/features/settings/components/SettingsPage.tsx`
- **Severity:** Medium
- **Finding:** Some sections are placeholders rather than complete settings workflows. The scanner section only tells users scanner device management is in the main Scanning section at lines 192-203. The privacy section says controls are managed by administrators and asks users to contact an administrator at lines 205-216. This is partial implementation, not a configurable UI.

- **Component:** `IntegrationSettings`
- **File:** `src/features/settings/components/sections/IntegrationSettings.tsx`
- **Severity:** Medium
- **Finding:** API access is only partly configurable. The section shows "Enable API Keys" at lines 40-46, but the toggle's `onChange` is an empty function at line 45. It also displays rate limit text at lines 47-53 without an editable control.

- **Component:** `IntegrationSettings` webhooks
- **File:** `src/features/settings/components/sections/IntegrationSettings.tsx`
- **Severity:** Medium
- **Finding:** Settings-level webhook creation defaults every new webhook to all events and no signing secret. `NewWebhookForm` only collects name and URL at lines 153-159, then submits `{ name, url, events: ['*'], active: true, secret: null }` at lines 162-165. This is less complete than the dedicated `Webhooks` page and lacks event selection and signature setup in this settings surface.

- **Component:** `SearchSettings`
- **File:** `src/features/settings/components/sections/SearchSettings.tsx`
- **Severity:** Low
- **Finding:** Search engine and indexing behavior are configurable in this component. It exposes backend selection at lines 17-29, semantic search and embedding model at lines 31-50, indexing/fuzzy/highlight toggles at lines 52-71, and result/score limits at lines 73-92. The gap is discoverability through the active route, covered above.

- **Component:** `SecuritySettings`
- **File:** `src/features/settings/components/sections/SecuritySettings.tsx`
- **Severity:** Low
- **Finding:** Authentication and audit settings are broad in this component: MFA at lines 19-63, password policy at lines 65-98, session and lockout controls at lines 100-125, and audit/privacy controls at lines 127-143. Certificate status and encryption key management are not part of this component.

- **Component:** `NotificationSettings`
- **File:** `src/features/settings/components/sections/NotificationSettings.tsx`
- **Severity:** Medium
- **Finding:** This richer notification settings component adds email categories, digest, in-app, desktop, sound, and do-not-disturb controls at lines 52-204. It still groups preferences by broad categories such as document activity, workflow updates, and team activity at lines 146-168 rather than exposing every event type shown by `NotificationsPage`.

- **Component:** `SystemHealthBanner`
- **File:** `src/features/settings/components/SystemHealthBanner.tsx`
- **Severity:** Low
- **Finding:** The banner summarizes system health, running services, workers, and database state at lines 22-33 and 35-58. It is admin-only in `SettingsPage` at lines 81-82, but that settings shell is not the routed `/settings` page.

### Security and Encryption

- **Component:** `Security`
- **File:** `src/pages/Security.tsx`
- **Severity:** High
- **Finding:** The routed security page is only a wrapper around `SecurityDashboard`, importing it at line 2 and returning it at lines 4-5. In the delegated dashboard, visible tabs are overview, policies, approvals, encryption, departments, and audit logs at `src/features/security/components/SecurityDashboard.tsx` lines 36-43. There is no certificate-status tab or visible certificate status area in that tab list or render switch at lines 94-123.

- **Component:** `SecurityDashboard`
- **File:** `src/features/security/components/SecurityDashboard.tsx`
- **Severity:** Medium
- **Finding:** Security events are visible indirectly through the logs tab, which renders `EvaluationLogViewer` at lines 119-120. The dashboard also exposes encryption via `KeyManagement` and `HiddenDocumentRequests` at lines 110-115. The same source surface does not show certificate status.

- **Component:** `Encryption`
- **File:** `src/pages/Encryption.tsx`
- **Severity:** Low
- **Finding:** Encryption key management is implemented in the standalone encryption page. It loads keys, stats, access requests, and encrypted documents at lines 66-97; shows active key version and encrypted document/request counts at lines 164-218; provides tabs for overview, key history, access requests, and encrypted documents at lines 220-246; and supports key rotation at lines 526-586.

### Webhooks

- **Component:** `Webhooks`
- **File:** `src/pages/Webhooks.tsx`
- **Severity:** Medium
- **Finding:** Signature configuration exists during creation: the form requires a signing secret at lines 560-570 and documents that it computes an HMAC-SHA256 signature in `X-Webhook-Signature` at lines 594-596. However, webhook rows display active state, URL, subscribed events, and last delivery only at lines 368-397. Delivery rows show event, delivery status, attempts, HTTP status, and time at lines 157-215. No per-webhook or per-delivery signature verification status is visible.

- **Component:** `DeliveryLog`
- **File:** `src/pages/Webhooks.tsx`
- **Severity:** Low
- **Finding:** Delivery logs and retry are implemented. `DeliveryLog` loads deliveries at lines 148-150, renders delivery status/attempts/HTTP/time columns at lines 157-215, and exposes a retry button for non-delivered rows at lines 193-210.

### API Keys

- **Component:** `ApiKeys`
- **File:** `src/pages/ApiKeys.tsx`
- **Severity:** High
- **Finding:** API key scoping is visible but not editable. Available scopes are defined at lines 32-37, creation checkboxes are rendered at lines 297-315, and each key row displays scopes at lines 391-397. The row action area only exposes revoke for active keys at lines 411-426, and the API imports include create/revoke hooks but no update hook at lines 20-26.

### Notifications

- **Component:** `NotificationsPage`
- **File:** `src/pages/NotificationsPage.tsx`
- **Severity:** Medium
- **Finding:** The page is a notification inbox, not a preferences UI. It filters notifications by all/unread/batch/SLA/exception/OCR at lines 21-38 and 143-160, renders notification metadata for many types at lines 40-51, and supports mark-all-read plus click-through routing at lines 111-140. It does not provide per-event preference controls; those are split into the settings pages.

### Command Palette and Shortcuts

- **Component:** `CommandPalette`
- **File:** `src/features/command-palette/CommandPalette.tsx`
- **Severity:** High
- **Finding:** The palette covers navigation by mapping `navItems` and `adminItems` into commands at lines 117-126, recent documents at lines 128-141, four hard-coded actions at lines 143-190, and three settings commands at lines 192-228. Major actions from the audited workspaces are missing as executable commands: create API key, add webhook, test webhook, retry failed webhook delivery, rotate encryption key, apply saved search, and notification filtering.

- **Component:** `CommandPalette` shortcuts
- **File:** `src/features/command-palette/CommandPalette.tsx`
- **Severity:** Medium
- **Finding:** `NAV_SHORTCUTS` only assigns explicit navigation shortcut labels for home, inbox, dashboard, documents, search, workflows, and settings at lines 57-65. Other navigation/admin items fall back to a generic `G` label at line 123, so command shortcut display is incomplete for many routes even though they are searchable commands.

- **Component:** `ShortcutsHelp`
- **File:** `src/features/shortcuts/ShortcutsHelp.tsx`
- **Severity:** Medium
- **Finding:** The help modal lists navigation shortcuts for cases, notifications, and routing at lines 25-33, and document shortcuts at lines 37-43 are explicitly marked `comingSoon`. The provider wires navigation shortcuts for cases, notifications, and routing at `src/features/shortcuts/ShortcutsProvider.tsx` lines 130-155, but there are no implemented document shortcut actions in `ShortcutsHelp`; they are only advertised as future behavior.

## UX Workflow Gaps

1. **Least-privilege API key maintenance is broken.** A user can create scoped keys and inspect scopes, but cannot edit or reduce an existing key's scopes. The only path is revoke and recreate, which is disruptive for integrations using long-lived credentials.

2. **Security operations lack one consolidated posture view.** Encryption, audit/evaluation logs, access policies, and hidden document requests are present, but certificate status is not observable in the security route. Operators cannot complete a "check security posture" flow from the visible security tabs.

3. **Power users cannot execute major admin tasks from the command palette.** The palette gets users to pages, but it does not launch the key workflows inside those pages: create API key, add webhook, retry failed delivery, rotate encryption key, apply a saved search, or open notification filters.

4. **Notification control is split and incomplete.** The notification inbox displays more types than the routed settings page allows users to configure. Users cannot reliably disable or route every visible notification type from one preferences flow.

5. **Webhook reliability workflow is missing signature health.** Delivery logs, retries, tests, and HTTP statuses support delivery troubleshooting, but there is no signature verification/pass/fail state to confirm that the receiver is validating signed payloads correctly.

6. **Settings architecture is fragmented.** The active `/settings` route uses `src/pages/Settings.tsx`, while a larger settings shell and many section components live under `src/features/settings/components`. This creates duplicated and uneven settings coverage, with some source-present controls not reachable from the routed settings page.

## Review Notes

- One independent read-only review lane completed and aligned on the main gaps. A second architecture lane failed before returning evidence due to provider deployment availability, so it was not used as audit evidence.
- This report is source-grounded only; no runtime behavior or backend contracts were assumed.
