// (c) Copyright Datacraft, 2026
/**
 * CustomFieldsPanel — renders editable custom metadata fields for a document.
 *
 * Props:
 *   documentId  — UUID of the document whose values are being edited
 *   projectId   — optional scanning project UUID; scopes which fields are shown
 *
 * Fetches field definitions (useCustomFields) and current stored values
 * (useCustomFieldValues) in parallel, renders type-appropriate inputs, and
 * submits all values at once via PUT on "Save".
 */
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
	useCustomFieldValues,
	useCustomFields,
	useUpsertCustomFieldValues,
} from '@/features/custom-fields/api';
import type { CustomFieldType, DocumentCustomFieldValueEntry } from '@/features/custom-fields/types';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

type RawValue = string | number | boolean | null;

function blankValue(fieldType: CustomFieldType): RawValue {
	if (fieldType === 'boolean') return false;
	if (fieldType === 'number') return null;
	return '';
}

function entryToRaw(entry: DocumentCustomFieldValueEntry): RawValue {
	switch (entry.field_type) {
		case 'boolean':
			return entry.value_bool ?? false;
		case 'number':
		case 'monetary':
			return entry.value_number ?? null;
		case 'date':
		case 'datetime':
			return entry.value_date ?? '';
		default:
			return entry.value_text ?? '';
	}
}

// ---------------------------------------------------------------------------
// Field renderer
// ---------------------------------------------------------------------------

interface FieldInputProps {
	entry: DocumentCustomFieldValueEntry;
	value: RawValue;
	onChange: (v: RawValue) => void;
}

