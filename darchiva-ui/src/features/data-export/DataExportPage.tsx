// (c) Copyright Datacraft, 2026
/**
 * DataExportPage — GDPR data export and document bundle download UI.
 *
 * Cards:
 *   1. Full Tenant Export  — async job, status polling, download when ready
 *   2. GDPR Subject Request — email input, immediate ZIP download
 *   3. Recent export jobs table
 */
import React, { useState } from 'react';
import { format } from 'date-fns';
import { Download, FileArchive, Mail, RefreshCw, AlertCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';

import {
	useDataExportJobs,
	useDataExportJob,
	useStartExport,
	useDownloadExport,
	useGdprExport,
	type ExportJob,
	type ExportJobStatus,
} from './api';

// ── helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
	if (bytes == null) return '—';
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(iso: string | null): string {
	if (!iso) return '—';
	try {
		return format(new Date(iso), 'dd MMM yyyy HH:mm');
	} catch {
		return iso;
	}
}

function statusBadge(status: ExportJobStatus) {
	const variants: Record<ExportJobStatus, { label: string; className: string; icon: React.ReactNode }> = {
		pending: {
			label: 'Pending',
			className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
			icon: <Clock className="h-3 w-3" />,
		},
		processing: {
			label: 'Processing',
			className: 'bg-blue-100 text-blue-800 border-blue-200',
			icon: <Loader2 className="h-3 w-3 animate-spin" />,
		},
		completed: {
			label: 'Completed',
			className: 'bg-green-100 text-green-800 border-green-200',
			icon: <CheckCircle2 className="h-3 w-3" />,
		},
		failed: {
			label: 'Failed',
			className: 'bg-red-100 text-red-800 border-red-200',
			icon: <AlertCircle className="h-3 w-3" />,
		},
	};
	const v = variants[status] ?? variants.pending;
	return (
		<Badge variant="outline" className={`flex items-center gap-1 ${v.className}`}>
			{v.icon}
			{v.label}
		</Badge>
	);
}

// ── Full Tenant Export card ───────────────────────────────────────────────────

function FullTenantExportCard() {
	const [activeJobId, setActiveJobId] = useState<string | null>(null);

	const startExport = useStartExport();
	const jobQuery = useDataExportJob(activeJobId);
	const downloadExport = useDownloadExport();

	const job = jobQuery.data;
	const isRunning = job?.status === 'pending' || job?.status === 'processing';
	const isDone = job?.status === 'completed';
	const isFailed = job?.status === 'failed';

	function handleStart() {
		startExport.mutate(undefined, {
			onSuccess: (res) => {
				setActiveJobId(res.job_id);
			},
		});
	}

	function handleDownload() {
		if (!activeJobId) return;
		downloadExport.mutate({ jobId: activeJobId });
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<FileArchive className="h-5 w-5 text-blue-600" />
					Full Tenant Export
				</CardTitle>
				<CardDescription>
					Export all documents in this tenant as a ZIP archive. This runs as a background job —
					you can download the result when it completes.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{!activeJobId && (
					<div>
						<Button
							onClick={handleStart}
							disabled={startExport.isPending}
							className="w-full sm:w-auto"
						>
							{startExport.isPending ? (
								<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting…</>
							) : (
								<><Download className="mr-2 h-4 w-4" /> Start Export</>
							)}
						</Button>
						{startExport.isError && <p className="text-sm text-destructive mt-2">Export failed. Please try again.</p>}
					</div>
				)}

				{activeJobId && job && (
					<div className="rounded-lg border p-4 space-y-3">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">Export job</span>
							{statusBadge(job.status)}
						</div>

						{isRunning && (
							<p className="text-sm text-muted-foreground flex items-center gap-2">
								<Loader2 className="h-4 w-4 animate-spin" />
								Running… this page polls automatically every 3 s.
							</p>
						)}

						{isDone && (
							<div className="flex flex-col sm:flex-row gap-2">
								<Button onClick={handleDownload} disabled={downloadExport.isPending}>
									{downloadExport.isPending ? (
										<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Downloading…</>
									) : (
										<><Download className="mr-2 h-4 w-4" /> Download ZIP ({formatBytes(job.file_size_bytes)})</>
									)}
								</Button>
								<Button variant="outline" onClick={() => setActiveJobId(null)}>
									New Export
								</Button>
							</div>
						)}

						{isFailed && (
							<div className="space-y-2">
								<p className="text-sm text-red-600">{job.error_message ?? 'Unknown error'}</p>
								<Button variant="outline" onClick={() => setActiveJobId(null)}>
									Try Again
								</Button>
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

// ── GDPR Subject Request card ─────────────────────────────────────────────────

function GdprSubjectCard() {
	const [email, setEmail] = useState('');
	const gdprExport = useGdprExport();

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!email.trim()) return;
		gdprExport.mutate({ email: email.trim() });
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Mail className="h-5 w-5 text-purple-600" />
					GDPR Subject Request
				</CardTitle>
				<CardDescription>
					Export all documents associated with a specific user email address. The ZIP is generated
					immediately and downloaded to your browser.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-3">
					<div className="space-y-1.5">
						<Label htmlFor="gdpr-email">User email address</Label>
						<Input
							id="gdpr-email"
							type="email"
							placeholder="user@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
						/>
					</div>
					<Button
						type="submit"
						disabled={gdprExport.isPending || !email.trim()}
						className="w-full sm:w-auto"
					>
						{gdprExport.isPending ? (
							<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Exporting…</>
						) : (
							<><Download className="mr-2 h-4 w-4" /> Export Subject Data</>
						)}
					</Button>
					{gdprExport.isSuccess && (
						<p className="text-sm text-green-600 flex items-center gap-1">
							<CheckCircle2 className="h-4 w-4" /> Download started.
						</p>
					)}
					{gdprExport.isError && (
						<p className="text-sm text-red-600 flex items-center gap-1">
							<AlertCircle className="h-4 w-4" />
							{(gdprExport.error as Error)?.message ?? 'Export failed'}
						</p>
					)}
				</form>
			</CardContent>
		</Card>
	);
}

// ── Recent Jobs table ─────────────────────────────────────────────────────────

function RecentJobsTable() {
	const jobsQuery = useDataExportJobs(20);
	const downloadExport = useDownloadExport();
	const [downloadingId, setDownloadingId] = useState<string | null>(null);

	if (jobsQuery.isLoading) {
		return (
			<div className="space-y-2">
				{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
			</div>
		);
	}

	const jobs: ExportJob[] = jobsQuery.data ?? [];

	async function handleDownload(job: ExportJob) {
		setDownloadingId(job.id);
		try {
			await downloadExport.mutateAsync({ jobId: job.id });
		} finally {
			setDownloadingId(null);
		}
	}

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold">Recent Export Jobs</h3>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => jobsQuery.refetch()}
					disabled={jobsQuery.isFetching}
				>
					<RefreshCw className={`h-4 w-4 mr-1 ${jobsQuery.isFetching ? 'animate-spin' : ''}`} />
					Refresh
				</Button>
			</div>

			{jobsQuery.isError && (
				<div className="flex items-center gap-2 text-sm text-destructive">
					<AlertCircle className="h-4 w-4" />
					Failed to load export jobs.
				</div>
			)}

			{jobs.length === 0 ? (
				<p className="text-sm text-muted-foreground py-4 text-center">No export jobs yet.</p>
			) : (
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Type</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Created</TableHead>
								<TableHead>Completed</TableHead>
								<TableHead>Size</TableHead>
								<TableHead className="text-right">Action</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{jobs.map((job) => (
								<TableRow key={job.id}>
									<TableCell className="font-mono text-xs">{job.job_type}</TableCell>
									<TableCell>{statusBadge(job.status)}</TableCell>
									<TableCell className="text-sm text-muted-foreground">{formatDate(job.created_at)}</TableCell>
									<TableCell className="text-sm text-muted-foreground">{formatDate(job.completed_at)}</TableCell>
									<TableCell className="text-sm">{formatBytes(job.file_size_bytes)}</TableCell>
									<TableCell className="text-right">
										{job.status === 'completed' && (
											<Button
												size="sm"
												variant="outline"
												onClick={() => handleDownload(job)}
												disabled={downloadingId === job.id}
											>
												{downloadingId === job.id ? (
													<><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Downloading…</>
												) : (
													<><Download className="h-3 w-3 mr-1" /> Download</>
												)}
											</Button>
										)}
										{job.status === 'failed' && job.error_message && (
											<span className="text-xs text-red-500" title={job.error_message}>Error</span>
										)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DataExportPage() {
	return (
		<div className="space-y-6 p-6 max-w-4xl mx-auto">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Data Export</h1>
				<p className="text-muted-foreground mt-1">
					Export tenant documents, respond to GDPR data subject requests, and manage export jobs.
				</p>
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				<FullTenantExportCard />
				<GdprSubjectCard />
			</div>

			<RecentJobsTable />
		</div>
	);
}
