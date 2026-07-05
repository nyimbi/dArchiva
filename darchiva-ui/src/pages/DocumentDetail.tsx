// (c) Copyright Datacraft, 2026
import { ShareDialog } from '@/features/sharing/ShareDialog';
import { PublicLinkDialog } from '@/features/sharing/PublicLinkDialog';
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
	VersionHistoryPanel,
	type DocumentVersion,
} from '@/features/documents/components/VersionHistoryPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiClient } from '@/lib/api-client';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { ViewerPage } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Activity,ArrowLeft,Bell,Calendar,CheckSquare,Copy,Download,Edit2,FileText,FolderInput,GitCompare,Hash,History,Layers,Lightbulb,Link2,Loader2,Lock,MessageCircle,MessageSquare,MoreHorizontal,PenTool,Printer,QrCode,ScanLine,ScanText,Scissors,Share2,Shield,Stamp,Star,Tag,Tags,Trash2,Users } from 'lucide-react';
import { useMemo,useState } from 'react';
import { useNavigate,useParams } from 'react-router-dom';

interface DocumentDetail {
	id: string;
	title: string;
	ctype: 'document';
	createdAt: string;
	updatedAt: string;
	tags: Array<{ id: string; name: string; color: string }>;
	documentType?: { id: string; name: string };
	fileSize?: number;
	fileType?: string;
	pageCount?: number;
	ocrStatus?: string;
	versions: Array<{
		id: string;
		number: number;
		versionNumber?: number;
		isCurrent?: boolean;
		current?: boolean;
		pages: Array<{
			id: string;
			number: number;
			text?: string;
		}>;
	}>;
}

const API_BASE = '/api/v1';

function triggerDownload(url: string) {
	const a = document.createElement('a');
	a.href = url;
	a.style.display = 'none';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
}

function openPrint(documentId: string) {
	const win = window.open(`${API_BASE}/documents/${documentId}/download`, '_blank');
	win?.addEventListener('load', () => {
		try {
			win.print();
		} catch {
			// Browser PDF viewers may block scripted printing.
		}
	});
}

