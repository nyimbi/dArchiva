// (c) Copyright Datacraft, 2026
import styles from '../tenants.module.css';
import type { TenantStatus } from '../types';

interface TenantStatusBadgeProps {
	status: TenantStatus;
}

const statusClassMap: Record<TenantStatus, string> = {
	active: styles.statusActive,
	trial: styles.statusTrial,
	suspended: styles.statusSuspended,
	cancelled: styles.statusCancelled,
};

export function TenantStatusBadge({ status }: TenantStatusBadgeProps) {
	return (
		<span className={`${styles.statusBadge} ${statusClassMap[status]}`}>
			{status}
		</span>
	);
}
