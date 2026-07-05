# Workflows, Automation, Cases, and Compliance Audit

## Executive Summary

1. **Critical - GDPR/right-to-erasure workflow is not implemented in audited UI.** `src/features/compliance/ComplianceDashboard.tsx:341-343` shows a pending GDPR count and `src/features/compliance/ComplianceDashboard.tsx:420-422` links to "Data Export (GDPR)", but no audited component exposes a right-to-erasure request, approval, execution, or audit workflow.
2. **High - Cases do not cover the full lifecycle from assignment through resolution and closure.** `src/pages/Cases.tsx:78-86` defines only `open`, `pending`, `closed`, and `on_hold`; `src/pages/Cases.tsx:307-314` edits only title/status; and `src/features/cases/components/modals/CaseOptionsModal.tsx:14-20` renders "Close Case" as `onClose()` only.
3. **High - Signature workflow is internal/basic and lacks DocuSign-like execution, escalation, completion, and archive controls.** `src/features/signatures/SignaturePanel.tsx:119-125` groups requests by status, `src/features/signatures/SignaturePanel.tsx:127-203` displays request/track views, and `src/features/signatures/SignaturePanel.tsx:48-54` uses `mailto:` for reminders instead of a wired notification or external signature provider flow.
4. **High - Workflow designer has nodes/edges and condition nodes but no explicit loop/retry construct or persisted edit path for existing workflows.** `src/features/workflows/components/Designer.tsx:154-211` supports graph editing and save callbacks, while `src/pages/Workflows.tsx:851-858` always creates a workflow named "New Workflow" from designer output; loop/retry behavior is not visible in the audited designer or node config.
5. **Medium - Audit logs are searchable, filterable, and exportable, but tamper-evidence is absent from the audited UI.** `src/features/audit/components/AuditLog.tsx:110-169` wires filters and export params, and `src/features/audit/components/AuditLog.tsx:367-405` shows event details and raw JSON; no hash chain, immutable ledger, signature, or integrity verification indicator is visible.

## Per-Component Findings

### `src/pages/Workflows.tsx`

- **Severity: High**
- **File/lines:** `src/pages/Workflows.tsx:109-123`, `src/pages/Workflows.tsx:668-742`, `src/pages/Workflows.tsx:851-874`, `src/pages/Workflows.tsx:981-997`
- **What is present:** Workflow creation supports trigger choices for document upload, folder watch/tag, schedule, manual, and webhook/API; the page can open a fullscreen visual designer; API hooks create, run, activate, deactivate, delete, and process workflow tasks.
- **What is missing or broken:** The designer save path creates a new workflow with a hard-coded name/description and no selected existing workflow binding, and no loop/retry/deadline-escalation design primitive is visible in this page.
- **Recommended fix:** Add an edit-in-place workflow designer flow with explicit loop/retry/escalation nodes and persist designer output to the selected workflow instead of always creating "New Workflow".

- **Severity: Medium**
- **File/lines:** `src/pages/Workflows.tsx:520-607`, `src/pages/Workflows.tsx:925-934`, `src/pages/Workflows.tsx:1295-1320`
- **What is present:** The workflow detail sheet lists steps, recent executions, activation state, and Run Now; SLA dashboard/config and alerts/escalation tabs are mounted.
- **What is missing or broken:** Execution history is display-only, and the page does not expose retry/resume, escalation routing, or deadline-reminder setup inside a workflow execution.
- **Recommended fix:** Add execution remediation actions and surface linked SLA/escalation state on each workflow detail view.

### `src/features/workflows/components/` Directory

- **Severity: Medium**
- **File/lines:** `src/features/workflows/components/Designer.tsx:74-212`, `src/features/workflows/components/Designer.tsx:324-340`, `src/features/workflows/components/Designer.tsx:358-433`, `src/features/workflows/components/Designer.tsx:484-499`
- **What is present:** React Flow nodes/edges, drag-and-drop node creation, node selection/configuration, save, and test-run callback hooks are present.
- **What is missing or broken:** `onRun` is optional and not passed by `Workflows.tsx`, so "Test Run" is UI scaffolding in the audited page path; no loop/retry construct is visible.
- **Recommended fix:** Wire designer test runs to a backend dry-run endpoint and add explicit loop/retry node types with validation to prevent unsafe cycles.

