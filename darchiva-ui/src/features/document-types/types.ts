// (c) Copyright Datacraft, 2026
/**
 * Document types feature types.
 */

export interface DocumentType {
	id: string;
	name: string;
	description?: string;
	color?: string;
	icon?: string;
	custom_field_ids: string[];
	workflow_id?: string;
	ocr_settings?: OCRSettings;
	retention_days?: number;
	document_count: number;
	created_at: string;
	updated_at: string;
}

export interface OCRSettings {
	engine?: 'tesseract' | 'paddleocr' | 'qwen-vl' | 'auto';
	language?: string;
	enhance_quality?: boolean;
	deskew?: boolean;
}

export interface DocumentTypeCreate {
	name: string;
	description?: string;
	color?: string;
	icon?: string;
	custom_field_ids?: string[];
	workflow_id?: string;
	ocr_settings?: OCRSettings;
	retention_days?: number;
}

export interface DocumentTypeUpdate {
	name?: string;
	description?: string;
	color?: string;
	icon?: string;
	custom_field_ids?: string[];
	workflow_id?: string;
	ocr_settings?: OCRSettings;
	retention_days?: number;
}

export interface DocumentTypeListResponse {
	items: DocumentType[];
	total: number;
}
