// (c) Copyright Datacraft, 2026
// Document segmentation feature — TypeScript types mirroring backend schemas.

export type SegmentStatus = 'pending' | 'approved' | 'rejected' | 'merged' | 'split';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type SegmentationMethod =
  | 'vlm'
  | 'edge_detection'
  | 'contour'
  | 'hybrid'
  | 'template'
  | 'manual';

export interface Boundary {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Segment {
  id: string;
  original_scan_id: string;
  original_page_number: number;
  document_id: string | null;
  segment_number: number;
  total_segments: number;
  boundary: Boundary | null;
  rotation_angle: number;
  was_deskewed: boolean;
  segmentation_confidence: number;
  segmentation_method: SegmentationMethod;
  status: SegmentStatus;
  manually_verified: boolean;
  verified_by_id: string | null;
  verified_at: string | null;
  document_type_hint: string | null;
  segment_width: number | null;
  segment_height: number | null;
  needs_review: boolean;
  created_at: string;
  updated_at: string;
}

export interface SegmentListResponse {
  items: Segment[];
  total: number;
  page: number;
  page_size: number;
}

export interface SegmentationJob {
  id: string;
  source_document_id: string;
  source_page_number: number | null;
  method: SegmentationMethod;
  auto_create_documents: boolean;
  min_confidence_threshold: number;
  status: JobStatus;
  error_message: string | null;
  documents_detected: number;
  segments_created: number;
  processing_time_ms: number | null;
  celery_task_id: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface SegmentationJobResponse {
  job_id: string;
  celery_task_id: string | null;
  status: string;
  message: string;
}

export interface SegmentationStats {
  total_segments: number;
  pending_review: number;
  approved: number;
  rejected: number;
  avg_confidence: number;
  documents_created: number;
  multi_document_scans: number;
}

export interface SegmentationRequest {
  document_id: string;
  page_number?: number;
  method?: SegmentationMethod;
  auto_create_documents?: boolean;
  min_confidence?: number;
  deskew?: boolean;
}

export interface SegmentVerifyRequest {
  approved: boolean;
  notes?: string;
}

export interface SegmentUpdateRequest {
  status?: SegmentStatus;
  boundary?: Boundary;
  document_type_hint?: string;
  notes?: string;
}

export interface SegmentCreateDocumentRequest {
  segment_id: string;
  folder_id: string;
  title?: string;
  document_type_id?: string;
  tags?: string[];
}
