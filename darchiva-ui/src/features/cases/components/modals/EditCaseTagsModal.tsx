// (c) Copyright Datacraft, 2026
import { useUpdateCase, type Case } from '@/features/cases/api';
import { Loader2, Tag, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
	onClose: () => void;
	case_?: Case | null;
}

export function EditCaseTagsModal({ onClose, case_ }: Props) {
	const existingTags: string[] = (case_?.metadata?.tags as string[]) ?? [];
	const [tags, setTags] = useState<string[]>(existingTags);
	const [input, setInput] = useState('');
	const updateCase = useUpdateCase();

	const addTag = () => {
		const t = input.trim().toLowerCase();
		if (t && !tags.includes(t)) setTags([...tags, t]);
		setInput('');
	};

	const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

	const handleSave = async () => {
		if (!case_) return;
		try {
			await updateCase.mutateAsync({ id: case_.id, data: { metadata: { ...case_.metadata, tags } } });
			toast.success('Tags updated');
			onClose();
		} catch {
			toast.error('Failed to update tags');
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
			<div className="glass-card w-full max-w-md p-6">
				<div className="flex items-center justify-between mb-5">
					<div className="flex items-center gap-2">
						<Tag className="w-5 h-5 text-brass-400" />
						<h2 className="text-lg font-semibold text-slate-100">Edit Tags</h2>
					</div>
					<button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200 rounded"><X className="w-5 h-5" /></button>
				</div>

				{case_ && <p className="text-sm text-slate-500 mb-4">Case: <span className="text-slate-300">{case_.title}</span></p>}

				<div className="space-y-4">
					<div className="flex gap-2">
						<input
							className="input flex-1"
							placeholder="Add tag and press Enter"
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
						/>
						<button type="button" onClick={addTag} className="btn-secondary px-4">Add</button>
					</div>

					{tags.length > 0 && (
						<div className="flex flex-wrap gap-2 p-3 bg-slate-800/30 rounded-lg min-h-[60px]">
							{tags.map((tag) => (
								<span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 bg-brass-500/10 text-brass-400 rounded-full text-xs">
									{tag}
									<button onClick={() => removeTag(tag)} className="hover:text-brass-200">
										<X className="w-3 h-3" />
									</button>
								</span>
							))}
						</div>
					)}

					<div className="flex gap-2 pt-1">
						<button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
						<button onClick={handleSave} disabled={updateCase.isPending} className="btn-primary flex-1">
							{updateCase.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Tags'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
