import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useProject } from '../api/hooks';
import { StatusBadge } from './core/StatusBadge';
import { ProjectDashboard } from './dashboard/ProjectDashboard';
import { SubProjectsTab } from './tabs/SubProjectsTab';
import { BatchesTab } from './tabs/BatchesTab';
import { OperatorsTab } from './tabs/OperatorsTab';
import { LocationsTab } from './tabs/LocationsTab';
import { CostsTab } from './tabs/CostsTab';
import { SLAsTab } from './tabs/SLAsTab';
import { EquipmentTab } from './tabs/EquipmentTab';
import { AnalyticsTab } from './tabs/AnalyticsTab';
import { ContractsTab } from './tabs/ContractsTab';
import { CheckpointsTab } from './tabs/CheckpointsTab';
import {
  ArrowLeftIcon,
  LayoutDashboardIcon,
  FolderTreeIcon,
  BoxIcon,
  UsersIcon,
  MapPinIcon,
  DollarSignIcon,
  ShieldCheckIcon,
  WrenchIcon,
  BarChart3Icon,
  FileTextIcon,
  FlagIcon,
  SettingsIcon,
} from 'lucide-react';

type TabId =
  | 'dashboard'
  | 'sub-projects'
  | 'batches'
  | 'operators'
  | 'locations'
  | 'costs'
  | 'slas'
  | 'equipment'
  | 'analytics'
  | 'contracts'
  | 'checkpoints';

interface Tab {
  id: TabId;
  label: string;
  icon: typeof LayoutDashboardIcon;
}

const tabs: Tab[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
  { id: 'sub-projects', label: 'Sub-Projects', icon: FolderTreeIcon },
  { id: 'batches', label: 'Batches', icon: BoxIcon },
  { id: 'operators', label: 'Operators', icon: UsersIcon },
  { id: 'locations', label: 'Locations', icon: MapPinIcon },
  { id: 'costs', label: 'Costs & Budget', icon: DollarSignIcon },
  { id: 'slas', label: 'SLAs', icon: ShieldCheckIcon },
  { id: 'equipment', label: 'Equipment', icon: WrenchIcon },
  { id: 'analytics', label: 'Analytics', icon: BarChart3Icon },
  { id: 'contracts', label: 'Contracts', icon: FileTextIcon },
  { id: 'checkpoints', label: 'Checkpoints', icon: FlagIcon },
];

interface ProjectDetailProps {
  projectId: string;
  onBack: () => void;
}

export function ProjectDetail({ projectId, onBack }: ProjectDetailProps) {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const { data: project, isLoading } = useProject(projectId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-16 bg-white/5 rounded-lg animate-pulse" />
        <div className="h-12 bg-white/5 rounded-lg animate-pulse" />
        <div className="h-96 bg-white/5 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-16 text-white/40">
        <p>Project not found</p>
        <button onClick={onBack} className="mt-4 text-cyan-400 hover:underline">
          Back to projects
        </button>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <ProjectDashboard projectId={projectId} />;
      case 'sub-projects':
        return <SubProjectsTab projectId={projectId} />;
      case 'batches':
        return <BatchesTab projectId={projectId} />;
      case 'operators':
        return <OperatorsTab projectId={projectId} />;
      case 'locations':
        return <LocationsTab />;
      case 'costs':
        return <CostsTab projectId={projectId} />;
      case 'slas':
        return <SLAsTab projectId={projectId} />;
      case 'equipment':
        return <EquipmentTab />;
      case 'analytics':
        return <AnalyticsTab projectId={projectId} />;
      case 'contracts':
        return <ContractsTab projectId={projectId} />;
      case 'checkpoints':
        return <CheckpointsTab projectId={projectId} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={onBack}
            className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-md transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-mono text-white/40">{project.code}</span>
              <StatusBadge status={project.status} pulse={project.status === 'active'} />
            </div>
            <h1 className="text-xl font-bold text-white truncate">{project.name}</h1>
          </div>
        </div>
        <button className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-md transition-colors">
          <SettingsIcon className="w-5 h-5" />
        </button>
      </header>

      {/* Tab Navigation */}
      <nav className="relative">
        {/* Scrollable tab container */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-all',
                  isActive
                    ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/30'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
        {/* Gradient fade on edges */}
        <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-[var(--sp-bg-primary)] to-transparent pointer-events-none" />
      </nav>

      {/* Tab Content */}
      <div className="min-h-[500px]">{renderTabContent()}</div>
    </div>
  );
}
