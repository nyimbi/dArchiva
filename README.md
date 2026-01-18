# dArchiva

**Enterprise Document Management System for Large-Scale Digitization**

dArchiva is a comprehensive document management system designed to ingest, process, secure, and analyze millions of financial and legal documents. Built on a modern Python/PostgreSQL stack with a React frontend, it combines enterprise-grade security, AI-powered OCR, and advanced search capabilities.

> Forked from [Papermerge](https://github.com/papermerge/papermerge-core) with significant enhancements for enterprise deployment.

---

## Key Capabilities

### Document Processing at Scale

- **4+ Million Document Capacity**: Designed for enterprise-scale document archives spanning 20+ years
- **Multi-Engine OCR**: PaddleOCR (primary), Tesseract (fallback), Qwen-VL vision-language model via Ollama
- **Specialized Recognition**: Handwriting, technical drawings, financial records
- **Multi-Document Segmentation**: Detect and split multiple documents from single scans
- **Intelligent Preprocessing**: Deskew, denoise, binarize for maximum OCR accuracy
- **Document Quality Assurance**: Real-time quality scoring during ingestion

### Multi-Backend Search

| Backend | Use Case |
|---------|----------|
| **PostgreSQL FTS** | Default, zero-config full-text search |
| **Elasticsearch** | High-performance, enterprise deployments |
| **SOLR** | Alternative enterprise search |
| **Meilisearch** | Typo-tolerant, instant search |
| **pgvector** | Semantic/vector search with embeddings |

### Enterprise Security

| Feature | Description |
|---------|-------------|
| **RBAC** | Role-Based Access Control with permissions |
| **ABAC** | Attribute-Based Access Control with policies |
| **ReBAC** | Relationship-Based Access Control (Zanzibar-style) |
| **PBAC** | Policy-Based Access Control with Rego/Cedar |
| **2FA** | TOTP, SMS, Email verification |
| **Passkeys** | WebAuthn/FIDO2 passwordless authentication |
| **Department Isolation** | Granular access by department and document type |

### Cloud Storage

- **AWS S3** with intelligent tiering (Standard, IA, Glacier, Deep Archive)
- **Cloudflare R2** for cost-effective storage
- **Linode Object Storage** for regional deployment
- **Lifecycle Policies**: Automatic archival based on document age

### Scanner Integration

| Protocol | Description |
|----------|-------------|
| **eSCL/AirScan** | Network scanners (modern standard) |
| **SANE** | Linux/Unix scanners |
| **TWAIN/WIA** | Windows scanners |

Features:
- Scanner auto-discovery on local network
- Centralized scanner management
- Real-time scan preview
- Batch scanning with automatic document detection

### Physical Inventory Tracking

- **Data Matrix** barcodes (primary) for boxes, folders, documents
- **QR Code** fallback for compatibility
- **Hierarchical Labeling**: Box → Folder → Document tracking
- **Print Queue Management**: Bulk label generation
- **Barcode Scanning**: Quick document lookup from physical copies

### Scanning Project Management

- **Project Planning**: Define scope, timeline, targets
- **Multi-Operator Support**: Track individual performance
- **Real-Time Dashboards**: Progress, velocity, quality metrics
- **Daily Status Reports**: PDF generation and email distribution
- **Completion Forecasting**: Predict end dates based on velocity
- **Issue Tracking**: Equipment, quality, staffing blockers

### AI-Powered Metadata Extraction

- **SpaCy NLP**: Extract entities (names, dates, amounts)
- **Document Classification**: Automatic categorization
- **Table Extraction**: Structured data from invoices
- **Custom Field Mapping**: Per-document-type extraction rules

### Multi-Tenancy & Deployment

- **SaaS Mode**: Schema-per-tenant isolation
- **On-Premise**: Single-tenant deployment
- **Hybrid**: Some tenants on-prem, others in cloud
- **Cost Tracking**: Per-tenant usage and billing

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (React/Mantine)                     │
├─────────────────────────────────────────────────────────────────────┤
│                         API Gateway (FastAPI)                        │
├──────────────┬──────────────┬──────────────┬───────────────────────┤
│  Auth Server │  Core API    │  OCR Worker  │  Storage Worker        │
│  (FastAPI)   │  (FastAPI)   │  (Celery)    │  (Celery)             │
├──────────────┴──────────────┴──────────────┴───────────────────────┤
│                         Message Queue (Redis)                        │
├──────────────┬──────────────┬──────────────┬───────────────────────┤
│  PostgreSQL  │ Elasticsearch│  Ollama      │  S3/R2/Linode         │
│  + pgvector  │ /Meilisearch │  (Qwen-VL)   │  Object Storage       │
└──────────────┴──────────────┴──────────────┴───────────────────────┘
```

### Repository Structure

```
dArchiva/
├── papermerge-core/          # Core API + Frontend
│   ├── papermerge/           # Python backend (FastAPI)
│   └── frontend/             # React/Mantine UI
├── papermerge-ocr-worker/    # OCR processing (Celery)
├── papermerge-s3-worker/     # Storage sync (Celery)
├── papermerge-auth-server/   # Authentication service
└── spec/                     # Specifications and plans
    ├── spec.md               # Requirements specification
    └── implementation-plan.md # Detailed implementation plan
```

---

## Feature Modules

### 1. Storage Module

**Supported Backends:**
- AWS S3 (all regions)
- Cloudflare R2
- Linode Object Storage
- Local filesystem (development)

**Storage Classes:**
- Hot storage: Searchable PDFs, thumbnails
- Cold storage: Original scans (Deep Archive)
- Automatic lifecycle transitions

### 2. OCR Module

**Engines:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    Document Image Input                         │
└─────────────────────────────┬───────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────────┐
        │PaddleOCR │   │Tesseract │   │ Qwen-VL/VLM  │
        │(Primary) │   │(Fallback)│   │(Analysis)    │
        └────┬─────┘   └────┬─────┘   └──────┬───────┘
             │              │                │
             └──────────────┼────────────────┘
                            ▼
              ┌─────────────────────────────┐
              │   Merged Text + Structure   │
              └─────────────────────────────┘
```

**Specialized Modes:**
- Standard printed text
- Handwriting recognition
- Technical drawings (CAD, blueprints)
- Financial documents (invoices, receipts)
- Multi-document images (automatic segmentation)

### 3. Search Module

**Search Flow:**
```
User Query → Query Parser → Search Backend → Permission Filter → Results
                               ↓
          ┌────────────────────┼────────────────────┐
          │                    │                    │
    ┌─────▼─────┐       ┌─────▼─────┐       ┌─────▼─────┐
    │PostgreSQL │       │Elasticsearch│     │ pgvector  │
    │   FTS     │       │  /SOLR    │       │ Semantic  │
    └───────────┘       └───────────┘       └───────────┘
```

**Capabilities:**
- Full-text search with ranking
- Faceted filtering (date, type, department)
- Semantic search ("documents about late payments")
- Boolean operators (AND, OR, NOT)
- Phrase matching
- Wildcard search

### 4. Security Module

**Access Control Layers:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    Request with JWT Token                        │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   RBAC Check      │ ← User has role with permission?
                    │   (Role-Based)    │
                    └─────────┬─────────┘
                              │ ✓
                    ┌─────────▼─────────┐
                    │   ABAC Check      │ ← User attributes match policy?
                    │   (Attribute)     │
                    └─────────┬─────────┘
                              │ ✓
                    ┌─────────▼─────────┐
                    │   ReBAC Check     │ ← User has relationship to resource?
                    │   (Relationship)  │
                    └─────────┬─────────┘
                              │ ✓
                    ┌─────────▼─────────┐
                    │   PBAC Check      │ ← Policy engine allows?
                    │   (Policy)        │
                    └─────────┬─────────┘
                              │ ✓
                    ┌─────────▼─────────┐
                    │   Access Granted  │
                    └───────────────────┘
```

### 5. Scanner Module

**Discovery & Control:**
- eSCL scanner auto-discovery via mDNS
- SANE backend for legacy scanners
- TWAIN/WIA bridge for Windows
- Scan job queue management
- Real-time preview

**Workflow:**
```
Scanner Discovery → Scanner Selection → Scan Settings → Scan → Quality Check → Import
```

### 6. Project Management Module

**Dashboard Metrics:**
- Overall completion percentage
- Daily/weekly/monthly pages scanned
- Operator performance rankings
- Scanner utilization
- Quality scores
- Completion forecast

**Report Generation:**
- Daily status reports (PDF)
- Operator performance reports
- Scanner utilization reports
- Email distribution scheduling

### 7. Inventory Module

**Physical Document Tracking:**
```
Box (Data Matrix Label)
 └── Folder (Data Matrix Label)
      └── Document (Optional Label)
           └── Pages (Scanned)
```

**Workflow:**
1. Print Data Matrix labels for boxes/folders
2. Scan label when processing batch
3. System tracks which physical container holds which documents
4. Lookup: scan label → see all digitized documents from that box

### 8. Multi-Tenancy Module

**Isolation Modes:**
- **Schema-per-tenant**: Separate PostgreSQL schemas
- **Database-per-tenant**: Separate databases (high isolation)
- **Shared schema**: Row-level filtering (cost-effective)

**Tenant Features:**
- Custom branding
- Independent user management
- Separate storage buckets
- Usage tracking and billing

### 9. Email Integration Module

**Supported Clients:**
| Client | Integration Type |
|--------|------------------|
| **Microsoft Outlook** | COM Add-in (Windows), Web Add-in (365) |
| **Gmail** | Chrome Extension, Google Workspace Add-on |
| **IMAP** | Direct mailbox ingestion |

**Features:**
- One-click email → document archival
- Attachment extraction with OCR
- Metadata preservation (sender, date, subject)
- Folder mapping to document types
- Auto-categorization via AI

### 10. Document Organization Module

**Hierarchy:**
```
Portfolio (e.g., "Client ABC Holdings")
 └── Case (e.g., "2024 Tax Audit")
      └── Bundle/Binder (e.g., "Financial Statements")
           └── Document (e.g., "Q1 Balance Sheet")
                └── Page
```

**Bundle/Binder Features:**
- Ordered document collections
- Drag-and-drop reordering
- Section dividers with labels
- Exhibit numbering (Exhibit A, B, C...)
- Combined PDF export with TOC

**Case Features:**
- Group related bundles and documents
- Case metadata (case number, jurisdiction, dates)
- Timeline view of documents
- Status tracking (Open, Active, Closed, Archived)

**Portfolio Features:**
- Group related cases
- Client or matter organization
- Cross-case document search
- Portfolio-level reporting

### 11. Hierarchical Access Control Module

**Access Inheritance:**
```
Portfolio Access → Inherited by Cases → Inherited by Bundles → Inherited by Documents → Inherited by Pages
```

**Granular Permissions:**
| Permission | Description |
|------------|-------------|
| **View** | See document in viewer |
| **Download** | Download original file |
| **Print** | Print document |
| **Edit** | Modify document/metadata |
| **Share** | Grant access to others |
| **Delete** | Remove document |

**Single-View Access:**
- One-time view links that auto-revoke after first access
- Expiration dates for time-limited access
- Watermarked viewing (viewer's email/name)
- View count limits

**Audit Logging:**
- Every access logged with timestamp, IP, user agent
- View, download, print actions tracked
- Failed access attempts recorded
- Exportable audit reports

### 12. External Integration Module

**Short URLs:**
- Generate short links for documents (e.g., `arc.io/d/abc123`)
- Authenticated or public access options
- Click tracking and analytics
- Integration with ERPs, legal systems, HR systems

**Embeddable Viewer:**
- Iframe widget for external systems
- Secure token-based authentication
- Customizable viewer options
- Cross-origin support

### 13. Form Recognition Module

**Capabilities:**
- Template-based form recognition
- Multi-page form support (e.g., insurance applications, legal contracts)
- Field extraction from filled forms with page correlation
- Checkbox and radio button detection
- Handwriting recognition in form fields
- Table extraction from structured documents

**Multi-Page Form Processing:**
- Cross-page field linking (e.g., page 1 name → page 3 signature)
- Form completion validation across pages
- Page-by-page progress tracking
- Missing page detection

**Signature Extraction:**
- Automatic signature detection on any page
- Signature cropping and storage as separate images
- Signature comparison and verification
- Digital signature certificate extraction
- Initials detection for multi-page contracts

**Data Export:**
- JSON/CSV export of extracted fields
- API integration for downstream systems
- Auto-population of database records
- PDF form filling from extracted data
- Batch export for multiple forms

### 14. Personalization & Theming Module

**User Preferences:**
- Dark/light mode toggle
- Language and locale settings
- Default views and layouts
- Notification preferences
- Keyboard shortcut customization

**Company Branding:**
- Logo upload and display
- Custom color schemes
- Email template customization
- Login page branding
- Report headers and footers

**Tenant Settings:**
- Document numbering schemes
- Default metadata fields
- Workflow configurations
- Retention policies
- Storage quotas

### 15. Document Security Module

**Encryption:**
- AES-256 encryption at rest
- Per-document encryption keys
- Key rotation support
- Encrypted field storage for sensitive metadata

**Hidden Documents:**
- Visibility toggles for sensitive documents
- Hidden from search unless explicitly accessed
- Dual-authorization for access
- Audit trail for hidden document access

### 16. Workflow Management Module

**Workflow Types:**
| Workflow | Description |
|----------|-------------|
| **Approval** | Sequential or parallel approval chains |
| **Review** | Document review with comments |
| **Forwarding** | Route documents to appropriate handlers |
| **Rejection** | Return with reasons and required corrections |
| **Escalation** | Auto-escalate overdue items |

**Insurance Workflow Example:**
```
Application Received
    ↓
Initial Review (Agent) → Reject → Return to Applicant
    ↓ Approve
Underwriting Review → Reject → Return with Reasons
    ↓ Approve
Manager Approval → Reject → Return to Underwriting
    ↓ Approve
Policy Issued
```

**Features:**
- Visual workflow designer (drag-and-drop)
- Conditional branching (if amount > $100K → senior approval)
- Parallel approval tracks
- Deadline management with escalation
- Substitute assignment for absences
- Audit trail of all workflow actions

**Workflow States:**
- Pending: Awaiting action
- In Progress: Being processed
- Approved: Approved and forwarded
- Rejected: Returned with comments
- On Hold: Paused pending information
- Completed: Workflow finished
- Escalated: Overdue and escalated

**Notifications:**
- Email notifications for pending tasks
- In-app notification center
- Push notifications (mobile)
- Daily digest of pending items
- Escalation alerts

### 17. Auto-Routing & Ingestion Module

**Ingestion Sources:**
| Source | Description |
|--------|-------------|
| **Watched Folders** | Monitor directories for new files |
| **Email Inbox** | Archive emails sent to archive@corp.net |
| **Scanner** | Direct scanner integration |
| **API** | Programmatic document upload |

**Auto-Routing:**
- Rule-based routing after ingestion
- Route by document type, metadata, or AI classification
- Route to folders, workflows, or user inboxes

**Ingestion Modes:**
| Mode | Description |
|------|-------------|
| **Archival** | Historical document digitization (no routing) |
| **Operational** | Live documents with full routing and workflows |

---

## Technology Stack

### Backend
| Component | Technology |
|-----------|------------|
| API Framework | FastAPI (async Python) |
| Database | PostgreSQL 15+ with pgvector |
| ORM | SQLAlchemy 2.0 |
| Task Queue | Celery + Redis |
| OCR | PaddleOCR, Tesseract, Ollama |
| NLP | SpaCy |
| PDF | WeasyPrint, pdf2image |

### Frontend
| Component | Technology |
|-----------|------------|
| Framework | React 19 |
| UI Library | Mantine 8 |
| State | Redux Toolkit |
| Build | Vite |
| Charts | Mantine Charts |
| Icons | Tabler Icons |

### Infrastructure
| Component | Technology |
|-----------|------------|
| Container | Docker + Docker Compose |
| Reverse Proxy | Nginx / Traefik |
| Object Storage | S3 / R2 / Linode |
| Search | Elasticsearch / Meilisearch |
| Embeddings | Ollama (nomic-embed-text) |

---

## Document Processing Pipeline

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Scanner    │────▶│  Ingestion   │────▶│ Preprocessing│
│   Input      │     │  Service     │     │   Pipeline   │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                                                  ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Metadata   │◀────│   AI OCR     │◀────│   Quality    │
│   Extraction │     │   Engine     │     │   Check      │
└──────┬───────┘     └──────────────┘     └──────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Storage    │────▶│   Indexing   │────▶│  Searchable  │
│   (S3)       │     │  (ES/FTS)    │     │  Frontend    │
└──────────────┘     └──────────────┘     └──────────────┘
```

**Pipeline Stages:**

1. **Ingestion**: File upload, scanner integration, batch import
2. **Preprocessing**: Deskew, denoise, binarize, enhance
3. **Quality Check**: Automatic quality scoring, reject poor scans
4. **OCR**: Text extraction with layout preservation
5. **Metadata Extraction**: NLP-based entity extraction
6. **Storage**: Original to cold storage, PDF to hot storage
7. **Indexing**: Full-text and semantic search indexing
8. **Access**: Permission-filtered search and retrieval

---

## API Overview

### Authentication
```
POST /token              # Get JWT access token
GET  /verify             # Verify token validity
POST /token/refresh      # Refresh access token
POST /2fa/setup          # Setup TOTP
POST /2fa/verify         # Verify TOTP code
POST /passkeys/register  # Register WebAuthn credential
POST /passkeys/login     # Login with passkey
```

### Documents
```
GET    /documents              # List documents (paginated, filtered)
POST   /documents              # Upload document
GET    /documents/{id}         # Get document metadata
DELETE /documents/{id}         # Delete document
GET    /documents/{id}/pages   # Get pages
GET    /documents/{id}/ocr     # Get OCR text
```

### Search
```
POST /search                   # Full-text search
POST /search/semantic          # Semantic/vector search
GET  /search/suggest           # Autocomplete suggestions
```

### Projects
```
GET    /projects                      # List scanning projects
POST   /projects                      # Create project
GET    /projects/{id}                 # Get project
GET    /projects/{id}/dashboard       # Get dashboard data
GET    /projects/{id}/daily-report    # Get printable report
POST   /projects/{id}/sessions        # Start scanning session
GET    /projects/{id}/operators       # Get operator performance
```

### Scanners
```
GET  /scanners                 # Discover scanners
GET  /scanners/{id}            # Get scanner details
POST /scanners/{id}/scan       # Initiate scan
GET  /scanners/{id}/preview    # Get scan preview
```

### Inventory
```
POST /inventory/labels         # Generate barcode labels
POST /inventory/scan           # Scan barcode, lookup documents
GET  /inventory/boxes          # List physical boxes
GET  /inventory/boxes/{id}     # Get box contents
```

---

## Configuration

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
OCR_ENGINE=hybrid  # paddleocr | tesseract | qwen-vl | hybrid
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_OCR_MODEL=qwen2.5-vl:7b

# Search
SEARCH_BACKEND=elasticsearch  # postgres | elasticsearch | solr | meilisearch
ELASTICSEARCH_URL=http://elasticsearch:9200

# Embeddings (for semantic search)
EMBEDDING_PROVIDER=ollama
EMBEDDING_MODEL=nomic-embed-text

# Auth
PM_SECRET_KEY=your-secret-key
PM_TOKEN_EXPIRE_MINUTES=1440
```

---

## Deployment

### Docker Compose (Recommended)

```bash
# Development
docker-compose -f docker-compose.yml up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| nginx | 80/443 | Reverse proxy |
| core-api | 8000 | Main API |
| auth-server | 8001 | Authentication |
| frontend | 3000 | React UI |
| ocr-worker | - | OCR processing |
| s3-worker | - | Storage sync |
| postgres | 5432 | Database |
| redis | 6379 | Cache/Queue |
| elasticsearch | 9200 | Search |
| ollama | 11434 | AI models |

---

## Development

### Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker (optional)

### Setup

```bash
# Clone repositories
git clone https://github.com/yourorg/dArchiva.git
cd dArchiva

# Backend setup
cd papermerge-core
uv sync
uv run alembic upgrade head

# Frontend setup
cd frontend
yarn install
yarn dev

# Auth server
cd ../papermerge-auth-server
uv sync

# OCR worker
cd ../papermerge-ocr-worker
uv sync

# S3 worker
cd ../papermerge-s3-worker
uv sync
```

### Testing

```bash
# Backend tests
uv run pytest -vxs tests/ci

# Type checking
uv run pyright

# Frontend tests
yarn test
```

---

## Roadmap

See [spec/implementation-plan.md](spec/implementation-plan.md) for detailed implementation phases.

### Phase 1: Foundation
- [ ] Linode storage backend
- [ ] pgvector extension
- [ ] Department tables and RBAC

### Phase 2: OCR Enhancement
- [ ] PaddleOCR integration
- [ ] Ollama Qwen-VL support
- [ ] SpaCy metadata extraction
- [ ] Form recognition engine
- [ ] Multi-page form processing
- [ ] Signature extraction

### Phase 3: Search Enhancement
- [ ] Search backend abstraction
- [ ] Elasticsearch backend
- [ ] Meilisearch backend
- [ ] Semantic search

### Phase 4: Security Enhancement
- [ ] ABAC policy engine
- [ ] 2FA and Passkeys
- [ ] Security dashboard
- [ ] Document encryption
- [ ] Hidden document support

### Phase 5: Project Management
- [ ] Scanning projects
- [ ] Operator tracking
- [ ] Daily reports

### Phase 6: Scanner Integration
- [ ] eSCL/AirScan support
- [ ] SANE backend
- [ ] Scan workflow UI

### Phase 7: Inventory System
- [ ] Data Matrix labeling
- [ ] Barcode scanning
- [ ] Physical tracking

### Phase 8: Document Organization
- [ ] Portfolios and Cases
- [ ] Bundles and Binders
- [ ] Hierarchical access control
- [ ] Single-view access

### Phase 9: Email Integration
- [ ] Outlook Add-in
- [ ] Gmail Extension
- [ ] IMAP ingestion
- [ ] Auto-categorization

### Phase 10: Workflow Management
- [ ] Visual workflow designer
- [ ] Approval chains
- [ ] Forwarding and routing
- [ ] Rejection handling
- [ ] Escalation management

### Phase 11: Personalization
- [ ] Dark/light mode
- [ ] Company branding
- [ ] Tenant settings
- [ ] Report customization

---

## Contributing

This project is designed to contribute enhancements back to upstream Papermerge where applicable. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Upstream Contribution Strategy

Features are designed as optional modules:
```
papermerge-search-elasticsearch  # Elasticsearch backend
papermerge-search-meilisearch    # Meilisearch backend
papermerge-ocr-paddleocr         # PaddleOCR engine
papermerge-scanner               # Scanner integration
papermerge-inventory             # Physical inventory
```

---

## License

This project is licensed under the Apache License 2.0 - see [LICENSE](LICENSE) file.

---

## Acknowledgments

- [Papermerge](https://github.com/papermerge/papermerge-core) - Base document management system
- [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) - OCR engine
- [Mantine](https://mantine.dev/) - React UI components
- [FastAPI](https://fastapi.tiangolo.com/) - Python API framework
