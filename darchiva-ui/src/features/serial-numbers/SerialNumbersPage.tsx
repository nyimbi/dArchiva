// (c) Copyright Datacraft, 2026
import { useMemo, useState } from 'react';
import {
	AlertTriangle,
	CheckCircle2,
	Download,
	FileDigit,
	Hash,
	Plus,
	Search,
	ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SerialStatus = 'validated' | 'review' | 'duplicate' | 'quarantined';

interface SerialRegistryRow {
	serialNumber: string;
	format: string;
	document: string;
	extractedDate: string;
	confidence: number;
	status: SerialStatus;
}

interface FormatTemplate {
	docType: string;
	pattern: string;
	example: string;
}

interface ValidationRule {
	name: string;
	scope: string;
	enabled: boolean;
	description: string;
}

const registryRows: SerialRegistryRow[] = [
	{ serialNumber: 'INV-KE-2026-000184', format: 'Invoice national', document: 'Kiboko Logistics Invoice 83914.pdf', extractedDate: '2026-07-05', confidence: 98.4, status: 'validated' },
	{ serialNumber: 'CTR-NBO-26-00492', format: 'Contract register', document: 'Mombasa Depot lease amendment.pdf', extractedDate: '2026-07-05', confidence: 96.8, status: 'validated' },
	{ serialNumber: 'CLM-2026-4412-A', format: 'Claims packet', document: 'Claims evidence bundle C-4412.pdf', extractedDate: '2026-07-04', confidence: 90.1, status: 'review' },
	{ serialNumber: 'HR-EMP-103948', format: 'HR file', document: 'Employee transfer packet - Njeri.pdf', extractedDate: '2026-07-04', confidence: 93.5, status: 'validated' },
	{ serialNumber: 'INV-KE-2026-000184', format: 'Invoice national', document: 'Duplicate vendor invoice scan.pdf', extractedDate: '2026-07-03', confidence: 97.9, status: 'duplicate' },
	{ serialNumber: 'PRM-KSM-2026-77X', format: 'Permit', document: 'Kisumu facility permit renewal.pdf', extractedDate: '2026-07-02', confidence: 74.2, status: 'quarantined' },
];

const templates: FormatTemplate[] = [
	{ docType: 'Invoice', pattern: '^INV-[A-Z]{2}-20\\d{2}-\\d{6}$', example: 'INV-KE-2026-000184' },
	{ docType: 'Contract', pattern: '^CTR-[A-Z]{3}-\\d{2}-\\d{5}$', example: 'CTR-NBO-26-00492' },
	{ docType: 'Claim', pattern: '^CLM-20\\d{2}-\\d{4}-[A-Z]$', example: 'CLM-2026-4412-A' },
	{ docType: 'HR Record', pattern: '^HR-EMP-\\d{6}$', example: 'HR-EMP-103948' },
];

const rules: ValidationRule[] = [
	{ name: 'Luhn check digit', scope: 'Invoices', enabled: true, description: 'Validate supplier registry suffix before filing.' },
	{ name: 'Strict format enforcement', scope: 'Contracts, Claims', enabled: true, description: 'Reject extracted serials that do not match the selected template.' },
	{ name: 'Duplicate detection', scope: 'All document types', enabled: true, description: 'Alert when a serial already exists in active or archived records.' },
	{ name: 'Low confidence quarantine', scope: '< 80% OCR confidence', enabled: true, description: 'Hold records for manual review before registry write.' },
];

const statusClass: Record<SerialStatus, string> = {
	validated: 'bg-emerald-500/10 text-emerald-400',
	review: 'bg-amber-500/10 text-amber-400',
	duplicate: 'bg-red-500/10 text-red-400',
	quarantined: 'bg-purple-500/10 text-purple-400',
};

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
	return (
		<section className={cn('rounded-xl border border-slate-800/50 bg-slate-900 p-5', className)}>
			<h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-100">{title}</h2>
			{children}
		</section>
	);
}

