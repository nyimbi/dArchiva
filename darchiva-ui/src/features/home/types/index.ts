// User Home Page Types

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';
export type ActivityType = 'view' | 'edit' | 'share' | 'upload' | 'comment' | 'approve' | 'reject';

export interface WorkflowTask {
	id: string;
	title: string;
	description?: string;
	workflow_name: string;
	workflow_id: string;
	document_id?: string;
	document_title?: string;
	priority: TaskPriority;
	status: TaskStatus;
	due_date?: string;
	assigned_at: string;
	assigned_by?: {
		id: string;
		name: string;
		avatar_url?: string;
	};
	actions: TaskAction[];
}

export interface TaskAction {
	id: string;
	label: string;
	type: 'approve' | 'reject' | 'complete' | 'forward' | 'comment' | 'custom';
	requires_comment?: boolean;
	next_step?: string;
}

export interface RecentDocument {
	id: string;
	title: string;
	path: string;
	type: 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'img' | 'other';
	thumbnail_url?: string;
	accessed_at: string;
	access_type: 'viewed' | 'edited' | 'shared';
	size_bytes: number;
	page_count?: number;
	tags?: Array<{ id: string; name: string; color: string }>;
}

export interface FavoriteItem {
	id: string;
	item_type: 'document' | 'folder' | 'search' | 'workflow';
	item_id: string;
	title: string;
	path?: string;
	icon?: string;
	pinned_at: string;
}

export interface ActivityEvent {
	id: string;
	type: ActivityType;
	title: string;
	description?: string;
	document_id?: string;
	document_title?: string;
	actor?: {
		id: string;
		name: string;
		avatar_url?: string;
	};
	timestamp: string;
	metadata?: Record<string, unknown>;
}

export interface Notification {
	id: string;
	type: 'task' | 'mention' | 'share' | 'comment' | 'system' | 'deadline';
	title: string;
	message: string;
	is_read: boolean;
	link?: string;
	created_at: string;
	metadata?: Record<string, unknown>;
}

export interface CalendarEvent {
	id: string;
	title: string;
	type: 'deadline' | 'reminder' | 'meeting' | 'task';
	date: string;
	document_id?: string;
	workflow_id?: string;
	is_all_day: boolean;
	color?: string;
}

export interface RecentSearch {
	id: string;
	query: string;
	filters?: Record<string, unknown>;
	result_count: number;
	searched_at: string;
}

export interface UserStats {
	pending_tasks: number;
	documents_this_week: number;
	approvals_pending: number;
	deadlines_upcoming: number;
}

export interface UserHomeData {
	user: {
		id: string;
		name: string;
		email: string;
		avatar_url?: string;
		department?: string;
		role?: string;
	};
	stats: UserStats;
	tasks: WorkflowTask[];
	recent_documents: RecentDocument[];
	favorites: FavoriteItem[];
	activity: ActivityEvent[];
	notifications: Notification[];
	calendar_events: CalendarEvent[];
	recent_searches: RecentSearch[];
}

// API Request/Response types
export interface TaskActionRequest {
	task_id: string;
	action_id: string;
	comment?: string;
	metadata?: Record<string, unknown>;
}

export interface UploadRequest {
	files: File[];
	folder_id?: string;
	tags?: string[];
	document_type_id?: string;
}

export interface SearchRequest {
	query: string;
	filters?: {
		type?: string[];
		date_from?: string;
		date_to?: string;
		tags?: string[];
		folder_id?: string;
	};
	limit?: number;
}

export interface FavoriteRequest {
	item_type: FavoriteItem['item_type'];
	item_id: string;
	title: string;
	path?: string;
}
