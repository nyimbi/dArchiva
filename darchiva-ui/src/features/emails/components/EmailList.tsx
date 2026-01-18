// (c) Copyright Datacraft, 2026
/**
 * Email list component with thread grouping.
 */
import { useState } from 'react';
import { Mail, Paperclip, Clock, Search, Upload, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmailImports } from '../api';
import type { EmailImport, EmailSource } from '../types';

interface EmailListProps {
	onSelect?: (email: EmailImport) => void;
	selectedId?: string;
	folderId?: string;
}

const sourceColors: Record<EmailSource, string> = {
	upload: 'bg-blue-500/10 text-blue-500',
	imap: 'bg-green-500/10 text-green-500',
	api: 'bg-purple-500/10 text-purple-500',
	outlook: 'bg-orange-500/10 text-orange-500',
	gmail: 'bg-red-500/10 text-red-500',
};

export function EmailList({ onSelect, selectedId, folderId }: EmailListProps) {
	const [search, setSearch] = useState('');
	const [sourceFilter, setSourceFilter] = useState<string>('all');
	const [page, setPage] = useState(1);

	const { data, isLoading, refetch } = useEmailImports({
		page,
		pageSize: 25,
		folderId,
		search: search || undefined,
		source: sourceFilter !== 'all' ? sourceFilter : undefined,
	});

	const emails = data?.items ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.ceil(total / 25);

	return (
		<div className="flex flex-col h-full">
			{/* Search and filters */}
			<div className="p-4 border-b border-border/50 space-y-3">
				<div className="flex items-center gap-2">
					<div className="relative flex-1">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search emails..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="pl-9"
						/>
					</div>
					<Button variant="outline" size="icon" onClick={() => refetch()}>
						<RefreshCw className="h-4 w-4" />
					</Button>
				</div>

				<div className="flex items-center gap-2">
					<Select value={sourceFilter} onValueChange={setSourceFilter}>
						<SelectTrigger className="w-32">
							<SelectValue placeholder="Source" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Sources</SelectItem>
							<SelectItem value="upload">Upload</SelectItem>
							<SelectItem value="imap">IMAP</SelectItem>
							<SelectItem value="outlook">Outlook</SelectItem>
							<SelectItem value="gmail">Gmail</SelectItem>
						</SelectContent>
					</Select>

					<span className="text-sm text-muted-foreground ml-auto">
						{total} email{total !== 1 ? 's' : ''}
					</span>
				</div>
			</div>

			{/* Email list */}
			<div className="flex-1 overflow-auto">
				{isLoading ? (
					<div className="p-4 space-y-3">
						{Array.from({ length: 5 }).map((_, i) => (
							<div key={i} className="space-y-2">
								<Skeleton className="h-5 w-3/4" />
								<Skeleton className="h-4 w-1/2" />
							</div>
						))}
					</div>
				) : emails.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full text-muted-foreground">
						<Mail className="h-12 w-12 mb-4 opacity-50" />
						<p className="text-lg font-medium">No emails found</p>
						<p className="text-sm">Import emails to get started</p>
					</div>
				) : (
					<div className="divide-y divide-border/50">
						{emails.map((email) => (
							<EmailListItem
								key={email.id}
								email={email}
								isSelected={email.id === selectedId}
								onClick={() => onSelect?.(email)}
							/>
						))}
					</div>
				)}
			</div>

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="p-4 border-t border-border/50 flex items-center justify-between">
					<Button
						variant="outline"
						size="sm"
						disabled={page === 1}
						onClick={() => setPage((p) => Math.max(1, p - 1))}
					>
						Previous
					</Button>
					<span className="text-sm text-muted-foreground">
						Page {page} of {totalPages}
					</span>
					<Button
						variant="outline"
						size="sm"
						disabled={page === totalPages}
						onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
					>
						Next
					</Button>
				</div>
			)}
		</div>
	);
}

interface EmailListItemProps {
	email: EmailImport;
	isSelected: boolean;
	onClick: () => void;
}

function EmailListItem({ email, isSelected, onClick }: EmailListItemProps) {
	const sentDate = email.sent_date ? new Date(email.sent_date) : null;

	return (
		<button
			className={cn(
				'w-full text-left p-4 hover:bg-accent/50 transition-colors',
				isSelected && 'bg-accent'
			)}
			onClick={onClick}
		>
			<div className="flex items-start gap-3">
				<div className="flex-shrink-0 mt-1">
					<div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
						<Mail className="h-4 w-4 text-primary" />
					</div>
				</div>

				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 mb-1">
						<span className="font-medium truncate">
							{email.from_name || email.from_address}
						</span>
						{email.has_attachments && (
							<Paperclip className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
						)}
						<Badge variant="secondary" className={cn('ml-auto text-xs', sourceColors[email.source])}>
							{email.source}
						</Badge>
					</div>

					<p className="font-medium text-sm truncate">
						{email.subject || '(no subject)'}
					</p>

					<div className="flex items-center gap-2 mt-1">
						{sentDate && (
							<span className="text-xs text-muted-foreground flex items-center gap-1">
								<Clock className="h-3 w-3" />
								{formatDistanceToNow(sentDate, { addSuffix: true })}
							</span>
						)}

						{email.attachment_count > 0 && (
							<span className="text-xs text-muted-foreground">
								{email.attachment_count} attachment{email.attachment_count !== 1 ? 's' : ''}
							</span>
						)}
					</div>
				</div>
			</div>
		</button>
	);
}
