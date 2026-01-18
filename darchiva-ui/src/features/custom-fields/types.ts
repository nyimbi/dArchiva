// (c) Copyright Datacraft, 2026
/**
 * Custom fields feature types.
 */

export type CustomFieldType = 'text' | 'number' | 'date' | 'boolean' | 'select' | 'url' | 'email' | 'monetary';

export interface CustomFieldOption {
	value: string;
	label: string;
}

export interface CustomField {
	id: string;
	name: string;
	type: CustomFieldType;
	description?: string;
	required: boolean;
	options?: CustomFieldOption[];
	default_value?: string;
	validation_regex?: string;
	document_type_ids?: string[];
	created_at: string;
}

export interface CustomFieldCreate {
	name: string;
	type: CustomFieldType;
	description?: string;
	required?: boolean;
	options?: CustomFieldOption[];
	default_value?: string;
	validation_regex?: string;
	document_type_ids?: string[];
}

export interface CustomFieldUpdate {
	name?: string;
	description?: string;
	required?: boolean;
	options?: CustomFieldOption[];
	default_value?: string;
	validation_regex?: string;
	document_type_ids?: string[];
}

export interface CustomFieldValue {
	field_id: string;
	field_name: string;
	field_type: CustomFieldType;
	value: string | number | boolean | null;
}

export interface CustomFieldListResponse {
	items: CustomField[];
	total: number;
}

export const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
	text: 'Text',
	number: 'Number',
	date: 'Date',
	boolean: 'Yes/No',
	select: 'Dropdown',
	url: 'URL',
	email: 'Email',
	monetary: 'Currency',
};
