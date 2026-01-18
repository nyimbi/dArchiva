// (c) Copyright Datacraft, 2026
/**
 * TypeScript types for billing and usage tracking.
 */

export type ProviderType =
	| 'aws'
	| 'linode'
	| 'cloudflare'
	| 'digitalocean'
	| 'gcp'
	| 'azure'
	| 'custom';

export type ServiceType =
	| 'storage'
	| 'transfer_out'
	| 'transfer_in'
	| 'compute'
	| 'api_calls'
	| 'ocr_pages'
	| 'search_queries'
	| 'documents'
	| 'users';

export type AlertType =
	| 'storage_threshold'
	| 'transfer_threshold'
	| 'cost_threshold'
	| 'document_limit'
	| 'user_limit'
	| 'api_rate_limit';

export type AlertStatus = 'active' | 'triggered' | 'resolved' | 'disabled';

export type InvoiceStatus =
	| 'draft'
	| 'pending'
	| 'sent'
	| 'paid'
	| 'overdue'
	| 'cancelled'
	| 'refunded';

export interface UsageDaily {
	id: string;
	tenantId: string;
	usageDate: string;
	storageBytes: number;
	storageHotBytes: number;
	storageColdBytes: number;
	storageArchiveBytes: number;
	transferInBytes: number;
	transferOutBytes: number;
	documentsCount: number;
	documentsAdded: number;
	documentsDeleted: number;
	pagesProcessed: number;
	apiCalls: number;
	searchQueries: number;
	activeUsers: number;
	storageCostCents: number;
	transferCostCents: number;
	computeCostCents: number;
	costTotalCents: number;
	costBreakdown: Record<string, unknown> | null;
}

export interface UsageSummary {
	startDate: string;
	endDate: string;
	totalStorageBytes: number;
	totalTransferInBytes: number;
	totalTransferOutBytes: number;
	totalDocuments: number;
	totalPagesProcessed: number;
	totalApiCalls: number;
	peakActiveUsers: number;
	totalCostCents: number;
	dailyAverageCostCents: number;
}

export interface UsageAlert {
	id: string;
	tenantId: string;
	alertType: AlertType;
	name: string;
	description: string | null;
	thresholdValue: number;
	thresholdUnit: string;
	currentValue: number;
	percentageUsed: number;
	status: AlertStatus;
	notifyAtPercentage: number[];
	notificationsSent: number[];
	notificationChannels: string[];
	lastTriggeredAt: string | null;
	triggeredCount: number;
	createdAt: string;
	updatedAt: string;
}

export interface InvoiceLineItem {
	id: string;
	invoiceId: string;
	lineNumber: number;
	description: string;
	serviceType: ServiceType | null;
	quantity: number;
	unitName: string;
	unitPriceCents: number;
	subtotalCents: number;
	discountCents: number;
	taxCents: number;
	totalCents: number;
	taxRate: number;
	taxCode: string | null;
}

export interface Invoice {
	id: string;
	tenantId: string;
	invoiceNumber: string;
	reference: string | null;
	periodStart: string;
	periodEnd: string;
	status: InvoiceStatus;
	subtotalCents: number;
	discountCents: number;
	taxCents: number;
	totalCents: number;
	paidCents: number;
	balanceDueCents: number;
	currency: string;
	billingName: string | null;
	billingEmail: string | null;
	billingAddress: Record<string, unknown> | null;
	paymentMethod: string | null;
	paymentId: string | null;
	paidAt: string | null;
	issuedAt: string | null;
	dueDate: string | null;
	notes: string | null;
	pdfPath: string | null;
	createdAt: string;
	updatedAt: string;
	lineItems: InvoiceLineItem[];
}

export interface InvoiceSummary {
	id: string;
	invoiceNumber: string;
	periodStart: string;
	periodEnd: string;
	status: InvoiceStatus;
	totalCents: number;
	paidCents: number;
	balanceDueCents: number;
	dueDate: string | null;
	createdAt: string;
}

export interface BillingDashboard {
	currentMonthCostCents: number;
	previousMonthCostCents: number;
	costChangePercentage: number;
	currentStorageBytes: number;
	storageLimitBytes: number | null;
	currentTransferBytes: number;
	transferLimitBytes: number | null;
	activeAlerts: number;
	triggeredAlerts: number;
	pendingInvoices: number;
	overdueInvoices: number;
	costByService: Record<string, number>;
	dailyCosts: Array<{
		date: string;
		costCents: number;
		storageCents: number;
		transferCents: number;
	}>;
}

export interface CostEstimate {
	storageGb: number;
	transferGb: number;
	documents: number;
	users: number;
	estimatedMonthlyCostCents: number;
	breakdown: Array<{
		service: string;
		quantity: number;
		unitCents: number;
		totalCents: number;
	}>;
}

export interface CreateAlertInput {
	alertType: AlertType;
	name: string;
	description?: string;
	thresholdValue: number;
	thresholdUnit: string;
	notifyAtPercentage?: number[];
	notificationChannels?: string[];
}

export interface UpdateAlertInput {
	name?: string;
	description?: string;
	thresholdValue?: number;
	notifyAtPercentage?: number[];
	notificationChannels?: string[];
	status?: AlertStatus;
}
