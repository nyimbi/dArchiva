// (c) Copyright Datacraft, 2026
// Standalone merge API hook — thin wrapper around POST /api/v1/documents/merge.
// The dialog component (MergeDocumentsDialog.tsx) also exports useMergeDocuments
// directly; this file exists so callers can import from the api/ directory.
export { useMergeDocuments } from '../components/MergeDocumentsDialog';
export type { MergeSourceDocument } from '../components/MergeDocumentsDialog';
