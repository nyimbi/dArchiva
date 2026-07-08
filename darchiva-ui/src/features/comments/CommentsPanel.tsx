// (c) Copyright Datacraft, 2026
import { useAuth } from '@/features/auth';
import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  MessageSquareReply,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  useCreateComment,
  useDeleteComment,
  useDocumentComments,
  useMentionUsers,
  useReactToComment,
  useUpdateComment,
} from './api';
import type { CommentReaction, DocumentComment, MentionUser } from './types';
import { toast } from 'sonner';

export interface CommentsPanelProps {
  documentId: string;
  currentPage?: number;
}

const EMPTY_COMMENTS: DocumentComment[] = [];
const REACTION_EMOJIS = ['👍', '✅', '❓', '🔴'];

function getMentionLabel(user: MentionUser) {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return fullName || user.username || user.email;
}

function getMentionToken(user: MentionUser) {
  return user.username || user.email.split('@')[0];
}

function getMentionQuery(content: string) {
  const match = content.match(/(^|\s)@([A-Za-z0-9._-]{1,30})$/);
  return match?.[2] ?? '';
}

function normalizeReactions(comment: DocumentComment): CommentReaction[] {
  const reactions = comment.reactions;
  if (!reactions) return REACTION_EMOJIS.map((emoji) => ({ emoji, count: 0 }));
  if (Array.isArray(reactions)) {
    const byEmoji = new Map(reactions.map((reaction) => [reaction.emoji, reaction]));
    return REACTION_EMOJIS.map((emoji) => byEmoji.get(emoji) ?? { emoji, count: 0 });
  }
  return REACTION_EMOJIS.map((emoji) => ({ emoji, count: reactions[emoji] ?? 0 }));
}

interface CommentComposerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  minHeight?: string;
}

