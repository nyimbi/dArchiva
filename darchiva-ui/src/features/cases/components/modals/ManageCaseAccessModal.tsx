// (c) Copyright Datacraft, 2026
import { type Case } from '@/features/cases/api';
import { useUsers } from '@/features/users/api';
import { apiClient } from '@/lib/api-client';
import { Loader2, Shield, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
	onClose: () => void;
	case_?: Case | null;
}

export function ManageCaseAccessModal({ onClose, case_ }: Props) {
	const [selectedUserId, setSelectedUserId] = useState('');
	const [permission, setPermission] = useState<'viewer' | 'editor' | 'manager'>('viewer');
	const [saving, setSaving] = useState(false);

	const { data: usersData } = useUsers({ pageSize: 100 });
	const users = usersData?.items ?? [];

	const handleGrant = async () => {
		if (!case_ || !selectedUserId) return;
		setSaving(true);
		try {
			await apiClient.post(`/cases/${case_.id}/access`, { user_id: selectedUserId, permission });
			toast.success('Access granted');
			setSelectedUserId('');
		} catch {
			toast.error('Failed to grant access');
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
			<div className="glass-card w-full max-w-md p-6">
				<div className="flex items-center justify-between mb-5">
					<div className="flex items-center gap-2">
						<Shield className="w-5 h-5 text-brass-400" />
						<h2 className="text-lg font-semibold text-slate-100">Manage Access</h2>
					</div>
					<button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200 rounded"><X className="w-5 h-5" /></button>
				</div>

				{case_ && <p className="text-sm text-slate-500 mb-4">Case: <span className="text-slate-300">{case_.title}</span></p>}

				<div className="space-y-4">
					<div>
						<label className="block text-sm text-slate-400 mb-1">User</label>
						<select className="input w-full" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
							<option value="">Select user...</option>
							{users.map((u) => (
								<option key={u.id} value={u.id}>{u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username}</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm text-slate-400 mb-1">Permission Level</label>
						<select className="input w-full" value={permission} onChange={(e) => setPermission(e.target.value as typeof permission)}>
							<option value="viewer">Viewer — can read only</option>
							<option value="editor">Editor — can add documents</option>
							<option value="manager">Manager — full access</option>
						</select>
					</div>
					<div className="flex gap-2 pt-1">
						<button onClick={onClose} className="btn-secondary flex-1">Close</button>
						<button onClick={handleGrant} disabled={saving || !selectedUserId} className="btn-primary flex-1">
							{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Grant Access'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
