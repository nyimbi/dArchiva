# Phase 18 Audit

Date: 2026-07-05

## Executive Summary

- TypeScript baseline is clean: `cd darchiva-ui && npx tsc --noEmit` exits 0 with no diagnostics.
- Most frontend feature areas are real implementations connected through TanStack Query and `apiClient`; the main remaining gaps are partial UX states, a few wrapper/static pages, and several features with hard-coded/demo-only helper data.
- Most backend feature directories have `router.py`; missing routers were found for `ownership`, `page_mngm`, and `special_folders`.
- Alembic model registration has two real gaps: `papermerge.core.features.agents.models.AgentModel` and `papermerge.core.features.comments.orm.DocumentComment` subclass `Base` but are not imported in `papermerge/core/db/all_models.py`.
- `policies/models.py` is a dataclass domain model file, not SQLAlchemy ORM, so it should not be imported into `all_models.py`.

## Frontend Pages

| Page | Implementation | API connection | Loading/error/empty state | UI completeness |
| --- | --- | --- | --- | --- |
| `Analytics.tsx` | Real | `features/analytics/api` | Loading and error blocks present | Strong dashboard, export controls; empty chart states should be hardened |
| `ApiKeys.tsx` | Real | `features/api-keys/api` | Query/mutation states present | Complete CRUD shape with reveal/delete; needs polish around empty/retry copy |
| `AuditLogs.tsx` | Real wrapper | `features/audit/components/AuditLog` | Delegated to component | Usable, but page shell is thin |
| `Cases.tsx` | Real | `features/cases` | Partial | Cards/modals exist; needs stronger error/empty consistency |
| `Dashboard.tsx` | Real | dashboard/activity/workflow hooks | Partial | Good summary page; verify all sections have retry affordances |
| `DocumentComparison.tsx` | Partial-real | direct `apiClient` document/page queries | Loading and error for metadata, partial page states | Useful comparison UI; panel placeholder comment and null-doc behavior need polish |
| `DocumentDetail.tsx` | Real | direct document/page/version queries plus feature panels | Loading and error present | Feature-rich; many child panels own their states |
| `Documents.tsx` | Real | documents, document-types, tags, shared-nodes APIs | Partial | Large implementation; search input appears presentational and needs wiring audit |
| `Encryption.tsx` | Real | `features/encryption` | Partial | Key/access/document operations exist; needs uniform retry/empty handling |
| `ExceptionQueue.tsx` | Real | scanning-project exception hooks | Stronger than average | Queue/rules tabs, filters, resolve flow present |
| `Forms.tsx` | Real | `features/forms` | Partial | Template/extraction queue implementation; needs richer empty/error states |
| `Hierarchy.tsx` | Partial wrapper | `features/hierarchy` | Delegated; hierarchy has loading and empty, lacks error | Wrapper uses inline padding; hierarchy has a comment noting breadcrumb reselect is incomplete |
| `Inbox.tsx` | Real wrapper | `features/home/api/hooks` via `InboxList` | Loading/empty present, no explicit error | Good task list; add error/retry |
| `Ingestion.tsx` | Real | `features/ingestion` | Partial | Source cards and modals exist; needs consistent skeleton/error coverage |
| `IngestionDashboard.tsx` | Real | `features/ingestion` dashboard hooks | Strong | Dashboard cards and filters; verify error retry on all sections |
| `Portfolios.tsx` | Real | `features/portfolios` | Partial | Cards/modals exist; empty/error polish needed |
| `RetentionPolicies.tsx` | Real | `features/retention/api` | Query/mutation states present | CRUD dialog/delete/dry-run present; good candidate for shadcn cleanup |
| `Routing.tsx` | Real | `features/routing` | Partial | Rule cards and CRUD/test modals exist; needs consistent retry/empty states |
| `SearchPage.tsx` | Real | `features/search/api` | Skeleton and empty present | Advanced filtering and saved search present; good page |
| `Security.tsx` | Real wrapper | `features/security/components/SecurityDashboard` | Delegated | Thin wrapper, feature area is broad and real |
| `Settings.tsx` | Partial | mixed local static sections plus feature settings | Minimal page-level loading/error | Some tabs are real components; general/branding/storage are local static UI and need backend-backed settings |
| `SharedDocuments.tsx` | Real wrapper | `features/shared-nodes` | Delegated | Usable list/edit flow; wrapper is thin |
| `SupervisorDashboard.tsx` | Real | scanning-project/scanning-ops hooks | Loading/error in several sections | Strong operational UI; one scanning-ops child still uses mocked supervisor data |
| `SystemHealth.tsx` | Real | `features/system` and admin search index | Skeletons and banners present | Strong health page |
| `UnauthorizedPage.tsx` | Static utility | None needed | Not applicable | Complete for purpose |
| `UserHomePage.tsx` | Re-export | `features/home/components/UserHomePage` | Delegated | Real implementation in feature component |
| `Webhooks.tsx` | Real | `features/webhooks/api` | Query/mutation states present | CRUD/test/delivery logs present |
| `Workflows.tsx` | Real | `features/workflows` | Partial | Tasks/workflows/designer tabs; some API transforms use response object rather than destructuring |