function FieldInput({ entry, value, onChange }: FieldInputProps) {
	const { field_type, options } = entry;

	if (field_type === 'boolean') {
		return (
			<div className="flex items-center gap-2">
				<Checkbox
					id={entry.field_id}
					checked={!!value}
					onCheckedChange={(checked) => onChange(!!checked)}
				/>
				<label htmlFor={entry.field_id} className="text-sm cursor-pointer">
					{value ? 'Yes' : 'No'}
				</label>
			</div>
		);
	}

	if (field_type === 'select' && options && options.length > 0) {
		return (
			<Select value={String(value ?? '')} onValueChange={(v) => onChange(v)}>
				<SelectTrigger>
					<SelectValue placeholder="Select…" />
				</SelectTrigger>
				<SelectContent>
					{options.map((opt) => (
						<SelectItem key={opt.value} value={opt.value}>
							{opt.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		);
	}

	if (field_type === 'number' || field_type === 'monetary') {
		return (
			<Input
				type="number"
				value={value === null ? '' : String(value)}
				onChange={(e) =>
					onChange(e.target.value === '' ? null : Number(e.target.value))
				}
				step={field_type === 'monetary' ? '0.01' : 'any'}
			/>
		);
	}

	if (field_type === 'date') {
		return (
			<Input
				type="date"
				value={String(value ?? '')}
				onChange={(e) => onChange(e.target.value || null)}
			/>
		);
	}

	if (field_type === 'datetime') {
		return (
			<Input
				type="datetime-local"
				value={String(value ?? '')}
				onChange={(e) => onChange(e.target.value || null)}
			/>
		);
	}

	if (field_type === 'email') {
		return (
			<Input
				type="email"
				value={String(value ?? '')}
				onChange={(e) => onChange(e.target.value)}
			/>
		);
	}

	if (field_type === 'url') {
		return (
			<Input
				type="url"
				value={String(value ?? '')}
				onChange={(e) => onChange(e.target.value)}
			/>
		);
	}

	// text / textarea / yearmonth / integer / fallback
	return (
		<Input
			type="text"
			value={String(value ?? '')}
			onChange={(e) => onChange(e.target.value)}
		/>
	);
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

interface CustomFieldsPanelProps {
	documentId: string;
	projectId?: string;
}

export function CustomFieldsPanel({ documentId, projectId }: CustomFieldsPanelProps) {

	// Fetch field definitions scoped to project (or globals if no projectId)
	const { data: fieldDefs, isLoading: defsLoading } = useCustomFields(projectId);

	// Fetch current stored values for this document
	const { data: storedValues, isLoading: valuesLoading } = useCustomFieldValues(documentId);

	const upsertMutation = useUpsertCustomFieldValues(documentId);

	// Local form state: field_id -> raw value
	const [formValues, setFormValues] = useState<Record<string, RawValue>>({});
	const [initialized, setInitialized] = useState(false);

	// Seed form state once both defs and stored values are available
	useEffect(() => {
		if (!fieldDefs || !storedValues || initialized) return;

		const initial: Record<string, RawValue> = {};

		// Start with blanks for all known fields
		for (const field of fieldDefs.items) {
			initial[field.id] = blankValue(field.type as CustomFieldType);
		}

		// Overlay stored values
		for (const entry of storedValues) {
			initial[entry.field_id] = entryToRaw(entry);
		}

		setFormValues(initial);
		setInitialized(true);
	}, [fieldDefs, storedValues, initialized]);

	const handleChange = (fieldId: string, value: RawValue) => {
		setFormValues((prev) => ({ ...prev, [fieldId]: value }));
	};

	const handleSave = async () => {
		try {
			await upsertMutation.mutateAsync(formValues);
			toast.success('Metadata saved');
		} catch {
			toast.error('Save failed');
		}
	};

	if (defsLoading || valuesLoading) {
		return (
			<div className="space-y-3 p-4">
				{[1, 2, 3].map((i) => (
					<div key={i} className="space-y-1">
						<Skeleton className="h-4 w-32" />
						<Skeleton className="h-9 w-full" />
					</div>
				))}
			</div>
		);
	}

	const fields = fieldDefs?.items ?? [];

	if (fields.length === 0) {
		return (
			<p className="text-sm text-muted-foreground p-4">
				No custom fields defined{projectId ? ' for this project' : ''}.
			</p>
		);
	}

	// Build a map of field_id -> stored entry for augmenting display props
	const storedMap = new Map<string, DocumentCustomFieldValueEntry>(
		(storedValues ?? []).map((e) => [e.field_id, e]),
	);

	// Sort fields by sort_order if present in stored data, else by definition order
	const sortedFields = [...fields].sort((a, b) => {
		const sa = storedMap.get(a.id)?.sort_order ?? 0;
		const sb = storedMap.get(b.id)?.sort_order ?? 0;
		return sa - sb;
	});

	return (
		<div className="space-y-4 p-4">
			{sortedFields.map((field) => {
				const stored = storedMap.get(field.id);
				const label = stored?.label ?? field.name;
				const required = stored?.required ?? field.required ?? false;
				const options = stored?.options ?? field.options ?? [];
				const fieldType = (stored?.field_type ?? field.type) as CustomFieldType;

				// Synthesise an entry shape for FieldInput
				const syntheticEntry: DocumentCustomFieldValueEntry = {
					field_id: field.id,
					field_name: field.name,
					field_type: fieldType,
					label,
					required,
					options,
					sort_order: stored?.sort_order ?? 0,
					value_text: null,
					value_number: null,
					value_date: null,
					value_bool: null,
				};

				return (
					<div key={field.id} className="space-y-1">
						<Label htmlFor={field.id} className="flex items-center gap-1">
							{label}
							{required && (
								<span className="text-destructive text-xs" aria-label="required">
									*
								</span>
							)}
						</Label>
						<FieldInput
							entry={syntheticEntry}
							value={formValues[field.id] ?? blankValue(fieldType)}
							onChange={(v) => handleChange(field.id, v)}
						/>
					</div>
				);
			})}

			<div className="pt-2 flex justify-end">
				<Button
					onClick={handleSave}
					disabled={upsertMutation.isPending}
					size="sm"
				>
					{upsertMutation.isPending && (
						<Loader2 className="h-4 w-4 mr-2 animate-spin" />
					)}
					Save
				</Button>
			</div>
		</div>
	);
}
