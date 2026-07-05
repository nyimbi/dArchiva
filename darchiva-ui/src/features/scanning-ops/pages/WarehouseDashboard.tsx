import { AlertTriangle, ArrowLeft, ArrowRight, BarChart3, History, Layers, Map, Package } from 'lucide-react';
import { useState } from 'react';
import {
    useAssignedBatches,
    useThroughputData,
    useWarehouseActivity,
    useWarehouseScan,
} from '../api/hooks';
import type { AssignedBatch } from '../api/hooks';

// ── Types ─────────────────────────────────────────────────────────────────────

type MainTab = 'bundles' | 'floor' | 'throughput';

// ── Helpers ───────────────────────────────────────────────────────────────────

const BUNDLE_STATUS: Record<string, { label: string; dot: string; text: string }> = {
    pending:      { label: 'Staged',     dot: 'bg-slate-500',  text: 'text-slate-400'  },
    in_progress:  { label: 'Scanning',   dot: 'bg-blue-500',   text: 'text-blue-400'   },
    scanning:     { label: 'Scanning',   dot: 'bg-blue-500',   text: 'text-blue-400'   },
    qc_pending:   { label: 'QC',         dot: 'bg-amber-500',  text: 'text-amber-400'  },
    qc_failed:    { label: 'QC Failed',  dot: 'bg-red-500',    text: 'text-red-400'    },
    completed:    { label: 'Completed',  dot: 'bg-green-500',  text: 'text-green-400'  },
    qc_passed:    { label: 'Completed',  dot: 'bg-green-500',  text: 'text-green-400'  },
};

