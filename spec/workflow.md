# dArchiva Workflow Engine - Architectural Audit & Enhancement Specification

## Executive Summary

The current workflow system comprises **~4,200 lines** of code across frontend (3,333) and backend (889). It achieves **~75% frontend** and **~85% backend** implementation for sequential approval workflows. However, significant gaps exist in control flow complexity, operational robustness, and enterprise-grade capabilities.

---

## 1. Current State Analysis

### 1.1 Frontend Inventory (darchiva-ui)

| File | Lines | Status |
|------|-------|--------|
| `types.ts` | 237 | Complete |
| `store.ts` | 317 | Complete |
| `api.ts` | 345 | Complete |
| `hooks.ts` | 280 | Complete |
| `Designer.tsx` | 518 | Well-Implemented |
| `WorkflowNode.tsx` | 289 | Complete |
| `NodeConfigPanel.tsx` | 669 | Complete |
| `Workflows.tsx` | 678 | Partial |
| **Total** | **3,333** | **~75%** |

**Implemented Features:**
- React Flow v12 visual designer with drag-and-drop
- 15 node types with color-coded visualization
- Undo/redo (50 history limit), copy/paste with ID remapping
- Zustand state management with Immer
- React Query hooks for all CRUD operations
- Node configuration panel with type-specific fields
- Keyboard shortcuts (Ctrl+Z, Delete, Ctrl+C/V)
- Minimap, zoom controls, snap-to-grid

