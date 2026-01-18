// (c) Copyright Datacraft, 2026
/**
 * Audit log viewer component.
 */
import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import {
	Activity,
	User,
	FileText,
	Folder,
	Tag,
	Shield,
	Download,
	Upload,
	Eye,
	Trash2,
	Edit,
	Share2,
	RefreshCw,
	Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useAuditLogs } from '../api';
import type { AuditEntry, AuditAction, AuditResourceType } from '../types';

const actionIcons: Partial<Record<AuditAction, typeof Eye>> = {
	view: Eye,
	download: Download,
	upload: Upload,
	delete: Trash2,
	update: Edit,
	share: Share2,
};

const resourceIcons: Record<AuditResourceType, typeof FileText> = {
	document: FileText,
	folder: Folder,
	user: User,
	group: User,
	role: Shield,
	tag: Tag,
	workflow: Activity,
	email: FileText,
	system: Shield,
};

const actionColors: Partial<Record<AuditAction, string>> = {
	create: 'text-green-500',
	delete: 'text-red-500',
	update: 'text-blue-500',
	share: 'text-purple-500',
};

const actionLabels: Record<AuditAction, string> = {
	create: 'Created',
	update: 'Updated',
	delete: 'Deleted',
	view: 'Viewed',
	download: 'Downloaded',
	upload: 'Uploaded',
	share: 'Shared',
	unshare: 'Unshared',
	move: 'Moved',
	copy: 'Copied',
	rename: 'Renamed',
	tag: 'Tagged',
	untag: 'Untagged',
	ocr: 'OCR Processed',
	login: 'Logged In',
	logout: 'Logged Out',
	permission_change: 'Permission Changed',
};

const resourceLabels: Record<AuditResourceType, string> = {
	document: 'Document',
	folder: 'Folder',
	user: 'User',
	group: 'Group',
	role: 'Role',
	tag: 'Tag',
	workflow: 'Workflow',
	email: 'Email',
	system: 'System',
};

interface AuditLogProps {
	resourceType?: AuditResourceType;
	resourceId?: string;
	userId?: string;
}

export function AuditLog({ resourceType, resourceId, userId }: AuditLogProps) {
	const [page, setPage] = useState(1);
	const [actionFilter, setActionFilter] = useState<string>('all');
	const [typeFilter, setTypeFilter] = useState<string>(resourceType || 'all');

	const { data, isLoading, refetch } = useAuditLogs({
		page,
		pageSize: 50,
		action: actionFilter !== 'all' ? (actionFilter as AuditAction) : undefined,
		resource_type: typeFilter !== 'all' ? (typeFilter as AuditResourceType) : resourceType,
		resource_id: resourceId,
		user_id: userId,
	});

	const entries = data?.items ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.ceil(total / 50);

	if (isLoading) {
		return (
			<div className="space-y-3">
				{Array.from({ length: 10 }).map((_, i) => (
					<Skeleton key={i} className="h-16" />
				))}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Filters */}
			<div className="flex items-center gap-2">
				<Filter className="h-4 w-4 text-muted-foreground" />

				<Select value={actionFilter} onValueChange={setActionFilter}>
					<SelectTrigger className="w-40">
						<SelectValue placeholder="Action" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Actions</SelectItem>
						{Object.entries(actionLabels).map(([value, label]) => (
							<SelectItem key={value} value={value}>
								{label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{!resourceType && (
					<Select value={typeFilter} onValueChange={setTypeFilter}>
						<SelectTrigger className="w-40">
							<SelectValue placeholder="Type" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Types</SelectItem>
							{Object.entries(resourceLabels).map(([value, label]) => (
								<SelectItem key={value} value={value}>
									{label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}

				<Button variant="outline" size="icon" onClick={() => refetch()} className="ml-auto">
					<RefreshCw className="h-4 w-4" />
				</Button>
			</div>

			{/* Log entries */}
			{entries.length === 0 ? (
				<div className="text-center py-12 text-muted-foreground">
					<Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
					<p>No audit entries found</p>
				</div>
			) : (
				<div className="space-y-2">
					{entries.map((entry) => (
						<AuditEntryRow key={entry.id} entry={entry} />
					))}
				</div>
			)}

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex items-center justify-between pt-4">
					<span className="text-sm text-muted-foreground">{total} entries</span>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={page === 1}
							onClick={() => setPage((p) => Math.max(1, p - 1))}
						>
							Previous
						</Button>
						<span className="text-sm">
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
				</div>
			)}
		</div>
	);
}

function AuditEntryRow({ entry }: { entry: AuditEntry }) {
	const ActionIcon = actionIcons[entry.action] || Activity;
	const ResourceIcon = resourceIcons[entry.resource_type];
	const actionColor = actionColors[entry.action] || 'text-muted-foreground';
	const createdAt = new Date(entry.created_at);

	return (
		<div className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:bg-accent/30 transition-colors">
			<div className={cn('mt-0.5', actionColor)}>
				<ActionIcon className="h-5 w-5" />
			</div>

			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="font-medium">{entry.user_name}</span>
					<span className={cn('text-sm', actionColor)}>{actionLabels[entry.action]}</span>
					<Badge variant="outline" className="gap-1">
						<ResourceIcon className="h-3 w-3" />
						{resourceLabels[entry.resource_type]}
					</Badge>
					{entry.resource_name && (
						<span className="text-sm text-muted-foreground truncate">"{entry.resource_name}"</span>
					)}
				</div>

				<div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
					<span>{format(createdAt, 'MMM d, yyyy HH:mm')}</span>
					<span>•</span>
					<span>{formatDistanceToNow(createdAt, { addSuffix: true })}</span>
					{entry.ip_address && (
						<>
							<span>•</span>
							<span>{entry.ip_address}</span>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
