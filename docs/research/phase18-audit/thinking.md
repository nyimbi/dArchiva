# Phase 18 Audit Evidence

## Commands Run

```bash
find darchiva-ui/src/pages -maxdepth 3 -type f | sort
find darchiva-ui/src/features -maxdepth 4 -type f | sort
find papermerge-core/papermerge/core/features -maxdepth 3 -type f | sort
sed -n '1,240p' papermerge-core/papermerge/core/db/all_models.py
cd darchiva-ui && npx tsc --noEmit 2>&1
rg -n "export function|function [A-Z]|const [A-Z].*=|return \\(" darchiva-ui/src/pages/*.tsx
rg -n "mock|TODO|coming soon|stub|placeholder|sample|demo|static|hardcoded|Mock" darchiva-ui/src/pages darchiva-ui/src/features papermerge-core/papermerge/core/features -g '!**/__pycache__/**' -g '!**/*.pyc'
rg -n "@router\\.(get|post|put|patch|delete)|APIRouter" papermerge-core/papermerge/core/features -g 'router.py' -g '!**/__pycache__/**'
find papermerge-core/papermerge/core/features -path '*/db/orm.py' -o -name 'models.py' -o -name 'orm.py' -o -name '*models.py'
```

## TypeScript Baseline

`cd darchiva-ui && npx tsc --noEmit 2>&1` completed with exit code 0 and no output.

## Frontend Inventory Notes

- Page files under `darchiva-ui/src/pages`: 28 TSX pages plus `index.ts`.
- Feature directories under `darchiva-ui/src/features`: 68 top-level feature directories.
- Most pages import feature APIs/hooks rather than directly using `apiClient`.
- Direct page-level `apiClient` usage was found in `DocumentComparison.tsx` and `DocumentDetail.tsx`.
- Thin wrapper pages: `AuditLogs.tsx`, `Hierarchy.tsx`, `Inbox.tsx`, `Security.tsx`, `SharedDocuments.tsx`, `UserHomePage.tsx`.
- Static utility page: `UnauthorizedPage.tsx`.
- `Hierarchy` delegates to `UnifiedHierarchyView`, which uses TanStack Query and real portfolio/case/bundle/document APIs, but it lacks an explicit error state and includes a comment that breadcrumb reselect "Would re-fetch and select the node".
- `InboxList` has skeleton and empty states but no explicit error state.
- `SearchPage` has the most complete page-level state coverage: search skeleton, empty state, facets, saved searches, history, and advanced filters.
- `SystemHealth`, `ExceptionQueue`, `IngestionDashboard`, `Webhooks`, `ApiKeys`, and `RetentionPolicies` have stronger implementation/state coverage than average.

## Frontend API Pattern Notes

The constraint says `apiClient` returns `{data: T}` and callers should destructure `const { data } = await apiClient.get<T>(...)`.

Modules with response-object usage that should be normalized:

- `features/cases/api.ts`
- `features/forms/api.ts`
- `features/hierarchy/api.ts`
- `features/portfolios/api.ts`
- `features/workflows/api.ts`

Modules with mixed mutation functions returning raw `apiClient` promises should be reviewed:

- `features/security/api.ts`
- selected workflow helpers

## Backend Inventory Notes

- Most backend feature directories have `router.py`.
- Missing router files:
  - `papermerge-core/papermerge/core/features/ownership`
  - `papermerge-core/papermerge/core/features/page_mngm`
  - `papermerge-core/papermerge/core/features/special_folders`
- `special_folders` and `ownership` have ORM/db support and may be intended support features, but the Phase 18 contract asks for router completeness, so they remain audit findings.
- `AgentModel` in `features/agents/models.py` subclasses `Base`.
- `DocumentComment` in `features/comments/orm.py` subclasses `Base`.
- Both are absent from `papermerge/core/db/all_models.py`.
- `policies/models.py` contains dataclasses/enums/domain objects, not SQLAlchemy ORM, and should not be registered with Alembic.

## Runtime/Process Notes

- Native audit subagents were attempted for page, feature, and backend slices, but all failed before doing work with an Azure deployment 404.
- Audit synthesis continued locally from repo evidence.
- Existing unrelated dirty state was present before edits: `.omc` state files and modified submodules. These must not be staged with Phase 18 commits.
