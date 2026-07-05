# Phase 18 Rationale

## Quality Bar

The Phase 18 target is not just "pages render"; each user-facing feature page should have real data access, skeleton loading, actionable errors with retry, empty states, responsive layout, and complete feature actions. Backend feature modules should expose complete routers where they represent product features, and every SQLAlchemy ORM model must be imported by `papermerge/core/db/all_models.py`.

## Why TypeScript Was First

The mission made TypeScript errors priority 1. Running `npx tsc --noEmit` before any edits established a clean baseline. That means implementation can focus on real incompleteness rather than compile repair, and every later batch can use the same command as a regression check.

## Why Model Registration Is First Implementation

The missing `all_models.py` imports are small, high-confidence backend correctness fixes:

- They affect Alembic/model discovery.
- They are directly supported by source evidence: both classes subclass `Base`.
- They do not require API design decisions.
- They are easy to verify with targeted import checks.

## Why API Destructuring Comes Next

The project constraint standardizes `apiClient` handling. Several major feature APIs still use `const response = await apiClient...` and then `response.data`. That compiles today, but it is inconsistent and creates a bug-prone pattern for future edits. Normalizing these modules is mechanical, reviewable, and can be validated by TypeScript.

## Why UI State Polish Is Batched After API Cleanup

Wrapper and partial pages usually delegate state handling to feature components. Improving their loading/error/empty states safely requires reading the child component contracts first. That is a larger UI batch than the model registration and API normalization fixes, so it should happen after low-risk backend/API cleanup.

## Constraints Applied

- No new dependencies.
- Use existing shadcn/ui primitives only; no `scroll-area`.
- Use `lucide-react` icons only.
- Preserve named exports except the existing `DataExportPage` exception.
- Keep commits small and only stage files touched for the current batch.
- Do not stage unrelated `.omc` state or submodule changes already present in the worktree.