function getBundleStatus(status: string) {
    return BUNDLE_STATUS[status] ?? { label: status, dot: 'bg-slate-600', text: 'text-slate-400' };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BundleRow({ batch }: { batch: AssignedBatch }) {
    const cfg = getBundleStatus(batch.status);
    return (
        <div className="flex items-center gap-4 px-4 py-3 hover:bg-slate-800/40 transition-colors rounded-lg">
            <div className="font-mono text-xs font-bold text-brass-400 w-28 shrink-0">
                {batch.batch_number}
            </div>
            <div className="text-xs text-slate-400 flex-1 truncate">
                {batch.physical_location}
            </div>
            <div className="text-xs text-slate-500 w-20 text-right shrink-0">
                {batch.estimated_pages.toLocaleString()} pg
            </div>
            <div className="flex items-center gap-1.5 w-24 shrink-0">
                <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${['in_progress','scanning'].includes(batch.status) ? 'animate-pulse' : ''}`} />
                <span className={`text-xs font-bold ${cfg.text}`}>{cfg.label}</span>
            </div>
        </div>
    );
}

function BundlesPanel({ batches }: { batches: AssignedBatch[] }) {
    const active   = batches.filter(b => ['in_progress','scanning'].includes(b.status));
    const staged   = batches.filter(b => b.status === 'pending');
    const qc       = batches.filter(b => ['qc_pending','qc_failed'].includes(b.status));
    const done     = batches.filter(b => ['completed','qc_passed'].includes(b.status));

    const sections = [
        { label: 'Scanning', items: active,  accent: 'text-blue-400'  },
        { label: 'Staged',   items: staged,  accent: 'text-slate-400' },
        { label: 'QC',       items: qc,      accent: 'text-amber-400' },
        { label: 'Done',     items: done,    accent: 'text-green-400' },
    ].filter(s => s.items.length > 0);

    if (batches.length === 0) {
        return (
            <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
                No active bundles
            </div>
        );
    }

    return (
        <div className="space-y-6 overflow-y-auto flex-1">
            {sections.map(section => (
                <div key={section.label}>
                    <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${section.accent}`}>
                        {section.label} ({section.items.length})
                    </div>
                    <div className="bg-slate-950/60 rounded-xl overflow-hidden divide-y divide-slate-800/50">
                        {section.items.slice(0, 20).map(batch => (
                            <BundleRow key={batch.id} batch={batch} />
                        ))}
                        {section.items.length > 20 && (
                            <div className="px-4 py-2 text-xs text-slate-600 text-center">
                                +{section.items.length - 20} more
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

function FloorPlan({ batches }: { batches: AssignedBatch[] }) {
    const active = batches.filter(b => ['in_progress','scanning'].includes(b.status));

    type BatchWithStation = AssignedBatch & Partial<Record<
        'station_id' | 'station_number' | 'station_name' |
        'workstation_id' | 'workstation_name' |
        'scanner_id' | 'scanner_name',
        string | number | null
    >>;

    const stationFields: (keyof BatchWithStation)[] = [
        'station_id',
        'station_number',
        'station_name',
        'workstation_id',
        'workstation_name',
        'scanner_id',
        'scanner_name',
    ];

    const getStationId = (batch: AssignedBatch) => {
        const batchWithStation = batch as BatchWithStation;
        for (const field of stationFields) {
            const value = batchWithStation[field];
            if (value !== undefined && value !== null && String(value).trim() !== '') {
                return String(value);
            }
        }
        return null;
    };

    const activeByStation = new Map<string, AssignedBatch>();
    for (const batch of active) {
        const stationId = getStationId(batch);
        if (stationId && !activeByStation.has(stationId)) {
            activeByStation.set(stationId, batch);
        }
    }

    const stationIds = Array.from(new Set(batches.map(getStationId).filter((id): id is string => Boolean(id))));
    const stations = stationIds.length > 0
        ? stationIds.map(stationId => ({
            id: stationId,
            label: `Station ${stationId}`,
            batch: activeByStation.get(stationId) ?? null,
        }))
        : batches.map((batch, index) => ({
            id: batch.id,
            label: `Batch ${String(index + 1).padStart(2, '0')}`,
            batch: ['in_progress','scanning'].includes(batch.status) ? batch : null,
        }));

    const activeStationCount = stations.filter(station => station.batch).length;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-blue-500/40 border border-blue-500/60" />
                    <span className="text-slate-500">Scanning</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm bg-slate-800 border border-slate-700" />
                    <span className="text-slate-500">Empty</span>
                </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
                {stations.map(station => (
                    <div
                        key={station.id}
                        className={`rounded-xl border p-3 text-center transition-all ${
                            station.batch
                                ? 'bg-blue-500/10 border-blue-500/30'
                                : 'bg-slate-800/40 border-slate-700/40'
                        }`}
                    >
                        <div className={`text-xs font-bold uppercase mb-1 ${station.batch ? 'text-blue-400' : 'text-slate-600'}`}>
                            {station.label}
                        </div>
                        {station.batch ? (
                            <>
                                <div className="text-xs text-slate-300 font-mono truncate">
                                    {station.batch.batch_number}
                                </div>
                                <div className="mt-1.5 flex justify-center">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                </div>
                            </>
                        ) : (
                            <div className="text-xs text-slate-700">Empty</div>
                        )}
                    </div>
                ))}
            </div>
            <div className="text-xs text-slate-600 text-center">
                {activeStationCount} of {stations.length} stations active
            </div>
        </div>
    );
}

function ThroughputChart() {
    const { data: hours = [] } = useThroughputData();
    const maxPages = Math.max(...hours.map(h => h.pages), 1);
    const totalPages = hours.reduce((s, h) => s + h.pages, 0);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-brass-400">{totalPages.toLocaleString()}</span>
                <span className="text-sm text-slate-500">pages in last 8 hours</span>
            </div>
            <div className="flex items-end gap-1.5 h-40">
                {hours.map((h, i) => {
                    const pct = h.pages > 0 ? Math.max(4, (h.pages / maxPages) * 100) : 2;
                    return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full">
                            {h.pages > 0 && (
                                <span className="text-[10px] font-mono text-slate-500">{h.pages}</span>
                            )}
                            <div className="w-full flex-1 flex items-end">
                                <div
                                    className="w-full rounded-t-sm transition-all duration-500"
                                    style={{
                                        height: `${pct}%`,
                                        background: h.pages > 0
                                            ? 'rgba(180,130,60,0.7)'
                                            : 'rgba(100,100,120,0.2)',
                                    }}
                                />
                            </div>
                            <span className="text-[10px] font-mono text-slate-600">{h.hour}</span>
                        </div>
                    );
                })}
            </div>
            {totalPages === 0 && (
                <p className="text-xs text-slate-600 text-center">No throughput data yet — data appears as scanning progresses</p>
            )}
        </div>
    );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, color = 'text-slate-200' }: { label: string; value: string | number; color?: string }) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export function WarehouseDashboard() {
    const [activeTab, setActiveTab]     = useState<'check-out' | 'check-in'>('check-out');
    const [mainTab, setMainTab]         = useState<MainTab>('bundles');
    const [scanInput, setScanInput]     = useState('');

    const { data: bundles = [],          isLoading: bundlesLoading } = useAssignedBatches();
    const { data: recentActivity = [],   isLoading: activityLoading } = useWarehouseActivity(10);
    const warehouseScan = useWarehouseScan();

    const handleScan = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && scanInput.trim()) {
            warehouseScan.mutate({ barcode: scanInput.trim().toUpperCase(), action: activeTab });
            setScanInput('');
        }
    };

    // Derived stats
    const totalBundles   = bundles.length;
    const scanning       = bundles.filter(b => ['in_progress','scanning'].includes(b.status)).length;
    const completed      = bundles.filter(b => ['completed','qc_passed'].includes(b.status)).length;
    const alertBundles   = bundles.filter(b => b.status === 'qc_failed');

    const MAIN_TABS: { id: MainTab; label: string; icon: typeof Layers }[] = [
        { id: 'bundles',    label: 'Bundles',     icon: Layers    },
        { id: 'floor',      label: 'Floor Plan',  icon: Map       },
        { id: 'throughput', label: 'Throughput',  icon: BarChart3 },
    ];

    return (
        <div className="h-full flex flex-col gap-5 overflow-hidden">
            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-4 gap-4 shrink-0">
                <StatCard label="Total Bundles"   value={totalBundles}         />
                <StatCard label="Scanning"        value={scanning}             color="text-blue-400"  />
                <StatCard label="Completed Today" value={completed}            color="text-green-400" />
                <StatCard label="QC Failures"     value={alertBundles.length}  color={alertBundles.length > 0 ? 'text-red-400' : 'text-slate-200'} />
            </div>

            {/* ── Alerts ── */}
            {alertBundles.length > 0 && (
                <div className="bg-red-500/5 border border-red-500/30 rounded-xl px-5 py-4 flex items-start gap-3 shrink-0">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                        <span className="text-sm font-bold text-red-300">QC failures need attention: </span>
                        <span className="text-sm text-red-400/80">
                            {alertBundles.map(b => b.batch_number).join(', ')}
                        </span>
                    </div>
                </div>
            )}

            {/* ── Main Layout ── */}
            <div className="flex-1 grid grid-cols-12 gap-5 min-h-0">
                {/* Left: tabbed panel */}
                <div className="col-span-8 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col min-h-0">
                    {/* Tab bar */}
                    <div className="flex gap-1 p-3 border-b border-slate-800 shrink-0">
                        {MAIN_TABS.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setMainTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                                        mainTab === tab.id
                                            ? 'bg-brass-600 text-slate-900'
                                            : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex-1 p-5 min-h-0 overflow-y-auto">
                        {mainTab === 'bundles' && (
                            bundlesLoading
                                ? <div className="text-center text-slate-500 py-10 animate-pulse">Loading bundles…</div>
                                : <BundlesPanel batches={bundles} />
                        )}
                        {mainTab === 'floor' && (
                            <FloorPlan batches={bundles} />
                        )}
                        {mainTab === 'throughput' && (
                            <ThroughputChart />
                        )}
                    </div>
                </div>

                {/* Right: check-in/out + activity */}
                <div className="col-span-4 flex flex-col gap-4 min-h-0">
                    {/* Scanner */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shrink-0">
                        {/* Action tabs */}
                        <div className="flex gap-2 mb-5">
                            <button
                                onClick={() => setActiveTab('check-out')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                                    activeTab === 'check-out'
                                        ? 'bg-brass-500 text-slate-900'
                                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                                }`}
                            >
                                <ArrowRight className="w-4 h-4" /> Check Out
                            </button>
                            <button
                                onClick={() => setActiveTab('check-in')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                                    activeTab === 'check-in'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                                }`}
                            >
                                <ArrowLeft className="w-4 h-4" /> Check In
                            </button>
                        </div>

                        {/* Scan target */}
                        <div className="flex flex-col items-center gap-4">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                                warehouseScan.isPending ? 'bg-brass-600/20 animate-pulse' : 'bg-slate-800'
                            }`}>
                                <Package className={`w-8 h-8 ${warehouseScan.isPending ? 'text-brass-400' : 'text-slate-500'}`} />
                            </div>
                            <p className="text-sm text-slate-400 text-center">
                                {warehouseScan.isPending
                                    ? 'Processing…'
                                    : activeTab === 'check-out'
                                    ? 'Scan box to issue to operator'
                                    : 'Scan box to return to warehouse'}
                            </p>
                            <input
                                type="text"
                                value={scanInput}
                                onChange={e => setScanInput(e.target.value)}
                                onKeyDown={handleScan}
                                placeholder="Scan barcode or type…"
                                className="w-full bg-slate-950 border-2 border-slate-700 rounded-xl px-4 py-3 text-center text-base focus:border-brass-500 outline-none transition-colors"
                                autoFocus
                                disabled={warehouseScan.isPending}
                            />
                            {warehouseScan.isSuccess && (
                                <p className="text-xs text-green-400 font-bold">Scan recorded successfully</p>
                            )}
                            {warehouseScan.isError && (
                                <p className="text-xs text-red-400 font-bold">Scan failed — try again</p>
                            )}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl flex-1 flex flex-col min-h-0">
                        <div className="px-5 py-3 border-b border-slate-800 shrink-0">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <History className="w-3.5 h-3.5" /> Recent Activity
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {activityLoading ? (
                                <div className="text-center text-slate-500 py-4 text-sm animate-pulse">Loading…</div>
                            ) : recentActivity.length === 0 ? (
                                <div className="text-center text-slate-500 py-4 text-sm">No recent activity</div>
                            ) : (
                                recentActivity.map(log => (
                                    <div
                                        key={log.id}
                                        className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800"
                                    >
                                        <div>
                                            <div className="font-bold text-slate-200 text-sm">{log.box_id}</div>
                                            <div className="text-xs text-slate-500 capitalize">{log.action}</div>
                                        </div>
                                        <span className="text-xs font-mono text-slate-600">
                                            {new Date(log.timestamp).toLocaleTimeString([], {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