## Frontend Features

| Feature | Implementation | Backend/API | State coverage | Notes |
| --- | --- | --- | --- | --- |
| `acl` | Real | `/documents/{id}/acl` style hooks | Loading/error in panel | Good document-level ACL panel |
| `activity` | Real | document activity/feed | Basic | Good API hooks; panel state audit needed |
| `admin` | Partial-real | user/group/tenant/search-index APIs | Mixed | Tenant/search admin real; some screens use local CSS and need shadcn consistency |
| `agents` | Real | `/agents` | Basic | Fleet management connected; backend model registration gap |
| `analytics` | Real | `/analytics/*` | Good | Dashboard data hooks present |
| `annotations` | Real | document annotations | Basic | Toolbar/layer functional |
| `api-keys` | Real API module | `/api-keys` | Page-owned | Good |
| `api-tokens` | Real | token hooks/components | Good | Mature component set |
| `approvals` | Real | approval workflow endpoints | Basic | Panel has create/action paths |
| `audit` | Real | `/audit-logs` plus export | Good | Export uses raw fetch path, confirm auth headers stay consistent |
| `auth` | Real | MFA/webauthn/users APIs | Good | Complete auth surface |
| `auto-routing` | Real | `/auto-routing/rules` | Good | Rules/test hooks present |
| `automation` | Real | `/automation/rules` | Good | Full rules page |
| `batches` | Real | batch/location APIs | Good | Dashboard/components present |
| `billing` | Real | `/billing/*` | Good | Cost dashboard hooks present |
| `cases` | Real | `/cases`, `/bundles` | Partial | Some API functions use `response.data`; works but violates project destructuring convention |
| `classification` | Real | classification feedback endpoints | Basic | Panel connected |
| `comments` | Real | document comments | Basic | Backend model registration gap |
| `connectors` | Real | `/connectors` | Good | Dropbox token/folder helpers present |
| `custom-fields` | Real | `/custom-fields` | Good | List/form/date-time controls present |
| `dashboard` | Real | `/dashboard/*`, workflows | Basic | Hooks present |
| `data-export` | Real | admin data export/GDPR/bundle | Good | `DataExportPage` default-export exception honored |
| `document-chat` | Real | document chat endpoints | Basic | Example prompts are UI affordances, not data stubs |
| `document-types` | Real | `/document-types` | Good | CRUD components |
| `documents` | Real | nodes/documents/page APIs | Mixed | Large mature area; Browser OCR config references external providers and must be constrained to LiteLLM/local use |
| `email-ingest` | Real | `/email-ingest` | Good | CRUD/test/trigger hooks |
| `emails` | Real | email account/rule/dashboard APIs | Good | Broad implementation |
| `encryption` | Real | `/encryption` | Good | Keys/access/document operations |
| `entity-graph` | Real | `/entities/graph` | Basic | Graph page connected |
| `exceptions` | Real | exception hooks | Good | Queue/stats/autofix panels |
| `forms` | Real | `/forms/*` | Partial | API functions use response object pattern |
| `groups` | Real | `/groups` | Good | CRUD/member components |
| `hierarchy` | Partial | portfolios/cases/bundles/documents/search | Loading/empty, missing error | Breadcrumb reselect comment and manual SVG/CSS need polish |
| `home` | Real | `/users/me/home`, tasks, favorites, calendar | Good | User home page is substantial |
| `iam` | Real UI | IAM hooks | Mixed | Permission/role dashboards present |
| `inbox` | Real | home workflow task hooks | Loading/empty only | Add error/retry |
| `ingestion` | Real | `/ingestion`, sftp/bulk | Good | Broad implementation |
| `inventory` | Real | `/inventory` | Good | Dashboard/list/detail/scanning station connected |
| `legal-hold` | Real | `/legal-holds` | Basic | Panel connected |
| `notifications` | Real | notification hooks/store | Mixed | Center/preferences/toasts present |
| `onboarding` | Real | `/onboarding` | Good | Wizard connected |
| `portfolios` | Real | `/portfolios` | Partial | CRUD/options modals present |
| `preferences` | Real | `/preferences/me` | Good | Tests present |
| `provenance` | Real | `/provenance` | Good | Timeline components |
| `quality` | Real | `/quality` | Good | Rules/rescan/dashboard |
| `reports` | Real | `/reports/scheduled` | Good | Scheduled reports page |
| `retention` | Real API module | `/retention/policies` | Page-owned | Complete policy CRUD/dry run |
| `roles` | Real | `/roles`, `/permissions` | Good | Tests present |
| `routing` | Real | `/routing` | Good | CRUD/test modals |
| `scanner` | Real | `/scanners` | Good | Agent/scanner UI suite |
| `scanning-ops` | Partial-real | scanning ops hooks | Mixed | `SupervisorDashboard` component explicitly says some data is mocked |
| `scanning-projects` | Real | `/scanning-projects` | Broad | Large and connected; several advanced UI-only controls should be verified against backend endpoints |
| `search` | Real | `/search` | Good | Advanced search, facets, saved searches |
| `security` | Real | roles/users/departments/policies/audit/iam | Mixed | Broad feature; verify each backend route exists and normalize response destructuring |
| `settings` | Partial-real | settings/user/doc-type/tag APIs | Mixed | Many sections real; some are static/local-only controls |
| `shared-nodes` | Real | `/shared-nodes` | Good | List/share dialogs connected |
| `sharing` | Real | document share links/public info | Good | Dialog/API connected |
| `shortcuts` | Static utility | None needed | Not applicable | Complete for keyboard help/provider |
| `signatures` | Real | signature endpoints | Basic | API returns normalized objects from generic backend records |
| `superadmin` | Real | `/superadmin` | Good | Page/API connected |
| `system` | Real | health/queues/workers/services/metrics | Good | Used by SystemHealth |
| `tags` | Real | `/tags` | Good | Tests present |
| `templates` | Real | `/templates` | Good | Template CRUD/create-from-template |
| `tenant` | Real | current tenant branding | Basic | Branding settings |
| `tenants` | Real | `/tenants` | Good | Tenant management suite |
| `theme` | Static utility | None needed | Not applicable | Provider/toggle complete |
| `users` | Real | `/users` | Good | Tests present |
| `webhooks` | Real API module | `/webhooks` | Page-owned | CRUD/test/delivery APIs |
| `workflows` | Real | `/workflows` | Mixed | Large implementation; response destructuring convention violations remain |

