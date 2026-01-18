# dArchiva Implementation Plan

## Project Overview

dArchiva is a document management system forked from Papermerge, enhanced to handle 4+ million financial and legal documents with enterprise-grade security, multi-backend search, and AI-powered OCR.

## Repository Structure

```
dArchiva/
├── papermerge-core/          # Core API + Frontend (FastAPI + React/Mantine)
├── papermerge-ocr-worker/    # OCR processing worker (Celery)
├── papermerge-s3-worker/     # Storage sync worker (Celery)
├── papermerge-auth-server/   # Authentication service (FastAPI)
└── spec/                     # Specifications and plans
```

---

## 1. Storage Enhancements

### 1.1 Add Linode Object Storage

**Files to modify:**

| Repository | File | Changes |
|------------|------|---------|
| papermerge-s3-worker | `s3worker/types.py` | Add `LINODE = 'linode'` to StorageBackend enum |
| papermerge-s3-worker | `s3worker/config.py` | Add Linode credentials: `linode_access_key_id`, `linode_secret_access_key`, `linode_region`, `linode_cluster_id` |
| papermerge-s3-worker | `s3worker/client.py` | Add Linode client initialization in `get_client()` |
| papermerge-core | `papermerge/core/types.py` | Mirror StorageBackend enum changes |
| papermerge-core | `papermerge/core/config.py` | Add Linode configuration options |

**Linode endpoint format:** `https://{cluster_id}.linodeobjects.com`

**Environment variables:**
```bash
LINODE_ACCESS_KEY_ID=
LINODE_SECRET_ACCESS_KEY=
LINODE_CLUSTER_ID=us-east-1  # or eu-central-1, ap-south-1, etc.
LINODE_BUCKET_NAME=
```

### 1.2 S3 Storage Tiering

**Implementation:** Configure at AWS/Linode level via lifecycle policies, not application level.

**Document flow:**
- Original scans → S3 Deep Archive / Linode Object Storage (cold)
- Searchable PDFs → S3 Standard / Linode Object Storage (hot)
- Thumbnails → S3 Standard (hot)

---

## 2. OCR Engine Enhancements

### 2.1 Replace Tesseract with PaddleOCR

**Files to modify:**

| Repository | File | Changes |
|------------|------|---------|
| papermerge-ocr-worker | `pyproject.toml` | Replace `ocrmypdf` with `paddleocr`, `paddlepaddle` |
| papermerge-ocr-worker | `ocrworker/ocr.py` | Rewrite `run_one_page_ocr()` to use PaddleOCR |
| papermerge-ocr-worker | `ocrworker/config.py` | Add OCR engine selection config |

**New dependencies:**
```toml
paddleocr = "^2.9"
paddlepaddle = "^3.0"  # or paddlepaddle-gpu for GPU support
```

**PaddleOCR advantages:**
- Superior table/structure recognition (PP-StructureV3)
- Better accuracy on invoices, receipts, contracts
- Layout-aware extraction

### 2.2 Add Ollama Qwen3-VL Support

**Purpose:** Vision-language model for complex document understanding and image analysis.

**Files to modify:**

| Repository | File | Changes |
|------------|------|---------|
| papermerge-ocr-worker | `pyproject.toml` | Add `ollama` client library |
| papermerge-ocr-worker | `ocrworker/ocr.py` | Add `run_vlm_ocr()` function |
| papermerge-ocr-worker | `ocrworker/config.py` | Add Ollama endpoint config |
| papermerge-ocr-worker | `ocrworker/tasks.py` | Add `vlm_analyze_task` for image analysis |

**Configuration:**
```bash
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=qwen2.5-vl:7b  # or qwen2.5-vl:72b for higher accuracy
OCR_ENGINE=paddleocr  # paddleocr | tesseract | qwen-vl | hybrid
```

**Hybrid mode:** Use PaddleOCR for text extraction, Qwen-VL for:
- Document classification
- Complex table understanding
- Handwritten text
- Image content analysis
- Metadata inference

### 2.3 Specialized Document Type Handling

#### Handwriting Recognition

| Engine | Use Case | Accuracy | Speed |
|--------|----------|----------|-------|
| **TrOCR (Microsoft)** | Printed + handwritten text | High | Medium |
| **Qwen-VL** | Complex handwriting, mixed content | Very High | Slow |
| **PaddleOCR (handwriting mode)** | Clear handwriting | Medium | Fast |

**Configuration:**
```bash
HANDWRITING_ENGINE=qwen-vl  # paddleocr | trocr | qwen-vl
HANDWRITING_CONFIDENCE_THRESHOLD=0.7
```

#### Technical Drawings & Diagrams

```python
class TechnicalDrawingProcessor:
    """Special handling for technical drawings, blueprints, schematics"""

    async def process(self, image: bytes) -> DrawingAnalysis:
        # 1. Detect drawing type
        drawing_type = await self.classify_drawing(image)
        # architectural, electrical, mechanical, flowchart, p&id, etc.

        # 2. Extract text annotations
        annotations = await self.extract_annotations(image)

        # 3. Detect symbols (using VLM)
        symbols = await self.detect_symbols(image)

        # 4. Extract dimensions and measurements
        dimensions = await self.extract_dimensions(image)

        # 5. Generate searchable description
        description = await self.generate_description(image, annotations, symbols)

        return DrawingAnalysis(
            drawing_type=drawing_type,
            annotations=annotations,
            symbols=symbols,
            dimensions=dimensions,
            description=description
        )
```

#### Multi-Document Image Segmentation

**Problem:** A single scan may contain multiple documents (e.g., 2 invoices side-by-side).

```python
class DocumentSegmenter:
    """Detect and split multiple documents in single image"""

    async def segment(self, image: bytes) -> list[SegmentedDocument]:
        # 1. Detect document boundaries using edge detection + ML
        boundaries = await self.detect_boundaries(image)

        # 2. If multiple documents detected, split image
        if len(boundaries) > 1:
            segments = []
            for i, boundary in enumerate(boundaries):
                cropped = self.crop_to_boundary(image, boundary)
                deskewed = self.deskew(cropped)
                segments.append(SegmentedDocument(
                    segment_number=i + 1,
                    total_segments=len(boundaries),
                    image=deskewed,
                    boundary=boundary,
                    confidence=boundary.confidence
                ))
            return segments

        # Single document - return as-is
        return [SegmentedDocument(image=image, segment_number=1, total_segments=1)]

    async def detect_boundaries(self, image: bytes) -> list[DocumentBoundary]:
        """Use VLM or specialized model to find document edges"""
        # Options:
        # 1. DocTR document detection
        # 2. LayoutLM for layout analysis
        # 3. Qwen-VL with prompt "identify document boundaries"
        # 4. Traditional CV: edge detection + contour analysis
        pass
```

**Database schema for multi-document scans:**

```sql
-- Link between original scan and extracted documents
CREATE TABLE scan_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_scan_id UUID NOT NULL,  -- Original image file
    document_id UUID REFERENCES documents(id),
    segment_number INTEGER NOT NULL,
    total_segments INTEGER NOT NULL,

    -- Boundary coordinates in original image
    boundary_x INTEGER,
    boundary_y INTEGER,
    boundary_width INTEGER,
    boundary_height INTEGER,

    -- Confidence that this is a separate document
    segmentation_confidence FLOAT,

    -- Manual review if confidence is low
    manually_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES users(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Document Type Detection

```python
class DocumentTypeDetector:
    """Automatically classify document type using VLM"""

    DOCUMENT_TYPES = [
        "invoice", "receipt", "contract", "letter",
        "form", "report", "memo", "technical_drawing",
        "handwritten_note", "check", "id_document",
        "bank_statement", "tax_form", "legal_document"
    ]

    async def detect(self, image: bytes) -> DocumentTypeResult:
        # Use Qwen-VL or similar VLM
        response = await self.vlm.analyze(
            image=image,
            prompt="""Classify this document. Choose one:
            - invoice, receipt, contract, letter, form, report,
            - memo, technical_drawing, handwritten_note, check,
            - id_document, bank_statement, tax_form, legal_document, other
            Also provide confidence (0-1) and key observations."""
        )

        return DocumentTypeResult(
            document_type=response.type,
            confidence=response.confidence,
            observations=response.observations,
            suggested_metadata=response.suggested_fields
        )
```

---

## 3. Search Backend Enhancements

### 3.1 Multi-Backend Search Architecture

**Create new search worker:** `papermerge-search-worker/`

**Supported backends:**
1. **PostgreSQL Full-Text Search** (default, already implemented)
2. **Elasticsearch/OpenSearch**
3. **SOLR**
4. **Meilisearch**

**Architecture:**

```
┌─────────────────┐     ┌──────────────────┐
│ papermerge-core │────▶│ Search Abstraction│
└─────────────────┘     │     Layer         │
                        └────────┬─────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
┌───────────────┐    ┌───────────────────┐    ┌─────────────────┐
│ PostgreSQL FTS│    │ Elasticsearch     │    │ Meilisearch     │
│ (pgvector)    │    │ OpenSearch/SOLR   │    │                 │
└───────────────┘    └───────────────────┘    └─────────────────┘
```

**Files to create/modify:**

| Repository | File | Purpose |
|------------|------|---------|
| papermerge-core | `papermerge/core/search/backend.py` | Abstract search backend interface |
| papermerge-core | `papermerge/core/search/postgres.py` | PostgreSQL FTS implementation |
| papermerge-core | `papermerge/core/search/elasticsearch.py` | Elasticsearch implementation |
| papermerge-core | `papermerge/core/search/solr.py` | SOLR implementation |
| papermerge-core | `papermerge/core/search/meilisearch.py` | Meilisearch implementation |
| papermerge-core | `papermerge/core/config.py` | Add search backend config |

**Configuration:**
```bash
SEARCH_BACKEND=postgres  # postgres | elasticsearch | solr | meilisearch
ELASTICSEARCH_URL=http://elasticsearch:9200
SOLR_URL=http://solr:8983/solr/documents
MEILISEARCH_URL=http://meilisearch:7700
MEILISEARCH_API_KEY=
```

### 3.2 pgvector for Semantic Search

**Purpose:** Vector embeddings for semantic/similarity search.

**Files to modify:**

| Repository | File | Changes |
|------------|------|---------|
| papermerge-core | `pyproject.toml` | Add `pgvector` |
| papermerge-core | `papermerge/core/db/vectors.py` | Vector storage ORM |
| papermerge-core | `papermerge/core/features/search/embeddings.py` | Embedding generation |
| papermerge-core | `alembic/versions/xxx_add_vectors.py` | Migration for vector column |

**Database schema:**
```sql
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE document_search_index
ADD COLUMN embedding vector(1536);  -- OpenAI ada-002 dimension

CREATE INDEX idx_document_embedding
ON document_search_index
USING ivfflat (embedding vector_cosine_ops);
```

**Embedding providers:**
- Ollama (local): `nomic-embed-text`, `mxbai-embed-large`
- OpenAI: `text-embedding-3-small`
- Sentence Transformers (local): `all-MiniLM-L6-v2`

**Configuration:**
```bash
EMBEDDING_PROVIDER=ollama  # ollama | openai | sentence-transformers
EMBEDDING_MODEL=nomic-embed-text
OLLAMA_EMBEDDING_URL=http://ollama:11434
```

---

## 4. Permission System Enhancements

dArchiva implements a comprehensive multi-model access control system supporting:
- **RBAC** - Role-Based Access Control (existing, enhanced)
- **ABAC** - Attribute-Based Access Control
- **ReBAC** - Relationship-Based Access Control
- **PBAC** - Policy-Based Access Control

### 4.1 Access Control Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Policy Decision Point (PDP)                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │  RBAC   │  │  ABAC   │  │  ReBAC  │  │  PBAC   │           │
│  │ Engine  │  │ Engine  │  │ Engine  │  │ Engine  │           │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘           │
│       └──────────┬─┴───────────┴─────────────┘                 │
│                  ▼                                               │
│         ┌───────────────┐                                       │
│         │ Policy Combiner│ (first-applicable / deny-overrides)  │
│         └───────┬───────┘                                       │
└─────────────────┼───────────────────────────────────────────────┘
                  ▼
         ┌───────────────┐
         │ Access Decision│ ALLOW / DENY
         └───────────────┘
```

### 4.2 RBAC Enhancement (Role-Based)

**Already implemented in Papermerge.** Enhancements:

| Feature | Status | Changes |
|---------|--------|---------|
| Roles with scopes | ✅ Existing | - |
| User-role assignment | ✅ Existing | - |
| Department-role mapping | 🆕 New | Link departments to default roles |
| Hierarchical roles | 🆕 New | Role inheritance (admin > editor > viewer) |
| Time-bound roles | 🆕 New | Roles with expiration dates |

**Schema additions:**
```sql
-- Role hierarchy
ALTER TABLE roles ADD COLUMN parent_role_id UUID REFERENCES roles(id);

-- Time-bound role assignments
ALTER TABLE users_roles ADD COLUMN valid_from TIMESTAMP WITH TIME ZONE;
ALTER TABLE users_roles ADD COLUMN valid_until TIMESTAMP WITH TIME ZONE;
```

### 4.3 ABAC (Attribute-Based Access Control)

**Purpose:** Fine-grained access control based on document/user attributes.

**Files to modify:**

| Repository | File | Changes |
|------------|------|---------|
| papermerge-auth-server | `auth_server/abac/` | New ABAC module |
| papermerge-auth-server | `auth_server/abac/policy.py` | Policy engine |
| papermerge-auth-server | `auth_server/abac/evaluator.py` | Policy evaluation |
| papermerge-auth-server | `auth_server/db/orm.py` | Add policy tables |
| papermerge-core | `papermerge/core/features/auth/abac.py` | ABAC integration |

**ABAC Policy Schema:**
```python
class Policy(Base):
    __tablename__ = "abac_policies"

    id: Mapped[UUID]
    name: Mapped[str]
    description: Mapped[str | None]
    effect: Mapped[str]  # "allow" | "deny"
    priority: Mapped[int]  # Higher = evaluated first

    # Conditions (JSONB)
    subject_conditions: Mapped[dict]   # user attributes
    resource_conditions: Mapped[dict]  # document attributes
    action_conditions: Mapped[list]    # allowed actions
    context_conditions: Mapped[dict]   # time, IP, etc.
```

**Example policy:**
```json
{
  "name": "HR Documents Access",
  "effect": "allow",
  "subject_conditions": {
    "department": ["hr", "executive"],
    "clearance_level": {"$gte": 3}
  },
  "resource_conditions": {
    "document_type": ["employment_contract", "salary_record", "performance_review"],
    "classification": {"$in": ["confidential", "internal"]}
  },
  "action_conditions": ["view", "download"],
  "context_conditions": {
    "time_range": {"start": "08:00", "end": "18:00"},
    "ip_whitelist": ["10.0.0.0/8", "192.168.0.0/16"]
  }
}
```

### 4.4 ReBAC (Relationship-Based Access Control)

**Purpose:** Access based on relationships between users and resources (like Google Zanzibar).

**Core concepts:**
- **Tuples:** `(user, relation, object)` e.g., `(user:alice, owner, document:123)`
- **Relations:** owner, editor, viewer, parent, member
- **Inheritance:** Permissions flow through relationships

**Database schema:**

```sql
-- Relationship tuples (Zanzibar-style)
CREATE TABLE relation_tuples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Subject (who)
    subject_type VARCHAR(50) NOT NULL,  -- 'user', 'group', 'role'
    subject_id UUID NOT NULL,
    subject_relation VARCHAR(50),        -- For userset rewrite: 'member'

    -- Relation
    relation VARCHAR(50) NOT NULL,       -- 'owner', 'editor', 'viewer', 'parent'

    -- Object (what)
    object_type VARCHAR(50) NOT NULL,    -- 'document', 'folder', 'document_type'
    object_id UUID NOT NULL,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    UNIQUE (subject_type, subject_id, relation, object_type, object_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_tuples_object ON relation_tuples(object_type, object_id);
CREATE INDEX idx_tuples_subject ON relation_tuples(subject_type, subject_id);
CREATE INDEX idx_tuples_relation ON relation_tuples(relation);
```

**Relation definitions (namespace config):**

```yaml
# document namespace
document:
  relations:
    owner:
      union:
        - this  # direct assignment
        - parent.owner  # inherit from parent folder
    editor:
      union:
        - this
        - owner  # owners are also editors
        - parent.editor
    viewer:
      union:
        - this
        - editor  # editors are also viewers
        - parent.viewer

# folder namespace
folder:
  relations:
    owner: [this]
    editor: [this, owner]
    viewer: [this, editor]
    parent: [this]  # parent folder relationship
```

**Example queries:**
```python
# Check if user can view document
can_view = rebac.check(
    subject=("user", user_id),
    relation="viewer",
    object=("document", doc_id)
)

# List all documents user can edit
editable = rebac.list_objects(
    subject=("user", user_id),
    relation="editor",
    object_type="document"
)

# Get all users who can view document
viewers = rebac.list_subjects(
    relation="viewer",
    object=("document", doc_id)
)
```

**Files to create:**

| Repository | File | Purpose |
|------------|------|---------|
| papermerge-auth-server | `auth_server/rebac/` | ReBAC module |
| papermerge-auth-server | `auth_server/rebac/engine.py` | Tuple evaluation engine |
| papermerge-auth-server | `auth_server/rebac/namespace.py` | Namespace/relation definitions |
| papermerge-auth-server | `auth_server/rebac/api.py` | ReBAC API endpoints |
| papermerge-core | `papermerge/core/features/auth/rebac.py` | ReBAC integration |

### 4.5 PBAC (Policy-Based Access Control)

**Purpose:** Centralized, declarative policy management with versioning and audit.

**Policy language:** Use a simplified XACML-like or Rego-like syntax.

**Database schema:**

