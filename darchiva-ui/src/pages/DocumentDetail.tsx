// (c) Copyright Datacraft, 2026
import { Viewer } from '@/features/documents/components/Viewer';
import { apiClient } from '@/lib/api-client';
import { formatRelativeTime } from '@/lib/utils';
import type { ViewerPage } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft,Calendar,FileText,Loader2,Tag } from 'lucide-react';
import { useNavigate,useParams } from 'react-router-dom';

interface DocumentDetail {
	id: string;
	title: string;
	ctype: 'document';
	createdAt: string;
	updatedAt: string;
	tags: Array<{ id: string; name: string; color: string }>;
	documentType?: { id: string; name: string };
	pageCount?: number;
	ocrStatus?: string;
	versions: Array<{
		id: string;
		number: number;
		pages: Array<{
			id: string;
			number: number;
			text?: string;
		}>;
	}>;
}

export function DocumentDetail() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	// Fetch document details
	const { data: document, isLoading, error } = useQuery({
		queryKey: ['document', id],
		queryFn: async () => {
			const { data } = await apiClient.get<DocumentDetail>(`/documents/${id}`);
			return data;
		},
		enabled: !!id,
	});

	// Fetch document pages for viewer
	const { data: pagesData } = useQuery({
		queryKey: ['document-pages', id],
		queryFn: async () => {
			const { data } = await apiClient.get<{ pages: ViewerPage[] }>(`/documents/${id}/pages`);
			return data;
		},
		enabled: !!id,
	});

	// Handle saving OCR text

	if (isLoading) {
		return (
			<div className="h-full flex items-center justify-center">
				<Loader2 className="w-8 h-8 animate-spin text-brass-500" />
			</div>
		);
	}

	if (error || !document) {
		return (
			<div className="h-full flex flex-col items-center justify-center text-slate-500">
				<FileText className="w-16 h-16 mb-4 opacity-50" />
				<p className="text-lg">Document not found</p>
				<button
					onClick={() => navigate(-1)}
					className="mt-4 btn-secondary"
				>
					<ArrowLeft className="w-4 h-4" />
					Go Back
				</button>
			</div>
		);
	}

	const pages = pagesData?.pages || [];

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			className="h-full flex flex-col"
		>
			{/* Header */}
			<div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
				<div className="flex items-center gap-4">
					<button
						onClick={() => navigate(-1)}
						className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
					>
						<ArrowLeft className="w-5 h-5" />
					</button>
					<div>
						<h1 className="text-xl font-display font-semibold text-slate-100">
							{document.title}
						</h1>
						<div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
							<span className="flex items-center gap-1">
								<Calendar className="w-4 h-4" />
								{formatRelativeTime(document.updatedAt)}
							</span>
							<span>•</span>
							<span>{document.pageCount || pages.length} pages</span>
							{document.ocrStatus && (
								<>
									<span>•</span>
									<span className={
										document.ocrStatus === 'completed' ? 'text-green-400' :
										document.ocrStatus === 'processing' ? 'text-brass-400' :
										'text-slate-500'
									}>
										OCR: {document.ocrStatus}
									</span>
								</>
							)}
						</div>
					</div>
				</div>

				{/* Tags */}
				{document.tags && document.tags.length > 0 && (
					<div className="flex items-center gap-2">
						<Tag className="w-4 h-4 text-slate-500" />
						{document.tags.map((tag) => (
							<span
								key={tag.id}
								className="px-2 py-1 text-xs rounded-full"
								style={{
									backgroundColor: `${tag.color}20`,
									color: tag.color,
								}}
							>
								{tag.name}
							</span>
						))}
					</div>
				)}
			</div>

			{/* Viewer */}
			<div className="flex-1 min-h-0">
				<Viewer
					documentId={id}
					pages={pages}
					isLoading={!pagesData}
				/>
			</div>
		</motion.div>
	);
}
