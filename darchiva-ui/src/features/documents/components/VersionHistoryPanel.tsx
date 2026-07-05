// (c) Copyright Datacraft, 2026
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	Download,
	Eye,
	GitCompare,
	History,
	Loader2,
	RotateCcw,
	Upload,
} from 'lucide-react';
import { type ChangeEvent, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const API_BASE = '/api/v1';

interface VersionUser {
	id?: string;
	name?: string;
	fullName?: string;
	email?: string;
	avatarUrl?: string;
}

export interface DocumentVersion {
	id: string;
	number?: number;
	versionNumber?: number;
	createdAt?: string;
	uploadedAt?: string;
	updatedAt?: string;
	fileSize?: number;
	size?: number;
	shortDescription?: string;
	changeDescription?: string;
	description?: string;
	isCurrent?: boolean;
	current?: boolean;
	uploadedBy?: VersionUser | string | null;
	user?: VersionUser | string | null;
	createdBy?: VersionUser | string | null;
}

interface VersionHistoryPanelProps {
	documentId: string;
	currentVersionNumber?: number;
	previewVersionId?: string | null;
	onPreview: (version: DocumentVersion) => void;
}

function versionNumber(version: DocumentVersion): number {
	return version.versionNumber ?? version.number ?? 0;
}

function versionDate(version: DocumentVersion): string | undefined {
	return version.uploadedAt ?? version.createdAt ?? version.updatedAt;
}

function versionDescription(version: DocumentVersion): string {
	return (
		version.changeDescription ??
		version.shortDescription ??
		version.description ??
		'No change description'
	);
}

function uploadedBy(version: DocumentVersion): VersionUser {
	const raw = version.uploadedBy ?? version.user ?? version.createdBy;
	if (!raw) return { name: 'Unknown user' };
	if (typeof raw === 'string') return { name: raw };
	return raw;
}

function userName(user: VersionUser): string {
	return user.fullName ?? user.name ?? user.email ?? 'Unknown user';
}

function initials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return '?';
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
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

function downloadUrl(documentId: string, versionId: string): string {
	return `${API_BASE}/documents/${documentId}/versions/${versionId}/download`;
}

export function VersionHistoryPanel({
	documentId,
	currentVersionNumber,
	previewVersionId,
	onPreview,
}: VersionHistoryPanelProps) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const { data: versions = [], isLoading, isError } = useQuery<DocumentVersion[]>({
		queryKey: ['document-versions', documentId],
		queryFn: async () => {
			const { data } = await apiClient.get<DocumentVersion[]>(`/documents/${documentId}/versions`);
			return data;
		},
		enabled: Boolean(documentId),
	});

	const sorted = useMemo(
		() => [...versions].sort((a, b) => versionNumber(b) - versionNumber(a)),
		[versions],
	);

	const inferredCurrent = currentVersionNumber ?? sorted[0]?.versionNumber ?? sorted[0]?.number;

	const restoreMutation = useMutation({
		mutationFn: async (versionId: string) => {
			await apiClient.post(`/documents/${documentId}/versions/${versionId}/restore`);
		},
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['document', documentId] }),
				queryClient.invalidateQueries({ queryKey: ['document-pages', documentId] }),
				queryClient.invalidateQueries({ queryKey: ['document-versions', documentId] }),
				queryClient.invalidateQueries({ queryKey: ['activity', 'document', documentId] }),
			]);
			toast.success('Version restored');
		},
		onError: () => toast.error('Failed to restore version'),
	});

	const uploadMutation = useMutation({
		mutationFn: async (file: File) => {
			const formData = new FormData();
			formData.append('file', file);
			await apiClient.post(`/documents/${documentId}/versions`, formData);
		},
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['document', documentId] }),
				queryClient.invalidateQueries({ queryKey: ['document-pages', documentId] }),
				queryClient.invalidateQueries({ queryKey: ['document-versions', documentId] }),
				queryClient.invalidateQueries({ queryKey: ['activity', 'document', documentId] }),
			]);
			toast.success('New version uploaded');
		},
		onError: () => toast.error('Failed to upload version'),
	});

	function handleUploadChange(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (file) uploadMutation.mutate(file);
		event.target.value = '';
	}

	function handleCompare(version: DocumentVersion) {
		const params = new URLSearchParams({
			docId: documentId,
			v1: version.id,
			v2: 'current',
		});
		navigate(`/compare?${params.toString()}`);
	}

	return (
		<div className="flex h-full flex-col">
			<div className="border-b border-slate-800 px-4 py-3">
				<div className="flex items-center justify-between gap-3">
					<div>
						<h3 className="flex items-center gap-2 text-sm font-semibold text-slate-100">
							<History className="h-4 w-4 text-brass-400" />
							Version History
						</h3>
						<p className="mt-1 text-xs text-slate-500">
							{sorted.length} saved {sorted.length === 1 ? 'version' : 'versions'}
						</p>
					</div>
					<Button
						type="button"
						size="sm"
						onClick={() => fileInputRef.current?.click()}
						disabled={uploadMutation.isPending}
						className="h-8 bg-brass-600 text-slate-950 hover:bg-brass-500"
					>
						{uploadMutation.isPending ? (
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
						) : (
							<Upload className="h-3.5 w-3.5" />
						)}
						Upload
					</Button>
					<input
						ref={fileInputRef}
						type="file"
						className="sr-only"
						onChange={handleUploadChange}
					/>
				</div>
			</div>

			{isLoading && (
				<div className="flex flex-1 items-center justify-center">
					<Loader2 className="h-5 w-5 animate-spin text-slate-600" />
				</div>
			)}

			{isError && (
				<div className="p-6 text-center text-sm text-red-400">
					Failed to load version history.
				</div>
			)}

			{!isLoading && !isError && sorted.length === 0 && (
				<div className="p-8 text-center text-sm text-slate-500">
					No versions recorded yet.
				</div>
			)}

			{!isLoading && !isError && sorted.length > 0 && (
				<div className="flex-1 overflow-y-auto px-4 py-3">
					<div className="relative space-y-4 before:absolute before:bottom-2 before:left-5 before:top-2 before:w-px before:bg-slate-800">
						{sorted.map((version) => {
							const number = versionNumber(version);
							const date = versionDate(version);
							const user = uploadedBy(version);
							const name = userName(user);
							const isCurrent =
								version.isCurrent ||
								version.current ||
								(Boolean(inferredCurrent) && number === inferredCurrent);
							const isPreviewing = previewVersionId === version.id;

							return (
								<div key={version.id} className="relative flex gap-3">
									<div className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brass-500/30 bg-slate-950">
										<span className="text-xs font-mono font-semibold text-brass-300">
											v{number || '?'}
										</span>
									</div>
									<div
										className={cn(
											'min-w-0 flex-1 rounded-lg border bg-slate-900/70 p-3',
											isCurrent
												? 'border-brass-500/40 bg-brass-500/10'
												: 'border-slate-800',
										)}
									>
										<div className="flex items-start justify-between gap-2">
											<div className="min-w-0">
												<div className="flex flex-wrap items-center gap-2">
													<span className="text-sm font-medium text-slate-100">
														Version {number || '?'}
													</span>
													{isCurrent && (
														<Badge className="border-brass-500/40 bg-brass-500/15 text-brass-200">
															Current
														</Badge>
													)}
													{isPreviewing && (
														<Badge variant="outline" className="border-sky-500/40 text-sky-300">
															Previewing
														</Badge>
													)}
												</div>
												{date && (
													<time
														className="mt-1 block text-xs text-slate-500"
														dateTime={date}
														title={new Date(date).toLocaleString()}
													>
														{formatRelativeTime(date)}
													</time>
												)}
											</div>
										</div>

										<div className="mt-3 flex items-center gap-2">
											<Avatar className="h-7 w-7">
												{user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={name} />}
												<AvatarFallback className="bg-slate-800 text-[10px] font-semibold text-slate-300">
													{initials(name)}
												</AvatarFallback>
											</Avatar>
											<div className="min-w-0">
												<p className="truncate text-xs font-medium text-slate-300">{name}</p>
												<p className="text-xs text-slate-600">
													{formatFileSize(version.fileSize ?? version.size)}
												</p>
											</div>
										</div>

										<p className="mt-3 text-sm leading-snug text-slate-400">
											{versionDescription(version)}
										</p>

										<div className="mt-3 grid grid-cols-2 gap-2">
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => onPreview(version)}
												className="h-8 border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800"
											>
												<Eye className="h-3.5 w-3.5" />
												Preview
											</Button>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={() => handleCompare(version)}
												disabled={isCurrent}
												className="h-8 border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
											>
												<GitCompare className="h-3.5 w-3.5" />
												Compare
											</Button>
											<Button
												asChild
												type="button"
												variant="outline"
												size="sm"
												className="h-8 border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800"
											>
												<a href={downloadUrl(documentId, version.id)} download>
													<Download className="h-3.5 w-3.5" />
													Download
												</a>
											</Button>
											<AlertDialog>
												<AlertDialogTrigger asChild>
													<Button
														type="button"
														variant="outline"
														size="sm"
														disabled={isCurrent || restoreMutation.isPending}
														className="h-8 border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
													>
														<RotateCcw className="h-3.5 w-3.5" />
														Restore
													</Button>
												</AlertDialogTrigger>
												<AlertDialogContent className="border-slate-800 bg-slate-950 text-slate-100">
													<AlertDialogHeader>
														<AlertDialogTitle>Restore version {number || '?'}?</AlertDialogTitle>
														<AlertDialogDescription className="text-slate-400">
															This creates a new current version from the selected historical file.
														</AlertDialogDescription>
													</AlertDialogHeader>
													<AlertDialogFooter>
														<AlertDialogCancel className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800">
															Cancel
														</AlertDialogCancel>
														<AlertDialogAction
															onClick={() => restoreMutation.mutate(version.id)}
															className="bg-brass-600 text-slate-950 hover:bg-brass-500"
														>
															Restore version
														</AlertDialogAction>
													</AlertDialogFooter>
												</AlertDialogContent>
											</AlertDialog>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
