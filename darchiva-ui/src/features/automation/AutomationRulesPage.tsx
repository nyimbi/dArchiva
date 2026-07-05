// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { Activity, Bell, CheckCircle2, GitBranch, Play, Plus, Webhook, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

type RuleStatus = 'active' | 'paused' | 'draft';
type Trigger = 'Document Uploaded' | 'Workflow Completed' | 'Exception Raised' | 'Schedule';
type Condition = 'doc type is' | 'field contains' | 'metadata equals' | 'folder is';
type Action = 'Send notification' | 'Apply tag' | 'Move to folder' | 'Trigger workflow' | 'Create case' | 'Call webhook';

interface AutomationRuleRow {
	name: string;
	trigger: Trigger;
	conditionCount: number;
	actionCount: number;
	runCount: number;
	lastRun: string;
	status: RuleStatus;
}

interface ExecutionLog {
	id: string;
	rule: string;
	outcome: 'success' | 'warning' | 'failed';
	durationMs: number;
	message: string;
	timestamp: string;
}

const rules: AutomationRuleRow[] = [
	{ name: 'Route vendor invoices to AP', trigger: 'Document Uploaded', conditionCount: 3, actionCount: 4, runCount: 12842, lastRun: '2026-07-05 11:14', status: 'active' },
	{ name: 'Escalate high-value claims exceptions', trigger: 'Exception Raised', conditionCount: 5, actionCount: 3, runCount: 918, lastRun: '2026-07-05 10:52', status: 'active' },
	{ name: 'Weekly retention audit package', trigger: 'Schedule', conditionCount: 2, actionCount: 5, runCount: 74, lastRun: '2026-07-04 06:00', status: 'active' },
	{ name: 'Move completed HR onboarding', trigger: 'Workflow Completed', conditionCount: 4, actionCount: 2, runCount: 3210, lastRun: '2026-07-03 17:40', status: 'paused' },
];

const executionHistory: ExecutionLog[] = [
	{ id: 'RUN-98221', rule: 'Route vendor invoices to AP', outcome: 'success', durationMs: 184, message: 'Tagged invoice, moved to /Finance/AP, notified AP queue.', timestamp: '2026-07-05 11:14:08' },
	{ id: 'RUN-98219', rule: 'Escalate high-value claims exceptions', outcome: 'warning', durationMs: 302, message: 'Created case, webhook retry scheduled after 429 response.', timestamp: '2026-07-05 10:52:41' },
	{ id: 'RUN-98202', rule: 'Weekly retention audit package', outcome: 'success', durationMs: 612, message: 'Generated audit report and delivered to 5 recipients.', timestamp: '2026-07-04 06:00:11' },
	{ id: 'RUN-98188', rule: 'Route vendor invoices to AP', outcome: 'failed', durationMs: 221, message: 'Folder ACL denied move action for vendor KPLC.', timestamp: '2026-07-03 14:19:33' },
];

const triggers: Trigger[] = ['Document Uploaded', 'Workflow Completed', 'Exception Raised', 'Schedule'];
const conditions: Condition[] = ['doc type is', 'field contains', 'metadata equals', 'folder is'];
const actions: Action[] = ['Send notification', 'Apply tag', 'Move to folder', 'Trigger workflow', 'Create case', 'Call webhook'];

const statusClasses: Record<RuleStatus, string> = {
	active: 'bg-emerald-500/10 text-emerald-400',
	paused: 'bg-amber-500/10 text-amber-400',
	draft: 'bg-slate-800 text-slate-400',
};

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
	return (
		<section className={cn('rounded-xl border border-slate-800/50 bg-slate-900 p-5', className)}>
			<h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-100">{title}</h2>
			{children}
		</section>
	);
}

