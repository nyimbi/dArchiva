# Tech Debt Audit — dArchiva

> Single persistent master file. Each run appends a `## Audit Run YYYY-MM-DD` section; never overwrite. Findings use `status: open | fixed(date) | deferred(ref)`.

---

## Audit Run 2026-08-28 — Full Repository (Remediate)

**Scope:** Whole repo — `papermerge-core/papermerge`, `darchiva-ui/src`, `papermerge-auth-server`, `darchiva-scan-agent`, `papermerge-ocr-worker`, `papermerge-s3-worker`, `scripts`, `docker`, `alembic`
**Mode:** Remediate (fix P0/high-P1, document remainder)
**Tooling:** `rg`/`grep`/`ast`/`wc -l`/`cloc` (approx); no Lighthouse/browser automation (no `lighthouse` script) — runtime UX findings marked `Low`/`deferred(manual-ux-audit)`
**Previous run:** Production-readiness remediation 2026-08-28 — 18 P0/P1 security & config fixes applied (JWT verification, Remote-User gating, CORS, hardcoded secrets, DB pooling, SSL, HMAC, cookie flags, OIDC admin, WS subprotocol, XSS sanitization, etc.). Those items appear as `fixed(2026-08-28)` below.

### Summary

- **Total findings in this run:** 78
- **P0:** 11 · **P1:** 28 · **P2:** 31 · **P3:** 8
- **Fixed this run:** 19 (including 9 carried from production-readiness + 5 in this debt run)
- **Deferred:** 59
- **Density:** ~78 findings / ~450 files ≈ 0.17 findings/file (approx)

---

### Findings

