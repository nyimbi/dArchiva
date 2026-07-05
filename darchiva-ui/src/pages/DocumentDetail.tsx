// (c) Copyright Datacraft, 2026
import { ShareDialog } from '@/features/sharing/ShareDialog';
import { WatermarkDialog } from '@/features/documents/components/WatermarkDialog';
import { AnnotationsPanel } from '@/features/documents/components/AnnotationsPanel';
import { CustomFieldsPanel } from '@/features/documents/components/CustomFieldsPanel';
import { EntityPanel } from '@/features/documents/components/EntityPanel';
import { ExpiryPanel } from '@/features/documents/components/ExpiryPanel';
import { OCRQualityPanel } from '@/features/documents/components/OCRQualityPanel';
import { QRCodeModal } from '@/features/documents/components/QRCodeModal';
import { RelatedDocumentsPanel } from '@/features/documents/components/RelatedDocumentsPanel';
import { SimilarDocuments } from '@/features/documents/components/SimilarDocuments';
import { SplitDocumentDialog } from '@/features/documents/components/SplitDocumentDialog';
import { Viewer } from '@/features/documents/components/Viewer';
import { SignaturePanel } from '@/features/signatures/SignaturePanel';
import { ApprovalPanel } from '@/features/approvals/ApprovalPanel';
import { DuplicatesPanel } from '@/features/documents/components/DuplicatesPanel';
import { ClassificationPanel } from '@/features/classification/ClassificationPanel';
import { PageEditor } from '@/features/documents/components/PageEditor';
import { DownloadMenu } from '@/features/documents/components/DownloadMenu';
import { FilingSuggestionsPanel } from '@/features/documents/components/FilingSuggestionsPanel';
import { LegalHoldPanel } from '@/features/legal-hold/LegalHoldPanel';
import { ActivityPanel } from '@/features/activity/ActivityPanel';
import { ChatPanel } from '@/features/document-chat';
import { ACLPanel } from '@/features/acl/ACLPanel';
import { CommentsPanel } from '@/features/comments/CommentsPanel';
import { SerialPanel } from '@/features/serial-numbers';
import { OCRCorrectionPanel } from '@/features/ocr-correction';
import { PageManagementPanel } from '@/features/page-management';
import {
	VersionDiffViewer,
	VersionHistoryWithCompare,
	type DocVerListItem,
} from '@/features/documents/components/VersionDiffViewer';
import { apiClient } from '@/lib/api-client';
import { formatRelativeTime } from '@/lib/utils';
import type { ViewerPage } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Activity,ArrowLeft,Bell,Calendar,CheckSquare,Copy,Download,Edit2,FileText,GitCompare,Hash,History,Layers,Lightbulb,Loader2,Lock,MessageCircle,MessageSquare,PenTool,QrCode,ScanLine,ScanText,Scissors,Share2,Shield,Stamp,Tag,Tags } from 'lucide-react';
import { useState } from 'react';
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

	// Diff state: null means no diff panel open
	const [diff, setDiff] = useState<{ versionA: number; versionB: number } | null>(null);
	const [showVersionHistory, setShowVersionHistory] = useState(false);
	// Right-panel tab: null = closed, or one of the named panels
	type SidePanel = 'custom-fields' | 'related' | 'similar' | 'entities' | 'expiry' | 'annotations' | 'ocr-quality' | 'ocr-correction' | 'signatures' | 'approvals' | 'duplicates' | 'classification' | 'filing' | 'legal-hold' | 'activity' | 'chat' | 'acl' | 'comments' | 'page-management' | 'serial';
	const [sidePanel, setSidePanel] = useState<SidePanel | null>(null);
	const [showPageEditor, setShowPageEditor] = useState(false);
	const [showSplitDialog, setShowSplitDialog] = useState(false);
	const [showShareDialog, setShowShareDialog] = useState(false);
	const [showWatermarkDialog, setShowWatermarkDialog] = useState(false);
	const [showQRCodeModal, setShowQRCodeModal] = useState(false);

	const togglePanel = (panel: SidePanel) => {
		setSidePanel((prev) => (prev === panel ? null : panel));
		// Close version history when opening a side panel
		if (showVersionHistory) setShowVersionHistory(false);
		setDiff(null);
	};

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

	// Fetch version list (for history panel)
	const { data: versionsData } = useQuery<DocVerListItem[]>({
		queryKey: ['document-versions', id],
		queryFn: async () => {
			const { data } = await apiClient.get<DocVerListItem[]>(`/documents/${id}/versions`);
			return data;
		},
		enabled: !!id && showVersionHistory,
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

				{/* Tags + Version history toggle */}
				<div className="flex items-center gap-3">
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
					<button
						onClick={() => { setShowVersionHistory((v) => !v); setDiff(null); setSidePanel(null); }}
						className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
							showVersionHistory
								? 'bg-brass-500/20 border-brass-500/50 text-brass-300'
								: 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
						}`}
						title="Version history"
					>
						<History className="w-3.5 h-3.5" />
						History
					</button>
					<button
						onClick={() => togglePanel('custom-fields')}
						className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
							sidePanel === 'custom-fields'
								? 'bg-brass-500/20 border-brass-500/50 text-brass-300'
								: 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
						}`}
						title="Custom fields"
					>
						<Tag className="w-3.5 h-3.5" />
						Fields
					</button>
					<button
						onClick={() => togglePanel('related')}
						className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
							sidePanel === 'related'
								? 'bg-brass-500/20 border-brass-500/50 text-brass-300'
								: 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
						}`}
						title="Related documents"
					>
						<GitCompare className="w-3.5 h-3.5" />
						Related
					</button>
					<button
						onClick={() => togglePanel('similar')}
						className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
							sidePanel === 'similar'
								? 'bg-brass-500/20 border-brass-500/50 text-brass-300'
								: 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
						}`}
						title="Similar documents"
					>
						<FileText className="w-3.5 h-3.5" />
						Similar
					</button>
					<button
						onClick={() => setShowSplitDialog(true)}
						className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
						title="Split document"
					>
						<Scissors className="w-3.5 h-3.5" />
						Split
					</button>
					<button
						onClick={() => setShowShareDialog(true)}
						className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
						title="Share document"
					>
						<Share2 className="w-3.5 h-3.5" />
						Share
					</button>
					<button
						onClick={() => setShowWatermarkDialog(true)}
						className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
						title="Apply watermark"
					>
						<Stamp className="w-3.5 h-3.5" />
						Watermark
					</button>
					<button
						onClick={() => togglePanel('entities')}
						className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
							sidePanel === 'entities'
								? 'bg-brass-500/20 border-brass-500/50 text-brass-300'
								: 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
						}`}
						title="Named entities"
					>
						<Tags className="w-3.5 h-3.5" />
						Entities
					</button>
					<button
						onClick={() => togglePanel('expiry')}
						className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
							sidePanel === 'expiry'
								? 'bg-brass-500/20 border-brass-500/50 text-brass-300'
								: 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
						}`}
						title="Expiry & reminders"
					>
						<Bell className="w-3.5 h-3.5" />
						Expiry
					</button>
					<button
						onClick={() => togglePanel('annotations')}
						className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
							sidePanel === 'annotations'
								? 'bg-brass-500/20 border-brass-500/50 text-brass-300'
								: 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
						}`}
						title="Annotations"
					>
						<MessageSquare className="w-3.5 h-3.5" />
						Annotations
					</button>
					<button
						onClick={() => togglePanel('ocr-quality')}
						className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
							sidePanel === 'ocr-quality'
								? 'bg-brass-500/20 border-brass-500/50 text-brass-300'
								: 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
						}`}
						title="OCR Quality"
					>
						<ScanLine className="w-3.5 h-3.5" />
						OCR Quality
					</button>
					<button
						onClick={() => togglePanel('ocr-correction')}
						className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
							sidePanel === 'ocr-correction'
								? 'bg-brass-500/20 border-brass-500/50 text-brass-300'
								: 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
						}`}
						title="Correct OCR"
					>
						<ScanText className="w-3.5 h-3.5" />
						Correct OCR
					</button>
					<button
						onClick={() => togglePanel('signatures')}
						className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
							sidePanel === 'signatures'
								? 'bg-brass-500/20 border-brass-500/50 text-brass-300'
								: 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
						}`}
						title="Signatures"
					>
						<PenTool className="w-3.5 h-3.5" />
						Signatures
					</button>
					<button
						onClick={() => setShowQRCodeModal(true)}
						className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
						title="QR Code label"
					>
						<QrCode className="w-3.5 h-3.5" />
						QR Label
					</button>
					<button
						onClick={() => togglePanel('approvals')}
						className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
							sidePanel === 'approvals'
								? 'bg-brass-500/20 border-brass-500/50 text-brass-300'
								: 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
						}`}
						title="Approvals"
					>
						<CheckSquare className="w-3.5 h-3.5" />
						Approvals
					</button>
					<button
						onClick={() => togglePanel('duplicates')}
						className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
							sidePanel === 'duplicates'
								? 'bg-brass-500/20 border-brass-500/50 text-brass-300'
								: 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
						}`}
						title="Duplicates"
					>
						<Copy className="w-3.5 h-3.5" />
						Duplicates
					</button>
					<button
						onClick={() => togglePanel('classification')}
						className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
							sidePanel === 'classification'
								? 'bg-brass-500/20 border-brass-500/50 text-brass-300'
								: 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
						}`}
						title="Classification"
					>
						<Layers className="w-3.5 h-3.5" />
						Classification
					</button>
					<button
						onClick={() => togglePanel('filing')}
						className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
							sidePanel === 'filing'
								? 'bg-brass-500/20 border-brass-500/50 text-brass-300'
								: 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
						}`}
						title="Filing suggestions"
					>
						<Lightbulb className="w-3.5 h-3.5" />
						Filing
					</button>
					<button
						onClick={() => togglePanel('legal-hold')}
						className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
							sidePanel === 'legal-hold'
								? 'bg-brass-500/20 border-brass-500/50 text-brass-300'
								: 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
						}`}
						title="Legal hold"
					>
						<Shield className="w-3.5 h-3.5" />
						Hold
					</button>
					<button
						onClick={() => togglePanel('activity')}
						className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
							sidePanel === 'activity'
								? 'bg-brass-500/20 border-brass-500/50 text-brass-300'
								: 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
						}`}
						title="Activity feed"
					>
						<Activity className="w-3.5 h-3.5" />
						Activity
					</button>
					<button
						onClick={() => togglePanel('chat')}
						className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
							sidePanel === 'chat'
								? 'bg-brass-500/20 border-brass-500/50 text-brass-300'
								: 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
						}`}
						title="Document Q&A"
					>
						<MessageCircle className="w-3.5 h-3.5" />
						Q&amp;A
					</button>
					<button
						onClick={() => togglePanel('acl')}
						className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
							sidePanel === 'acl'
								? 'bg-brass-500/20 border-brass-500/50 text-brass-300'
								: 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
						}`}
						title="Access control"
					>
						<Lock className="w-3.5 h-3.5" />
						Access
					</button>
					<button
						onClick={() => togglePanel('comments')}
						className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
							sidePanel === 'comments'
								? 'bg-brass-500/20 border-brass-500/50 text-brass-300'
								: 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
						}`}
						title="Comments"
					>
						<MessageCircle className="w-3.5 h-3.5" />
						Comments
					</button>
					<DownloadMenu
						documentId={id!}
						documentTitle={document.title}
						pageCount={document.pageCount ?? pages.length}
					/>
					<button
						onClick={() => togglePanel('page-management')}
						className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
							sidePanel === 'page-management'
								? 'bg-brass-500/20 border-brass-500/50 text-brass-300'
								: 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
						}`}
						title="Manage Pages"
					>
						<Layers className="w-3.5 h-3.5" />
						Pages
					</button>
					<button
						onClick={() => setShowPageEditor(true)}
						className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors"
						title="Edit pages"
					>
						<Edit2 className="w-3.5 h-3.5" />
						Edit Pages
					</button>
					<button
						onClick={() => togglePanel('serial')}
						className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
							sidePanel === 'serial'
								? 'bg-brass-500/20 border-brass-500/50 text-brass-300'
								: 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
						}`}
						title="Serial number"
					>
						<Hash className="w-3.5 h-3.5" />
						Serial
					</button>
				</div>
			</div>

			{/* Main content area — viewer + optional sidebars */}
			<div className="flex-1 min-h-0 flex">
				{/* Document viewer */}
				<div className="flex-1 min-w-0">
					<Viewer
						documentId={id}
						pages={pages}
						isLoading={!pagesData}
					/>
				</div>

				{/* Version history sidebar */}
				{showVersionHistory && !diff && (
					<div className="w-64 shrink-0 border-l border-slate-800 bg-slate-900/50 overflow-y-auto">
						{versionsData ? (
							<VersionHistoryWithCompare
								documentId={id!}
								versions={versionsData}
								onCompare={(vA, vB) => setDiff({ versionA: vA, versionB: vB })}
							/>
						) : (
							<div className="flex items-center justify-center h-24">
								<Loader2 className="w-5 h-5 animate-spin text-slate-600" />
							</div>
						)}
					</div>
				)}

				{/* Diff panel — replaces history sidebar when a comparison is active */}
				{diff && (
					<div className="w-1/2 shrink-0 border-l border-slate-800">
						<VersionDiffViewer
							documentId={id!}
							versionA={diff.versionA}
							versionB={diff.versionB}
							onClose={() => setDiff(null)}
						/>
					</div>
				)}

				{/* Custom fields panel */}
				{sidePanel === 'custom-fields' && (
					<div className="w-72 shrink-0 border-l border-slate-800 bg-slate-900/50 overflow-y-auto">
						<CustomFieldsPanel documentId={id!} />
					</div>
				)}

				{/* Related documents panel */}
				{sidePanel === 'related' && (
					<div className="w-72 shrink-0 border-l border-slate-800 bg-slate-900/50 overflow-y-auto">
						<RelatedDocumentsPanel documentId={id!} />
					</div>
				)}

				{/* Similar documents panel */}
				{sidePanel === 'similar' && (
					<div className="w-72 shrink-0 border-l border-slate-800 bg-slate-900/50 overflow-y-auto">
						<SimilarDocuments documentId={id!} />
					</div>
				)}

				{/* Named entities panel */}
				{sidePanel === 'entities' && (
					<div className="w-72 shrink-0 border-l border-slate-800 bg-slate-900/50 overflow-y-auto">
						<EntityPanel documentId={id!} />
					</div>
				)}

				{/* Expiry & reminders panel */}
				{sidePanel === 'expiry' && (
					<div className="w-72 shrink-0 border-l border-slate-800 bg-slate-900/50 overflow-y-auto">
						<ExpiryPanel documentId={id!} />
					</div>
				)}

				{/* Annotations panel */}
				{sidePanel === 'annotations' && (
					<div className="w-72 shrink-0 border-l border-slate-800 bg-slate-900/50 overflow-y-auto">
						<AnnotationsPanel documentId={id!} />
					</div>
				)}

				{/* OCR quality panel */}
				{sidePanel === 'ocr-quality' && (
					<div className="w-72 shrink-0 border-l border-slate-800 bg-slate-900/50 overflow-y-auto">
						<OCRQualityPanel documentId={id!} />
					</div>
				)}

				{/* Signatures panel */}
				{sidePanel === 'signatures' && (
					<div className="w-80 shrink-0 border-l border-slate-800 bg-slate-900/50 overflow-y-auto">
						<SignaturePanel documentId={id!} />
					</div>
				)}

				{/* Approvals panel */}
				{sidePanel === 'approvals' && (
					<div className="w-80 shrink-0 border-l border-slate-800 bg-slate-900/50 overflow-y-auto">
						<ApprovalPanel documentId={id!} />
					</div>
				)}

				{/* Duplicates panel */}
				{sidePanel === 'duplicates' && (
					<div className="w-72 shrink-0 border-l border-slate-800 bg-slate-900/50 overflow-y-auto">
						<DuplicatesPanel documentId={id!} />
					</div>
				)}

				{/* Classification panel */}
				{sidePanel === 'classification' && (
					<div className="w-72 shrink-0 border-l border-slate-800 bg-slate-900/50 overflow-y-auto">
						<ClassificationPanel documentId={id!} />
					</div>
				)}

				{/* Filing suggestions panel */}
				{sidePanel === 'filing' && (
					<div className="w-72 shrink-0 border-l border-slate-800 bg-slate-900/50 overflow-y-auto">
						<FilingSuggestionsPanel documentId={id!} />
					</div>
				)}

				{/* Legal hold panel */}
				{sidePanel === 'legal-hold' && (
					<div className="w-80 shrink-0 border-l border-slate-800 bg-slate-900/50 overflow-y-auto">
						<LegalHoldPanel documentId={id!} />
					</div>
				)}

				{/* Activity feed panel */}
				{sidePanel === 'activity' && (
					<div className="w-80 shrink-0 border-l border-slate-800 bg-slate-900/50 overflow-y-auto">
						<ActivityPanel documentId={id!} />
					</div>
				)}

				{/* Document Q&A chat panel */}
				{sidePanel === 'chat' && (
					<div className="w-96 shrink-0 border-l border-slate-800 flex flex-col">
						<ChatPanel documentId={id!} />
					</div>
				)}

				{/* ACL panel */}
				{sidePanel === 'acl' && (
					<div className="w-72 shrink-0 border-l border-slate-800 bg-slate-900/50 overflow-y-auto">
						<ACLPanel documentId={id!} />
					</div>
				)}

				{/* Comments panel */}
				{sidePanel === 'comments' && (
					<div className="w-80 shrink-0 border-l border-slate-800 bg-slate-900/50 overflow-y-auto">
						<CommentsPanel documentId={id!} />
					</div>
				)}

				{/* OCR correction panel */}
				{sidePanel === 'ocr-correction' && (
					<div className="w-96 shrink-0 border-l border-slate-800 flex flex-col">
						<OCRCorrectionPanel
							documentId={id!}
							pageCount={document.pageCount ?? pages.length}
						/>
					</div>
				)}

				{/* Page management panel — reorder, rotate, delete, extract */}
				{sidePanel === 'page-management' && (
					<div className="w-80 shrink-0 border-l border-slate-800 bg-slate-900/50 overflow-y-auto flex flex-col">
						<PageManagementPanel documentId={id!} pages={pages} />
					</div>
				)}

				{/* Serial number panel */}
				{sidePanel === 'serial' && (
					<div className="w-72 shrink-0 border-l border-slate-800 bg-slate-900/50 overflow-y-auto">
						<SerialPanel documentId={id!} />
					</div>
				)}
			</div>

			{/* Page editor modal — rendered outside the flex row */}
			{showPageEditor && (
				<PageEditor
					documentId={id!}
					pageCount={document.pageCount ?? pages.length}
					onClose={() => setShowPageEditor(false)}
				/>
			)}

			{/* QR Code modal — rendered outside the flex row */}
			{showQRCodeModal && (
				<QRCodeModal
					open={showQRCodeModal}
					documentId={id!}
					documentTitle={document?.title ?? ''}
					onClose={() => setShowQRCodeModal(false)}
				/>
			)}

			{/* Split document dialog — rendered outside the flex row */}
			{showSplitDialog && (
				<SplitDocumentDialog
					open={showSplitDialog}
					documentId={id!}
					documentTitle={document?.title ?? ''}
					pageCount={document?.pageCount ?? 1}
					onClose={() => setShowSplitDialog(false)}
				/>
			)}

			{/* Share dialog */}
			{showShareDialog && (
				<ShareDialog
					open={showShareDialog}
					documentId={id!}
					documentTitle={document?.title ?? ''}
					onClose={() => setShowShareDialog(false)}
				/>
			)}

			{/* Watermark dialog */}
			{showWatermarkDialog && (
				<WatermarkDialog
					open={showWatermarkDialog}
					documentId={id!}
					onClose={() => setShowWatermarkDialog(false)}
				/>
			)}
		</motion.div>
	);
}
