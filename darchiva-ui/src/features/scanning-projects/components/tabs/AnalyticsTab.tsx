import { cn } from '@/lib/utils';
import {
  useBurndownChart,
  useVelocityChart,
  useCapacityPlans,
  useWorkloadForecasts,
} from '../../api/hooks';
import { MetricCard } from '../core/MetricCard';
import { BurndownChart } from '../dashboard/charts/BurndownChart';
import { VelocityChart } from '../dashboard/charts/VelocityChart';
import type { CapacityPlan, WorkloadForecast } from '../../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import {
  TrendingUpIcon,
  TargetIcon,
  BarChart3Icon,
  ActivityIcon,
  CalendarIcon,
  UsersIcon,
  PrinterIcon,
} from 'lucide-react';

interface AnalyticsTabProps {
  projectId: string;
}

export function AnalyticsTab({ projectId }: AnalyticsTabProps) {
  const { data: burndown } = useBurndownChart(projectId);
  const { data: velocity } = useVelocityChart(projectId);
  const { data: capacityPlans } = useCapacityPlans(projectId);
  const { data: forecasts } = useWorkloadForecasts(projectId);

  const latestPlan = capacityPlans?.[0];
  const latestForecast = forecasts?.[0];

  return (
    <div className="space-y-6">
      {/* Capacity Planning Summary */}
      {latestPlan && (
        <div className="p-4 bg-white/[0.02] border border-white/10 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <TargetIcon className="w-4 h-4 text-cyan-400" />
              Capacity Analysis
            </h3>
            <span className={cn(
              'text-xs px-2 py-1 rounded font-mono',
              latestPlan.capacity_gap <= 0
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-amber-500/20 text-amber-400'
            )}>
              {latestPlan.capacity_gap <= 0 ? 'On Track' : `Gap: ${latestPlan.capacity_gap.toLocaleString()} pages/day`}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div className="text-center p-3 bg-white/5 rounded">
              <div className="text-2xl font-mono font-bold text-white">
                {latestPlan.total_pages_remaining.toLocaleString()}
              </div>
              <div className="text-xs text-white/50">Pages Remaining</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded">
              <div className="text-2xl font-mono font-bold text-white">
                {latestPlan.working_days_remaining}
              </div>
              <div className="text-xs text-white/50">Days Remaining</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded">
              <div className="text-2xl font-mono font-bold text-cyan-400">
                {latestPlan.required_pages_per_day.toLocaleString()}
              </div>
              <div className="text-xs text-white/50">Required/Day</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded">
              <div className="text-2xl font-mono font-bold text-white">
                {latestPlan.current_daily_capacity.toLocaleString()}
              </div>
              <div className="text-xs text-white/50">Current Capacity</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded">
              <div className="text-2xl font-mono font-bold text-purple-400">
                {(latestPlan.confidence_score * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-white/50">Confidence</div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded">
              <UsersIcon className="w-5 h-5 text-cyan-400" />
              <div>
                <div className="text-lg font-mono font-bold text-white">
                  {latestPlan.recommended_operators}
                </div>
                <div className="text-xs text-white/50">Operators Needed</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded">
              <PrinterIcon className="w-5 h-5 text-purple-400" />
              <div>
                <div className="text-lg font-mono font-bold text-white">
                  {latestPlan.recommended_scanners}
                </div>
                <div className="text-xs text-white/50">Scanners Needed</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded">
              <CalendarIcon className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-lg font-mono font-bold text-white">
                  {latestPlan.recommended_shifts_per_day}
                </div>
                <div className="text-xs text-white/50">Shifts/Day</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Burndown */}
        <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <TargetIcon className="w-4 h-4 text-cyan-400" />
            Burndown Chart
          </h3>
          {burndown ? (
            <BurndownChart data={burndown} />
          ) : (
            <div className="h-[280px] flex items-center justify-center text-white/40">
              No burndown data
            </div>
          )}
        </div>

        {/* Velocity */}
        <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUpIcon className="w-4 h-4 text-emerald-400" />
            Velocity Chart
          </h3>
          {velocity ? (
            <VelocityChart data={velocity} />
          ) : (
            <div className="h-[280px] flex items-center justify-center text-white/40">
              No velocity data
            </div>
          )}
        </div>
      </div>

      {/* Workload Forecast */}
      {forecasts && forecasts.length > 0 && (
        <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <ActivityIcon className="w-4 h-4 text-purple-400" />
            Workload Forecast
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={forecasts.slice(0, 14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="forecast_period_start"
                tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                stroke="rgba(255,255,255,0.3)"
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }}
              />
              <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                }}
              />
              <Area
                type="monotone"
                dataKey="predicted_pages"
                stroke="#a78bfa"
                fill="rgba(167,139,250,0.2)"
                strokeWidth={2}
              />
              {forecasts.some((f: WorkloadForecast) => f.actual_pages) && (
                <Line
                  type="monotone"
                  dataKey="actual_pages"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  dot={{ fill: '#22d3ee' }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 text-xs text-white/50">
            <span className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-purple-400 rounded" /> Predicted
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-cyan-400 rounded" /> Actual
            </span>
            {latestForecast && (
              <span className="ml-auto font-mono">
                Accuracy: {latestForecast.accuracy ? `${(latestForecast.accuracy * 100).toFixed(0)}%` : 'N/A'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
