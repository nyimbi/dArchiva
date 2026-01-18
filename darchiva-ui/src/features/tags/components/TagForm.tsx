// (c) Copyright Datacraft, 2026
/**
 * Tag create/edit form.
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
import { useTags, useCreateTag, useUpdateTag } from '../api';
import type { Tag, TagCreate, TAG_COLORS } from '../types';

interface TagFormProps {
	tag?: Tag;
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

export function TagForm({ tag, onSuccess, onCancel }: TagFormProps) {
	const { toast } = useToast();
	const { data: tagsData } = useTags();
	const createMutation = useCreateTag();
	const updateMutation = useUpdateTag();

	const [name, setName] = useState(tag?.name ?? '');
	const [description, setDescription] = useState(tag?.description ?? '');
	const [color, setColor] = useState(tag?.color ?? '#64748b');
	const [parentId, setParentId] = useState<string | undefined>(tag?.parent_id);

	const tags = tagsData?.items ?? [];
	const availableParents = tags.filter((t) => t.id !== tag?.id);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!name.trim()) {
			toast({ title: 'Name is required', variant: 'destructive' });
			return;
		}

		const data: TagCreate = {
			name: name.trim(),
			description: description.trim() || undefined,
			color,
			parent_id: parentId,
		};

		try {
			if (tag) {
				await updateMutation.mutateAsync({ tagId: tag.id, data });
				toast({ title: 'Tag updated' });
			} else {
				await createMutation.mutateAsync(data);
				toast({ title: 'Tag created' });
			}
			onSuccess?.();
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to save tag',
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
					placeholder="Tag name"
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

			{availableParents.length > 0 && (
				<div className="space-y-2">
					<Label>Parent Tag</Label>
					<Select value={parentId ?? 'none'} onValueChange={(v) => setParentId(v === 'none' ? undefined : v)}>
						<SelectTrigger>
							<SelectValue placeholder="Select parent (optional)" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="none">No parent</SelectItem>
							{availableParents.map((t) => (
								<SelectItem key={t.id} value={t.id}>
									<span className="flex items-center gap-2">
										<span
											className="w-3 h-3 rounded-full"
											style={{ backgroundColor: t.color || '#64748b' }}
										/>
										{t.name}
									</span>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
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
					{tag ? 'Save Changes' : 'Create Tag'}
				</Button>
			</div>
		</form>
	);
}
