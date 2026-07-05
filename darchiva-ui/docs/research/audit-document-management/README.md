# Document Management Workspace Audit

Scope: `src/pages/Documents.tsx`, document feature files under `src/features/documents/`, tag feature files under `src/features/tags/`, the absent `src/features/document-viewer/` and `src/features/metadata/` directories, missing `src/pages/Inventory.tsx` and `src/pages/Templates.tsx`, and document viewer/preview pages found under `src/pages/`.

Assumptions: `src/pages/DocumentDetail.tsx`, `src/pages/DocumentComparison.tsx`, and `src/pages/SharedDocuments.tsx` are the document preview/viewer page files found under `src/`. Scanner/settings/template components that only mention preview/viewer words were not treated as document-management pages.

## Findings

| Component | File | Severity (critical/high/medium/low) | Finding | Line range |
| --- | --- | --- | --- | --- |
| Document detail actions | `src/pages/DocumentDetail.tsx` | high | Move, Copy, and Delete menu items are visible but have no `onSelect`/`onClick`, so primary document CRUD actions are dead from the detail workspace. | 351-368 |
| Document detail favorite | `src/pages/DocumentDetail.tsx` | high | Favorite state is local-only via `setIsFavorite`; it does not call the favorites API used by the documents list, so refresh/navigation loses the action. | 326-337 |
| Document detail page query | `src/pages/DocumentDetail.tsx` | medium | The pages query does not expose `isLoading`/`isError`; viewer loading is inferred from missing data and page fetch failures collapse into "No pages available." | 154-164, 456-464 |
| Document detail side panels | `src/pages/DocumentDetail.tsx` | medium | Many toolbar panels route to imported side panels outside this audit scope; the local page does not provide a consolidated error boundary if any panel fails. | 374-453, 479-627 |
| Document list card options | `src/pages/Documents.tsx` | high | Card-view overflow/options button is rendered with no click handler or menu, leaving per-document actions unavailable in card view. | 455-467 |
| Document list row versions | `src/pages/Documents.tsx` | high | Row "View versions" button has no click handler and does not open version history or the detail page. | 565-570 |
| Document filters | `src/pages/Documents.tsx` | high | `useInfiniteDocuments` receives only `currentFolderId` and `folderSearch`; store-backed filter and sort modal state is never passed to the query, so filter/sort UI changes do not affect results. | 589-599, 789-794 |
| Selection/open behavior | `src/pages/Documents.tsx` | medium | List rows toggle selection on single click and only open on double-click; without a visible open affordance this makes preview discovery weak. | 498-503 |
| Create/rename/delete folder feedback | `src/pages/Documents.tsx` | medium | Folder mutations use loading state/confirmation but no success/error toast at call sites, so create/rename/delete failures are not surfaced consistently. | 651-672, 940-1005 |
| Document comparison page link | `src/pages/DocumentComparison.tsx` | high | "Open" links to `/documents/${docId}` while the detail page navigates documents as `/document/${id}` elsewhere; this can send users to the wrong route. | 380-387 |
| Comparison page query error | `src/pages/DocumentComparison.tsx` | medium | Metadata query exposes `isError`, but pages query does not; failed page/OCR loads are reported as "No OCR text available" rather than an error. | 172-198, 408-424 |
| Comparison search | `src/pages/DocumentComparison.tsx` | low | Picker search is API-backed and debounced, but it lacks an error state for `useDocumentSearch` failures. | 211-275 |
| Shared documents picker | `src/pages/SharedDocuments.tsx` | medium | Picker passes every selected search result as `ctype: 'document'`, despite copy saying document or folder; folder search results would open the wrong share configuration. | 35-39, 111-117 |
| Shared documents page | `src/pages/SharedDocuments.tsx` | low | Picker and list have loading/error states through their components; no local audit blocker found beyond the document/folder type mismatch. | 51-127, 163-197 |
| Viewer | `src/features/documents/components/Viewer.tsx` | medium | Basic viewing works, but there is no image `onError` handling; a broken page image leaves the skeleton hidden state unresolved or falls through poorly. | 546-560 |
| Viewer | `src/features/documents/components/Viewer.tsx` | low | Download/print/share controls are wired, but browser-triggered download/print failures have no feedback path. | 52-70, 176-182, 419-449 |
| Batch actions archive | `src/features/documents/components/BatchActionsBar.tsx` | high | Bulk archive directly mutates selected documents with no confirmation dialog, unlike bulk delete. | 566-579, 709-719 |
| Batch actions errors | `src/features/documents/components/BatchActionsBar.tsx` | medium | Generic `run()` error path logs failures but does not toast, so delete/export-style batch failures can be silent to users. | 581-602 |
| Batch actions hold | `src/features/documents/components/BatchActionsBar.tsx` | medium | Legal hold uses a custom `fetch` loop and calls `onSuccess` even without checking failed HTTP responses, so partial failures can look successful. | 430-461, 772-783 |
| Filter modal | `src/features/documents/components/modals/FilterDocumentsModal.tsx` | high | Document type options and tags are hardcoded placeholders, tag buttons do not update filters, and applied filters are not consumed by the listing query. | 15-28, 90-119 |
| Sort modal | `src/features/documents/components/modals/SortDocumentsModal.tsx` | high | Sort options update store state only; the document listing does not pass sort state to `useInfiniteDocuments` or sort client-side. | 13-21, 54-83 |
| Merge dialog | `src/features/documents/components/MergeDocumentsDialog.tsx` | medium | Merge calls the real API and has inline pending/error state, but there is no success/error toast for mutation feedback. | 41-51, 89-98, 201-230 |
| Split dialog | `src/features/documents/components/SplitDocumentDialog.tsx` | medium | Split calls the real API and has inline pending/error state, but there is no success/error toast and the parent detail page does not pass an `onSuccess` action. | 41-54, 82-90, 649-657 |
| Page editor | `src/features/documents/components/PageEditor.tsx` | high | Page deletion is destructive and can be applied without a confirmation dialog; only inline status is shown after execution begins. | 341-398, 429-435, 453-490 |
| Page editor | `src/features/documents/components/PageEditor.tsx` | medium | Apply success/error is inline only; no toast or document query invalidation is visible in this component after rotate/delete/reorder completes. | 367-398, 416-427 |
| Page select dialog | `src/features/documents/components/PageSelectDialog.tsx` | medium | Page image fetch failures are tracked in local state, but failed thumbnails do not block selection or clearly explain unavailable pages before destructive/extract operations. | 115-144, 271-288 |
| Thumbnail strip | `src/features/documents/components/ThumbnailStrip.tsx` | low | Broken thumbnails are hidden and replaced with a placeholder, but there is no user-facing retry/error detail. | 48-61 |
| Thumbnail grid | `src/features/documents/components/ThumbnailGrid.tsx` | medium | Thumbnails/cards support selection but no open/view callback is exposed, so thumbnail mode cannot open a document from this component. | 17-27, 91-123 |
| Virtual document list | `src/features/documents/components/VirtualDocumentList.tsx` | medium | The virtualized list renders rows/cards and loading states, but per-row actions depend on parent-selected callbacks and no inline destructive confirmation exists here. | 279-486 |
| Tree view | `src/features/documents/components/TreeView.tsx` | medium | Tree interactions are rich, but destructive folder/document operations are exposed through parent callbacks; this file itself does not enforce confirmation or mutation feedback. | 366-381 |
| Delete document dialog | `src/features/documents/components/modals/DeleteDocumentDialog.tsx` | low | Confirmation exists with pending state; no local toast is emitted, so caller must provide success/error feedback. | 37-61 |
| Create folder modal | `src/features/documents/components/modals/CreateFolderModal.tsx` | low | Create folder has validation/loading/toasts, but it depends on parent/store modal plumbing rather than this component fetching destination context. | 53-76, 156-177, 259-270 |
| Upload modal | `src/features/documents/components/modals/UploadModal.tsx` | low | Upload has loading/error paths and calls the real upload hook; no blocker found in the requested categories. | 34-51, 149-165 |
| Extract pages modal | `src/features/documents/components/modals/ExtractPagesModal.tsx` | medium | Extraction has inline pending/error state, but no success/error toast and no explicit destructive confirmation for removing pages from the source if backend semantics delete/move pages. | 22-38, 107-119 |
| Transfer pages modal | `src/features/documents/components/modals/TransferPagesModal.tsx` | medium | Transfer has inline pending/error state, but no toast feedback and no confirmation despite moving pages between documents. | 27-39, 126-137 |
| Share link dialog | `src/features/documents/components/modals/ShareLinkDialog.tsx` | medium | Share-link creation/revocation uses toast feedback, but password/max-use fields are local only unless the hook/backend consumes them; verify payload support before relying on them. | 151-197, 203-300 |
| View encrypted document modal | `src/features/documents/components/modals/ViewEncryptedDocumentModal.tsx` | low | Password entry modal is UI-only and delegates unlock to caller; no API/loading/error behavior is present in this file. | 1-57 |
| Annotations panel | `src/features/documents/components/AnnotationsPanel.tsx` | low | CRUD is wired through annotation hooks with loading/error states; no local audit blocker found. | 141-230 |
| Custom fields panel | `src/features/documents/components/CustomFieldsPanel.tsx` | low | Custom field save has loading/toast feedback and handles errors inline; no local audit blocker found. | 182-232 |
| Duplicates panel | `src/features/documents/components/DuplicatesPanel.tsx` | low | Duplicate detection has loading/error/empty states; dismiss is local-only but non-destructive. | 98-146 |
| Entity panel | `src/features/documents/components/EntityPanel.tsx` | low | Entity extraction/copying has loading/error/toast paths; no local audit blocker found. | 171-272 |
| Expiry panel | `src/features/documents/components/ExpiryPanel.tsx` | low | Expiry settings/reminders have loading/error paths and confirmation for removal; no local audit blocker found. | 218-431 |
| Filing suggestions panel | `src/features/documents/components/FilingSuggestionsPanel.tsx` | low | Suggestions and actions have loading/error/toast feedback; no local audit blocker found. | 120-234 |
| OCR quality panel | `src/features/documents/components/OCRQualityPanel.tsx` | low | OCR metrics render loading/error states and manual recheck status; no local audit blocker found. | 113-261 |
| Related documents panel | `src/features/documents/components/RelatedDocumentsPanel.tsx` | medium | Linking requires manually entering a UUID; there is no search/picker flow, so relation CRUD is technically wired but poor for end users. | 147-206 |
| Similar documents | `src/features/documents/components/SimilarDocuments.tsx` | low | Similar-document query handles loading/error/empty states; no local audit blocker found. | 15-89 |
| Version diff viewer | `src/features/documents/components/VersionDiffViewer.tsx` | low | Version diff viewer has loading/error branches; no local audit blocker found in this file. | 183-254 |
| Version history panel | `src/features/documents/components/VersionHistoryPanel.tsx` | medium | Restore/upload mutations have toasts, but destructive restore is guarded by a confirmation dialog while upload replacement has no confirmation. | 145-176, 359-388 |
| Watermark dialog | `src/features/documents/components/WatermarkDialog.tsx` | low | Watermark creation has pending/error/toast handling; no local audit blocker found. | 70-96, 351-369 |
| Bulk export dialog | `src/features/documents/components/BulkExportDialog.tsx` | low | Export start/status polling has loading/error states; no local audit blocker found. | 105-232 |
| Commander | `src/features/documents/components/Commander.tsx` | low | Command palette is local UI wiring with loading affordance; no local audit blocker found. | 20-89 |
| Browser OCR config | `src/features/documents/components/BrowserOCRConfig.tsx` | low | Configuration UI is local/provider-state based with validation controls; no API mutation feedback is expected in this file. | 331-435 |
| Download menu | `src/features/documents/components/DownloadMenu.tsx` | low | Download menu actions open backend URLs; no local loading/error feedback exists for browser download failures. | 48-155 |
| Dual panel | `src/features/documents/components/DualPanel.tsx` | low | Layout-only component with no CRUD/search/mutation behavior; no local audit blocker found. | 1-112 |
| QR code modal | `src/features/documents/components/QRCodeModal.tsx` | low | QR fetch/generation paths expose loading/error states; no local audit blocker found. | 29-134 |
| Ocr confidence overlay | `src/features/documents/OcrConfidenceOverlay.tsx` | low | Overlay intentionally hides placeholder OCR data; no blocker found, but this can make missing hOCR look like no overlay rather than a retrievable error. | 43-46 |
| Tag management page | `src/features/tags/TagManagementPage.tsx` | low | Tag CRUD/merge has loading/error/confirmation/toast feedback; no local audit blocker found. | 214-374 |
| Tag list | `src/features/tags/components/TagList.tsx` | medium | Delete confirmation exists, but `deleteMutation.mutate(id)` has no toast/error handling in this component, so failures can be silent. | 53-55, 219-239 |
| Tag picker | `src/features/tags/components/TagPicker.tsx` | medium | `useTags` result ignores loading/error states and create failures are swallowed with a comment, so embedded tag creation can fail silently. | 25-57 |
| Tag form | `src/features/tags/components/TagForm.tsx` | low | Standalone tag create/edit form has validation, pending state, and success/error toasts; no local audit blocker found. | 53-79, 146-155 |
| Missing document viewer feature dir | `src/features/document-viewer/` | high | Requested directory does not exist, so there is no dedicated document-viewer feature module to audit or reuse. | N/A |
| Missing metadata feature dir | `src/features/metadata/` | high | Requested directory does not exist, so metadata CRUD appears scattered in document panels rather than a dedicated feature surface. | N/A |
| Missing inventory page | `src/pages/Inventory.tsx` | medium | Requested page file does not exist in `src/pages`; inventory may live elsewhere, but it is absent from the requested page surface. | N/A |
| Missing templates page | `src/pages/Templates.tsx` | medium | Requested page file does not exist in `src/pages`; templates may live under features, but it is absent from the requested page surface. | N/A |