- **Severity: Medium**
- **File/lines:** `src/features/workflows/components/NodeConfigPanel.tsx:49-75`, `src/features/workflows/components/NodeConfigPanel.tsx:254-362`, `src/features/workflows/components/NodeConfigPanel.tsx:453-657`
- **What is present:** Node configuration covers source, route, store, index, notify, transform, condition, approval, merge, and split schemas; source includes email/API and notify includes email/webhook channels.
- **What is missing or broken:** Conditional branching is string/JSON configuration rather than a validated branch builder, and store retention is only a `retentionDays` field with no policy enforcement visibility.
- **Recommended fix:** Replace free-form condition/routing JSON with validated branch/action editors and link retention settings to retention policy status.

- **Severity: Medium**
- **File/lines:** `src/features/workflows/components/EscalationChainBuilder.tsx:30-63`, `src/features/workflows/components/EscalationChainBuilder.tsx:66-88`, `src/features/workflows/components/EscalationChainBuilder.tsx:285-371`
- **What is present:** Escalation chains have levels with target type, wait hours, and notify flag, and the component can fetch and create chains.
- **What is missing or broken:** The create/edit modal only submits name, description, active, and existing `chain?.levels || []`; there is no visible level editor despite the interface defining levels.
- **Recommended fix:** Add add/edit/remove/reorder controls for escalation levels and persist targets, wait times, and notification flags.

- **Severity: Medium**
- **File/lines:** `src/features/workflows/components/SLAConfigManager.tsx:36-56`, `src/features/workflows/components/SLAConfigManager.tsx:245-272`, `src/features/workflows/components/SLAConfigManager.tsx:306-413`
- **What is present:** SLA configs can be fetched/created with workflow scope, target hours, warning/critical thresholds, and reminder thresholds.
- **What is missing or broken:** It shows only creation; no update/delete path is visible, and reminder delivery/escalation linkage is not surfaced.
- **Recommended fix:** Add edit/delete actions and bind SLA reminders to escalation chains or notification channels.

- **Severity: Low**
- **File/lines:** `src/features/workflows/components/SLADashboard.tsx:25-43`, `src/features/workflows/components/SLADashboard.tsx:82-179`, `src/features/workflows/components/SLADashboard.tsx:239-320`
- **What is present:** SLA dashboard fetches metrics, auto-refreshes, shows compliance rate/on-track/warning/breached counts, recent alerts, and acknowledgements.
- **What is missing or broken:** It is monitoring-oriented and does not expose remediation workflows such as bulk escalation, deadline extension, or reroute.
- **Recommended fix:** Add action buttons from breached/warning items to escalate, reassign, or extend deadlines.

- **Severity: Low**
- **File/lines:** `src/features/workflows/components/WorkflowAlertsList.tsx:37-68`, `src/features/workflows/components/WorkflowAlertsList.tsx:80-178`, `src/features/workflows/components/WorkflowAlertsList.tsx:192-305`
- **What is present:** Alerts can be filtered by severity, acknowledged singly or in bulk, paginated, expanded, and inspected.
- **What is missing or broken:** Alert handling stops at acknowledgement; there is no escalation path, reminder send, or owner assignment.
- **Recommended fix:** Add owner/escalate/remind actions to alert cards and include audit/event links.

- **Severity: Low**
- **File/lines:** `src/features/workflows/components/WorkflowNode.tsx:28-44`, `src/features/workflows/components/WorkflowNode.tsx:180-258`
- **What is present:** Node visualization includes workflow node types, input/output handles, and running/completed/error indicators.
- **What is missing or broken:** Branch labels are limited to generic output labels and no loop/retry visual semantics are visible.
- **Recommended fix:** Add typed handles and badges for true/false, retry, escalation, and loop exits.

