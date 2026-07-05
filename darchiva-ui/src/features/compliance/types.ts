// (c) Copyright Datacraft, 2026
export interface ComplianceStats {
	activePolicies: number;
	documentsUnderRetention: number;
	legalHoldsActive: number;
	gdprRequestsPending: number;
	gdprRequestsCompleted30d: number;
	overdueRetentionActions: number;
	nextRetentionDue?: string; // ISO date
}

export interface ComplianceAlert {
	id: string;
	type: 'overdue_retention' | 'legal_hold_expiring' | 'gdpr_deadline' | 'audit_gap';
	severity: 'critical' | 'warning' | 'info';
	message: string;
	dueDate?: string;
	documentCount?: number;
}
