// (c) Copyright Datacraft, 2026
/**
 * EntityPanel — named entity display panel for a document.
 *
 * Props:
 *   documentId  — UUID of the document whose entities are displayed
 *
 * Fetches GET /documents/{documentId}/entities and renders entities grouped
 * by type with color-coded badges, confidence bars, and copy-to-clipboard.
 * Re-extraction can be triggered via POST /documents/{documentId}/re-extract-entities.
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Check, Copy, RefreshCw, Tags } from 'lucide-react';
import { useState } from 'react';
import { useDocumentEntities, useReExtractEntities } from '../api/entities';
import type { EntityItem } from '../api/entities';

// ---------------------------------------------------------------------------
// Entity type config
// ---------------------------------------------------------------------------

type EntityTypeKey = 'PERSON' | 'ORG' | 'DATE' | 'MONEY' | 'LOCATION' | 'OTHER';

interface TypeConfig {
	label: string;
	badgeClass: string;
	barClass: string;
}

const TYPE_CONFIG: Record<EntityTypeKey, TypeConfig> = {
	PERSON: {
		label: 'Person',
		badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
		barClass: 'bg-blue-500',
	},
	ORG: {
		label: 'Organization',
		badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
		barClass: 'bg-purple-500',
	},
	DATE: {
		label: 'Date',
		badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
		barClass: 'bg-amber-500',
	},
	MONEY: {
		label: 'Amount',
		badgeClass: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
		barClass: 'bg-green-500',
	},
	LOCATION: {
		label: 'Location',
		badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
		barClass: 'bg-teal-500',
	},
	OTHER: {
		label: 'Other',
		badgeClass: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
		barClass: 'bg-gray-400',
	},
};

// Display order for grouped sections
const TYPE_ORDER: EntityTypeKey[] = ['PERSON', 'ORG', 'DATE', 'MONEY', 'LOCATION', 'OTHER'];

function typeConfig(entityType: string): TypeConfig {
	return TYPE_CONFIG[(entityType as EntityTypeKey)] ?? TYPE_CONFIG.OTHER;
}

// ---------------------------------------------------------------------------
// CopyButton — inline copy-to-clipboard with transient check icon
// ---------------------------------------------------------------------------

function CopyButton({ value }: { value: string }) {
	const [copied, setCopied] = useState(false);
	const { toast } = useToast();

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
			toast({ title: 'Copied to clipboard', duration: 1500 });
			setTimeout(() => setCopied(false), 1500);
		} catch {
			toast({ title: 'Copy failed', variant: 'destructive' });
		}
	};

	return (
		<button
			onClick={handleCopy}
			className="ml-auto p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
			aria-label="Copy to clipboard"
			title="Copy"
		>
			{copied ? (
				<Check className="h-3.5 w-3.5 text-green-500" />
			) : (
				<Copy className="h-3.5 w-3.5" />
			)}
		</button>
	);
}

// ---------------------------------------------------------------------------
// EntityRow
// ---------------------------------------------------------------------------

function EntityRow({ entity }: { entity: EntityItem }) {
	const cfg = typeConfig(entity.entity_type);
	const pct = entity.confidence != null ? Math.round(entity.confidence * 100) : null;

	return (
		<div className="flex flex-col gap-1 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors">
			<div className="flex items-center gap-2 min-w-0">
				<Badge className={`shrink-0 text-xs px-1.5 py-0 font-medium border-0 ${cfg.badgeClass}`}>
					{cfg.label}
				</Badge>
				<span className="text-sm font-medium truncate flex-1" title={entity.value}>
					{entity.value}
				</span>
				<CopyButton value={entity.value} />
			</div>

			{pct !== null && (
				<div className="flex items-center gap-2">
					<div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
						<div
							className={`h-full rounded-full ${cfg.barClass}`}
							style={{ width: `${pct}%` }}
						/>
					</div>
					<span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
						{pct}%
					</span>
				</div>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// EntityGroup
// ---------------------------------------------------------------------------

function EntityGroup({ entityType, entities }: { entityType: string; entities: EntityItem[] }) {
	const cfg = typeConfig(entityType);
	return (
		<div className="space-y-0.5">
			<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-3 pt-2 pb-0.5">
				{cfg.label}
			</p>
			{entities.map((e, i) => (
				<EntityRow key={`${e.entity_type}-${e.value}-${i}`} entity={e} />
			))}
		</div>
	);
}

// ---------------------------------------------------------------------------
// EntityPanel
// ---------------------------------------------------------------------------

interface EntityPanelProps {
	documentId: string;
}

export function EntityPanel({ documentId }: EntityPanelProps) {
	const { toast } = useToast();
	const { data, isLoading, isError, refetch } = useDocumentEntities(documentId);
	const reExtract = useReExtractEntities(documentId);

	const handleReExtract = async () => {
		try {
			await reExtract.mutateAsync();
			toast({
				title: 'Re-extraction queued',
				description: 'Entities will update when the task completes (~2 min).',
				duration: 4000,
			});
		} catch {
			toast({ title: 'Failed to queue re-extraction', variant: 'destructive' });
		}
	};

	const entities = data?.entities ?? [];
	const entityCount = entities.length;

	// Group by type preserving display order
	const grouped = new Map<string, EntityItem[]>();
	for (const type of TYPE_ORDER) {
		const bucket = entities.filter((e) => e.entity_type === type);
		if (bucket.length > 0) grouped.set(type, bucket);
	}
	// Catch any non-standard types not in TYPE_ORDER
	for (const entity of entities) {
		if (!TYPE_ORDER.includes(entity.entity_type as EntityTypeKey)) {
			const bucket = grouped.get('OTHER') ?? [];
			bucket.push(entity);
			grouped.set('OTHER', bucket);
		}
	}

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
				<div className="flex items-center gap-2">
					<Tags className="h-4 w-4 text-muted-foreground" />
					<span className="text-sm font-semibold">Extracted Entities</span>
					{entityCount > 0 && (
						<span className="text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 tabular-nums">
							{entityCount}
						</span>
					)}
				</div>
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7"
						onClick={() => refetch()}
						title="Refresh"
						disabled={isLoading}
					>
						<RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="h-7 text-xs"
						onClick={handleReExtract}
						disabled={reExtract.isPending}
						title="Re-extract entities from current OCR text"
					>
						{reExtract.isPending ? (
							<RefreshCw className="h-3 w-3 mr-1 animate-spin" />
						) : null}
						Re-extract
					</Button>
				</div>
			</div>

			{/* Body */}
			<div className="flex-1 overflow-y-auto">
				{isLoading && (
					<div className="space-y-2 p-4">
						{[1, 2, 3, 4].map((i) => (
							<div key={i} className="flex items-center gap-2">
								<Skeleton className="h-5 w-16 rounded-full" />
								<Skeleton className="h-4 flex-1" />
							</div>
						))}
					</div>
				)}

				{isError && (
					<p className="text-sm text-destructive p-4">
						Failed to load entities.
					</p>
				)}

				{!isLoading && !isError && entityCount === 0 && (
					<div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
						<Tags className="h-8 w-8 text-muted-foreground/40" />
						<p className="text-sm text-muted-foreground">
							No entities extracted yet.
						</p>
						<p className="text-xs text-muted-foreground/70">
							Entities are extracted after OCR completes. Use Re-extract to trigger manually.
						</p>
					</div>
				)}

				{!isLoading && !isError && entityCount > 0 && (
					<div className="divide-y divide-border/50 pb-2">
						{[...grouped.entries()].map(([type, items]) => (
							<EntityGroup key={type} entityType={type} entities={items} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
