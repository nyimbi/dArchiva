import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ProjectList } from './components/ProjectList';
import { ProjectDetail } from './components/ProjectDetail';
import { QuickActionsPanel } from './components/QuickActionsPanel';
import type { ScanningProject } from './types';
import { useStore } from '@/hooks/useStore';
import './styles/theme.css';

type ViewMode = 'list' | 'detail';

export function ScanningProjectsPage() {
  const { openModal } = useStore();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedProject, setSelectedProject] = useState<ScanningProject | null>(null);

  const handleSelectProject = (project: ScanningProject) => {
    setSelectedProject(project);
    setViewMode('detail');
  };

  const handleBack = () => {
    setViewMode('list');
    setSelectedProject(null);
  };

  return (
    <div className="sp-container sp-grid-texture min-h-screen">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Page Layout */}
        <div className="flex gap-6">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {viewMode === 'list' ? (
              <ProjectList
                onSelectProject={handleSelectProject}
                onCreateProject={() => openModal('create-project')}
              />
            ) : selectedProject ? (
              <ProjectDetail projectId={selectedProject.id} onBack={handleBack} />
            ) : null}
          </div>

          {/* Sidebar - Quick Actions */}
          <aside className="w-80 flex-shrink-0 hidden xl:block">
            <div className="sticky top-8">
              <QuickActionsPanel projectId={selectedProject?.id} />

              {/* System Status */}
              <div className="mt-6 p-4 bg-white/[0.02] border border-white/10 rounded-lg">
                <h3 className="text-sm font-semibold text-white/70 mb-3">System Status</h3>
                <div className="space-y-2">
                  <StatusIndicator label="API" status="operational" />
                  <StatusIndicator label="OCR Workers" status="operational" />
                  <StatusIndicator label="Storage" status="operational" />
                  <StatusIndicator label="Database" status="operational" />
                </div>
              </div>

              {/* Keyboard Shortcuts */}
              <div className="mt-6 p-4 bg-white/[0.02] border border-white/10 rounded-lg">
                <h3 className="text-sm font-semibold text-white/70 mb-3">Shortcuts</h3>
                <div className="space-y-1 text-xs text-white/50">
                  <div className="flex justify-between">
                    <span>New Project</span>
                    <kbd className="px-1.5 py-0.5 bg-white/5 rounded font-mono">⌘ N</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Search</span>
                    <kbd className="px-1.5 py-0.5 bg-white/5 rounded font-mono">⌘ K</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Go Back</span>
                    <kbd className="px-1.5 py-0.5 bg-white/5 rounded font-mono">Esc</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Refresh</span>
                    <kbd className="px-1.5 py-0.5 bg-white/5 rounded font-mono">⌘ R</kbd>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function StatusIndicator({ label, status }: { label: string; status: 'operational' | 'degraded' | 'down' }) {
  const colors = {
    operational: 'bg-emerald-400',
    degraded: 'bg-amber-400',
    down: 'bg-red-400',
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-white/50">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={cn('w-1.5 h-1.5 rounded-full', colors[status])} />
        <span className="text-[10px] text-white/40 capitalize">{status}</span>
      </div>
    </div>
  );
}

export default ScanningProjectsPage;
