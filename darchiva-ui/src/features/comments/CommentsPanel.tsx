// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  CheckCircle2,
  Circle,
  Trash2,
  MessageSquareReply,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  useDocumentComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
} from './api';
import type { DocumentComment } from './types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CommentsPanelProps {
  documentId: string;
  currentPage?: number;
}

// ---------------------------------------------------------------------------
// Sub-component: single comment row
// ---------------------------------------------------------------------------

interface CommentRowProps {
  comment: DocumentComment;
  documentId: string;
  currentPage?: number;
  isReply?: boolean;
}

function CommentRow({ comment, documentId, currentPage, isReply = false }: CommentRowProps) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [pinReply, setPinReply] = useState(false);

  const updateComment = useUpdateComment(documentId);
  const deleteComment = useDeleteComment(documentId);
  const createComment = useCreateComment(documentId);

  function handleToggleResolve() {
    updateComment.mutate({
      commentId: comment.id,
      is_resolved: !comment.is_resolved,
    });
  }

  function handleDelete() {
    deleteComment.mutate(comment.id);
  }

  function handleReplySubmit() {
    if (!replyContent.trim()) return;
    createComment.mutate(
      {
        content: replyContent.trim(),
        parent_id: comment.id,
        page_number: pinReply && currentPage != null ? currentPage : null,
      },
      {
        onSuccess: () => {
          setReplyContent('');
          setPinReply(false);
          setReplyOpen(false);
        },
      },
    );
  }

  const resolvedClass = comment.is_resolved ? 'opacity-50' : '';

  return (
    <div className={`space-y-2 ${isReply ? 'ml-6 pl-3 border-l border-border' : ''}`}>
      <div className={`rounded-md border bg-card p-3 space-y-1 ${resolvedClass}`}>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{comment.author_name}</span>
            {comment.page_number != null && (
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                p.{comment.page_number}
              </Badge>
            )}
            {comment.is_resolved && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                Resolved
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* Content */}
        <p className="text-sm text-foreground whitespace-pre-wrap break-words">
          {comment.content}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-1 pt-1">
          {!isReply && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs gap-1"
              onClick={() => setReplyOpen((v) => !v)}
            >
              <MessageSquareReply className="h-3 w-3" />
              Reply
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs gap-1"
            onClick={handleToggleResolve}
            disabled={updateComment.isPending}
          >
            {comment.is_resolved ? (
              <Circle className="h-3 w-3" />
            ) : (
              <CheckCircle2 className="h-3 w-3" />
            )}
            {comment.is_resolved ? 'Reopen' : 'Resolve'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs gap-1 text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={deleteComment.isPending}
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </Button>
        </div>
      </div>

      {/* Inline reply form */}
      {replyOpen && (
        <div className="ml-6 pl-3 border-l border-border space-y-2">
          <Textarea
            placeholder="Write a reply…"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            className="text-sm min-h-[72px] resize-none"
          />
          {currentPage != null && (
            <div className="flex items-center gap-2">
              <Checkbox
                id={`pin-reply-${comment.id}`}
                checked={pinReply}
                onCheckedChange={(v) => setPinReply(!!v)}
              />
              <Label htmlFor={`pin-reply-${comment.id}`} className="text-xs cursor-pointer">
                Pin to page {currentPage}
              </Label>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleReplySubmit}
              disabled={!replyContent.trim() || createComment.isPending}
            >
              {createComment.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Reply
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setReplyOpen(false);
                setReplyContent('');
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export function CommentsPanel({ documentId, currentPage }: CommentsPanelProps) {
  const [filterPage, setFilterPage] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [pinNew, setPinNew] = useState(false);

  const pageFilter = filterPage && currentPage != null ? currentPage : undefined;
  const { data: allComments, isLoading } = useDocumentComments(documentId, pageFilter);
  const createComment = useCreateComment(documentId);

  // Split top-level vs replies for rendering
  const topLevel = (allComments ?? []).filter((c) => c.parent_id == null);
  const repliesFor = (parentId: string) =>
    (allComments ?? []).filter((c) => c.parent_id === parentId);

  function handleAddComment() {
    if (!newContent.trim()) return;
    createComment.mutate(
      {
        content: newContent.trim(),
        page_number: pinNew && currentPage != null ? currentPage : null,
        parent_id: null,
      },
      {
        onSuccess: () => {
          setNewContent('');
          setPinNew(false);
        },
      },
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0">
        <span className="text-sm font-semibold flex-1">Comments</span>
        {currentPage != null && (
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setFilterPage(false)}
              className={`px-2 py-0.5 rounded ${!filterPage ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              All pages
            </button>
            <button
              onClick={() => setFilterPage(true)}
              className={`px-2 py-0.5 rounded ${filterPage ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Page {currentPage}
            </button>
          </div>
        )}
      </div>

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </>
        ) : topLevel.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No comments yet. Be the first to comment.
          </p>
        ) : (
          topLevel.map((comment) => (
            <div key={comment.id} className="space-y-2">
              <CommentRow
                comment={comment}
                documentId={documentId}
                currentPage={currentPage}
              />
              {repliesFor(comment.id).map((reply) => (
                <CommentRow
                  key={reply.id}
                  comment={reply}
                  documentId={documentId}
                  currentPage={currentPage}
                  isReply
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* New comment form */}
      <div className="shrink-0 border-t px-3 py-3 space-y-2">
        <Separator className="mb-2" />
        <Textarea
          placeholder="Add a comment…"
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          className="text-sm min-h-[80px] resize-none"
        />
        {currentPage != null && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="pin-new-comment"
              checked={pinNew}
              onCheckedChange={(v) => setPinNew(!!v)}
            />
            <Label htmlFor="pin-new-comment" className="text-xs cursor-pointer">
              Pin to page {currentPage}
            </Label>
          </div>
        )}
        <Button
          size="sm"
          onClick={handleAddComment}
          disabled={!newContent.trim() || createComment.isPending}
          className="w-full"
        >
          {createComment.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
          Add Comment
        </Button>
      </div>
    </div>
  );
}
