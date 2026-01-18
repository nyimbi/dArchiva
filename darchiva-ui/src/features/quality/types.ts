// (c) Copyright Datacraft, 2026
/**
 * Quality module types.
 */

export type QualityMetricType =
	| 'resolution_dpi'
	| 'skew_angle'
	| 'brightness'
	| 'contrast'
	| 'sharpness'
	| 'noise_level'
	| 'blur_score'
	| 'ocr_confidence'
	| 'quality_score';

export type RuleOperator =
	| 'eq'
	| 'neq'
	| 'gt'
	| 'gte'
	| 'lt'
	| 'lte'
	| 'between'
	| 'not_between';

export type RuleSeverity = 'info' | 'warning' | 'error' | 'critical';

export type RuleAction =
	| 'log'
	| 'flag'
	| 'quarantine'
	| 'reject'
	| 'notify'
	| 'auto_fix';

export type IssueStatus =
	| 'open'
	| 'acknowledged'
	| 'resolved'
	| 'ignored'
	| 'auto_fixed';

export type QualityGrade =
	| 'excellent'
	| 'good'
	| 'acceptable'
	| 'poor'
	| 'unacceptable';

export interface QualityRule {
	id: string;
	name: string;
	description?: string;
	metric: QualityMetricType;
	operator: RuleOperator;
	threshold: number;
	thresholdUpper?: number;
	severity: RuleSeverity;
	action: RuleAction;
	messageTemplate?: string;
	priority: number;
	isActive: boolean;
	documentTypeId?: string;
	appliesToAll: boolean;
	createdAt?: string;
}

export interface QualityMetrics {
	resolutionDpi?: number;
	skewAngle?: number;
	brightness?: number;
	contrast?: number;
	sharpness?: number;
	noiseLevel?: number;
	blurScore?: number;
	ocrConfidence?: number;
	isBlank?: boolean;
	orientation?: number;
	widthPx?: number;
	heightPx?: number;
	fileSizeBytes?: number;
}

export interface QualityIssue {
	metric: string;
	actualValue: number;
	expectedValue?: number;
	severity: RuleSeverity;
	message: string;
	pageNumber?: number;
	autoFixable: boolean;
}

export interface QualityAssessment {
	id: string;
	documentId: string;
	pageNumber?: number;
	qualityScore: number;
	passed: boolean;
	grade: QualityGrade;
	metrics: QualityMetrics;
	issues: QualityIssue[];
	issueCount: number;
	criticalIssues: number;
	assessedAt: string;
	assessedBy?: string;
}

export interface QualityIssueDetail {
	id: string;
	assessmentId: string;
	documentId: string;
	pageNumber?: number;
	ruleId?: string;
	metric: string;
	actualValue: number;
	expectedValue?: number;
	severity: RuleSeverity;
	message: string;
	status: IssueStatus;
	resolvedAt?: string;
	resolvedBy?: string;
	resolutionNotes?: string;
	autoFixApplied: boolean;
	autoFixResult?: string;
	createdAt: string;
}

export interface QualityStats {
	totalAssessments: number;
	passedCount: number;
	failedCount: number;
	passRate: number;
	avgQualityScore: number;
	issuesBySeverity: Record<RuleSeverity, number>;
	issuesByMetric: Record<string, number>;
	trend7d: Array<{
		date: string;
		total: number;
		passed: number;
		failed: number;
	}>;
}

export const METRIC_LABELS: Record<QualityMetricType, string> = {
	resolution_dpi: 'Resolution (DPI)',
	skew_angle: 'Skew Angle',
	brightness: 'Brightness',
	contrast: 'Contrast',
	sharpness: 'Sharpness',
	noise_level: 'Noise Level',
	blur_score: 'Blur Score',
	ocr_confidence: 'OCR Confidence',
	quality_score: 'Quality Score',
};

export const OPERATOR_LABELS: Record<RuleOperator, string> = {
	eq: 'equals',
	neq: 'not equals',
	gt: 'greater than',
	gte: 'at least',
	lt: 'less than',
	lte: 'at most',
	between: 'between',
	not_between: 'not between',
};

export const SEVERITY_CONFIG: Record<
	RuleSeverity,
	{ label: string; color: string; bgColor: string }
> = {
	info: { label: 'Info', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
	warning: {
		label: 'Warning',
		color: 'text-yellow-400',
		bgColor: 'bg-yellow-500/10',
	},
	error: { label: 'Error', color: 'text-red-400', bgColor: 'bg-red-500/10' },
	critical: {
		label: 'Critical',
		color: 'text-red-500',
		bgColor: 'bg-red-600/20',
	},
};

export const GRADE_CONFIG: Record<
	QualityGrade,
	{ label: string; color: string; bgColor: string; emoji: string }
> = {
	excellent: {
		label: 'Excellent',
		color: 'text-emerald-400',
		bgColor: 'bg-emerald-500/10',
		emoji: 'A+',
	},
	good: {
		label: 'Good',
		color: 'text-green-400',
		bgColor: 'bg-green-500/10',
		emoji: 'A',
	},
	acceptable: {
		label: 'Acceptable',
		color: 'text-yellow-400',
		bgColor: 'bg-yellow-500/10',
		emoji: 'B',
	},
	poor: {
		label: 'Poor',
		color: 'text-orange-400',
		bgColor: 'bg-orange-500/10',
		emoji: 'C',
	},
	unacceptable: {
		label: 'Unacceptable',
		color: 'text-red-400',
		bgColor: 'bg-red-500/10',
		emoji: 'F',
	},
};
