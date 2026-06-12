// (c) Copyright Datacraft, 2026
import { useBundles,useCases } from '@/features/cases/api';
import { usePortfolios } from '@/features/portfolios/api';
import { AnimatePresence,motion } from 'framer-motion';
import { Briefcase,Building2,ChevronDown,FolderPlus,Loader2,Package,X } from 'lucide-react';
import { useEffect,useState } from 'react';
import { toast } from 'sonner';
import { useCreateFolder } from '../../api';

interface CreateFolderModalProps {
	onClose: () => void;
	parentId?: string;
	defaultPortfolioId?: string;
	defaultCaseId?: string;
	defaultBundleId?: string;
}

export function CreateFolderModal({
	onClose,
	parentId,
	defaultPortfolioId,
	defaultCaseId,
	defaultBundleId,
}: CreateFolderModalProps) {
	const [title, setTitle] = useState('');
	const [portfolioId, setPortfolioId] = useState(defaultPortfolioId || '');
	const [caseId, setCaseId] = useState(defaultCaseId || '');
	const [bundleId, setBundleId] = useState(defaultBundleId || '');
	const [showHierarchy, setShowHierarchy] = useState(
		!!(defaultPortfolioId || defaultCaseId || defaultBundleId)
	);

	const createFolderMutation = useCreateFolder();
	const { data: portfoliosData, isLoading: loadingPortfolios } = usePortfolios(1, 100);
	const { data: casesData, isLoading: loadingCases } = useCases(1, 100, undefined, portfolioId || undefined);
	const { data: bundlesData, isLoading: loadingBundles } = useBundles(caseId || undefined, 1, 100);

	// Reset dependent selections when parent changes
	useEffect(() => {
		if (!portfolioId) {
			setCaseId('');
			setBundleId('');
		}
	}, [portfolioId]);

	useEffect(() => {
		if (!caseId) {
			setBundleId('');
		}
	}, [caseId]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!title.trim()) return;

		try {
			await createFolderMutation.mutateAsync({
				title: title.trim(),
				parent_id: parentId,
				portfolio_id: portfolioId || undefined,
				case_id: caseId || undefined,
				bundle_id: bundleId || undefined,
			});
			toast.success('Folder created successfully');
			onClose();
		} catch {
			toast.error('Failed to create folder');
		}
	};

	const portfolios = portfoliosData?.items || [];
	const cases = casesData?.items || [];
	const bundles = bundlesData?.items || [];

	return (
		<div
			className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
			onClick={onClose}
		>
			<motion.div
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				className="glass-card w-full max-w-lg overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-lg bg-brass-500/10 flex items-center justify-center text-brass-400">
							<FolderPlus className="w-5 h-5" />
						</div>
						<div>
							<h2 className="text-xl font-display font-semibold text-slate-100">New Folder</h2>
							<p className="text-sm text-slate-500 mt-0.5">Organize your documents</p>
						</div>
					</div>
					<button
						onClick={onClose}
						className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit}>
					<div className="p-6 space-y-5">
						{/* Folder Name */}
						<div className="space-y-2">
							<label htmlFor="folder-name" className="text-sm font-medium text-slate-400">
								Folder Name <span className="text-brass-400">*</span>
							</label>
							<input
								id="folder-name"
								type="text"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="e.g. Invoices 2025"
								className="input-field w-full"
								autoFocus
								required
							/>
						</div>

						{/* Hierarchy Toggle */}
						<div className="space-y-3">
							<button
								type="button"
								onClick={() => setShowHierarchy(!showHierarchy)}
								className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
							>
								<ChevronDown
									className={`w-4 h-4 transition-transform ${showHierarchy ? 'rotate-180' : ''}`}
								/>
								<span>Link to Hierarchy (Optional)</span>
							</button>

							<AnimatePresence>
								{showHierarchy && (
									<motion.div
										initial={{ height: 0, opacity: 0 }}
										animate={{ height: 'auto', opacity: 1 }}
										exit={{ height: 0, opacity: 0 }}
										className="space-y-4 overflow-hidden"
									>
										{/* Portfolio Selection */}
										<div className="space-y-2">
											<label className="flex items-center gap-2 text-sm font-medium text-slate-400">
												<Building2 className="w-4 h-4 text-brass-400" />
												Portfolio
											</label>
											<select
												value={portfolioId}
												onChange={(e) => setPortfolioId(e.target.value)}
												className="input-field w-full appearance-none"
												disabled={loadingPortfolios}
											>
												<option value="">-- No portfolio --</option>
												{portfolios.map((p) => (
													<option key={p.id} value={p.id}>
														{p.name}
													</option>
												))}
											</select>
										</div>

										{/* Case Selection */}
										<div className="space-y-2">
											<label className="flex items-center gap-2 text-sm font-medium text-slate-400">
												<Briefcase className="w-4 h-4 text-emerald-400" />
												Case
											</label>
											<select
												value={caseId}
												onChange={(e) => setCaseId(e.target.value)}
												className="input-field w-full appearance-none"
												disabled={!portfolioId || loadingCases}
											>
												<option value="">-- No case --</option>
												{cases.map((c) => (
													<option key={c.id} value={c.id}>
														{c.caseNumber ? `${c.caseNumber} - ${c.title}` : c.title}
													</option>
												))}
											</select>
											{!portfolioId && (
												<p className="text-xs text-slate-500">Select a portfolio first</p>
											)}
										</div>

										{/* Bundle Selection */}
										<div className="space-y-2">
											<label className="flex items-center gap-2 text-sm font-medium text-slate-400">
												<Package className="w-4 h-4 text-purple-400" />
												Bundle
											</label>
											<select
												value={bundleId}
												onChange={(e) => setBundleId(e.target.value)}
												className="input-field w-full appearance-none"
												disabled={!caseId || loadingBundles}
											>
												<option value="">-- No bundle --</option>
												{bundles.map((b) => (
													<option key={b.id} value={b.id}>
														{b.name}
													</option>
												))}
											</select>
											{!caseId && (
												<p className="text-xs text-slate-500">Select a case first</p>
											)}
										</div>

										{/* Hierarchy Summary */}
										{(portfolioId || caseId || bundleId) && (
											<div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
												<p className="text-xs text-slate-500 mb-1">Folder will be linked to:</p>
												<div className="flex items-center gap-1 text-sm text-slate-300 flex-wrap">
													{portfolioId && (
														<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brass-500/10 text-brass-400 rounded">
															<Building2 className="w-3 h-3" />
															{portfolios.find((p) => p.id === portfolioId)?.name}
														</span>
													)}
													{caseId && (
														<>
															<span className="text-slate-600">→</span>
															<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded">
																<Briefcase className="w-3 h-3" />
																{cases.find((c) => c.id === caseId)?.title}
															</span>
														</>
													)}
													{bundleId && (
														<>
															<span className="text-slate-600">→</span>
															<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded">
																<Package className="w-3 h-3" />
																{bundles.find((b) => b.id === bundleId)?.name}
															</span>
														</>
													)}
												</div>
											</div>
										)}
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					</div>

					{/* Footer */}
					<div className="p-6 border-t border-slate-800/50 flex items-center justify-end gap-3 bg-slate-900/50">
						<button
							type="button"
							onClick={onClose}
							className="btn-ghost"
							disabled={createFolderMutation.isPending}
						>
							Cancel
						</button>
						<button
							type="submit"
							className="btn-primary min-w-[120px]"
							disabled={!title.trim() || createFolderMutation.isPending}
						>
							{createFolderMutation.isPending ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin" />
									Creating...
								</>
							) : (
								'Create Folder'
							)}
						</button>
					</div>
				</form>
			</motion.div>
		</div>
	);
}
