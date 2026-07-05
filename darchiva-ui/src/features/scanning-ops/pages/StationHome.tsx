import { Clock, FileText, LogIn, LogOut, Scan, Target, Trophy, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useBrowserScanner } from '@/features/scanning-projects/hooks';
import { toast } from 'sonner';
import {
    useClockIn,
    useClockOut,
    useMyActiveSession,
    useRecentSessions,
    useShiftStats,
} from '../api/hooks';

function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
}

function StatCard({
    label,
    value,
    sub,
    color = 'text-slate-200',
}: {
    label: string;
    value: string | number;
    sub?: string;
    color?: string;
}) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</div>
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
        </div>
    );
}

export function StationHome() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: shiftStats } = useShiftStats();
    const { data: activeSession, isLoading: sessionLoading } = useMyActiveSession();
    const { data: recentSessions = [] } = useRecentSessions(5);
    const { activeScanner, scanners } = useBrowserScanner({ autoDiscover: true });
    const clockIn = useClockIn();
    const clockOut = useClockOut();

    const displayName = user?.username ?? 'Operator';
    const stationTitle = activeScanner?.name
        ? `${activeScanner.name} Ready`
        : activeSession?.project_name
            ? `${activeSession.project_name} Ready`
            : 'Station Ready';
    const targetPages = shiftStats?.target_pages ?? 0;
    const pagesScanned = shiftStats?.pages_scanned ?? 0;
    const qualityScore = shiftStats?.quality_score ?? 0;
    const errorRate = qualityScore > 0 ? (100 - qualityScore).toFixed(1) : null;
    const sessionTime = activeSession ? formatDuration(activeSession.duration_minutes) : null;

    const speedDemonTarget = Math.max(targetPages, 500);
    const speedDemonProgress = speedDemonTarget > 0
        ? Math.min(Math.round((pagesScanned / speedDemonTarget) * 100), 100)
        : 0;
    const perfectionistProgress = Math.min(Math.round(qualityScore), 100);

    const handleClockIn = () => {
        const projectId = new URLSearchParams(window.location.search).get('projectId') ?? '';
        if (!projectId) {
            toast.error('No project selected', {
                description: 'Open a scanning project first, then clock in from the station home.',
            });
            return;
        }
        clockIn.mutate({ project_id: projectId });
    };

    const handleClockOut = () => {
        if (activeSession) clockOut.mutate(activeSession.session_id);
    };

    const errorRateColor =
        errorRate === null ? 'text-slate-400'
        : parseFloat(errorRate) < 5 ? 'text-green-400'
        : parseFloat(errorRate) < 15 ? 'text-amber-400'
        : 'text-red-400';

    const targetPct = targetPages > 0 ? Math.round((pagesScanned / targetPages) * 100) : null;

    return (
        <div className="h-full grid grid-cols-12 gap-6 overflow-hidden">
            {/* ── Left: banner + stats + sessions ── */}
            <div className="col-span-8 flex flex-col gap-5 min-h-0">
                {/* Welcome Banner */}
                <div className="bg-gradient-to-br from-brass-600 to-brass-800 rounded-3xl p-8 text-slate-900 relative overflow-hidden shrink-0">
                    <div className="relative z-10">
                        <h1 className="text-4xl font-bold mb-1">{stationTitle}</h1>
                        <p className="text-lg font-medium opacity-80 mb-6">Welcome back, {displayName}.</p>
                        <div className="flex items-center gap-4 flex-wrap">
                            <button
                                onClick={() => navigate('/scanning/interface')}
                                className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:scale-105 transition-transform flex items-center gap-3"
                            >
                                <Scan className="w-6 h-6" /> Start Scanning
                            </button>

                            {!sessionLoading && (
                                activeSession ? (
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 px-4 py-3 bg-green-900/60 text-green-200 rounded-xl text-sm font-bold">
                                            <Clock className="w-4 h-4 animate-pulse" />
                                            <span>Clocked in — {activeSession.project_name}</span>
                                            {sessionTime && <span className="opacity-70">({sessionTime})</span>}
                                        </div>
                                        <button
                                            onClick={handleClockOut}
                                            disabled={clockOut.isPending}
                                            className="px-5 py-3 bg-red-700 hover:bg-red-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            {clockOut.isPending ? 'Clocking out…' : 'Clock Out'}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleClockIn}
                                        disabled={clockIn.isPending}
                                        className="px-5 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        <LogIn className="w-4 h-4" />
                                        {clockIn.isPending ? 'Clocking in…' : 'Clock In'}
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                    <Scan className="absolute -right-10 -bottom-10 w-72 h-72 opacity-10" />
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-4 shrink-0">
                    <StatCard
                        label="Pages Today"
                        value={pagesScanned.toLocaleString()}
                        sub={targetPages > 0 ? `Target: ${targetPages.toLocaleString()}` : 'No target set'}
                        color="text-brass-400"
                    />
                    <StatCard
                        label="Target"
                        value={targetPct !== null ? `${targetPct}%` : '—'}
                        sub="of daily target"
                        color={
                            targetPct === null ? 'text-slate-400'
                            : targetPct >= 100 ? 'text-green-400'
                            : targetPct >= 75 ? 'text-amber-400'
                            : 'text-slate-200'
                        }
                    />
                    <StatCard
                        label="Error Rate"
                        value={errorRate !== null ? `${errorRate}%` : '—'}
                        sub="based on quality score"
                        color={errorRateColor}
                    />
                    <StatCard
                        label="Session Time"
                        value={sessionTime ?? '—'}
                        sub={activeSession ? 'current session' : 'not clocked in'}
                        color={activeSession ? 'text-blue-400' : 'text-slate-500'}
                    />
                </div>

                {/* Recent Sessions Table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex-1 min-h-0 flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-800 shrink-0">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Recent Sessions
                        </h3>
                    </div>
                    <div className="overflow-y-auto flex-1">
                        {recentSessions.length === 0 ? (
                            <div className="px-6 py-10 text-center text-slate-500 text-sm">No session history available</div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-slate-900">
                                    <tr className="border-b border-slate-800">
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Project</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Pages</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Duration</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {recentSessions.map((session) => (
                                        <tr key={session.session_id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4 text-slate-300">
                                                {new Date(session.started_at).toLocaleDateString([], {
                                                    month: 'short',
                                                    day: 'numeric',
                                                })}
                                            </td>
                                            <td className="px-6 py-4 text-slate-400 max-w-[200px] truncate">
                                                {session.project_name}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-brass-400">
                                                {session.pages_scanned.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-400">
                                                {formatDuration(session.duration_minutes)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Right: assignment + scanner + challenges ── */}
            <div className="col-span-4 flex flex-col gap-5 min-h-0 overflow-y-auto">
                {/* Current Assignment */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shrink-0">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Target className="w-4 h-4" /> Current Assignment
                    </h3>
                    {activeSession ? (
                        <div className="space-y-3">
                            <div>
                                <div className="text-xs text-slate-500 mb-0.5">Project</div>
                                <div className="font-bold text-slate-200">{activeSession.project_name}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 mb-0.5">Target Pages</div>
                                <div className="font-bold text-brass-400">
                                    {targetPages > 0 ? targetPages.toLocaleString() : '—'}
                                </div>
                            </div>
                            {targetPages > 0 && (
                                <>
                                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-brass-500 transition-all duration-500"
                                            style={{
                                                width: `${Math.min(100, (pagesScanned / targetPages) * 100)}%`,
                                            }}
                                        />
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {pagesScanned.toLocaleString()} / {targetPages.toLocaleString()} pages
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="text-slate-500 text-sm text-center py-4">
                            Not clocked in — no active assignment.
                        </div>
                    )}
                </div>

                {/* Scanner Status */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shrink-0">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Scan className="w-4 h-4" /> Scanner Status
                    </h3>
                    {activeScanner ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-green-400 font-bold text-sm">Connected</span>
                            </div>
                            <div className="font-bold text-slate-200">{activeScanner.name}</div>
                            <div className="text-xs text-slate-500">
                                {scanners.length} scanner{scanners.length !== 1 ? 's' : ''} on network
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <WifiOff className="w-4 h-4 text-amber-400" />
                                <span className="text-amber-400 font-bold text-sm">
                                    {scanners.length > 0 ? 'Detected — not configured' : 'Not detected'}
                                </span>
                            </div>
                            <div className="text-xs text-slate-500">
                                {scanners.length > 0
                                    ? `${scanners.length} scanner(s) found on network`
                                    : 'No scanners found on local network'}
                            </div>
                            <button
                                onClick={() => navigate('/scanning/interface')}
                                className="text-xs text-brass-400 hover:text-brass-300 underline underline-offset-2 mt-1"
                            >
                                Configure in Scanning Interface
                            </button>
                        </div>
                    )}
                </div>

                {/* Daily Challenge */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                        <Trophy className="w-28 h-28" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-5">
                        Daily Challenge
                    </h3>
                    <div className="space-y-5 relative z-10">
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-yellow-500">Speed Demon</span>
                                <span className="text-xs bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded">500 XP</span>
                            </div>
                            <p className="text-xs text-slate-400 mb-3">
                                Reach {speedDemonTarget.toLocaleString()} pages.
                            </p>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-yellow-500 transition-all duration-500"
                                    style={{ width: `${speedDemonProgress}%` }}
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                {pagesScanned.toLocaleString()} / {speedDemonTarget.toLocaleString()}
                            </p>
                        </div>

                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-green-500">Perfectionist</span>
                                <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded">300 XP</span>
                            </div>
                            <p className="text-xs text-slate-400 mb-3">Achieve 100% quality score.</p>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-500 transition-all duration-500"
                                    style={{ width: `${perfectionistProgress}%` }}
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{qualityScore.toFixed(1)}% quality</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