```sql
-- Policy sets (groups of policies)
CREATE TABLE policy_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    combining_algorithm VARCHAR(50) DEFAULT 'deny-overrides',
    -- deny-overrides, permit-overrides, first-applicable
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual policies
CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_set_id UUID REFERENCES policy_sets(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 0,  -- Higher = evaluated first
    effect VARCHAR(10) NOT NULL,  -- 'allow' or 'deny'

    -- Policy definition (JSONB for flexibility)
    target JSONB,      -- When does this policy apply?
    conditions JSONB,  -- What conditions must be met?
    obligations JSONB, -- What actions to take on match?

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Policy evaluation audit log
CREATE TABLE policy_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID,
    user_id UUID,
    action VARCHAR(100),
    resource_type VARCHAR(100),
    resource_id UUID,
    decision VARCHAR(10),  -- 'allow', 'deny', 'not_applicable'
    matched_policy_id UUID REFERENCES policies(id),
    evaluation_time_ms INTEGER,
    context JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Policy example:**

```json
{
  "name": "Confidential Document Access",
  "effect": "allow",
  "target": {
    "resources": {
      "type": "document",
      "attributes": {
        "classification": "confidential"
      }
    },
    "actions": ["view", "download"]
  },
  "conditions": {
    "all_of": [
      {"subject.clearance_level": {"gte": 3}},
      {"subject.department": {"in": ["legal", "executive", "compliance"]}},
      {"context.ip_address": {"in_cidr": ["10.0.0.0/8"]}},
      {"context.time": {"between": ["08:00", "20:00"]}}
    ]
  },
  "obligations": {
    "on_permit": [
      {"action": "log", "params": {"level": "audit"}},
      {"action": "watermark", "params": {"text": "CONFIDENTIAL - ${subject.name}"}}
    ]
  }
}
```

**Files to create:**

| Repository | File | Purpose |
|------------|------|---------|
| papermerge-auth-server | `auth_server/pbac/` | PBAC module |
| papermerge-auth-server | `auth_server/pbac/engine.py` | Policy evaluation engine |
| papermerge-auth-server | `auth_server/pbac/parser.py` | Policy condition parser |
| papermerge-auth-server | `auth_server/pbac/obligations.py` | Obligation handlers |
| papermerge-core | `papermerge/core/features/policies/` | Policy management UI/API |

### 4.6 Enhanced RBAC with Departments

**Database schema additions:**

```sql
-- Departments table
CREATE TABLE departments (
    id UUID PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    parent_id UUID REFERENCES departments(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User department membership
CREATE TABLE user_departments (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    is_head BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (user_id, department_id)
);

-- Department access rules (spec requirement)
CREATE TABLE department_access_rules (
    id SERIAL PRIMARY KEY,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    document_type_id UUID REFERENCES document_types(id) ON DELETE CASCADE,
    permission_level VARCHAR(20) DEFAULT 'view',  -- view | edit | admin
    UNIQUE (department_id, document_type_id)
);
```

**Files to modify:**

| Repository | File | Changes |
|------------|------|---------|
| papermerge-core | `papermerge/core/features/departments/` | New department module |
| papermerge-core | `papermerge/core/features/auth/department_rbac.py` | Department RBAC logic |
| papermerge-auth-server | `auth_server/db/orm.py` | Add department tables |
| papermerge-auth-server | `auth_server/schema.py` | Add department schemas |

### 4.7 Two-Factor Authentication (2FA)

**Supported methods:**
1. **TOTP** - Time-based One-Time Password (Google Authenticator, Authy)
2. **SMS** - SMS-based OTP (via Twilio/AWS SNS)
3. **Email** - Email-based OTP
4. **Backup codes** - One-time recovery codes

**Database schema:**

```sql
-- User 2FA settings
CREATE TABLE user_mfa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,

    -- TOTP
    totp_enabled BOOLEAN DEFAULT FALSE,
    totp_secret VARCHAR(32),  -- Base32 encoded secret
    totp_confirmed_at TIMESTAMP WITH TIME ZONE,

    -- SMS
    sms_enabled BOOLEAN DEFAULT FALSE,
    phone_number VARCHAR(20),
    phone_verified_at TIMESTAMP WITH TIME ZONE,

    -- Email OTP
    email_otp_enabled BOOLEAN DEFAULT FALSE,

    -- Backup codes
    backup_codes JSONB,  -- Array of hashed codes
    backup_codes_generated_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MFA challenge log
CREATE TABLE mfa_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    method VARCHAR(20),  -- 'totp', 'sms', 'email', 'backup'
    challenge_code VARCHAR(64),  -- Hashed
    expires_at TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Files to create:**

| Repository | File | Purpose |
|------------|------|---------|
| papermerge-auth-server | `auth_server/mfa/` | MFA module |
| papermerge-auth-server | `auth_server/mfa/totp.py` | TOTP implementation |
| papermerge-auth-server | `auth_server/mfa/sms.py` | SMS OTP |
| papermerge-auth-server | `auth_server/mfa/backup.py` | Backup codes |
| papermerge-auth-server | `pyproject.toml` | Add `pyotp`, `qrcode` |

**Dependencies:**
```toml
pyotp = "^2.9"
qrcode = {version = "^8.0", extras = ["pil"]}
twilio = "^9.0"  # Optional for SMS
```

### 4.8 Passkeys (WebAuthn/FIDO2)

**Purpose:** Passwordless authentication using hardware keys or platform authenticators.

**Database schema:**

```sql
-- User passkeys/credentials
CREATE TABLE user_passkeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- WebAuthn credential
    credential_id BYTEA NOT NULL UNIQUE,
    public_key BYTEA NOT NULL,
    sign_count INTEGER DEFAULT 0,

    -- Metadata
    name VARCHAR(255),  -- User-friendly name: "MacBook Pro Touch ID"
    device_type VARCHAR(50),  -- 'platform', 'cross-platform'
    transports JSONB,  -- ['usb', 'nfc', 'ble', 'internal']

    -- Attestation (optional)
    aaguid BYTEA,
    attestation_format VARCHAR(50),

    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE (user_id, credential_id)
);

-- WebAuthn challenges
CREATE TABLE webauthn_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    challenge BYTEA NOT NULL,
    type VARCHAR(20),  -- 'registration', 'authentication'
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Files to create:**

| Repository | File | Purpose |
|------------|------|---------|
| papermerge-auth-server | `auth_server/webauthn/` | WebAuthn module |
| papermerge-auth-server | `auth_server/webauthn/registration.py` | Credential registration |
| papermerge-auth-server | `auth_server/webauthn/authentication.py` | Credential verification |
| papermerge-auth-server | `auth_server/routers/webauthn.py` | WebAuthn API endpoints |

**Dependencies:**
```toml
py-webauthn = "^2.0"
```

**API endpoints:**

```
POST /webauthn/register/begin      # Start passkey registration
POST /webauthn/register/complete   # Complete registration
POST /webauthn/authenticate/begin  # Start authentication
POST /webauthn/authenticate/complete  # Complete authentication
DELETE /webauthn/credentials/{id}  # Remove passkey
GET /webauthn/credentials          # List user's passkeys
```

---

## 5. Scanner Integration

### 5.1 Scanner Control Architecture

**Purpose:** Direct scanner control from the application using industry-standard protocols.

**Supported protocols:**

| Protocol | Platform | Type | Description |
|----------|----------|------|-------------|
| **eSCL/AirScan** | Cross-platform | Driverless | Modern HTTP-based protocol (IPP Everywhere) |
| **SANE** | Linux, macOS | Driver-based | Scanner Access Now Easy |
| **TWAIN** | Windows | Driver-based | Traditional Windows scanning |
| **WIA** | Windows | Driver-based | Windows Image Acquisition |

### 5.2 eSCL/AirScan Integration (Primary)

**Benefits:**
- Driverless - works with modern network scanners
- HTTP-based - easy to implement
- Cross-platform
- Supports auto-discovery via mDNS/Bonjour

**Architecture:**

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend UI   │────▶│  Scanner Service │────▶│  Network Scanner│
│  (React/Mantine)│     │   (FastAPI)      │     │   (eSCL/IPP)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  OCR Worker      │
                        │  (Celery)        │
                        └──────────────────┘
```

**Scanner discovery:**
```python
# mDNS/Bonjour service discovery
from zeroconf import ServiceBrowser, Zeroconf

class ScannerDiscovery:
    SERVICE_TYPES = [
        "_uscan._tcp.local.",      # eSCL scanners
        "_ipp._tcp.local.",         # IPP printers with scan
        "_scanner._tcp.local.",     # Generic scanners
    ]
```

**eSCL API endpoints:**
```
GET  /eSCL/ScannerCapabilities  # Get scanner capabilities (resolutions, formats, etc.)
GET  /eSCL/ScannerStatus        # Get current scanner status
POST /eSCL/ScanJobs             # Start a scan job
GET  /eSCL/ScanJobs/{id}        # Get scan job status
GET  /eSCL/ScanJobs/{id}/NextDocument  # Retrieve scanned image
DELETE /eSCL/ScanJobs/{id}      # Cancel scan job
```

**Scanner capabilities schema:**
```python
class ScannerCapabilities(BaseModel):
    make: str
    model: str
    serial_number: str | None
    uuid: str

    # Input sources
    platen: bool = False           # Flatbed
    adf: bool = False              # Auto Document Feeder
    adf_duplex: bool = False       # Duplex ADF

    # Resolution options (DPI)
    resolutions: list[int]         # [150, 300, 600, 1200]

    # Color modes
    color_modes: list[str]         # ['BlackAndWhite1', 'Grayscale8', 'RGB24']

    # Document formats
    document_formats: list[str]    # ['application/pdf', 'image/jpeg', 'image/png']

    # Size constraints
    min_width: int
    max_width: int
    min_height: int
    max_height: int
```

### 5.3 SANE Integration (Linux/macOS)

**Dependencies:**
```toml
python-sane = "^2.9"  # SANE bindings
```

**Implementation:**
```python
import sane

class SANEScanner:
    def discover(self) -> list[ScannerInfo]:
        sane.init()
        devices = sane.get_devices()
        return [
            ScannerInfo(
                name=dev[0],
                vendor=dev[1],
                model=dev[2],
                type=dev[3]
            )
            for dev in devices
        ]

    def scan(self, device_name: str, options: ScanOptions) -> bytes:
        dev = sane.open(device_name)
        dev.resolution = options.resolution
        dev.mode = options.color_mode
        pil_image = dev.scan()
        return pil_image
```

### 5.4 TWAIN/WIA Integration (Windows)

**Note:** TWAIN and WIA require native Windows components. Implement as a separate Windows service or use browser-based scanning via WebUSB.

**Options:**
1. **Desktop agent** - Electron/Tauri app with TWAIN bindings
2. **WebUSB** - Direct browser access (limited support)
3. **LocalService** - Windows service exposing REST API

**Desktop agent approach:**
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Browser UI    │────▶│  Desktop Agent   │────▶│  TWAIN/WIA      │
│                 │ WS  │  (Electron)      │     │  Driver         │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### 5.5 Scan Workflow

**Database schema:**
```sql
-- Registered scanners
CREATE TABLE scanners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    protocol VARCHAR(20) NOT NULL,  -- 'escl', 'sane', 'twain', 'wia'
    connection_uri VARCHAR(512),    -- e.g., 'http://192.168.1.100:8080/eSCL'
    capabilities JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scan jobs
CREATE TABLE scan_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scanner_id UUID REFERENCES scanners(id),
    user_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',  -- pending, scanning, processing, completed, failed
    options JSONB,  -- resolution, color_mode, duplex, etc.
    pages_scanned INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);
```

**Files to create:**

| Repository | File | Purpose |
|------------|------|---------|
| papermerge-core | `papermerge/core/features/scanners/` | Scanner management |
| papermerge-core | `papermerge/core/scanner/escl.py` | eSCL client |
| papermerge-core | `papermerge/core/scanner/sane.py` | SANE wrapper |
| papermerge-core | `papermerge/core/scanner/discovery.py` | mDNS discovery |
| papermerge-core | `papermerge/core/routers/scanners.py` | Scanner API |
| Frontend | `features/scanner/ScannerPanel.tsx` | Scanner UI |
| Frontend | `features/scanner/ScanPreview.tsx` | Live preview |

**Frontend scanner UI:**
- Scanner discovery and selection
- Live preview (via WebSocket)
- Resolution/color mode selection
- Batch scanning controls
- Direct-to-OCR pipeline

**Dependencies:**
```toml
# papermerge-core pyproject.toml
zeroconf = "^0.132"    # mDNS discovery
httpx = "^0.27"        # eSCL HTTP client
python-sane = "^2.9"   # SANE (Linux/macOS)
```

---

## 6. Metadata Extraction

### 6.1 SpaCy NLP Pipeline

**Purpose:** Extract entities (dates, amounts, names, organizations) from OCR text.

**Files to modify:**

| Repository | File | Changes |
|------------|------|---------|
| papermerge-ocr-worker | `pyproject.toml` | Add `spacy`, models |
| papermerge-ocr-worker | `ocrworker/nlp/` | New NLP module |
| papermerge-ocr-worker | `ocrworker/nlp/extractor.py` | Entity extraction |
| papermerge-ocr-worker | `ocrworker/tasks.py` | Add `extract_metadata_task` |

**Extracted entities:**
- `DATE` → document_date, due_date, effective_date
- `MONEY` → amounts, totals
- `ORG` → vendor_name, client_name
- `PERSON` → signatory, contact
- `GPE` → location, jurisdiction

**Custom patterns for financial documents:**
- Invoice numbers: `INV-\d+`, `#\d{6,}`
- PO numbers: `PO-\d+`, `Purchase Order.*\d+`
- Account numbers: `\d{10,16}`
- Tax IDs: `\d{2}-\d{7}`

---

## 6. Frontend Enhancements

### 6.1 UI Improvements

**Tech stack:** React 19 + Mantine UI v8 + Redux Toolkit + Vite

**New features to add:**

| Feature | Location | Description |
|---------|----------|-------------|
| Department selector | `components/DepartmentPicker/` | Filter documents by department |
| Advanced search | `features/search/AdvancedSearch.tsx` | Multi-field search with filters |
| Semantic search | `features/search/SemanticSearch.tsx` | Natural language queries |
| Audit log viewer | `pages/AuditLog/` | View document access history |
| Permission editor | `pages/Permissions/` | ABAC policy management |
| OCR status dashboard | `pages/Dashboard/OcrStatus.tsx` | Monitor OCR queue |
| Document comparison | `features/document/Compare.tsx` | Side-by-side version comparison |

### 7.2 Security & Access Control Dashboard

**Purpose:** Visual management interface for enterprise access control (100+ employees).

**Components:**

#### 7.2.1 Permission Matrix View
```
┌─────────────────────────────────────────────────────────────────┐
│                    Permission Matrix                             │
├─────────────┬──────────┬──────────┬──────────┬──────────────────┤
│ User/Role   │ Invoices │ Contracts│ HR Docs  │ Financial Reports│
├─────────────┼──────────┼──────────┼──────────┼──────────────────┤
│ HR Dept     │ ○ View   │ ○ View   │ ● Full   │ ○ None           │
│ Legal Dept  │ ○ View   │ ● Full   │ ○ View   │ ○ View           │
│ Finance     │ ● Full   │ ○ View   │ ○ None   │ ● Full           │
│ Executive   │ ● Full   │ ● Full   │ ● Full   │ ● Full           │
└─────────────┴──────────┴──────────┴──────────┴──────────────────┘
```

#### 7.2.2 Access Graph Visualization
Interactive graph showing:
- User → Role → Permission relationships
- Department hierarchies
- Document type access paths
- Policy inheritance chains

**Tech:** React Flow or D3.js force-directed graph

#### 7.2.3 Policy Analyzer
- **What-If Analysis**: "What happens if we remove role X from user Y?"
- **Conflict Detection**: Find overlapping/conflicting policies
- **Coverage Analysis**: Which documents have no access policies?
- **Orphan Detection**: Users with no roles, roles with no permissions

#### 7.2.4 Audit & Compliance Dashboard
```
┌─────────────────────────────────────────────────────────────────┐
│                    Access Audit Dashboard                        │
├──────────────────────┬──────────────────────────────────────────┤
│ Access Requests      │ ████████████░░░░ 2,456 today            │
│ Denied Requests      │ ██░░░░░░░░░░░░░░ 89 (3.6%)              │
│ Policy Changes       │ ███░░░░░░░░░░░░░ 12 this week           │
│ High-Risk Access     │ █░░░░░░░░░░░░░░░ 23 flagged             │
├──────────────────────┴──────────────────────────────────────────┤
│ Recent Activity                                                  │
│ ├─ 10:23 AM - John D. accessed Salary_Report_2024.pdf           │
│ ├─ 10:21 AM - Policy "HR Confidential" modified by Admin        │
│ ├─ 10:18 AM - 3 new users added to Legal Department             │
│ └─ 10:15 AM - Access denied: Bob tried to access Contract_X.pdf │
└─────────────────────────────────────────────────────────────────┘
```

#### 7.2.5 Bulk User/Role Management
- CSV/Excel import for bulk user creation
- Department assignment wizard
- Role cloning with modifications
- Access expiration scheduling
- Temporary access grants

**Files to create:**

| Location | Purpose |
|----------|---------|
| `features/security/PermissionMatrix.tsx` | Editable permission grid |
| `features/security/AccessGraph.tsx` | Interactive relationship graph |
| `features/security/PolicyAnalyzer.tsx` | What-if analysis tool |
| `features/security/AuditDashboard.tsx` | Access monitoring |
| `features/security/BulkManagement.tsx` | Bulk user operations |
| `features/security/SecurityOverview.tsx` | Main security dashboard |

**API endpoints:**

| Endpoint | Purpose |
|----------|---------|
| `GET /api/security/matrix` | Permission matrix data |
| `GET /api/security/graph` | Access relationship graph |
| `POST /api/security/analyze` | What-if analysis |
| `GET /api/security/audit` | Audit log with filters |
| `GET /api/security/stats` | Security statistics |
| `POST /api/security/bulk/users` | Bulk user import |
| `POST /api/security/bulk/roles` | Bulk role assignment |

**Database views for performance:**

```sql
-- Materialized view for permission matrix
CREATE MATERIALIZED VIEW permission_matrix AS
SELECT
    u.id AS user_id,
    u.username,
    d.id AS department_id,
    d.name AS department_name,
    dt.id AS document_type_id,
    dt.name AS document_type_name,
    COALESCE(dar.permission_level, 'none') AS permission_level
FROM users u
CROSS JOIN document_types dt
LEFT JOIN user_departments ud ON u.id = ud.user_id
LEFT JOIN departments d ON ud.department_id = d.id
LEFT JOIN department_access_rules dar ON d.id = dar.department_id
    AND dt.id = dar.document_type_id;

-- Index for fast filtering
CREATE INDEX idx_perm_matrix_user ON permission_matrix(user_id);
CREATE INDEX idx_perm_matrix_dept ON permission_matrix(department_id);

-- Refresh periodically or on permission changes
REFRESH MATERIALIZED VIEW CONCURRENTLY permission_matrix;
```

### 7.3 Visual Workflow Designer

**Purpose:** Drag-and-drop designer for document ingestion pipelines.

**Tech stack:**
- **React Flow** - Node-based workflow editor
- **Mantine** - UI components
- **Redux** - State management

**Workflow nodes:**

| Node Type | Description | Config Options |
|-----------|-------------|----------------|
| **Source** | Input source | Watch folder, Email, API upload, Scanner |
| **Preprocess** | Image cleanup | Deskew, Denoise, Binarize, Rotate |
| **OCR** | Text extraction | Engine (PaddleOCR/Tesseract/Qwen-VL), Language |
| **NLP** | Entity extraction | SpaCy model, Custom patterns |
| **Classify** | Document type | ML model, Rules-based, VLM |
| **Validate** | Quality check | OCR confidence, Required fields |
| **Route** | Conditional branch | Document type, Metadata values |
| **Store** | Save to storage | S3 bucket, Storage class |
| **Index** | Add to search | Search backend, Embeddings |
| **Notify** | Send notification | Email, Webhook, Slack |
| **Transform** | Modify document | Watermark, Merge, Split |

**Workflow definition schema:**

```json
{
  "id": "uuid",
  "name": "Invoice Processing",
  "nodes": [
    {
      "id": "source-1",
      "type": "source",
      "config": {
        "source_type": "watch_folder",
        "path": "/incoming/invoices"
      },
      "position": {"x": 100, "y": 100}
    },
    {
      "id": "ocr-1",
      "type": "ocr",
      "config": {
        "engine": "paddleocr",
        "language": "en"
      },
      "position": {"x": 300, "y": 100}
    }
  ],
  "edges": [
    {"source": "source-1", "target": "ocr-1"}
  ]
}
```

**Files to create:**

| Location | File | Purpose |
|----------|------|---------|
| `frontend/apps/ui/src/features/workflows/` | - | Workflow designer feature |
| `features/workflows/Designer.tsx` | - | Main designer component |
| `features/workflows/nodes/` | - | Custom node components |
| `features/workflows/edges/` | - | Custom edge components |
| `features/workflows/store/` | - | Workflow Redux slice |
| `papermerge-core/papermerge/core/features/workflows/` | - | Backend workflow execution |

**Dependencies to add:**
```json
{
  "@xyflow/react": "^12.0",
  "dagre": "^0.8"  // For auto-layout
}
```

### 6.3 Theme Enhancements

**Files to modify:**
- `frontend/apps/ui/src/themes/` - Add custom theme variants
- `frontend/apps/ui/src/_mantine.scss` - Custom Mantine overrides

---

## 7. Docker Deployment

### 7.1 Docker Compose Configuration

**File:** `docker-compose.yml`

```yaml
services:
  # Core Services
  core:
    build: ./papermerge-core
    depends_on: [db, redis]
    environment:
      - PM_DB_URL=postgresql://...
      - PM_REDIS_URL=redis://redis:6379
      - SEARCH_BACKEND=postgres

  auth:
    build: ./papermerge-auth-server
    depends_on: [db]

  # Workers
  ocr-worker:
    build: ./papermerge-ocr-worker
    depends_on: [db, redis, ollama]
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: [gpu]  # For PaddleOCR GPU

  s3-worker:
    build: ./papermerge-s3-worker
    depends_on: [db, redis]

  # Infrastructure
  db:
    image: pgvector/pgvector:pg16
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

  ollama:
    image: ollama/ollama
    volumes:
      - ollama_models:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: [gpu]

  # Search (optional)
  elasticsearch:
    image: elasticsearch:8.11.0
    profiles: [elasticsearch]

  meilisearch:
    image: getmeili/meilisearch:v1.6
    profiles: [meilisearch]

volumes:
  pgdata:
  ollama_models:
```

---

## 8. Multi-Tenancy & Deployment Models

### 8.1 Deployment Modes

| Mode | Use Case | Isolation | Customization |
|------|----------|-----------|---------------|
| **Single-tenant on-prem** | Enterprise self-hosted | Full | Complete |
| **Single-tenant SaaS** | Dedicated cloud instance | Full | High |
| **Multi-tenant SaaS** | Shared infrastructure | Schema-level | Standard |

### 8.2 Schema-per-Tenant Architecture

```sql
-- Public schema: tenant registry
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(63) UNIQUE NOT NULL,  -- Schema name
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    plan VARCHAR(50) DEFAULT 'free',
    status VARCHAR(20) DEFAULT 'active',
    max_users INTEGER,
    max_storage_gb INTEGER,
    features JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Each tenant gets their own schema with full table set
-- CREATE SCHEMA tenant_acme;
-- All tables (documents, users, roles, etc.) created in tenant schema
```

### 8.3 Tenant Feature Flags

```python
class TenantFeatures(BaseModel):
    ocr_engine: str = "paddleocr"
    vlm_enabled: bool = False
    semantic_search: bool = False
    mfa_required: bool = False
    sso_enabled: bool = False
    max_document_size_mb: int = 50
```

### 8.4 On-Premises Mode

```yaml
# Single-tenant mode for on-prem
environment:
  - DEPLOYMENT_MODE=single_tenant
  - ENABLE_ALL_FEATURES=true
  - DISABLE_LICENSE_CHECK=true
```

---

## 9. Document Scan Quality Assurance

### 9.1 Quality Metrics

| Metric | Description | Threshold |
|--------|-------------|-----------|
| **Resolution** | DPI of scanned image | >= 300 DPI |
| **Skew Angle** | Page rotation deviation | <= 2 degrees |
| **Brightness** | Image brightness level | 40-60% |
| **Contrast** | Image contrast ratio | >= 50% |
| **Noise Level** | Image noise detection | <= 10% |
| **Blur Detection** | Focus quality | Laplacian variance >= 100 |
| **OCR Confidence** | Average character confidence | >= 85% |
| **Text Density** | Characters per page | >= 100 |

### 9.2 Quality Assessment Pipeline

```python
class DocumentQualityAssessment(BaseModel):
    document_id: UUID
    page_number: int

    # Image quality
    resolution_dpi: int
    skew_angle: float
    brightness: float
    contrast: float
    noise_level: float
    blur_score: float

    # OCR quality
    ocr_confidence: float
    character_count: int
    word_count: int

    # Overall
    quality_score: float  # 0-100
    issues: list[str]  # ["low_resolution", "high_skew", "blurry"]
    recommendation: str  # "accept", "review", "rescan"
```

### 9.3 Quality Rules Engine

```sql
CREATE TABLE quality_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    document_type_id UUID REFERENCES document_types(id),  -- Optional, per doc type
    metric VARCHAR(50) NOT NULL,  -- resolution, skew, ocr_confidence
    operator VARCHAR(10) NOT NULL,  -- gte, lte, eq, between
    threshold JSONB NOT NULL,  -- {"value": 300} or {"min": 85, "max": 100}
    severity VARCHAR(20) DEFAULT 'warning',  -- info, warning, error, critical
    action VARCHAR(20) DEFAULT 'flag',  -- flag, review, reject, rescan
    is_active BOOLEAN DEFAULT TRUE
);
```

### 9.4 Quality Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                   Scan Quality Dashboard                         │
├──────────────────────┬──────────────────────────────────────────┤
│ Documents Scanned    │ 12,456 today                            │
│ Average Quality      │ ██████████░░ 87%                        │
│ Needs Review         │ ███░░░░░░░░░ 234 (1.8%)                 │
│ Rejected             │ █░░░░░░░░░░░ 45 (0.3%)                  │
├──────────────────────┴──────────────────────────────────────────┤
│ Common Issues (Last 7 Days)                                      │
│ ├─ Low OCR Confidence: 456 documents                            │
│ ├─ High Skew: 234 documents                                     │
│ ├─ Blur Detected: 189 documents                                 │
│ └─ Low Resolution: 78 documents                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Document Provenance & Batch Tracking

### 10.1 Provenance Model

Track complete document lifecycle from physical source to digital archive.

```sql
-- Physical source locations (filing cabinets, boxes, rooms)
CREATE TABLE source_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50),  -- room, cabinet, box, folder, shelf
    parent_id UUID REFERENCES source_locations(id),
    description TEXT,
    metadata JSONB,  -- floor, building, address
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scanning batches (group of documents scanned together)
CREATE TABLE scan_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number VARCHAR(50) UNIQUE NOT NULL,  -- e.g., "BATCH-2026-01-18-001"

    -- Source tracking
    source_location_id UUID REFERENCES source_locations(id),
    source_description TEXT,  -- "Box 42, HR Records 2020-2021"

    -- Scanning details
    scanner_id UUID REFERENCES scanners(id),
    scanned_by UUID REFERENCES users(id),
    scan_started_at TIMESTAMP WITH TIME ZONE,
    scan_completed_at TIMESTAMP WITH TIME ZONE,

    -- Statistics
    total_pages INTEGER DEFAULT 0,
    total_documents INTEGER DEFAULT 0,
    successful_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    review_count INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    -- pending, scanning, processing, review, completed, archived

    -- Post-scan tracking
    source_disposition VARCHAR(50),  -- returned, destroyed, archived, transferred
    disposition_date TIMESTAMP WITH TIME ZONE,
    disposition_notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual document provenance
CREATE TABLE document_provenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE UNIQUE,

    -- Batch info
    batch_id UUID REFERENCES scan_batches(id),
    sequence_in_batch INTEGER,  -- Order within batch

    -- Original physical document
    original_filename VARCHAR(512),
    original_file_path VARCHAR(1024),  -- Path on scanner/ingestion system
    original_file_hash VARCHAR(64),  -- SHA-256 of source file

    -- Physical source
    source_location_id UUID REFERENCES source_locations(id),
    physical_location_detail TEXT,  -- "Folder 3, Page 45-48"
    original_document_date DATE,  -- Date on the physical document

    -- Chain of custody
    received_from VARCHAR(255),  -- Who provided the document
    received_date DATE,
    handling_notes TEXT,

    -- Storage location (after scanning)
    archived_location_id UUID REFERENCES source_locations(id),
    archived_at TIMESTAMP WITH TIME ZONE,
    archived_by UUID REFERENCES users(id),

    -- Digital storage
    s3_key_original VARCHAR(1024),
    s3_key_processed VARCHAR(1024),
    storage_class VARCHAR(50),  -- STANDARD, DEEP_ARCHIVE, etc.

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Provenance events (audit trail)
CREATE TABLE provenance_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES scan_batches(id),

    event_type VARCHAR(50) NOT NULL,
    -- received, scanned, processed, reviewed, approved, rejected,
    -- moved, archived, retrieved, destroyed, transferred

    actor_id UUID REFERENCES users(id),
    location_id UUID REFERENCES source_locations(id),

    details JSONB,  -- Event-specific metadata
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 10.2 Batch Management Workflow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Create    │────▶│   Scanning  │────▶│  Processing │────▶│   Review    │
│   Batch     │     │             │     │  (OCR/NLP)  │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘
                                                                    │
     ┌──────────────────────────────────────────────────────────────┘
     ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Approved   │────▶│   Archive   │────▶│  Disposition│
│             │     │  Original   │     │  (Destroy/  │
└─────────────┘     └─────────────┘     │   Store)    │
                                        └─────────────┘
```

### 10.3 Batch Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│                    Batch Management                              │
├─────────────────────────────────────────────────────────────────┤
│ Active Batches                                                   │
│ ┌───────────────────┬────────┬────────┬────────┬───────────────┐│
│ │ Batch ID          │ Status │ Docs   │ Pages  │ Progress      ││
│ ├───────────────────┼────────┼────────┼────────┼───────────────┤│
│ │ BATCH-2026-01-18-1│ Scanning│ 45    │ 892    │ ████░░░░ 42% ││
│ │ BATCH-2026-01-17-3│ Review │ 234   │ 4,521  │ ██████░░ 78% ││
│ │ BATCH-2026-01-17-2│ Complete│ 567   │ 12,456 │ ████████ 100%││
│ └───────────────────┴────────┴────────┴────────┴───────────────┘│
├─────────────────────────────────────────────────────────────────┤
│ Statistics (January 2026)                                        │
│ ├─ Total Batches: 156                                           │
│ ├─ Documents Processed: 45,678                                  │
│ ├─ Pages Scanned: 1,234,567                                     │
│ ├─ Average Quality Score: 91%                                   │
│ └─ Physical Documents Archived: 42,345                          │
└─────────────────────────────────────────────────────────────────┘
```

### 10.4 Document Marking & Physical Inventory

**Purpose:** Track physical documents through machine-readable codes to prevent loss, missed scans, and duplicates.

#### Encoding Strategy

| Encoding | Use Case | Minimum Size | Capacity |
|----------|----------|--------------|----------|
| **Data Matrix (Primary)** | Box/folder labels, separator sheets | 2.5mm x 2.5mm | 2,335 chars |
| **QR Code (Fallback)** | Complex metadata, legacy compatibility | 10mm x 10mm | 4,296 chars |

**Why Data Matrix:**
- Smallest footprint (fits on tiny labels)
- Industrial-grade ECC 200 error correction
- Hardware-decoded by document scanners
- Clean, professional appearance on separator sheets

#### 10.4.1 Hierarchical Labeling Strategy

**Labeling levels (choose based on operation scale):**

| Level | When to Use | QR Applied To | Tracking Granularity |
|-------|-------------|---------------|---------------------|
| **Box** | 10K+ docs, bulk archive | Each storage box | Box → estimated doc count |
| **Folder** | 1K-10K docs, organized files | Each folder/binder | Folder → document ranges |
| **Document** | <1K docs, high-value items | Individual documents | Exact document tracking |
| **Separator Sheet** | Mixed batches | Inserted separator pages | Batch boundaries |

**Recommended approach for millions of documents:**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Box-Level Tracking                                │
├─────────────────────────────────────────────────────────────────────┤
│ BOX-2024-FIN-042                                                    │
│ ├─ QR Code on box exterior                                          │
│ ├─ Contains: ~500 documents (invoices 2024 Q3)                     │
│ ├─ Folders: 12 (labeled Folder 1-12)                               │
│ └─ When scanning: Select box → Scan all contents → Auto-sequence   │
├─────────────────────────────────────────────────────────────────────┤
│ Folder-Level (optional additional detail)                           │
│ ├─ Folder 1: Vendor A invoices (docs 1-45)                         │
│ ├─ Folder 2: Vendor B invoices (docs 46-89)                        │
│ └─ ...                                                              │
└─────────────────────────────────────────────────────────────────────┘
```

**Separator sheet approach (for ADF batch scanning):**

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ Separator   │   │ Document 1  │   │ Document 2  │   │ Separator   │
│ (QR: BOX-42 │   │ (auto-      │   │ (auto-      │   │ (QR: BOX-43 │
│  Folder-1)  │   │  assigned)  │   │  assigned)  │   │  Folder-1)  │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
     ↓                                                      ↓
  Batch start                                           Batch end
  detected                                              detected
```

#### 10.4.2 QR Code Workflow (Hierarchical)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ 1. Register     │────▶│ 2. Print QR     │────▶│ 3. Apply to     │
│    Container    │     │    Labels       │     │    Box/Folder   │
│  (Box/Folder)   │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ 4. Start Scan   │────▶│ 5. Scan Contents│────▶│ 6. Auto-assign  │
│    Session      │     │    (batch)      │     │    to Container │
│  (scan QR/enter │     │                 │     │                 │
│   container ID) │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ 7. Verify Count │────▶│ 8. Archive      │
│    & Quality    │     │    Container    │
└─────────────────┘     └─────────────────┘
```

#### 10.4.2 Physical Document Inventory

```sql
-- Physical document inventory (pre-registration before scanning)
CREATE TABLE physical_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_code VARCHAR(50) UNIQUE NOT NULL,  -- "INV-2026-000001"
    qr_code VARCHAR(100) UNIQUE NOT NULL,  -- Encoded QR data

    -- Pre-registration metadata
    description TEXT,
    document_type_id UUID REFERENCES document_types(id),
    estimated_pages INTEGER,
    date_range_start DATE,
    date_range_end DATE,

    -- Source location
    source_location_id UUID REFERENCES source_locations(id),
    box_number VARCHAR(50),
    folder_number VARCHAR(50),
    position_in_folder INTEGER,

    -- Physical characteristics
    condition VARCHAR(50),  -- good, fair, poor, fragile
    special_handling TEXT,  -- "handle with care", "do not bend"

    -- Status tracking
    status VARCHAR(20) DEFAULT 'registered',
    -- registered, labeled, queued, scanning, scanned, verified, archived, missing

    -- Timestamps
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    registered_by UUID REFERENCES users(id),
    labeled_at TIMESTAMP WITH TIME ZONE,
    scanned_at TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE,

    -- Linked digital document (after scanning)
    document_id UUID REFERENCES documents(id),

    -- Current physical location
    current_location_id UUID REFERENCES source_locations(id),
    last_location_update TIMESTAMP WITH TIME ZONE
);

-- QR label print jobs
CREATE TABLE qr_print_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number VARCHAR(50) UNIQUE NOT NULL,
    label_type VARCHAR(50),  -- sheet, roll, separator
    label_size VARCHAR(20),  -- 2x1, 3x2, 4x6 inches

    -- Items to print
    inventory_ids UUID[],
    count INTEGER,

    -- Status
    status VARCHAR(20) DEFAULT 'pending',  -- pending, printing, completed, failed
    printed_at TIMESTAMP WITH TIME ZONE,
    printed_by UUID REFERENCES users(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory movements/audits
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID REFERENCES physical_inventory(id) ON DELETE CASCADE,

    movement_type VARCHAR(50) NOT NULL,
    -- checked_out, checked_in, moved, scanned, verified, audit, missing_reported, found

    from_location_id UUID REFERENCES source_locations(id),
    to_location_id UUID REFERENCES source_locations(id),

    actor_id UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Duplicate detection log
CREATE TABLE duplicate_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID REFERENCES physical_inventory(id),
    document_id UUID REFERENCES documents(id),

    detection_type VARCHAR(50),  -- qr_rescan, content_match, hash_match
    confidence FLOAT,
    original_document_id UUID REFERENCES documents(id),

    resolution VARCHAR(50),  -- ignored, merged, deleted, kept_both
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 10.4.3 Code Encoding Schema

**Data Matrix (compact format for labels):**
```python
class DataMatrixCode(BaseModel):
    """Compact encoding for Data Matrix (max ~50 chars recommended)"""
    prefix: str = "DA"  # dArchiva identifier
    version: int = 1
    type: str  # B=box, F=folder, D=document, S=separator
    id: str  # Short code: "B042" or "F003"
    check: str  # 2-char checksum

# Example: "DA1B042F3A7"  (11 chars)
# DA = dArchiva
# 1 = version
# B = box
# 042 = box number
# F3 = folder 3
# A7 = checksum
```

**QR Code (extended format for complex metadata):**
```python
class QRCodeData(BaseModel):
    """Extended encoding for QR code fallback"""
    version: int = 1
    type: str  # box, folder, document, separator
    id: str  # Full inventory code: "INV-2026-000001"
    org: str  # Tenant/organization code
    meta: dict | None  # Optional metadata
    checksum: str  # First 8 chars of SHA-256

# Example: "DA:1:box:BOX-2024-FIN-042:ACME:a1b2c3d4"
```

**Encoding selection logic:**
```python
def select_encoding(content_length: int, has_metadata: bool) -> str:
    if content_length <= 50 and not has_metadata:
        return "datamatrix"  # Compact, fits small labels
    else:
        return "qrcode"  # Extended capacity needed
```

#### 10.4.4 Duplicate Prevention

```python
class DuplicateDetector:
    """Prevent duplicate scans at multiple levels"""

    async def check_qr_duplicate(self, qr_code: str) -> DuplicateResult:
        """Check if QR code was already scanned"""
        existing = await db.query(PhysicalInventory).filter(
            qr_code=qr_code,
            status__in=['scanned', 'verified', 'archived']
        ).first()

        if existing:
            return DuplicateResult(
                is_duplicate=True,
                type="qr_rescan",
                original_document_id=existing.document_id,
                message=f"Document already scanned on {existing.scanned_at}"
            )

    async def check_content_duplicate(self, file_hash: str) -> DuplicateResult:
        """Check if identical file content exists"""
        existing = await db.query(DocumentVersion).filter(
            checksum=file_hash
        ).first()

        if existing:
            return DuplicateResult(
                is_duplicate=True,
                type="content_match",
                original_document_id=existing.document_id,
                confidence=1.0
            )

    async def check_visual_duplicate(self, image: bytes) -> DuplicateResult:
        """Check for visually similar documents using perceptual hash"""
        phash = compute_perceptual_hash(image)

        # Search for similar hashes in pgvector
        similar = await db.execute("""
            SELECT document_id, 1 - (phash <-> :phash) as similarity
            FROM document_hashes
            WHERE phash <-> :phash < 0.1
            ORDER BY phash <-> :phash
            LIMIT 5
        """, {"phash": phash})

        if similar and similar[0].similarity > 0.95:
            return DuplicateResult(
                is_duplicate=True,
                type="visual_match",
                original_document_id=similar[0].document_id,
                confidence=similar[0].similarity
            )
```

#### 10.4.5 Scanning Station Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Scanning Station UI                           │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Scan QR Code] or [Enter Inventory Code: _____________]     │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ Document: INV-2026-000142                                        │
│ ├─ Description: Q3 2024 Vendor Invoices                         │
│ ├─ Expected Pages: 45                                           │
│ ├─ Source: Box 42, Folder 3, Finance Storage Room               │
│ └─ Status: ✅ Ready to Scan                                     │
├─────────────────────────────────────────────────────────────────┤
│ Scan Progress                                                    │
│ ├─ Pages Scanned: 42/45                                         │
│ ├─ Quality Score: 94%                                           │
│ └─ Estimated Time: 2 minutes                                    │
├─────────────────────────────────────────────────────────────────┤
│ [⏸ Pause] [⏹ Stop] [✅ Complete Batch] [🔄 Rescan Page]        │
└─────────────────────────────────────────────────────────────────┘
```

#### 10.4.6 Missing Document Detection

```sql
-- View for detecting potentially missing documents
CREATE VIEW missing_documents AS
SELECT
    pi.id,
    pi.inventory_code,
    pi.description,
    pi.status,
    pi.registered_at,
    sl.name AS source_location,
    CASE
        WHEN pi.status = 'registered' AND pi.registered_at < NOW() - INTERVAL '7 days'
        THEN 'overdue_for_labeling'
        WHEN pi.status = 'labeled' AND pi.labeled_at < NOW() - INTERVAL '14 days'
        THEN 'overdue_for_scanning'
        WHEN pi.status = 'queued' AND pi.registered_at < NOW() - INTERVAL '30 days'
        THEN 'stuck_in_queue'
        ELSE 'on_track'
    END AS warning_status
FROM physical_inventory pi
LEFT JOIN source_locations sl ON pi.source_location_id = sl.id
WHERE pi.status NOT IN ('scanned', 'verified', 'archived');

-- Alert for missing documents
CREATE TABLE missing_document_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID REFERENCES physical_inventory(id),
    alert_type VARCHAR(50),  -- overdue, discrepancy, not_found
    severity VARCHAR(20),  -- info, warning, critical
    message TEXT,
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 10.4.7 Inventory Reconciliation

```python
class InventoryReconciliation:
    """Periodic checks to ensure no documents are lost"""

    async def run_reconciliation(self, location_id: UUID) -> ReconciliationReport:
        # 1. Get all registered documents for location
        registered = await get_registered_docs(location_id)

        # 2. Get all scanned documents
        scanned = await get_scanned_docs(location_id)

        # 3. Find discrepancies
        missing = registered - scanned  # Registered but not scanned
        orphaned = scanned - registered  # Scanned but not registered
        duplicates = find_duplicate_scans(scanned)

        return ReconciliationReport(
            location_id=location_id,
            total_registered=len(registered),
            total_scanned=len(scanned),
            missing_count=len(missing),
            missing_documents=list(missing),
            orphaned_count=len(orphaned),
            orphaned_documents=list(orphaned),
            duplicate_count=len(duplicates),
            duplicates=duplicates,
            completion_rate=len(scanned) / len(registered) * 100
        )
```

### 10.5 Files to Create

| Repository | File | Purpose |
|------------|------|---------|
| papermerge-core | `papermerge/core/features/provenance/` | Provenance tracking |
| papermerge-core | `papermerge/core/features/batches/` | Batch management |
| papermerge-core | `papermerge/core/features/locations/` | Source location management |
| papermerge-core | `papermerge/core/features/quality/` | Quality assessment |
| papermerge-core | `papermerge/core/features/inventory/` | Physical inventory management |
| papermerge-core | `papermerge/core/features/inventory/qr.py` | QR code generation |
| papermerge-core | `papermerge/core/features/inventory/duplicates.py` | Duplicate detection |
| papermerge-core | `papermerge/core/features/inventory/reconciliation.py` | Inventory reconciliation |
| Frontend | `features/batches/BatchDashboard.tsx` | Batch management UI |
| Frontend | `features/batches/BatchWizard.tsx` | Batch creation wizard |
| Frontend | `features/quality/QualityDashboard.tsx` | Quality metrics UI |
| Frontend | `features/provenance/DocumentHistory.tsx` | Provenance timeline |
| Frontend | `features/inventory/InventoryManager.tsx` | Physical inventory UI |
| Frontend | `features/inventory/QRPrintDialog.tsx` | QR label printing |
| Frontend | `features/inventory/ScanningStation.tsx` | Scanning workflow UI |
| Frontend | `features/inventory/ReconciliationReport.tsx` | Discrepancy reports |

**Dependencies:**
```toml
# papermerge-core pyproject.toml
pylibdmtx = "^0.1"  # Data Matrix encoding/decoding (primary)
qrcode = {version = "^8.0", extras = ["pil"]}  # QR fallback
imagehash = "^4.3"  # Perceptual hashing for duplicate detection
reportlab = "^4.0"  # PDF label generation
```

---

## 11. Resource Usage, Billing & Cost Management

### 11.1 Cost Tracking Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cost Management System                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Usage        │  │ Cloud API    │  │ Cost         │          │
│  │ Collectors   │  │ Integration  │  │ Calculator   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         └────────────┬────┴────────────────┘                   │
│                      ▼                                          │
│              ┌───────────────┐                                  │
│              │ Usage Store   │                                  │
│              │ (PostgreSQL)  │                                  │
│              └───────┬───────┘                                  │
│                      │                                          │
│         ┌────────────┼────────────┐                            │
│         ▼            ▼            ▼                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                       │
│  │Dashboard │ │ Alerts   │ │ Billing  │                       │
│  │ & Reports│ │ & Limits │ │ Export   │                       │
│  └──────────┘ └──────────┘ └──────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

### 11.2 Resource Metrics to Track

| Category | Metrics | Source |
|----------|---------|--------|
| **Storage** | Bytes stored, objects count, storage class | S3/Linode API |
| **Bandwidth** | Data transfer in/out, CDN usage | Cloud provider API |
| **Compute** | OCR pages processed, API calls, worker hours | Application |
| **Database** | Storage size, connections, query count | PostgreSQL |
| **Search** | Index size, queries/month, documents indexed | Search backend |

### 11.3 Database Schema

```sql
-- Cloud provider configurations
CREATE TABLE cloud_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,  -- 'aws', 'linode', 'cloudflare'
    provider_type VARCHAR(50) NOT NULL,  -- 'storage', 'compute', 'cdn'
    credentials_encrypted BYTEA,  -- Encrypted API keys
    config JSONB,  -- Region, endpoints, etc.
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pricing tiers (updated periodically)
CREATE TABLE pricing_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES cloud_providers(id),
    service VARCHAR(100) NOT NULL,  -- 's3_standard', 's3_glacier', 'linode_object'
    region VARCHAR(50),

    -- Pricing components
    storage_per_gb_month DECIMAL(10, 6),  -- $/GB/month
    transfer_out_per_gb DECIMAL(10, 6),   -- $/GB
    transfer_in_per_gb DECIMAL(10, 6),    -- Usually free
    requests_per_1k DECIMAL(10, 6),       -- $/1000 requests

    -- Tier thresholds
    tier_name VARCHAR(50),  -- 'first_50tb', 'next_450tb', etc.
    min_gb DECIMAL(15, 2),
    max_gb DECIMAL(15, 2),

    effective_from DATE NOT NULL,
    effective_to DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily usage snapshots
CREATE TABLE usage_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    date DATE NOT NULL,

    -- Storage metrics
    storage_bytes_total BIGINT DEFAULT 0,
    storage_bytes_standard BIGINT DEFAULT 0,
    storage_bytes_archive BIGINT DEFAULT 0,
    object_count BIGINT DEFAULT 0,

    -- Transfer metrics
    transfer_in_bytes BIGINT DEFAULT 0,
    transfer_out_bytes BIGINT DEFAULT 0,

    -- Request metrics
    api_requests_read BIGINT DEFAULT 0,
    api_requests_write BIGINT DEFAULT 0,

    -- Application metrics
    documents_uploaded INTEGER DEFAULT 0,
    pages_ocr_processed INTEGER DEFAULT 0,
    search_queries INTEGER DEFAULT 0,

    -- Computed costs (in cents)
    cost_storage_cents INTEGER DEFAULT 0,
    cost_transfer_cents INTEGER DEFAULT 0,
    cost_requests_cents INTEGER DEFAULT 0,
    cost_ocr_cents INTEGER DEFAULT 0,
    cost_total_cents INTEGER DEFAULT 0,

    UNIQUE (tenant_id, date)
);

-- Real-time usage counters (for current period)
CREATE TABLE usage_current (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) UNIQUE,
    period_start DATE NOT NULL,

    -- Running totals (reset monthly)
    storage_bytes BIGINT DEFAULT 0,
    transfer_out_bytes BIGINT DEFAULT 0,
    api_requests BIGINT DEFAULT 0,
    pages_ocr INTEGER DEFAULT 0,

    -- Limits
    storage_limit_bytes BIGINT,
    transfer_limit_bytes BIGINT,
    ocr_pages_limit INTEGER,

    -- Alerts
    storage_alert_threshold FLOAT DEFAULT 0.8,  -- 80%
    transfer_alert_threshold FLOAT DEFAULT 0.8,
    last_alert_sent_at TIMESTAMP WITH TIME ZONE,

    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage alerts history
CREATE TABLE usage_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    alert_type VARCHAR(50) NOT NULL,  -- storage_80, storage_100, transfer_80, etc.
    threshold_value DECIMAL(15, 2),
    current_value DECIMAL(15, 2),
    message TEXT,
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly invoices (for SaaS billing)
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Line items stored as JSONB
    line_items JSONB NOT NULL,
    /*
    [
        {"description": "Storage (245 GB)", "amount_cents": 612},
        {"description": "Data Transfer (12 GB)", "amount_cents": 108},
        {"description": "OCR Processing (5,234 pages)", "amount_cents": 523},
        {"description": "Base Plan (Professional)", "amount_cents": 4900}
    ]
    */

    subtotal_cents INTEGER NOT NULL,
    tax_cents INTEGER DEFAULT 0,
    total_cents INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    status VARCHAR(20) DEFAULT 'draft',  -- draft, sent, paid, overdue, void
    due_date DATE,
    paid_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 11.4 Cloud Provider Integration

#### AWS S3 Cost Retrieval

```python
class AWSS3CostCollector:
    """Collect S3 usage and costs from AWS"""

    async def get_storage_metrics(self, bucket: str) -> StorageMetrics:
        # Use CloudWatch for storage metrics
        cloudwatch = boto3.client('cloudwatch')

        response = cloudwatch.get_metric_statistics(
            Namespace='AWS/S3',
            MetricName='BucketSizeBytes',
            Dimensions=[
                {'Name': 'BucketName', 'Value': bucket},
                {'Name': 'StorageType', 'Value': 'StandardStorage'}
            ],
            StartTime=datetime.now() - timedelta(days=1),
            EndTime=datetime.now(),
            Period=86400,
            Statistics=['Average']
        )
        return StorageMetrics(
            bytes_total=response['Datapoints'][0]['Average'],
            storage_class='STANDARD'
        )

    async def get_cost_and_usage(self, start: date, end: date) -> CostReport:
        # Use Cost Explorer API
        ce = boto3.client('ce')

        response = ce.get_cost_and_usage(
            TimePeriod={'Start': str(start), 'End': str(end)},
            Granularity='DAILY',
            Metrics=['UnblendedCost', 'UsageQuantity'],
            Filter={
                'Dimensions': {
                    'Key': 'SERVICE',
                    'Values': ['Amazon Simple Storage Service']
                }
            },
            GroupBy=[
                {'Type': 'DIMENSION', 'Key': 'USAGE_TYPE'}
            ]
        )
        return self._parse_cost_response(response)
```

#### Linode Object Storage

```python
class LinodeCostCollector:
    """Collect Linode Object Storage usage"""

    async def get_bucket_usage(self, cluster: str, bucket: str) -> BucketUsage:
        # Linode API for bucket stats
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.linode.com/v4/object-storage/buckets/{cluster}/{bucket}",
                headers={"Authorization": f"Bearer {self.api_token}"}
            )
            data = response.json()

            return BucketUsage(
                size_bytes=data['size'],
                objects=data['objects'],
                cluster=cluster
            )

    async def get_transfer_usage(self) -> TransferUsage:
        # Linode network transfer pool
        response = await client.get(
            "https://api.linode.com/v4/account/transfer",
            headers={"Authorization": f"Bearer {self.api_token}"}
        )
        data = response.json()

        return TransferUsage(
            used_bytes=data['used'],
            quota_bytes=data['quota'],
            billable_bytes=data['billable']
        )
```

### 11.5 Cost Calculator

```python
class CostCalculator:
    """Calculate costs based on usage and pricing tiers"""

    # Default pricing (can be overridden from pricing_tiers table)
    PRICING = {
        's3_standard': {
            'storage_per_gb': 0.023,      # $/GB/month
            'transfer_out_per_gb': 0.09,  # $/GB
            'requests_get_per_1k': 0.0004,
            'requests_put_per_1k': 0.005,
        },
        's3_glacier': {
            'storage_per_gb': 0.004,
            'retrieval_per_gb': 0.03,
        },
        'linode_object': {
            'storage_per_gb': 0.02,       # $20/TB = $0.02/GB
            'transfer_out_per_gb': 0.005, # $5/TB outbound
        },
        'ocr_processing': {
            'per_page': 0.001,  # $1 per 1000 pages
        }
    }

    def calculate_monthly_cost(self, usage: MonthlyUsage) -> CostBreakdown:
        storage_cost = (usage.storage_gb * self.PRICING['s3_standard']['storage_per_gb'])
        transfer_cost = (usage.transfer_out_gb * self.PRICING['s3_standard']['transfer_out_per_gb'])
        ocr_cost = (usage.ocr_pages * self.PRICING['ocr_processing']['per_page'])

        return CostBreakdown(
            storage=storage_cost,
            transfer=transfer_cost,
            ocr=ocr_cost,
            total=storage_cost + transfer_cost + ocr_cost
        )

    def project_monthly_cost(self, current_usage: CurrentUsage, days_elapsed: int) -> ProjectedCost:
        """Project end-of-month cost based on current usage rate"""
        days_in_month = 30
        daily_rate = current_usage.transfer_out_bytes / days_elapsed
        projected_transfer = daily_rate * days_in_month

        # Storage is point-in-time, not cumulative
        projected_storage = current_usage.storage_bytes

        return ProjectedCost(
            storage_gb=projected_storage / (1024**3),
            transfer_out_gb=projected_transfer / (1024**3),
            estimated_cost=self.calculate_monthly_cost(...)
        )
```

### 11.6 Cost Dashboard UI

```
┌─────────────────────────────────────────────────────────────────┐
│                    Infrastructure Costs                          │
├─────────────────────────────────────────────────────────────────┤
│ Current Month: January 2026                    Projected: $847  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Storage                              Transfer                   │
│  ┌────────────────────────┐          ┌────────────────────────┐ │
│  │ 245 GB used            │          │ 12.4 GB out            │ │
│  │ ████████░░░ 82%        │          │ ██░░░░░░░░░ 12%        │ │
│  │ of 300 GB limit        │          │ of 100 GB limit        │ │
│  │ $5.64 this month       │          │ $1.12 this month       │ │
│  └────────────────────────┘          └────────────────────────┘ │
│                                                                  │
│  OCR Processing                       API Requests               │
│  ┌────────────────────────┐          ┌────────────────────────┐ │
│  │ 45,234 pages           │          │ 234,567 requests       │ │
│  │ ████████████ 90%       │          │ ███░░░░░░░░ 23%        │ │
│  │ of 50,000 limit        │          │ of 1M limit            │ │
│  │ $45.23 this month      │          │ $0.94 this month       │ │
│  └────────────────────────┘          └────────────────────────┘ │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ Cost Trend (Last 6 Months)                                       │
│                                                                  │
│  $900 ┤                                           ╭──           │
│  $800 ┤                              ╭────────────╯             │
│  $700 ┤                    ╭─────────╯                          │
│  $600 ┤          ╭─────────╯                                    │
│  $500 ┤──────────╯                                              │
│  $400 ┼─────────┬─────────┬─────────┬─────────┬─────────┬────── │
│       Aug      Sep      Oct      Nov      Dec      Jan          │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ Cost Breakdown by Category                                       │
│ ├─ Storage (S3 Standard):     $612.45  (72%)  ████████████████  │
│ ├─ Storage (S3 Glacier):       $45.20   (5%)  ██                │
│ ├─ Data Transfer:             $108.90  (13%)  █████             │
│ ├─ OCR Processing:             $52.34   (6%)  ███               │
│ └─ API Requests:               $28.11   (3%)  █                 │
└─────────────────────────────────────────────────────────────────┘
```

### 11.7 Alerts and Notifications

```python
class UsageAlertService:
    """Monitor usage and send alerts"""

    THRESHOLDS = [
        (0.5, 'info', "You've used 50% of your {resource} quota"),
        (0.8, 'warning', "You've used 80% of your {resource} quota"),
        (0.9, 'critical', "You've used 90% of your {resource} quota"),
        (1.0, 'critical', "You've exceeded your {resource} quota"),
    ]

    async def check_and_alert(self, tenant_id: UUID):
        usage = await self.get_current_usage(tenant_id)

        for resource, current, limit in [
            ('storage', usage.storage_bytes, usage.storage_limit_bytes),
            ('transfer', usage.transfer_out_bytes, usage.transfer_limit_bytes),
            ('OCR pages', usage.pages_ocr, usage.ocr_pages_limit),
        ]:
            if limit is None:
                continue

            ratio = current / limit
            for threshold, severity, message_template in self.THRESHOLDS:
                if ratio >= threshold:
                    await self.send_alert(
                        tenant_id=tenant_id,
                        alert_type=f"{resource}_{int(threshold*100)}",
                        severity=severity,
                        message=message_template.format(resource=resource),
                        current_value=current,
                        threshold_value=limit * threshold
                    )
                    break
```

### 11.8 Files to Create

| Repository | File | Purpose |
|------------|------|---------|
| papermerge-core | `papermerge/core/features/billing/` | Billing module |
| papermerge-core | `papermerge/core/features/billing/collectors/aws.py` | AWS cost collector |
| papermerge-core | `papermerge/core/features/billing/collectors/linode.py` | Linode cost collector |
| papermerge-core | `papermerge/core/features/billing/calculator.py` | Cost calculation |
| papermerge-core | `papermerge/core/features/billing/alerts.py` | Usage alerts |
| papermerge-core | `papermerge/core/routers/billing.py` | Billing API |
| Frontend | `features/billing/CostDashboard.tsx` | Cost overview |
| Frontend | `features/billing/UsageCharts.tsx` | Usage visualizations |
| Frontend | `features/billing/InvoiceList.tsx` | Invoice history |
| Frontend | `features/billing/AlertSettings.tsx` | Alert configuration |

**Dependencies:**
```toml
# For cost visualization
plotly = "^5.18"  # Or use frontend charting (recharts, etc.)
```

---

## 12. Upstream Contribution Strategy

### 11.1 Contribution Goals

Contribute enhancements back to Papermerge while maintaining dArchiva-specific features.

### 11.2 Modular Architecture for Upstream

Structure new features as optional, pluggable modules:

```
papermerge-core/
├── papermerge/
│   └── core/
│       └── features/
│           ├── search/           # Existing
│           ├── document_types/   # Existing
│           │
│           │ # NEW - Upstream candidates
│           ├── search_backends/  # Multi-backend search abstraction
│           ├── quality/          # Document quality assessment
│           ├── inventory/        # Physical inventory (optional)
│           ├── provenance/       # Document provenance tracking
│           └── workflows/        # Visual workflow designer
│
├── papermerge/
│   └── contrib/                  # Optional enterprise features
│       ├── abac/                 # ABAC policies (optional)
│       ├── rebac/                # ReBAC (optional)
│       ├── scanner/              # Scanner integration
│       └── tenancy/              # Multi-tenancy
```

### 11.3 Feature Flags for Optional Modules

```python
# papermerge/core/config.py
class FeatureFlags(BaseSettings):
    # Upstream-ready features (enabled by default)
    quality_assessment: bool = True
    provenance_tracking: bool = True
    multi_search_backend: bool = True

    # Enterprise/contrib features (disabled by default)
    abac_enabled: bool = False
    rebac_enabled: bool = False
    multi_tenancy: bool = False
    scanner_integration: bool = False
    physical_inventory: bool = False
```

### 11.4 Contribution Priorities

| Feature | Upstream Likelihood | Notes |
|---------|---------------------|-------|
| **Multi-search backends** | High | Clean abstraction, broadly useful |
| **PaddleOCR integration** | High | Better OCR for structured docs |
| **Quality assessment** | High | Universally useful |
| **Document provenance** | Medium | Valuable for enterprise |
| **2FA/Passkeys** | High | Security best practice |
| **ABAC/ReBAC/PBAC** | Medium | Enterprise complexity |
| **Multi-tenancy** | Low | Major architectural change |
| **Physical inventory** | Low | Niche use case |

### 11.5 Coding Standards for Upstream

Follow Papermerge conventions:

```python
# Use their existing patterns
from papermerge.core.db.base import Base
from papermerge.core.db.audit_cols import AuditColumns

# Match their style
class NewFeature(Base, AuditColumns):
    __tablename__ = "new_feature"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid7)
    # ... follow their column naming conventions
```

### 11.6 Contribution Workflow

```
1. Fork upstream → nyimbi/papermerge-core
2. Create feature branch → feature/multi-search-backends
3. Implement with tests following their pytest patterns
4. Document in their MkDocs format
5. Open PR to upstream with:
   - Clear description of feature
   - Migration scripts
   - Test coverage
   - Documentation
6. Address review feedback
7. Merge to upstream
8. Sync dArchiva fork with upstream
```

### 11.7 Separate Packages for Major Features

Some features may be better as separate packages:

```
# Installable as optional dependencies
papermerge-search-elasticsearch  # Elasticsearch backend
papermerge-search-meilisearch    # Meilisearch backend
papermerge-ocr-paddleocr         # PaddleOCR engine
papermerge-scanner               # Scanner integration
papermerge-inventory             # Physical inventory
```

This allows:
- Independent versioning
- Optional installation
- Cleaner upstream PRs
- Community maintenance

---

## 12. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
- [ ] Add Linode storage backend
- [ ] Set up pgvector extension
- [ ] Create department tables and RBAC

### Phase 2: OCR Enhancement (Weeks 3-4)
- [ ] Integrate PaddleOCR
- [ ] Add Ollama Qwen-VL support
- [ ] Implement SpaCy metadata extraction

### Phase 3: Search Enhancement (Weeks 5-6)
- [ ] Create search backend abstraction
- [ ] Implement Elasticsearch backend
- [ ] Implement Meilisearch backend
- [ ] Add semantic search with pgvector

### Phase 4: Security Enhancement (Weeks 7-8)
- [ ] Implement ABAC policy engine
- [ ] Add department-based access rules
- [ ] Audit logging enhancements

### Phase 5: Frontend & Polish (Weeks 9-10)
- [ ] Department picker component
- [ ] Advanced search UI
- [ ] Semantic search UI
- [ ] Permission management UI
- [ ] Docker compose finalization

---

## 9. Configuration Reference

### Environment Variables

```bash
# Database
PM_DB_URL=postgresql://user:pass@db:5432/darchiva

# Redis
PM_REDIS_URL=redis://redis:6379

# Storage
PM_STORAGE_BACKEND=linode  # s3 | r2 | linode | local
LINODE_ACCESS_KEY_ID=
LINODE_SECRET_ACCESS_KEY=
LINODE_CLUSTER_ID=us-east-1
LINODE_BUCKET_NAME=darchiva-docs

# OCR
OCR_ENGINE=paddleocr  # paddleocr | tesseract | qwen-vl | hybrid
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_OCR_MODEL=qwen2.5-vl:7b

# Search
SEARCH_BACKEND=postgres  # postgres | elasticsearch | solr | meilisearch
ELASTICSEARCH_URL=http://elasticsearch:9200

# Embeddings
EMBEDDING_PROVIDER=ollama
EMBEDDING_MODEL=nomic-embed-text

# Auth
PM_SECRET_KEY=your-secret-key
PM_TOKEN_EXPIRE_MINUTES=1440
```

---

## 10. Existing Features (Already Implemented)

These features are already in Papermerge and don't need implementation:

- [x] Document versioning (DocumentVersion table)
- [x] Custom fields per document type
- [x] Role-based permissions (scopes)
- [x] User/group management
- [x] Document tagging
- [x] Page management (rotate, reorder, extract)
- [x] Folder hierarchy
- [x] PostgreSQL full-text search
- [x] S3/R2 storage
- [x] JWT authentication
- [x] Audit columns (created_at, updated_at, etc.)
- [x] Soft deletes
- [x] i18n support

---

## 13. Scanning Project Management

### 13.1 Overview

Enterprise-grade scanning project planning, execution tracking, and reporting for digitizing millions of documents across multiple scanners, operators, and locations.

### 13.2 Database Schema

```sql
-- Scanning projects (top-level organizational unit)
CREATE TABLE scanning_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    code VARCHAR(50) UNIQUE NOT NULL,  -- Short code like "LEGACY-2024"

    -- Project scope
    estimated_documents INTEGER NOT NULL DEFAULT 0,
    estimated_pages INTEGER NOT NULL DEFAULT 0,
    estimated_boxes INTEGER NOT NULL DEFAULT 0,

    -- Timeline
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,

    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'planning',  -- planning, active, paused, completed, cancelled
    priority INTEGER DEFAULT 5,  -- 1=highest, 10=lowest

    -- Resource allocation
    assigned_scanners JSONB DEFAULT '[]',  -- Scanner IDs
    assigned_operators JSONB DEFAULT '[]',  -- User IDs

    -- Goals and metrics
    daily_page_target INTEGER,  -- Target pages/day
    daily_document_target INTEGER,
    quality_target_percent DECIMAL(5,2) DEFAULT 99.5,

    -- Budget tracking
    budgeted_hours DECIMAL(10,2),
    budgeted_cost_cents INTEGER,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Project phases/milestones
CREATE TABLE project_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES scanning_projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sequence_order INTEGER NOT NULL,

    -- Phase scope
    estimated_documents INTEGER,
    estimated_pages INTEGER,

    -- Timeline
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,

    status VARCHAR(50) DEFAULT 'pending',  -- pending, active, completed

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily work sessions per operator
CREATE TABLE scanning_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES scanning_projects(id) ON DELETE CASCADE,
    phase_id UUID REFERENCES project_phases(id),
    operator_id UUID REFERENCES users(id),
    scanner_id UUID REFERENCES scanners(id),

    -- Session timing
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    break_minutes INTEGER DEFAULT 0,

    -- Session metrics
    documents_scanned INTEGER DEFAULT 0,
    pages_scanned INTEGER DEFAULT 0,
    boxes_processed INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    rescan_count INTEGER DEFAULT 0,

    -- Quality metrics
    auto_quality_score DECIMAL(5,2),  -- Automated quality check score
    manual_qa_score DECIMAL(5,2),     -- Manual QA score if reviewed
    qa_reviewer_id UUID REFERENCES users(id),
    qa_reviewed_at TIMESTAMP WITH TIME ZONE,

    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hourly/granular progress snapshots
CREATE TABLE progress_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES scanning_projects(id) ON DELETE CASCADE,
    snapshot_time TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Cumulative totals at snapshot time
    total_documents_scanned INTEGER NOT NULL,
    total_pages_scanned INTEGER NOT NULL,
    total_boxes_processed INTEGER NOT NULL,
    total_errors INTEGER NOT NULL,

    -- Active resources at snapshot time
    active_operators INTEGER,
    active_scanners INTEGER,

    -- Quality metrics
    avg_quality_score DECIMAL(5,2),
    ocr_success_rate DECIMAL(5,2),

    -- Rate metrics (per hour at this point)
    pages_per_hour DECIMAL(10,2),
    documents_per_hour DECIMAL(10,2),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create snapshot hourly via pg_cron or application
CREATE INDEX idx_progress_snapshots_time ON progress_snapshots(project_id, snapshot_time);

-- Daily aggregated metrics for reporting
CREATE TABLE daily_project_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES scanning_projects(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,

    -- Document counts
    documents_scanned INTEGER DEFAULT 0,
    pages_scanned INTEGER DEFAULT 0,
    boxes_processed INTEGER DEFAULT 0,

    -- Operator stats
    operator_count INTEGER DEFAULT 0,
    total_operator_hours DECIMAL(10,2) DEFAULT 0,

    -- Performance metrics
    pages_per_operator_hour DECIMAL(10,2),
    documents_per_operator_hour DECIMAL(10,2),

    -- Quality metrics
    error_count INTEGER DEFAULT 0,
    rescan_count INTEGER DEFAULT 0,
    avg_quality_score DECIMAL(5,2),

    -- Target comparison
    target_pages INTEGER,
    target_documents INTEGER,
    pages_vs_target_percent DECIMAL(6,2),  -- 100 = on target, 110 = 10% ahead

    -- Cost tracking
    actual_hours DECIMAL(10,2),
    actual_cost_cents INTEGER,

    UNIQUE(project_id, metric_date),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Per-operator daily performance
CREATE TABLE operator_daily_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES scanning_projects(id) ON DELETE CASCADE,
    operator_id UUID REFERENCES users(id),
    metric_date DATE NOT NULL,

    documents_scanned INTEGER DEFAULT 0,
    pages_scanned INTEGER DEFAULT 0,
    hours_worked DECIMAL(6,2) DEFAULT 0,

    pages_per_hour DECIMAL(10,2),
    error_count INTEGER DEFAULT 0,
    rescan_count INTEGER DEFAULT 0,
    quality_score DECIMAL(5,2),

    -- Ranking among operators for the day
    rank_by_pages INTEGER,
    rank_by_quality INTEGER,

    UNIQUE(project_id, operator_id, metric_date),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Issues/blockers tracking
CREATE TABLE project_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES scanning_projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,

    issue_type VARCHAR(50) NOT NULL,  -- equipment, quality, staffing, process, other
    severity VARCHAR(20) NOT NULL,    -- critical, high, medium, low
    status VARCHAR(20) DEFAULT 'open',  -- open, in_progress, resolved, closed

    -- Impact assessment
    documents_affected INTEGER,
    downtime_minutes INTEGER,

    -- Resolution
    resolution TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id),

    reported_by UUID REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 13.3 Pydantic Models

```python
# auth_server/schema/projects.py
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field
from typing import Annotated
from uuid_extensions import uuid7str


class ProjectStatus(str, Enum):
	PLANNING = "planning"
	ACTIVE = "active"
	PAUSED = "paused"
	COMPLETED = "completed"
	CANCELLED = "cancelled"


class IssueSeverity(str, Enum):
	CRITICAL = "critical"
	HIGH = "high"
	MEDIUM = "medium"
	LOW = "low"


class IssueType(str, Enum):
	EQUIPMENT = "equipment"
	QUALITY = "quality"
	STAFFING = "staffing"
	PROCESS = "process"
	OTHER = "other"


class ScanningProjectCreate(BaseModel):
	name: str
	description: str | None = None
	code: str  # Short code like "LEGACY-2024"

	estimated_documents: int = 0
	estimated_pages: int = 0
	estimated_boxes: int = 0

	planned_start_date: date | None = None
	planned_end_date: date | None = None

	daily_page_target: int | None = None
	daily_document_target: int | None = None
	quality_target_percent: Decimal = Decimal("99.5")

	budgeted_hours: Decimal | None = None
	budgeted_cost_cents: int | None = None

	model_config = ConfigDict(extra="forbid")


class ScanningProject(BaseModel):
	id: str = Field(default_factory=uuid7str)
	name: str
	code: str
	status: ProjectStatus

	estimated_documents: int
	estimated_pages: int
	scanned_documents: int = 0  # Computed
	scanned_pages: int = 0      # Computed
	completion_percent: Decimal = Decimal("0")  # Computed

	planned_start_date: date | None
	planned_end_date: date | None
	actual_start_date: date | None
	actual_end_date: date | None

	# Current metrics
	days_remaining: int | None = None  # Computed
	pages_behind_schedule: int = 0     # Computed (negative = ahead)
	daily_rate_needed: int | None = None  # Pages/day to finish on time

	model_config = ConfigDict(extra="forbid", from_attributes=True)


class DailyMetrics(BaseModel):
	"""Daily project metrics for dashboard and reports"""
	metric_date: date

	documents_scanned: int
	pages_scanned: int
	boxes_processed: int

	operator_count: int
	total_operator_hours: Decimal

	pages_per_hour: Decimal
	documents_per_hour: Decimal

	error_count: int
	quality_score: Decimal

	target_pages: int | None
	pages_vs_target_percent: Decimal | None

	model_config = ConfigDict(extra="forbid", from_attributes=True)


class OperatorPerformance(BaseModel):
	"""Per-operator daily/weekly/monthly performance"""
	operator_id: str
	operator_name: str

	period_start: date
	period_end: date

	documents_scanned: int
	pages_scanned: int
	hours_worked: Decimal

	pages_per_hour: Decimal
	quality_score: Decimal
	error_rate: Decimal

	rank_by_pages: int | None
	rank_by_quality: int | None

	model_config = ConfigDict(extra="forbid")


class ProjectDashboard(BaseModel):
	"""Comprehensive project dashboard data"""
	project: ScanningProject

	# Progress
	overall_completion_percent: Decimal
	pages_completed: int
	pages_remaining: int

	# Velocity
	avg_daily_pages_last_7_days: Decimal
	avg_daily_pages_last_30_days: Decimal
	projected_completion_date: date | None

	# Today's stats
	today_pages: int
	today_documents: int
	today_operators: int
	today_target: int | None

	# Quality
	overall_quality_score: Decimal
	error_rate: Decimal

	# Issues
	open_issues_critical: int
	open_issues_high: int
	open_issues_total: int

	# Charts data (last 30 days)
	daily_progress: list[DailyMetrics]
	operator_performance: list[OperatorPerformance]

	model_config = ConfigDict(extra="forbid")
```

### 13.4 API Endpoints

```python
# papermerge-core/papermerge/core/routers/projects.py
from fastapi import APIRouter, Depends, Query, HTTPException
from datetime import date, timedelta
from uuid import UUID

router = APIRouter(prefix="/projects", tags=["Scanning Projects"])


@router.get("/")
async def list_projects(
	status: ProjectStatus | None = None,
	limit: int = Query(20, le=100),
	offset: int = 0,
) -> list[ScanningProject]:
	"""List all scanning projects with computed progress metrics"""
	pass


@router.post("/")
async def create_project(project: ScanningProjectCreate) -> ScanningProject:
	"""Create a new scanning project"""
	pass


@router.get("/{project_id}")
async def get_project(project_id: UUID) -> ScanningProject:
	"""Get project with current metrics"""
	pass


@router.get("/{project_id}/dashboard")
async def get_project_dashboard(
	project_id: UUID,
	days: int = Query(30, le=90),
) -> ProjectDashboard:
	"""Get comprehensive dashboard data for project"""
	pass


@router.get("/{project_id}/daily-report")
async def get_daily_report(
	project_id: UUID,
	report_date: date = Query(default=None),  # Defaults to today
) -> DailyReport:
	"""Get daily status report for printing/distribution"""
	pass


@router.get("/{project_id}/operators")
async def list_operator_performance(
	project_id: UUID,
	period: str = Query("week"),  # day, week, month, project
) -> list[OperatorPerformance]:
	"""Get operator performance rankings"""
	pass


@router.post("/{project_id}/sessions")
async def start_scanning_session(
	project_id: UUID,
	session: ScanningSessionStart,
) -> ScanningSession:
	"""Start a new scanning session for an operator"""
	pass


@router.patch("/{project_id}/sessions/{session_id}")
async def update_session(
	project_id: UUID,
	session_id: UUID,
	update: ScanningSessionUpdate,
) -> ScanningSession:
	"""Update session metrics (documents scanned, pages, etc.)"""
	pass


@router.post("/{project_id}/sessions/{session_id}/end")
async def end_scanning_session(
	project_id: UUID,
	session_id: UUID,
) -> ScanningSession:
	"""End a scanning session and finalize metrics"""
	pass


@router.get("/{project_id}/forecast")
async def get_project_forecast(project_id: UUID) -> ProjectForecast:
	"""
	Predict completion date based on current velocity.
	Uses linear regression on last 30 days of data.
	"""
	pass


@router.get("/{project_id}/issues")
async def list_project_issues(
	project_id: UUID,
	status: str | None = None,
	severity: IssueSeverity | None = None,
) -> list[ProjectIssue]:
	"""List project issues/blockers"""
	pass
```

### 13.5 Daily Status Report (Printable)

```python
# papermerge-core/papermerge/core/services/reports.py
from datetime import date
from typing import Any


class DailyReport(BaseModel):
	"""Printable daily status report"""
	report_date: date
	project_name: str
	project_code: str

	# Executive summary
	overall_progress_percent: Decimal
	days_elapsed: int
	days_remaining: int | None
	on_schedule: bool

	# Day's performance
	pages_scanned_today: int
	documents_scanned_today: int
	target_pages_today: int | None
	variance_from_target: int  # Positive = ahead

	# Cumulative totals
	total_pages_to_date: int
	total_documents_to_date: int
	total_boxes_to_date: int

	# Quality metrics
	quality_score_today: Decimal
	error_rate_today: Decimal
	rescans_today: int

	# Operator summary (sorted by pages)
	operator_summary: list[OperatorDailySummary]

	# Scanner utilization
	scanner_summary: list[ScannerDailySummary]

	# Active issues
	critical_issues: list[str]
	high_priority_issues: list[str]

	# Forecast
	projected_completion_date: date | None
	pages_per_day_needed: int | None

	model_config = ConfigDict(extra="forbid")


class OperatorDailySummary(BaseModel):
	operator_name: str
	hours_worked: Decimal
	pages_scanned: int
	pages_per_hour: Decimal
	quality_score: Decimal
	rank: int


class ScannerDailySummary(BaseModel):
	scanner_name: str
	utilization_percent: Decimal
	pages_scanned: int
	error_count: int
	downtime_minutes: int


async def generate_daily_report(
	project_id: UUID,
	report_date: date,
) -> DailyReport:
	"""
	Generate comprehensive daily report.
	Designed for PDF generation and email distribution.
	"""
	# Query daily metrics
	metrics = await db.get_daily_metrics(project_id, report_date)

	# Query operator performance
	operators = await db.get_operator_metrics(project_id, report_date)

	# Query scanner stats
	scanners = await db.get_scanner_metrics(project_id, report_date)

	# Query open issues
	issues = await db.get_open_issues(project_id)

	# Calculate forecast
	forecast = await calculate_completion_forecast(project_id)

	# Assemble report
	return DailyReport(
		report_date=report_date,
		# ... populate all fields
	)


async def generate_pdf_report(report: DailyReport) -> bytes:
	"""Generate PDF version of daily report for printing"""
	from weasyprint import HTML

	html_content = render_report_template(report)
	return HTML(string=html_content).write_pdf()


async def email_daily_report(
	project_id: UUID,
	recipients: list[str],
	report_date: date,
):
	"""Email PDF report to stakeholders"""
	report = await generate_daily_report(project_id, report_date)
	pdf_bytes = await generate_pdf_report(report)

	await send_email(
		to=recipients,
		subject=f"Daily Scanning Report - {report.project_code} - {report_date}",
		body=render_email_summary(report),
		attachments=[("daily_report.pdf", pdf_bytes)],
	)
```

### 13.6 Frontend Dashboard Component

```tsx
// papermerge-core/frontend/apps/ui/src/features/projects/ProjectDashboard.tsx
import { Card, Grid, Progress, Table, Title, Text, Group, Badge, Stack } from "@mantine/core"
import { LineChart, BarChart } from "@mantine/charts"
import { IconTarget, IconUsers, IconFileText, IconAlertTriangle } from "@tabler/icons-react"

interface ProjectDashboardProps {
	projectId: string
}

export function ProjectDashboard({ projectId }: ProjectDashboardProps) {
	const { data: dashboard } = useProjectDashboard(projectId)

	if (!dashboard) return null

	return (
		<Stack gap="lg">
			{/* Header with project summary */}
			<Card withBorder>
				<Group justify="space-between">
					<div>
						<Title order={2}>{dashboard.project.name}</Title>
						<Text c="dimmed">{dashboard.project.code}</Text>
					</div>
					<Badge
						size="xl"
						color={dashboard.project.status === "active" ? "green" : "gray"}
					>
						{dashboard.project.status}
					</Badge>
				</Group>

				<Progress
					value={Number(dashboard.overall_completion_percent)}
					size="xl"
					mt="lg"
					color={Number(dashboard.overall_completion_percent) >= 100 ? "green" : "blue"}
				/>
				<Text size="sm" ta="center" mt="xs">
					{dashboard.pages_completed.toLocaleString()} / {dashboard.project.estimated_pages.toLocaleString()} pages
					({dashboard.overall_completion_percent}%)
				</Text>
			</Card>

			{/* Key metrics grid */}
			<Grid>
				<Grid.Col span={3}>
					<MetricCard
						title="Today's Pages"
						value={dashboard.today_pages}
						target={dashboard.today_target}
						icon={<IconFileText />}
					/>
				</Grid.Col>
				<Grid.Col span={3}>
					<MetricCard
						title="Active Operators"
						value={dashboard.today_operators}
						icon={<IconUsers />}
					/>
				</Grid.Col>
				<Grid.Col span={3}>
					<MetricCard
						title="Quality Score"
						value={`${dashboard.overall_quality_score}%`}
						icon={<IconTarget />}
					/>
				</Grid.Col>
				<Grid.Col span={3}>
					<MetricCard
						title="Open Issues"
						value={dashboard.open_issues_total}
						alert={dashboard.open_issues_critical > 0}
						icon={<IconAlertTriangle />}
					/>
				</Grid.Col>
			</Grid>

			{/* Progress chart - last 30 days */}
			<Card withBorder>
				<Title order={4} mb="md">Daily Progress (Last 30 Days)</Title>
				<LineChart
					h={300}
					data={dashboard.daily_progress}
					dataKey="metric_date"
					series={[
						{ name: "pages_scanned", color: "blue.6" },
						{ name: "target_pages", color: "gray.4", strokeDasharray: "5 5" },
					]}
					curveType="monotone"
				/>
			</Card>

			{/* Operator performance table */}
			<Card withBorder>
				<Title order={4} mb="md">Operator Performance (This Week)</Title>
				<Table>
					<Table.Thead>
						<Table.Tr>
							<Table.Th>Rank</Table.Th>
							<Table.Th>Operator</Table.Th>
							<Table.Th>Pages</Table.Th>
							<Table.Th>Hours</Table.Th>
							<Table.Th>Pages/Hour</Table.Th>
							<Table.Th>Quality</Table.Th>
						</Table.Tr>
					</Table.Thead>
					<Table.Tbody>
						{dashboard.operator_performance.map((op, idx) => (
							<Table.Tr key={op.operator_id}>
								<Table.Td>
									<Badge color={idx < 3 ? "gold" : "gray"}>{idx + 1}</Badge>
								</Table.Td>
								<Table.Td>{op.operator_name}</Table.Td>
								<Table.Td>{op.pages_scanned.toLocaleString()}</Table.Td>
								<Table.Td>{op.hours_worked}</Table.Td>
								<Table.Td>{op.pages_per_hour}</Table.Td>
								<Table.Td>
									<Badge color={Number(op.quality_score) >= 99 ? "green" : "yellow"}>
										{op.quality_score}%
									</Badge>
								</Table.Td>
							</Table.Tr>
						))}
					</Table.Tbody>
				</Table>
			</Card>

			{/* Forecast panel */}
			<Card withBorder>
				<Title order={4} mb="md">Completion Forecast</Title>
				<Grid>
					<Grid.Col span={6}>
						<Text>Projected completion date:</Text>
						<Text size="xl" fw="bold">
							{dashboard.projected_completion_date || "Calculating..."}
						</Text>
					</Grid.Col>
					<Grid.Col span={6}>
						<Text>Required daily rate to meet deadline:</Text>
						<Text size="xl" fw="bold">
							{dashboard.project.daily_rate_needed?.toLocaleString() || "N/A"} pages/day
						</Text>
					</Grid.Col>
				</Grid>
			</Card>
		</Stack>
	)
}

function MetricCard({ title, value, target, icon, alert }: MetricCardProps) {
	return (
		<Card withBorder bg={alert ? "red.0" : undefined}>
			<Group gap="xs">
				{icon}
				<Text size="sm" c="dimmed">{title}</Text>
			</Group>
			<Text size="xl" fw="bold" mt="xs">
				{typeof value === "number" ? value.toLocaleString() : value}
			</Text>
			{target && (
				<Text size="xs" c="dimmed">Target: {target.toLocaleString()}</Text>
			)}
		</Card>
	)
}
```

### 13.7 Printable Report Template

```html
<!-- templates/reports/daily_report.html -->
<!DOCTYPE html>
<html>
<head>
	<style>
		@page { size: A4; margin: 1.5cm; }
		body { font-family: Arial, sans-serif; font-size: 11pt; }
		h1 { font-size: 18pt; margin-bottom: 5px; }
		h2 { font-size: 14pt; border-bottom: 1px solid #333; padding-bottom: 3px; }
		.header { display: flex; justify-content: space-between; margin-bottom: 20px; }
		.metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 15px 0; }
		.metric-box { border: 1px solid #ddd; padding: 10px; text-align: center; }
		.metric-value { font-size: 24pt; font-weight: bold; }
		.metric-label { font-size: 9pt; color: #666; }
		.progress-bar { height: 20px; background: #eee; border-radius: 10px; overflow: hidden; }
		.progress-fill { height: 100%; background: #4CAF50; }
		table { width: 100%; border-collapse: collapse; margin: 10px 0; }
		th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
		th { background: #f5f5f5; }
		.status-good { color: #4CAF50; }
		.status-warning { color: #FF9800; }
		.status-critical { color: #F44336; }
		.footer { margin-top: 30px; font-size: 9pt; color: #666; text-align: center; }
	</style>
</head>
<body>
	<div class="header">
		<div>
			<h1>{{ project_name }}</h1>
			<p>Project Code: {{ project_code }}</p>
		</div>
		<div style="text-align: right;">
			<p><strong>Daily Status Report</strong></p>
			<p>{{ report_date }}</p>
		</div>
	</div>

	<!-- Overall Progress -->
	<h2>Overall Progress</h2>
	<div class="progress-bar">
		<div class="progress-fill" style="width: {{ overall_progress_percent }}%;"></div>
	</div>
	<p style="text-align: center;">
		{{ overall_progress_percent }}% Complete
		({{ total_pages_to_date|number_format }} of {{ estimated_pages|number_format }} pages)
	</p>

	<!-- Key Metrics Grid -->
	<div class="metric-grid">
		<div class="metric-box">
			<div class="metric-value">{{ pages_scanned_today|number_format }}</div>
			<div class="metric-label">Pages Today</div>
		</div>
		<div class="metric-box">
			<div class="metric-value {% if variance_from_target >= 0 %}status-good{% else %}status-warning{% endif %}">
				{% if variance_from_target >= 0 %}+{% endif %}{{ variance_from_target|number_format }}
			</div>
			<div class="metric-label">vs Target</div>
		</div>
		<div class="metric-box">
			<div class="metric-value">{{ quality_score_today }}%</div>
			<div class="metric-label">Quality Score</div>
		</div>
		<div class="metric-box">
			<div class="metric-value">{{ days_remaining }}</div>
			<div class="metric-label">Days Remaining</div>
		</div>
	</div>

	<!-- Operator Performance -->
	<h2>Operator Performance</h2>
	<table>
		<thead>
			<tr>
				<th>Rank</th>
				<th>Operator</th>
				<th>Hours</th>
				<th>Pages</th>
				<th>Pages/Hour</th>
				<th>Quality</th>
			</tr>
		</thead>
		<tbody>
			{% for op in operator_summary %}
			<tr>
				<td>{{ op.rank }}</td>
				<td>{{ op.operator_name }}</td>
				<td>{{ op.hours_worked }}</td>
				<td>{{ op.pages_scanned|number_format }}</td>
				<td>{{ op.pages_per_hour }}</td>
				<td>{{ op.quality_score }}%</td>
			</tr>
			{% endfor %}
		</tbody>
	</table>

	<!-- Scanner Utilization -->
	<h2>Scanner Utilization</h2>
	<table>
		<thead>
			<tr>
				<th>Scanner</th>
				<th>Utilization</th>
				<th>Pages</th>
				<th>Errors</th>
				<th>Downtime</th>
			</tr>
		</thead>
		<tbody>
			{% for scanner in scanner_summary %}
			<tr>
				<td>{{ scanner.scanner_name }}</td>
				<td>{{ scanner.utilization_percent }}%</td>
				<td>{{ scanner.pages_scanned|number_format }}</td>
				<td>{{ scanner.error_count }}</td>
				<td>{{ scanner.downtime_minutes }} min</td>
			</tr>
			{% endfor %}
		</tbody>
	</table>

	<!-- Active Issues -->
	{% if critical_issues or high_priority_issues %}
	<h2>Active Issues</h2>
	{% if critical_issues %}
	<p class="status-critical"><strong>CRITICAL:</strong></p>
	<ul>
		{% for issue in critical_issues %}
		<li>{{ issue }}</li>
		{% endfor %}
	</ul>
	{% endif %}
	{% if high_priority_issues %}
	<p class="status-warning"><strong>High Priority:</strong></p>
	<ul>
		{% for issue in high_priority_issues %}
		<li>{{ issue }}</li>
		{% endfor %}
	</ul>
	{% endif %}
	{% endif %}

	<!-- Forecast -->
	<h2>Completion Forecast</h2>
	<p>
		<strong>Projected Completion:</strong> {{ projected_completion_date }}<br>
		<strong>Required Daily Rate:</strong> {{ pages_per_day_needed|number_format }} pages/day to meet deadline
	</p>

	<div class="footer">
		Generated by dArchiva • {{ now }} • Page 1 of 1
	</div>
</body>
</html>
```

### 13.8 Scheduled Report Distribution

```python
# papermerge-core/papermerge/core/tasks/reports.py
from celery import shared_task
from datetime import date, time
from typing import Any


@shared_task
def generate_and_distribute_daily_reports():
	"""
	Celery task to generate and email daily reports.
	Schedule via celery beat for end of business day.
	"""
	# Get all active projects
	projects = db.get_active_projects()

	for project in projects:
		# Get report recipients (project managers, stakeholders)
		recipients = db.get_report_recipients(project.id)

		if recipients:
			email_daily_report(
				project_id=project.id,
				recipients=recipients,
				report_date=date.today(),
			)


# Celery beat schedule
CELERY_BEAT_SCHEDULE = {
	"daily-reports": {
		"task": "papermerge.core.tasks.reports.generate_and_distribute_daily_reports",
		"schedule": crontab(hour=18, minute=0),  # 6 PM daily
	},
}
```

### 13.9 Files to Create

```
papermerge-core/
├── papermerge/core/
│   ├── db/
│   │   └── projects.py           # Project DB operations
│   ├── routers/
│   │   └── projects.py           # API endpoints
│   ├── services/
│   │   ├── projects.py           # Project business logic
│   │   └── reports.py            # Report generation
│   ├── tasks/
│   │   └── reports.py            # Scheduled report tasks
│   └── templates/
│       └── reports/
│           └── daily_report.html # Printable template
│
├── frontend/apps/ui/src/
│   ├── features/projects/
│   │   ├── ProjectDashboard.tsx
│   │   ├── ProjectList.tsx
│   │   ├── OperatorPerformance.tsx
│   │   ├── IssueTracker.tsx
│   │   └── api.ts
│   └── routes/
│       └── projects.tsx

papermerge-auth-server/
├── auth_server/
│   ├── schema/
│   │   └── projects.py           # Pydantic models
│   └── db/
│       └── projects_orm.py       # SQLAlchemy models
```

### 13.10 Integration with Batch Processing

The project management system integrates with the batch tracking system (Section 10):

```python
# When a box is scanned, update project metrics
async def on_box_scanned(box_id: UUID, session_id: UUID):
	box = await db.get_box(box_id)
	session = await db.get_session(session_id)

	# Update session metrics
	await db.increment_session_metrics(
		session_id=session_id,
		documents=box.document_count,
		pages=box.total_pages,
		boxes=1,
	)

	# Update daily metrics
	await db.increment_daily_metrics(
		project_id=session.project_id,
		metric_date=date.today(),
		documents=box.document_count,
		pages=box.total_pages,
		boxes=1,
	)

	# Trigger real-time dashboard update
	await broadcast_project_update(session.project_id)
```

---

## 14. Email Client Integration

### 14.1 Overview

Enable direct ingestion of emails and attachments from popular email clients into dArchiva. Users can save emails as documents with full metadata, attachments, and conversation threading.

### 14.2 Supported Platforms

| Platform | Integration Type | Status |
|----------|------------------|--------|
| **Microsoft Outlook** | Office Add-in (OSSA) | Primary |
| **Gmail** | Chrome Extension + Google Workspace Add-on | Primary |
| **Apple Mail** | macOS Mail Plugin | Secondary |
| **Thunderbird** | WebExtension | Secondary |
| **Generic IMAP** | Server-side ingestion | Optional |

### 14.3 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Email Client Plugins                         │
├──────────────┬──────────────┬──────────────┬───────────────────┤
│   Outlook    │    Gmail     │  Apple Mail  │   Thunderbird     │
│   Add-in     │  Extension   │   Plugin     │   Extension       │
└──────┬───────┴──────┬───────┴──────┬───────┴───────┬───────────┘
       │              │              │               │
       └──────────────┼──────────────┼───────────────┘
                      │              │
                      ▼              ▼
            ┌─────────────────────────────────┐
            │      Email Ingestion API        │
            │    POST /api/v1/emails/ingest   │
            └─────────────────┬───────────────┘
                              │
                              ▼
            ┌─────────────────────────────────┐
            │       Email Processing          │
            │  - Parse MIME/EML               │
            │  - Extract metadata             │
            │  - Process attachments          │
            │  - OCR if needed               │
            └─────────────────┬───────────────┘
                              │
                              ▼
            ┌─────────────────────────────────┐
            │       Document Storage          │
            │  - Email as document            │
            │  - Attachments as children      │
            │  - Thread relationships         │
            └─────────────────────────────────┘
```

### 14.4 Database Schema

```sql
-- Email messages ingested into the system
CREATE TABLE email_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,

    -- Email metadata
    message_id VARCHAR(255) UNIQUE NOT NULL,  -- RFC 5322 Message-ID
    subject TEXT,
    from_address VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),
    to_addresses JSONB DEFAULT '[]',  -- Array of {email, name}
    cc_addresses JSONB DEFAULT '[]',
    bcc_addresses JSONB DEFAULT '[]',
    reply_to VARCHAR(255),

    -- Threading
    in_reply_to VARCHAR(255),  -- Parent message-id
    references_header TEXT,     -- Full references chain
    thread_id VARCHAR(255),     -- Computed thread identifier
    conversation_id VARCHAR(255),  -- Provider-specific (Gmail, Outlook)

    -- Dates
    sent_at TIMESTAMP WITH TIME ZONE,
    received_at TIMESTAMP WITH TIME ZONE,

    -- Content
    body_text TEXT,
    body_html TEXT,
    has_attachments BOOLEAN DEFAULT FALSE,
    attachment_count INTEGER DEFAULT 0,

    -- Source tracking
    source_platform VARCHAR(50) NOT NULL,  -- outlook, gmail, thunderbird, imap
    source_folder VARCHAR(255),  -- Inbox, Sent, custom folder
    source_account VARCHAR(255),  -- User's email account

    -- Classification
    is_encrypted BOOLEAN DEFAULT FALSE,
    is_signed BOOLEAN DEFAULT FALSE,
    importance VARCHAR(20),  -- low, normal, high
    categories JSONB DEFAULT '[]',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    imported_by UUID REFERENCES users(id)
);

-- Link email attachments to their parent email
CREATE TABLE email_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_import_id UUID REFERENCES email_imports(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,

    filename VARCHAR(512) NOT NULL,
    content_type VARCHAR(255),
    size_bytes BIGINT,
    content_id VARCHAR(255),  -- For inline attachments
    is_inline BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Track email threads/conversations
CREATE TABLE email_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id VARCHAR(255) UNIQUE NOT NULL,
    subject TEXT,
    participant_emails JSONB DEFAULT '[]',
    message_count INTEGER DEFAULT 1,
    first_message_at TIMESTAMP WITH TIME ZONE,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_imports_message_id ON email_imports(message_id);
CREATE INDEX idx_email_imports_thread_id ON email_imports(thread_id);
CREATE INDEX idx_email_imports_from ON email_imports(from_address);
CREATE INDEX idx_email_imports_sent_at ON email_imports(sent_at);
```

### 14.5 Email Ingestion API

```python
# papermerge-core/papermerge/core/routers/emails.py
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Annotated
from uuid import UUID

router = APIRouter(prefix="/emails", tags=["Email Integration"])


class EmailIngestRequest(BaseModel):
	"""Request to ingest an email"""
	# Required fields
	message_id: str
	subject: str | None
	from_address: EmailStr
	from_name: str | None = None

	# Recipients
	to_addresses: list[dict] = []
	cc_addresses: list[dict] = []

	# Content (at least one required)
	body_text: str | None = None
	body_html: str | None = None

	# Dates
	sent_at: datetime | None = None
	received_at: datetime | None = None

	# Threading
	in_reply_to: str | None = None
	references: str | None = None
	conversation_id: str | None = None

	# Source
	source_platform: str  # outlook, gmail, thunderbird
	source_folder: str | None = None
	source_account: str | None = None

	# Classification
	importance: str | None = None
	categories: list[str] = []

	# Target folder in dArchiva
	target_folder_id: UUID | None = None


class EmailIngestResponse(BaseModel):
	document_id: UUID
	email_import_id: UUID
	attachment_count: int
	thread_id: str | None


@router.post("/ingest")
async def ingest_email(
	request: EmailIngestRequest,
	attachments: list[UploadFile] = File(default=[]),
) -> EmailIngestResponse:
	"""
	Ingest an email with optional attachments.

	The email is stored as a document with:
	- Email body rendered as HTML/PDF
	- Attachments as child documents
	- Full metadata for search
	"""
	# Check for duplicate
	existing = await db.get_email_by_message_id(request.message_id)
	if existing:
		raise HTTPException(
			status_code=409,
			detail=f"Email with message_id already exists: {existing.document_id}"
		)

	# Create email document
	document = await create_email_document(request)

	# Process attachments
	attachment_docs = []
	for attachment in attachments:
		att_doc = await process_attachment(
			email_document_id=document.id,
			file=attachment,
		)
		attachment_docs.append(att_doc)

	# Update thread
	thread_id = await update_email_thread(request)

	# Index for search
	await index_email_document(document.id)

	return EmailIngestResponse(
		document_id=document.id,
		email_import_id=document.email_import.id,
		attachment_count=len(attachment_docs),
		thread_id=thread_id,
	)


@router.post("/ingest/eml")
async def ingest_eml_file(
	file: UploadFile = File(...),
	target_folder_id: UUID | None = None,
) -> EmailIngestResponse:
	"""
	Ingest a raw .eml file.
	Parses MIME structure and extracts all content/attachments.
	"""
	from email import policy
	from email.parser import BytesParser

	content = await file.read()
	msg = BytesParser(policy=policy.default).parsebytes(content)

	# Extract email data from parsed message
	request = parse_mime_message(msg)
	request.target_folder_id = target_folder_id

	# Extract attachments
	attachments = extract_mime_attachments(msg)

	return await ingest_email(request, attachments)


@router.get("/threads/{thread_id}")
async def get_email_thread(thread_id: str) -> EmailThread:
	"""Get all emails in a conversation thread"""
	pass


@router.get("/search")
async def search_emails(
	q: str,
	from_address: str | None = None,
	to_address: str | None = None,
	date_from: datetime | None = None,
	date_to: datetime | None = None,
	has_attachments: bool | None = None,
) -> list[EmailSearchResult]:
	"""Search emails with advanced filters"""
	pass
```

### 14.6 Microsoft Outlook Add-in

**Manifest (manifest.xml):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<OfficeApp xmlns="http://schemas.microsoft.com/office/appforoffice/1.1"
           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
           xsi:type="MailApp">
  <Id>darchiva-outlook-addin</Id>
  <Version>1.0.0</Version>
  <ProviderName>dArchiva</ProviderName>
  <DefaultLocale>en-US</DefaultLocale>
  <DisplayName DefaultValue="dArchiva"/>
  <Description DefaultValue="Save emails and attachments to dArchiva"/>

  <Hosts>
    <Host Name="Mailbox"/>
  </Hosts>

  <Requirements>
    <Sets>
      <Set Name="Mailbox" MinVersion="1.1"/>
    </Sets>
  </Requirements>

  <FormSettings>
    <Form xsi:type="ItemRead">
      <DesktopSettings>
        <SourceLocation DefaultValue="https://your-darchiva.com/outlook/taskpane.html"/>
        <RequestedHeight>300</RequestedHeight>
      </DesktopSettings>
    </Form>
  </FormSettings>

  <Permissions>ReadWriteMailbox</Permissions>

  <Rule xsi:type="RuleCollection" Mode="Or">
    <Rule xsi:type="ItemIs" ItemType="Message"/>
  </Rule>
</OfficeApp>
```

**Task Pane Component (TypeScript/React):**
```typescript
// outlook-addin/src/taskpane/components/SaveToArchiva.tsx
import * as React from "react"
import { useState } from "react"
import { PrimaryButton, Dropdown, IDropdownOption, Spinner, MessageBar, MessageBarType } from "@fluentui/react"

interface SaveToArchivaProps {
	apiEndpoint: string
	authToken: string
}

export function SaveToArchiva({ apiEndpoint, authToken }: SaveToArchivaProps) {
	const [folders, setFolders] = useState<IDropdownOption[]>([])
	const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
	const [saving, setSaving] = useState(false)
	const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

	// Load dArchiva folders on mount
	React.useEffect(() => {
		loadFolders()
	}, [])

	async function loadFolders() {
		const response = await fetch(`${apiEndpoint}/folders`, {
			headers: { Authorization: `Bearer ${authToken}` },
		})
		const data = await response.json()
		setFolders(data.map((f: any) => ({ key: f.id, text: f.title })))
	}

	async function saveEmail() {
		setSaving(true)
		setResult(null)

		try {
			// Get current email from Outlook
			const item = Office.context.mailbox.item

			// Get email content
			const subject = item.subject
			const from = item.from
			const to = item.to
			const cc = item.cc

			// Get body
			const body = await new Promise<string>((resolve) => {
				item.body.getAsync(Office.CoercionType.Html, (result) => {
					resolve(result.value)
				})
			})

			// Get attachments
			const attachments = await getAttachments(item)

			// Build request
			const formData = new FormData()
			formData.append("data", JSON.stringify({
				message_id: item.internetMessageId,
				subject,
				from_address: from.emailAddress,
				from_name: from.displayName,
				to_addresses: to.map((r: any) => ({ email: r.emailAddress, name: r.displayName })),
				cc_addresses: cc.map((r: any) => ({ email: r.emailAddress, name: r.displayName })),
				body_html: body,
				sent_at: item.dateTimeCreated.toISOString(),
				source_platform: "outlook",
				source_folder: item.parentFolderId,
				target_folder_id: selectedFolder,
				conversation_id: item.conversationId,
			}))

			// Add attachments
			for (const att of attachments) {
				formData.append("attachments", att.blob, att.name)
			}

			// Send to dArchiva
			const response = await fetch(`${apiEndpoint}/emails/ingest`, {
				method: "POST",
				headers: { Authorization: `Bearer ${authToken}` },
				body: formData,
			})

			if (response.ok) {
				const data = await response.json()
				setResult({
					success: true,
					message: `Saved to dArchiva (${data.attachment_count} attachments)`,
				})
			} else {
				throw new Error(await response.text())
			}
		} catch (error) {
			setResult({
				success: false,
				message: `Failed: ${error.message}`,
			})
		} finally {
			setSaving(false)
		}
	}

	async function getAttachments(item: Office.MessageRead): Promise<{ name: string; blob: Blob }[]> {
		const attachments: { name: string; blob: Blob }[] = []

		for (const att of item.attachments) {
			if (att.attachmentType === Office.MailboxEnums.AttachmentType.File) {
				const content = await new Promise<string>((resolve) => {
					item.getAttachmentContentAsync(att.id, (result) => {
						resolve(result.value.content)
					})
				})

				// Decode base64
				const binary = atob(content)
				const bytes = new Uint8Array(binary.length)
				for (let i = 0; i < binary.length; i++) {
					bytes[i] = binary.charCodeAt(i)
				}
				const blob = new Blob([bytes], { type: att.contentType })
				attachments.push({ name: att.name, blob })
			}
		}

		return attachments
	}

	return (
		<div style={{ padding: 20 }}>
			<h2>Save to dArchiva</h2>

			<Dropdown
				label="Target Folder"
				options={folders}
				selectedKey={selectedFolder}
				onChange={(_, option) => setSelectedFolder(option?.key as string)}
				placeholder="Select folder..."
				styles={{ root: { marginBottom: 16 } }}
			/>

			<PrimaryButton
				text={saving ? "Saving..." : "Save Email"}
				onClick={saveEmail}
				disabled={saving}
				iconProps={{ iconName: "Save" }}
			/>

			{saving && <Spinner label="Uploading..." style={{ marginTop: 16 }} />}

			{result && (
				<MessageBar
					messageBarType={result.success ? MessageBarType.success : MessageBarType.error}
					style={{ marginTop: 16 }}
				>
					{result.message}
				</MessageBar>
			)}
		</div>
	)
}
```

### 14.7 Gmail Chrome Extension

**manifest.json:**
```json
{
  "manifest_version": 3,
  "name": "dArchiva for Gmail",
  "version": "1.0.0",
  "description": "Save Gmail emails and attachments to dArchiva",
  "permissions": [
    "activeTab",
    "storage"
  ],
  "host_permissions": [
    "https://mail.google.com/*",
    "https://your-darchiva.com/*"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["https://mail.google.com/*"],
      "js": ["content.js"],
      "css": ["content.css"]
    }
  ],
  "background": {
    "service_worker": "background.js"
  }
}
```

**Content Script (content.js):**
```javascript
// Inject "Save to dArchiva" button in Gmail UI
function injectSaveButton() {
  // Wait for Gmail to load email view
  const observer = new MutationObserver((mutations) => {
    // Find the Gmail action bar
    const actionBar = document.querySelector('[role="toolbar"]')
    if (actionBar && !document.getElementById('darchiva-save-btn')) {
      const button = createSaveButton()
      actionBar.appendChild(button)
    }
  })

  observer.observe(document.body, { childList: true, subtree: true })
}

function createSaveButton() {
  const button = document.createElement('div')
  button.id = 'darchiva-save-btn'
  button.className = 'darchiva-btn'
  button.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24">
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
    </svg>
    <span>Save to dArchiva</span>
  `
  button.addEventListener('click', handleSaveClick)
  return button
}

async function handleSaveClick() {
  // Get current email data using Gmail API
  const emailData = await extractEmailFromGmail()

  // Send to background script
  chrome.runtime.sendMessage({
    action: 'saveEmail',
    data: emailData
  }, (response) => {
    if (response.success) {
      showNotification('Email saved to dArchiva')
    } else {
      showNotification('Failed to save: ' + response.error, 'error')
    }
  })
}

async function extractEmailFromGmail() {
  // Extract email data from Gmail DOM
  // This requires parsing Gmail's dynamic structure

  const emailContainer = document.querySelector('[data-message-id]')
  const messageId = emailContainer?.dataset.messageId

  // Use Gmail API for reliable extraction
  return {
    messageId,
    subject: document.querySelector('h2[data-thread-perm-id]')?.textContent,
    // ... other fields
  }
}

function showNotification(message, type = 'success') {
  const notification = document.createElement('div')
  notification.className = `darchiva-notification ${type}`
  notification.textContent = message
  document.body.appendChild(notification)

  setTimeout(() => notification.remove(), 3000)
}

// Initialize
injectSaveButton()
```

### 14.8 Google Workspace Add-on

For deeper Gmail integration, use Google Workspace Add-ons:

**appsscript.json:**
```json
{
  "timeZone": "UTC",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "addOns": {
    "gmail": {
      "contextualTriggers": [
        {
          "unconditional": {},
          "onTriggerFunction": "buildAddOn"
        }
      ],
      "composeTrigger": {
        "selectActions": [
          {
            "text": "Save to dArchiva",
            "runFunction": "saveEmail"
          }
        ]
      }
    },
    "common": {
      "name": "dArchiva",
      "logoUrl": "https://your-darchiva.com/logo.png",
      "layoutProperties": {
        "primaryColor": "#4285f4"
      }
    }
  }
}
```

**Code.gs:**
```javascript
function buildAddOn(e) {
  const accessToken = e.gmail.accessToken
  const messageId = e.gmail.messageId

  // Get message details
  const message = GmailApp.getMessageById(messageId)
  const subject = message.getSubject()
  const from = message.getFrom()

  // Build card UI
  const card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle('Save to dArchiva'))
    .addSection(
      CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText(`Subject: ${subject}`))
        .addWidget(CardService.newTextParagraph().setText(`From: ${from}`))
        .addWidget(
          CardService.newSelectionInput()
            .setType(CardService.SelectionInputType.DROPDOWN)
            .setFieldName('folder')
            .setTitle('Target Folder')
            .addItem('Inbox', 'inbox', true)
            .addItem('Contracts', 'contracts', false)
            .addItem('Invoices', 'invoices', false)
        )
        .addWidget(
          CardService.newTextButton()
            .setText('Save Email')
            .setOnClickAction(
              CardService.newAction().setFunctionName('saveEmailAction')
            )
        )
    )
    .build()

  return [card]
}

function saveEmailAction(e) {
  const messageId = e.gmail.messageId
  const folder = e.formInput.folder

  const message = GmailApp.getMessageById(messageId)

  // Prepare data
  const data = {
    message_id: message.getId(),
    subject: message.getSubject(),
    from_address: message.getFrom(),
    to_addresses: message.getTo().split(',').map(email => ({ email: email.trim() })),
    body_html: message.getBody(),
    sent_at: message.getDate().toISOString(),
    source_platform: 'gmail',
    target_folder_id: folder
  }

  // Get attachments
  const attachments = message.getAttachments()

  // Send to dArchiva API
  const apiUrl = PropertiesService.getUserProperties().getProperty('DARCHIVA_API_URL')
  const apiToken = PropertiesService.getUserProperties().getProperty('DARCHIVA_API_TOKEN')

  const response = UrlFetchApp.fetch(`${apiUrl}/emails/ingest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(data)
  })

  if (response.getResponseCode() === 200) {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Email saved to dArchiva'))
      .build()
  } else {
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText('Failed to save email'))
      .build()
  }
}
```

### 14.9 IMAP Server-Side Ingestion

For automated email ingestion without client plugins:

```python
# papermerge-core/papermerge/core/services/email_imap.py
import imaplib
import email
from email import policy
from datetime import datetime, timedelta
import asyncio


class IMAPEmailIngester:
	"""Server-side email ingestion from IMAP accounts"""

	def __init__(
		self,
		host: str,
		username: str,
		password: str,
		port: int = 993,
		use_ssl: bool = True,
	):
		self.host = host
		self.username = username
		self.password = password
		self.port = port
		self.use_ssl = use_ssl
		self.connection = None

	async def connect(self):
		if self.use_ssl:
			self.connection = imaplib.IMAP4_SSL(self.host, self.port)
		else:
			self.connection = imaplib.IMAP4(self.host, self.port)
		self.connection.login(self.username, self.password)

	async def disconnect(self):
		if self.connection:
			self.connection.logout()

	async def fetch_new_emails(
		self,
		folder: str = "INBOX",
		since: datetime | None = None,
		mark_as_read: bool = True,
	) -> list[dict]:
		"""Fetch new emails from specified folder"""
		self.connection.select(folder)

		# Build search criteria
		criteria = ["UNSEEN"]
		if since:
			date_str = since.strftime("%d-%b-%Y")
			criteria.append(f'SINCE "{date_str}"')

		# Search for messages
		_, message_ids = self.connection.search(None, *criteria)
		emails = []

		for msg_id in message_ids[0].split():
			_, msg_data = self.connection.fetch(msg_id, "(RFC822)")
			raw_email = msg_data[0][1]

			# Parse email
			msg = email.message_from_bytes(raw_email, policy=policy.default)
			parsed = self._parse_email(msg)
			emails.append(parsed)

			# Mark as read if requested
			if mark_as_read:
				self.connection.store(msg_id, "+FLAGS", "\\Seen")

		return emails

	def _parse_email(self, msg: email.message.Message) -> dict:
		"""Parse email message into structured data"""
		return {
			"message_id": msg["Message-ID"],
			"subject": msg["Subject"],
			"from_address": msg["From"],
			"to_addresses": msg["To"],
			"cc_addresses": msg.get("Cc"),
			"sent_at": msg["Date"],
			"in_reply_to": msg.get("In-Reply-To"),
			"references": msg.get("References"),
			"body_text": self._get_body_text(msg),
			"body_html": self._get_body_html(msg),
			"attachments": self._get_attachments(msg),
		}

	def _get_body_text(self, msg: email.message.Message) -> str | None:
		if msg.is_multipart():
			for part in msg.walk():
				if part.get_content_type() == "text/plain":
					return part.get_content()
		elif msg.get_content_type() == "text/plain":
			return msg.get_content()
		return None

	def _get_body_html(self, msg: email.message.Message) -> str | None:
		if msg.is_multipart():
			for part in msg.walk():
				if part.get_content_type() == "text/html":
					return part.get_content()
		elif msg.get_content_type() == "text/html":
			return msg.get_content()
		return None

	def _get_attachments(self, msg: email.message.Message) -> list[dict]:
		attachments = []
		if msg.is_multipart():
			for part in msg.walk():
				if part.get_content_disposition() == "attachment":
					attachments.append({
						"filename": part.get_filename(),
						"content_type": part.get_content_type(),
						"content": part.get_content(),
					})
		return attachments


# Celery task for scheduled ingestion
@shared_task
def ingest_emails_from_imap():
	"""Periodically ingest emails from configured IMAP accounts"""
	accounts = db.get_configured_imap_accounts()

	for account in accounts:
		ingester = IMAPEmailIngester(
			host=account.host,
			username=account.username,
			password=account.password_decrypted,
		)

		try:
			await ingester.connect()
			emails = await ingester.fetch_new_emails(
				folder=account.folder,
				since=account.last_sync_at,
			)

			for email_data in emails:
				await process_and_store_email(
					email_data,
					target_folder_id=account.target_folder_id,
					user_id=account.owner_id,
				)

			# Update last sync time
			await db.update_imap_account_sync(account.id)

		finally:
			await ingester.disconnect()
```

### 14.10 Files to Create

```
dArchiva/
├── papermerge-core/
│   └── papermerge/core/
│       ├── routers/
│       │   └── emails.py           # Email ingestion API
│       ├── services/
│       │   ├── email_parser.py     # MIME parsing
│       │   └── email_imap.py       # IMAP ingestion
│       ├── db/
│       │   └── emails.py           # Email DB operations
│       └── tasks/
│           └── email_sync.py       # Scheduled sync
│
├── plugins/
│   ├── outlook-addin/              # Microsoft Outlook Add-in
│   │   ├── manifest.xml
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── taskpane/
│   │   │   │   ├── taskpane.html
│   │   │   │   └── components/
│   │   │   └── commands/
│   │   └── webpack.config.js
│   │
│   ├── gmail-extension/            # Chrome Extension
│   │   ├── manifest.json
│   │   ├── popup.html
│   │   ├── popup.js
│   │   ├── content.js
│   │   ├── content.css
│   │   ├── background.js
│   │   └── icons/
│   │
│   ├── gmail-workspace-addon/      # Google Workspace Add-on
│   │   ├── appsscript.json
│   │   └── Code.gs
│   │
│   └── thunderbird-extension/      # Thunderbird WebExtension
│       ├── manifest.json
│       └── src/
│
└── docs/
    └── email-integration.md        # Setup documentation
```

### 14.11 Email Document Rendering

Emails are converted to viewable/searchable documents:

```python
# papermerge-core/papermerge/core/services/email_renderer.py
from weasyprint import HTML
from jinja2 import Template

EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { border-bottom: 1px solid #ddd; padding-bottom: 15px; margin-bottom: 15px; }
        .field { margin: 5px 0; }
        .label { font-weight: bold; color: #666; }
        .body { margin-top: 20px; }
        .attachments { margin-top: 20px; border-top: 1px solid #ddd; padding-top: 15px; }
        .attachment { padding: 5px 10px; background: #f5f5f5; margin: 5px 0; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="field"><span class="label">From:</span> {{ from_name }} &lt;{{ from_address }}&gt;</div>
        <div class="field"><span class="label">To:</span> {{ to_addresses|join(', ') }}</div>
        {% if cc_addresses %}<div class="field"><span class="label">Cc:</span> {{ cc_addresses|join(', ') }}</div>{% endif %}
        <div class="field"><span class="label">Date:</span> {{ sent_at }}</div>
        <div class="field"><span class="label">Subject:</span> {{ subject }}</div>
    </div>

    <div class="body">
        {% if body_html %}
            {{ body_html|safe }}
        {% else %}
            <pre>{{ body_text }}</pre>
        {% endif %}
    </div>

    {% if attachments %}
    <div class="attachments">
        <strong>Attachments ({{ attachments|length }}):</strong>
        {% for att in attachments %}
        <div class="attachment">📎 {{ att.filename }} ({{ att.size_formatted }})</div>
        {% endfor %}
    </div>
    {% endif %}
</body>
</html>
"""

async def render_email_to_pdf(email_data: dict) -> bytes:
    """Render email as PDF document for storage/viewing"""
    template = Template(EMAIL_TEMPLATE)
    html_content = template.render(**email_data)
    return HTML(string=html_content).write_pdf()
```

---

## 15. External System Integration (Short URLs)

### 15.1 Overview

Enable documents to be referenced from external systems (ERPs, Legal, CRM) via permanent short URLs. When clicked, users see a read-only document viewer or are prompted to authenticate.

### 15.2 Database Schema

```sql
-- Short URL references for external access
CREATE TABLE document_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,

    -- Short code (the URL identifier)
    code VARCHAR(16) UNIQUE NOT NULL,  -- e.g., "d7k9m2x"
    slug VARCHAR(100),                  -- Optional human-readable slug

    -- Access control
    access_type VARCHAR(20) NOT NULL DEFAULT 'authenticated',
    -- authenticated: requires login
    -- public: anyone with link
    -- token: requires token in URL
    -- password: requires password

    access_token VARCHAR(64),           -- For token-based access
    password_hash VARCHAR(255),         -- For password-protected links
    allowed_emails JSONB DEFAULT '[]',  -- Restrict to specific emails

    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE,
    max_views INTEGER,                  -- NULL = unlimited
    view_count INTEGER DEFAULT 0,

    -- Permissions
    allow_download BOOLEAN DEFAULT FALSE,
    allow_print BOOLEAN DEFAULT FALSE,

    -- Metadata
    title VARCHAR(255),                 -- Override document title in viewer
    description TEXT,                   -- Description for recipient

    -- Tracking
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE,

    -- External reference (for linking back)
    external_system VARCHAR(100),       -- e.g., "sap", "salesforce", "clio"
    external_ref_id VARCHAR(255),       -- ID in external system
    external_ref_type VARCHAR(100)      -- e.g., "invoice", "contract", "matter"
);

-- Access log for audit trail
CREATE TABLE document_link_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    link_id UUID REFERENCES document_links(id) ON DELETE CASCADE,

    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    user_id UUID REFERENCES users(id),  -- If authenticated
    email VARCHAR(255),                  -- If email-restricted

    action VARCHAR(50) NOT NULL,        -- view, download, print
    success BOOLEAN DEFAULT TRUE,
    failure_reason VARCHAR(255)
);

CREATE INDEX idx_document_links_code ON document_links(code);
CREATE INDEX idx_document_links_external ON document_links(external_system, external_ref_id);
CREATE INDEX idx_document_links_document ON document_links(document_id);
```

### 15.3 Short Code Generation

```python
# papermerge-core/papermerge/core/services/short_urls.py
import secrets
import string
from datetime import datetime, timedelta
from uuid import UUID

# Alphabet excluding confusing characters (0/O, 1/l/I)
SHORT_CODE_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz"
SHORT_CODE_LENGTH = 7  # ~34^7 = 52 billion combinations


def generate_short_code() -> str:
	"""Generate a unique short code"""
	return ''.join(
		secrets.choice(SHORT_CODE_ALPHABET)
		for _ in range(SHORT_CODE_LENGTH)
	)


def generate_access_token() -> str:
	"""Generate secure access token for token-based links"""
	return secrets.token_urlsafe(32)


class ShortUrlService:
	def __init__(self, base_url: str):
		self.base_url = base_url.rstrip('/')

	async def create_link(
		self,
		document_id: UUID,
		created_by: UUID,
		access_type: str = "authenticated",
		expires_in_days: int | None = None,
		max_views: int | None = None,
		allow_download: bool = False,
		allow_print: bool = False,
		password: str | None = None,
		allowed_emails: list[str] | None = None,
		external_system: str | None = None,
		external_ref_id: str | None = None,
		external_ref_type: str | None = None,
		title: str | None = None,
		description: str | None = None,
	) -> DocumentLink:
		"""Create a new short URL for a document"""
		# Generate unique code
		code = generate_short_code()
		while await db.link_code_exists(code):
			code = generate_short_code()

		# Generate token if needed
		access_token = generate_access_token() if access_type == "token" else None

		# Hash password if provided
		password_hash = None
		if password:
			from passlib.hash import pbkdf2_sha256
			password_hash = pbkdf2_sha256.hash(password)

		# Calculate expiration
		expires_at = None
		if expires_in_days:
			expires_at = datetime.now(UTC) + timedelta(days=expires_in_days)

		link = DocumentLink(
			document_id=document_id,
			code=code,
			access_type=access_type,
			access_token=access_token,
			password_hash=password_hash,
			allowed_emails=allowed_emails or [],
			expires_at=expires_at,
			max_views=max_views,
			allow_download=allow_download,
			allow_print=allow_print,
			external_system=external_system,
			external_ref_id=external_ref_id,
			external_ref_type=external_ref_type,
			title=title,
			description=description,
			created_by=created_by,
		)

		await db.create_link(link)
		return link

	def get_url(self, link: DocumentLink) -> str:
		"""Get the full short URL"""
		url = f"{self.base_url}/d/{link.code}"
		if link.access_type == "token":
			url += f"?t={link.access_token}"
		return url

	async def access_link(
		self,
		code: str,
		token: str | None = None,
		password: str | None = None,
		user_id: UUID | None = None,
		email: str | None = None,
		ip_address: str | None = None,
		user_agent: str | None = None,
	) -> tuple[DocumentLink, Document] | None:
		"""Validate and access a link, returns document if authorized"""
		link = await db.get_link_by_code(code)
		if not link:
			return None

		# Check expiration
		if link.expires_at and datetime.now(UTC) > link.expires_at:
			await self._log_access(link.id, "view", False, "expired", ip_address, user_agent, user_id, email)
			return None

		# Check max views
		if link.max_views and link.view_count >= link.max_views:
			await self._log_access(link.id, "view", False, "max_views_exceeded", ip_address, user_agent, user_id, email)
			return None

		# Check access type
		if link.access_type == "authenticated":
			if not user_id:
				await self._log_access(link.id, "view", False, "auth_required", ip_address, user_agent)
				raise AuthenticationRequired()

		elif link.access_type == "token":
			if token != link.access_token:
				await self._log_access(link.id, "view", False, "invalid_token", ip_address, user_agent)
				return None

		elif link.access_type == "password":
			if not password:
				raise PasswordRequired()
			from passlib.hash import pbkdf2_sha256
			if not pbkdf2_sha256.verify(password, link.password_hash):
				await self._log_access(link.id, "view", False, "invalid_password", ip_address, user_agent)
				return None

		# Check email restrictions
		if link.allowed_emails and email not in link.allowed_emails:
			await self._log_access(link.id, "view", False, "email_not_allowed", ip_address, user_agent, user_id, email)
			return None

		# Success - increment view count and log
		await db.increment_link_view_count(link.id)
		await self._log_access(link.id, "view", True, None, ip_address, user_agent, user_id, email)

		# Get document
		document = await db.get_document(link.document_id)
		return (link, document)
```

### 15.4 API Endpoints

```python
# papermerge-core/papermerge/core/routers/links.py
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from uuid import UUID

router = APIRouter(prefix="/links", tags=["Document Links"])


@router.post("/")
async def create_document_link(
	document_id: UUID,
	access_type: str = "authenticated",
	expires_in_days: int | None = None,
	max_views: int | None = None,
	allow_download: bool = False,
	allow_print: bool = False,
	password: str | None = None,
	allowed_emails: list[str] | None = None,
	external_system: str | None = None,
	external_ref_id: str | None = None,
) -> DocumentLinkResponse:
	"""Create a short URL for document sharing"""
	link = await short_url_service.create_link(
		document_id=document_id,
		created_by=current_user.id,
		access_type=access_type,
		expires_in_days=expires_in_days,
		max_views=max_views,
		allow_download=allow_download,
		allow_print=allow_print,
		password=password,
		allowed_emails=allowed_emails,
		external_system=external_system,
		external_ref_id=external_ref_id,
	)

	return DocumentLinkResponse(
		id=link.id,
		code=link.code,
		url=short_url_service.get_url(link),
		access_type=link.access_type,
		expires_at=link.expires_at,
		view_count=0,
	)


@router.get("/{link_id}")
async def get_link_details(link_id: UUID) -> DocumentLinkResponse:
	"""Get link details and access statistics"""
	pass


@router.delete("/{link_id}")
async def revoke_link(link_id: UUID):
	"""Revoke/delete a document link"""
	await db.delete_link(link_id)
	return {"status": "revoked"}


@router.get("/{link_id}/access-log")
async def get_access_log(
	link_id: UUID,
	limit: int = 50,
) -> list[AccessLogEntry]:
	"""Get access history for a link"""
	return await db.get_link_access_log(link_id, limit=limit)


# Public viewer endpoint (separate router, no auth required by default)
public_router = APIRouter(prefix="/d", tags=["Public Viewer"])


@public_router.get("/{code}")
async def view_document(
	code: str,
	request: Request,
	t: str | None = Query(None),  # Token
	p: str | None = Query(None),  # Password
):
	"""
	Public document viewer endpoint.
	Returns HTML viewer page or redirect to login.
	"""
	try:
		result = await short_url_service.access_link(
			code=code,
			token=t,
			password=p,
			user_id=getattr(request.state, 'user_id', None),
			ip_address=request.client.host,
			user_agent=request.headers.get('user-agent'),
		)
	except AuthenticationRequired:
		# Redirect to login with return URL
		return RedirectResponse(f"/login?next=/d/{code}")
	except PasswordRequired:
		# Render password prompt page
		return templates.TemplateResponse("password_prompt.html", {"code": code})

	if not result:
		raise HTTPException(status_code=404, detail="Link not found or expired")

	link, document = result

	# Render viewer
	return templates.TemplateResponse("document_viewer.html", {
		"document": document,
		"link": link,
		"allow_download": link.allow_download,
		"allow_print": link.allow_print,
	})


@public_router.get("/{code}/pdf")
async def get_document_pdf(
	code: str,
	request: Request,
	t: str | None = None,
):
	"""Stream document PDF for viewer"""
	result = await short_url_service.access_link(code=code, token=t, ...)
	if not result:
		raise HTTPException(404)

	link, document = result

	# Stream PDF from storage
	pdf_stream = await storage.get_document_pdf(document.id)
	return StreamingResponse(
		pdf_stream,
		media_type="application/pdf",
		headers={
			"Content-Disposition": f'inline; filename="{document.title}.pdf"'
		}
	)
```

### 15.5 Embeddable Viewer Widget

```html
<!-- External systems can embed this iframe -->
<iframe
  src="https://darchiva.example.com/d/abc123?embed=1"
  width="100%"
  height="600"
  frameborder="0"
></iframe>

<!-- Or use the JavaScript widget -->
<div id="darchiva-viewer" data-code="abc123"></div>
<script src="https://darchiva.example.com/widget.js"></script>
<script>
  DArchiva.embed('#darchiva-viewer', {
    token: 'optional-token',
    showToolbar: true,
    allowDownload: false,
  })
</script>
```

---

## 16. Document Bundles & Binders

### 16.1 Overview

Organize related documents into ordered collections (bundles/binders) for cases, matters, projects, or transactions. Bundles maintain document order and support hierarchical organization.

### 16.2 Database Schema

```sql
-- Document bundles/binders
CREATE TABLE bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),

    -- Bundle metadata
    title VARCHAR(255) NOT NULL,
    description TEXT,
    bundle_type VARCHAR(50) DEFAULT 'general',  -- general, legal_matter, transaction, project

    -- Reference to external systems
    external_system VARCHAR(100),
    external_ref_id VARCHAR(255),
    external_ref_type VARCHAR(100),

    -- Cover page settings
    cover_title VARCHAR(255),
    cover_subtitle VARCHAR(255),
    cover_date DATE,
    cover_reference VARCHAR(100),
    show_table_of_contents BOOLEAN DEFAULT TRUE,

    -- Status
    status VARCHAR(20) DEFAULT 'draft',  -- draft, active, closed, archived
    locked BOOLEAN DEFAULT FALSE,        -- Prevent modifications
    locked_by UUID REFERENCES users(id),
    locked_at TIMESTAMP WITH TIME ZONE,

    -- Sharing
    is_shared BOOLEAN DEFAULT FALSE,
    share_link_id UUID REFERENCES document_links(id),

    -- Audit
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bundle sections (for hierarchical organization)
CREATE TABLE bundle_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id UUID REFERENCES bundles(id) ON DELETE CASCADE,
    parent_section_id UUID REFERENCES bundle_sections(id) ON DELETE CASCADE,

    title VARCHAR(255) NOT NULL,
    description TEXT,
    section_order INTEGER NOT NULL,

    -- Numbering (e.g., "1", "1.2", "A", "Tab 1")
    number_prefix VARCHAR(20),
    number_style VARCHAR(20) DEFAULT 'numeric',  -- numeric, alpha, roman, tab

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents in bundle (with ordering)
CREATE TABLE bundle_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id UUID REFERENCES bundles(id) ON DELETE CASCADE,
    section_id UUID REFERENCES bundle_sections(id) ON DELETE SET NULL,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,

    -- Ordering within section (or bundle if no section)
    sort_order INTEGER NOT NULL,

    -- Display options
    display_title VARCHAR(255),         -- Override document title
    page_number_start INTEGER,          -- For continuous pagination
    include_in_toc BOOLEAN DEFAULT TRUE,
    separator_page BOOLEAN DEFAULT FALSE,  -- Insert blank page before

    -- Annotations
    notes TEXT,
    exhibit_number VARCHAR(50),         -- Legal: "Exhibit A", "Tab 3"

    added_by UUID REFERENCES users(id),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(bundle_id, document_id)      -- Document can only appear once in bundle
);

-- Bundle access permissions (in addition to document permissions)
CREATE TABLE bundle_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id UUID REFERENCES bundles(id) ON DELETE CASCADE,

    -- Subject (user or group)
    subject_type VARCHAR(20) NOT NULL,  -- user, group
    subject_id UUID NOT NULL,

    -- Permission level
    permission VARCHAR(20) NOT NULL,    -- view, edit, admin

    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(bundle_id, subject_type, subject_id)
);

CREATE INDEX idx_bundle_documents_order ON bundle_documents(bundle_id, section_id, sort_order);
CREATE INDEX idx_bundle_sections_order ON bundle_sections(bundle_id, parent_section_id, section_order);
```

### 16.3 Pydantic Models

```python
# papermerge-core/papermerge/core/schema/bundles.py
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field
from uuid_extensions import uuid7str


class BundleCreate(BaseModel):
	title: str
	description: str | None = None
	bundle_type: str = "general"

	# External reference
	external_system: str | None = None
	external_ref_id: str | None = None

	# Cover page
	cover_title: str | None = None
	cover_subtitle: str | None = None
	show_table_of_contents: bool = True

	model_config = ConfigDict(extra="forbid")


class BundleSection(BaseModel):
	id: str = Field(default_factory=uuid7str)
	title: str
	description: str | None = None
	section_order: int
	number_prefix: str | None = None
	number_style: str = "numeric"
	parent_section_id: str | None = None
	documents: list["BundleDocumentItem"] = []
	subsections: list["BundleSection"] = []

	model_config = ConfigDict(extra="forbid", from_attributes=True)


class BundleDocumentItem(BaseModel):
	id: str
	document_id: str
	display_title: str
	original_title: str
	sort_order: int
	page_count: int
	exhibit_number: str | None = None
	notes: str | None = None
	thumbnail_url: str | None = None

	model_config = ConfigDict(extra="forbid", from_attributes=True)


class Bundle(BaseModel):
	id: str = Field(default_factory=uuid7str)
	title: str
	description: str | None = None
	bundle_type: str
	status: str

	document_count: int = 0
	total_pages: int = 0

	sections: list[BundleSection] = []
	documents: list[BundleDocumentItem] = []  # Top-level (no section)

	cover_title: str | None = None
	show_table_of_contents: bool = True

	is_locked: bool = False
	share_url: str | None = None

	created_at: datetime
	updated_at: datetime

	model_config = ConfigDict(extra="forbid", from_attributes=True)


class BundleReorder(BaseModel):
	"""Reorder documents or sections"""
	items: list[dict]  # [{id: str, sort_order: int, section_id: str | None}]

	model_config = ConfigDict(extra="forbid")
```

### 16.4 API Endpoints

```python
# papermerge-core/papermerge/core/routers/bundles.py
from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID

router = APIRouter(prefix="/bundles", tags=["Document Bundles"])


@router.post("/")
async def create_bundle(bundle: BundleCreate) -> Bundle:
	"""Create a new document bundle"""
	pass


@router.get("/")
async def list_bundles(
	status: str | None = None,
	bundle_type: str | None = None,
	limit: int = 20,
	offset: int = 0,
) -> list[Bundle]:
	"""List bundles accessible to current user"""
	pass


@router.get("/{bundle_id}")
async def get_bundle(bundle_id: UUID) -> Bundle:
	"""Get bundle with all sections and documents"""
	pass


@router.patch("/{bundle_id}")
async def update_bundle(bundle_id: UUID, update: BundleUpdate) -> Bundle:
	"""Update bundle metadata"""
	pass


@router.delete("/{bundle_id}")
async def delete_bundle(bundle_id: UUID):
	"""Delete bundle (documents are preserved)"""
	pass


# Section management
@router.post("/{bundle_id}/sections")
async def add_section(bundle_id: UUID, section: SectionCreate) -> BundleSection:
	"""Add a section to bundle"""
	pass


@router.patch("/{bundle_id}/sections/{section_id}")
async def update_section(
	bundle_id: UUID,
	section_id: UUID,
	update: SectionUpdate,
) -> BundleSection:
	"""Update section metadata"""
	pass


@router.delete("/{bundle_id}/sections/{section_id}")
async def remove_section(bundle_id: UUID, section_id: UUID):
	"""Remove section (moves documents to bundle root)"""
	pass


# Document management
@router.post("/{bundle_id}/documents")
async def add_document_to_bundle(
	bundle_id: UUID,
	document_id: UUID,
	section_id: UUID | None = None,
	display_title: str | None = None,
	exhibit_number: str | None = None,
	insert_at: int | None = None,  # Position, None = append
) -> BundleDocumentItem:
	"""Add a document to bundle"""
	# Check if document already in bundle
	existing = await db.get_bundle_document(bundle_id, document_id)
	if existing:
		raise HTTPException(400, "Document already in bundle")

	# Calculate sort order
	if insert_at is not None:
		# Shift existing documents down
		await db.shift_bundle_documents(bundle_id, section_id, insert_at)
		sort_order = insert_at
	else:
		# Append to end
		sort_order = await db.get_next_sort_order(bundle_id, section_id)

	item = await db.add_bundle_document(
		bundle_id=bundle_id,
		document_id=document_id,
		section_id=section_id,
		sort_order=sort_order,
		display_title=display_title,
		exhibit_number=exhibit_number,
	)
	return item


@router.delete("/{bundle_id}/documents/{document_id}")
async def remove_document_from_bundle(bundle_id: UUID, document_id: UUID):
	"""Remove document from bundle"""
	await db.remove_bundle_document(bundle_id, document_id)
	# Reorder remaining documents
	await db.normalize_bundle_order(bundle_id)


@router.post("/{bundle_id}/reorder")
async def reorder_bundle(bundle_id: UUID, reorder: BundleReorder):
	"""
	Reorder documents and/or sections in bundle.
	Accepts list of items with new positions.
	"""
	for item in reorder.items:
		await db.update_bundle_item_order(
			bundle_id=bundle_id,
			item_id=item["id"],
			sort_order=item["sort_order"],
			section_id=item.get("section_id"),
		)


# Bulk operations
@router.post("/{bundle_id}/documents/bulk")
async def bulk_add_documents(
	bundle_id: UUID,
	document_ids: list[UUID],
	section_id: UUID | None = None,
) -> list[BundleDocumentItem]:
	"""Add multiple documents to bundle at once"""
	items = []
	sort_order = await db.get_next_sort_order(bundle_id, section_id)

	for doc_id in document_ids:
		item = await db.add_bundle_document(
			bundle_id=bundle_id,
			document_id=doc_id,
			section_id=section_id,
			sort_order=sort_order,
		)
		items.append(item)
		sort_order += 1

	return items


# Export
@router.get("/{bundle_id}/export/pdf")
async def export_bundle_as_pdf(
	bundle_id: UUID,
	include_cover: bool = True,
	include_toc: bool = True,
	include_separators: bool = True,
) -> StreamingResponse:
	"""
	Export bundle as single merged PDF.
	Includes cover page, table of contents, and all documents in order.
	"""
	bundle = await db.get_bundle(bundle_id)
	pdf = await generate_bundle_pdf(bundle, include_cover, include_toc, include_separators)

	return StreamingResponse(
		pdf,
		media_type="application/pdf",
		headers={
			"Content-Disposition": f'attachment; filename="{bundle.title}.pdf"'
		}
	)


# Sharing
@router.post("/{bundle_id}/share")
async def create_bundle_share_link(
	bundle_id: UUID,
	access_type: str = "authenticated",
	expires_in_days: int | None = None,
) -> DocumentLinkResponse:
	"""Create shareable link for entire bundle"""
	pass
```

### 16.5 Bundle PDF Generation

```python
# papermerge-core/papermerge/core/services/bundle_export.py
from weasyprint import HTML
from pypdf import PdfWriter, PdfReader
from io import BytesIO


async def generate_bundle_pdf(
	bundle: Bundle,
	include_cover: bool = True,
	include_toc: bool = True,
	include_separators: bool = True,
) -> bytes:
	"""Generate merged PDF of all bundle documents"""
	writer = PdfWriter()
	page_number = 1
	toc_entries = []

	# Add cover page
	if include_cover:
		cover_pdf = generate_cover_page(bundle)
		writer.append(PdfReader(BytesIO(cover_pdf)))
		page_number += 1

	# Build document order (respecting sections)
	ordered_docs = get_ordered_documents(bundle)

	# Generate TOC entries
	for doc in ordered_docs:
		toc_entries.append({
			"title": doc.display_title,
			"exhibit": doc.exhibit_number,
			"page": page_number,
		})
		page_number += doc.page_count

	# Add TOC page
	if include_toc and toc_entries:
		toc_pdf = generate_toc_page(bundle.title, toc_entries)
		# Insert after cover
		toc_reader = PdfReader(BytesIO(toc_pdf))
		for i, page in enumerate(toc_reader.pages):
			writer.insert_page(page, 1 + i)

	# Add documents
	for doc in ordered_docs:
		# Add separator page if requested
		if include_separators and doc.separator_page:
			separator_pdf = generate_separator_page(doc.exhibit_number, doc.display_title)
			writer.append(PdfReader(BytesIO(separator_pdf)))

		# Get document PDF from storage
		doc_pdf = await storage.get_document_pdf(doc.document_id)
		writer.append(PdfReader(BytesIO(doc_pdf)))

	# Write to bytes
	output = BytesIO()
	writer.write(output)
	return output.getvalue()


def get_ordered_documents(bundle: Bundle) -> list[BundleDocumentItem]:
	"""Get flat list of documents in correct order"""
	result = []

	def add_section(section: BundleSection):
		# Add section's documents
		for doc in sorted(section.documents, key=lambda d: d.sort_order):
			result.append(doc)
		# Recurse into subsections
		for subsection in sorted(section.subsections, key=lambda s: s.section_order):
			add_section(subsection)

	# Add top-level documents first
	for doc in sorted(bundle.documents, key=lambda d: d.sort_order):
		result.append(doc)

	# Then add section documents
	for section in sorted(bundle.sections, key=lambda s: s.section_order):
		add_section(section)

	return result


def generate_cover_page(bundle: Bundle) -> bytes:
	"""Generate PDF cover page"""
	html = f"""
	<!DOCTYPE html>
	<html>
	<head>
		<style>
			@page {{ size: letter; margin: 2in; }}
			body {{ font-family: Georgia, serif; text-align: center; }}
			.title {{ font-size: 28pt; font-weight: bold; margin-top: 3in; }}
			.subtitle {{ font-size: 18pt; color: #666; margin-top: 20px; }}
			.date {{ font-size: 14pt; margin-top: 40px; }}
			.reference {{ font-size: 12pt; color: #888; margin-top: 20px; }}
		</style>
	</head>
	<body>
		<div class="title">{bundle.cover_title or bundle.title}</div>
		{f'<div class="subtitle">{bundle.cover_subtitle}</div>' if bundle.cover_subtitle else ''}
		{f'<div class="date">{bundle.cover_date}</div>' if bundle.cover_date else ''}
		{f'<div class="reference">{bundle.cover_reference}</div>' if bundle.cover_reference else ''}
	</body>
	</html>
	"""
	return HTML(string=html).write_pdf()


def generate_toc_page(title: str, entries: list[dict]) -> bytes:
	"""Generate PDF table of contents"""
	rows = "\n".join([
		f'<tr><td class="exhibit">{e.get("exhibit", "")}</td>'
		f'<td class="title">{e["title"]}</td>'
		f'<td class="page">{e["page"]}</td></tr>'
		for e in entries
	])

	html = f"""
	<!DOCTYPE html>
	<html>
	<head>
		<style>
			@page {{ size: letter; margin: 1in; }}
			body {{ font-family: Arial, sans-serif; }}
			h1 {{ font-size: 18pt; text-align: center; margin-bottom: 30px; }}
			table {{ width: 100%; border-collapse: collapse; }}
			th, td {{ padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }}
			.exhibit {{ width: 80px; }}
			.page {{ width: 50px; text-align: right; }}
		</style>
	</head>
	<body>
		<h1>Table of Contents</h1>
		<table>
			<thead>
				<tr>
					<th class="exhibit">Exhibit</th>
					<th class="title">Document</th>
					<th class="page">Page</th>
				</tr>
			</thead>
			<tbody>
				{rows}
			</tbody>
		</table>
	</body>
	</html>
	"""
	return HTML(string=html).write_pdf()
```

### 16.6 Frontend Bundle Manager

```tsx
// papermerge-core/frontend/apps/ui/src/features/bundles/BundleEditor.tsx
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { Card, Stack, Group, Text, ActionIcon, Badge, Menu } from "@mantine/core"
import { IconGripVertical, IconTrash, IconFolderPlus, IconPlus } from "@tabler/icons-react"

interface BundleEditorProps {
	bundleId: string
}

export function BundleEditor({ bundleId }: BundleEditorProps) {
	const { data: bundle, refetch } = useBundle(bundleId)
	const reorderMutation = useReorderBundle(bundleId)

	if (!bundle) return null

	const handleDragEnd = async (event: DragEndEvent) => {
		const { active, over } = event
		if (!over || active.id === over.id) return

		// Calculate new order
		const newOrder = calculateNewOrder(bundle, active.id, over.id)
		await reorderMutation.mutateAsync(newOrder)
		refetch()
	}

	return (
		<Stack>
			{/* Bundle header */}
			<Group justify="space-between">
				<div>
					<Text size="xl" fw="bold">{bundle.title}</Text>
					<Text c="dimmed">{bundle.document_count} documents, {bundle.total_pages} pages</Text>
				</div>
				<Group>
					<Button leftSection={<IconPlus />} onClick={() => openAddDocumentModal(bundleId)}>
						Add Document
					</Button>
					<Button leftSection={<IconFolderPlus />} onClick={() => openAddSectionModal(bundleId)}>
						Add Section
					</Button>
					<Menu>
						<Menu.Target>
							<Button variant="outline">Export</Button>
						</Menu.Target>
						<Menu.Dropdown>
							<Menu.Item onClick={() => exportBundle(bundleId, "pdf")}>Export as PDF</Menu.Item>
							<Menu.Item onClick={() => exportBundle(bundleId, "zip")}>Export as ZIP</Menu.Item>
						</Menu.Dropdown>
					</Menu>
				</Group>
			</Group>

			{/* Drag-and-drop document list */}
			<DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
				<SortableContext items={getAllItems(bundle)} strategy={verticalListSortingStrategy}>
					{/* Sections */}
					{bundle.sections.map((section) => (
						<SectionCard key={section.id} section={section} bundleId={bundleId} />
					))}

					{/* Top-level documents */}
					{bundle.documents.map((doc) => (
						<DocumentCard key={doc.id} document={doc} bundleId={bundleId} />
					))}
				</SortableContext>
			</DndContext>
		</Stack>
	)
}

function DocumentCard({ document, bundleId }: { document: BundleDocumentItem; bundleId: string }) {
	const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: document.id })
	const removeMutation = useRemoveFromBundle(bundleId)

	const style = {
		transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
		transition,
	}

	return (
		<Card ref={setNodeRef} style={style} withBorder p="sm">
			<Group>
				<ActionIcon {...attributes} {...listeners} variant="subtle">
					<IconGripVertical size={16} />
				</ActionIcon>

				{document.exhibit_number && (
					<Badge variant="outline">{document.exhibit_number}</Badge>
				)}

				<div style={{ flex: 1 }}>
					<Text fw={500}>{document.display_title}</Text>
					<Text size="xs" c="dimmed">{document.page_count} pages</Text>
				</div>

				<ActionIcon
					variant="subtle"
					color="red"
					onClick={() => removeMutation.mutate(document.document_id)}
				>
					<IconTrash size={16} />
				</ActionIcon>
			</Group>
		</Card>
	)
}

function SectionCard({ section, bundleId }: { section: BundleSection; bundleId: string }) {
	return (
		<Card withBorder>
			<Text fw="bold" mb="sm">
				{section.number_prefix} {section.title}
			</Text>
			<Stack gap="xs" pl="md">
				{section.documents.map((doc) => (
					<DocumentCard key={doc.id} document={doc} bundleId={bundleId} />
				))}
			</Stack>
		</Card>
	)
}
```

### 16.7 Files to Create

```
papermerge-core/
├── papermerge/core/
│   ├── routers/
│   │   ├── links.py              # Short URL endpoints
│   │   └── bundles.py            # Bundle endpoints
│   ├── services/
│   │   ├── short_urls.py         # Short URL service
│   │   └── bundle_export.py      # Bundle PDF generation
│   ├── db/
│   │   ├── links.py              # Link DB operations
│   │   └── bundles.py            # Bundle DB operations
│   └── templates/
│       ├── document_viewer.html  # Public viewer page
│       ├── password_prompt.html  # Password entry page
│       └── widget.js             # Embeddable viewer widget
│
├── frontend/apps/ui/src/
│   ├── features/
│   │   ├── links/
│   │   │   ├── CreateLinkModal.tsx
│   │   │   ├── LinkList.tsx
│   │   │   └── api.ts
│   │   └── bundles/
│   │       ├── BundleEditor.tsx
│   │       ├── BundleList.tsx
│   │       ├── AddDocumentModal.tsx
│   │       ├── SectionManager.tsx
│   │       └── api.ts
│   └── routes/
│       └── bundles.tsx
```

---

## 17. Cases & Portfolios (Hierarchical Organization)

### 17.1 Overview

Support hierarchical organization of documents with access control at every level:

```
Portfolio (top-level container)
 └── Case (matter, project, transaction)
      └── Binder/Bundle (ordered document collection)
           └── Document
                └── Page
```

**Access Control Inheritance:**
- Portfolio permissions cascade to cases (unless overridden)
- Case permissions cascade to binders (unless overridden)
- Binder permissions cascade to documents (unless overridden)
- Document permissions cascade to pages (unless overridden)
- Any level can override inherited permissions

### 17.2 Database Schema

```sql
-- Portfolios (top-level organizational unit)
CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),

    -- Metadata
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,              -- Short code like "PORT-2024-001"
    description TEXT,
    portfolio_type VARCHAR(50) DEFAULT 'general',  -- general, litigation, m&a, real_estate

    -- Status
    status VARCHAR(20) DEFAULT 'active',   -- active, closed, archived

    -- External reference
    external_system VARCHAR(100),
    external_ref_id VARCHAR(255),

    -- Audit
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cases (matters, projects, transactions)
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE SET NULL,

    -- Metadata
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,              -- Short code like "CASE-2024-0042"
    description TEXT,
    case_type VARCHAR(50) DEFAULT 'general',

    -- Status
    status VARCHAR(20) DEFAULT 'open',    -- open, pending, closed, archived
    priority INTEGER DEFAULT 5,           -- 1 = highest

    -- Key dates
    opened_date DATE,
    closed_date DATE,
    due_date DATE,

    -- External reference
    external_system VARCHAR(100),         -- e.g., "clio", "matter_center"
    external_ref_id VARCHAR(255),

    -- Audit
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Link bundles to cases
ALTER TABLE bundles ADD COLUMN case_id UUID REFERENCES cases(id) ON DELETE SET NULL;

-- Link standalone documents to cases (when not in a bundle)
CREATE TABLE case_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,

    sort_order INTEGER,
    added_by UUID REFERENCES users(id),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(case_id, document_id)
);

-- Unified access control for all resource types
CREATE TABLE resource_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Resource being protected
    resource_type VARCHAR(30) NOT NULL,   -- portfolio, case, bundle, document, page
    resource_id UUID NOT NULL,

    -- Who has access
    subject_type VARCHAR(20) NOT NULL,    -- user, group, role
    subject_id UUID NOT NULL,

    -- Permission level
    permission_level VARCHAR(20) NOT NULL, -- none, view, download, print, edit, admin

    -- Granular controls
    allow_view BOOLEAN DEFAULT TRUE,
    allow_download BOOLEAN DEFAULT FALSE,
    allow_print BOOLEAN DEFAULT FALSE,
    allow_edit BOOLEAN DEFAULT FALSE,
    allow_share BOOLEAN DEFAULT FALSE,
    allow_delete BOOLEAN DEFAULT FALSE,

    -- Temporal constraints
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    max_views INTEGER,                    -- NULL = unlimited
    view_count INTEGER DEFAULT 0,

    -- Single view access
    single_view BOOLEAN DEFAULT FALSE,    -- Revoke after first view
    single_view_used BOOLEAN DEFAULT FALSE,

    -- Inheritance
    inherit_from_parent BOOLEAN DEFAULT TRUE,
    override_parent BOOLEAN DEFAULT FALSE,

    -- Audit
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES users(id),

    UNIQUE(resource_type, resource_id, subject_type, subject_id)
);

-- Comprehensive access audit log
CREATE TABLE access_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What was accessed
    resource_type VARCHAR(30) NOT NULL,
    resource_id UUID NOT NULL,
    resource_name VARCHAR(255),           -- For historical reference

    -- Context (parent resources)
    portfolio_id UUID,
    case_id UUID,
    bundle_id UUID,
    document_id UUID,
    page_number INTEGER,

    -- Who accessed
    user_id UUID REFERENCES users(id),
    user_email VARCHAR(255),
    user_name VARCHAR(255),

    -- How they accessed
    access_method VARCHAR(50) NOT NULL,   -- direct, share_link, api, embed
    link_id UUID REFERENCES document_links(id),

    -- What action
    action VARCHAR(30) NOT NULL,          -- view, download, print, edit, share, delete
    action_detail JSONB,                  -- Additional action-specific data

    -- Request context
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),

    -- Result
    success BOOLEAN DEFAULT TRUE,
    failure_reason VARCHAR(255),

    -- Timestamp
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX idx_resource_access_resource ON resource_access(resource_type, resource_id);
CREATE INDEX idx_resource_access_subject ON resource_access(subject_type, subject_id);
CREATE INDEX idx_access_audit_resource ON access_audit_log(resource_type, resource_id);
CREATE INDEX idx_access_audit_user ON access_audit_log(user_id, accessed_at);
CREATE INDEX idx_access_audit_time ON access_audit_log(accessed_at);
```

### 17.3 Hierarchical Access Resolution

```python
# papermerge-core/papermerge/core/services/access_control.py
from dataclasses import dataclass
from uuid import UUID
from enum import Enum, auto


class ResourceType(str, Enum):
	PORTFOLIO = "portfolio"
	CASE = "case"
	BUNDLE = "bundle"
	DOCUMENT = "document"
	PAGE = "page"


class Permission(str, Enum):
	NONE = "none"
	VIEW = "view"
	DOWNLOAD = "download"
	PRINT = "print"
	EDIT = "edit"
	ADMIN = "admin"


@dataclass
class AccessDecision:
	allowed: bool
	can_view: bool = False
	can_download: bool = False
	can_print: bool = False
	can_edit: bool = False
	can_share: bool = False
	can_delete: bool = False
	reason: str = ""
	expires_at: datetime | None = None
	views_remaining: int | None = None


class HierarchicalAccessResolver:
	"""
	Resolves access permissions by walking the resource hierarchy.

	Resolution order:
	1. Check explicit permission on target resource
	2. If inherit_from_parent, check parent resource
	3. Continue up the hierarchy until a decision is made
	4. If no explicit permissions found, deny access
	"""

	async def check_access(
		self,
		user_id: UUID,
		resource_type: ResourceType,
		resource_id: UUID,
		action: str = "view",
	) -> AccessDecision:
		"""Check if user can perform action on resource"""
		# Get user's groups and roles
		user_groups = await db.get_user_groups(user_id)
		user_roles = await db.get_user_roles(user_id)

		# Build subject list
		subjects = [
			("user", user_id),
			*[("group", g.id) for g in user_groups],
			*[("role", r.id) for r in user_roles],
		]

		# Walk the hierarchy
		return await self._resolve_access(
			subjects=subjects,
			resource_type=resource_type,
			resource_id=resource_id,
			action=action,
		)

	async def _resolve_access(
		self,
		subjects: list[tuple[str, UUID]],
		resource_type: ResourceType,
		resource_id: UUID,
		action: str,
	) -> AccessDecision:
		"""Recursively resolve access through hierarchy"""

		# Check explicit permissions on this resource
		for subject_type, subject_id in subjects:
			access = await db.get_resource_access(
				resource_type=resource_type,
				resource_id=resource_id,
				subject_type=subject_type,
				subject_id=subject_id,
			)

			if access:
				# Check temporal constraints
				now = datetime.now(UTC)
				if access.valid_from and now < access.valid_from:
					continue
				if access.valid_until and now > access.valid_until:
					return AccessDecision(allowed=False, reason="Access expired")

				# Check view limits
				if access.max_views and access.view_count >= access.max_views:
					return AccessDecision(allowed=False, reason="View limit exceeded")

				# Check single view
				if access.single_view and access.single_view_used:
					return AccessDecision(allowed=False, reason="Single view already used")

				# Override parent - use this permission only
				if access.override_parent:
					return self._build_decision(access, action)

				# Explicit grant found
				return self._build_decision(access, action)

		# No explicit permission - check parent if inheritance enabled
		parent = await self._get_parent_resource(resource_type, resource_id)
		if parent:
			# Check if any access record has inherit_from_parent = True
			for subject_type, subject_id in subjects:
				access = await db.get_resource_access(
					resource_type=resource_type,
					resource_id=resource_id,
					subject_type=subject_type,
					subject_id=subject_id,
				)
				if access and not access.inherit_from_parent:
					# Inheritance disabled, deny access
					return AccessDecision(allowed=False, reason="No permission")

			# Recurse to parent
			return await self._resolve_access(
				subjects=subjects,
				resource_type=parent[0],
				resource_id=parent[1],
				action=action,
			)

		# No parent, no explicit permission - deny
		return AccessDecision(allowed=False, reason="No permission")

	async def _get_parent_resource(
		self,
		resource_type: ResourceType,
		resource_id: UUID,
	) -> tuple[ResourceType, UUID] | None:
		"""Get parent resource in hierarchy"""
		if resource_type == ResourceType.PAGE:
			# Page -> Document
			page = await db.get_page(resource_id)
			if page:
				return (ResourceType.DOCUMENT, page.document_id)

		elif resource_type == ResourceType.DOCUMENT:
			# Document -> Bundle (if in bundle) or Case
			bundle_doc = await db.get_bundle_document_by_doc(resource_id)
			if bundle_doc:
				return (ResourceType.BUNDLE, bundle_doc.bundle_id)
			case_doc = await db.get_case_document_by_doc(resource_id)
			if case_doc:
				return (ResourceType.CASE, case_doc.case_id)

		elif resource_type == ResourceType.BUNDLE:
			# Bundle -> Case
			bundle = await db.get_bundle(resource_id)
			if bundle and bundle.case_id:
				return (ResourceType.CASE, bundle.case_id)

		elif resource_type == ResourceType.CASE:
			# Case -> Portfolio
			case = await db.get_case(resource_id)
			if case and case.portfolio_id:
				return (ResourceType.PORTFOLIO, case.portfolio_id)

		return None

	def _build_decision(self, access: ResourceAccess, action: str) -> AccessDecision:
		"""Build decision from access record"""
		action_allowed = {
			"view": access.allow_view,
			"download": access.allow_download,
			"print": access.allow_print,
			"edit": access.allow_edit,
			"share": access.allow_share,
			"delete": access.allow_delete,
		}.get(action, False)

		return AccessDecision(
			allowed=action_allowed,
			can_view=access.allow_view,
			can_download=access.allow_download,
			can_print=access.allow_print,
			can_edit=access.allow_edit,
			can_share=access.allow_share,
			can_delete=access.allow_delete,
			expires_at=access.valid_until,
			views_remaining=(
				access.max_views - access.view_count
				if access.max_views else None
			),
		)


# Decorator for endpoint protection
def require_access(
	resource_type: ResourceType,
	action: str = "view",
):
	"""Decorator to require access to a resource"""
	def decorator(func):
		@wraps(func)
		async def wrapper(*args, **kwargs):
			resource_id = kwargs.get("resource_id") or kwargs.get(f"{resource_type.value}_id")
			current_user = kwargs.get("current_user")

			resolver = HierarchicalAccessResolver()
			decision = await resolver.check_access(
				user_id=current_user.id,
				resource_type=resource_type,
				resource_id=resource_id,
				action=action,
			)

			if not decision.allowed:
				raise HTTPException(
					status_code=403,
					detail=decision.reason or "Access denied"
				)

			# Audit the access
			await audit_access(
				resource_type=resource_type,
				resource_id=resource_id,
				user_id=current_user.id,
				action=action,
				success=True,
			)

			return await func(*args, **kwargs)
		return wrapper
	return decorator
```

### 17.4 Single View Access

```python
# papermerge-core/papermerge/core/services/single_view.py
from uuid import UUID
from datetime import datetime, timedelta


async def create_single_view_access(
	resource_type: str,
	resource_id: UUID,
	recipient_email: str,
	expires_in_hours: int = 24,
	created_by: UUID,
) -> str:
	"""
	Create a single-view access token for a resource.
	After one view, access is automatically revoked.
	"""
	expires_at = datetime.now(UTC) + timedelta(hours=expires_in_hours)

	# Create access record
	access = ResourceAccess(
		resource_type=resource_type,
		resource_id=resource_id,
		subject_type="email",
		subject_id=recipient_email,  # Use email as identifier
		allow_view=True,
		allow_download=False,
		allow_print=False,
		valid_until=expires_at,
		single_view=True,
		single_view_used=False,
		granted_by=created_by,
	)
	await db.create_resource_access(access)

	# Create unique access link
	token = generate_access_token()
	link = DocumentLink(
		document_id=resource_id if resource_type == "document" else None,
		resource_type=resource_type,
		resource_id=resource_id,
		code=generate_short_code(),
		access_type="single_view",
		access_token=token,
		allowed_emails=[recipient_email],
		expires_at=expires_at,
		max_views=1,
		allow_download=False,
		allow_print=False,
		created_by=created_by,
	)
	await db.create_link(link)

	return f"{BASE_URL}/d/{link.code}?t={token}"


async def consume_single_view(link_id: UUID, resource_type: str, resource_id: UUID):
	"""Mark single view as used"""
	await db.execute("""
		UPDATE resource_access
		SET single_view_used = TRUE
		WHERE resource_type = :type
		  AND resource_id = :id
		  AND single_view = TRUE
	""", {"type": resource_type, "id": resource_id})

	await db.execute("""
		UPDATE document_links
		SET view_count = view_count + 1
		WHERE id = :link_id
	""", {"link_id": link_id})
```

### 17.5 Access Audit Service

```python
# papermerge-core/papermerge/core/services/audit.py
from uuid import UUID
from datetime import datetime
from typing import Any


class AuditService:
	"""Comprehensive access audit logging"""

	async def log_access(
		self,
		resource_type: str,
		resource_id: UUID,
		user_id: UUID | None,
		action: str,
		success: bool,
		request: Request | None = None,
		link_id: UUID | None = None,
		action_detail: dict[str, Any] | None = None,
		failure_reason: str | None = None,
	):
		"""Log any access to a resource"""
		# Get resource name for historical reference
		resource_name = await self._get_resource_name(resource_type, resource_id)

		# Get hierarchy context
		context = await self._get_hierarchy_context(resource_type, resource_id)

		# Get user info
		user_email = None
		user_name = None
		if user_id:
			user = await db.get_user(user_id)
			if user:
				user_email = user.email
				user_name = f"{user.first_name} {user.last_name}"

		# Determine access method
		access_method = "direct"
		if link_id:
			access_method = "share_link"
		elif request and "/api/" in request.url.path:
			access_method = "api"
		elif request and request.query_params.get("embed"):
			access_method = "embed"

		# Create audit record
		log_entry = AccessAuditLog(
			resource_type=resource_type,
			resource_id=resource_id,
			resource_name=resource_name,
			portfolio_id=context.get("portfolio_id"),
			case_id=context.get("case_id"),
			bundle_id=context.get("bundle_id"),
			document_id=context.get("document_id"),
			page_number=context.get("page_number"),
			user_id=user_id,
			user_email=user_email,
			user_name=user_name,
			access_method=access_method,
			link_id=link_id,
			action=action,
			action_detail=action_detail,
			ip_address=request.client.host if request else None,
			user_agent=request.headers.get("user-agent") if request else None,
			session_id=request.cookies.get("session_id") if request else None,
			success=success,
			failure_reason=failure_reason,
		)

		await db.create_audit_log(log_entry)

	async def get_access_history(
		self,
		resource_type: str | None = None,
		resource_id: UUID | None = None,
		user_id: UUID | None = None,
		action: str | None = None,
		date_from: datetime | None = None,
		date_to: datetime | None = None,
		limit: int = 100,
		offset: int = 0,
	) -> list[AccessAuditLog]:
		"""Query access history with filters"""
		pass

	async def get_user_activity_report(
		self,
		user_id: UUID,
		date_from: datetime,
		date_to: datetime,
	) -> UserActivityReport:
		"""Generate user activity report"""
		pass

	async def get_resource_access_report(
		self,
		resource_type: str,
		resource_id: UUID,
	) -> ResourceAccessReport:
		"""Get all access to a specific resource"""
		pass
```

### 17.6 API Endpoints

```python
# papermerge-core/papermerge/core/routers/portfolios.py
router = APIRouter(prefix="/portfolios", tags=["Portfolios"])


@router.post("/")
async def create_portfolio(portfolio: PortfolioCreate) -> Portfolio:
	"""Create a new portfolio"""
	pass


@router.get("/{portfolio_id}")
@require_access(ResourceType.PORTFOLIO, "view")
async def get_portfolio(portfolio_id: UUID) -> Portfolio:
	"""Get portfolio with cases summary"""
	pass


@router.get("/{portfolio_id}/cases")
@require_access(ResourceType.PORTFOLIO, "view")
async def list_portfolio_cases(portfolio_id: UUID) -> list[CaseSummary]:
	"""List all cases in portfolio"""
	pass


@router.post("/{portfolio_id}/access")
@require_access(ResourceType.PORTFOLIO, "admin")
async def grant_portfolio_access(
	portfolio_id: UUID,
	access: AccessGrant,
) -> ResourceAccess:
	"""Grant access to portfolio"""
	pass


# papermerge-core/papermerge/core/routers/cases.py
router = APIRouter(prefix="/cases", tags=["Cases"])


@router.post("/")
async def create_case(case: CaseCreate) -> Case:
	"""Create a new case"""
	pass


@router.get("/{case_id}")
@require_access(ResourceType.CASE, "view")
async def get_case(case_id: UUID) -> Case:
	"""Get case with bundles and documents"""
	pass


@router.post("/{case_id}/bundles")
@require_access(ResourceType.CASE, "edit")
async def add_bundle_to_case(
	case_id: UUID,
	bundle_id: UUID,
) -> Bundle:
	"""Add existing bundle to case"""
	pass


@router.post("/{case_id}/documents")
@require_access(ResourceType.CASE, "edit")
async def add_document_to_case(
	case_id: UUID,
	document_id: UUID,
) -> CaseDocument:
	"""Add document directly to case (not in bundle)"""
	pass


@router.post("/{case_id}/access/single-view")
@require_access(ResourceType.CASE, "share")
async def create_single_view_access(
	case_id: UUID,
	recipient_email: str,
	expires_in_hours: int = 24,
) -> dict:
	"""Create single-view access link"""
	url = await create_single_view_access(
		resource_type="case",
		resource_id=case_id,
		recipient_email=recipient_email,
		expires_in_hours=expires_in_hours,
		created_by=current_user.id,
	)
	return {"access_url": url, "expires_in_hours": expires_in_hours}


# Access audit endpoints
@router.get("/{case_id}/audit")
@require_access(ResourceType.CASE, "admin")
async def get_case_access_audit(
	case_id: UUID,
	date_from: datetime | None = None,
	date_to: datetime | None = None,
	limit: int = 100,
) -> list[AccessAuditLog]:
	"""Get access audit log for case"""
	return await audit_service.get_access_history(
		resource_type="case",
		resource_id=case_id,
		date_from=date_from,
		date_to=date_to,
		limit=limit,
	)
```

### 17.7 Frontend Access Control Panel

```tsx
// papermerge-core/frontend/apps/ui/src/features/access/AccessControlPanel.tsx
import { Table, Badge, Button, Group, Modal, Select, Switch, NumberInput, Text } from "@mantine/core"
import { DateTimePicker } from "@mantine/dates"
import { IconPlus, IconTrash, IconLink, IconEye } from "@tabler/icons-react"

interface AccessControlPanelProps {
	resourceType: string
	resourceId: string
}

export function AccessControlPanel({ resourceType, resourceId }: AccessControlPanelProps) {
	const { data: accessList } = useResourceAccess(resourceType, resourceId)
	const { data: auditLog } = useAccessAudit(resourceType, resourceId)

	return (
		<Tabs defaultValue="permissions">
			<Tabs.List>
				<Tabs.Tab value="permissions">Permissions</Tabs.Tab>
				<Tabs.Tab value="sharing">Share Links</Tabs.Tab>
				<Tabs.Tab value="audit">Access Log</Tabs.Tab>
			</Tabs.List>

			<Tabs.Panel value="permissions">
				<Stack>
					<Group justify="space-between">
						<Title order={4}>Access Permissions</Title>
						<Button leftSection={<IconPlus />} onClick={openGrantModal}>
							Grant Access
						</Button>
					</Group>

					<Table>
						<Table.Thead>
							<Table.Tr>
								<Table.Th>Subject</Table.Th>
								<Table.Th>View</Table.Th>
								<Table.Th>Download</Table.Th>
								<Table.Th>Print</Table.Th>
								<Table.Th>Edit</Table.Th>
								<Table.Th>Expires</Table.Th>
								<Table.Th>Actions</Table.Th>
							</Table.Tr>
						</Table.Thead>
						<Table.Tbody>
							{accessList?.map((access) => (
								<Table.Tr key={access.id}>
									<Table.Td>
										<Group gap="xs">
											<Badge color={access.subject_type === "user" ? "blue" : "green"}>
												{access.subject_type}
											</Badge>
											{access.subject_name}
										</Group>
									</Table.Td>
									<Table.Td><PermissionBadge allowed={access.allow_view} /></Table.Td>
									<Table.Td><PermissionBadge allowed={access.allow_download} /></Table.Td>
									<Table.Td><PermissionBadge allowed={access.allow_print} /></Table.Td>
									<Table.Td><PermissionBadge allowed={access.allow_edit} /></Table.Td>
									<Table.Td>
										{access.valid_until ? formatDate(access.valid_until) : "Never"}
									</Table.Td>
									<Table.Td>
										<ActionIcon color="red" onClick={() => revokeAccess(access.id)}>
											<IconTrash size={16} />
										</ActionIcon>
									</Table.Td>
								</Table.Tr>
							))}
						</Table.Tbody>
					</Table>
				</Stack>
			</Tabs.Panel>

			<Tabs.Panel value="sharing">
				<Stack>
					<Group justify="space-between">
						<Title order={4}>Share Links</Title>
						<Group>
							<Button leftSection={<IconLink />} onClick={createShareLink}>
								Create Link
							</Button>
							<Button leftSection={<IconEye />} variant="outline" onClick={createSingleViewLink}>
								Single View Link
							</Button>
						</Group>
					</Group>
					{/* Share links table */}
				</Stack>
			</Tabs.Panel>

			<Tabs.Panel value="audit">
				<Stack>
					<Title order={4}>Access History</Title>
					<Table>
						<Table.Thead>
							<Table.Tr>
								<Table.Th>Time</Table.Th>
								<Table.Th>User</Table.Th>
								<Table.Th>Action</Table.Th>
								<Table.Th>Method</Table.Th>
								<Table.Th>IP Address</Table.Th>
								<Table.Th>Status</Table.Th>
							</Table.Tr>
						</Table.Thead>
						<Table.Tbody>
							{auditLog?.map((entry) => (
								<Table.Tr key={entry.id}>
									<Table.Td>{formatDateTime(entry.accessed_at)}</Table.Td>
									<Table.Td>{entry.user_name || entry.user_email || "Anonymous"}</Table.Td>
									<Table.Td>
										<Badge variant="light">{entry.action}</Badge>
									</Table.Td>
									<Table.Td>{entry.access_method}</Table.Td>
									<Table.Td>{entry.ip_address}</Table.Td>
									<Table.Td>
										{entry.success ? (
											<Badge color="green">Success</Badge>
										) : (
											<Badge color="red">{entry.failure_reason}</Badge>
										)}
									</Table.Td>
								</Table.Tr>
							))}
						</Table.Tbody>
					</Table>
				</Stack>
			</Tabs.Panel>
		</Tabs>
	)
}

function PermissionBadge({ allowed }: { allowed: boolean }) {
	return allowed ? (
		<Badge color="green" size="sm">Yes</Badge>
	) : (
		<Badge color="gray" size="sm">No</Badge>
	)
}
```

### 17.8 Files to Create

```
papermerge-core/
├── papermerge/core/
│   ├── routers/
│   │   ├── portfolios.py         # Portfolio endpoints
│   │   ├── cases.py              # Case endpoints
│   │   └── access.py             # Access control endpoints
│   ├── services/
│   │   ├── access_control.py     # Hierarchical access resolver
│   │   ├── single_view.py        # Single view access
│   │   └── audit.py              # Access audit service
│   ├── db/
│   │   ├── portfolios.py         # Portfolio DB ops
│   │   ├── cases.py              # Case DB ops
│   │   └── access.py             # Access DB ops
│   └── decorators/
│       └── access.py             # @require_access decorator
│
├── frontend/apps/ui/src/
│   ├── features/
│   │   ├── portfolios/
│   │   │   ├── PortfolioList.tsx
│   │   │   ├── PortfolioDetail.tsx
│   │   │   └── api.ts
│   │   ├── cases/
│   │   │   ├── CaseList.tsx
│   │   │   ├── CaseDetail.tsx
│   │   │   ├── CaseTree.tsx      # Hierarchy view
│   │   │   └── api.ts
│   │   └── access/
│   │       ├── AccessControlPanel.tsx
│   │       ├── GrantAccessModal.tsx
│   │       ├── ShareLinkModal.tsx
│   │       ├── SingleViewModal.tsx
│   │       ├── AuditLogView.tsx
│   │       └── api.ts
│   └── routes/
│       ├── portfolios.tsx
│       └── cases.tsx
```

---

## 18. Personalization, Theming & Company Settings

### 18.1 Database Schema

```sql
-- User preferences
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Theme
    theme VARCHAR(20) NOT NULL DEFAULT 'system',  -- light, dark, system
    accent_color VARCHAR(20) DEFAULT 'blue',

    -- Locale
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',

    -- UI preferences
    sidebar_collapsed BOOLEAN DEFAULT FALSE,
    default_view VARCHAR(20) DEFAULT 'grid',  -- grid, list, table
    items_per_page INTEGER DEFAULT 25,

    -- Notifications
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    digest_frequency VARCHAR(20) DEFAULT 'daily',  -- realtime, daily, weekly

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)
);

-- Company/tenant branding
CREATE TABLE tenant_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Logo
    logo_url VARCHAR(500),
    logo_dark_url VARCHAR(500),
    favicon_url VARCHAR(100),

    -- Colors
    primary_color VARCHAR(20) DEFAULT '#228be6',
    secondary_color VARCHAR(20) DEFAULT '#868e96',

    -- Login page
    login_background_url VARCHAR(500),
    login_message TEXT,

    -- Email templates
    email_header_html TEXT,
    email_footer_html TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(tenant_id)
);

-- Tenant settings
CREATE TABLE tenant_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Document settings
    document_numbering_scheme VARCHAR(100) DEFAULT '{YEAR}-{SEQ:6}',
    default_language VARCHAR(10) DEFAULT 'en',

    -- Storage
    storage_quota_gb INTEGER,
    warn_at_percentage INTEGER DEFAULT 80,

    -- Retention
    default_retention_days INTEGER,
    auto_archive_days INTEGER,

    -- Features
    ocr_enabled BOOLEAN DEFAULT TRUE,
    ai_features_enabled BOOLEAN DEFAULT TRUE,
    workflow_enabled BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(tenant_id)
);
```

### 18.2 API Endpoints

```python
# auth_server/routers/preferences.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel

router = APIRouter(prefix="/preferences", tags=["preferences"])

class UserPreferences(BaseModel):
    theme: str = "system"
    accent_color: str = "blue"
    language: str = "en"
    timezone: str = "UTC"
    date_format: str = "YYYY-MM-DD"
    sidebar_collapsed: bool = False
    default_view: str = "grid"
    items_per_page: int = 25
    email_notifications: bool = True
    push_notifications: bool = True
    digest_frequency: str = "daily"

@router.get("/me")
async def get_my_preferences(user = Depends(get_current_user)):
    return await get_user_preferences(user.id)

@router.put("/me")
async def update_my_preferences(
    prefs: UserPreferences,
    user = Depends(get_current_user)
):
    return await update_user_preferences(user.id, prefs)

# Tenant branding (admin only)
@router.get("/branding")
async def get_tenant_branding(tenant = Depends(get_current_tenant)):
    return await get_branding(tenant.id)

@router.put("/branding")
async def update_tenant_branding(
    branding: TenantBranding,
    tenant = Depends(get_current_tenant),
    user = Depends(require_admin)
):
    return await update_branding(tenant.id, branding)

@router.post("/branding/logo")
async def upload_logo(
    file: UploadFile,
    variant: str = "light",  # light, dark, favicon
    tenant = Depends(get_current_tenant),
    user = Depends(require_admin)
):
    return await upload_branding_asset(tenant.id, file, variant)
```

### 18.3 Frontend Theme Provider

```tsx
// frontend/apps/ui/src/providers/ThemeProvider.tsx
import { MantineProvider, createTheme } from "@mantine/core"
import { usePreferences } from "@/hooks/usePreferences"
import { useTenantBranding } from "@/hooks/useTenantBranding"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
	const { preferences } = usePreferences()
	const { branding } = useTenantBranding()

	const theme = createTheme({
		primaryColor: branding?.primary_color || "blue",
		colors: {
			brand: generateColorScale(branding?.primary_color || "#228be6"),
		},
		fontFamily: "Inter, sans-serif",
	})

	const colorScheme = preferences?.theme === "system"
		? undefined
		: preferences?.theme

	return (
		<MantineProvider theme={theme} defaultColorScheme={colorScheme}>
			{children}
		</MantineProvider>
	)
}
```

---

## 19. Document Encryption & Hidden Documents

### 19.1 Database Schema

```sql
-- Document encryption keys
CREATE TABLE document_encryption_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    -- Key details
    key_version INTEGER NOT NULL DEFAULT 1,
    encrypted_key BYTEA NOT NULL,  -- DEK encrypted with tenant KEK
    key_algorithm VARCHAR(50) NOT NULL DEFAULT 'AES-256-GCM',

    -- Key encryption key reference
    kek_id UUID NOT NULL REFERENCES key_encryption_keys(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    rotated_at TIMESTAMPTZ,

    UNIQUE(document_id, key_version)
);

-- Tenant key encryption keys (KEKs)
CREATE TABLE key_encryption_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    key_version INTEGER NOT NULL DEFAULT 1,
    encrypted_kek BYTEA NOT NULL,  -- KEK encrypted with master key
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    rotated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    UNIQUE(tenant_id, key_version)
);

-- Hidden document flags
ALTER TABLE documents ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE;
ALTER TABLE documents ADD COLUMN hidden_at TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN hidden_by UUID REFERENCES users(id);
ALTER TABLE documents ADD COLUMN hidden_reason TEXT;

-- Dual authorization for hidden documents
CREATE TABLE hidden_document_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    requested_by UUID NOT NULL REFERENCES users(id),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT NOT NULL,

    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,

    status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, denied
    expires_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hidden_docs ON documents(is_hidden) WHERE is_hidden = TRUE;
```

### 19.2 Encryption Service

```python
# papermerge-core/papermerge/core/services/encryption.py
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

class DocumentEncryptionService:
    def __init__(self, master_key: bytes):
        self.master_key = master_key

    async def encrypt_document(
        self,
        document_id: UUID,
        content: bytes,
        tenant_id: UUID
    ) -> bytes:
        """Encrypt document content with envelope encryption."""
        # Get or create tenant KEK
        kek = await self._get_tenant_kek(tenant_id)

        # Generate document-specific DEK
        dek = os.urandom(32)  # 256-bit key

        # Encrypt content with DEK
        aesgcm = AESGCM(dek)
        nonce = os.urandom(12)
        encrypted_content = aesgcm.encrypt(nonce, content, None)

        # Encrypt DEK with KEK
        kek_aesgcm = AESGCM(kek.key)
        encrypted_dek = kek_aesgcm.encrypt(
            os.urandom(12),
            dek,
            document_id.bytes
        )

        # Store encrypted DEK
        await self._store_document_key(document_id, encrypted_dek, kek.id)

        # Return nonce + encrypted content
        return nonce + encrypted_content

    async def decrypt_document(
        self,
        document_id: UUID,
        encrypted_content: bytes,
        tenant_id: UUID
    ) -> bytes:
        """Decrypt document content."""
        # Get document key record
        key_record = await self._get_document_key(document_id)

        # Get KEK
        kek = await self._get_kek_by_id(key_record.kek_id)

        # Decrypt DEK
        kek_aesgcm = AESGCM(kek.key)
        dek = kek_aesgcm.decrypt(
            key_record.encrypted_key[:12],
            key_record.encrypted_key[12:],
            document_id.bytes
        )

        # Decrypt content
        nonce = encrypted_content[:12]
        ciphertext = encrypted_content[12:]
        aesgcm = AESGCM(dek)

        return aesgcm.decrypt(nonce, ciphertext, None)

    async def rotate_document_key(self, document_id: UUID) -> None:
        """Rotate document encryption key."""
        # Decrypt with old key
        content = await self.decrypt_document(document_id)
        # Re-encrypt with new key
        await self.encrypt_document(document_id, content)
```

### 19.3 Hidden Document Service

```python
# papermerge-core/papermerge/core/services/hidden_documents.py
class HiddenDocumentService:
    async def hide_document(
        self,
        document_id: UUID,
        hidden_by: UUID,
        reason: str
    ) -> None:
        """Mark a document as hidden."""
        await db.execute(
            """
            UPDATE documents
            SET is_hidden = TRUE,
                hidden_at = NOW(),
                hidden_by = $2,
                hidden_reason = $3
            WHERE id = $1
            """,
            document_id, hidden_by, reason
        )

        # Remove from search index
        await search_service.remove_from_index(document_id)

        # Audit log
        await audit_log.record(
            action="document.hidden",
            document_id=document_id,
            user_id=hidden_by,
            details={"reason": reason}
        )

    async def request_access(
        self,
        document_id: UUID,
        user_id: UUID,
        reason: str
    ) -> UUID:
        """Request access to a hidden document (requires approval)."""
        request_id = await db.fetchval(
            """
            INSERT INTO hidden_document_access
            (document_id, requested_by, reason, expires_at)
            VALUES ($1, $2, $3, NOW() + INTERVAL '24 hours')
            RETURNING id
            """,
            document_id, user_id, reason
        )

        # Notify approvers
        await notify_document_owner(document_id, request_id)

        return request_id

    async def approve_access(
        self,
        request_id: UUID,
        approved_by: UUID
    ) -> None:
        """Approve access request for hidden document."""
        await db.execute(
            """
            UPDATE hidden_document_access
            SET approved_by = $2,
                approved_at = NOW(),
                status = 'approved'
            WHERE id = $1
            """,
            request_id, approved_by
        )

    async def can_access_hidden(
        self,
        document_id: UUID,
        user_id: UUID
    ) -> bool:
        """Check if user has approved access to hidden document."""
        return await db.fetchval(
            """
            SELECT EXISTS(
                SELECT 1 FROM hidden_document_access
                WHERE document_id = $1
                  AND requested_by = $2
                  AND status = 'approved'
                  AND expires_at > NOW()
            )
            """,
            document_id, user_id
        )
```

---

## 20. Form Recognition & Signature Extraction

### 20.1 Database Schema

```sql
-- Form templates
CREATE TABLE form_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),

    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),  -- insurance, legal, hr, financial

    -- Template configuration
    page_count INTEGER NOT NULL DEFAULT 1,
    template_image_urls TEXT[],  -- Reference images for each page

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Form field definitions
CREATE TABLE form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES form_templates(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    label VARCHAR(255),
    field_type VARCHAR(50) NOT NULL,  -- text, checkbox, radio, signature, date, number
    page_number INTEGER NOT NULL DEFAULT 1,

    -- Bounding box (normalized 0-1 coordinates)
    x FLOAT NOT NULL,
    y FLOAT NOT NULL,
    width FLOAT NOT NULL,
    height FLOAT NOT NULL,

    -- Validation
    required BOOLEAN DEFAULT FALSE,
    validation_regex VARCHAR(255),
    expected_format VARCHAR(100),

    -- Cross-page linking
    linked_field_id UUID REFERENCES form_fields(id),
    link_type VARCHAR(50),  -- same_value, signature_for, initial_for

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extracted form data
CREATE TABLE form_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    template_id UUID REFERENCES form_templates(id),

    -- Status
    status VARCHAR(50) DEFAULT 'pending',  -- pending, processing, completed, failed, review_required
    confidence_score FLOAT,

    -- Metadata
    extracted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extracted field values
CREATE TABLE extracted_field_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extraction_id UUID NOT NULL REFERENCES form_extractions(id) ON DELETE CASCADE,
    field_id UUID REFERENCES form_fields(id),

    page_number INTEGER NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    field_type VARCHAR(50) NOT NULL,

    -- Extracted value
    text_value TEXT,
    boolean_value BOOLEAN,
    date_value DATE,
    number_value NUMERIC,

    -- For signatures/images
    image_url VARCHAR(500),

    -- Confidence
    confidence FLOAT,
    needs_review BOOLEAN DEFAULT FALSE,

    -- Bounding box where found
    x FLOAT, y FLOAT, width FLOAT, height FLOAT
);

-- Signature library
CREATE TABLE signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),

    -- Owner
    user_id UUID REFERENCES users(id),
    person_name VARCHAR(255),

    -- Signature image
    image_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),

    -- Metadata
    captured_from_document_id UUID REFERENCES documents(id),
    captured_at TIMESTAMPTZ DEFAULT NOW(),

    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_form_extractions_document ON form_extractions(document_id);
CREATE INDEX idx_signatures_user ON signatures(user_id);
```

### 20.2 Form Recognition Service

```python
# papermerge-ocr-worker/ocr_worker/services/form_recognition.py
import cv2
import numpy as np
from paddleocr import PaddleOCR

class FormRecognitionService:
    def __init__(self):
        self.ocr = PaddleOCR(use_angle_cls=True, lang='en')

    async def process_form(
        self,
        document_id: UUID,
        pages: list[bytes],
        template_id: UUID | None = None
    ) -> FormExtraction:
        """Process a multi-page form document."""

        if template_id:
            template = await self.get_template(template_id)
            return await self._extract_with_template(pages, template)
        else:
            # Auto-detect template or extract without template
            template = await self._detect_template(pages[0])
            if template:
                return await self._extract_with_template(pages, template)
            return await self._extract_generic(pages)

    async def _extract_with_template(
        self,
        pages: list[bytes],
        template: FormTemplate
    ) -> FormExtraction:
        """Extract fields using template definition."""
        extraction = FormExtraction(
            template_id=template.id,
            status="processing"
        )
        extracted_values = []

        for page_num, page_bytes in enumerate(pages, 1):
            image = self._bytes_to_image(page_bytes)
            page_fields = [f for f in template.fields if f.page_number == page_num]

            for field in page_fields:
                value = await self._extract_field(image, field)
                extracted_values.append(value)

        # Validate cross-page links
        await self._validate_linked_fields(extracted_values)

        extraction.field_values = extracted_values
        extraction.status = "completed"
        extraction.confidence_score = self._calculate_confidence(extracted_values)

        return extraction

    async def _extract_field(
        self,
        image: np.ndarray,
        field: FormField
    ) -> ExtractedFieldValue:
        """Extract a single field from the image."""
        h, w = image.shape[:2]

        # Crop to field region
        x1 = int(field.x * w)
        y1 = int(field.y * h)
        x2 = int((field.x + field.width) * w)
        y2 = int((field.y + field.height) * h)
        field_image = image[y1:y2, x1:x2]

        if field.field_type == "signature":
            return await self._extract_signature(field_image, field)
        elif field.field_type == "checkbox":
            return await self._extract_checkbox(field_image, field)
        else:
            return await self._extract_text(field_image, field)

    async def _extract_signature(
        self,
        image: np.ndarray,
        field: FormField
    ) -> ExtractedFieldValue:
        """Extract and store signature from field region."""
        # Detect if signature is present
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)

        contours, _ = cv2.findContours(
            binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        if len(contours) > 0:
            # Signature detected - crop and save
            x, y, w, h = cv2.boundingRect(np.vstack(contours))
            signature_image = image[y:y+h, x:x+w]

            # Save signature image
            image_url = await self._save_signature_image(signature_image)

            return ExtractedFieldValue(
                field_name=field.name,
                field_type="signature",
                image_url=image_url,
                confidence=0.9 if len(contours) > 5 else 0.6
            )

        return ExtractedFieldValue(
            field_name=field.name,
            field_type="signature",
            confidence=0.0,
            needs_review=True
        )

    async def _extract_checkbox(
        self,
        image: np.ndarray,
        field: FormField
    ) -> ExtractedFieldValue:
        """Detect checkbox state."""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(gray, 180, 255, cv2.THRESH_BINARY_INV)

        # Calculate fill ratio
        fill_ratio = np.sum(binary > 0) / binary.size

        # Checkbox is checked if fill ratio > threshold
        is_checked = fill_ratio > 0.15

        return ExtractedFieldValue(
            field_name=field.name,
            field_type="checkbox",
            boolean_value=is_checked,
            confidence=0.95 if fill_ratio > 0.25 or fill_ratio < 0.05 else 0.7
        )
```

### 20.3 Multi-Page Form Processor

```python
# papermerge-ocr-worker/ocr_worker/services/multipage_form.py
class MultiPageFormProcessor:
    """Handle multi-page forms like insurance applications."""

    async def process_multipage_form(
        self,
        document_id: UUID,
        pages: list[bytes]
    ) -> MultiPageFormResult:
        """Process a complete multi-page form."""

        # Detect form type from first page
        template = await self._detect_form_template(pages[0])

        if not template:
            raise FormTemplateNotFound("Could not identify form template")

        # Validate page count
        if len(pages) != template.page_count:
            return MultiPageFormResult(
                status="incomplete",
                message=f"Expected {template.page_count} pages, got {len(pages)}",
                missing_pages=self._find_missing_pages(pages, template)
            )

        # Extract all fields across pages
        all_fields = []
        for page_num, page_bytes in enumerate(pages, 1):
            page_fields = await self._extract_page_fields(
                page_bytes, template, page_num
            )
            all_fields.extend(page_fields)

        # Cross-reference linked fields
        await self._validate_cross_page_links(all_fields, template)

        # Build structured output
        return MultiPageFormResult(
            status="completed",
            template_name=template.name,
            fields=all_fields,
            signatures=self._collect_signatures(all_fields),
            initials=self._collect_initials(all_fields),
            validation_errors=self._validate_required_fields(all_fields, template)
        )

    def _find_missing_pages(
        self,
        pages: list[bytes],
        template: FormTemplate
    ) -> list[int]:
        """Identify which pages are missing from the form."""
        # Use page markers/identifiers to detect which pages are present
        detected_pages = []
        for page_bytes in pages:
            page_num = self._detect_page_number(page_bytes, template)
            if page_num:
                detected_pages.append(page_num)

        expected = set(range(1, template.page_count + 1))
        return sorted(expected - set(detected_pages))
```

### 20.4 Signature Comparison Service

```python
# papermerge-core/papermerge/core/services/signature_verification.py
import cv2
import numpy as np
from scipy.spatial.distance import cosine

class SignatureVerificationService:
    async def compare_signatures(
        self,
        signature1_url: str,
        signature2_url: str
    ) -> SignatureComparisonResult:
        """Compare two signatures for similarity."""

        img1 = await self._load_signature(signature1_url)
        img2 = await self._load_signature(signature2_url)

        # Extract features
        features1 = self._extract_features(img1)
        features2 = self._extract_features(img2)

        # Calculate similarity
        similarity = 1 - cosine(features1, features2)

        return SignatureComparisonResult(
            similarity_score=similarity,
            is_match=similarity > 0.85,
            confidence="high" if similarity > 0.9 else "medium" if similarity > 0.7 else "low"
        )

    def _extract_features(self, image: np.ndarray) -> np.ndarray:
        """Extract signature features for comparison."""
        # Normalize size
        image = cv2.resize(image, (200, 100))

        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Extract HOG features
        hog = cv2.HOGDescriptor()
        features = hog.compute(gray)

        return features.flatten()
```

---

## 21. Workflow Management & Auto-Routing

### 21.1 Database Schema

```sql
-- Workflow definitions
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),

    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),  -- approval, review, routing, escalation

    -- Trigger conditions
    trigger_type VARCHAR(50) NOT NULL,  -- manual, auto, scheduled
    trigger_conditions JSONB,  -- {"document_type": "contract", "metadata.department": "legal"}

    -- Mode
    mode VARCHAR(20) DEFAULT 'operational',  -- operational, archival

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Workflow steps/nodes
CREATE TABLE workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,

    name VARCHAR(100) NOT NULL,
    step_type VARCHAR(50) NOT NULL,  -- approval, review, route, notify, condition, action
    step_order INTEGER NOT NULL,

    -- Assignment
    assignee_type VARCHAR(50),  -- user, role, group, dynamic
    assignee_id UUID,  -- user/role/group id
    assignee_expression VARCHAR(255),  -- for dynamic: "document.metadata.manager_id"

    -- Conditions
    condition_expression TEXT,  -- "document.amount > 100000"

    -- Actions
    action_type VARCHAR(50),  -- move_to_folder, set_status, send_email, call_webhook
    action_config JSONB,

    -- Timeouts
    deadline_hours INTEGER,
    escalation_step_id UUID REFERENCES workflow_steps(id),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow instances (running workflows)
CREATE TABLE workflow_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id),
    document_id UUID NOT NULL REFERENCES documents(id),

    current_step_id UUID REFERENCES workflow_steps(id),
    status VARCHAR(50) DEFAULT 'pending',  -- pending, in_progress, completed, rejected, cancelled

    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    initiated_by UUID REFERENCES users(id),
    context JSONB  -- workflow variables
);

-- Step executions
CREATE TABLE workflow_step_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES workflow_steps(id),

    status VARCHAR(50) DEFAULT 'pending',  -- pending, in_progress, approved, rejected, skipped
    assigned_to UUID REFERENCES users(id),

    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    deadline_at TIMESTAMPTZ,

    -- Response
    action_taken VARCHAR(50),  -- approved, rejected, forwarded, returned
    comments TEXT,
    attachments UUID[],

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-routing rules
CREATE TABLE routing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),

    name VARCHAR(255) NOT NULL,
    priority INTEGER DEFAULT 100,

    -- Matching conditions
    conditions JSONB NOT NULL,
    -- Example: {"document_type": "contract", "metadata.value": {"$gt": 50000}}

    -- Destination
    destination_type VARCHAR(50) NOT NULL,  -- folder, workflow, user_inbox
    destination_id UUID,

    -- Mode
    mode VARCHAR(20) DEFAULT 'both',  -- operational, archival, both

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ingestion sources
CREATE TABLE ingestion_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),

    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL,  -- watched_folder, email, api, scanner

    -- Configuration
    config JSONB NOT NULL,
    -- watched_folder: {"path": "/mnt/scans", "patterns": ["*.pdf", "*.tiff"]}
    -- email: {"address": "archive@corp.net", "imap_host": "..."}

    -- Processing
    mode VARCHAR(20) DEFAULT 'operational',
    default_document_type_id UUID,
    apply_ocr BOOLEAN DEFAULT TRUE,
    auto_route BOOLEAN DEFAULT TRUE,

    is_active BOOLEAN DEFAULT TRUE,
    last_checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_instances_document ON workflow_instances(document_id);
CREATE INDEX idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX idx_routing_rules_active ON routing_rules(tenant_id, is_active, priority);
```

### 21.2 Auto-Router Service

```python
# papermerge-core/papermerge/core/services/auto_router.py
class AutoRouterService:
    async def route_document(
        self,
        document_id: UUID,
        mode: str = "operational"
    ) -> RoutingResult:
        """Route a document based on matching rules."""

        document = await self.get_document_with_metadata(document_id)

        # Get applicable rules ordered by priority
        rules = await db.fetch(
            """
            SELECT * FROM routing_rules
            WHERE tenant_id = $1
              AND is_active = TRUE
              AND (mode = $2 OR mode = 'both')
            ORDER BY priority ASC
            """,
            document.tenant_id, mode
        )

        for rule in rules:
            if self._matches_conditions(document, rule.conditions):
                return await self._apply_rule(document, rule)

        return RoutingResult(
            routed=False,
            message="No matching routing rule found"
        )

    def _matches_conditions(
        self,
        document: Document,
        conditions: dict
    ) -> bool:
        """Check if document matches rule conditions."""
        for field, expected in conditions.items():
            actual = self._get_field_value(document, field)

            if isinstance(expected, dict):
                # Complex conditions: $gt, $lt, $in, $contains
                if not self._evaluate_complex(actual, expected):
                    return False
            else:
                # Simple equality
                if actual != expected:
                    return False

        return True

    async def _apply_rule(
        self,
        document: Document,
        rule: RoutingRule
    ) -> RoutingResult:
        """Apply routing rule to document."""

        if rule.destination_type == "folder":
            await self._move_to_folder(document.id, rule.destination_id)
            return RoutingResult(
                routed=True,
                destination_type="folder",
                destination_id=rule.destination_id
            )

        elif rule.destination_type == "workflow":
            instance = await self.workflow_service.start_workflow(
                rule.destination_id,
                document.id
            )
            return RoutingResult(
                routed=True,
                destination_type="workflow",
                workflow_instance_id=instance.id
            )

        elif rule.destination_type == "user_inbox":
            await self._route_to_inbox(document.id, rule.destination_id)
            return RoutingResult(
                routed=True,
                destination_type="user_inbox",
                user_id=rule.destination_id
            )
```

### 21.3 Workflow Engine

```python
# papermerge-core/papermerge/core/services/workflow_engine.py
class WorkflowEngine:
    async def start_workflow(
        self,
        workflow_id: UUID,
        document_id: UUID,
        initiated_by: UUID | None = None
    ) -> WorkflowInstance:
        """Start a new workflow instance."""

        workflow = await self.get_workflow(workflow_id)
        first_step = await self.get_first_step(workflow_id)

        instance = await db.fetchrow(
            """
            INSERT INTO workflow_instances
            (workflow_id, document_id, current_step_id, status, initiated_by)
            VALUES ($1, $2, $3, 'in_progress', $4)
            RETURNING *
            """,
            workflow_id, document_id, first_step.id, initiated_by
        )

        # Create first step execution
        await self._create_step_execution(instance.id, first_step)

        # Notify assignee
        await self._notify_step_assignee(instance.id, first_step)

        return instance

    async def process_step_action(
        self,
        execution_id: UUID,
        action: str,  # approved, rejected, forwarded, returned
        user_id: UUID,
        comments: str | None = None
    ) -> WorkflowInstance:
        """Process user action on a workflow step."""

        execution = await self.get_execution(execution_id)
        step = await self.get_step(execution.step_id)
        instance = await self.get_instance(execution.instance_id)

        # Update execution
        await db.execute(
            """
            UPDATE workflow_step_executions
            SET status = $2, action_taken = $3, comments = $4, completed_at = NOW()
            WHERE id = $1
            """,
            execution_id, action, action, comments
        )

        # Determine next step
        if action == "approved":
            next_step = await self._get_next_step(step)
            if next_step:
                await self._advance_to_step(instance, next_step)
            else:
                await self._complete_workflow(instance)

        elif action == "rejected":
            await self._reject_workflow(instance, comments)

        elif action == "returned":
            prev_step = await self._get_previous_step(step)
            if prev_step:
                await self._return_to_step(instance, prev_step, comments)

        # Audit log
        await self.audit_log.record(
            action=f"workflow.step.{action}",
            document_id=instance.document_id,
            user_id=user_id,
            details={
                "workflow_id": instance.workflow_id,
                "step_id": step.id,
                "comments": comments
            }
        )

        return await self.get_instance(instance.id)

    async def check_deadlines(self) -> None:
        """Check for overdue steps and escalate."""
        overdue = await db.fetch(
            """
            SELECT e.*, s.escalation_step_id
            FROM workflow_step_executions e
            JOIN workflow_steps s ON e.step_id = s.id
            WHERE e.status = 'pending'
              AND e.deadline_at < NOW()
              AND s.escalation_step_id IS NOT NULL
            """
        )

        for execution in overdue:
            await self._escalate_step(execution)
```

### 21.4 Ingestion Sources

```python
# papermerge-core/papermerge/core/services/ingestion.py
import asyncio
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class WatchedFolderIngester:
    """Monitor folder for new documents."""

    def __init__(self, source: IngestionSource):
        self.source = source
        self.config = source.config
        self.observer = Observer()

    async def start(self):
        handler = DocumentHandler(
            tenant_id=self.source.tenant_id,
            mode=self.source.mode,
            apply_ocr=self.source.apply_ocr,
            auto_route=self.source.auto_route
        )

        self.observer.schedule(
            handler,
            self.config["path"],
            recursive=self.config.get("recursive", False)
        )
        self.observer.start()

class DocumentHandler(FileSystemEventHandler):
    def on_created(self, event):
        if event.is_directory:
            return

        # Check file pattern
        if not self._matches_patterns(event.src_path):
            return

        # Queue for processing
        asyncio.create_task(
            self._process_file(event.src_path)
        )

    async def _process_file(self, path: str):
        # Ingest document
        document = await document_service.ingest_file(
            path,
            tenant_id=self.tenant_id,
            apply_ocr=self.apply_ocr
        )

        # Auto-route if enabled
        if self.auto_route:
            await auto_router.route_document(
                document.id,
                mode=self.mode
            )


class EmailIngester:
    """Monitor email inbox for documents."""

    async def check_inbox(self, source: IngestionSource):
        config = source.config

        async with aioimaplib.IMAP4_SSL(config["imap_host"]) as imap:
            await imap.login(config["username"], config["password"])
            await imap.select("INBOX")

            # Fetch unprocessed messages
            _, messages = await imap.search("UNSEEN")

            for msg_id in messages:
                await self._process_message(imap, msg_id, source)

    async def _process_message(self, imap, msg_id, source):
        _, data = await imap.fetch(msg_id, "(RFC822)")
        email_msg = email.message_from_bytes(data[0][1])

        # Extract attachments
        for part in email_msg.walk():
            if part.get_content_maintype() == "multipart":
                continue

            filename = part.get_filename()
            if filename and self._is_document(filename):
                content = part.get_payload(decode=True)

                # Ingest
                document = await document_service.ingest_bytes(
                    content,
                    filename=filename,
                    tenant_id=source.tenant_id,
                    metadata={
                        "source": "email",
                        "from": email_msg["From"],
                        "subject": email_msg["Subject"],
                        "date": email_msg["Date"]
                    }
                )

                # Auto-route
                if source.auto_route:
                    await auto_router.route_document(
                        document.id,
                        mode=source.mode
                    )

        # Mark as processed
        await imap.store(msg_id, "+FLAGS", "\\Seen")
```
