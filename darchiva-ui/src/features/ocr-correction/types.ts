// (c) Copyright Datacraft, 2026
export interface PageOCRText {
	pageNumber: number;
	rawText: string;
	confidence: number; // 0-1, average across words
	words: Array<{
		text: string;
		confidence: number;
		bbox: { x: number; y: number; width: number; height: number };
	}>;
}

export interface OCRCorrection {
	pageNumber: number;
	originalText: string;
	correctedText: string;
	correctedAt: string;
	correctedBy: string;
}
