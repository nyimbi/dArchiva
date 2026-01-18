// dArchiva Scanning Projects Feature
// Enterprise-scale document digitization project management

// Main Page Component
export { ScanningProjectsPage, default } from './ScanningProjectsPage';

// Core Components
export { StatusBadge } from './components/core/StatusBadge';
export { ProgressRing } from './components/core/ProgressRing';
export { MetricCard } from './components/core/MetricCard';
export { DataTable } from './components/core/DataTable';
export type { Column } from './components/core/DataTable';

// Dashboard Components
export { ProjectDashboard } from './components/dashboard/ProjectDashboard';
export { SLAStatusPanel } from './components/dashboard/SLAStatusPanel';
export { RecentActivityFeed } from './components/dashboard/RecentActivityFeed';
export { BurndownChart } from './components/dashboard/charts/BurndownChart';
export { VelocityChart } from './components/dashboard/charts/VelocityChart';

// List/Detail Views
export { ProjectList } from './components/ProjectList';
export { ProjectDetail } from './components/ProjectDetail';
export { QuickActionsPanel } from './components/QuickActionsPanel';

// Tab Components
export { SubProjectsTab } from './components/tabs/SubProjectsTab';
export { BatchesTab } from './components/tabs/BatchesTab';
export { OperatorsTab } from './components/tabs/OperatorsTab';
export { LocationsTab } from './components/tabs/LocationsTab';
export { CostsTab } from './components/tabs/CostsTab';
export { SLAsTab } from './components/tabs/SLAsTab';
export { EquipmentTab } from './components/tabs/EquipmentTab';
export { AnalyticsTab } from './components/tabs/AnalyticsTab';
export { ContractsTab } from './components/tabs/ContractsTab';
export { CheckpointsTab } from './components/tabs/CheckpointsTab';

// API Hooks
export * from './api/hooks';

// Types
export * from './types';