**Critical Gaps:**
- No workflow editing (can't open existing workflows)
- No connection validation rules
- No cycle detection
- No real-time frontend validation
- No execution visualization
- Settings hooks missing

### 1.2 Backend Inventory (papermerge-core)

| Component | Lines | Status |
|-----------|-------|--------|
| `workflow_engine.py` | 319 | Fully implemented, 3 TODOs |
| `router.py` | 187 | Fully implemented |
| `orm.py` | 248 | Fully implemented |
| `schema.py` | 111 | Fully implemented |
| **Total** | **865** | **~85%** |

**Implemented Features:**
- Sequential approval workflows
- Deadline tracking with escalation
- Status tracking (PENDING → IN_PROGRESS → COMPLETED/REJECTED/CANCELLED)
- Audit trail via `WorkflowStepExecution` table
- Tenant isolation
- Context/metadata storage (JSONB)

**Critical Gaps:**
- No DAG executor (linear step_order only)
- `condition_expression` field never evaluated
- 6 action types defined but unimplemented
- `forward` action stubbed (empty pass)
- No Celery task integration
- No notification system
- No dynamic role/group assignment

---

## 2. Functional Completeness Audit

### 2.1 Control Flow Capabilities

| Capability | Frontend | Backend | Status |
|------------|----------|---------|--------|
| Sequential steps | ✓ | ✓ | **Complete** |
| Parallel gateway | UI only | ❌ | **Gap** |
| Conditional branching | UI only | Schema only | **Gap** |
| Merge/Join gateway | UI only | ❌ | **Gap** |
| Split gateway | UI only | ❌ | **Gap** |
| Error handling | ❌ | ❌ | **Gap** |
| Compensation/Rollback | ❌ | ❌ | **Gap** |
| Timeouts | ❌ | Partial | **Gap** |
| Loops/Iterations | ❌ | ❌ | **Gap** |
| Sub-workflows | ❌ | ❌ | **Gap** |

### 2.2 Data Propagation

| Capability | Status | Notes |
|------------|--------|-------|
| Instance context (JSONB) | ✓ | Basic dict passed through |
| Step input/output schema | ❌ | No type checking |
| Data mapping between nodes | ❌ | No transformation layer |
| Variable expressions | ❌ | No expression engine |
| External data fetch | ❌ | No HTTP/DB node |

### 2.3 External Integration

| Integration | Status | Notes |
|-------------|--------|-------|
| REST webhooks | Schema only | `CALL_WEBHOOK` defined, not implemented |
| gRPC | ❌ | Not supported |
| Message queues | ❌ | Not supported |
| Email notifications | TODO | Stubbed in code |
| Database queries | ❌ | Not supported |
| File operations | Schema only | `MOVE_TO_FOLDER` defined, not implemented |

---

## 3. Ergonomic Excellence Audit

### 3.1 Visual Interface - Current State

| Feature | Status |
|---------|--------|
| Drag-and-drop composition | ✓ |
| Snap-to-grid (15px) | ✓ |
| Minimap | ✓ |
| Zoom controls (0.1-2.0) | ✓ |
| Undo/Redo | ✓ |
| Copy/Paste | ✓ |
| Keyboard shortcuts | ✓ |
| Node categorization | ✓ |
| Node configuration panel | ✓ |
| Dark theme | ✓ |

### 3.2 Ergonomic Gaps

| Gap | Severity | Impact |
|-----|----------|--------|
| No workflow editing | Critical | Can't modify saved workflows |
| No connection validation | High | Invalid graphs possible |
| No cycle detection | High | Infinite loops creatable |
| No real-time validation | Medium | Errors only on save |
| No auto-layout | Medium | Dagre imported but unused |
| No type-aware hints | Medium | Generic config for all nodes |
| No constraint preview | Medium | Can't see what connects where |
| No execution visualization | Medium | Status indicators exist but not wired |
| No WCAG compliance | Medium | No aria-labels, keyboard nav incomplete |
| No versioning UI | Low | Backend supports versions, no UI |

### 3.3 Configuration Panel Issues

| Issue | Details |
|-------|---------|
| No required field markers | Users don't know what's mandatory |
| No field validation | Invalid JSON accepted until save |
| No conditional fields | All fields show regardless of relevance |
| No field dependencies | e.g., OCR language requires engine selection |
| No preview/test | Can't test individual node configs |

---

## 4. Operational Capability Audit

### 4.1 Observability

| Capability | Status | Notes |
|------------|--------|-------|
| Structured logging | Partial | `logger.info()` calls exist |
| Distributed tracing | ❌ | No trace IDs |
| Metrics emission | ❌ | No Prometheus/StatsD |
| Execution history | ✓ | `WorkflowStepExecution` table |
| Audit trail | ✓ | action_taken, comments stored |
| Error tracking | Partial | Errors logged, not aggregated |

### 4.2 Execution Model

| Capability | Status | Notes |
|------------|--------|-------|
| Idempotent execution | ❌ | No idempotency keys |
| ACID transactions | Partial | Single commit per action |
| State persistence | ✓ | PostgreSQL JSONB |
| Horizontal scaling | ❌ | No distributed locking |
| Failure recovery | ❌ | No retry mechanism |
| Graceful degradation | ❌ | No circuit breakers |

### 4.3 Background Processing

| Task | Status | Notes |
|------|--------|-------|
| Deadline checking | Method exists | Never called (`check_deadlines()`) |
| Escalation | Code exists | No Celery task |
| Notification sending | TODO | Not implemented |
| Scheduled triggers | Schema only | No scheduler |
| Cleanup/Archival | ❌ | Not implemented |

---

## 5. Enhancement Specification

### Phase 1: Core Engine Hardening (Backend)

#### 5.1 DAG Executor Implementation

```python
# Location: papermerge/core/features/workflows/executor/dag.py

class DAGExecutor:
    """Directed Acyclic Graph workflow executor with parallel support."""

    async def execute(self, instance: WorkflowInstance) -> ExecutionResult:
        """Execute workflow DAG from current state."""

    async def evaluate_node(self, node: WorkflowNode, context: ExecutionContext) -> NodeResult:
        """Execute single node with input/output mapping."""

    async def evaluate_condition(self, expression: str, context: ExecutionContext) -> bool:
        """Evaluate condition expression using CEL/JSONPath."""

    async def handle_gateway(self, gateway_type: str, inputs: list[NodeResult]) -> list[str]:
        """Handle parallel/exclusive/inclusive gateway logic."""
```

**Key additions:**
- Replace linear `step_order` with adjacency list traversal
- Implement gateway semantics (XOR, AND, OR splits/joins)
- Add expression evaluation engine (CEL or simpleeval)
- Track in-flight nodes for parallel execution

#### 5.2 Expression Engine

```python
# Location: papermerge/core/features/workflows/expressions.py

class ExpressionEngine:
    """Safe expression evaluation for workflow conditions."""

    def evaluate(self, expression: str, context: dict) -> Any:
        """Evaluate expression with sandboxed execution."""

    def validate(self, expression: str) -> list[ValidationError]:
        """Validate expression syntax without execution."""

    def extract_variables(self, expression: str) -> list[str]:
        """Extract variable references for dependency tracking."""
```

**Supported expressions:**
- `context.amount > 10000` → Boolean
- `document.type == 'invoice'` → Boolean
- `step['ocr'].confidence > 0.9` → Boolean
- `context.approvers | length > 0` → Boolean

#### 5.3 Action Executor Registry

```python
# Location: papermerge/core/features/workflows/actions/registry.py

class ActionRegistry:
    """Registry of executable workflow actions."""

    _actions: dict[ActionType, ActionExecutor] = {}

    def register(self, action_type: ActionType, executor: ActionExecutor):
        """Register action executor."""

    async def execute(self, action_type: ActionType, config: dict, context: ExecutionContext) -> ActionResult:
        """Execute registered action."""

# Individual executors:
class MoveToFolderAction(ActionExecutor): ...
class SendEmailAction(ActionExecutor): ...
class CallWebhookAction(ActionExecutor): ...
class SetMetadataAction(ActionExecutor): ...
class AssignTagAction(ActionExecutor): ...
class SetStatusAction(ActionExecutor): ...
```

#### 5.4 Database Schema Additions

```sql
-- Add workflow graph structure (replace step_order)
CREATE TABLE workflow_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    source_step_id UUID REFERENCES workflow_steps(id),
    target_step_id UUID REFERENCES workflow_steps(id),
    condition_expression TEXT,
    edge_label VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add idempotency tracking
CREATE TABLE workflow_execution_keys (
    idempotency_key VARCHAR(255) PRIMARY KEY,
    instance_id UUID REFERENCES workflow_instances(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

-- Add distributed locking
CREATE TABLE workflow_locks (
    lock_key VARCHAR(255) PRIMARY KEY,
    holder_id VARCHAR(255) NOT NULL,
    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Add step input/output schema
ALTER TABLE workflow_steps ADD COLUMN input_schema JSONB;
ALTER TABLE workflow_steps ADD COLUMN output_schema JSONB;

-- Add execution metrics
CREATE TABLE workflow_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID REFERENCES workflow_instances(id),
    step_id UUID REFERENCES workflow_steps(id),
    metric_name VARCHAR(100),
    metric_value DOUBLE PRECISION,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_workflow_metrics_time ON workflow_metrics(recorded_at);
```

#### 5.5 Celery Task Integration

```python
# Location: papermerge/core/tasks/workflows.py

@celery_app.task(bind=True, max_retries=3)
def check_workflow_deadlines(self):
    """Periodic task to check and escalate overdue steps."""

@celery_app.task(bind=True, max_retries=3)
def execute_workflow_step(self, step_execution_id: str):
    """Execute a single workflow step with retry."""

@celery_app.task
def cleanup_expired_locks():
    """Clean up expired distributed locks."""

@celery_app.task
def archive_completed_workflows(days_old: int = 90):
    """Archive old completed workflow instances."""

# Beat schedule
CELERYBEAT_SCHEDULE = {
    'check-workflow-deadlines': {
        'task': 'papermerge.core.tasks.workflows.check_workflow_deadlines',
        'schedule': crontab(minute='*/5'),
    },
    'cleanup-locks': {
        'task': 'papermerge.core.tasks.workflows.cleanup_expired_locks',
        'schedule': crontab(minute='*/10'),
    },
}
```

---

### Phase 2: Frontend Enhancements

#### 5.6 Graph Validation System

```typescript
// Location: src/features/workflows/validation/index.ts

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export function validateWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]): ValidationResult {
  const errors: ValidationError[] = [];

  // 1. Cycle detection (Kahn's algorithm)
  const cycles = detectCycles(nodes, edges);
  if (cycles.length > 0) {
    errors.push({ code: 'CYCLE_DETECTED', message: `Workflow contains cycles`, severity: 'error' });
  }

  // 2. Connection validation
  for (const edge of edges) {
    const source = nodes.find(n => n.id === edge.source);
    const target = nodes.find(n => n.id === edge.target);
    if (!isValidConnection(source?.type, target?.type)) {
      errors.push({
        edgeId: edge.id,
        code: 'INVALID_CONNECTION',
        message: `${source?.type} cannot connect to ${target?.type}`,
        severity: 'error'
      });
    }
  }

  // 3. Required field validation
  for (const node of nodes) {
    const missing = getMissingRequiredFields(node);
    for (const field of missing) {
      errors.push({
        nodeId: node.id,
        code: 'MISSING_REQUIRED_FIELD',
        message: `${node.type}: ${field} is required`,
        severity: 'error'
      });
    }
  }

  // 4. Orphan detection
  const orphans = findOrphanNodes(nodes, edges);
  for (const orphan of orphans) {
    errors.push({
      nodeId: orphan.id,
      code: 'ORPHAN_NODE',
      message: `Node "${orphan.label}" is not connected to workflow`,
      severity: 'warning'
    });
  }

  return { valid: errors.filter(e => e.severity === 'error').length === 0, errors, warnings: [] };
}
```

#### 5.7 Connection Rules Engine

```typescript
// Location: src/features/workflows/validation/connections.ts

const CONNECTION_RULES: Record<WorkflowNodeType, WorkflowNodeType[]> = {
  source: ['preprocess', 'ocr', 'classify', 'validate', 'route', 'store', 'notify'],
  preprocess: ['ocr', 'classify', 'validate', 'store'],
  ocr: ['nlp', 'classify', 'validate', 'index', 'store'],
  nlp: ['classify', 'validate', 'index', 'route', 'store'],
  classify: ['route', 'validate', 'store', 'notify'],
  validate: ['route', 'store', 'notify', 'approval'],
  route: ['store', 'notify', 'approval', 'transform'],
  store: ['index', 'notify'],
  index: ['notify'],
  notify: [],
  transform: ['store', 'index', 'route'],
  condition: ['route', 'store', 'notify', 'approval'],
  approval: ['route', 'store', 'notify'],
  merge: ['route', 'store', 'notify', 'validate'],
  split: ['preprocess', 'ocr', 'classify', 'validate', 'route', 'store'],
};

export function isValidConnection(sourceType: WorkflowNodeType, targetType: WorkflowNodeType): boolean {
  return CONNECTION_RULES[sourceType]?.includes(targetType) ?? false;
}
```

#### 5.8 Execution Visualization

```typescript
// Location: src/features/workflows/components/ExecutionViewer.tsx

interface ExecutionViewerProps {
  executionId: string;
}

export function ExecutionViewer({ executionId }: ExecutionViewerProps) {
  const { data: execution } = useExecution(executionId);
  const { data: workflow } = useWorkflow(execution?.workflow_id);

  const nodeStates = useMemo(() => {
    const states: Record<string, NodeExecutionState> = {};
    for (const stepExec of execution?.step_executions ?? []) {
      states[stepExec.step_id] = {
        status: stepExec.status,
        startedAt: stepExec.started_at,
        completedAt: stepExec.completed_at,
        error: stepExec.error,
      };
    }
    return states;
  }, [execution]);

  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={workflow?.nodes.map(n => ({
          ...n,
          data: {
            ...n.data,
            executionState: nodeStates[n.id],
            isRunning: nodeStates[n.id]?.status === 'IN_PROGRESS',
            isCompleted: nodeStates[n.id]?.status === 'COMPLETED',
            hasError: nodeStates[n.id]?.status === 'FAILED',
          }
        }))}
        edges={workflow?.edges}
        nodeTypes={nodeTypes}
        fitView
        panOnDrag={false}
        zoomOnScroll={false}
      />
      <ExecutionTimeline execution={execution} />
    </ReactFlowProvider>
  );
}
```

#### 5.9 WCAG 2.1 AA Compliance

```typescript
// Add aria labels and keyboard navigation
<div
  role="button"
  tabIndex={0}
  aria-label={`${node.type} node: ${node.label}. ${node.data.description || ''}`}
  aria-selected={selected}
  aria-describedby={`node-status-${node.id}`}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') selectNode(node.id);
    if (e.key === 'Delete') deleteNode(node.id);
    if (e.key === 'ArrowRight') selectNextNode();
    if (e.key === 'ArrowLeft') selectPrevNode();
  }}
>

// Add status announcement for screen readers
<div id={`node-status-${node.id}`} className="sr-only">
  {node.data.isRunning && 'Currently executing'}
  {node.data.isCompleted && 'Completed successfully'}
  {node.data.hasError && `Failed: ${node.data.errorMessage}`}
</div>

// Focus visible styles
.workflow-node:focus-visible {
  outline: 3px solid var(--brass-400);
  outline-offset: 2px;
}
```

---

### Phase 3: Operational Excellence

#### 5.10 Distributed Locking

```python
# Location: papermerge/core/features/workflows/locking.py

class DistributedLock:
    """PostgreSQL advisory lock wrapper for workflow operations."""

    def __init__(self, db: AsyncSession, lock_key: str, holder_id: str, ttl_seconds: int = 300):
        self.db = db
        self.lock_key = lock_key
        self.holder_id = holder_id
        self.ttl_seconds = ttl_seconds

    async def acquire(self) -> bool:
        """Attempt to acquire lock, returns True if successful."""
        try:
            await self.db.execute(
                text("""
                    INSERT INTO workflow_locks (lock_key, holder_id, expires_at)
                    VALUES (:key, :holder, NOW() + :ttl * INTERVAL '1 second')
                    ON CONFLICT (lock_key) DO UPDATE
                    SET holder_id = EXCLUDED.holder_id,
                        acquired_at = NOW(),
                        expires_at = EXCLUDED.expires_at
                    WHERE workflow_locks.expires_at < NOW()
                """),
                {"key": self.lock_key, "holder": self.holder_id, "ttl": self.ttl_seconds}
            )
            await self.db.commit()
            return True
        except IntegrityError:
            return False

    async def release(self):
        """Release lock if held by this holder."""
        await self.db.execute(
            text("DELETE FROM workflow_locks WHERE lock_key = :key AND holder_id = :holder"),
            {"key": self.lock_key, "holder": self.holder_id}
        )
        await self.db.commit()

    async def __aenter__(self):
        if not await self.acquire():
            raise LockNotAcquiredError(f"Could not acquire lock: {self.lock_key}")
        return self

    async def __aexit__(self, *args):
        await self.release()
```

#### 5.11 Idempotency Layer

```python
# Location: papermerge/core/features/workflows/idempotency.py

class IdempotencyService:
    """Ensure workflow operations are idempotent."""

    async def check_or_create(self, key: str, instance_id: str) -> tuple[bool, str | None]:
        """Check if operation already executed. Returns (is_new, existing_instance_id)."""
        result = await self.db.execute(
            text("""
                INSERT INTO workflow_execution_keys (idempotency_key, instance_id)
                VALUES (:key, :instance_id)
                ON CONFLICT (idempotency_key) DO NOTHING
                RETURNING idempotency_key
            """),
            {"key": key, "instance_id": instance_id}
        )

        if result.rowcount == 0:
            existing = await self.db.execute(
                text("SELECT instance_id FROM workflow_execution_keys WHERE idempotency_key = :key"),
                {"key": key}
            )
            return (False, existing.scalar())

        return (True, None)
```

#### 5.12 Circuit Breaker

```python
# Location: papermerge/core/features/workflows/circuit_breaker.py

class CircuitBreaker:
    """Circuit breaker for external service calls."""

    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 60, redis_client: Redis = None):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.redis = redis_client

    async def call(self, service_name: str, func: Callable, *args, **kwargs):
        """Execute function with circuit breaker protection."""
        state = await self._get_state(service_name)

        if state == self.OPEN:
            raise CircuitOpenError(f"Circuit open for {service_name}")

        try:
            result = await func(*args, **kwargs)
            await self._record_success(service_name)
            return result
        except Exception as e:
            await self._record_failure(service_name)
            raise
```

#### 5.13 Metrics & Tracing

```python
# Location: papermerge/core/features/workflows/observability.py

from opentelemetry import trace
from prometheus_client import Counter, Histogram, Gauge

workflow_executions_total = Counter(
    'workflow_executions_total',
    'Total workflow executions',
    ['workflow_id', 'status']
)

workflow_step_duration = Histogram(
    'workflow_step_duration_seconds',
    'Workflow step execution duration',
    ['workflow_id', 'step_type'],
    buckets=[0.1, 0.5, 1.0, 5.0, 10.0, 30.0, 60.0, 300.0]
)

workflow_active_instances = Gauge(
    'workflow_active_instances',
    'Currently active workflow instances',
    ['workflow_id']
)

tracer = trace.get_tracer("workflow-engine")

class ObservableWorkflowEngine(WorkflowEngine):
    """Workflow engine with built-in observability."""

    async def execute_step(self, step: WorkflowStep, context: ExecutionContext):
        with tracer.start_as_current_span(
            f"workflow.step.{step.step_type}",
            attributes={
                "workflow.id": str(context.instance.workflow_id),
                "workflow.step.id": str(step.id),
                "workflow.step.type": step.step_type.value,
            }
        ) as span:
            start_time = time.monotonic()
            try:
                result = await super().execute_step(step, context)
                span.set_status(Status(StatusCode.OK))
                return result
            except Exception as e:
                span.set_status(Status(StatusCode.ERROR, str(e)))
                span.record_exception(e)
                raise
            finally:
                duration = time.monotonic() - start_time
                workflow_step_duration.labels(
                    workflow_id=str(context.instance.workflow_id),
                    step_type=step.step_type.value
                ).observe(duration)
```

#### 5.14 Dead Letter Queue

```python
# Location: papermerge/core/features/workflows/dlq.py

class DeadLetterQueue:
    """Dead letter queue for failed workflow executions."""

    async def enqueue(self, execution_id: str, error: Exception, retry_count: int, context: dict):
        """Add failed execution to DLQ for investigation."""
        await self.db.execute(
            text("""
                INSERT INTO workflow_dead_letters (
                    execution_id, error_type, error_message,
                    stack_trace, retry_count, context, created_at
                ) VALUES (
                    :exec_id, :err_type, :err_msg, :stack, :retries, :ctx, NOW()
                )
            """),
            {
                "exec_id": execution_id,
                "err_type": type(error).__name__,
                "err_msg": str(error),
                "stack": traceback.format_exc(),
                "retries": retry_count,
                "ctx": json.dumps(context),
            }
        )

    async def retry(self, dead_letter_id: str) -> WorkflowInstance:
        """Retry a dead-lettered execution."""
```

---

### Phase 4: External Integration Adapters

#### 5.15 Adapter Registry

```python
# Location: papermerge/core/features/workflows/adapters/base.py

from abc import ABC, abstractmethod

class ExternalAdapter(ABC):
    """Base class for external service adapters."""

    @abstractmethod
    async def execute(self, config: dict, context: ExecutionContext) -> AdapterResult:
        """Execute adapter with given configuration."""

    @abstractmethod
    def validate_config(self, config: dict) -> list[ValidationError]:
        """Validate adapter configuration."""

    @property
    @abstractmethod
    def config_schema(self) -> dict:
        """JSON Schema for adapter configuration."""

class AdapterRegistry:
    _adapters: dict[str, type[ExternalAdapter]] = {}

    @classmethod
    def register(cls, name: str):
        def decorator(adapter_cls: type[ExternalAdapter]):
            cls._adapters[name] = adapter_cls
            return adapter_cls
        return decorator

    @classmethod
    def get(cls, name: str) -> ExternalAdapter:
        return cls._adapters[name]()
```

#### 5.16 REST Adapter

```python
@AdapterRegistry.register("rest")
class RESTAdapter(ExternalAdapter):
    """HTTP REST API adapter."""

    async def execute(self, config: dict, context: ExecutionContext) -> AdapterResult:
        async with httpx.AsyncClient(timeout=config.get('timeout', 30)) as client:
            response = await client.request(
                method=config['method'],
                url=self._interpolate_url(config['url'], context),
                headers=config.get('headers', {}),
                json=self._build_body(config.get('body'), context),
            )
            response.raise_for_status()
            return AdapterResult(
                success=True,
                data=response.json() if 'application/json' in response.headers.get('content-type', '') else response.text,
                metadata={'status_code': response.status_code}
            )

    config_schema = {
        "type": "object",
        "required": ["url", "method"],
        "properties": {
            "url": {"type": "string", "format": "uri"},
            "method": {"enum": ["GET", "POST", "PUT", "PATCH", "DELETE"]},
            "headers": {"type": "object"},
            "body": {"type": "object"},
            "timeout": {"type": "integer", "default": 30},
            "retry_count": {"type": "integer", "default": 3},
        }
    }
```

#### 5.17 Message Queue Adapter

```python
@AdapterRegistry.register("rabbitmq")
class RabbitMQAdapter(ExternalAdapter):
    """RabbitMQ message queue adapter."""

    async def execute(self, config: dict, context: ExecutionContext) -> AdapterResult:
        connection = await aio_pika.connect_robust(config['connection_url'])
        async with connection:
            channel = await connection.channel()
            exchange = await channel.get_exchange(config.get('exchange', ''))

            message = aio_pika.Message(
                body=json.dumps(self._build_payload(config['payload'], context)).encode(),
                content_type='application/json',
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            )

            await exchange.publish(message, routing_key=config['routing_key'])

            return AdapterResult(success=True, data={'published': True})
```

---

## 6. Implementation Priority Matrix

| Enhancement | Impact | Effort | Priority |
|-------------|--------|--------|----------|
| DAG Executor | High | High | **P0** |
| Graph Validation (Frontend) | High | Medium | **P0** |
| Workflow Editing UI | High | Low | **P0** |
| Celery Task Integration | High | Medium | **P0** |
| Expression Engine | High | Medium | **P1** |
| Action Executors | High | Medium | **P1** |
| Distributed Locking | Medium | Medium | **P1** |
| Connection Rules | Medium | Low | **P1** |
| Execution Viewer | Medium | Medium | **P2** |
| Metrics/Tracing | Medium | Medium | **P2** |
| Circuit Breaker | Medium | Low | **P2** |
| REST Adapter | Medium | Low | **P2** |
| Idempotency Layer | Low | Low | **P2** |
| WCAG Compliance | Low | Medium | **P3** |
| MQ Adapter | Low | Medium | **P3** |
| Dead Letter Queue | Low | Low | **P3** |

---

## 7. Verification Checklist

### Functional Completeness
- [ ] DAG executor handles parallel gateways correctly
- [ ] Conditional expressions evaluate with correct context
- [ ] All 6 action types execute successfully
- [ ] Error nodes route to designated error handlers
- [ ] Timeouts trigger escalation/fallback paths
- [ ] Sub-workflow invocation returns results to parent

### Ergonomic Excellence
- [ ] Invalid connections prevented at drag time
- [ ] Cycles detected before save with visual highlight
- [ ] Real-time validation shows errors inline
- [ ] Keyboard-only workflow creation possible
- [ ] Screen reader announces all state changes
- [ ] Auto-layout produces readable graphs

### Operational Capability
- [ ] Parallel step execution scales horizontally
- [ ] Failed steps retry with exponential backoff
- [ ] Distributed locks prevent race conditions
- [ ] Metrics dashboard shows execution health
- [ ] Dead letters can be replayed
- [ ] Circuit breaker trips after threshold failures

---

## 8. Gap Summary

This audit identifies **42 specific gaps** across functional, ergonomic, and operational dimensions:

- **Functional**: 15 gaps (control flow, data propagation, integrations)
- **Ergonomic**: 15 gaps (validation, accessibility, usability)
- **Operational**: 12 gaps (observability, reliability, scalability)

The phased enhancement plan focuses immediate effort on core engine hardening and frontend validation, deferring nice-to-have integrations to later phases.

---

## 9. Prefect Integration Analysis

### 9.1 Overview

[Prefect](https://www.prefect.io/) is a Python-native workflow orchestration framework that has gained significant adoption for data pipelines, ML workflows, and automation. This section evaluates whether Prefect is a suitable replacement or complement to the current custom workflow engine.

### 9.2 Prefect Capabilities

| Capability | Prefect Support | dArchiva Need |
|------------|-----------------|---------------|
| Python-native workflows | ✓ `@flow`/`@task` decorators | ✓ Required |
| Async/await | ✓ Full support | ✓ Required |
| Retries with backoff | ✓ Built-in | ✓ Required |
| Result caching | ✓ `persist_result=True` | ○ Nice-to-have |
| Human-in-the-loop | ✓ `pause_flow_run()` with UI forms | ✓ Critical |
| Parallel execution | ✓ Native support | ✓ Required |
| Conditional branching | ✓ Pure Python if/else | ✓ Required |
| State persistence | ✓ PostgreSQL backend | ✓ Required |
| Event triggers | ✓ Schedules, webhooks, API | ✓ Required |
| Observability | ✓ Built-in UI, metrics | ✓ Required |
| Self-hosted | ✓ Docker + PostgreSQL | ✓ Required |

### 9.3 Architecture Comparison

#### Current Custom Engine
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React Flow    │────▶│   FastAPI       │────▶│   PostgreSQL    │
│   Designer      │     │   WorkflowEngine│     │   + Celery      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌─────────────────┐
                        │   Custom DAG    │
                        │   Executor      │
                        │   (TO BUILD)    │
                        └─────────────────┘
```

#### Prefect Hybrid Architecture
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React Flow    │────▶│   FastAPI       │────▶│   Prefect       │
│   Designer      │     │   (Translator)  │     │   Server        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                       │
                              ┌─────────────────┬──────┴──────┐
                              ▼                 ▼             ▼
                        ┌──────────┐     ┌──────────┐   ┌──────────┐
                        │ Worker 1 │     │ Worker 2 │   │ Worker N │
                        │ (OCR)    │     │ (NLP)    │   │ (Store)  │
                        └──────────┘     └──────────┘   └──────────┘
```

### 9.4 Prefect Strengths (Relevant to dArchiva)

1. **Human-in-the-Loop Native**
   ```python
   from prefect import flow, pause_flow_run
   from prefect.input import RunInput

   class ApprovalInput(RunInput):
       approved: bool
       comments: str

   @flow
   def document_approval_flow(document_id: str):
       # OCR and classification tasks...

       decision = pause_flow_run(
           wait_for_input=ApprovalInput,
           timeout=86400  # 24 hours
       )

       if decision.approved:
           store_document(document_id)
       else:
           reject_document(document_id, decision.comments)
   ```

2. **Built-in Retry & Error Handling**
   ```python
   @task(retries=3, retry_delay_seconds=[10, 60, 300])
   async def call_ocr_service(document_id: str) -> OCRResult:
       # Automatic exponential backoff
       ...
   ```

3. **Result Caching**
   ```python
   @task(persist_result=True, cache_key_fn=task_input_hash)
   def expensive_nlp_analysis(text: str) -> dict:
       # Cached across runs
       ...
   ```

4. **Parallel Execution**
   ```python
   @flow
   async def process_batch(document_ids: list[str]):
       # True parallel execution
       results = await asyncio.gather(*[
           process_document(doc_id) for doc_id in document_ids
       ])
   ```

5. **Self-Hosted with PostgreSQL**
   - Uses same PostgreSQL as dArchiva (requires `pg_trgm` extension)
   - Docker deployment: `prefecthq/prefect:3-python3.12`
   - Connection: `postgresql+asyncpg://user:pass@host:5432/prefect`

### 9.5 Prefect Weaknesses (Relevant to dArchiva)

| Concern | Impact | Mitigation |
|---------|--------|------------|
| **No visual designer** | High | Keep React Flow frontend, translate to Prefect flows |
| **Python-only execution** | Medium | Fine for document processing use case |
| **Separate database** | Low | Can share PostgreSQL instance, separate schema |
| **Learning curve** | Medium | Team needs Prefect training |
| **Version coupling** | Medium | Pin Prefect version, test upgrades |
| **No BPMN export** | Low | Not required for dArchiva |

### 9.6 Integration Approaches

#### Option A: Full Replacement
Replace `WorkflowEngine` entirely with Prefect flows.

**Pros:**
- Eliminates custom DAG executor development
- Gets all Prefect features immediately
- Community support and documentation

**Cons:**
- Requires workflow definition translation layer
- Two persistence systems (dArchiva + Prefect)
- Prefect UI competes with custom UI

**Effort:** High (4-6 weeks)

#### Option B: Hybrid Execution
Use Prefect as the execution engine, keep custom workflow definitions.

```python
# Translation layer: dArchiva workflow → Prefect flow
class WorkflowTranslator:
    def to_prefect_flow(self, workflow: Workflow) -> Flow:
        """Convert stored workflow definition to executable Prefect flow."""

        @flow(name=workflow.name, retries=2)
        async def dynamic_flow(document_id: str, context: dict):
            node_results = {}

            for node in self.topological_sort(workflow.nodes):
                task_fn = self.get_task_for_node(node)
                inputs = self.gather_inputs(node, node_results)

                if node.type == 'approval':
                    result = await pause_flow_run(
                        wait_for_input=ApprovalInput,
                        timeout=node.config.get('timeout_hours', 24) * 3600
                    )
                else:
                    result = await task_fn(**inputs)

                node_results[node.id] = result

            return node_results

        return dynamic_flow
```

**Pros:**
- Leverages Prefect's battle-tested executor
- Keeps React Flow designer intact
- Incremental migration possible

**Cons:**
- Translation complexity
- Some Prefect features inaccessible from UI

**Effort:** Medium (2-4 weeks)

#### Option C: Prefect for Background Tasks Only
Use Prefect only for async/background processing, keep approval workflows custom.

```python
# Use Prefect for heavy lifting
@task(retries=3)
def run_ocr(document_id: str) -> OCRResult:
    ...

@task
def run_nlp(text: str) -> NLPResult:
    ...

@flow
def document_processing_pipeline(document_id: str):
    ocr_result = run_ocr(document_id)
    nlp_result = run_nlp(ocr_result.text)
    return {"ocr": ocr_result, "nlp": nlp_result}

# Keep custom engine for approvals
class WorkflowEngine:
    async def process_step_action(self, ...):
        if step.type == 'processing':
            # Delegate to Prefect
            await document_processing_pipeline(document_id)
        elif step.type == 'approval':
            # Handle in custom engine
            ...
```

**Pros:**
- Minimal disruption to existing code
- Best-of-both-worlds approach
- Clear separation of concerns

**Cons:**
- Two workflow systems to maintain
- Complex handoff logic

**Effort:** Low (1-2 weeks)

### 9.7 Recommendation

**Recommended: Option B (Hybrid Execution)**

Rationale:
1. **Preserves UI investment** - React Flow designer stays intact
2. **Eliminates DAG executor development** - Major effort saved
3. **Gets production-grade features** - Retries, parallel execution, observability
4. **Human-in-the-loop works** - `pause_flow_run()` maps to approval nodes
5. **Shared infrastructure** - Same PostgreSQL, Docker deployment model
6. **Incremental migration** - Can run both engines during transition

### 9.8 Implementation Roadmap

#### Phase 1: Infrastructure (Week 1)
- [ ] Add Prefect to `docker-compose.yml`
- [ ] Configure PostgreSQL connection for Prefect
- [ ] Create `prefect` schema in existing database
- [ ] Set up Prefect worker with dArchiva dependencies

#### Phase 2: Task Library (Week 2)
- [ ] Create `@task` wrappers for existing services:
  - `ocr_task` → OCR worker integration
  - `nlp_task` → SpaCy extraction
  - `classify_task` → Document classification
  - `store_task` → Storage backend
  - `notify_task` → Email/webhook notifications
- [ ] Add retry policies per task type
- [ ] Configure result serialization

#### Phase 3: Translator (Week 3)
- [ ] Implement `WorkflowTranslator` class
- [ ] Map node types to Prefect tasks
- [ ] Handle conditional branching (condition nodes)
- [ ] Handle parallel execution (split/merge nodes)
- [ ] Handle approvals (`pause_flow_run`)

#### Phase 4: API Integration (Week 4)
- [ ] Update `/api/v1/workflows/{id}/start` to use Prefect
- [ ] Map Prefect flow states to dArchiva statuses
- [ ] Sync execution history to `WorkflowStepExecution`
- [ ] Wire deadline checking to Prefect's timeout mechanism

#### Phase 5: Observability (Week 5)
- [ ] Embed Prefect UI or build custom dashboard
- [ ] Export Prefect metrics to Prometheus
- [ ] Configure structured logging with trace IDs
- [ ] Set up alerting for failed flows

### 9.9 Prefect vs Alternatives

| Feature | Prefect | Temporal | Celery | Custom |
|---------|---------|----------|--------|--------|
| Python-native | ✓✓ | ✓ | ✓ | ✓ |
| Human-in-the-loop | ✓✓ | ✓✓ | ✗ | ✓ (partial) |
| Visual designer | ✗ | ✗ | ✗ | ✓✓ |
| Self-hosted | ✓ | ✓ | ✓✓ | ✓ |
| Complexity | Medium | High | Low | Medium |
| Document processing fit | ✓✓ | ✓ | ✓ | ✓ |
| Community size | Large | Large | Very Large | N/A |
| Learning curve | Medium | High | Low | N/A |

**Temporal** is stronger for mission-critical microservices but has a steeper learning curve. **Celery** lacks human-in-the-loop and DAG support. **Prefect** offers the best balance for document workflow use cases.

### 9.10 Prefect Configuration Reference

```yaml
# docker-compose.yml addition
services:
  prefect-server:
    image: prefecthq/prefect:3-python3.12
    command: prefect server start --host 0.0.0.0
    environment:
      PREFECT_API_DATABASE_CONNECTION_URL: postgresql+asyncpg://darchiva:${DB_PASSWORD}@postgres:5432/darchiva
      PREFECT_SERVER_API_HOST: 0.0.0.0
      PREFECT_SERVER_API_PORT: 4200
    ports:
      - "4200:4200"
    depends_on:
      - postgres

  prefect-worker:
    image: darchiva/worker:latest  # Custom image with OCR/NLP deps
    command: prefect worker start --pool default-agent-pool
    environment:
      PREFECT_API_URL: http://prefect-server:4200/api
    depends_on:
      - prefect-server
```

```python
# pyproject.toml addition
[project]
dependencies = [
    "prefect>=3.0,<4.0",
    "prefect-sqlalchemy>=0.5",
]
```

### 9.11 Decision Matrix

| Criterion | Weight | Custom Engine | Prefect Hybrid | Score |
|-----------|--------|---------------|----------------|-------|
| Development speed | 25% | 2 (slow) | 4 (fast) | +0.5 |
| Feature completeness | 25% | 3 (gaps) | 5 (full) | +0.5 |
| Operational maturity | 20% | 2 (untested) | 5 (proven) | +0.6 |
| Integration effort | 15% | 5 (native) | 3 (translation) | -0.3 |
| Long-term maintenance | 15% | 2 (all internal) | 4 (shared) | +0.3 |
| **Total** | 100% | **2.7** | **4.2** | **+1.5** |

**Conclusion:** Prefect Hybrid scores 55% higher than continuing with custom engine development. The translation layer effort is offset by eliminating DAG executor, retry logic, parallel execution, and observability development.

---

## 10. Sources

- [Prefect Open Source](https://www.prefect.io/prefect/open-source)
- [Prefect Documentation](https://docs.prefect.io/)
- [Self-Hosting Prefect with PostgreSQL](https://medium.com/the-prefect-blog/how-to-self-host-prefect-orion-with-postgres-using-docker-compose-631c41ab8a9f)
- [Workflow Orchestration Platforms Comparison 2025](https://procycons.com/en/blogs/workflow-orchestration-platforms-comparison-2025/)
- [State of Workflow Orchestration 2025](https://www.pracdata.io/p/state-of-workflow-orchestration-ecosystem-2025)
- [Prefect GitHub Repository](https://github.com/PrefectHQ/prefect)