function CommentComposer({ value, onChange, placeholder, minHeight = 'min-h-[80px]' }: CommentComposerProps) {
  const mentionQuery = getMentionQuery(value);
  const { data: mentionUsers } = useMentionUsers(mentionQuery);
  const showMentions = mentionQuery.length > 0 && (mentionUsers?.length ?? 0) > 0;

  const insertMention = (user: MentionUser) => {
    const token = getMentionToken(user);
    onChange(value.replace(/(^|\s)@([A-Za-z0-9._-]{1,30})$/, `$1@${token} `));
  };

  return (
    <div className="relative">
      <Textarea
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`text-sm ${minHeight} resize-none`}
      />
      {showMentions && (
        <div className="absolute bottom-full left-0 z-20 mb-1 max-h-52 w-72 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-lg">
          {mentionUsers!.slice(0, 8).map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => insertMention(user)}
              className="flex w-full flex-col rounded-sm px-2 py-1.5 text-left hover:bg-accent hover:text-accent-foreground"
            >
              <span className="text-sm font-medium">{getMentionLabel(user)}</span>
              <span className="text-xs text-muted-foreground">@{getMentionToken(user)} · {user.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface CommentRowProps {
  comment: DocumentComment;
  documentId: string;
  currentPage?: number;
  isReply?: boolean;
}

function CommentRow({ comment, documentId, currentPage, isReply = false }: CommentRowProps) {
  const { user } = useAuth();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [pinReply, setPinReply] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const updateComment = useUpdateComment(documentId);
  const deleteComment = useDeleteComment(documentId);
  const createComment = useCreateComment(documentId);
  const reactToComment = useReactToComment(documentId);
  const isOwnComment = user?.id === comment.author_id;
  const reactions = normalizeReactions(comment);
  const resolvedClass = comment.is_resolved ? 'opacity-50' : '';
  const createdAt = new Date(comment.created_at);
  const edited = comment.updated_at && comment.updated_at !== comment.created_at;

  function handleToggleResolve() {
    const nextResolved = !comment.is_resolved;
    updateComment.mutate(
      {
        commentId: comment.id,
        is_resolved: nextResolved,
      },
      {
        onSuccess: () => toast.success(nextResolved ? 'Comment resolved' : 'Comment reopened'),
        onError: () => toast.error(nextResolved ? 'Failed to resolve comment' : 'Failed to reopen comment'),
      },
    );
  }

  function handleDelete() {
    setConfirmDialog({
      message: 'Delete this comment?',
      onConfirm: () =>
        deleteComment.mutate(comment.id, {
          onSuccess: () => {
            toast.success('Comment deleted');
            setConfirmDialog(null);
          },
          onError: () => toast.error('Failed to delete comment'),
        }),
    });
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
          toast.success('Reply added');
        },
        onError: () => toast.error('Failed to add reply'),
      },
    );
  }

  function handleEditSubmit() {
    if (!editContent.trim() || editContent.trim() === comment.content) {
      setEditing(false);
      setEditContent(comment.content);
      return;
    }
    updateComment.mutate(
      {
        commentId: comment.id,
        content: editContent.trim(),
      },
      {
        onSuccess: () => setEditing(false),
      },
    );
  }

  return (
    <div className={`space-y-2 ${isReply ? 'ml-6 pl-3 border-l border-border' : ''}`}>
      <div className={`rounded-md border bg-card p-3 space-y-2 ${resolvedClass}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
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
              {edited && <span className="text-xs text-muted-foreground">edited</span>}
            </div>
          </div>
          <time
            dateTime={comment.created_at}
            title={format(createdAt, 'PPpp')}
            className="shrink-0 text-xs text-muted-foreground"
          >
            {formatDistanceToNow(createdAt, { addSuffix: true })}
          </time>
        </div>

        {editing ? (
          <div className="space-y-2">
            <CommentComposer
              value={editContent}
              onChange={setEditContent}
              placeholder="Edit comment..."
              minHeight="min-h-[72px]"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleEditSubmit} disabled={!editContent.trim() || updateComment.isPending}>
                {updateComment.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setEditContent(comment.content);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">{comment.content}</p>
        )}

        {!editing && (
          <div className="flex flex-wrap items-center gap-1 pt-1">
            <div className="mr-1 flex items-center gap-1 rounded-full border bg-background px-1 py-0.5">
              {reactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  type="button"
                  onClick={() =>
                    reactToComment.mutate(
                      { commentId: comment.id, emoji: reaction.emoji },
                      {
                        onSuccess: () => toast.success('Reaction updated'),
                        onError: () => toast.error('Failed to update reaction'),
                      },
                    )
                  }
                  disabled={reactToComment.isPending}
                  className="inline-flex h-6 items-center gap-1 rounded-full px-1.5 text-xs hover:bg-accent disabled:opacity-50"
                  aria-label={`React ${reaction.emoji}`}
                >
                  <span>{reaction.emoji}</span>
                  {reaction.count > 0 && <span className="rounded-full bg-muted px-1 text-[10px]">{reaction.count}</span>}
                </button>
              ))}
            </div>
            {!isReply && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                onClick={() => setReplyOpen((value) => !value)}
              >
                <MessageSquareReply className="h-3 w-3" />
                Reply
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={handleToggleResolve}
              disabled={updateComment.isPending}
            >
              {comment.is_resolved ? <Circle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
              {comment.is_resolved ? 'Reopen' : 'Resolve'}
            </Button>
            {isOwnComment && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1 text-destructive hover:text-destructive"
                  onClick={handleDelete}
                  disabled={deleteComment.isPending}
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {replyOpen && (
        <div className="ml-6 pl-3 border-l border-border space-y-2">
          <CommentComposer
            value={replyContent}
            onChange={setReplyContent}
            placeholder="Write a reply..."
            minHeight="min-h-[72px]"
          />
          {currentPage != null && (
            <div className="flex items-center gap-2">
              <Checkbox
                id={`pin-reply-${comment.id}`}
                checked={pinReply}
                onCheckedChange={(value) => setPinReply(!!value)}
              />
              <Label htmlFor={`pin-reply-${comment.id}`} className="text-xs cursor-pointer">
                Pin to page {currentPage}
              </Label>
            </div>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleReplySubmit} disabled={!replyContent.trim() || createComment.isPending}>
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
      <AlertDialog
        open={!!confirmDialog}
        onOpenChange={(open) => {
          if (!open && !deleteComment.isPending) setConfirmDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog?.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteComment.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmDialog?.onConfirm();
              }}
              disabled={deleteComment.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteComment.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function CommentsPanel({ documentId, currentPage }: CommentsPanelProps) {
  const [filterPage, setFilterPage] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [pinNew, setPinNew] = useState(false);

  const pageFilter = filterPage && currentPage != null ? currentPage : undefined;
  const { data: allComments, isLoading, isError } = useDocumentComments(documentId, pageFilter);
  const createComment = useCreateComment(documentId);
  const comments = allComments ?? EMPTY_COMMENTS;
  const topLevel = useMemo(() => comments.filter((comment) => comment.parent_id == null), [comments]);
  const repliesByParent = useMemo(() => {
    const grouped = new Map<string, DocumentComment[]>();
    comments.forEach((comment) => {
      if (!comment.parent_id) return;
      grouped.set(comment.parent_id, [...(grouped.get(comment.parent_id) ?? []), comment]);
    });
    return grouped;
  }, [comments]);

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
          toast.success('Comment added');
        },
        onError: () => toast.error('Failed to add comment'),
      },
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
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

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {isLoading ? (
          <>
            {[1, 2, 3].map((item) => (
              <div key={item} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </>
        ) : isError ? (
          <div className="flex items-center gap-2 rounded-md border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Failed to load comments. Try refreshing.
          </div>
        ) : topLevel.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {pageFilter != null ? 'No comments on this page' : 'No comments yet. Be the first to comment.'}
          </p>
        ) : (
          topLevel.map((comment) => (
            <div key={comment.id} className="space-y-2">
              <CommentRow comment={comment} documentId={documentId} currentPage={currentPage} />
              {(repliesByParent.get(comment.id) ?? []).map((reply) => (
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

      <div className="shrink-0 border-t px-3 py-3 space-y-2">
        <Separator className="mb-2" />
        <CommentComposer
          value={newContent}
          onChange={setNewContent}
          placeholder="Add a comment..."
        />
        {currentPage != null && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="pin-new-comment"
              checked={pinNew}
              onCheckedChange={(value) => setPinNew(!!value)}
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