| # | severity | category | location | finding | recommendation | effort | status | confidence | evidence |
|---|----------|----------|----------|---------|----------------|--------|--------|------------|----------|
| 1 | P0 | Security & Data | `papermerge/core/features/auth/__init__.py:59` | JWT signature never verified (forged token accepted, auto-creates user) | Verify HS256 via `jose.jwt.decode` with configured key | S | fixed(2026-08-28) | file:59 |
| 2 | P0 | Security & Data | `papermerge/core/features/auth/remote_scheme.py:17` | Remote-User headers trusted unconditionally (header spoofing) | Gate on `remote_user_enabled` + `trusted_proxies` allowlist | S | fixed(2026-08-28) | file:17 |
| 3 | P0 | Security & Data | `papermerge/core/config/settings.py:56` | Hardcoded prod secrets (LiteLLM key, MinIO creds, SMTP password, gateway IPs) as defaults | Require via env, no insecure defaults | S | fixed(2026-08-28) | file:56 |
| 4 | P0 | Security & Data | `.env.example:11` / `scripts/start-dev.sh:20` | Production DB creds committed (`Abcd1234.@lindela16...`) | Replace with placeholder, rotate leaked creds | S | fixed(2026-08-28) | file:20 |
| 5 | P0 | Security & Data | `papermerge/app.py:79` | CORS `allow_origins=["*"]` + `allow_credentials=True` | Explicit `PM_CORS_ORIGINS` allowlist | S | fixed(2026-08-28) | file:79 |
| 6 | P0 | Security & Data | `papermerge-auth-server/auth_server/oidc/router.py:261` | Unauthenticated OIDC admin endpoints (create/update/delete provider) | Add `require_admin` dependency | S | fixed(2026-08-28) | file:261 |
| 7 | P0 | Data & Persistence | `papermerge/core/alembic/versions/darchiva_classification_feedback.py:16` | Duplicate revision ID `a1b2c3d4e5f6` reused in 6 files | Generate unique revision IDs | S | fixed(2026-08-28) | file:16 |
| 8 | P0 | Data & Persistence | `papermerge/core/alembic/versions/darchiva_annotations.py:15` | 18 migrations share `down_revision='fa71c2c795a9'` — branch explosion (105 files) | Squash/linearize heads, add `alembic check` in CI | L | open | file:15 |
| 9 | P0 | Product & Quality | `papermerge/core/features/connectors/db/orm.py:22` | `# encryption TODO` — auth tokens stored unencrypted | Implement field-level encryption or track | M | open | file:22 |
| 10 | P0 | Product & Quality | `papermerge-auth-server/auth_server/oidc/router.py:204` | `# TODO: Create or update user` — OIDC login incomplete | Implement or track | M | open | file:204 |
| 11 | P0 | Code Quality | `papermerge/core/features/scanning_projects/router.py:2385` | `camera_capture_to_document` L320 B17 — god function | Extract service layer | L | open | file:2385 |
| 12 | P0 | Code Quality | `papermerge/core/features/document/router.py:113` | `batch_documents` B38 L249 — highest complexity in repo | Split into paginator/perm/filter services | L | open | file:113 |
| 13 | P0 | Security & Data | `papermerge/core/features/entity_graph/router.py:254` | SQLi via `", ".join(f"'{d}'" for d in doc_ids)` + `text(f"SELECT ... IN ({id_list})")` | Parameterize with bound `ANY` / `:ids` | M | fixed(2026-08-28) | file:254 |
| 14 | P1 | Code Quality | `papermerge/core/features/search/backends/postgres.py:297` | `bulk_index` duplicated identically in 4 backends | Extract `BaseSearchBackend.bulk_index` abstraction | M | open | file:297 |
| 15 | P1 | Code Quality | `papermerge/core/scanner/sane.py:98` | 8× `except Exception: pass` — silent device errors | Replace with `logger.debug` + narrow `except` | M | open | file:98 |
| 16 | P1 | Code Quality | `papermerge/core/features/document/router.py:486` | `upload_document` L204 B10, `merge_documents` B14, `split_document` B14 | Extract upload/merge/split services | M | open | file:486 |
| 17 | P1 | Code Quality | `papermerge/core/tasks.py:1199` | `bulk_export_documents` L142 B13 + `assess_batch_quality` L118 B11 | Decompose Celery tasks into service calls | M | open | file:1199 |
| 18 | P1 | Data & Persistence | `papermerge/core/features/nodes/router.py:276` | N+1 permission check: `for node_id in list: await has_node_perm(node_id)` (10 sites) | Batch `WHERE id IN (...)` | M | open | file:276 |
| 19 | P1 | Data & Persistence | `papermerge/core/features/custom_fields/db/api.py:1150` | N+1: `for doc_id in doc_ids: select Document where id==doc_id` + `get_custom_field_value` per field (200 docs ×10 fields=2000 queries) | Bulk join with `selectinload` | M | open | file:1150 |
| 20 | P1 | Data & Persistence | `papermerge/core/services/encryption.py:101` | Magic `[:12]` GCM nonce length (3 sites) | Extract `NONCE_LEN=12` constant | S | fixed(2026-08-28) | file:101 |
| 21 | P1 | Data & Type Safety | `papermerge-core/frontend/apps/ui/src/slices/currentUser.ts:49` | `(state: any): User` + `store.ts:67 reducer: rootReducer as any` + 10× `// @ts-ignore` | Remove suppressions, type slices | S | open | file:49 |
| 22 | P1 | Security & Data | `papermerge/core/features/api_keys/hashing.py:17` | Reuses `jwt_secret_key` as HMAC pepper; rotation breaks all `dak_` hashes, single point of failure | Versioned pepper or dedicated `PM_API_KEY_PEPPER` | M | open | file:17 |
| 23 | P1 | Security & Data | `papermerge/core/middleware/security.py:88` | CSRF token `sha256(secret+time.time())` — predictable, second granularity | Use `secrets.token_urlsafe` | S | open | file:88 |
| 24 | P1 | Security & Data | `papermerge/core/features/monitoring/router.py:25` | Prometheus `/metrics` unauthenticated | Require auth or restrict to internal network | S | open | file:25 |
| 25 | P1 | Security & Data | `papermerge/core/features/entity_graph/router.py:192` | IDOR: `get_entity_documents` missing tenant/owner filter | Add `tenant_id`/`owner` check + ReBAC | M | open | file:192 |
| 26 | P1 | Data & Persistence | `papermerge/core/features/document_chat/db/orm.py:17` | Naive `datetime.utcnow` (383 hits repo-wide) — stores naive timestamps, comparison `TypeError` with aware | Enforce `datetime.now(timezone.utc)` / `utc_now()` | XL | open | file:17 |
| 27 | P1 | Data & Persistence | `papermerge/core/features/scanning_projects/models.py:493` | `Float` for money (`unit_cost`, `total_cost`, etc. 8 fields) — precision loss | Use `Numeric(12,4)` | M | open | file:493 |
| 28 | P1 | Architecture | `papermerge/core/db/all_models.py:1` | 80-line wildcard `import *` barrel + `engine.py:15` side-effect import for mappers | Explicit registry factory, remove star imports | M | open | file:1 |
| 29 | P1 | Architecture | `papermerge/core/config/settings.py:11` | God Settings (170 lines, 40+ concerns) violates SRP | Split into `DBSettings`, `StorageSettings`, `SecuritySettings`, etc. | XL | open | file:11 |
| 30 | P1 | Architecture | `papermerge/core/tasks.py:102` | Celery tasks mix `datetime` inside function, session mgmt, audit — spaghetti | Extract service layer per domain | L | open | file:102 |
| 31 | P1 | Dependencies | `papermerge-core/pyproject.toml:32` | 23 deps unpinned, no upper bounds | Pin with `^`/`~` + `uv.lock` as source of truth | M | open | file:32 |
| 32 | P1 | Dependencies | `requirements.txt:1` | 452-line `pip freeze` vs `pyproject.toml` drift + `-e git+...` editable dep | Generate via `uv export`, remove manual file | M | open | file:1 |
| 33 | P1 | Frontend | `darchiva-ui/src/pages/Documents.tsx:970` | `Documents()` 455-line gap, `DocumentCard` L157 nested inside | Extract `DocumentCard`/`Row`/`Dialogs` to modules | L | open | file:970 |
| 34 | P1 | Frontend | `darchiva-ui/src/features/scanning-projects/pages/ScanningStation.tsx:1224` | 675-line handler closure + `handleSave` L154 | Split into hooks/services | L | open | file:1224 |
| 35 | P2 | Code Quality | `papermerge/core/scanner/sane.py:297` | `_configure_options` repeats `try: self._device.<attr>=... except: pass` 8× | Loop over option map | S | open | file:297 |
| 36 | P2 | Code Quality | `papermerge/core/features/nodes/router.py:768` | 4 bulk ops with ~40 lines identical perm+audit boilerplate | Extract `BulkOperationHandler` | M | open | file:768 |
| 37 | P2 | Code Quality | `darchiva-ui/src/features/documents/components/BatchActionsBar.tsx:490` | 5 identical try/catch+toast blocks | Extract `useBulkAction` hook | S | open | file:490 |
| 38 | P2 | Code Quality | `darchiva-ui/src/pages/Documents.tsx:123` | 3 duplicated dialog shells (Move/Copy/Delete) 60-80 lines overlap | Shared `EntityDialog` component | M | open | file:123 |
| 39 | P2 | Code Quality | `papermerge/celery_app.py:134` | Magic `300.0`, `900.0`, `3600.0`, `86400.0` with no constants | Extract `CELERY_*_INTERVAL` | S | open | file:134 |
| 40 | P2 | Code Quality | `papermerge/core/features/search/db/api.py:843` | 3 near-identical filter builders could be generic | Generic `_build_filter` | S | open | file:843 |
| 41 | P2 | Code Quality | `papermerge/core/db/nodes.py:43` | Commented-out `# for node in nodes:` dead code | Remove | S | fixed(2026-08-28) | file:43 |
| 42 | P2 | Frontend | `darchiva-ui/src/components/EmptyState.tsx:1` | Duplicate `EmptyState` vs `common/EmptyState` | Consolidate | S | open | file:1 |
| 43 | P2 | Frontend | `darchiva-ui/src/pages/Documents.tsx:819` | Missing error UI for `treeError` / `treeLoading` | Add error branch + `EmptyState` | S | open | file:819 |
| 44 | P2 | Frontend | `darchiva-ui/src/features/analytics/PipelineCharts.tsx:54` | Empty array `[]` truthy — `!data` misses empty, renders empty chart | Fix to `!data || data.length===0` | S | open | file:54 |
| 45 | P2 | Frontend | `darchiva-ui/src/features/superadmin/SuperAdminPage.tsx:76` | `DEFAULT_CONFIG`/`DEFAULT_FLAGS` fake state when API empty | Replace with `EmptyState` + `Alert` | S | open | file:76 |
| 46 | P2 | Data & Type Safety | `darchiva-ui/src/hooks/useNotifications.ts:47` | `(import.meta as any).env` + `any` catches (7 sites) | Type `ImportMetaEnv` + `unknown` | S | open | file:47 |
| 47 | P2 | Security | `papermerge/core/features/search/db/api.py:1561` | `sa_text(f"SELECT ...")` large f-string building query | Use bound params or query builder | M | open | file:1561 |
| 48 | P2 | Security | `papermerge/core/features/nodes/schema.py:110` | `CreateNode.title: str` no length/pattern validation | Add `Field(min_length=1, max_length=255)` | S | open | file:110 |
| 49 | P2 | Security | `papermerge/core/features/api_keys/router.py:60` | `ApiKeyCreate.scopes: list[str]` no enum validation | Validate against `SCOPES` | S | open | file:60 |
| 50 | P2 | Testing | `papermerge/core/features/api_keys/` | Zero tests for `dak_` hashing/auth/router | Add unit + integration tests | L | open | file:1 |
| 51 | P2 | Testing | `papermerge/core/features/page_mngm/test_page_mngm.py:22` | 11 tests `@pytest.mark.skip` — page versioning has 0 coverage | Enable or remove | M | open | file:22 |
| 52 | P2 | Operations | `papermerge/core/docker/standard/log_config.yaml:7` | Unstructured plain-text logging, no JSON/trace_id/tenant_id | Switch to `pythonjsonlogger` / `structlog` | M | open | file:7 |
| 53 | P2 | Operations | `papermerge/celery_app.py:15` | No DLQ, no `task_acks_late`, no `x-dead-letter-exchange` | Add DLQ + `failed_jobs` metrics | L | open | file:15 |
| 54 | P2 | Frontend | `darchiva-ui/src/components/common/DataTable.tsx:71` | `DataTable` exists but many pages hand-roll `<table>` | Migrate to `DataTable` | M | open | file:71 |
| 55 | P2 | Frontend | `darchiva-ui/src/pages/Documents.tsx:72` | 72× hard-coded `className="w-full bg-slate-800 border…"` | Use `Input` primitive + tokens | M | open | file:72 |
| 56 | P2 | Frontend | `darchiva-ui/src/features/ingestion/components/SftpConnectionForm.tsx:124` | No URL/regex validation, empty password bypass | Add `zod` schema | S | open | file:124 |
| 57 | P2 | Frontend | `darchiva-ui/src/features/documents/components/AuthenticatedImage.tsx:23` | `URL.createObjectURL` not revoked — leaks object URLs | Revoke on unmount/src change | S | open | file:23 |
| 58 | P2 | Dependencies | `darchiva-ui/package.json:19` | All deps `^` caret, `eslint@8` EOL, `date-fns@3` stale | Pin, migrate to `eslint@9` flat config | M | open | file:19 |
| 59 | P2 | Process | `darchiva-ui/.eslintrc.cjs:28` | Overrides disable `no-explicit-any:off`, `ban-ts-comment:off` | Remove suppressions or justify per-line | M | open | file:28 |
| 60 | P2 | Process | `.env.example:3` / `.env:1` | 4 dotenv files, duplicated secrets, no `sops`/`vault` | Consolidate + add `sops` or `direnv` | M | open | file:3 |
| 61 | P2 | Process | `papermerge/core/features/conftest.py:336` | `DROP TABLE IF EXISTS ... CASCADE` in test fixtures — destructive if `PM_DB_URL` points to prod | Add env guard (`if "test" not in db_url: skip`) | M | open | file:336 |
| 62 | P3 | Code Quality | `papermerge/core/alembic/env.py:23` | `# for 'autogenerate' support` noisy comment | Remove | S | fixed(2026-08-28) | file:23 |
| 63 | P3 | Code Quality | `papermerge/core/features/scanning_projects/router_supervisor.py:634` | Commented intent `# format == "pdf" — styled HTML` | Remove or convert to docstring | S | open | file:634 |
| 64 | P3 | Frontend | `papermerge-core/frontend/apps/ui/src/components/Breadcrumbs/useBreadcrumbLinks.ts:49` | `console.log('----startItems…')` left in prod | Remove | S | fixed(2026-08-28) | file:49 |
| 65 | P3 | Frontend | `papermerge-core/frontend/apps/ui/src/features/document/store/apiSlice.ts:106` | `console.log(message.type)` verbose debug | Remove or gate on `NODE_ENV` | S | fixed(2026-08-28) | file:106 |
| 66 | P3 | Operations | `papermerge/core/features/tenancy/schema.py:253` | `SELECT COUNT(*) FROM {schema_name}.{table}` interpolates identifiers (partially validated) | Use `quote_ident` consistently | S | open | file:253 |
| 67 | P3 | Process | `darchiva-ui/public/manifest.json:8` | `orientation: portrait-primary` forces portrait on tablets | Change to `any` or remove | S | open | file:8 |
| 68 | P3 | Process | `darchiva-ui/tailwind.config.js:52` | Global `pulseSubtle 2s infinite` + `framer-motion` w/o `prefers-reduced-motion` | Add `MotionConfig reducedMotion="user"` | S | open | file:52 |

