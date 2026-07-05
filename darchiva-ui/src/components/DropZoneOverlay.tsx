// (c) Copyright Datacraft, 2026
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { documentKeys } from '@/features/documents/api';
import { cn, formatBytes } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, File, Loader2, Upload, XCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';

interface UploadRow {
	id: string;
	file: File;
	progress: number;
	status: UploadStatus;
	error?: string;
}

interface DropZoneOverlayProps {
	isDragging: boolean;
	files: File[];
	parentId?: string;
	uploadId: number;
	onClose: () => void;
}

function createRows(files: File[]): UploadRow[] {
	return files.map((file, index) => ({
		id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
		file,
		progress: 0,
		status: 'pending',
	}));
}

function uploadFile(
	file: File,
	parentId: string | undefined,
	onProgress: (progress: number) => void,
): Promise<void> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		const formData = new FormData();

		formData.append('file', file);
		if (parentId) formData.append('parent_id', parentId);

		xhr.open('POST', '/api/v1/nodes/upload');

		const token = localStorage.getItem('darchiva_token');
		if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

		xhr.upload.onprogress = (event) => {
			if (!event.lengthComputable) return;
			onProgress(Math.round((event.loaded / event.total) * 100));
		};

		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				onProgress(100);
				resolve();
				return;
			}

			reject(new Error(xhr.responseText || `Upload failed with status ${xhr.status}`));
		};
		xhr.onerror = () => reject(new Error('Network error while uploading'));
		xhr.onabort = () => reject(new Error('Upload cancelled'));
		xhr.send(formData);
	});
}

function statusIcon(status: UploadStatus) {
	if (status === 'success') return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
	if (status === 'error') return <XCircle className="h-4 w-4 text-red-400" />;
	if (status === 'uploading') return <Loader2 className="h-4 w-4 animate-spin text-brass-400" />;
	return <File className="h-4 w-4 text-slate-500" />;
}

export function DropZoneOverlay({
	isDragging,
	files,
	parentId,
	uploadId,
	onClose,
}: DropZoneOverlayProps) {
	const queryClient = useQueryClient();
	const [rows, setRows] = useState<UploadRow[]>([]);
	const activeUploadId = useRef<number | null>(null);

	const hasFiles = files.length > 0;
	const isUploading = rows.some((row) => row.status === 'uploading' || row.status === 'pending');
	const completedCount = rows.filter((row) => row.status === 'success').length;
	const failedCount = rows.filter((row) => row.status === 'error').length;

	const dialogDescription = useMemo(() => {
		if (isUploading) return `Uploading ${rows.length} file${rows.length === 1 ? '' : 's'} to the current folder.`;
		if (failedCount > 0) return `${completedCount} completed, ${failedCount} failed.`;
		return `${completedCount} file${completedCount === 1 ? '' : 's'} uploaded successfully.`;
	}, [completedCount, failedCount, isUploading, rows.length]);

	useEffect(() => {
		if (!hasFiles || activeUploadId.current === uploadId) return;

		activeUploadId.current = uploadId;
		const nextRows = createRows(files);
		setRows(nextRows);

		let cancelled = false;

		async function runUploads() {
			let successCount = 0;
			let errorCount = 0;

			for (const row of nextRows) {
				if (cancelled) return;

				setRows((current) =>
					current.map((item) =>
						item.id === row.id ? { ...item, status: 'uploading', progress: 0, error: undefined } : item,
					),
				);

				try {
					await uploadFile(row.file, parentId, (progress) => {
						setRows((current) =>
							current.map((item) => (item.id === row.id ? { ...item, progress } : item)),
						);
					});

					successCount += 1;
					setRows((current) =>
						current.map((item) =>
							item.id === row.id ? { ...item, status: 'success', progress: 100 } : item,
						),
					);
				} catch (error) {
					errorCount += 1;
					setRows((current) =>
						current.map((item) =>
							item.id === row.id
								? {
										...item,
										status: 'error',
										error: error instanceof Error ? error.message : 'Upload failed',
									}
								: item,
						),
					);
				}
			}

			await queryClient.invalidateQueries({ queryKey: documentKeys.all });

			if (errorCount === 0) {
				toast.success('Upload complete', { description: `${successCount} file${successCount === 1 ? '' : 's'} uploaded.` });
			} else {
				toast.error('Upload finished with errors', { description: `${successCount} uploaded, ${errorCount} failed.` });
			}
		}

		void runUploads();

		return () => {
			cancelled = true;
		};
	}, [files, hasFiles, parentId, queryClient, uploadId]);

	return (
		<>
			{isDragging && (
				<div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/85 p-6 backdrop-blur-sm">
					<div className="flex h-full w-full items-center justify-center rounded-xl border-2 border-dashed border-brass-400 bg-slate-900/70">
						<div className="flex flex-col items-center gap-4 text-center">
							<div className="flex h-16 w-16 items-center justify-center rounded-full bg-brass-500/15 text-brass-300">
								<Upload className="h-8 w-8" />
							</div>
							<div>
								<p className="text-2xl font-semibold text-slate-100">Drop files to upload</p>
								<p className="mt-1 text-sm text-slate-400">Files will be uploaded to the current folder.</p>
							</div>
						</div>
					</div>
				</div>
			)}

			<Dialog open={hasFiles} onOpenChange={(open) => !open && !isUploading && onClose()}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Uploading Files</DialogTitle>
						<DialogDescription>{dialogDescription}</DialogDescription>
					</DialogHeader>

					<div className="max-h-[50vh] space-y-3 overflow-y-auto py-2">
						{rows.map((row) => (
							<div key={row.id} className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
								<div className="flex items-center gap-3">
									{statusIcon(row.status)}
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium text-slate-100">{row.file.name}</p>
										<p className="text-xs text-slate-500">{formatBytes(row.file.size)}</p>
									</div>
									<span
										className={cn(
											'text-xs font-medium',
											row.status === 'error' ? 'text-red-400' : 'text-slate-400',
										)}
									>
										{row.status === 'error' ? 'Failed' : `${row.progress}%`}
									</span>
								</div>
								<div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
									<div
										className={cn(
											'h-full rounded-full transition-all',
											row.status === 'error' ? 'bg-red-500' : 'bg-brass-500',
										)}
										style={{ width: `${row.status === 'error' ? 100 : row.progress}%` }}
									/>
								</div>
								{row.error && <p className="mt-2 text-xs text-red-400">{row.error}</p>}
							</div>
						))}
					</div>

					<div className="flex justify-end">
						<Button onClick={onClose} disabled={isUploading}>
							{isUploading ? 'Uploading...' : 'Close'}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
