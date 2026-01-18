// (c) Copyright Datacraft, 2026
/**
 * Document provenance timeline showing chain of custody.
 */
import { motion } from 'framer-motion';
import {
	FileText,
	Upload,
	Scan,
	Mail,
	Eye,
	Edit,
	Download,
	Share2,
	Trash2,
	CheckCircle,
	AlertCircle,
	Clock,
	GitBranch,
	ArrowRight,
	Shield,
	FileSearch,
	Layers,
	RotateCw,
	Scissors,
	Copy,
	Archive,
} from 'lucide-react';
import type { ChainOfCustodyEntry, EventType } from '../types';

const eventConfig: Record<
	EventType,
	{ icon: React.ElementType; color: string; bg: string }
> = {
	created: { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100' },
	scanned: { icon: Scan, color: 'text-emerald-600', bg: 'bg-emerald-100' },
	imported: { icon: Download, color: 'text-purple-600', bg: 'bg-purple-100' },
	uploaded: { icon: Upload, color: 'text-blue-600', bg: 'bg-blue-100' },
	email_received: { icon: Mail, color: 'text-orange-600', bg: 'bg-orange-100' },
	ocr_started: { icon: FileSearch, color: 'text-amber-600', bg: 'bg-amber-100' },
	ocr_completed: { icon: FileSearch, color: 'text-emerald-600', bg: 'bg-emerald-100' },
	ocr_failed: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
	classified: { icon: Layers, color: 'text-indigo-600', bg: 'bg-indigo-100' },
	metadata_extracted: { icon: FileSearch, color: 'text-teal-600', bg: 'bg-teal-100' },
	quality_assessed: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
	edited: { icon: Edit, color: 'text-amber-600', bg: 'bg-amber-100' },
	annotated: { icon: Edit, color: 'text-purple-600', bg: 'bg-purple-100' },
	redacted: { icon: Edit, color: 'text-red-600', bg: 'bg-red-100' },
	merged: { icon: GitBranch, color: 'text-blue-600', bg: 'bg-blue-100' },
	split: { icon: Scissors, color: 'text-orange-600', bg: 'bg-orange-100' },
	rotated: { icon: RotateCw, color: 'text-gray-600', bg: 'bg-gray-100' },
	cropped: { icon: Scissors, color: 'text-gray-600', bg: 'bg-gray-100' },
	page_added: { icon: Layers, color: 'text-emerald-600', bg: 'bg-emerald-100' },
	page_removed: { icon: Layers, color: 'text-red-600', bg: 'bg-red-100' },
	page_reordered: { icon: Layers, color: 'text-amber-600', bg: 'bg-amber-100' },
	version_created: { icon: GitBranch, color: 'text-blue-600', bg: 'bg-blue-100' },
	version_restored: { icon: RotateCw, color: 'text-purple-600', bg: 'bg-purple-100' },
	moved: { icon: ArrowRight, color: 'text-blue-600', bg: 'bg-blue-100' },
	copied: { icon: Copy, color: 'text-gray-600', bg: 'bg-gray-100' },
	archived: { icon: Archive, color: 'text-amber-600', bg: 'bg-amber-100' },
	restored: { icon: RotateCw, color: 'text-emerald-600', bg: 'bg-emerald-100' },
	deleted: { icon: Trash2, color: 'text-red-600', bg: 'bg-red-100' },
	permanently_deleted: { icon: Trash2, color: 'text-red-700', bg: 'bg-red-200' },
	viewed: { icon: Eye, color: 'text-gray-600', bg: 'bg-gray-100' },
	downloaded: { icon: Download, color: 'text-blue-600', bg: 'bg-blue-100' },
	printed: { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100' },
	shared: { icon: Share2, color: 'text-purple-600', bg: 'bg-purple-100' },
	shared_revoked: { icon: Share2, color: 'text-red-600', bg: 'bg-red-100' },
	verified: { icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-100' },
	signature_added: { icon: Shield, color: 'text-blue-600', bg: 'bg-blue-100' },
	signature_verified: { icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-100' },
	checksum_verified: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
	workflow_started: { icon: GitBranch, color: 'text-blue-600', bg: 'bg-blue-100' },
	workflow_step_completed: { icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-100' },
	workflow_completed: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
	approval_requested: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
	approved: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
	rejected: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
	exported: { icon: Download, color: 'text-purple-600', bg: 'bg-purple-100' },
	synced: { icon: RotateCw, color: 'text-blue-600', bg: 'bg-blue-100' },
};

function TimelineEntry({
	entry,
	isLast,
	index,
}: {
	entry: ChainOfCustodyEntry;
	isLast: boolean;
	index: number;
}) {
	const config = eventConfig[entry.eventType] || {
		icon: FileText,
		color: 'text-gray-600',
		bg: 'bg-gray-100',
	};
	const Icon = config.icon;

	return (
		<motion.div
			initial={{ opacity: 0, x: -20 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ delay: index * 0.05 }}
			className="relative flex gap-4"
		>
			{/* Timeline line */}
			{!isLast && (
				<div className="absolute left-5 top-12 bottom-0 w-px bg-gray-200" />
			)}

			{/* Icon */}
			<div
				className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full ${config.bg} flex items-center justify-center`}
			>
				<Icon className={`w-5 h-5 ${config.color}`} />
				{entry.verified && (
					<div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
						<CheckCircle className="w-3 h-3 text-white" />
					</div>
				)}
			</div>

			{/* Content */}
			<div className="flex-1 pb-8">
				<div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
					<div className="flex items-start justify-between">
						<div>
							<p className="font-medium text-gray-900">{entry.description}</p>
							{entry.actorName && (
								<p className="text-sm text-gray-500 mt-1">
									by {entry.actorName}
								</p>
							)}
							{entry.location && (
								<p className="text-sm text-gray-400 mt-1">{entry.location}</p>
							)}
						</div>
						<div className="text-right">
							<p className="text-sm text-gray-500">
								{new Date(entry.timestamp).toLocaleDateString()}
							</p>
							<p className="text-xs text-gray-400">
								{new Date(entry.timestamp).toLocaleTimeString()}
							</p>
						</div>
					</div>
				</div>
			</div>
		</motion.div>
	);
}

interface ProvenanceTimelineProps {
	entries: ChainOfCustodyEntry[];
	documentId?: string;
	originalSource?: string | null;
	ingestionTimestamp?: string | null;
	isComplete?: boolean;
}

export function ProvenanceTimeline({
	entries,
	documentId,
	originalSource,
	ingestionTimestamp,
	isComplete = true,
}: ProvenanceTimelineProps) {
	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold text-gray-900">
						Chain of Custody
					</h2>
					{documentId && (
						<p className="text-sm text-gray-500 mt-0.5">
							Document ID: {documentId.slice(0, 8)}...
						</p>
					)}
				</div>
				{isComplete ? (
					<span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-full">
						<CheckCircle className="w-4 h-4" />
						Complete
					</span>
				) : (
					<span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">
						<AlertCircle className="w-4 h-4" />
						Incomplete
					</span>
				)}
			</div>

			{/* Origin info */}
			{(originalSource || ingestionTimestamp) && (
				<div className="bg-gray-50 rounded-lg p-4">
					<h3 className="text-sm font-medium text-gray-700 mb-2">
						Document Origin
					</h3>
					<div className="grid grid-cols-2 gap-4 text-sm">
						{originalSource && (
							<div>
								<span className="text-gray-500">Source:</span>{' '}
								<span className="text-gray-900 font-medium">
									{originalSource}
								</span>
							</div>
						)}
						{ingestionTimestamp && (
							<div>
								<span className="text-gray-500">Ingested:</span>{' '}
								<span className="text-gray-900">
									{new Date(ingestionTimestamp).toLocaleString()}
								</span>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Timeline */}
			<div className="space-y-0">
				{entries.length > 0 ? (
					entries.map((entry, index) => (
						<TimelineEntry
							key={`${entry.timestamp}-${index}`}
							entry={entry}
							isLast={index === entries.length - 1}
							index={index}
						/>
					))
				) : (
					<div className="text-center py-8 text-gray-500">
						<Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
						<p>No events recorded</p>
					</div>
				)}
			</div>
		</div>
	);
}
