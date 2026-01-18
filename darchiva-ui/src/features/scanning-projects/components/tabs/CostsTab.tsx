import { cn } from '@/lib/utils';
import { useProjectCosts, useProjectBudget } from '../../api/hooks';
import { MetricCard } from '../core/MetricCard';
import { DataTable, type Column } from '../core/DataTable';
import type { ProjectCost } from '../../types';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  DollarSignIcon,
  TrendingUpIcon,
  AlertTriangleIcon,
  PlusIcon,
  DownloadIcon,
} from 'lucide-react';

interface CostsTabProps {
  projectId: string;
}

const COLORS = ['#22d3ee', '#a78bfa', '#34d399', '#fbbf24', '#fb923c', '#f472b6'];

export function CostsTab({ projectId }: CostsTabProps) {
  const { data: costs, isLoading: costsLoading } = useProjectCosts(projectId);
  const { data: budget, isLoading: budgetLoading } = useProjectBudget(projectId);

  const isLoading = costsLoading || budgetLoading;

  // Aggregate costs by category
  const costsByCategory = costs?.reduce((acc, cost) => {
    const cat = cost.category || 'Other';
    acc[cat] = (acc[cat] || 0) + cost.total_cost;
    return acc;
  }, {} as Record<string, number>) ?? {};

  const pieData = Object.entries(costsByCategory).map(([name, value]) => ({ name, value }));

  // Calculate budget status
  const totalSpent = budget?.spent_to_date ?? 0;
  const totalBudget = budget?.total_budget ?? 0;
  const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const isOverBudget = budgetUtilization > 100;
  const isNearBudget = budgetUtilization > 85 && !isOverBudget;

  const columns: Column<ProjectCost>[] = [
    {
      key: 'cost_date',
      header: 'Date',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-white/70">
          {new Date(row.cost_date).toLocaleDateString()}
        </span>
      ),
    },
    { key: 'cost_type', header: 'Type' },
    { key: 'category', header: 'Category', render: (row) => row.category || '-' },
    { key: 'description', header: 'Description', render: (row) => row.description || '-' },
    {
      key: 'quantity',
      header: 'Qty',
      align: 'right',
      render: (row) => <span className="font-mono">{row.quantity}</span>,
    },
    {
      key: 'unit_cost',
      header: 'Unit Cost',
      align: 'right',
      render: (row) => <span className="font-mono">${row.unit_cost.toFixed(2)}</span>,
    },
    {
      key: 'total_cost',
      header: 'Total',
      align: 'right',
      sortable: true,
      render: (row) => (
        <span className="font-mono font-medium text-white">${row.total_cost.toFixed(2)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Budget Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Total Budget"
          value={`$${totalBudget.toLocaleString()}`}
          icon={<DollarSignIcon className="w-4 h-4" />}
        />
        <MetricCard
          label="Spent to Date"
          value={`$${totalSpent.toLocaleString()}`}
          sublabel={`${budgetUtilization.toFixed(1)}% of budget`}
          icon={<TrendingUpIcon className="w-4 h-4" />}
          accent={isOverBudget ? 'red' : isNearBudget ? 'amber' : 'emerald'}
        />
        <MetricCard
          label="Remaining"
          value={`$${Math.max(0, totalBudget - totalSpent).toLocaleString()}`}
          icon={<DollarSignIcon className="w-4 h-4" />}
          accent={isOverBudget ? 'red' : 'default'}
        />
        <MetricCard
          label="Cost per Page"
          value={budget?.cost_per_page ? `$${budget.cost_per_page.toFixed(3)}` : '-'}
          sublabel={budget?.target_cost_per_page ? `Target: $${budget.target_cost_per_page.toFixed(3)}` : undefined}
          icon={<DollarSignIcon className="w-4 h-4" />}
          accent={
            budget?.cost_per_page && budget?.target_cost_per_page
              ? budget.cost_per_page > budget.target_cost_per_page ? 'amber' : 'emerald'
              : 'default'
          }
        />
      </div>

      {/* Budget Utilization Bar */}
      {budget && (
        <div className={cn(
          'p-4 rounded-lg border',
          isOverBudget ? 'bg-red-500/10 border-red-500/30' : isNearBudget ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/[0.02] border-white/10'
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {(isOverBudget || isNearBudget) && <AlertTriangleIcon className={cn('w-4 h-4', isOverBudget ? 'text-red-400' : 'text-amber-400')} />}
              <span className="font-medium text-white">Budget Utilization</span>
            </div>
            <span className={cn('font-mono font-bold', isOverBudget ? 'text-red-400' : isNearBudget ? 'text-amber-400' : 'text-white')}>
              {budgetUtilization.toFixed(1)}%
            </span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                isOverBudget ? 'bg-red-400' : isNearBudget ? 'bg-amber-400' : 'bg-emerald-400'
              )}
              style={{ width: `${Math.min(100, budgetUtilization)}%` }}
            />
          </div>
          {/* Budget category breakdown */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-4">
            {[
              { label: 'Labor', value: budget.labor_budget },
              { label: 'Equipment', value: budget.equipment_budget },
              { label: 'Materials', value: budget.materials_budget },
              { label: 'Storage', value: budget.storage_budget },
              { label: 'Other', value: budget.other_budget },
              { label: 'Contingency', value: budget.contingency_budget },
            ].map((item, idx) => (
              <div key={item.label} className="text-center">
                <div className="text-xs text-white/50 mb-1">{item.label}</div>
                <div className="font-mono text-sm text-white">${item.value.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4">
          <h3 className="font-semibold text-white mb-4">Cost Distribution</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-white/40">No cost data</div>
          )}
          <div className="flex flex-wrap gap-3 mt-4">
            {pieData.map((item, idx) => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-white/70">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4">
          <h3 className="font-semibold text-white mb-4">Monthly Cost Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={[
              { month: 'Oct', amount: 12500 },
              { month: 'Nov', amount: 18700 },
              { month: 'Dec', amount: 15200 },
              { month: 'Jan', amount: 21400 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
              <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Cost']}
              />
              <Bar dataKey="amount" fill="#22d3ee" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cost Records Table */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Cost Records</h2>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 rounded-md text-sm transition-colors">
            <DownloadIcon className="w-4 h-4" />
            Export
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-md text-sm transition-colors">
            <PlusIcon className="w-4 h-4" />
            Add Cost
          </button>
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/10 rounded-lg overflow-hidden">
        <DataTable
          columns={columns}
          data={costs ?? []}
          loading={isLoading}
          emptyMessage="No costs recorded"
        />
      </div>
    </div>
  );
}
