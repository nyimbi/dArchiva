// (c) Copyright Datacraft, 2026
/**
 * Document type create/edit form.
 */
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCreateDocumentType, useUpdateDocumentType } from '../api';
import { useCustomFields } from '@/features/custom-fields/api';
import type { DocumentType, DocumentTypeCreate, OCRSettings } from '../types';

interface DocumentTypeFormProps {
	documentType?: DocumentType;
	onSuccess?: () => void;
	onCancel?: () => void;
}

const COLORS = [
	{ value: '#ef4444', label: 'Red' },
	{ value: '#f97316', label: 'Orange' },
	{ value: '#eab308', label: 'Yellow' },
	{ value: '#22c55e', label: 'Green' },
	{ value: '#14b8a6', label: 'Teal' },
	{ value: '#3b82f6', label: 'Blue' },
	{ value: '#8b5cf6', label: 'Violet' },
	{ value: '#ec4899', label: 'Pink' },
	{ value: '#64748b', label: 'Slate' },
];

export function DocumentTypeForm({ documentType, onSuccess, onCancel }: DocumentTypeFormProps) {
	const { toast } = useToast();
	const { data: customFieldsData } = useCustomFields();
	const createMutation = useCreateDocumentType();
	const updateMutation = useUpdateDocumentType();

	const [name, setName] = useState(documentType?.name ?? '');
	const [description, setDescription] = useState(documentType?.description ?? '');
	const [color, setColor] = useState(documentType?.color ?? '#64748b');
	const [selectedFields, setSelectedFields] = useState<string[]>(documentType?.custom_field_ids ?? []);
	const [retentionDays, setRetentionDays] = useState<string>(documentType?.retention_days?.toString() ?? '');
	const [ocrEngine, setOcrEngine] = useState<OCRSettings['engine']>(documentType?.ocr_settings?.engine ?? 'auto');

	const customFields = customFieldsData?.items ?? [];

	const toggleField = (fieldId: string) => {
		setSelectedFields((prev) =>
			prev.includes(fieldId) ? prev.filter((id) => id !== fieldId) : [...prev, fieldId]
		);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!name.trim()) {
			toast({ title: 'Name is required', variant: 'destructive' });
			return;
		}

		const data: DocumentTypeCreate = {
			name: name.trim(),
			description: description.trim() || undefined,
			color,
			custom_field_ids: selectedFields,
			retention_days: retentionDays ? parseInt(retentionDays) : undefined,
			ocr_settings: { engine: ocrEngine },
		};

		try {
			if (documentType) {
				await updateMutation.mutateAsync({ typeId: documentType.id, data });
				toast({ title: 'Document type updated' });
			} else {
				await createMutation.mutateAsync(data);
				toast({ title: 'Document type created' });
			}
			onSuccess?.();
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to save document type',
				variant: 'destructive',
			});
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="name">Name</Label>
				<Input
					id="name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="e.g., Invoice, Contract, Report"
				/>
			</div>

			<div className="space-y-2">
				<Label htmlFor="description">Description</Label>
				<Textarea
					id="description"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					placeholder="Optional description"
					rows={2}
				/>
			</div>

			<div className="space-y-2">
				<Label>Color</Label>
				<div className="flex gap-2">
					{COLORS.map((c) => (
						<button
							key={c.value}
							type="button"
							onClick={() => setColor(c.value)}
							className={`w-8 h-8 rounded-full border-2 transition-all ${color === c.value ? 'border-foreground scale-110' : 'border-transparent'}`}
							style={{ backgroundColor: c.value }}
							title={c.label}
						/>
					))}
				</div>
			</div>

			<div className="space-y-2">
				<Label>OCR Engine</Label>
				<Select value={ocrEngine} onValueChange={(v) => setOcrEngine(v as OCRSettings['engine'])}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="auto">Auto-detect</SelectItem>
						<SelectItem value="tesseract">Tesseract</SelectItem>
						<SelectItem value="paddleocr">PaddleOCR</SelectItem>
						<SelectItem value="qwen-vl">Qwen-VL (AI)</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-2">
				<Label htmlFor="retention">Retention Period (days)</Label>
				<Input
					id="retention"
					type="number"
					value={retentionDays}
					onChange={(e) => setRetentionDays(e.target.value)}
					placeholder="Leave empty for no limit"
					min={1}
				/>
			</div>

			{customFields.length > 0 && (
				<div className="space-y-2">
					<Label>Custom Fields</Label>
					<div className="border rounded-lg p-3 max-h-40 overflow-auto space-y-1">
						{customFields.map((field) => (
							<label
								key={field.id}
								className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
							>
								<input
									type="checkbox"
									checked={selectedFields.includes(field.id)}
									onChange={() => toggleField(field.id)}
									className="rounded"
								/>
								<span className="text-sm">{field.name}</span>
								<span className="text-xs text-muted-foreground">({field.type})</span>
							</label>
						))}
					</div>
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
					{documentType ? 'Save Changes' : 'Create Type'}
				</Button>
			</div>
		</form>
	);
}