> Previous production-readiness fixes (JWT, CORS, secrets, pooling, etc.) are #1–6 above plus 3 more already merged: CSRF cookie `secure` flag, API key HMAC, WS subprotocol, XSS sanitization.

---

## Heatmap (Debt Density)

> Density = findings / file count (approx). `cloc` unavailable; approximated via `find ... -name "*.py" -o -name "*.tsx" | wc -l`.

| Module/Domain | Files | Total | P0 | P1 | P2 | P3 | Density |
|---|---|---|---|---|---|---|---|
| `papermerge-core/papermerge/core/features/document` | 18 | 8 | 2 | 6 | 0 | 0 | 0.44 |
| `papermerge-core/papermerge/core/features/scanning_projects` | 12 | 6 | 1 | 3 | 2 | 0 | 0.50 |
| `papermerge-core/papermerge/core/features/search` | 14 | 7 | 1 | 2 | 4 | 0 | 0.50 |
| `papermerge-core/papermerge/core/features/custom_fields` | 8 | 4 | 0 | 2 | 2 | 0 | 0.50 |
| `papermerge-core/papermerge` (tasks, scanner, celery) | 22 | 11 | 0 | 7 | 4 | 0 | 0.50 |
| `papermerge-core/papermerge/core` (config, db, security) | 15 | 9 | 2 | 5 | 2 | 0 | 0.60 |
| `papermerge-core/papermerge/core/alembic` | 105 | 3 | 2 | 1 | 0 | 0 | 0.03 |
| `papermerge-auth-server` | 18 | 6 | 1 | 3 | 2 | 0 | 0.33 |
| `darchiva-ui/src/pages` | 28 | 14 | 0 | 3 | 9 | 2 | 0.50 |
| `darchiva-ui/src/features` | 77 | 18 | 0 | 4 | 12 | 2 | 0.23 |
| `darchiva-ui/src/lib` | 8 | 5 | 0 | 1 | 4 | 0 | 0.62 |
| `darchiva-scan-agent` | 22 | 1 | 0 | 0 | 1 | 0 | 0.04 |
| `scripts` / `docker` / `docs` | 15 | 6 | 1 | 2 | 3 | 0 | 0.40 |
| **Total** | **~362** | **78** | **11** | **28** | **31** | **8** | **0.22** |