function formatFileSize(size: number | undefined): string {
	if (!size) return 'Unknown size';
	const units = ['B', 'KB', 'MB', 'GB'];
	let value = size;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	return `${value >= 10 || unit === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}

function ocrBadgeClass(status: string | undefined): string {
	if (status === 'completed') return 'border-green-500/40 bg-green-500/15 text-green-300';
	if (status === 'processing') return 'border-brass-500/40 bg-brass-500/15 text-brass-300';
	if (status === 'failed') return 'border-red-500/40 bg-red-500/15 text-red-300';
	return 'border-slate-700 bg-slate-800 text-slate-300';
}

export function DocumentDetail() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const [showVersionHistory, setShowVersionHistory] = useState(false);
	const [previewVersion, setPreviewVersion] = useState<DocumentVersion | null>(null);
	// Right-panel tab: null = closed, or one of the named panels
	type SidePanel = 'custom-fields' | 'related' | 'similar' | 'entities' | 'expiry' | 'annotations' | 'ocr-quality' | 'ocr-correction' | 'signatures' | 'approvals' | 'duplicates' | 'classification' | 'filing' | 'legal-hold' | 'activity' | 'chat' | 'acl' | 'comments' | 'page-management' | 'serial';
	const [sidePanel, setSidePanel] = useState<SidePanel | null>(null);
	const [showPageEditor, setShowPageEditor] = useState(false);
	const [showSplitDialog, setShowSplitDialog] = useState(false);
	const [showShareDialog, setShowShareDialog] = useState(false);
	const [showPublicLinkDialog, setShowPublicLinkDialog] = useState(false);
	const [showWatermarkDialog, setShowWatermarkDialog] = useState(false);
	const [showQRCodeModal, setShowQRCodeModal] = useState(false);
	const [isFavorite, setIsFavorite] = useState(false);

	const togglePanel = (panel: SidePanel) => {
		setSidePanel((prev) => (prev === panel ? null : panel));
		// Close version history when opening a side panel
		if (showVersionHistory) setShowVersionHistory(false);
		setPreviewVersion(null);
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

	const { data: previewPagesData, isLoading: isPreviewLoading } = useQuery({
		queryKey: ['document-version-pages', id, previewVersion?.id],
		queryFn: async () => {
			const { data } = await apiClient.get<{ pages: ViewerPage[] }>(
				`/documents/${id}/versions/${previewVersion?.id}/pages`,
			);
			return data;
		},
		enabled: !!id && !!previewVersion?.id,
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
	const previewPages = useMemo(() => {
		if (!previewVersion?.id) return [];
		return (previewPagesData?.pages ?? []).map((page, index) => ({
			...page,
			imageUrl:
				page.imageUrl ??
				`${API_BASE}/documents/${id}/versions/${previewVersion.id}/pages/${page.pageNumber ?? index + 1}/image`,
		}));
	}, [id, previewPagesData?.pages, previewVersion?.id]);
	const viewerPages = previewVersion ? previewPages : pages;
	const currentVersionNumber = document.versions?.find((version) => version.isCurrent || version.current)?.versionNumber
		?? document.versions?.find((version) => version.isCurrent || version.current)?.number
		?? document.versions?.reduce((max, version) => Math.max(max, version.versionNumber ?? version.number ?? 0), 0);
	const pageCount = document.pageCount ?? pages.length;
	const typeLabel = document.documentType?.name ?? document.fileType ?? 'Document';
	const panelButtonClass = (active: boolean) =>
		active
			? 'border-brass-500/50 bg-brass-500/20 text-brass-300 hover:bg-brass-500/25'
			: 'border-slate-700 text-slate-400 hover:border-slate-600 hover:bg-slate-800 hover:text-slate-200';
	const toggleHistory = () => {
		setShowVersionHistory((v) => !v);
		setSidePanel(null);
	};

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			className="h-full flex flex-col"
		>
			{/* Header */}
			<div className="border-b border-slate-800 bg-slate-900/50">
				<div className="flex flex-wrap items-start justify-between gap-4 px-6 py-4">
					<div className="flex min-w-0 items-start gap-4">
						<Button
							type="button"
							variant="ghost"
							size="icon"
							onClick={() => navigate(-1)}
							className="h-9 w-9 shrink-0 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
							aria-label="Go back"
						>
							<ArrowLeft className="w-5 h-5" />
						</Button>
						<div className="min-w-0">
							<h1 className="truncate text-xl font-display font-semibold text-slate-100">
								{document.title}
							</h1>
							<div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
								<Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-200">
									{typeLabel}
								</Badge>
								<span className="flex items-center gap-1">
									<Calendar className="w-4 h-4" />
									{formatRelativeTime(document.updatedAt)}
								</span>
								<span>{pageCount} pages</span>
								<span>{formatFileSize(document.fileSize)}</span>
								<Badge variant="outline" className={ocrBadgeClass(document.ocrStatus)}>
									OCR: {document.ocrStatus ?? 'unknown'}
								</Badge>
								{document.tags?.map((tag) => (
									<span
										key={tag.id}
										className="rounded-full px-2 py-0.5 text-xs"
										style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
									>
										{tag.name}
									</span>
								))}
								{previewVersion && (
									<Badge variant="outline" className="border-sky-500/40 bg-sky-500/10 text-sky-300">
										Previewing v{previewVersion.versionNumber ?? previewVersion.number ?? '?'}
									</Badge>
								)}
							</div>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => triggerDownload(`${API_BASE}/documents/${id}/download`)}
							className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
						>
							<Download className="w-4 h-4" />
							Download
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => openPrint(id!)}
							className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
						>
							<Printer className="w-4 h-4" />
							Print
						</Button>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
								>
									<Share2 className="w-4 h-4" />
									Share
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="border-slate-800 bg-slate-900 text-slate-100">
								<DropdownMenuItem onSelect={() => setShowShareDialog(true)}>
									<Users className="mr-2 h-4 w-4" />
									Share with users
								</DropdownMenuItem>
								<DropdownMenuItem onSelect={() => setShowPublicLinkDialog(true)}>
									<Link2 className="mr-2 h-4 w-4" />
									Create public link
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
						<Button
							type="button"
							variant="outline"
							size="icon"
							onClick={() => setIsFavorite((v) => !v)}
							className={cn(
								'h-8 w-8 border-slate-700 bg-slate-900 hover:bg-slate-800',
								isFavorite ? 'text-brass-300' : 'text-slate-300',
							)}
							aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
						>
							<Star className={cn('w-4 h-4', isFavorite && 'fill-current')} />
						</Button>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									type="button"
									variant="outline"
									size="icon"
									className="h-8 w-8 border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
									aria-label="More document actions"
								>
									<MoreHorizontal className="w-4 h-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="border-slate-800 bg-slate-900 text-slate-100">
								<DropdownMenuItem>
									<FolderInput className="mr-2 h-4 w-4" />
									Move
								</DropdownMenuItem>
								<DropdownMenuItem>
									<Copy className="mr-2 h-4 w-4" />
									Copy
								</DropdownMenuItem>
								<DropdownMenuItem onSelect={toggleHistory}>
									<History className="mr-2 h-4 w-4" />
									History
								</DropdownMenuItem>
								<DropdownMenuSeparator className="bg-slate-800" />
								<DropdownMenuItem className="text-red-300 focus:text-red-200">
									<Trash2 className="mr-2 h-4 w-4" />
									Delete
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>

				<div className="flex gap-2 overflow-x-auto border-t border-slate-800 px-6 py-2">
					<Button type="button" variant="outline" size="sm" onClick={toggleHistory} className={panelButtonClass(showVersionHistory)}>
						<History className="w-3.5 h-3.5" /> History
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={() => togglePanel('custom-fields')} className={panelButtonClass(sidePanel === 'custom-fields')}>
						<Tag className="w-3.5 h-3.5" /> Fields
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={() => togglePanel('related')} className={panelButtonClass(sidePanel === 'related')}>
						<GitCompare className="w-3.5 h-3.5" /> Related
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={() => togglePanel('similar')} className={panelButtonClass(sidePanel === 'similar')}>
						<FileText className="w-3.5 h-3.5" /> Similar
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={() => setShowSplitDialog(true)} className={panelButtonClass(false)}>
						<Scissors className="w-3.5 h-3.5" /> Split
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={() => setShowWatermarkDialog(true)} className={panelButtonClass(false)}>
						<Stamp className="w-3.5 h-3.5" /> Watermark
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={() => togglePanel('entities')} className={panelButtonClass(sidePanel === 'entities')}>
						<Tags className="w-3.5 h-3.5" /> Entities
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={() => togglePanel('expiry')} className={panelButtonClass(sidePanel === 'expiry')}>
						<Bell className="w-3.5 h-3.5" /> Expiry
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={() => togglePanel('annotations')} className={panelButtonClass(sidePanel === 'annotations')}>
						<MessageSquare className="w-3.5 h-3.5" /> Annotations
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={() => togglePanel('ocr-quality')} className={panelButtonClass(sidePanel === 'ocr-quality')}>
						<ScanLine className="w-3.5 h-3.5" /> OCR Quality
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={() => togglePanel('ocr-correction')} className={panelButtonClass(sidePanel === 'ocr-correction')}>
						<ScanText className="w-3.5 h-3.5" /> Correct OCR
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={() => togglePanel('signatures')} className={panelButtonClass(sidePanel === 'signatures')}>
						<PenTool className="w-3.5 h-3.5" /> Signatures
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={() => setShowQRCodeModal(true)} className={panelButtonClass(false)}>
						<QrCode className="w-3.5 h-3.5" /> QR Label
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={() => togglePanel('approvals')} className={panelButtonClass(sidePanel === 'approvals')}>
						<CheckSquare className="w-3.5 h-3.5" /> Approvals
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={() => togglePanel('duplicates')} className={panelButtonClass(sidePanel === 'duplicates')}>
						<Copy className="w-3.5 h-3.5" /> Duplicates
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={() => togglePanel('classification')} className={panelButtonClass(sidePanel === 'classification')}>
						<Layers className="w-3.5 h-3.5" /> Classification
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={() => togglePanel('filing')} className={panelButtonClass(sidePanel === 'filing')}>
						<Lightbulb className="w-3.5 h-3.5" /> Filing
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={() => togglePanel('legal-hold')} className={panelButtonClass(sidePanel === 'legal-hold')}>
						<Shield className="w-3.5 h-3.5" /> Hold
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={() => togglePanel('activity')} className={panelButtonClass(sidePanel === 'activity')}>
						<Activity className="w-3.5 h-3.5" /> Activity
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={() => togglePanel('chat')} className={panelButtonClass(sidePanel === 'chat')}>
						<MessageCircle className="w-3.5 h-3.5" /> Q&amp;A
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={() => togglePanel('acl')} className={panelButtonClass(sidePanel === 'acl')}>
						<Lock className="w-3.5 h-3.5" /> Access
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={() => togglePanel('comments')} className={panelButtonClass(sidePanel === 'comments')}>
						<MessageCircle className="w-3.5 h-3.5" /> Comments
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={() => togglePanel('page-management')} className={panelButtonClass(sidePanel === 'page-management')}>
						<Layers className="w-3.5 h-3.5" /> Pages
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={() => setShowPageEditor(true)} className={panelButtonClass(false)}>
						<Edit2 className="w-3.5 h-3.5" /> Edit Pages
					</Button>
					<Button type="button" variant="outline" size="sm" onClick={() => togglePanel('serial')} className={panelButtonClass(sidePanel === 'serial')}>
						<Hash className="w-3.5 h-3.5" /> Serial
					</Button>
				</div>
			</div>

			{/* Main content area — viewer + optional sidebars */}
			<div className="flex-1 min-h-0 flex">
				{/* Document viewer */}
				<div className="flex-1 min-w-0">
					<Viewer
						documentId={id}
						pages={viewerPages}
						isLoading={previewVersion ? isPreviewLoading : !pagesData}
					/>
				</div>

				{/* Version history sidebar */}
				{showVersionHistory && (
					<div className="w-[28rem] shrink-0 border-l border-slate-800 bg-slate-900/50 overflow-y-auto">
						<VersionHistoryPanel
							documentId={id!}
							currentVersionNumber={currentVersionNumber}
							previewVersionId={previewVersion?.id}
							onPreview={setPreviewVersion}
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

			{/* Public link dialog */}
			{showPublicLinkDialog && (
				<PublicLinkDialog
					open={showPublicLinkDialog}
					documentId={id!}
					documentTitle={document?.title ?? ''}
					onClose={() => setShowPublicLinkDialog(false)}
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
