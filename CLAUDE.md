# CLAUDE.md — dArchiva

Enterprise document-management platform for large-scale digitization. Forked
from [Papermerge](https://github.com/papermerge/papermerge-core) with
enterprise enhancements. Ingests, processes, secures, and analyzes millions of
financial and legal documents.

*Inherits `~/.claude/CLAUDE.md` and `~/src/pjs/CLAUDE.md`. Additions below only.*

## Stack

- Backend: Python (FastAPI), SQLAlchemy 2.0, Celery, SpaCy, WeasyPrint
- Frontend: React 19, Mantine 8 UI (in `darchiva-ui/`)
- DB: PostgreSQL 17
- OCR engines: **PaddleOCR** (primary), **Tesseract** (fallback), **Qwen-VL via Ollama** (handwriting + technical drawings)
- Access control: 4-layer (RBAC + ABAC + ReBAC + PBAC)
- Search backends: five (Postgres FTS, pgvector, Meilisearch, Elasticsearch, Manticore)
- Multi-tenancy: schema-isolation and row-based modes
- Scanners: eSCL / SANE / TWAIN / WIA

## Commands

```bash
# dev
uv run uvicorn darchiva.main:app --reload
cd darchiva-ui && pnpm dev

# scan agent (out-of-process)
python -m darchiva_scan_agent

# tests (CI directory only)
uv run pytest tests/ci -vxs

# types
uv run pyright
```

## Key files

- `darchiva-scan-agent/` — the scanner-side out-of-process bridge; runs on the machine attached to the physical scanner
- `darchiva-ui/` — React 19 + Mantine 8 SPA
- `DEMO_SCRIPT.md` — canonical demo path (Finance user sees invoice; Legal user gets ACCESS DENIED — the RBAC isolation showcase)
- `docs/` — architecture, deployment, admin docs
- `demo_documents/` — sample corpus for benchmarking OCR quality

## Public hub

`https://llocal.com/darchiva/` (behind passcode) — tech spec + who-benefits +
potential-clients + architecture. Wired into the gate (see
[[project_llocal_gate]] in ~/.claude memory).

## Gotchas

- Papermerge fork rationale: enterprise auth model + multi-engine OCR + tenant isolation don't cleanly upstream. Track upstream security patches only; don't attempt full-fork merges.
- OCR engine choice is per-document-type policy (financial-tabular → PaddleOCR; handwritten → Qwen-VL; general → Tesseract fallback). Don't hard-code one engine.
- Ollama for Qwen-VL runs on the vault server `62.169.25.77:11434`; local dev needs an SSH tunnel or `OLLAMA_HOST` override.