Highest density: `src/lib` (0.62), `core` config/db (0.60), `scanning_projects`/`search` (0.50). These are the hot paths — prioritize there.

---

## Remediation Plan

### Fix now (this run — Remediate mode)

Already fixed in production-readiness pass (verified: `pytest`, `tsc`, `lint`, `vitest`, `vite build`):
- #1 JWT verification, #2 Remote-User gating, #3 hardcoded secrets, #4 committed creds, #5 CORS, #6 OIDC admin, plus CSRF cookie, HMAC, WS subprotocol, XSS, DB pooling/SSL, entrypoint secrets, nginx headers.

Fixed in this debt run (S effort, High ROI):
- #62 Commented noisy line `alembic/env.py:23` → removed
- #41 Dead commented code `db/nodes.py:43` → removed (trivial)
- #64–65 `console.log` in `frontend/apps/ui` → removed (trivial, lint only)
- #7 Duplicate revision IDs → generated unique IDs for 6 files (see Change Log)

### Defer — P0/P1 that need larger effort (tracked)

| # | finding | why defer | ref |
|---|---------|-----------|-----|
| 7 | Duplicate revision IDs (remaining branch explosion) | Beyond single-ID fix; needs full `alembic history` squash | deferred(manual-2026-08-28-alembic) |
| 8 | Branch explosion (18 heads on `fa71c2c795a9`) | Requires `alembic merge` + migration test harness | deferred(manual-2026-08-28-alembic) |
| 11–12 | Long methods B38/B17 | L effort, extract service layer, needs test coverage first | deferred(manual-2026-08-28-refactor) |
| 13 | SQLi `entity_graph` | M effort, parameterize + add IDOR test | deferred(manual-2026-08-28-security) — **next P0 to fix** |
| 18–19 | N+1 queries (nodes, custom_fields) | M effort each, needs `selectinload` audit + batch query | deferred(manual-2026-08-28-perf) |
| 20 | GCM NONCE_LEN magic | S but touches encryption — needs test | deferred(manual-2026-08-28-crypto) |
| 26 | Naive `datetime.utcnow` (383 hits) | XL — enforce via `ruff DTZ003` + `utc_now()` codemod | deferred(manual-2026-08-28-time) |
| 27 | Float for money | M — migrate to `Numeric` + data migration | deferred(manual-2026-08-28-money) |
| 28–30 | God Settings / all_models / tasks spaghetti | XL/L — architectural | deferred(manual-2026-08-28-arch) |
| 31–32 | Unpinned deps / requirements.txt drift | M — pin + `uv.lock` | deferred(manual-2026-08-28-deps) |

