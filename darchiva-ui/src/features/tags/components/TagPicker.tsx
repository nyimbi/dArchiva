// (c) Copyright Datacraft, 2026
/**
 * Tag picker for documents.
 */
import { useState, useMemo } from 'react';
import { Tag as TagIcon, Plus, Check, X, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { useTags, useCreateTag } from '../api';
import type { Tag } from '../types';

interface TagPickerProps {
	selectedTags: Tag[];
	onTagsChange: (tags: Tag[]) => void;
	className?: string;
}

export function TagPicker({ selectedTags, onTagsChange, className }: TagPickerProps) {
	const { data } = useTags();
	const createMutation = useCreateTag();
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState('');

	const tags = data?.items ?? [];
	const selectedIds = new Set(selectedTags.map((t) => t.id));

	const filteredTags = useMemo(() => {
		if (!search) return tags;
		const query = search.toLowerCase();
		return tags.filter((tag) => tag.name.toLowerCase().includes(query));
	}, [tags, search]);

	const toggleTag = (tag: Tag) => {
		if (selectedIds.has(tag.id)) {
			onTagsChange(selectedTags.filter((t) => t.id !== tag.id));
		} else {
			onTagsChange([...selectedTags, tag]);
		}
	};

	const createAndAdd = async () => {
		if (!search.trim()) return;

		try {
			const newTag = await createMutation.mutateAsync({ name: search.trim() });
			onTagsChange([...selectedTags, newTag]);
			setSearch('');
		} catch (error) {
			// Handle error
		}
	};

	const noMatch = search && filteredTags.length === 0;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button variant="outline" className={cn('justify-start gap-2', className)}>
					<TagIcon className="h-4 w-4" />
					{selectedTags.length > 0 ? (
						<span>{selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''}</span>
					) : (
						<span className="text-muted-foreground">Add tags...</span>
					)}
				</Button>
			</PopoverTrigger>

			<PopoverContent className="w-64 p-0" align="start">
				<div className="p-2 border-b border-border">
					<div className="relative">
						<Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search or create..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="pl-8 h-8"
						/>
					</div>
				</div>

				<div className="max-h-60 overflow-auto p-1">
					{filteredTags.map((tag) => (
						<button
							key={tag.id}
							onClick={() => toggleTag(tag)}
							className={cn(
								'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent',
								selectedIds.has(tag.id) && 'bg-accent'
							)}
						>
							<span
								className="w-3 h-3 rounded-full flex-shrink-0"
								style={{ backgroundColor: tag.color || '#64748b' }}
							/>
							<span className="flex-1 text-left truncate">{tag.name}</span>
							{selectedIds.has(tag.id) && (
								<Check className="h-4 w-4 text-primary" />
							)}
						</button>
					))}

					{noMatch && (
						<button
							onClick={createAndAdd}
							className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent text-primary"
						>
							<Plus className="h-4 w-4" />
							Create "{search}"
						</button>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}

interface TagBadgeListProps {
	tags: Tag[];
	onRemove?: (tag: Tag) => void;
	className?: string;
}

export function TagBadgeList({ tags, onRemove, className }: TagBadgeListProps) {
	if (tags.length === 0) return null;

	return (
		<div className={cn('flex flex-wrap gap-1', className)}>
			{tags.map((tag) => (
				<Badge
					key={tag.id}
					variant="secondary"
					className="gap-1 pr-1"
					style={{ backgroundColor: `${tag.color}20`, borderColor: tag.color }}
				>
					<span
						className="w-2 h-2 rounded-full"
						style={{ backgroundColor: tag.color || '#64748b' }}
					/>
					{tag.name}
					{onRemove && (
						<button
							onClick={() => onRemove(tag)}
							className="ml-1 p-0.5 rounded-full hover:bg-background/50"
						>
							<X className="h-3 w-3" />
						</button>
					)}
				</Badge>
			))}
		</div>
	);
}
