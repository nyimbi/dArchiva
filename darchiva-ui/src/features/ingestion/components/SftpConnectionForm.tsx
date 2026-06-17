// (c) Copyright Datacraft, 2026
/**
 * Form for creating or editing an SFTP/FTP connection.
 *
 * Usage:
 *   <SftpConnectionForm onClose={() => setOpen(false)} />
 *   <SftpConnectionForm connection={existing} onClose={() => setOpen(false)} />
 */
import React, { useState } from 'react';
import {
	useCreateSftpConnection,
	useUpdateSftpConnection,
	useTestSftpConnection,
	type SftpConnection,
	type SftpConnectionCreate,
} from '../api/sftp';

interface SftpConnectionFormProps {
	/** Existing connection to edit. Omit for create mode. */
	connection?: SftpConnection;
	onClose: () => void;
}

interface FormState {
	name: string;
	host: string;
	port: string;
	username: string;
	password: string;
	ssh_key: string;
	remote_path: string;
	file_pattern: string;
	poll_interval_minutes: string;
	destination_folder_id: string;
	is_active: boolean;
}

function toFormState(c?: SftpConnection): FormState {
	return {
		name: c?.name ?? '',
		host: c?.host ?? '',
		port: String(c?.port ?? 22),
		username: c?.username ?? '',
		password: '',
		ssh_key: '',
		remote_path: c?.remote_path ?? '/',
		file_pattern: c?.file_pattern ?? '*.pdf,*.tiff,*.jpg',
		poll_interval_minutes: String(c?.poll_interval_minutes ?? 5),
		destination_folder_id: c?.destination_folder_id ?? '',
		is_active: c?.is_active ?? true,
	};
}