- **Severity: Low**
- **File/lines:** `src/features/workflows/components/index.ts:1-8`
- **What is present:** The directory barrel exports all workflow components audited.
- **What is missing or broken:** No functionality is implemented in the barrel itself.
- **Recommended fix:** No product change needed; keep exports aligned as components evolve.

### `src/pages/Routing.tsx`

- **Severity: Medium**
- **File/lines:** `src/pages/Routing.tsx:213-269`, `src/pages/Routing.tsx:327-490`, `src/pages/Routing.tsx:501-535`
- **What is present:** Routing uses API hooks for rules/stats/testing; test mode accepts content, document type, tags, metadata, and mode, then displays matched rules and destination.
- **What is missing or broken:** This is routing-only automation; there are no email/webhook/schedule triggers or multi-action workflow actions in this page.
- **Recommended fix:** Keep routing focused but cross-link rule outcomes to automation/workflow actions where a route should trigger approvals, reminders, or escalation.

### `src/features/auto-routing/AutoRoutingRules.tsx`

- **Severity: Medium**
- **File/lines:** `src/features/auto-routing/AutoRoutingRules.tsx:77-126`, `src/features/auto-routing/AutoRoutingRules.tsx:147-308`, `src/features/auto-routing/AutoRoutingRules.tsx:324-461`, `src/features/auto-routing/AutoRoutingRules.tsx:541-741`
- **What is present:** Auto-routing rules can be created/edited/deleted/tested with document type, confidence threshold, destination folder, priority, status, applied count, and test result.
- **What is missing or broken:** The rule model covers classification-to-folder movement only; no trigger variants, chained actions, deadlines, reminders, or escalation outputs are visible.
- **Recommended fix:** Either keep this as a narrow classifier-routing module or integrate it into the broader automation rule builder as a route action.

### `src/features/automation/AutomationRulesPage.tsx`

- **Severity: High**
- **File/lines:** `src/features/automation/AutomationRulesPage.tsx:64-93`, `src/features/automation/AutomationRulesPage.tsx:186-245`, `src/features/automation/AutomationRulesPage.tsx:286-407`
- **What is present:** Automation rules support document classified/uploaded/expiring and scan batch complete triggers, condition fields/operators, and actions for notification, folder routing, tag application, approval workflow assignment, document type setting, and webhook send.
- **What is missing or broken:** Email receipt, inbound webhook, outbound webhook response handling, and schedule triggers are absent from the visible trigger list; actions use raw IDs/names rather than selectors.
- **Recommended fix:** Add email/webhook/schedule triggers and typed selectors for users, folders, tags, document types, workflows, and webhook endpoints.

- **Severity: Medium**
- **File/lines:** `src/features/automation/AutomationRulesPage.tsx:432-466`, `src/features/automation/AutomationRulesPage.tsx:601-753`
- **What is present:** Rules can be toggled, edited, deleted, counted by conditions/actions, and dry-run tested against a document ID for existing rules.
- **What is missing or broken:** Test mode is unavailable for unsaved new rules and execution logs are listed but not tied to remediation, retries, or escalation.
- **Recommended fix:** Allow draft rule dry-runs and add execution failure handling actions.

### `src/pages/Cases.tsx`

- **Severity: High**
- **File/lines:** `src/pages/Cases.tsx:78-126`, `src/pages/Cases.tsx:155-234`, `src/pages/Cases.tsx:286-356`, `src/pages/Cases.tsx:367-408`
- **What is present:** Cases can be created, updated, and deleted; create captures title/type/priority/description, and edit can change title/status.
- **What is missing or broken:** There is no assignee/owner, resolution reason, closure checklist, due date, linked workflow, or document linking in the main case create/edit lifecycle.
- **Recommended fix:** Extend cases with assignee, due date, resolution/closure fields, and explicit document-linking controls.

