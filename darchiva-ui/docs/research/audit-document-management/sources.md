# Sources Read

Every target file was read via full-content enumeration/static audit and line-numbered snippet inspection where findings required precise ranges.

| File | Summary |
| --- | --- |
| `src/pages/Documents.tsx` | Main document workspace; search is wired, but filter/sort store state is not passed to the listing query and some card/row action buttons are dead. |
| `src/pages/DocumentDetail.tsx` | Main viewer/detail page; loads document and pages, but primary Move/Copy/Delete/favorite actions are incomplete and page query errors are not surfaced. |
| `src/pages/DocumentComparison.tsx` | Comparison viewer; metadata errors are handled, page errors are not, and detail links use a route inconsistent with other document navigation. |
| `src/pages/SharedDocuments.tsx` | Shared-documents page; picker has loading/error handling but forces selected search results to `ctype: document`. |
| `src/pages/Inventory.tsx` | Missing requested file; no source to audit under `src/pages`. |
| `src/pages/Templates.tsx` | Missing requested file; no source to audit under `src/pages`. |
| `src/features/document-viewer/` | Missing or empty requested directory; no dedicated document-viewer feature files exist at this path. |
| `src/features/metadata/` | Missing or empty requested directory; no dedicated metadata feature files exist at this path. |
| `src/features/documents/OcrConfidenceOverlay.tsx` | OCR confidence overlay with loading/error states through data source handling; hides placeholder hOCR data. |
| `src/features/documents/api.ts` | Core document API hooks; includes folder/document CRUD and bulk hooks, generally invalidates queries but relies on callers for toasts. |
| `src/features/documents/api/annotations.ts` | Annotation query/mutation hooks; API-backed and invalidates annotation queries. |
| `src/features/documents/api/batch.ts` | Batch operation helper types/API; used by batch toolbar for delete/export-style operations. |
| `src/features/documents/api/bulkDownload.ts` | Bulk download mutation hook posting selected node IDs. |
| `src/features/documents/api/dedup.ts` | Duplicate detection query and dismiss mutation hooks. |
| `src/features/documents/api/entities.ts` | Entity extraction query hook with API-backed entity response types. |
| `src/features/documents/api/expiry.ts` | Expiry/reminder API types and mutation helpers. |
| `src/features/documents/api/export.ts` | Bulk export start/status hooks with polling support. |
| `src/features/documents/api/filingSuggestions.ts` | Filing suggestion query/action hooks. |
| `src/features/documents/api/infiniteDocuments.ts` | Infinite document list hook; supports folder/search/filter params but current page passes only folder/search. |
| `src/features/documents/api/merge.ts` | Thin compatibility export for merge dialog. |
| `src/features/documents/api/ocrQuality.ts` | OCR quality metrics and check hooks. |
| `src/features/documents/api/pageOps.ts` | Page reorder/rotate/delete operation hooks. |
| `src/features/documents/api/qr.ts` | QR label fetch/generate hooks. |
| `src/features/documents/api/relationships.ts` | Related-document query/link/unlink hooks. |
| `src/features/documents/api/watermark.ts` | Watermark mutation hook. |
| `src/features/documents/components/AnnotationsPanel.tsx` | Annotation CRUD panel; has loading/error states and mutation controls. |
| `src/features/documents/components/BatchActionsBar.tsx` | Bulk toolbar; many actions are API-backed with toasts, but archive lacks confirmation and generic batch errors lack toast. |
| `src/features/documents/components/BrowserOCRConfig.tsx` | Browser OCR configuration UI; local/provider-state focused with validation controls. |
| `src/features/documents/components/BulkExportDialog.tsx` | Bulk export dialog; has start/status polling and loading/error UI. |
| `src/features/documents/components/Commander.tsx` | Command UI component; no document CRUD gaps found locally. |
| `src/features/documents/components/CustomFieldsPanel.tsx` | Custom field panel; save feedback is present through inline/toast handling. |
| `src/features/documents/components/DownloadMenu.tsx` | Download menu; opens backend URLs but cannot surface browser download failures. |
| `src/features/documents/components/DualPanel.tsx` | Layout-only dual panel; no query/mutation behavior. |
| `src/features/documents/components/DuplicatesPanel.tsx` | Duplicate detection panel; has loading/error/empty states and local dismiss behavior. |
| `src/features/documents/components/EntityPanel.tsx` | Entity panel; has loading/error and copy/action toast feedback. |
| `src/features/documents/components/ExpiryPanel.tsx` | Expiry/reminder panel; includes loading/error handling and confirmation for removing expiry. |
| `src/features/documents/components/FilingSuggestionsPanel.tsx` | Filing suggestion panel; API-backed suggestions/actions with toast feedback. |
| `src/features/documents/components/MergeDocumentsDialog.tsx` | Merge dialog; real API mutation and inline states, but no toast feedback. |
| `src/features/documents/components/OCRQualityPanel.tsx` | OCR quality panel; metrics/check flows include loading/error handling. |
| `src/features/documents/components/PageEditor.tsx` | Page edit modal; applies rotate/delete/reorder operations but lacks deletion confirmation and toast feedback. |
| `src/features/documents/components/PageSelectDialog.tsx` | Page selection dialog; handles failed image tracking but gives limited pre-action feedback. |
| `src/features/documents/components/QRCodeModal.tsx` | QR code modal; fetch/generate states are handled. |
| `src/features/documents/components/RelatedDocumentsPanel.tsx` | Related document panel; API-backed but linking requires manual UUID entry instead of search. |
| `src/features/documents/components/SimilarDocuments.tsx` | Similar document panel; loading/error/empty states are present. |
| `src/features/documents/components/SplitDocumentDialog.tsx` | Split dialog; real API mutation and inline states, but no toast feedback and parent does not pass `onSuccess`. |
| `src/features/documents/components/ThumbnailGrid.tsx` | Thumbnail grid; supports selection but does not expose an open/view callback. |
| `src/features/documents/components/ThumbnailStrip.tsx` | Viewer thumbnail strip; broken images fallback to placeholders. |
| `src/features/documents/components/TreeView.tsx` | Folder/document tree component; parent-driven actions mean confirmation/feedback are not enforced locally. |
| `src/features/documents/components/VersionDiffViewer.tsx` | Version diff viewer; has loading/error rendering. |
| `src/features/documents/components/VersionHistoryPanel.tsx` | Version history panel; restore/upload mutations have toasts, restore is confirmed, upload replacement is not. |
| `src/features/documents/components/Viewer.tsx` | Main viewer component; page display/navigation works but image errors lack handling. |
| `src/features/documents/components/VirtualDocumentList.tsx` | Virtualized document list; provides loading rows/cards and delegates actions to parents. |
| `src/features/documents/components/WatermarkDialog.tsx` | Watermark dialog; has pending/error/toast handling. |
| `src/features/documents/components/index.ts` | Barrel exports for document components. |
| `src/features/documents/components/modals/CreateFolderModal.tsx` | Folder creation modal; validation/loading/toasts are present. |
| `src/features/documents/components/modals/DeleteDocumentDialog.tsx` | Delete confirmation modal; caller must handle resulting mutation feedback. |
| `src/features/documents/components/modals/ExtractPagesModal.tsx` | Extract pages modal; inline loading/error but no toast/confirmation clarity for source-changing semantics. |
| `src/features/documents/components/modals/FilterDocumentsModal.tsx` | Filter modal; document type/tag filters are placeholders/hardcoded and not connected to listing params. |
| `src/features/documents/components/modals/ShareLinkDialog.tsx` | Share link dialog; create/revoke toasts exist, but payload support for advanced inputs should be verified. |
| `src/features/documents/components/modals/SortDocumentsModal.tsx` | Sort modal; updates store state only and is not consumed by the document list query. |
| `src/features/documents/components/modals/TransferPagesModal.tsx` | Transfer pages modal; inline loading/error but no toast or confirmation for moving pages. |
| `src/features/documents/components/modals/UnsavedChangesDialog.tsx` | Generic unsaved changes confirmation dialog. |
| `src/features/documents/components/modals/UploadModal.tsx` | Upload modal; uses upload hook with loading/error handling. |
| `src/features/documents/components/modals/ViewEncryptedDocumentModal.tsx` | Password modal; UI-only unlock handoff to caller. |
| `src/features/documents/components/modals/index.ts` | Barrel exports for document modals. |
| `src/features/documents/hooks/useBrowserOCR.ts` | Browser OCR hook/config logic; no UI findings beyond consumer configuration handling. |
| `src/features/documents/hooks/useDocumentSimilar.ts` | Similar-document query hook. |
| `src/features/documents/hooks/useShareLinks.ts` | Share-link query/create/revoke hooks. |
| `src/features/documents/index.ts` | Feature barrel exports. |
| `src/features/documents/styles/modals.css` | Document modal CSS; no behavior to audit. |
| `src/features/tags/TagManagementPage.tsx` | Tag management page; complete CRUD/merge flow with loading/error/confirmation/toasts. |
| `src/features/tags/api.ts` | Tag API hooks; query/mutation hooks invalidate tag queries but caller handles feedback. |
| `src/features/tags/components/TagForm.tsx` | Standalone tag form; validation, pending, success, and error toasts are present. |
| `src/features/tags/components/TagList.test.tsx` | Tests for tag list loading/error/list/search/delete confirmation behavior. |
| `src/features/tags/components/TagList.tsx` | Tag list; loading/error/search and delete confirmation exist, but delete mutation feedback is missing locally. |
| `src/features/tags/components/TagPicker.tsx` | Reusable tag picker; ignores tag loading/error states and swallows create failures. |
| `src/features/tags/index.ts` | Tag feature barrel exports. |
| `src/features/tags/types.ts` | Tag type definitions and color constants. |
