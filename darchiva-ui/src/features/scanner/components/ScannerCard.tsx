// Scanner Card Component
import { cn } from '@/lib/utils';
import { StatusLED } from './core/StatusLED';
import { SchematicCard } from './core/TechPanel';
import type { Scanner, ScannerStatus } from '../types';
import { PROTOCOL_LABELS } from '../types';
import {
	PrinterIcon,
	WifiIcon,
	ComputerDesktopIcon,
	ClockIcon,
	DocumentDuplicateIcon,
	StarIcon,
} from '@heroicons/react/24/outline';

interface ScannerCardProps {
	scanner: Scanner;
	onClick?: () => void;
	selected?: boolean;
	compact?: boolean;
}

function getProtocolIcon(protocol: string) {
	switch (protocol) {
		case 'escl':
			return <WifiIcon className="w-4 h-4" />;
		case 'sane':
		case 'twain':
		case 'wia':
			return <ComputerDesktopIcon className="w-4 h-4" />;
		default:
			return <PrinterIcon className="w-4 h-4" />;
	}
}

function formatLastSeen(date: string | null): string {
	if (!date) return 'Never';
	const d = new Date(date);
	const now = new Date();
	const diffMs = now.getTime() - d.getTime();
	const diffMins = Math.floor(diffMs / 60000);

	if (diffMins < 1) return 'Just now';
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
	return d.toLocaleDateString();
}

export function ScannerCard({ scanner, onClick, selected, compact }: ScannerCardProps) {
	const hasAdf = scanner.capabilities?.adf_present;
	const hasDuplex = scanner.capabilities?.adf_duplex;
	const maxRes = scanner.capabilities?.resolutions?.slice(-1)[0];

	if (compact) {
		return (
			<div
				className={cn(
					'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all',
					'bg-[var(--scan-bg-panel)] border border-[var(--scan-border)]',
					'hover:border-[var(--scan-border-active)]',
					selected && 'border-[var(--scan-accent)] bg-[var(--scan-accent-glow)]'
				)}
				onClick={onClick}
			>
				<StatusLED status={scanner.status} size="md" />
				<div className="flex-1 min-w-0">
					<div className="font-medium text-[var(--scan-text-primary)] truncate">
						{scanner.name}
					</div>
					<div className="text-[10px] text-[var(--scan-text-muted)] font-mono">
						{PROTOCOL_LABELS[scanner.protocol]}
					</div>
				</div>
				{scanner.is_default && (
					<StarIcon className="w-4 h-4 text-amber-400 fill-amber-400" />
				)}
			</div>
		);
	}

	return (
		<SchematicCard
			onClick={onClick}
			className={cn(
				selected && 'border-[var(--scan-accent)]'
			)}
		>
			{/* Header */}
			<div className="flex items-start justify-between mb-3">
				<div className="flex items-center gap-3">
					<div className="p-2 rounded bg-[var(--scan-bg-tertiary)]">
						{getProtocolIcon(scanner.protocol)}
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h3 className="font-semibold text-[var(--scan-text-primary)]">
								{scanner.name}
							</h3>
							{scanner.is_default && (
								<StarIcon className="w-4 h-4 text-amber-400 fill-amber-400" />
							)}
						</div>
						<div className="text-xs text-[var(--scan-text-muted)]">
							{scanner.manufacturer} {scanner.model}
						</div>
					</div>
				</div>
				<StatusLED status={scanner.status} showLabel size="md" />
			</div>

			{/* Protocol & Connection */}
			<div className="flex items-center gap-4 mb-4 text-xs text-[var(--scan-text-secondary)]">
				<span className="font-mono uppercase tracking-wider">
					{PROTOCOL_LABELS[scanner.protocol]}
				</span>
				<span className="text-[var(--scan-text-muted)]">|</span>
				<span className="truncate">{scanner.connection_uri}</span>
			</div>

			{/* Capabilities */}
			<div className="flex flex-wrap gap-2 mb-4">
				{maxRes && (
					<span className="px-2 py-0.5 text-[10px] font-mono rounded bg-[var(--scan-bg-tertiary)] text-[var(--scan-text-secondary)]">
						{maxRes} DPI
					</span>
				)}
				{hasAdf && (
					<span className="px-2 py-0.5 text-[10px] font-mono rounded bg-[var(--scan-bg-tertiary)] text-[var(--scan-text-secondary)]">
						ADF
					</span>
				)}
				{hasDuplex && (
					<span className="px-2 py-0.5 text-[10px] font-mono rounded bg-[var(--scan-bg-tertiary)] text-[var(--scan-text-secondary)]">
						DUPLEX
					</span>
				)}
				{scanner.capabilities?.color_modes?.includes('color') && (
					<span className="px-2 py-0.5 text-[10px] font-mono rounded bg-[var(--scan-bg-tertiary)] text-[var(--scan-text-secondary)]">
						COLOR
					</span>
				)}
			</div>

			{/* Stats */}
			<div className="flex items-center justify-between pt-3 border-t border-[var(--scan-border)]">
				<div className="flex items-center gap-1 text-xs text-[var(--scan-text-muted)]">
					<DocumentDuplicateIcon className="w-4 h-4" />
					<span className="font-mono">{scanner.total_pages_scanned.toLocaleString()}</span>
					<span>pages</span>
				</div>
				<div className="flex items-center gap-1 text-xs text-[var(--scan-text-muted)]">
					<ClockIcon className="w-4 h-4" />
					<span>{formatLastSeen(scanner.last_seen_at)}</span>
				</div>
			</div>
		</SchematicCard>
	);
}

// Mini card for quick selection
interface ScannerMiniCardProps {
	scanner: Scanner;
	onClick?: () => void;
	selected?: boolean;
}

export function ScannerMiniCard({ scanner, onClick, selected }: ScannerMiniCardProps) {
	return (
		<button
			className={cn(
				'flex items-center gap-2 p-2 rounded text-left w-full transition-all',
				'bg-[var(--scan-bg-tertiary)] border border-[var(--scan-border)]',
				'hover:border-[var(--scan-border-active)]',
				selected && 'border-[var(--scan-accent)] bg-[var(--scan-accent-glow)]'
			)}
			onClick={onClick}
		>
			<StatusLED status={scanner.status} size="sm" />
			<span className="flex-1 text-sm text-[var(--scan-text-primary)] truncate">
				{scanner.name}
			</span>
			{scanner.is_default && (
				<StarIcon className="w-3 h-3 text-amber-400 fill-amber-400" />
			)}
		</button>
	);
}