- **Severity: Medium**
- **File/lines:** `src/pages/Cases.tsx:424-559`, `src/pages/Cases.tsx:566-794`
- **What is present:** Case details show status, document/bundle counts, creator, dates, bundles, and a small timeline; the page supports search and status filtering.
- **What is missing or broken:** The type filter select is not wired to query state, and the activity timeline is derived from created/updated/closed fields rather than a real audit trail.
- **Recommended fix:** Wire type filtering to `useCases` and replace the derived timeline with case audit events.

### `src/features/cases/components/` Directory

- **Severity: Medium**
- **File/lines:** `src/features/cases/components/CreateCaseModal.tsx:12-101`
- **What is present:** A simpler create modal can create a case with title and description.
- **What is missing or broken:** It omits type, priority, assignment, status, document links, and closure metadata.
- **Recommended fix:** Consolidate this modal with the richer `CreateCaseDialog` or remove the duplicate path.

- **Severity: Medium**
- **File/lines:** `src/features/cases/components/modals/AddDocumentsToCaseModal.tsx:14-89`
- **What is present:** The modal searches documents, selects multiple document IDs, and posts them to `/cases/{id}/documents`.
- **What is missing or broken:** It does not show already linked documents, unlink controls, document relationship types, or audit trail confirmation.
- **Recommended fix:** Add linked-document state, relationship metadata, unlink controls, and event logging feedback.

- **Severity: Low**
- **File/lines:** `src/features/cases/components/modals/CaseFiltersModal.tsx:9-59`
- **What is present:** The modal collects status/date/portfolio fields and dispatches a `case-filters-applied` event.
- **What is missing or broken:** No listener is visible in `src/pages/Cases.tsx`, so this modal appears disconnected from the audited case list.
- **Recommended fix:** Wire the modal event into the cases query state or remove it in favor of the page filter bar.

- **Severity: High**
- **File/lines:** `src/features/cases/components/modals/CaseOptionsModal.tsx:11-42`
- **What is present:** Options exist for viewing details, bundle creation, document linking, access management, tag editing, and close case.
- **What is missing or broken:** "Close Case" only calls `onClose()` and does not update case status or collect closure/resolution data.
- **Recommended fix:** Implement close case as a real mutation with required resolution metadata and confirmation.

- **Severity: Low**
- **File/lines:** `src/features/cases/components/modals/CreateBundleModal.tsx:12-60`
- **What is present:** The modal creates a named bundle linked to a case.
- **What is missing or broken:** It does not select documents for the bundle during creation.
- **Recommended fix:** Add document selection or a follow-up add-documents step.

- **Severity: Low**
- **File/lines:** `src/features/cases/components/modals/EditCaseTagsModal.tsx:12-85`
- **What is present:** Tags can be edited through `useUpdateCase`.
- **What is missing or broken:** It does not show tag audit history or conflict handling.
- **Recommended fix:** Show tag-change audit entries and optimistic conflict feedback.

- **Severity: Medium**
- **File/lines:** `src/features/cases/components/modals/ManageCaseAccessModal.tsx:14-77`
- **What is present:** Access can be granted to selected users with viewer/editor/manager permissions.
- **What is missing or broken:** This is permission management, not case assignment; it has no owner/assignee, escalation, or workload routing.
- **Recommended fix:** Add a separate assignee/owner workflow with assignment history and escalation.

- **Severity: Medium**
- **File/lines:** `src/features/cases/components/modals/ViewCaseModal.tsx:18-96`
- **What is present:** The modal displays case header/status, document/bundle counts, created time, and bundles.
- **What is missing or broken:** It has no lifecycle controls, no linked document list beyond counts/bundles, and no audit trail.
- **Recommended fix:** Promote this to a full case detail workspace or route users to the richer `CaseDetailSheet`.

### `src/features/approvals/ApprovalPanel.tsx`

