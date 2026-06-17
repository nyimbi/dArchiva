export interface EntityNode {
  id: string;
  label: string;
  type: 'person' | 'organization' | 'location' | 'date' | 'money' | 'other';
  document_count: number;
}

export interface EntityEdge {
  source: string;
  target: string;
  weight: number;
  co_document_count: number;
}

export interface EntityGraphResponse {
  nodes: EntityNode[];
  edges: EntityEdge[];
}

export interface EntityDocumentsResponse {
  documents: Array<{ id: string; title: string; created_at: string }>;
}