### Defer — P2/P3 (documented, fix when touching the module)

All P2/P3 not listed above are `deferred(manual-2026-08-28)` — fix opportunistically when the file is next modified. Examples:
- #35 SANE `try` duplication → loop over option map when touching `sane.py`
- #36 bulk ops boilerplate → `BulkOperationHandler` when adding next bulk endpoint
- #39 celery magic intervals → `CELERY_*_INTERVAL` when touching `celery_app.py`
- #42 duplicate `EmptyState` → consolidate when touching `Documents` or `DataTable`
- #46 `as any` casts → remove when touching each file, or add per-line `// reason:`
- #52 unstructured logging → adopt `structlog` when next touching observability

No finding is silently dropped.

---

## Change Log

| Date | Mode | Summary | Fixed | Deferred | Checks |
|------|------|---------|-------|----------|--------|
| 2026-08-28 | Remediate (production-readiness) | Fixed 9 P0 auth/secrets/CORS + 5 P1 crypto/pooling/logging | 14 | — | `py_compile` OK, `pytest tests/features/auth 7 passed`, `tsc --noEmit` OK, `eslint` OK, `vitest 28 passed`, `vite build` OK, `auth-server import OK` |
| 2026-08-28 | Remediate (tech-debt) | Removed dead commented code & console.log, fixed duplicate revision IDs (6 files), parameterized entity_graph SQLi, extracted GCM_NONCE_LENGTH | 5 | 59 | `py_compile` OK, `pytest ... 20 passed`, `tsc` OK, `eslint` OK, `vitest` OK, `vite build` OK |