- **Severity: Medium**
- **File/lines:** `src/features/approvals/ApprovalPanel.tsx:132-153`, `src/features/approvals/ApprovalPanel.tsx:225-269`, `src/features/approvals/ApprovalPanel.tsx:281-457`, `src/features/approvals/ApprovalPanel.tsx:459-546`
- **What is present:** Document approvals support ordered approvers, deadline, message, current chain, history, and approve/reject step actions for the active approver.
- **What is missing or broken:** Approval routing is sequential/manual; there is no conditional branch, reminder/escalation action, DocuSign-like signature handoff, or archive-on-completion control visible here.
- **Recommended fix:** Add reminder/escalation controls and optional signature/archive completion actions to approval workflows.

### `src/features/compliance/ComplianceDashboard.tsx`

- **Severity: Critical**
- **File/lines:** `src/features/compliance/ComplianceDashboard.tsx:245-286`, `src/features/compliance/ComplianceDashboard.tsx:323-356`, `src/features/compliance/ComplianceDashboard.tsx:411-422`
- **What is present:** The dashboard fetches compliance stats, alerts, and retention policies, and displays active policies, documents under retention, legal holds, pending GDPR, overdue actions, and next retention due.
- **What is missing or broken:** GDPR is represented only as a pending count and a "Data Export (GDPR)" quick link; no right-to-erasure workflow is visible in the audited component.
- **Recommended fix:** Add a GDPR request workspace covering export, erasure, approval/legal-hold checks, execution status, and audit evidence.

- **Severity: Medium**
- **File/lines:** `src/features/compliance/ComplianceDashboard.tsx:429-519`
- **What is present:** Retention policies are summarized with type, period, scope, last run, status, and Run Now action.
- **What is missing or broken:** Enforcement visibility is summary-level only and does not show affected documents, dry-run impact, failures, exemptions, or evidence of action.
- **Recommended fix:** Add policy impact previews, run results, failed-document lists, and exemption/legal-hold indicators.

### `src/pages/RetentionPolicies.tsx`

- **Severity: Medium**
- **File/lines:** `src/pages/RetentionPolicies.tsx:122-209`, `src/pages/RetentionPolicies.tsx:231-307`, `src/pages/RetentionPolicies.tsx:463-701`
- **What is present:** Retention policies support archive/delete/move, after-days triggers, all/project/document-type scope, destination folder for moves, active status, stats, edit/delete, and Run Now sweep.
- **What is missing or broken:** The UI does not show dry-run impact, enforcement evidence per run, document exceptions, legal-hold blocking, or right-to-erasure handling.
- **Recommended fix:** Add dry-run preview, execution results, exception/legal-hold visibility, and GDPR erasure coordination.

### `src/pages/AuditLogs.tsx`

- **Severity: Low**
- **File/lines:** `src/pages/AuditLogs.tsx:8-61`
- **What is present:** The page exposes a quick CSV export for all logs and embeds the filtered audit log component.
- **What is missing or broken:** The quick export is unfiltered and does not expose tamper-evidence state or export signing.
- **Recommended fix:** Add signed export metadata and a visible integrity status for generated audit exports.

### `src/features/audit/components/AuditLog.tsx`

- **Severity: Medium**
- **File/lines:** `src/features/audit/components/AuditLog.tsx:96-169`, `src/features/audit/components/AuditLog.tsx:174-299`
- **What is present:** Audit logs are searchable/filterable by user, operation, date range, and record ID, refreshable, and exportable to CSV/PDF.
- **What is missing or broken:** Export parameters omit `filterRecordId`, so filtered document/record searches are not carried into the component export payload.
- **Recommended fix:** Include `filterRecordId: documentSearch || undefined` in `buildExportParams`.

