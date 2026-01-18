import { cn } from '@/lib/utils';
import { useLocations, useMultiLocationDashboard } from '../../api/hooks';
import { MetricCard } from '../core/MetricCard';
import type { ScanningLocation, LocationDashboard } from '../../types';
import {
  MapPinIcon,
  UsersIcon,
  PrinterIcon,
  GaugeIcon,
  PlusIcon,
  BuildingIcon,
  PhoneIcon,
  MailIcon,
} from 'lucide-react';

export function LocationsTab() {
  const { data: locations, isLoading: locationsLoading } = useLocations();
  const { data: dashboard, isLoading: dashboardLoading } = useMultiLocationDashboard();

  const isLoading = locationsLoading || dashboardLoading;

  return (
    <div className="space-y-6">
      {/* Global Metrics */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Total Locations"
            value={dashboard.total_locations}
            icon={<MapPinIcon className="w-4 h-4" />}
            accent="cyan"
          />
          <MetricCard
            label="Total Operators"
            value={dashboard.total_operators}
            icon={<UsersIcon className="w-4 h-4" />}
            accent="purple"
          />
          <MetricCard
            label="Total Scanners"
            value={dashboard.total_scanners}
            icon={<PrinterIcon className="w-4 h-4" />}
            accent="emerald"
          />
          <MetricCard
            label="Pages Today"
            value={dashboard.pages_today}
            icon={<GaugeIcon className="w-4 h-4" />}
            pulse
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Scanning Locations</h2>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-md text-sm transition-colors">
          <PlusIcon className="w-4 h-4" />
          Add Location
        </button>
      </div>

      {/* Location Cards Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations?.map((location: ScanningLocation) => {
            const locationDash = dashboard?.locations.find((l: LocationDashboard) => l.location.id === location.id);
            const utilization = locationDash?.capacity_utilization ?? 0;

            return (
              <div
                key={location.id}
                className={cn(
                  'p-4 bg-white/[0.02] border border-white/10 rounded-lg hover:bg-white/[0.04] hover:border-white/15 transition-all cursor-pointer',
                  !location.is_active && 'opacity-50'
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-cyan-400/10 flex items-center justify-center">
                      <BuildingIcon className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-white/40 block">{location.code}</span>
                      <span className="font-semibold text-white">{location.name}</span>
                    </div>
                  </div>
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded',
                    location.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                  )}>
                    {location.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {/* Location Info */}
                <div className="text-xs text-white/50 mb-3">
                  {location.city && location.country && (
                    <div className="flex items-center gap-1 mb-1">
                      <MapPinIcon className="w-3 h-3" />
                      {location.city}, {location.country}
                    </div>
                  )}
                  <div className="text-white/30">TZ: {location.timezone}</div>
                </div>

                {/* Capacity Metrics */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center p-2 bg-white/5 rounded">
                    <div className="font-mono text-lg text-white">{location.scanner_capacity}</div>
                    <div className="text-[10px] text-white/40">Scanners</div>
                  </div>
                  <div className="text-center p-2 bg-white/5 rounded">
                    <div className="font-mono text-lg text-white">{location.operator_capacity}</div>
                    <div className="text-[10px] text-white/40">Operators</div>
                  </div>
                  <div className="text-center p-2 bg-white/5 rounded">
                    <div className="font-mono text-lg text-white">{(location.daily_page_capacity / 1000).toFixed(0)}K</div>
                    <div className="text-[10px] text-white/40">Pages/Day</div>
                  </div>
                </div>

                {/* Utilization Bar */}
                {locationDash && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-white/50">Utilization</span>
                      <span className="font-mono text-white/70">{utilization.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          utilization >= 80 && 'bg-emerald-400',
                          utilization >= 50 && utilization < 80 && 'bg-cyan-400',
                          utilization < 50 && 'bg-amber-400'
                        )}
                        style={{ width: `${utilization}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Contact */}
                {(location.contact_email || location.contact_phone) && (
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-3 text-[10px] text-white/40">
                    {location.contact_email && (
                      <span className="flex items-center gap-1">
                        <MailIcon className="w-3 h-3" />
                        {location.contact_email}
                      </span>
                    )}
                    {location.contact_phone && (
                      <span className="flex items-center gap-1">
                        <PhoneIcon className="w-3 h-3" />
                        {location.contact_phone}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