## Top 5 Actionable Fixes

1. Wire the dead document detail/list actions: implement Move, Copy, Delete, card overflow options, and row version navigation with confirmations and success/error toasts.
2. Connect filter and sort state to the document list query: pass `searchFilters` and sorting into `useInfiniteDocuments`, replace hardcoded filter options with tag/document-type APIs, and verify query params match backend names.
3. Add destructive confirmations for bulk archive and page deletion/edit operations, then normalize mutation feedback with success/error toasts.
4. Harden the viewer end-to-end: expose page-query errors from `DocumentDetail`, add image `onError` handling in `Viewer`, and fix the comparison page's `/documents/${id}` link to the actual detail route.
5. Improve tagging reusables: add loading/error handling and toast feedback to `TagPicker` and `TagList`, then reuse those reliable controls in document metadata/tagging flows.

## What a World-Class DMS Workspace Should Have

- Complete document CRUD from every major surface: list, card, detail, viewer, and bulk toolbar.
- Dedicated, reusable document viewer and metadata feature modules with consistent query/error/loading conventions.
- End-to-end preview reliability: page fetch errors, image load errors, retry actions, OCR fallback explanations, and unsupported-file states.
- Real, server-backed filtering and sorting by folder, text, type, tag, owner, date, OCR status, retention/expiry, permissions, and workflow state.
- Bulk operations with select-all-across-results, preview of affected items, confirmations for destructive changes, partial-failure reporting, and audit logging.
- Consistent mutation feedback: optimistic updates where safe, toasts for success/failure, inline validation, and retry guidance.
- Full document lifecycle controls: upload, classify, tag, move, copy, rename, version, compare, split, merge, watermark, archive, restore, delete, and retention/legal hold.
- Metadata governance: required fields by document type, validation, inheritance, field history, and searchable custom fields.
- Collaboration controls: secure sharing, expiring links, role-based access, comments, annotations, redaction, approval workflows, and activity trails.
- Operational excellence: accessibility, keyboard shortcuts, empty states with next actions, telemetry for failed viewer loads, and tests covering core document workflows.
