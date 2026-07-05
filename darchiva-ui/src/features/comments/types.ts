// (c) Copyright Datacraft, 2026
export interface DocumentComment {
  id: string;
  document_id: string;
  page_number: number | null;
  author_id: string;
  author_name: string;
  content: string;
  is_resolved: boolean;
  parent_id: string | null;
  reactions?: CommentReaction[] | Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface CommentReaction {
  emoji: string;
  count: number;
  reacted_by_me?: boolean;
}

export interface MentionUser {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

export interface CreateCommentPayload {
  content: string;
  page_number?: number | null;
  parent_id?: string | null;
}

export interface UpdateCommentPayload {
  content?: string;
  is_resolved?: boolean;
}
