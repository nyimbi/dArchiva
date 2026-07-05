// (c) Copyright Datacraft, 2026
import { Calendar, Hash, ListChecks, Plus, ToggleLeft, Type } from 'lucide-react';
import type { CustomField, CustomFieldType } from '../types';

interface CustomFieldListProps {
	onEdit?: (field: CustomField) => void;
	hideHeader?: boolean;
}

const fields: CustomField[] = [
	{ id: 'cf-invoice-number', name: 'Invoice Number', type: 'text', description: 'Supplier invoice reference', required: true, validation_regex: '^INV-[A-Z]{2}-20\\d{2}-\\d{6}$', document_type_ids: ['Invoice'], created_at: '2026-01-14' },
	{ id: 'cf-amount', name: 'Amount', type: 'number', description: 'Document monetary value', required: true, document_type_ids: ['Invoice', 'Claim'], created_at: '2026-01-14' },
	{ id: 'cf-effective-date', name: 'Effective Date', type: 'date', description: 'Contract or permit effective date', required: true, document_type_ids: ['Contract', 'Permit'], created_at: '2026-02-01' },
	{ id: 'cf-risk-tier', name: 'Risk Tier', type: 'enum', description: 'Operational risk tier', required: false, options: [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }], document_type_ids: ['Contract', 'Claim'], created_at: '2026-02-18' },
	{ id: 'cf-approved', name: 'Approved', type: 'boolean', description: 'Manager approval flag', required: false, document_type_ids: ['Invoice'], created_at: '2026-03-04' },
];

const typeIcon: Record<CustomFieldType, React.ComponentType<{ className?: string }>> = {
	text: Type,
	number: Hash,
	date: Calendar,
	datetime: Calendar,
	boolean: ToggleLeft,
	enum: ListChecks,
};

export function CustomFieldList({ onEdit, hideHeader = false }: CustomFieldListProps) {
	return (
		<div className="rounded-xl border border-slate-800/50 bg-slate-950 p-5 text-slate-100">
			{!hideHeader ? (
				<div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<p className="text-sm font-medium text-brass-500">Metadata schema</p>
						<h2 className="mt-1 text-2xl font-semibold tracking-tight">Custom Fields</h2>
						<p className="mt-1 text-sm text-slate-400">Text, number, date, enum, and boolean fields with required flags and document-type visibility.</p>
					</div>
					<button type="button" className="inline-flex items-center gap-2 rounded-xl bg-brass-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-brass-400"><Plus className="h-4 w-4" />Add field</button>
				</div>
			) : null}
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{fields.map((field) => {
					const Icon = typeIcon[field.type];
					return (
						<button key={field.id} type="button" onClick={() => onEdit?.(field)} className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-left hover:border-brass-500/70">
							<div className="flex items-start gap-3">
								<div className="rounded-lg bg-slate-800 p-2 text-brass-500"><Icon className="h-5 w-5" /></div>
								<div className="min-w-0 flex-1">
									<div className="flex items-center justify-between gap-3">
										<p className="font-medium text-slate-100">{field.name}</p>
										<span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-brass-300">{field.type}</span>
									</div>
									<p className="mt-2 text-sm text-slate-400">{field.description}</p>
								</div>
							</div>
							<div className="mt-4 flex flex-wrap gap-2">
								{field.required ? <span className="rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-400">Required</span> : <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400">Optional</span>}
								{field.document_type_ids?.map((type) => <span key={type} className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400">{type}</span>)}
							</div>
							{field.validation_regex ? <p className="mt-3 truncate rounded-lg bg-slate-950 px-3 py-2 font-mono text-xs text-slate-500">{field.validation_regex}</p> : null}
						</button>
					);
				})}
			</div>
		</div>
	);
}
