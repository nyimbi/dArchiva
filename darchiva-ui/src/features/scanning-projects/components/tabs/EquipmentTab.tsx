import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { useEquipmentMaintenance } from '../../api/hooks';
import { StatusBadge } from '../core/StatusBadge';
import { MetricCard } from '../core/MetricCard';
import { ScannerDiscovery } from '../ScannerDiscovery';
import type { EquipmentMaintenance, MaintenanceStatus } from '../../types';
import {
  WrenchIcon,
  PrinterIcon,
  CalendarIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  Search,
  X,
} from 'lucide-react';

const statusColors: Record<MaintenanceStatus, string> = {
  scheduled: 'border-l-blue-400',
  in_progress: 'border-l-cyan-400',
  completed: 'border-l-emerald-400',
  overdue: 'border-l-red-400',
};

export function EquipmentTab() {
  const [showDiscovery, setShowDiscovery] = useState(false);
  const { data: maintenance, isLoading } = useEquipmentMaintenance();

  const now = new Date();
  const upcoming = maintenance?.filter((m: EquipmentMaintenance) =>
    m.status === 'scheduled' && new Date(m.scheduled_date) > now
  ).sort((a: EquipmentMaintenance, b: EquipmentMaintenance) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()) ?? [];

  const overdue = maintenance?.filter((m: EquipmentMaintenance) => m.status === 'overdue') ?? [];
  const inProgress = maintenance?.filter((m: EquipmentMaintenance) => m.status === 'in_progress') ?? [];
  const completed = maintenance?.filter((m: EquipmentMaintenance) => m.status === 'completed') ?? [];

  const totalDowntimeHours = maintenance?.reduce((sum: number, m: EquipmentMaintenance) => sum + (m.actual_downtime_hours || 0), 0) ?? 0;
  const totalMaintenanceCost = maintenance?.reduce((sum: number, m: EquipmentMaintenance) => sum + m.cost, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Overdue"
          value={overdue.length}
          icon={<AlertTriangleIcon className="w-4 h-4" />}
          accent={overdue.length > 0 ? 'red' : 'default'}
          pulse={overdue.length > 0}
        />
        <MetricCard
          label="Scheduled"
          value={upcoming.length}
          icon={<CalendarIcon className="w-4 h-4" />}
          accent="cyan"
        />
        <MetricCard
          label="Total Downtime"
          value={`${totalDowntimeHours.toFixed(1)}h`}
          icon={<ClockIcon className="w-4 h-4" />}
        />
        <MetricCard
          label="Maintenance Cost"
          value={`$${totalMaintenanceCost.toLocaleString()}`}
          icon={<WrenchIcon className="w-4 h-4" />}
        />
      </div>

      {/* Overdue Alert */}
      {overdue.length > 0 && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangleIcon className="w-4 h-4 text-red-400" />
            <span className="font-semibold text-red-400">{overdue.length} Overdue Maintenance</span>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {overdue.map((item: EquipmentMaintenance) => (
              <div key={item.id} className="p-3 bg-black/20 rounded flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="text-xs text-white/40">
                    Due: {new Date(item.scheduled_date).toLocaleDateString()}
                  </p>
                </div>
                <button className="px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded">
                  Schedule Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Maintenance Schedule</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDiscovery(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-md text-sm transition-colors"
          >
            <Search className="w-4 h-4" />
            Discover Scanners
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-md text-sm transition-colors">
            <PlusIcon className="w-4 h-4" />
            Schedule Maintenance
          </button>
        </div>
      </div>

      {/* Scanner Discovery Dialog */}
      <Dialog.Root open={showDiscovery} onOpenChange={setShowDiscovery}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[85vh] overflow-hidden bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <Dialog.Title className="text-lg font-semibold text-slate-100">
                Discover Network Scanners
              </Dialog.Title>
              <Dialog.Close className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </Dialog.Close>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(85vh-80px)]">
              <ScannerDiscovery
                onScannerAdded={(scanner, config) => {
                  console.log('Scanner added:', scanner, config);
                  setShowDiscovery(false);
                }}
              />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Maintenance List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {/* In Progress */}
          {inProgress.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-cyan-400 mb-2 flex items-center gap-2">
                <WrenchIcon className="w-4 h-4" />
                In Progress
              </h3>
              {inProgress.map((item: EquipmentMaintenance) => (
                <MaintenanceCard key={item.id} item={item} />
              ))}
            </div>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-white/50 mb-2">Upcoming</h3>
              <div className="space-y-2">
                {upcoming.slice(0, 5).map((item: EquipmentMaintenance) => (
                  <MaintenanceCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-white/50 mb-2">Recently Completed</h3>
              <div className="space-y-2">
                {completed.slice(0, 3).map((item: EquipmentMaintenance) => (
                  <MaintenanceCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MaintenanceCard({ item }: { item: EquipmentMaintenance }) {
  return (
    <div
      className={cn(
        'p-4 bg-white/[0.02] border border-white/10 rounded-lg border-l-2 hover:bg-white/[0.04] transition-colors',
        statusColors[item.status]
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
            <PrinterIcon className="w-5 h-5 text-white/40" />
          </div>
          <div>
            <h4 className="font-medium text-white">{item.title}</h4>
            <p className="text-xs text-white/40 mb-1">{item.maintenance_type}</p>
            {item.description && (
              <p className="text-sm text-white/60">{item.description}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <StatusBadge status={item.status} size="sm" />
          <div className="text-xs text-white/40 mt-1 font-mono">
            {new Date(item.scheduled_date).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/5 text-xs text-white/50">
        <span className="flex items-center gap-1">
          <ClockIcon className="w-3 h-3" />
          {item.estimated_downtime_hours}h downtime
        </span>
        {item.technician_name && <span>Tech: {item.technician_name}</span>}
        {item.cost > 0 && <span className="font-mono">${item.cost.toLocaleString()}</span>}
        {item.priority <= 2 && (
          <span className="text-red-400 font-medium">HIGH PRIORITY</span>
        )}
      </div>
    </div>
  );
}
