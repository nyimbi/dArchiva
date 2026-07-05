// (c) Copyright Datacraft, 2026
// Types for page management operations: reorder, rotate, delete, extract, move.

/** One entry in the POST /pages/ list — identifies the page and its desired rotation delta. */
export interface PageAndRotOp {
  page: {
    id: string;
    number: number;
  };
  /** Rotation delta in degrees (multiple of 90). Positive = CW, negative = CCW. */
  angle: number;
}

export type MoveStrategy = 'MIX' | 'REPLACE';

export type ExtractStrategy = 'one-page-per-doc' | 'all-pages-in-one-doc';

export interface MovePageRequest {
  source_page_ids: string[];
  target_page_id: string;
  move_strategy: MoveStrategy;
}

export interface ExtractPageRequest {
  source_page_ids: string[];
  target_folder_id: string;
  strategy: ExtractStrategy;
  title_format: string;
}

/** Local UI state for a page card in the management panel. */
export interface PageState {
  id: string;
  pageNumber: number;
  /** Accumulated visual rotation (not yet saved). Multiple of 90. */
  angle: number;
  selected: boolean;
  thumbnailUrl?: string;
}
