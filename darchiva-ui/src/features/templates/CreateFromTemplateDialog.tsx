// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { useCreateFromTemplate } from './api';
import type { FieldDefinition, DocumentTemplate } from './api';

interface Props {
	template: DocumentTemplate;
	open: boolean;
	onClose: () => void;
}

export function CreateFromTemplateDialog({ template, open, onClose }: Props) {
	const [title, setTitle] = useState('');
	const [destinationFolderId, setDestinationFolderId] = useState('');
	const [fieldValues, setFieldValues] = useState<Record<string, string>>(() =>
		Object.fromEntries(
			template.field_definitions.map((f) => [f.name, f.default_value ?? '']),
		),
	);
	const [createdDoc, setCreatedDoc] = useState<{ id: string; title: string } | null>(null);

	const createMutation = useCreateFromTemplate();

	function setField(name: string, value: string) {
		setFieldValues((prev) => ({ ...prev, [name]: value }));
	}

	function handleClose() {
		setCreatedDoc(null);
		setTitle('');
		setDestinationFolderId('');
		setFieldValues(
			Object.fromEntries(
				template.field_definitions.map((f) => [f.name, f.default_value ?? '']),
			),
		);
		onClose();
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const result = await createMutation.mutateAsync({
			templateId: template.id,
			body: {
				title,
				field_values: fieldValues,
				...(destinationFolderId ? { destination_folder_id: destinationFolderId } : {}),
			},
		});
		setCreatedDoc({ id: result.document_id, title: result.title });
	}

	function renderField(field: FieldDefinition) {
		const id = `field-${field.name}`;
		const value = fieldValues[field.name] ?? '';

		if (field.type === 'checkbox') {
			return (
				<div key={field.name} className="flex items-center gap-2">
					<Checkbox
						id={id}
						checked={value === 'true'}
						onCheckedChange={(checked) => setField(field.name, checked ? 'true' : 'false')}
					/>
					<Label htmlFor={id}>
						{field.label}
						{field.required && <span className="text-destructive ml-1">*</span>}
					</Label>
				</div>
			);
		}

		return (
			<div key={field.name} className="space-y-1">
				<Label htmlFor={id}>
					{field.label}
					{field.required && <span className="text-destructive ml-1">*</span>}
				</Label>
				<Input
					id={id}
					type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
					value={value}
					onChange={(e) => setField(field.name, e.target.value)}
					required={field.required}
					placeholder={field.default_value || undefined}
				/>
			</div>
		);
	}

	return (
		<Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
			<DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Create from &ldquo;{template.name}&rdquo;</DialogTitle>
				</DialogHeader>

				{createdDoc ? (
					<div className="space-y-4 py-2">
						<div className="flex items-start gap-2 rounded-md border border-green-500 bg-green-50 dark:bg-green-950 p-3">
							<CheckCircle className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
							<p className="text-sm text-green-800 dark:text-green-200">
								Document <strong>{createdDoc.title}</strong> created successfully.
							</p>
						</div>
						<div className="flex justify-end gap-2">
							<Button variant="outline" asChild>
								<a href={`/documents/${createdDoc.id}`} target="_blank" rel="noopener noreferrer">
									<ExternalLink className="h-4 w-4 mr-2" />
									Open Document
								</a>
							</Button>
							<Button onClick={handleClose}>Close</Button>
						</div>
					</div>
				) : (
					<form onSubmit={handleSubmit} className="space-y-4">
						{/* Title */}
						<div className="space-y-1">
							<Label htmlFor="doc-title">
								Document title <span className="text-destructive">*</span>
							</Label>
							<Input
								id="doc-title"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								required
								placeholder="Enter document title"
							/>
						</div>

						{/* Destination folder */}
						<div className="space-y-1">
							<Label htmlFor="dest-folder">Destination folder (optional)</Label>
							<Input
								id="dest-folder"
								value={destinationFolderId}
								onChange={(e) => setDestinationFolderId(e.target.value)}
								placeholder="Folder ID or leave blank for home"
							/>
						</div>

						{/* Dynamic fields */}
						{template.field_definitions.length > 0 && (
							<div className="space-y-3 border-t pt-4">
								<p className="text-sm font-medium text-muted-foreground">Template fields</p>
								{template.field_definitions.map(renderField)}
							</div>
						)}

						{createMutation.isError && (
							<div className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3">
								<AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
								<p className="text-sm text-destructive">
									{(createMutation.error as Error)?.message ?? 'Failed to create document.'}
								</p>
							</div>
						)}

						<DialogFooter>
							<Button type="button" variant="outline" onClick={handleClose}>
								Cancel
							</Button>
							<Button type="submit" disabled={createMutation.isPending || !title.trim()}>
								{createMutation.isPending && (
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								)}
								Create Document
							</Button>
						</DialogFooter>
					</form>
				)}
			</DialogContent>
		</Dialog>
	);
}
