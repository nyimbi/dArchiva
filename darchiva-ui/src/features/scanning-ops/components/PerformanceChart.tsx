import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useOperatorPerformance } from '../api/hooks';

export function PerformanceChart() {
    const { data = [], isLoading } = useOperatorPerformance();

    if (isLoading) {
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-full flex items-center justify-center">
                <div className="animate-pulse text-slate-500">Loading performance data...</div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-full flex flex-col">
            <h3 className="text-lg font-bold text-slate-200 uppercase tracking-wider mb-6">
                Hourly Throughput
            </h3>

            <div className="flex-1 min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <XAxis
                            dataKey="name"
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip
                            cursor={{ fill: '#1e293b' }}
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                        />
                        <Bar dataKey="pages" radius={[4, 4, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.pages > 500 ? '#eab308' : '#d4af37'}
                                    fillOpacity={entry.pages > 500 ? 1 : 0.7}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
                {data.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-500 pointer-events-none">
                        No scanning activity yet today.
                    </div>
                )}
            </div>
        </div>
    );
}
