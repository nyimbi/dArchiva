import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { BurndownDataPoint } from '../../../types';

interface BurndownChartProps {
  data: BurndownDataPoint[];
}

export function BurndownChart({ data }: BurndownChartProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          stroke="rgba(255,255,255,0.3)"
          tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          tickLine={false}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
        />
        <YAxis
          tickFormatter={formatNumber}
          stroke="rgba(255,255,255,0.3)"
          tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          tickLine={false}
          axisLine={false}
          width={50}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            fontFamily: 'JetBrains Mono',
            fontSize: '12px',
          }}
          labelFormatter={formatDate}
          formatter={(value: number, name: string) => [
            formatNumber(value),
            name === 'actual_remaining' ? 'Actual' : name === 'planned_remaining' ? 'Planned' : 'Ideal',
          ]}
        />
        <ReferenceLine x={today} stroke="rgba(251,191,36,0.5)" strokeDasharray="3 3" label={{ value: 'Today', fill: 'rgba(251,191,36,0.7)', fontSize: 10 }} />
        <Line
          type="monotone"
          dataKey="ideal_remaining"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={1}
          strokeDasharray="5 5"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="planned_remaining"
          stroke="rgba(167,139,250,0.8)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="actual_remaining"
          stroke="rgba(34,211,238,1)"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, fill: '#22d3ee', stroke: '#0a0c0f', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