export function AutomationRulesPage() {
	const [selectedTrigger, setSelectedTrigger] = useState<Trigger>('Document Uploaded');
	const [logic, setLogic] = useState<'AND' | 'OR'>('AND');
	const [testResult, setTestResult] = useState('Sample invoice would apply tag AP-Ready, move to /Finance/AP/Incoming, and notify Finance Intake.');

	return (
		<div className="min-h-screen bg-slate-950 p-6 text-slate-100">
			<div className="mx-auto max-w-[1500px] space-y-6">
				<header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<div className="flex items-center gap-2 text-sm font-medium text-brass-500">
							<Zap className="h-4 w-4" />
							Automation engine
						</div>
						<h1 className="mt-2 text-3xl font-semibold tracking-tight">Automation Rules</h1>
						<p className="mt-2 text-sm text-slate-400">Build trigger-condition-action flows, test against sample documents, and inspect execution history.</p>
					</div>
					<button type="button" className="inline-flex items-center gap-2 rounded-xl bg-brass-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-brass-400">
						<Plus className="h-4 w-4" />
						New rule
					</button>
				</header>

				<Panel title="Rule List">
					<div className="overflow-hidden rounded-xl border border-slate-800/50">
						<table className="w-full text-sm">
							<thead className="bg-slate-800/60 text-xs uppercase tracking-wide text-slate-500">
								<tr>
									<th className="px-4 py-3 text-left">Name</th>
									<th className="px-4 py-3 text-left">Trigger</th>
									<th className="px-4 py-3 text-right">Conditions</th>
									<th className="px-4 py-3 text-right">Actions</th>
									<th className="px-4 py-3 text-right">Runs</th>
									<th className="px-4 py-3 text-left">Last Run</th>
									<th className="px-4 py-3 text-left">Status</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-800/50">
								{rules.map((rule) => (
									<tr key={rule.name}>
										<td className="px-4 py-3 font-medium text-slate-100">{rule.name}</td>
										<td className="px-4 py-3 text-slate-300">{rule.trigger}</td>
										<td className="px-4 py-3 text-right tabular-nums text-slate-300">{rule.conditionCount}</td>
										<td className="px-4 py-3 text-right tabular-nums text-slate-300">{rule.actionCount}</td>
										<td className="px-4 py-3 text-right tabular-nums text-slate-300">{rule.runCount.toLocaleString()}</td>
										<td className="px-4 py-3 text-slate-500">{rule.lastRun}</td>
										<td className="px-4 py-3"><span className={cn('rounded-full px-2 py-1 text-xs font-medium capitalize', statusClasses[rule.status])}>{rule.status}</span></td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</Panel>

				<div className="grid gap-6 xl:grid-cols-[1fr_420px]">
					<Panel title="Rule Builder">
						<div className="grid gap-4 lg:grid-cols-3">
							<div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
								<div className="mb-4 flex items-center gap-2 text-brass-400"><Activity className="h-4 w-4" /><span className="text-sm font-semibold">Trigger</span></div>
								<div className="space-y-2">
									{triggers.map((trigger) => (
										<button key={trigger} type="button" onClick={() => setSelectedTrigger(trigger)} className={cn('w-full rounded-lg border px-3 py-2 text-left text-sm', selectedTrigger === trigger ? 'border-brass-500 bg-brass-500/10 text-brass-300' : 'border-slate-800 text-slate-400 hover:text-slate-200')}>
											{trigger}
										</button>
									))}
								</div>
							</div>

							<div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
								<div className="mb-4 flex items-center justify-between gap-2">
									<div className="flex items-center gap-2 text-brass-400"><GitBranch className="h-4 w-4" /><span className="text-sm font-semibold">Conditions</span></div>
									<div className="flex rounded-lg bg-slate-800 p-1">
										{(['AND', 'OR'] as const).map((item) => (
											<button key={item} type="button" onClick={() => setLogic(item)} className={cn('rounded-md px-2 py-1 text-xs font-medium', logic === item ? 'bg-brass-500 text-slate-950' : 'text-slate-500')}>{item}</button>
										))}
									</div>
								</div>
								<div className="space-y-2">
									{conditions.map((condition, index) => (
										<div key={condition} className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300">
											<span className="text-slate-500">{index === 0 ? 'IF' : logic}</span> {condition} <span className="text-brass-300">{index === 0 ? 'Invoice' : index === 1 ? 'Kiboko' : index === 2 ? 'priority: high' : '/Finance/Incoming'}</span>
										</div>
									))}
								</div>
							</div>

							<div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
								<div className="mb-4 flex items-center gap-2 text-brass-400"><Bell className="h-4 w-4" /><span className="text-sm font-semibold">Actions</span></div>
								<div className="space-y-2">
									{actions.map((action, index) => (
										<div key={action} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300">
											<span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-xs text-brass-300">{index + 1}</span>
											<span>{action}</span>
										</div>
									))}
								</div>
							</div>
						</div>
					</Panel>

					<Panel title="Test Run">
						<div className="space-y-4">
							<label className="block text-sm text-slate-400">
								Sample data
								<textarea
									className="mt-2 min-h-32 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-xs text-slate-300 outline-none focus:border-brass-500/70"
									defaultValue={'{ "document_type": "Invoice", "vendor": "Kiboko Logistics", "amount": 1842000, "folder": "/Finance/Incoming" }'}
								/>
							</label>
							<button type="button" onClick={() => setTestResult(`Matched ${selectedTrigger}; ${logic} tree passed all conditions; 6 ordered actions ready.`)} className="inline-flex items-center gap-2 rounded-xl bg-brass-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-brass-400">
								<Play className="h-4 w-4" />
								Run test
							</button>
							<div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-200">
								<CheckCircle2 className="mr-2 inline h-4 w-4" />
								{testResult}
							</div>
						</div>
					</Panel>
				</div>

				<Panel title="Execution History Log">
					<div className="space-y-3">
						{executionHistory.map((log) => (
							<div key={log.id} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 md:grid-cols-[150px_1fr_auto] md:items-center">
								<div>
									<p className="font-mono text-sm text-brass-300">{log.id}</p>
									<p className="mt-1 text-xs text-slate-500">{log.timestamp}</p>
								</div>
								<div>
									<p className="font-medium text-slate-100">{log.rule}</p>
									<p className="mt-1 text-sm text-slate-400">{log.message}</p>
								</div>
								<div className="flex items-center gap-2">
									<Webhook className="h-4 w-4 text-slate-500" />
									<span className={cn('rounded-full px-2 py-1 text-xs font-medium', log.outcome === 'success' ? 'bg-emerald-500/10 text-emerald-400' : log.outcome === 'warning' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400')}>{log.outcome}</span>
									<span className="text-xs tabular-nums text-slate-500">{log.durationMs}ms</span>
								</div>
							</div>
						))}
					</div>
				</Panel>
			</div>
		</div>
	);
}

export default AutomationRulesPage;
