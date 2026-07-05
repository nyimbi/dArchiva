// (c) Copyright Datacraft, 2026
/**
 * ProvenancePanel — side-panel wrapper that fetches chain-of-custody data
 * for a document and renders ProvenanceTimeline. Follows the same contract
 * as ActivityPanel and LegalHoldPanel (accepts only documentId).
 */
import { Loader2 } from 'lucide-react';
import { useDocumentProvenance, useChainOfCustody } from '../api';
import { ProvenanceTimeline } from './ProvenanceTimeline';

interface ProvenancePanelProps {
	documentId: string;
}

export function ProvenancePanel({ documentId }: ProvenancePanelProps) {
	const {
		data: provenance,
		isLoading: loadingProvenance,
		isError: provenanceError,
	} = useDocumentProvenance(documentId);

	const provenanceId = provenance?.id ?? '';

	const {
		data: chain,
		isLoading: loadingChain,
		isError: chainError,
	} = useChainOfCustody(provenanceId);

	if (loadingProvenance || loadingChain) {
		return (
			<div className="flex items-center justify-center p-8">
				<Loader2 className="w-5 h-5 animate-spin text-slate-400" />
			</div>
		);
	}

	if (provenanceError || chainError || !chain) {
		return (
			<div className="p-6 text-sm text-slate-400">
				{provenanceError
					? 'No provenance record found for this document.'
					: 'Could not load chain-of-custody data.'}
			</div>
		);
	}

	return (
		<div className="p-4">
			<ProvenanceTimeline
				documentId={documentId}
				entries={chain.entries}
				originalSource={chain.originalSource}
				ingestionTimestamp={chain.ingestionTimestamp}
				isComplete={chain.isComplete}
			/>
		</div>
	);
}
