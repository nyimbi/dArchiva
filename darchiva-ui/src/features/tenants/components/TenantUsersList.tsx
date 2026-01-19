// (c) Copyright Datacraft, 2026
import { useState, useEffect } from 'react';
import type { TenantUser, InviteUserRequest } from '../types';
import { getTenantUsers, inviteUserToTenant, removeUserFromTenant } from '../api';
import styles from '../tenants.module.css';

interface TenantUsersListProps {
	tenantId: string;
}

function getInitials(name: string): string {
	return name
		.split(/[@.]/)
		.map((w) => w[0])
		.join('')
		.toUpperCase()
		.slice(0, 2);
}

export function TenantUsersList({ tenantId }: TenantUsersListProps) {
	const [users, setUsers] = useState<TenantUser[]>([]);
	const [loading, setLoading] = useState(true);
	const [showInviteModal, setShowInviteModal] = useState(false);
	const [inviteEmail, setInviteEmail] = useState('');
	const [inviting, setInviting] = useState(false);

	useEffect(() => {
		loadUsers();
	}, [tenantId]);

	const loadUsers = async () => {
		setLoading(true);
		try {
			const data = await getTenantUsers(tenantId);
			setUsers(data);
		} catch (err) {
			console.error('Failed to load users:', err);
		} finally {
			setLoading(false);
		}
	};

	const handleInvite = async () => {
		if (!inviteEmail.trim()) return;
		setInviting(true);
		try {
			await inviteUserToTenant(tenantId, {
				email: inviteEmail,
				role_ids: [],
				send_invitation: true,
			});
			setInviteEmail('');
			setShowInviteModal(false);
			await loadUsers();
		} catch (err) {
			console.error('Failed to invite user:', err);
		} finally {
			setInviting(false);
		}
	};

	const handleRemove = async (userId: string) => {
		if (!confirm('Are you sure you want to remove this user from the tenant?')) return;
		try {
			await removeUserFromTenant(tenantId, userId);
			await loadUsers();
		} catch (err) {
			console.error('Failed to remove user:', err);
		}
	};

	if (loading) {
		return (
			<div className={styles.loading}>
				<div className={styles.spinner} />
			</div>
		);
	}

	return (
		<div>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginBottom: '1.5rem',
				}}
			>
				<div>
					<h3 className={styles.sectionTitle} style={{ margin: 0, border: 'none', padding: 0 }}>
						Tenant Users
					</h3>
					<p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--ink-muted)' }}>
						{users.length} user{users.length !== 1 ? 's' : ''} in this organization
					</p>
				</div>
				<button className={styles.primaryButton} onClick={() => setShowInviteModal(true)}>
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					>
						<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
						<circle cx="8.5" cy="7" r="4" />
						<line x1="20" y1="8" x2="20" y2="14" />
						<line x1="23" y1="11" x2="17" y2="11" />
					</svg>
					Invite User
				</button>
			</div>

			{users.length === 0 ? (
				<div className={styles.emptyState}>
					<div className={styles.emptyIcon}>👥</div>
					<h3>No users yet</h3>
					<p>Invite team members to start collaborating</p>
					<button
						className={styles.primaryButton}
						onClick={() => setShowInviteModal(true)}
					>
						Invite First User
					</button>
				</div>
			) : (
				<div className={styles.usersList}>
					{users.map((user) => (
						<div key={user.id} className={styles.userRow}>
							<div className={styles.userAvatar}>{getInitials(user.email)}</div>
							<div className={styles.userInfo}>
								<div className={styles.userName}>{user.username}</div>
								<div className={styles.userEmail}>{user.email}</div>
							</div>
							<div className={styles.userRoles}>
								{user.roles.map((role) => (
									<span key={role} className={styles.roleTag}>
										{role}
									</span>
								))}
								{!user.is_active && (
									<span
										className={styles.roleTag}
										style={{ background: 'var(--terracotta)', color: 'white' }}
									>
										Inactive
									</span>
								)}
							</div>
							<button
								className={styles.iconButton}
								onClick={() => handleRemove(user.id)}
								title="Remove user"
							>
								<svg
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
								>
									<polyline points="3 6 5 6 21 6" />
									<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
								</svg>
							</button>
						</div>
					))}
				</div>
			)}

			{/* Invite Modal */}
			{showInviteModal && (
				<div className={styles.modalOverlay} onClick={() => setShowInviteModal(false)}>
					<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
						<div className={styles.modalHeader}>
							<h2>Invite User</h2>
							<button
								className={styles.iconButton}
								onClick={() => setShowInviteModal(false)}
							>
								<svg
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
								>
									<line x1="18" y1="6" x2="6" y2="18" />
									<line x1="6" y1="6" x2="18" y2="18" />
								</svg>
							</button>
						</div>
						<div className={styles.modalBody}>
							<div className={styles.formGroup}>
								<label className={styles.formLabel}>Email Address</label>
								<input
									type="email"
									className={styles.formInput}
									value={inviteEmail}
									onChange={(e) => setInviteEmail(e.target.value)}
									placeholder="colleague@example.com"
									autoFocus
								/>
								<p
									style={{
										margin: '0.5rem 0 0',
										fontSize: '0.8rem',
										color: 'var(--ink-muted)',
									}}
								>
									An invitation email will be sent to this address
								</p>
							</div>
						</div>
						<div className={styles.modalFooter}>
							<button
								className={styles.secondaryButton}
								onClick={() => setShowInviteModal(false)}
							>
								Cancel
							</button>
							<button
								className={styles.primaryButton}
								onClick={handleInvite}
								disabled={inviting || !inviteEmail.trim()}
							>
								{inviting ? 'Sending...' : 'Send Invitation'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
