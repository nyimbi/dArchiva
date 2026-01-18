import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { VelocityDataPoint } from '../../../types';

interface VelocityChartProps {
  data: VelocityDataPoint[];
}

export function VelocityChart({ data }: VelocityChartProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatNumber = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const avgTarget = data.length > 0 ? data.reduce((sum, d) => sum + d.target, 0) / data.length : 0;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
          formatter={(value: number, name: string) => {
            const labels: Record<string, string> = {
              pages_scanned: 'Scanned',
              pages_verified: 'Verified',
              target: 'Target',
              moving_average: '7-Day Avg',
            };
            return [formatNumber(value), labels[name] || name];
          }}
        />
        <ReferenceLine y={avgTarget} stroke="rgba(251,191,36,0.4)" strokeDasharray="4 4" />
        <Bar
          dataKey="pages_scanned"
          fill="rgba(34,211,238,0.6)"
          radius={[2, 2, 0, 0]}
          maxBarSize={20}
        />
        <Bar
          dataKey="pages_verified"
          fill="rgba(52,211,153,0.6)"
          radius={[2, 2, 0, 0]}
          maxBarSize={20}
        />
        <Line
          type="monotone"
          dataKey="target"
          stroke="rgba(251,191,36,0.8)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="moving_average"
          stroke="rgba(167,139,250,1)"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
