// (c) Copyright Datacraft, 2026
/**
 * Custom fields feature types.
 */

// GitHub Issue #631: Added 'datetime' type for datetime custom fields
export type CustomFieldType = 'text' | 'number' | 'date' | 'datetime' | 'boolean' | 'enum';

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

// ------------------------------------------------------------------
// Document custom-field-values (v2 — typed columns)
// ------------------------------------------------------------------

export interface DocumentCustomFieldValueEntry {
	field_id: string;
	field_name: string;
	field_type: CustomFieldType;
	label?: string;
	required: boolean;
	options?: CustomFieldOption[];
	sort_order: number;
	value_text: string | null;
	value_number: number | null;
	value_date: string | null;  // ISO date string YYYY-MM-DD
	value_bool: boolean | null;
}

/** Shape returned by GET /documents/{id}/custom-field-values */
export type DocumentCustomFieldValues = DocumentCustomFieldValueEntry[];

/** Body for PUT /documents/{id}/custom-field-values */
export type UpsertCustomFieldValuesPayload = Record<
	string,
	string | number | boolean | null
>;

export const FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
	text: 'Text',
	number: 'Number',
	date: 'Date',
	datetime: 'Date & Time', // GitHub Issue #631
	boolean: 'Yes/No',
	enum: 'Enum',
};

// GitHub Issue #700: Configuration for date/datetime fields
export interface DateFieldConfig {
	allow_manual_entry: boolean; // Allow typing date directly
	min_date?: string;
	max_date?: string;
	date_format?: string; // Display format
	include_time?: boolean; // For datetime type
	time_format?: '12h' | '24h';
}
