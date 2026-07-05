// (c) Copyright Datacraft, 2026
import { useMemo,useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
	CheckCircle2,
	Download,
	Eye,
	Cpu,
	FileText,
	FolderOpen,
	Loader2,
	MessageSquare,
	PenTool,
	Send,
	Share2,
	Shield,
	Tag,
	Upload,
	XCircle,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { useDocumentActivity } from './api';
import type { ActivityEvent } from './api';

// ─── Icon mapping ────────────────────────────────────────────────────────────

type ActivityFilter = 'all' | 'edits' | 'views' | 'approvals' | 'shares';

const FILTERS: Array<{ value: ActivityFilter; label: string }> = [
	{ value: 'all', label: 'All' },
	{ value: 'edits', label: 'Edits' },
	{ value: 'views', label: 'Views' },
	{ value: 'approvals', label: 'Approvals' },
	{ value: 'shares', label: 'Shares' },
];

function normalizedType(eventType: string): string {
	return eventType.toLowerCase().replace(/[_\s-]+/g, ' ');
}

function EventIcon({ eventType }: { eventType: string }) {
	const base = 'w-4 h-4';
	const type = normalizedType(eventType);
	if (type.includes('view'))       return <Eye className={base} />;
	if (type.includes('download'))   return <Download className={base} />;
	if (type.includes('share'))      return <Share2 className={base} />;
	if (type.includes('upload') || type.includes('version')) return <Upload className={base} />;
	if (type.includes('reject'))     return <XCircle className={base} />;
	if (type.includes('approved') || type.includes('approve')) return <CheckCircle2 className={base} />;
	if (type.includes('ocr'))        return <Cpu className={base} />;
	if (type.includes('tag'))        return <Tag className={base} />;
	if (type.includes('classif'))    return <Tag className={base} />;
	if (type.includes('moved') || type.includes('move')) return <FolderOpen className={base} />;
	if (type.includes('signed'))     return <PenTool className={base} />;
	if (type.includes('held'))       return <Shield className={base} />;
	if (type.includes('annotated') || type.includes('comment')) return <MessageSquare className={base} />;
	if (type.includes('edit'))       return <PenTool className={base} />;
	if (type.includes('created'))    return <FileText className={base} />;
	if (type.includes('sent'))       return <Send className={base} />;
	return <FileText className={base} />;
}

function iconBg(eventType: string): string {
	const type = normalizedType(eventType);
	if (type.includes('view'))       return 'bg-sky-500/10 text-sky-400';
	if (type.includes('download'))   return 'bg-cyan-500/10 text-cyan-400';
	if (type.includes('share'))      return 'bg-indigo-500/10 text-indigo-400';
	if (type.includes('upload') || type.includes('version')) return 'bg-brass-500/10 text-brass-400';
	if (type.includes('reject'))     return 'bg-red-500/10 text-red-400';
	if (type.includes('approved') || type.includes('approve')) return 'bg-teal-500/10 text-teal-400';
	if (type.includes('ocr'))        return 'bg-blue-500/10 text-blue-400';
	if (type.includes('tag'))        return 'bg-fuchsia-500/10 text-fuchsia-400';
	if (type.includes('classif'))    return 'bg-purple-500/10 text-purple-400';
	if (type.includes('moved') || type.includes('move')) return 'bg-amber-500/10 text-amber-400';
	if (type.includes('signed'))     return 'bg-emerald-500/10 text-emerald-400';
	if (type.includes('held'))       return 'bg-red-500/10 text-red-400';
	if (type.includes('annotated') || type.includes('comment')) return 'bg-sky-500/10 text-sky-400';
	return 'bg-brass-500/10 text-brass-400';
}

function eventCategory(eventType: string): ActivityFilter {
	const type = normalizedType(eventType);
	if (type.includes('view')) return 'views';
	if (type.includes('approve') || type.includes('reject')) return 'approvals';
	if (type.includes('share')) return 'shares';
	if (
		type.includes('edit') ||
		type.includes('created') ||
		type.includes('upload') ||
		type.includes('version') ||
		type.includes('tag') ||
		type.includes('move') ||
		type.includes('classif') ||
		type.includes('signed') ||
		type.includes('annotated')
	) {
		return 'edits';
	}
	return 'all';
}

function actorAvatarUrl(event: ActivityEvent): string | undefined {
	const data = event.data ?? {};
	const value = data.actorAvatarUrl ?? data.actor_avatar_url ?? data.avatarUrl ?? data.avatar_url;
	return typeof value === 'string' ? value : undefined;
}

function initials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return '?';
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function escapeCsv(value: unknown): string {
	const text = value == null ? '' : String(value);
	return `"${text.replace(/"/g, '""')}"`;
}

function exportCsv(events: ActivityEvent[]) {
	const rows = [
		['Timestamp', 'Action', 'Actor', 'Description'],
		...events.map((event) => [
			event.timestamp ? new Date(event.timestamp).toISOString() : '',
			event.event_type,
			event.actor_name ?? 'System',
			event.description,
		]),
	];
	const blob = new Blob(
		[rows.map((row) => row.map(escapeCsv).join(',')).join('\n')],
		{ type: 'text/csv;charset=utf-8' },
	);
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `document-history-${Date.now()}.csv`;
	a.click();
	URL.revokeObjectURL(url);
}

// ─── Single event row ────────────────────────────────────────────────────────

function EventRow({ event }: { event: ActivityEvent }) {
	const actor = event.actor_name ?? 'System';
	const avatarUrl = actorAvatarUrl(event);

	return (
		<div className="flex items-start gap-3 py-3 px-4 hover:bg-slate-800/30 transition-colors">
			<div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${iconBg(event.event_type)}`}>
				<EventIcon eventType={event.event_type} />
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-sm text-slate-200 leading-snug">{event.description}</p>
				<div className="mt-2 flex items-center gap-2">
					<Avatar className="h-6 w-6">
						{avatarUrl && <AvatarImage src={avatarUrl} alt={actor} />}
						<AvatarFallback className="bg-slate-800 text-[10px] font-semibold text-slate-300">
							{initials(actor)}
						</AvatarFallback>
					</Avatar>
					<p className="truncate text-xs text-slate-500">{actor}</p>
				</div>
			</div>
			{event.timestamp && (
				<time
					className="shrink-0 text-xs text-slate-500 mt-0.5 cursor-default"
					dateTime={event.timestamp}
					title={new Date(event.timestamp).toLocaleString()}
				>
					{formatRelativeTime(event.timestamp)}
				</time>
			)}
		</div>
	);
}

// ─── Public component ────────────────────────────────────────────────────────

interface ActivityPanelProps {
	documentId: string;
}

const PAGE_SIZE = 50;

export function ActivityPanel({ documentId }: ActivityPanelProps) {
	const [limit, setLimit] = useState(PAGE_SIZE);
	const [filter, setFilter] = useState<ActivityFilter>('all');
	const { data: events, isLoading, isError, refetch } = useDocumentActivity(documentId, limit);
	const filteredEvents = useMemo(() => {
		if (!events) return [];
		if (filter === 'all') return events;
		return events.filter((event) => eventCategory(event.event_type) === filter);
	}, [events, filter]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-10">
				<Loader2 className="w-5 h-5 animate-spin text-slate-500" />
			</div>
		);
	}

	if (isError) {
		return (
			<div className="p-6 text-center space-y-2">
				<p className="text-sm text-red-400">Failed to load activity.</p>
				<button
					onClick={() => void refetch()}
					className="text-xs text-slate-400 hover:text-slate-200 underline transition-colors"
				>
					Retry
				</button>
			</div>
		);
	}

	if (!events || events.length === 0) {
		return (
			<div className="p-8 text-center text-sm text-slate-500">
				No activity yet
			</div>
		);
	}

	const hasMore = events.length >= limit;

	return (
		<div>
			<div className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900/95 px-4 py-3">
				<div className="flex items-center justify-between gap-3">
					<div>
						<h3 className="text-sm font-semibold text-slate-100">Audit Trail</h3>
						<p className="mt-0.5 text-xs text-slate-500">
							{filteredEvents.length} of {events.length} entries
						</p>
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => exportCsv(filteredEvents)}
						disabled={filteredEvents.length === 0}
						className="h-8 border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800"
					>
						<Download className="h-3.5 w-3.5" />
						CSV
					</Button>
				</div>
				<div className="mt-3 flex flex-wrap gap-1.5">
					{FILTERS.map((item) => (
						<button
							key={item.value}
							type="button"
							onClick={() => setFilter(item.value)}
							className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
								filter === item.value
									? 'border-brass-500/50 bg-brass-500/15 text-brass-200'
									: 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
							}`}
						>
							{item.label}
						</button>
					))}
				</div>
			</div>
			<div className="divide-y divide-slate-800/50">
				{filteredEvents.map((event, idx) => (
					<EventRow key={`${event.event_type}-${event.timestamp}-${idx}`} event={event} />
				))}
				{filteredEvents.length === 0 && (
					<div className="p-8 text-center text-sm text-slate-500">
						No entries match this filter.
					</div>
				)}
			</div>
			{hasMore && (
				<div className="p-3 text-center border-t border-slate-800/50">
					<button
						onClick={() => setLimit(l => l + PAGE_SIZE)}
						className="text-sm text-brass-400 hover:text-brass-300 transition-colors"
					>
						Load more
					</button>
				</div>
			)}
		</div>
	);
}
