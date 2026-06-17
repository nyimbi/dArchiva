// (c) Copyright Datacraft, 2026
/**
 * Email Ingest Configs page — IMAP mailbox monitoring.
 * Route: /settings/email-ingest  (wiring agent adds to App.tsx)
 */
import React, { useState } from 'react';
import {
	useEmailIngestConfigs,
	useCreateEmailIngestConfig,
	useUpdateEmailIngestConfig,
	useDeleteEmailIngestConfig,
	useTestEmailIngestConfig,
	useTriggerEmailIngest,
	useToggleEmailIngestConfig,
	type EmailIngestConfig,
	type EmailIngestConfigCreate,
	type EmailTestResult,
} from './api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(iso: string | null): string {
	if (!iso) return '—';
	return new Date(iso).toLocaleString(undefined, {
		dateStyle: 'short',
		timeStyle: 'short',
	});
}

function statusBadge(active: boolean) {
	return active ? (
		<span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-300">
			Active
		</span>
	) : (
		<span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
			Inactive
		</span>
	);
}

// ---------------------------------------------------------------------------
// Config Form (create & edit)
// ---------------------------------------------------------------------------

interface ConfigFormState {
	name: string;
	host: string;
	port: string;
	username: string;
	password: string;
	use_ssl: boolean;
	mailbox_folder: string;
	check_interval_minutes: string;
	destination_folder_id: string;
	project_id: string;
	is_active: boolean;
	allowed_senders: string;
}

function defaultForm(c?: EmailIngestConfig): ConfigFormState {
	return {
		name: c?.name ?? '',
		host: c?.host ?? '',
		port: String(c?.port ?? 993),
		username: c?.username ?? '',
		password: '',
		use_ssl: c?.use_ssl ?? true,
		mailbox_folder: c?.mailbox_folder ?? 'INBOX',
		check_interval_minutes: String(c?.check_interval_minutes ?? 15),
		destination_folder_id: c?.destination_folder_id ?? '',
		project_id: c?.project_id ?? '',
		is_active: c?.is_active ?? true,
		allowed_senders: c?.allowed_senders ?? '',
	};
}

interface ConfigDialogProps {
	existing?: EmailIngestConfig;
	onClose: () => void;
}

