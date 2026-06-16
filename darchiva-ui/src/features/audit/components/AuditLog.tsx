// (c) Copyright Datacraft, 2026
/**
 * Audit log viewer component with export controls.
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Activity,
  Download,
  Edit,
  Eye,
  FileText,
  Filter,
  Folder,
  Printer,
  RefreshCw,
  Share2,
  Shield,
  Tag,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import { useState } from 'react';
import { useAuditLogs, useExportAuditLog } from '../api';
import type { AuditAction, AuditEntry, AuditResourceType } from '../types';

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
	const [dateFrom, setDateFrom] = useState<string>('');
	const [dateTo, setDateTo] = useState<string>('');
	const [userFilter, setUserFilter] = useState<string>(userId || '');
	const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

	const { exportLogs } = useExportAuditLog();

	const { data, isLoading, refetch } = useAuditLogs({
		page,
		pageSize: 50,
		action: actionFilter !== 'all' ? (actionFilter as AuditAction) : undefined,
		resource_type: typeFilter !== 'all' ? (typeFilter as AuditResourceType) : resourceType,
		resource_id: resourceId,
		user_id: userFilter || userId,
		date_from: dateFrom || undefined,
		date_to: dateTo || undefined,
	});

	const entries = data?.items ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.ceil(total / 50);

	// Build export params from current filters
	function buildExportParams(fmt: 'csv' | 'pdf') {
		return {
			format: fmt,
			filter_operation: actionFilter !== 'all' ? actionFilter.toUpperCase() : undefined,
			filter_table_name: typeFilter !== 'all' ? typeFilter : undefined,
			filter_user_id: userFilter || userId || undefined,
			filter_timestamp_from: dateFrom || undefined,
			filter_timestamp_to: dateTo || undefined,
		};
	}

	async function handleExport(fmt: 'csv' | 'pdf') {
		setExporting(fmt);
		try {
			await exportLogs(buildExportParams(fmt));
		} finally {
			setExporting(null);
		}
	}

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
			{/* Filters row 1: action, type, refresh, export */}
			<div className="flex flex-wrap items-center gap-2">
				<Filter className="h-4 w-4 text-muted-foreground shrink-0" />

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

				<Button variant="outline" size="icon" onClick={() => refetch()} title="Refresh">
					<RefreshCw className="h-4 w-4" />
				</Button>

				{/* Export buttons pushed to the right */}
				<div className="ml-auto flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={exporting === 'csv'}
						onClick={() => handleExport('csv')}
						className="gap-1.5"
					>
						<Download className="h-4 w-4" />
						{exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
					</Button>
					<Button
						variant="outline"
						size="sm"
						disabled={exporting === 'pdf'}
						onClick={() => handleExport('pdf')}
						className="gap-1.5"
					>
						<Printer className="h-4 w-4" />
						{exporting === 'pdf' ? 'Opening…' : 'Export PDF'}
					</Button>
				</div>
			</div>

			{/* Filters row 2: date range + user */}
			<div className="flex flex-wrap items-center gap-2 text-sm">
				<span className="text-muted-foreground text-xs shrink-0">Date range:</span>
				<Input
					type="date"
					className="w-36 h-8 text-xs"
					value={dateFrom}
					onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
					title="From date"
				/>
				<span className="text-muted-foreground text-xs">to</span>
				<Input
					type="date"
					className="w-36 h-8 text-xs"
					value={dateTo}
					onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
					title="To date"
				/>

				{!userId && (
					<>
						<span className="text-muted-foreground text-xs ml-2 shrink-0">User:</span>
						<Input
							type="text"
							className="w-40 h-8 text-xs"
							placeholder="username or ID"
							value={userFilter}
							onChange={(e) => { setUserFilter(e.target.value); setPage(1); }}
						/>
					</>
				)}

				{(dateFrom || dateTo || userFilter) && (
					<Button
						variant="ghost"
						size="sm"
						className="h-8 text-xs text-muted-foreground"
						onClick={() => { setDateFrom(''); setDateTo(''); setUserFilter(''); setPage(1); }}
					>
						Clear filters
					</Button>
				)}
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
