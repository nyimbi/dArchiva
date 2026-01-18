// dArchiva Scanning Projects - TypeScript Types

export type ProjectStatus =
  | 'planning'
  | 'active'
  | 'paused'
  | 'completed'
  | 'archived'
  | 'cancelled';

export type BatchStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'on_hold';

export type SLAStatus = 'on_track' | 'at_risk' | 'warning' | 'breached';

export type MaintenanceStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'overdue';

export type ShiftStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

export type CheckpointStatus = 'pending' | 'passed' | 'failed' | 'skipped';

// Core entities
export interface ScanningProject {
  id: string;
  code: string;
  name: string;
  description?: string;
  client_name?: string;
  status: ProjectStatus;
  priority: number;
  total_estimated_pages: number;
  scanned_pages: number;
  verified_pages: number;
  rejected_pages: number;
  daily_page_target: number;
  start_date?: string;
  target_end_date?: string;
  actual_end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface SubProject {
  id: string;
  parent_project_id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  status: ProjectStatus;
  priority: number;
  total_estimated_pages: number;
  scanned_pages: number;
  verified_pages: number;
  rejected_pages: number;
  assigned_location_id?: string;
  start_date?: string;
  target_end_date?: string;
  actual_end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ScanningBatch {
  id: string;
  project_id: string;
  batch_number: string;
  description?: string;
  status: BatchStatus;
  priority: number;
  total_pages: number;
  scanned_pages: number;
  verified_pages: number;
  rejected_pages: number;
  box_label?: string;
  source_location?: string;
  assigned_operator_id?: string;
  assigned_operator_name?: string;
  scanner_id?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface ScanningLocation {
  id: string;
  code: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  timezone: string;
  is_active: boolean;
  scanner_capacity: number;
  operator_capacity: number;
  daily_page_capacity: number;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  notes?: string;
  created_at: string;
}

export interface Shift {
  id: string;
  location_id?: string;
  name: string;
  start_time: string;
  end_time: string;
  days_of_week: string;
  target_pages_per_operator: number;
  break_minutes: number;
  is_active: boolean;
  created_at: string;
}

export interface ShiftAssignment {
  id: string;
  shift_id: string;
  operator_id: string;
  operator_name?: string;
  project_id?: string;
  assignment_date: string;
  status: ShiftStatus;
  actual_start?: string;
  actual_end?: string;
  pages_scanned: number;
  notes?: string;
}

export interface ProjectCost {
  id: string;
  project_id: string;
  cost_date: string;
  cost_type: string;
  category?: string;
  description?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  currency: string;
  operator_id?: string;
  location_id?: string;
  batch_id?: string;
  notes?: string;
  created_at: string;
}

export interface ProjectBudget {
  id: string;
  project_id: string;
  budget_name: string;
  total_budget: number;
  labor_budget: number;
  equipment_budget: number;
  materials_budget: number;
  storage_budget: number;
  other_budget: number;
  contingency_budget: number;
  currency: string;
  spent_to_date: number;
  cost_per_page?: number;
  target_cost_per_page?: number;
  is_approved: boolean;
  approved_by_id?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectSLA {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  sla_type: string;
  target_value: number;
  target_unit: string;
  current_value: number;
  threshold_warning?: number;
  threshold_critical?: number;
  status: SLAStatus;
  penalty_amount?: number;
  penalty_currency: string;
  start_date: string;
  end_date: string;
  last_checked_at?: string;
  breached_at?: string;
  created_at: string;
}

export interface SLAAlert {
  id: string;
  sla_id: string;
  alert_type: string;
  alert_time: string;
  message: string;
  current_value: number;
  target_value: number;
  acknowledged_by_id?: string;
  acknowledged_at?: string;
  resolution_notes?: string;
}

export interface EquipmentMaintenance {
  id: string;
  resource_id: string;
  maintenance_type: string;
  title: string;
  description?: string;
  scheduled_date: string;
  completed_date?: string;
  status: MaintenanceStatus;
  priority: number;
  estimated_downtime_hours: number;
  actual_downtime_hours?: number;
  technician_name?: string;
  cost: number;
  parts_replaced?: string;
  notes?: string;
  next_maintenance_date?: string;
  created_at: string;
}

export interface OperatorCertification {
  id: string;
  operator_id: string;
  operator_name?: string;
  certification_type: string;
  certification_name: string;
  level: string;
  issued_date: string;
  expiry_date?: string;
  issued_by?: string;
  is_active: boolean;
  score?: number;
  notes?: string;
  created_at: string;
}

export interface CapacityPlan {
  id: string;
  project_id: string;
  plan_name: string;
  plan_date: string;
  target_completion_date: string;
  total_pages_remaining: number;
  working_days_remaining: number;
  required_pages_per_day: number;
  current_daily_capacity: number;
  capacity_gap: number;
  recommended_operators: number;
  recommended_scanners: number;
  recommended_shifts_per_day: number;
  confidence_score: number;
  assumptions?: string;
  recommendations?: string;
  created_by_id?: string;
  is_approved: boolean;
  created_at: string;
}

export interface DocumentTypeDistribution {
  id: string;
  project_id: string;
  document_type: string;
  document_type_name: string;
  estimated_count: number;
  actual_count: number;
  estimated_pages: number;
  actual_pages: number;
  avg_pages_per_document: number;
  requires_special_handling: boolean;
  special_handling_notes?: string;
  priority: number;
  assigned_operator_ids?: string;
  created_at: string;
  updated_at: string;
}

export interface BatchPriorityQueue {
  id: string;
  batch_id: string;
  batch?: ScanningBatch;
  priority: number;
  priority_reason?: string;
  due_date?: string;
  is_rush: boolean;
  rush_approved_by_id?: string;
  rush_approved_at?: string;
  estimated_completion?: string;
  actual_completion?: string;
  queue_position?: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectContract {
  id: string;
  project_id: string;
  contract_number: string;
  client_name: string;
  client_contact_name?: string;
  client_contact_email?: string;
  contract_type: string;
  contract_value: number;
  currency: string;
  price_per_page?: number;
  minimum_pages?: number;
  maximum_pages?: number;
  payment_terms?: string;
  start_date: string;
  end_date: string;
  deliverables?: string;
  special_requirements?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface WorkloadForecast {
  id: string;
  project_id: string;
  forecast_date: string;
  forecast_period_start: string;
  forecast_period_end: string;
  predicted_pages: number;
  predicted_operators_needed: number;
  predicted_scanners_needed: number;
  confidence_score: number;
  model_used?: string;
  actual_pages?: number;
  accuracy?: number;
  created_at: string;
}

export interface ProjectCheckpoint {
  id: string;
  project_id: string;
  checkpoint_number: number;
  name: string;
  description?: string;
  checkpoint_type: string;
  target_date: string;
  actual_date?: string;
  target_percentage: number;
  actual_percentage?: number;
  status: CheckpointStatus;
  pass_criteria?: string;
  review_notes?: string;
  reviewed_by_id?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  created_at: string;
}

// Dashboard aggregates
export interface ProjectDashboard {
  project: ScanningProject;
  total_pages: number;
  scanned_pages: number;
  verified_pages: number;
  rejected_pages: number;
  completion_percentage: number;
  verification_percentage: number;
  rejection_rate: number;
  pages_today: number;
  pages_this_week: number;
  pages_per_day_average: number;
  days_remaining: number;
  estimated_completion_date?: string;
  on_track: boolean;
  active_operators: number;
  active_scanners: number;
  pending_batches: number;
  active_batches: number;
  completed_batches: number;
  sla_status: SLAStatus;
  budget_utilization: number;
  cost_per_page: number;
  recent_issues: ProjectIssue[];
}

export interface ProjectIssue {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  issue_type: string;
  severity: string;
  status: string;
  created_at: string;
  resolved_at?: string;
}

export interface BurndownDataPoint {
  date: string;
  planned_remaining: number;
  actual_remaining: number;
  ideal_remaining: number;
}

export interface VelocityDataPoint {
  date: string;
  pages_scanned: number;
  pages_verified: number;
  target: number;
  moving_average: number;
}

export interface LocationDashboard {
  location: ScanningLocation;
  active_projects: number;
  operators_on_shift: number;
  scanners_active: number;
  pages_today: number;
  capacity_utilization: number;
  upcoming_maintenance: EquipmentMaintenance[];
}

export interface MultiLocationDashboard {
  total_locations: number;
  total_operators: number;
  total_scanners: number;
  pages_today: number;
  locations: LocationDashboard[];
}

// Filter and sort options
export interface ProjectFilters {
  status?: ProjectStatus[];
  search?: string;
  client_name?: string;
  date_from?: string;
  date_to?: string;
  location_id?: string;
}

export interface BatchFilters {
  status?: BatchStatus[];
  search?: string;
  priority_min?: number;
  is_rush?: boolean;
  operator_id?: string;
}

export type SortDirection = 'asc' | 'desc';

export interface SortOption {
  field: string;
  direction: SortDirection;
}

// API response types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface BulkOperationResult {
  success_count: number;
  failed_count: number;
  errors: Array<{ id: string; error: string }>;
}