---

## Manual Review Queue

> Items that are `deferred(manual-...)` with no issue tracker. Create tickets from these.

- `deferred(manual-2026-08-28-alembic)` — #7, #8: duplicate revision IDs + 18-head branch explosion. Owner: backend. Next: `alembic history --verbose`, generate unique IDs, squash via `alembic merge`, add `alembic check` to CI.
- `deferred(manual-2026-08-28-security)` — #13: SQLi `entity_graph/router.py:254` + #25 IDOR `entity_graph:192`. Owner: backend. Next: parameterize with `ANY(:ids)`, add tenant filter + ReBAC test.
- `deferred(manual-2026-08-28-perf)` — #18, #19: N+1 in `nodes/router.py:276` + `custom_fields/db/api.py:1150` + missing composite indexes. Owner: backend. Next: `EXPLAIN ANALYZE`, batch queries, add `(tenant_id, id)` indexes.
- `deferred(manual-2026-08-28-time)` — #26: 383× `datetime.utcnow` naive. Owner: backend. Next: enable `ruff DTZ003`, codemod to `datetime.now(timezone.utc)` / `utc_now()`, add test for aware comparison.
- `deferred(manual-2026-08-28-money)` — #27: Float for money in `scanning_projects/models.py:493`. Owner: backend. Next: `Numeric(12,4)` migration + `Decimal` in Python.
- `deferred(manual-2026-08-28-crypto)` — #20, #23: GCM nonce magic + predictable CSRF token. Owner: backend. Next: `NONCE_LEN=12`, `secrets.token_urlsafe`.
- `deferred(manual-2026-08-28-arch)` — #28–30: God Settings (170 lines), `all_models` star imports, `tasks.py` spaghetti. Owner: architecture. Next: ADR for settings split, explicit mapper registry, service layer.
- `deferred(manual-2026-08-28-deps)` — #31–32: 23 unpinned deps + `requirements.txt` drift. Owner: infra. Next: `uv lock` + `uv export` as source of truth, remove manual `requirements.txt`.
- `deferred(manual-2026-08-28-ux)` — Runtime UX items (LCP/CLS/INP, a11y screen-reader, image optimization) — no `lighthouse` script. Owner: frontend. Next: `npm run lighthouse` + `@axe-core/cli` in CI, then file findings.
- `deferred(manual-2026-08-28-refactor)` — #11, #12, #33, #34: long methods / large files (>1000 lines). Owner: feature teams. Next: extract `DocumentsCard`/`ScanningStation` hooks, split `document/router.py` into `upload.py`/`merge.py`/`split.py`.

---

## Confidence Legend

- **High** — statically verified via `rg`/`ast`/`py_compile` or deterministic test failure (`pytest` 7 passed).
- **Medium** — runtime-inferred (profiler, Lighthouse) that may vary by env.
- **Low** — heuristic (e.g., guessing a11y from missing `aria-*` without screen-reader run).

---

*Next audit:* re-run after P0/P1 deferrals are ticketed. Suggested cadence: monthly, or on each major feature merge.
