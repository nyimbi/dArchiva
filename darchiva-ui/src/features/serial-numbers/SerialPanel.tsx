// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { Hash, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useDocumentSerial, useAssignSerial, useSerialSequences } from './api';

interface SerialPanelProps {
	documentId: string;
}

export function SerialPanel({ documentId }: SerialPanelProps) {
	const [selectedSequenceId, setSelectedSequenceId] = useState<string>('');

	const {
		data: current,
		isLoading: loadingSerial,
		isError: serialError,
		refetch: refetchSerial,
	} = useDocumentSerial(documentId);

	const {
		data: sequences,
		isLoading: loadingSequences,
	} = useSerialSequences();

	const assignMutation = useAssignSerial(documentId);

	async function handleAssign() {
		if (!selectedSequenceId) return;
		await assignMutation.mutateAsync(selectedSequenceId);
		setSelectedSequenceId('');
	}

	return (
		<div className="p-4 space-y-5">
			{/* Header */}
			<div className="flex items-center gap-2">
				<Hash className="h-5 w-5 text-primary" />
				<h3 className="font-semibold text-sm">Serial Number</h3>
			</div>

			<Separator />

			{/* Current serial */}
			<div className="space-y-2">
				<p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
					Assigned Serial
				</p>

				{loadingSerial && (
					<Skeleton className="h-10 w-full rounded-md" />
				)}

				{!loadingSerial && serialError && (
					<div className="flex items-center justify-between rounded-md border border-destructive/50 bg-destructive/10 p-2">
						<p className="text-xs text-destructive">Failed to load.</p>
						<Button variant="ghost" size="sm" onClick={() => refetchSerial()}>
							<RefreshCw className="h-3.5 w-3.5" />
						</Button>
					</div>
				)}

				{!loadingSerial && !serialError && !current && (
					<div className="flex items-center justify-center h-10 rounded-md border border-dashed text-xs text-muted-foreground">
						No serial assigned yet
					</div>
				)}

				{!loadingSerial && !serialError && current && (
					<div className="flex items-center gap-2">
						<Badge variant="secondary" className="font-mono text-base px-3 py-1">
							{current.serial_value}
						</Badge>
					</div>
				)}
			</div>

			<Separator />

			{/* Assign form */}
			<div className="space-y-3">
				<p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
					{current ? 'Reassign Serial' : 'Assign Serial'}
				</p>

				<div className="space-y-1">
					<Label className="text-xs">Sequence</Label>
					{loadingSequences ? (
						<Skeleton className="h-9 w-full" />
					) : (
						<Select value={selectedSequenceId} onValueChange={setSelectedSequenceId}>
							<SelectTrigger>
								<SelectValue placeholder="Choose a sequence…" />
							</SelectTrigger>
							<SelectContent>
								{(sequences ?? []).map((seq) => (
									<SelectItem key={seq.id} value={seq.id}>
										<span>{seq.name}</span>
										{seq.preview && (
											<span className="ml-2 font-mono text-xs text-muted-foreground">
												({seq.preview})
											</span>
										)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				</div>

				{assignMutation.error && (
					<p className="text-xs text-destructive">
						{(assignMutation.error as Error)?.message ?? 'Assignment failed.'}
					</p>
				)}

				<Button
					className="w-full"
					disabled={!selectedSequenceId || assignMutation.isPending}
					onClick={handleAssign}
				>
					{assignMutation.isPending ? (
						<Loader2 className="h-4 w-4 mr-2 animate-spin" />
					) : (
						<Hash className="h-4 w-4 mr-2" />
					)}
					{current ? 'Reassign' : 'Assign Next Serial'}
				</Button>
			</div>
		</div>
	);
}