export function SftpConnectionForm({ connection, onClose }: SftpConnectionFormProps) {
	const isEdit = !!connection;
	const [form, setForm] = useState<FormState>(() => toFormState(connection));
	const [showPassword, setShowPassword] = useState(false);
	const [testResult, setTestResult] = useState<{ success: boolean; error?: string; file_count?: number } | null>(null);

	const create = useCreateSftpConnection();
	const update = useUpdateSftpConnection();
	const test = useTestSftpConnection();

	const isSaving = create.isPending || update.isPending;
	const isTesting = test.isPending;

	function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
		const { name, value, type } = e.target;
		setForm(prev => ({
			...prev,
			[name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
		}));
	}

	function buildPayload(): SftpConnectionCreate {
		const payload: SftpConnectionCreate = {
			name: form.name.trim(),
			host: form.host.trim(),
			port: parseInt(form.port, 10) || 22,
			username: form.username.trim(),
			remote_path: form.remote_path.trim() || '/',
			file_pattern: form.file_pattern.trim() || '*.pdf,*.tiff,*.jpg',
			poll_interval_minutes: parseInt(form.poll_interval_minutes, 10) || 5,
			is_active: form.is_active,
		};
		if (form.password) payload.password = form.password;
		if (form.ssh_key) payload.ssh_key = form.ssh_key;
		if (form.destination_folder_id.trim()) payload.destination_folder_id = form.destination_folder_id.trim();
		return payload;
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const payload = buildPayload();
		if (isEdit && connection) {
			await update.mutateAsync({ id: connection.id, ...payload });
		} else {
			await create.mutateAsync(payload);
		}
		onClose();
	}

	async function handleTest() {
		if (!connection) return;
		setTestResult(null);
		const result = await test.mutateAsync(connection.id);
		setTestResult(result);
	}

	const inputClass =
		'mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100';
	const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300';

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			{/* Name */}
			<div>
				<label htmlFor="sftp-name" className={labelClass}>Display Name</label>
				<input
					id="sftp-name"
					name="name"
					type="text"
					required
					placeholder="e.g. HQ Scanner Drop"
					value={form.name}
					onChange={handleChange}
					className={inputClass}
				/>
			</div>

			{/* Host + Port */}
			<div className="grid grid-cols-3 gap-3">
				<div className="col-span-2">
					<label htmlFor="sftp-host" className={labelClass}>Host</label>
					<input
						id="sftp-host"
						name="host"
						type="text"
						required
						placeholder="sftp.example.com"
						value={form.host}
						onChange={handleChange}
						className={inputClass}
					/>
				</div>
				<div>
					<label htmlFor="sftp-port" className={labelClass}>Port</label>
					<input
						id="sftp-port"
						name="port"
						type="number"
						min={1}
						max={65535}
						value={form.port}
						onChange={handleChange}
						className={inputClass}
					/>
				</div>
			</div>

			{/* Username */}
			<div>
				<label htmlFor="sftp-username" className={labelClass}>Username</label>
				<input
					id="sftp-username"
					name="username"
					type="text"
					required
					autoComplete="username"
					value={form.username}
					onChange={handleChange}
					className={inputClass}
				/>
			</div>

			{/* Password */}
			<div>
				<label htmlFor="sftp-password" className={labelClass}>
					Password {isEdit && <span className="text-gray-400 font-normal">(leave blank to keep existing)</span>}
				</label>
				<div className="relative mt-1">
					<input
						id="sftp-password"
						name="password"
						type={showPassword ? 'text' : 'password'}
						autoComplete="new-password"
						placeholder={isEdit ? '••••••••' : 'Enter password'}
						value={form.password}
						onChange={handleChange}
						className={inputClass + ' pr-20'}
					/>
					<button
						type="button"
						onClick={() => setShowPassword(v => !v)}
						className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
					>
						{showPassword ? 'Hide' : 'Show'}
					</button>
				</div>
			</div>

			{/* Remote Path */}
			<div>
				<label htmlFor="sftp-remote-path" className={labelClass}>Remote Path</label>
				<input
					id="sftp-remote-path"
					name="remote_path"
					type="text"
					placeholder="/uploads/scans"
					value={form.remote_path}
					onChange={handleChange}
					className={inputClass}
				/>
			</div>

			{/* File Pattern */}
			<div>
				<label htmlFor="sftp-file-pattern" className={labelClass}>
					File Pattern <span className="text-gray-400 font-normal">(comma-separated globs)</span>
				</label>
				<input
					id="sftp-file-pattern"
					name="file_pattern"
					type="text"
					placeholder="*.pdf,*.tiff,*.jpg"
					value={form.file_pattern}
					onChange={handleChange}
					className={inputClass}
				/>
			</div>

			{/* Poll Interval */}
			<div>
				<label htmlFor="sftp-poll-interval" className={labelClass}>Poll Interval (minutes)</label>
				<input
					id="sftp-poll-interval"
					name="poll_interval_minutes"
					type="number"
					min={1}
					max={1440}
					value={form.poll_interval_minutes}
					onChange={handleChange}
					className={inputClass}
				/>
			</div>

			{/* Active toggle */}
			<div className="flex items-center gap-3">
				<input
					id="sftp-is-active"
					name="is_active"
					type="checkbox"
					checked={form.is_active}
					onChange={handleChange}
					className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
				/>
				<label htmlFor="sftp-is-active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
					Active (poll on schedule)
				</label>
			</div>

			{/* Test connection result */}
			{testResult && (
				<div className={`rounded-md px-3 py-2 text-sm ${
					testResult.success
						? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300'
						: 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'
				}`}>
					{testResult.success
						? `Connected — ${testResult.file_count ?? 0} matching file(s) found`
						: `Connection failed: ${testResult.error}`}
				</div>
			)}

			{/* Action buttons */}
			<div className="flex items-center justify-between pt-2">
				<div>
					{isEdit && (
						<button
							type="button"
							onClick={handleTest}
							disabled={isTesting}
							className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
						>
							{isTesting ? 'Testing...' : 'Test Connection'}
						</button>
					)}
				</div>
				<div className="flex gap-2">
					<button
						type="button"
						onClick={onClose}
						className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isSaving}
						className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
					>
						{isSaving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Connection'}
					</button>
				</div>
			</div>

			{/* Save error */}
			{(create.isError || update.isError) && (
				<p className="text-sm text-red-600 dark:text-red-400">
					{(create.error || update.error)?.message ?? 'An error occurred. Please try again.'}
				</p>
			)}
		</form>
	);
}

export default SftpConnectionForm;