export function SerialNumbersPage() {
	const [search, setSearch] = useState('');
	const [templateDrafts, setTemplateDrafts] = useState<FormatTemplate[]>(templates);
	const filteredRows = useMemo(
		() =>
			registryRows.filter((row) =>
				row.serialNumber.toLowerCase().startsWith(search.trim().toLowerCase()),
			),
		[search],
	);
	const duplicates = registryRows.filter((row) => row.status === 'duplicate');

	return (
		<div className="min-h-screen bg-slate-950 p-6 text-slate-100">
			<div className="mx-auto max-w-[1450px] space-y-6">
				<header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<div className="flex items-center gap-2 text-sm font-medium text-brass-500">
							<Hash className="h-4 w-4" />
							Serial registry
						</div>
						<h1 className="mt-2 text-3xl font-semibold tracking-tight">Serial Numbers</h1>
						<p className="mt-2 text-sm text-slate-400">Extraction review, registry search, format templates, validation rules, and duplicate detection.</p>
					</div>
					<button
						type="button"
						className="inline-flex items-center gap-2 rounded-xl bg-brass-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-brass-400"
					>
						<Download className="h-4 w-4" />
						Export registry
					</button>
				</header>

				<div className="grid gap-4 md:grid-cols-4">
					<div className="rounded-xl border border-slate-800/50 bg-slate-900 p-4">
						<p className="text-xs uppercase tracking-[0.16em] text-slate-400">Total serials</p>
						<p className="mt-3 text-3xl font-semibold tabular-nums text-slate-100">48,293</p>
					</div>
					<div className="rounded-xl border border-slate-800/50 bg-slate-900 p-4">
						<p className="text-xs uppercase tracking-[0.16em] text-slate-400">Validated today</p>
						<p className="mt-3 text-3xl font-semibold tabular-nums text-emerald-400">1,182</p>
					</div>
					<div className="rounded-xl border border-slate-800/50 bg-slate-900 p-4">
						<p className="text-xs uppercase tracking-[0.16em] text-slate-400">Review queue</p>
						<p className="mt-3 text-3xl font-semibold tabular-nums text-amber-400">37</p>
					</div>
					<div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
						<p className="text-xs uppercase tracking-[0.16em] text-red-300">Duplicate alerts</p>
						<p className="mt-3 text-3xl font-semibold tabular-nums text-red-400">{duplicates.length}</p>
					</div>
				</div>

				{duplicates.length > 0 ? (
					<div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
						<div className="flex items-start gap-3">
							<AlertTriangle className="mt-0.5 h-5 w-5 text-red-400" />
							<div>
								<p className="text-sm font-semibold text-red-200">Duplicate serial detected</p>
								<p className="mt-1 text-sm text-red-200/80">
									{duplicates.map((row) => row.serialNumber).join(', ')} already exists. Review linked documents before allowing registry writes.
								</p>
							</div>
						</div>
					</div>
				) : null}

				<Panel title="Registry">
					<div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						<div className="relative max-w-md flex-1">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
							<input
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Search by serial prefix..."
								className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-10 pr-3 text-sm text-slate-100 outline-none focus:border-brass-500/70"
							/>
						</div>
						<button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-800 px-4 py-2 text-sm text-slate-200 hover:border-brass-500/70">
							<Plus className="h-4 w-4" />
							Register manual serial
						</button>
					</div>
					<div className="overflow-hidden rounded-xl border border-slate-800/50">
						<table className="w-full text-sm">
							<thead className="bg-slate-800/60 text-xs uppercase tracking-wide text-slate-500">
								<tr>
									<th className="px-4 py-3 text-left">Serial Number</th>
									<th className="px-4 py-3 text-left">Format</th>
									<th className="px-4 py-3 text-left">Document Linked</th>
									<th className="px-4 py-3 text-left">Extracted</th>
									<th className="px-4 py-3 text-right">Confidence</th>
									<th className="px-4 py-3 text-left">Status</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-800/50">
								{filteredRows.map((row, index) => (
									<tr key={`${row.serialNumber}-${index}`}>
										<td className="px-4 py-3 font-mono text-brass-300">{row.serialNumber}</td>
										<td className="px-4 py-3 text-slate-300">{row.format}</td>
										<td className="px-4 py-3 text-slate-200">{row.document}</td>
										<td className="px-4 py-3 text-slate-400">{row.extractedDate}</td>
										<td className="px-4 py-3 text-right tabular-nums text-slate-300">{row.confidence.toFixed(1)}%</td>
										<td className="px-4 py-3"><span className={cn('rounded-full px-2 py-1 text-xs font-medium capitalize', statusClass[row.status])}>{row.status}</span></td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</Panel>

				<div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
					<Panel title="Format Templates">
						<div className="space-y-3">
							{templateDrafts.map((template) => (
								<div key={template.docType} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
									<div className="mb-3 flex items-center justify-between gap-3">
										<div className="flex items-center gap-2">
											<FileDigit className="h-4 w-4 text-brass-500" />
											<p className="font-medium text-slate-100">{template.docType}</p>
										</div>
										<span className="font-mono text-xs text-slate-500">{template.example}</span>
									</div>
									<input
										value={template.pattern}
										onChange={(event) =>
											setTemplateDrafts((current) =>
												current.map((item) =>
													item.docType === template.docType ? { ...item, pattern: event.target.value } : item,
												),
											)
										}
										className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-sm text-slate-200 outline-none focus:border-brass-500/70"
									/>
								</div>
							))}
						</div>
					</Panel>

					<Panel title="Validation Rules">
						<div className="space-y-3">
							{rules.map((rule) => (
								<div key={rule.name} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
									<div className="flex items-start justify-between gap-3">
										<div>
											<p className="flex items-center gap-2 font-medium text-slate-100">
												{rule.enabled ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <ShieldCheck className="h-4 w-4 text-slate-500" />}
												{rule.name}
											</p>
											<p className="mt-1 text-xs text-brass-300">{rule.scope}</p>
											<p className="mt-2 text-sm text-slate-400">{rule.description}</p>
										</div>
										<span className={cn('rounded-full px-2 py-1 text-xs font-medium', rule.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400')}>
											{rule.enabled ? 'Enabled' : 'Paused'}
										</span>
									</div>
								</div>
							))}
						</div>
					</Panel>
				</div>
			</div>
		</div>
	);
}

export default SerialNumbersPage;