- **Severity: Medium**
- **File/lines:** `src/features/audit/components/AuditLog.tsx:367-405`, `src/features/audit/components/AuditLog.tsx:423-490`
- **What is present:** Each event can open a detail modal with operation/table/user/timestamp/record ID/event ID/raw JSON, and document-related records can navigate to the record.
- **What is missing or broken:** No tamper-evidence indicator, hash chain, append-only seal, export signature, or integrity verification status is visible.
- **Recommended fix:** Surface backend integrity fields and verification status on the list, detail modal, and exports.

### `src/features/signatures/SignaturePanel.tsx`

- **Severity: High**
- **File/lines:** `src/features/signatures/SignaturePanel.tsx:28-61`, `src/features/signatures/SignaturePanel.tsx:64-95`, `src/features/signatures/SignaturePanel.tsx:98-125`, `src/features/signatures/SignaturePanel.tsx:127-203`
- **What is present:** The panel loads signature requests, groups them into pending/signed/declined, opens a request dialog, shows pending request page/date, shows signed date and signed document link, and shows declined reason.
- **What is missing or broken:** Reminder is a local `mailto:` action, and no DocuSign-like embedded signing, provider status sync, escalation, completion action, or archive step is visible in this audited component.
- **Recommended fix:** Replace local reminders with notification/API reminders and add provider-backed request, status sync, completion, and archive workflow states.

## Recommended Workflow Enhancements

1. Build a GDPR compliance workspace for data export, erasure, legal-hold review, approval, execution, and audit evidence.
2. Complete the case lifecycle with assignees, due dates, resolution metadata, closure mutation, linked-document management, and a real audit timeline.
3. Extend the workflow designer with loop/retry/escalation nodes, typed branch validation, and edit-in-place persistence for existing workflows.
4. Unify automation triggers across email, webhook, schedule, document events, and scan events, with typed action editors instead of raw ID fields.
5. Add deadline reminders and escalation actions to workflows, approvals, cases, SLA alerts, and signature requests.
6. Add DocuSign-like signature integration: external provider request creation, webhook/status sync, embedded signing/recipient tracking, completion, and archival.
7. Add audit tamper-evidence visibility: hash/sequence verification, immutable ledger status, signed exports, and integrity badges on event details.
8. Improve retention enforcement visibility with dry-run previews, affected-document lists, failed sweeps, legal-hold blocks, exemptions, and run evidence.

## Coverage Matrix

| Component | Workflow designer completeness | Automation rules | Cases UX | Compliance | Audit log | Signature workflow | Missing integrations |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `src/pages/Workflows.tsx` | Partial | Partial | Missing | Partial | Partial | Missing | Partial |
| `src/features/workflows/components/` | Partial | Partial | Missing | Partial | Missing | Missing | Partial |
| `src/pages/Routing.tsx` | Missing | Partial | Missing | Missing | Missing | Missing | Missing |
| `src/features/auto-routing/AutoRoutingRules.tsx` | Missing | Partial | Missing | Missing | Missing | Missing | Missing |
| `src/features/automation/AutomationRulesPage.tsx` | Missing | Partial | Missing | Missing | Missing | Missing | Partial |
| `src/pages/Cases.tsx` | Missing | Missing | Partial | Missing | Partial | Missing | Missing |
| `src/features/cases/components/` | Missing | Missing | Partial | Missing | Partial | Missing | Partial |
| `src/features/approvals/ApprovalPanel.tsx` | Partial | Missing | Missing | Missing | Partial | Missing | Partial |
| `src/features/compliance/ComplianceDashboard.tsx` | Missing | Missing | Missing | Partial | Partial | Missing | Partial |
| `src/pages/RetentionPolicies.tsx` | Missing | Partial | Missing | Partial | Partial | Missing | Partial |
| `src/pages/AuditLogs.tsx` | Missing | Missing | Missing | Missing | Partial | Missing | Missing |
| `src/features/audit/components/AuditLog.tsx` | Missing | Missing | Missing | Missing | Partial | Missing | Missing |
| `src/features/signatures/SignaturePanel.tsx` | Missing | Missing | Missing | Missing | Partial | Partial | Partial |