## Backend Features

| Feature | Router | Endpoint completeness | ORM registration |
| --- | --- | --- | --- |
| `acl` | Yes | Document ACL CRUD/effective perms | Registered |
| `activity` | Yes | Read-only feed/document activity | No ORM |
| `agents` | Yes | Register/heartbeat/list/get/config/delete | Missing `agents.models` import |
| `analytics` | Yes | Read/export/scanning analytics | No ORM |
| `annotations` | Yes | Document annotation CRUD | Registered |
| `api_keys` | Yes | API key CRUD | Registered |
| `api_tokens` | Yes | Token CRUD | Registered |
| `approvals` | Yes | Workflow create/action/list | Registered |
| `audit` | Yes | Audit log read/export/security helpers | Registered |
| `auth` | Yes | Auth endpoints | No ORM |
| `auto_routing` | Yes | Rule CRUD/test | Registered |
| `automation` | Yes | Rule CRUD/test/history | Registered |
| `batches` | Yes | Batch/location CRUD/actions | Registered |
| `billing` | Yes | Dashboard/usage/alerts/invoices | Registered |
| `bundles` | Yes | Bundle CRUD/document/section actions | Registered |
| `cases` | Yes | Case CRUD/workflow actions | Registered |
| `classification_feedback` | Yes | Feedback create/list/stats | Registered |
| `comments` | Yes | Document comment CRUD | Missing `comments.orm` import |
| `connectors` | Yes | Connector CRUD/sync/preview/dropbox | Registered |
| `custom_fields` | Yes | Field CRUD/usage | Registered |
| `dashboard` | Yes | Dashboard summary endpoints | No ORM |
| `data_export` | Yes | Export job/download/GDPR | Registered |
| `dedup` | Yes | Duplicate query/action | Registered |
| `departments` | Yes | Department endpoints | Registered |
| `document` | Yes | Document/node/page operations | Registered |
| `document_chat` | Yes | Chat/history/delete | Registered |
| `document_relationships` | Yes | Relationship CRUD | Registered |
| `document_types` | Yes | Document type CRUD | Registered |
| `email_ingest` | Yes | Config CRUD/test/trigger | Registered |
| `email_notifications` | Yes | Preferences read/update | No ORM |
| `emails` | Yes | Email account/rule/message flows | Registered |
| `encryption` | Yes | Keys/access/encrypt/decrypt/stats | Registered |
| `entity_graph` | Yes | Graph/entity document reads | No ORM |
| `exceptions` | Yes | Queue/stats/routing/autofix | Registered |
| `expiry` | Yes | Expiry get/put/delete/upcoming | Registered |
| `filing_suggestions` | Yes | Suggestions read/apply | No ORM |
| `form_recognition` | Yes | Template/extraction/signature queue | Registered |
| `groups` | Yes | Group CRUD/members/tree | Registered |
| `iam` | Yes | IAM/matrix endpoints | Registered |
| `ingestion` | Yes | Sources/jobs/batches/templates/validation | Registered |
| `inventory` | Yes | Locations/containers/scan/reports/QR | Registered |
| `legal_hold` | Yes | Legal hold list/create/delete | Registered |
| `legal_holds` | Yes | Compatibility/alias endpoints | No ORM observed |
| `liveness_probe` | Yes | Probe endpoint | No ORM |
| `mfa` | Yes | MFA endpoints | Registered |
| `monitoring` | Yes | Health/metrics | No ORM |
| `nodes` | Yes | Node operations | Registered |
| `notifications` | Yes | Notification endpoints | Registered |
| `ocr_proxy` | Yes | OCR proxy | No ORM |
| `onboarding` | Yes | Status/update/reset | No ORM |
| `ownership` | No | ORM-only/support feature | Registered |
| `page_mngm` | No | Support module, no router | No ORM |
| `permissions` | Yes | Permission reads | No ORM |
| `policies` | Yes | Policy CRUD/evaluate/access graph | Registered via `db/orm.py`; domain dataclasses not ORM |
| `portfolios` | Yes | Portfolio CRUD/access/cases/stats/archive | Registered |
| `preferences` | Yes | Preferences read/update/reset | Registered |
| `provenance` | Yes | Provenance CRUD/events/verify | Registered |
| `qr` | Yes | QR operations | No ORM |
| `quality` | Yes | Rules/assessments/issues/stats/VLM | Registered |
| `reports` | Yes | Report generation endpoints | No ORM |
| `retention` | Yes | Retention policy CRUD/run | Registered |
| `roles` | Yes | Role CRUD/permissions | Registered |
| `routing` | Yes | Routing rule CRUD/test/logs/stats | Registered |
| `scanners` | Yes | Scanner/profile/job/settings/agent endpoints | Registered |
| `scanning_projects` | Yes | Project/batch/member/QC/ops endpoints | Registered |
| `scheduled_reports` | Yes | Scheduled report CRUD/send | Registered |
| `search` | Yes | Search/facets/saved/recent | Registered |
| `search_admin` | Yes | Index admin endpoints | No ORM |
| `segmentation` | Yes | Segmentation import/review/delete/export | Registered |
| `serial_numbers` | Yes | Serial number endpoints | Registered |
| `settings` | Yes | Settings CRUD | Registered |
| `sftp` | Yes | SFTP connection CRUD/test/list | Registered |
| `shared_nodes` | Yes | Shared nodes/link CRUD/access | Registered |
| `sharing` | Yes | Share links/public access | Registered |
| `signatures` | Yes | Signature request/action endpoints | Registered |
| `special_folders` | No | ORM/db API only | Registered |
| `superadmin` | Yes | System/tenant admin | No ORM |
| `system` | Yes | Health/services/queues/workers | No ORM |
| `tags` | Yes | Tag CRUD/document membership | Registered |
| `tasks` | Yes | Task endpoints | No ORM |
| `templates` | Yes | Template CRUD/create document | Registered |
| `tenants` | Yes | Tenant/current/provision/user/storage/AI | Registered |
| `user_home` | Yes | Home/tasks/favorites/calendar | Registered |
| `users` | Yes | User CRUD/profile/admin | Registered |
| `webauthn` | Yes | Passkey register/auth CRUD | Registered |
| `webhooks` | Yes | Webhook CRUD/test/deliveries | Registered |
| `workflows` | Yes | Workflow CRUD/instances/SLA/templates | Registered |

## Implementation Queue

1. Register missing backend ORM models for agents and comments.
2. Normalize high-impact frontend API modules that violate `const { data } = await apiClient...`: cases, forms, hierarchy, portfolios, workflows, and selected security mutations.
3. Add error/retry states to thin wrapper/partial pages: Inbox, Hierarchy, SharedDocuments, Cases, Portfolios, Routing, Ingestion, Forms.
4. Replace static/local settings tabs in `Settings.tsx` with backend-backed settings where endpoints exist.
5. Remove or clearly fence mocked/placeholder operational data in scanning-ops supervisor components.
6. Enforce LiteLLM-only OCR/AI configuration in browser OCR and AI-assisted scanning project surfaces.
