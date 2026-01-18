// (c) Copyright Datacraft, 2026
/**
 * Custom field create/edit form.
 */
import { useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCreateCustomField, useUpdateCustomField } from '../api';
import type { CustomField, CustomFieldCreate, CustomFieldType, CustomFieldOption, FIELD_TYPE_LABELS } from '../types';

interface CustomFieldFormProps {
	field?: CustomField;
	onSuccess?: () => void;
	onCancel?: () => void;
}

const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
	{ value: 'text', label: 'Text' },
	{ value: 'number', label: 'Number' },
	{ value: 'date', label: 'Date' },
	{ value: 'boolean', label: 'Yes/No' },
	{ value: 'select', label: 'Dropdown' },
	{ value: 'url', label: 'URL' },
	{ value: 'email', label: 'Email' },
	{ value: 'monetary', label: 'Currency' },
];

export function CustomFieldForm({ field, onSuccess, onCancel }: CustomFieldFormProps) {
	const { toast } = useToast();
	const createMutation = useCreateCustomField();
	const updateMutation = useUpdateCustomField();

	const [name, setName] = useState(field?.name ?? '');
	const [type, setType] = useState<CustomFieldType>(field?.type ?? 'text');
	const [description, setDescription] = useState(field?.description ?? '');
	const [required, setRequired] = useState(field?.required ?? false);
	const [options, setOptions] = useState<CustomFieldOption[]>(field?.options ?? []);
	const [defaultValue, setDefaultValue] = useState(field?.default_value ?? '');

	const addOption = () => {
		setOptions([...options, { value: '', label: '' }]);
	};

	const updateOption = (index: number, updates: Partial<CustomFieldOption>) => {
		setOptions(options.map((o, i) => (i === index ? { ...o, ...updates } : o)));
	};

	const removeOption = (index: number) => {
		setOptions(options.filter((_, i) => i !== index));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!name.trim()) {
			toast({ title: 'Name is required', variant: 'destructive' });
			return;
		}

		if (type === 'select' && options.length === 0) {
			toast({ title: 'Dropdown fields need at least one option', variant: 'destructive' });
			return;
		}

		const data: CustomFieldCreate = {
			name: name.trim(),
			type,
			description: description.trim() || undefined,
			required,
			options: type === 'select' ? options.filter((o) => o.value && o.label) : undefined,
			default_value: defaultValue.trim() || undefined,
		};

		try {
			if (field) {
				await updateMutation.mutateAsync({ fieldId: field.id, data });
				toast({ title: 'Field updated' });
			} else {
				await createMutation.mutateAsync(data);
				toast({ title: 'Field created' });
			}
			onSuccess?.();
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to save field',
				variant: 'destructive',
			});
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="name">Field Name</Label>
				<Input
					id="name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="e.g., Invoice Number"
				/>
			</div>

			<div className="space-y-2">
				<Label>Field Type</Label>
				<Select value={type} onValueChange={(v) => setType(v as CustomFieldType)} disabled={!!field}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{FIELD_TYPES.map((t) => (
							<SelectItem key={t.value} value={t.value}>
								{t.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{field && (
					<p className="text-xs text-muted-foreground">Field type cannot be changed after creation</p>
				)}
			</div>

			<div className="space-y-2">
				<Label htmlFor="description">Description</Label>
				<Textarea
					id="description"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					placeholder="Optional description for users"
					rows={2}
				/>
			</div>

			<div className="flex items-center justify-between rounded-lg border p-3">
				<div>
					<Label>Required Field</Label>
					<p className="text-xs text-muted-foreground">Users must fill in this field</p>
				</div>
				<Switch checked={required} onCheckedChange={setRequired} />
			</div>

			{type === 'select' && (
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<Label>Dropdown Options</Label>
						<Button type="button" variant="outline" size="sm" onClick={addOption}>
							<Plus className="h-4 w-4 mr-1" />
							Add Option
						</Button>
					</div>

					<div className="space-y-2">
						{options.map((option, index) => (
							<div key={index} className="flex items-center gap-2">
								<Input
									placeholder="Value"
									value={option.value}
									onChange={(e) => updateOption(index, { value: e.target.value })}
									className="flex-1"
								/>
								<Input
									placeholder="Label"
									value={option.label}
									onChange={(e) => updateOption(index, { label: e.target.value })}
									className="flex-1"
								/>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={() => removeOption(index)}
								>
									<Trash2 className="h-4 w-4 text-destructive" />
								</Button>
							</div>
						))}
					</div>
				</div>
			)}

			{type !== 'boolean' && type !== 'select' && (
				<div className="space-y-2">
					<Label htmlFor="default">Default Value</Label>
					<Input
						id="default"
						value={defaultValue}
						onChange={(e) => setDefaultValue(e.target.value)}
						placeholder="Optional default value"
						type={type === 'number' || type === 'monetary' ? 'number' : type === 'date' ? 'date' : 'text'}
					/>
				</div>
			)}

			<div className="flex justify-end gap-2 pt-4">
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancel
				</Button>
				<Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
					{(createMutation.isPending || updateMutation.isPending) && (
						<Loader2 className="h-4 w-4 mr-2 animate-spin" />
					)}
					{field ? 'Save Changes' : 'Create Field'}
				</Button>
			</div>
		</form>
	);
}
