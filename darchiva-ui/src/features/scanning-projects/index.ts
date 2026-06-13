// dArchiva Scanning Projects Feature
// Enterprise-scale document digitization project management

// Main Page Component
export { ScanningProjectsPage,default } from './ScanningProjectsPage';

// Core Components
export { DataTable } from './components/core/DataTable';
export type { Column } from './components/core/DataTable';
export { MetricCard } from './components/core/MetricCard';
export { ProgressRing } from './components/core/ProgressRing';
export { StatusBadge } from './components/core/StatusBadge';

// Dashboard Components
export { BurndownChart } from './components/dashboard/charts/BurndownChart';
export { VelocityChart } from './components/dashboard/charts/VelocityChart';
export { ProjectDashboard } from './components/dashboard/ProjectDashboard';
export { RecentActivityFeed } from './components/dashboard/RecentActivityFeed';
export { SLAStatusPanel } from './components/dashboard/SLAStatusPanel';

// List/Detail Views
export { ProjectDetail } from './components/ProjectDetail';
export { ProjectList } from './components/ProjectList';
export { QuickActionsPanel } from './components/QuickActionsPanel';

// P2 Advanced Capture Components
export { VirtualRebundler } from './components/VirtualRebundler';
export { ImageStitcher } from './components/ImageStitcher';
export { CameraCapture } from './components/CameraCapture';
export { QualitySettingsPanel } from './components/QualitySettingsPanel';
export { BatchKanban } from './components/BatchKanban';

// Tab Components
export { AnalyticsTab } from './components/tabs/AnalyticsTab';
export { BatchesTab } from './components/tabs/BatchesTab';
export { CheckpointsTab } from './components/tabs/CheckpointsTab';
export { ContractsTab } from './components/tabs/ContractsTab';
export { CostsTab } from './components/tabs/CostsTab';
export { EquipmentTab } from './components/tabs/EquipmentTab';
export { LocationsTab } from './components/tabs/LocationsTab';
export { OperatorsTab } from './components/tabs/OperatorsTab';
export { SLAsTab } from './components/tabs/SLAsTab';
export { SubProjectsTab } from './components/tabs/SubProjectsTab';

// API Hooks
export * from './api/hooks';

// Types
export * from './types';