function ConfigDialog({ existing, onClose }: ConfigDialogProps) {
	const isEdit = !!existing;
	const [form, setForm] = useState<ConfigFormState>(() => defaultForm(existing));
	const [showPassword, setShowPassword] = useState(false);
	const [testResult, setTestResult] = useState<EmailTestResult | null>(null);

	const create = useCreateEmailIngestConfig();
	const update = useUpdateEmailIngestConfig();
	const test = useTestEmailIngestConfig();

	const isSaving = create.isPending || update.isPending;
	const isTesting = test.isPending;

	const inputCls =
		'mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100';
	const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300';

	function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
		const { name, value, type } = e.target;
		setForm(prev => ({
			...prev,
			[name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
		}));
	}

	function buildPayload(): EmailIngestConfigCreate {
		return {
			name: form.name.trim(),
			host: form.host.trim(),
			port: parseInt(form.port, 10) || 993,
			username: form.username.trim(),
			password: form.password,
			use_ssl: form.use_ssl,
			mailbox_folder: form.mailbox_folder.trim() || 'INBOX',
			check_interval_minutes: parseInt(form.check_interval_minutes, 10) || 15,
			destination_folder_id: form.destination_folder_id.trim() || null,
			project_id: form.project_id.trim() || null,
			is_active: form.is_active,
			allowed_senders: form.allowed_senders.trim(),
		};
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const payload = buildPayload();
		if (isEdit && existing) {
			await update.mutateAsync({ id: existing.id, ...payload });
		} else {
			await create.mutateAsync(payload);
		}
		onClose();
	}

	async function handleTest() {
		if (!existing) return;
		setTestResult(null);
		const result = await test.mutateAsync(existing.id);
		setTestResult(result);
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
			<div className="w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-gray-800">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
					<h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
						{isEdit ? 'Edit IMAP Config' : 'New IMAP Email Ingest Config'}
					</h2>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none"
					>
						&times;
					</button>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto max-h-[70vh] px-6 py-4">
					{/* Name */}
					<div>
						<label htmlFor="ei-name" className={labelCls}>Display Name</label>
						<input id="ei-name" name="name" type="text" required
							placeholder="e.g. Accounts invoices inbox"
							value={form.name} onChange={handleChange} className={inputCls} />
					</div>

					{/* Host + Port */}
					<div className="grid grid-cols-3 gap-3">
						<div className="col-span-2">
							<label htmlFor="ei-host" className={labelCls}>IMAP Host</label>
							<input id="ei-host" name="host" type="text" required
								placeholder="imap.example.com"
								value={form.host} onChange={handleChange} className={inputCls} />
						</div>
						<div>
							<label htmlFor="ei-port" className={labelCls}>Port</label>
							<input id="ei-port" name="port" type="number" min={1} max={65535}
								value={form.port} onChange={handleChange} className={inputCls} />
						</div>
					</div>

					{/* SSL toggle */}
					<div className="flex items-center gap-3">
						<input id="ei-ssl" name="use_ssl" type="checkbox"
							checked={form.use_ssl} onChange={handleChange}
							className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
						<label htmlFor="ei-ssl" className="text-sm font-medium text-gray-700 dark:text-gray-300">
							Use SSL/TLS (IMAPS)
						</label>
					</div>

					{/* Username */}
					<div>
						<label htmlFor="ei-username" className={labelCls}>Username / Email</label>
						<input id="ei-username" name="username" type="text" required
							autoComplete="username"
							placeholder="user@example.com"
							value={form.username} onChange={handleChange} className={inputCls} />
					</div>

					{/* Password */}
					<div>
						<label htmlFor="ei-password" className={labelCls}>
							Password{isEdit && <span className="ml-1 text-gray-400 font-normal">(leave blank to keep existing)</span>}
						</label>
						<div className="relative mt-1">
							<input id="ei-password" name="password"
								type={showPassword ? 'text' : 'password'}
								autoComplete="new-password"
								required={!isEdit}
								placeholder={isEdit ? '••••••••' : 'Enter password'}
								value={form.password} onChange={handleChange}
								className={inputCls + ' pr-16'} />
							<button type="button"
								onClick={() => setShowPassword(v => !v)}
								className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
								{showPassword ? 'Hide' : 'Show'}
							</button>
						</div>
					</div>

					{/* Mailbox Folder */}
					<div>
						<label htmlFor="ei-folder" className={labelCls}>Mailbox Folder</label>
						<input id="ei-folder" name="mailbox_folder" type="text"
							placeholder="INBOX"
							value={form.mailbox_folder} onChange={handleChange} className={inputCls} />
					</div>

					{/* Check Interval */}
					<div>
						<label htmlFor="ei-interval" className={labelCls}>Check Interval (minutes)</label>
						<input id="ei-interval" name="check_interval_minutes" type="number" min={1} max={1440}
							value={form.check_interval_minutes} onChange={handleChange} className={inputCls} />
					</div>

					{/* Destination Folder ID */}
					<div>
						<label htmlFor="ei-dest" className={labelCls}>
							Destination Folder ID <span className="text-gray-400 font-normal">(optional)</span>
						</label>
						<input id="ei-dest" name="destination_folder_id" type="text"
							placeholder="UUID of target folder"
							value={form.destination_folder_id} onChange={handleChange} className={inputCls} />
					</div>

					{/* Project ID */}
					<div>
						<label htmlFor="ei-project" className={labelCls}>
							Project ID <span className="text-gray-400 font-normal">(optional)</span>
						</label>
						<input id="ei-project" name="project_id" type="text"
							placeholder="UUID of project"
							value={form.project_id} onChange={handleChange} className={inputCls} />
					</div>

					{/* Allowed Senders */}
					<div>
						<label htmlFor="ei-senders" className={labelCls}>
							Allowed Senders <span className="text-gray-400 font-normal">(comma-separated emails; empty = all)</span>
						</label>
						<input id="ei-senders" name="allowed_senders" type="text"
							placeholder="alice@example.com, scanner@hq.org"
							value={form.allowed_senders} onChange={handleChange} className={inputCls} />
					</div>

					{/* Active toggle */}
					<div className="flex items-center gap-3">
						<input id="ei-active" name="is_active" type="checkbox"
							checked={form.is_active} onChange={handleChange}
							className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
						<label htmlFor="ei-active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
							Active (poll on schedule)
						</label>
					</div>

					{/* Test result banner */}
					{testResult && (
						<div className={`rounded-md px-3 py-2 text-sm ${
							testResult.success
								? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300'
								: 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'
						}`}>
							{testResult.success
								? `Connected — ${testResult.unseen_count ?? 0} unseen message(s) in ${form.mailbox_folder}`
								: `Connection failed: ${testResult.error}`}
						</div>
					)}

					{/* Errors */}
					{(create.isError || update.isError) && (
						<p className="text-sm text-red-600 dark:text-red-400">
							{(create.error || update.error)?.message ?? 'An error occurred. Please try again.'}
						</p>
					)}
				</form>

				{/* Footer */}
				<div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-700">
					<div>
						{isEdit && (
							<button type="button" onClick={handleTest} disabled={isTesting}
								className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
								{isTesting ? 'Testing...' : 'Test Connection'}
							</button>
						)}
					</div>
					<div className="flex gap-2">
						<button type="button" onClick={onClose}
							className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
							Cancel
						</button>
						<button type="submit" form="ei-form" disabled={isSaving}
							onClick={handleSubmit as unknown as React.MouseEventHandler}
							className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
							{isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Config'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export function EmailIngestConfigs() {
	const { data: configs, isLoading, isError } = useEmailIngestConfigs();
	const deleteConfig = useDeleteEmailIngestConfig();
	const toggle = useToggleEmailIngestConfig();
	const trigger = useTriggerEmailIngest();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editing, setEditing] = useState<EmailIngestConfig | undefined>();
	const [triggerMsg, setTriggerMsg] = useState<Record<string, string>>({});

	function openCreate() {
		setEditing(undefined);
		setDialogOpen(true);
	}

	function openEdit(c: EmailIngestConfig) {
		setEditing(c);
		setDialogOpen(true);
	}

	async function handleDelete(c: EmailIngestConfig) {
		if (!window.confirm(`Delete config "${c.name}"? This cannot be undone.`)) return;
		await deleteConfig.mutateAsync(c.id);
	}

	async function handleToggle(c: EmailIngestConfig) {
		await toggle.mutateAsync({ id: c.id, is_active: !c.is_active });
	}

	async function handleTrigger(c: EmailIngestConfig) {
		const result = await trigger.mutateAsync(c.id);
		setTriggerMsg(prev => ({
			...prev,
			[c.id]: result.error ? `Error: ${result.error}` : 'Check triggered',
		}));
		setTimeout(() => setTriggerMsg(prev => { const n = { ...prev }; delete n[c.id]; return n; }), 4000);
	}

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
						Email Ingest (IMAP)
					</h1>
					<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
						Monitor IMAP mailboxes and ingest PDF / image attachments automatically.
					</p>
				</div>
				<button onClick={openCreate}
					className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
					+ New Config
				</button>
			</div>

			{/* Table */}
			{isLoading && (
				<p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
			)}
			{isError && (
				<p className="text-sm text-red-600 dark:text-red-400">Failed to load configs.</p>
			)}
			{!isLoading && !isError && (!configs || configs.length === 0) && (
				<div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-gray-500 dark:border-gray-600 dark:text-gray-400">
					No IMAP configs yet. Click "New Config" to add one.
				</div>
			)}
			{configs && configs.length > 0 && (
				<div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
					<table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
						<thead className="bg-gray-50 dark:bg-gray-800">
							<tr>
								{['Name', 'Host', 'Username', 'Folder', 'Interval', 'Last Checked', 'Docs', 'Status', 'Actions'].map(h => (
									<th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
										{h}
									</th>
								))}
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700 dark:bg-gray-900">
							{configs.map(c => (
								<tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
									<td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
										{c.name}
									</td>
									<td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
										{c.host}:{c.port}
									</td>
									<td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
										{c.username}
									</td>
									<td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
										{c.mailbox_folder}
									</td>
									<td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
										{c.check_interval_minutes}m
									</td>
									<td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
										{fmtDate(c.last_checked_at)}
									</td>
									<td className="whitespace-nowrap px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
										{c.documents_ingested}
									</td>
									<td className="whitespace-nowrap px-4 py-3">
										<button onClick={() => handleToggle(c)} title="Toggle active">
											{statusBadge(c.is_active)}
										</button>
									</td>
									<td className="whitespace-nowrap px-4 py-3">
										<div className="flex items-center gap-2">
											<button onClick={() => handleTrigger(c)}
												title="Check now"
												className="rounded px-2 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50">
												{triggerMsg[c.id] ?? 'Trigger'}
											</button>
											<button onClick={() => openEdit(c)}
												className="rounded px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
												Edit
											</button>
											<button onClick={() => handleDelete(c)}
												className="rounded px-2 py-1 text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50">
												Delete
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Dialog */}
			{dialogOpen && (
				<ConfigDialog
					existing={editing}
					onClose={() => { setDialogOpen(false); setEditing(undefined); }}
				/>
			)}
		</div>
	);
}

export default EmailIngestConfigs;
