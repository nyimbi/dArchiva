// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import {
	CheckSquare,
	Cpu,
	FileText,
	FolderOpen,
	Loader2,
	MessageSquare,
	PenTool,
	Shield,
	Tag,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { useDocumentActivity } from './api';
import type { ActivityEvent } from './api';

// ─── Icon mapping ────────────────────────────────────────────────────────────

function EventIcon({ eventType }: { eventType: string }) {
	const base = 'w-4 h-4';
	if (eventType.includes('ocr'))        return <Cpu        className={base} />;
	if (eventType.includes('classif'))    return <Tag        className={base} />;
	if (eventType.includes('moved'))      return <FolderOpen className={base} />;
	if (eventType.includes('signed'))     return <PenTool    className={base} />;
	if (eventType.includes('approved'))   return <CheckSquare className={base} />;
	if (eventType.includes('held'))       return <Shield     className={base} />;
	if (eventType.includes('annotated'))  return <MessageSquare className={base} />;
	return <FileText className={base} />;
}

function iconBg(eventType: string): string {
	if (eventType.includes('ocr'))        return 'bg-blue-500/10 text-blue-400';
	if (eventType.includes('classif'))    return 'bg-purple-500/10 text-purple-400';
	if (eventType.includes('moved'))      return 'bg-amber-500/10 text-amber-400';
	if (eventType.includes('signed'))     return 'bg-emerald-500/10 text-emerald-400';
	if (eventType.includes('approved'))   return 'bg-teal-500/10 text-teal-400';
	if (eventType.includes('held'))       return 'bg-red-500/10 text-red-400';
	if (eventType.includes('annotated'))  return 'bg-sky-500/10 text-sky-400';
	return 'bg-brass-500/10 text-brass-400';
}

// ─── Single event row ────────────────────────────────────────────────────────

function EventRow({ event }: { event: ActivityEvent }) {
	return (
		<div className="flex items-start gap-3 py-3 px-4 hover:bg-slate-800/30 transition-colors">
			<div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${iconBg(event.event_type)}`}>
				<EventIcon eventType={event.event_type} />
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-sm text-slate-200 leading-snug">{event.description}</p>
				<p className="mt-0.5 text-xs text-slate-500">
					{event.actor_name ?? 'System'}
				</p>
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
	const { data: events, isLoading, isError } = useDocumentActivity(documentId, limit);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-10">
				<Loader2 className="w-5 h-5 animate-spin text-slate-500" />
			</div>
		);
	}

	if (isError) {
		return (
			<div className="p-6 text-center text-sm text-red-400">
				Failed to load activity.
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
			<div className="divide-y divide-slate-800/50">
				{events.map((event, idx) => (
					<EventRow key={`${event.event_type}-${event.timestamp}-${idx}`} event={event} />
				))}
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
