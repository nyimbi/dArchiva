// (c) Copyright Datacraft, 2026
import { useOcrWords } from './api';

// ---------------------------------------------------------------------------
// Confidence → colour helpers
// ---------------------------------------------------------------------------

function confidenceColor(confidence: number): string {
	if (confidence >= 0.9) return 'transparent';
	if (confidence >= 0.7) return 'rgba(255,165,0,0.22)';
	return 'rgba(255,60,60,0.32)';
}

function confidenceBorder(confidence: number): string {
	if (confidence >= 0.9) return 'none';
	if (confidence >= 0.7) return '1px solid rgba(255,165,0,0.5)';
	return '1px solid rgba(255,60,60,0.55)';
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface OcrConfidenceOverlayProps {
	documentId: string;
	pageNumber: number;
	/** Whether to render the overlay at all */
	show: boolean;
	/** Words with confidence below this (0–100) are always coloured */
	threshold: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OcrConfidenceOverlay({
	documentId,
	pageNumber,
	show,
	threshold,
}: OcrConfidenceOverlayProps) {
	const { data, isLoading, isError } = useOcrWords(documentId, pageNumber, show);

	if (!show || isLoading || isError || !data) return null;
	if (data.source === 'placeholder' && data.words.length === 0) return null;

	const threshFraction = threshold / 100;

	return (
		<div
			className="absolute inset-0 pointer-events-none select-none"
			aria-hidden="true"
			style={{ zIndex: 10 }}
		>
			{data.words.map((word, idx) => {
				// Only paint words that fall below threshold
				if (word.confidence >= threshFraction) return null;

				const bg = confidenceColor(word.confidence);
				const border = confidenceBorder(word.confidence);

				return (
					<div
						key={idx}
						className="absolute pointer-events-auto"
						title={`"${word.text}" — ${Math.round(word.confidence * 100)}% confidence`}
						style={{
							left: `${word.x * 100}%`,
							top: `${word.y * 100}%`,
							width: `${word.width * 100}%`,
							height: `${word.height * 100}%`,
							backgroundColor: bg,
							border,
							borderRadius: '2px',
							cursor: 'default',
						}}
					/>
				);
			})}
		</div>
	);
}
