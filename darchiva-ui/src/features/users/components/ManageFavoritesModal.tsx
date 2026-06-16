// (c) Copyright Datacraft, 2026
import { useFavorites, useRemoveFavorite } from '@/features/home/api/hooks';
import { cn, formatRelativeTime } from '@/lib/utils';
import { FileText, Folder, Loader2, Search, Star, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
	onClose: () => void;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
	document: FileText,
	folder: Folder,
	search: Search,
	workflow: Star,
};

export function ManageFavoritesModal({ onClose }: Props) {
	const { data: favorites, isLoading } = useFavorites();
	const removeFavorite = useRemoveFavorite();
	const [search, setSearch] = useState('');

	const filtered = (favorites ?? []).filter((f) =>
		!search || f.title.toLowerCase().includes(search.toLowerCase())
	);

	const handleRemove = async (id: string, title: string) => {
		try {
			await removeFavorite.mutateAsync(id);
			toast.success(`Removed "${title}" from favorites`);
		} catch {
			toast.error('Failed to remove favorite');
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
			<div className="glass-card w-full max-w-lg max-h-[75vh] flex flex-col">
				<div className="flex items-center justify-between p-5 border-b border-slate-700/50">
					<div className="flex items-center gap-2">
						<Star className="w-5 h-5 text-brass-400" />
						<h2 className="text-lg font-semibold text-slate-100">Favorites</h2>
					</div>
					<button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200 rounded"><X className="w-5 h-5" /></button>
				</div>

				<div className="p-4 border-b border-slate-700/50">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
						<input className="input w-full pl-9" placeholder="Search favorites..." value={search} onChange={(e) => setSearch(e.target.value)} />
					</div>
				</div>

				<div className="flex-1 overflow-y-auto">
					{isLoading ? (
						<div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-slate-500" /></div>
					) : filtered.length === 0 ? (
						<div className="text-center py-10">
							<Star className="w-10 h-10 text-slate-700 mx-auto mb-3" />
							<p className="text-slate-500 text-sm">{search ? 'No matches' : 'No favorites yet'}</p>
						</div>
					) : (
						<div className="divide-y divide-slate-700/30">
							{filtered.map((fav) => {
								const Icon = TYPE_ICONS[fav.item_type] ?? Star;
								return (
									<div key={fav.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-800/30 group">
										<div className="p-1.5 bg-slate-800 rounded-lg">
											<Icon className="w-4 h-4 text-slate-400" />
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm text-slate-200 truncate">{fav.title}</p>
											{fav.path && <p className="text-xs text-slate-500 truncate">{fav.path}</p>}
											<p className="text-xs text-slate-600">{formatRelativeTime(fav.pinned_at)}</p>
										</div>
										<button
											onClick={() => handleRemove(fav.id, fav.title)}
											className={cn('p-1.5 text-slate-600 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-all')}
										>
											<X className="w-4 h-4" />
										</button>
									</div>
								);
							})}
						</div>
					)}
				</div>

				<div className="p-4 border-t border-slate-700/50">
					<button onClick={onClose} className="btn-secondary w-full">Done</button>
				</div>
			</div>
		</div>
	);
}
