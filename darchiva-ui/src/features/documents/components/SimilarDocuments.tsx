// (c) Copyright Datacraft, 2026
import React from 'react';
import { useDocumentSimilar } from '../hooks/useDocumentSimilar';

interface Props {
	documentId: string;
	onNavigate?: (documentId: string) => void;
}

/**
 * Sidebar panel showing up to 5 documents semantically similar to the
 * currently viewed document, ranked by cosine similarity.
 */
export function SimilarDocuments({ documentId, onNavigate }: Props) {
	const { data: similar, isLoading, isError } = useDocumentSimilar(documentId);

	if (isLoading) {
		return (
			<div className="similar-documents similar-documents--loading">
				<h4 className="similar-documents__heading">Similar Documents</h4>
				<ul className="similar-documents__list">
					{Array.from({ length: 3 }).map((_, i) => (
						<li key={i} className="similar-documents__skeleton" aria-hidden="true" />
					))}
				</ul>
			</div>
		);
	}

	if (isError || !similar || similar.length === 0) {
		return (
			<div className="similar-documents similar-documents--empty">
				<h4 className="similar-documents__heading">Similar Documents</h4>
				<p className="similar-documents__empty-text">
					{isError ? 'Similarity index not available.' : 'No similar documents found.'}
				</p>
			</div>
		);
	}

	return (
		<div className="similar-documents">
			<h4 className="similar-documents__heading">Similar Documents</h4>
			<ul className="similar-documents__list">
				{similar.map((doc) => (
					<li key={doc.document_id} className="similar-documents__item">
						<button
							type="button"
							className="similar-documents__item-btn"
							onClick={() => onNavigate?.(doc.document_id)}
							title={doc.title}
						>
							{/* Doc icon */}
							<span className="similar-documents__icon" aria-hidden="true">
								<svg width="20" height="24" viewBox="0 0 20 24" fill="none"
									xmlns="http://www.w3.org/2000/svg">
									<path d="M4 0h9l7 7v17H4V0z" fill="#E8EAED" stroke="#BDC1C6"
										strokeWidth="1" />
									<path d="M13 0l7 7h-7V0z" fill="#BDC1C6" />
									<rect x="6" y="11" width="8" height="1.5" rx="0.75" fill="#5F6368" />
									<rect x="6" y="14" width="6" height="1.5" rx="0.75" fill="#5F6368" />
									<rect x="6" y="17" width="7" height="1.5" rx="0.75" fill="#5F6368" />
								</svg>
							</span>

							<span className="similar-documents__item-body">
								<span className="similar-documents__item-title">{doc.title}</span>
								{doc.snippet && (
									<span className="similar-documents__item-snippet">
										{doc.snippet.length > 80
											? doc.snippet.slice(0, 80) + '…'
											: doc.snippet}
									</span>
								)}
							</span>

							<span
								className="similar-documents__score"
								title={`${doc.score}% similarity`}
							>
								{doc.score.toFixed(0)}%
							</span>
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}

export default SimilarDocuments;
