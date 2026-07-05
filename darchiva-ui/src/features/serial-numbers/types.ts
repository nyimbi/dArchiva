// (c) Copyright Datacraft, 2026

export interface SerialNumberSequence {
	id: string;
	name: string;
	prefix: string;
	padding: number; // zero-pad length e.g. 5 → "00001"
	current_value: number;
	increment_by: number;
	preview?: string; // e.g. "DOC-00042"
	created_at: string;
}

export interface DocumentSerialNumber {
	id: string;
	document_id: string;
	sequence_id: string;
	serial_value: string; // formatted, e.g. "DOC-00042"
	assigned_at: string;
}

export interface CreateSequencePayload {
	name: string;
	prefix: string;
	padding?: number;
	start?: number;
	increment_by?: number;
}

export interface UpdateSequencePayload {
	name?: string;
	prefix?: string;
	padding?: number;
	increment_by?: number;
}

export interface AssignBulkPayload {
	document_ids: string[];
	sequence_id: string;
}

export interface AssignManualPayload {
	document_id: string;
	sequence_id: string;
	value: number;
}
