import { Clock,LogIn,LogOut,Package,Scan,Trophy,User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Scoreboard } from '../components/Scoreboard';
import { useClockIn,useClockOut,useMyActiveSession,useShiftStats } from '../api/hooks';

function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
}

export function StationHome() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: shiftStats } = useShiftStats();
    const { data: activeSession, isLoading: sessionLoading } = useMyActiveSession();
    const clockIn = useClockIn();
    const clockOut = useClockOut();

    const displayName = user?.username ?? 'Operator';
    const targetPages = shiftStats?.target_pages ?? 0;
    const pagesScanned = shiftStats?.pages_scanned ?? 0;
    const qualityScore = shiftStats?.quality_score ?? 0;

    // Derive challenge progress from real shift stats
    const speedDemonProgress = targetPages > 0
        ? Math.min(Math.round((pagesScanned / Math.max(targetPages, 500)) * 100), 100)
        : 0;
    // Quality challenge: progress toward 100% quality score
    const perfectionistProgress = Math.min(Math.round(qualityScore), 100);

    const handleClockIn = () => {
        // Use first available project from shift stats, or a sensible fallback.
        // The operator must have at least one active project; pick from URL or
        // prompt — for now we derive project_id from the active session check
        // or let the user navigate to a project first.
        // We surface an alert if no project context is available.
        const projectId = new URLSearchParams(window.location.search).get('projectId') ?? '';
        if (!projectId) {
            alert('No project selected. Navigate to a project and clock in from there, or ask your supervisor.');
            return;
        }
        clockIn.mutate({ project_id: projectId });
    };

    const handleClockOut = () => {
        if (activeSession) {
            clockOut.mutate(activeSession.session_id);
        }
    };

    return (
        <div className="h-full grid grid-cols-12 gap-8">
            {/* Left Column: Actions */}
            <div className="col-span-8 flex flex-col gap-8">
                <div className="bg-gradient-to-br from-brass-600 to-brass-800 rounded-3xl p-10 text-slate-900 relative overflow-hidden">
                    <div className="relative z-10">
                        <h1 className="text-5xl font-bold mb-4">Station 01 Ready</h1>
                        <p className="text-xl font-medium opacity-80 mb-8">
                            Welcome back, {displayName}.
                            {targetPages > 0
                                ? ` Your shift target is ${targetPages.toLocaleString()} pages today.`
                                : ' No shift assigned yet.'}
                        </p>
                        <div className="flex items-center gap-4 flex-wrap">
                            <button
                                onClick={() => navigate('/scanning/operator')}
                                className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:scale-105 transition-transform flex items-center gap-3"
                            >
                                <Scan className="w-6 h-6" /> Start Scanning
                            </button>

                            {/* Clock-in / clock-out */}
                            {!sessionLoading && (
                                activeSession ? (
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 px-4 py-3 bg-green-900/60 text-green-200 rounded-xl text-sm font-bold">
                                            <Clock className="w-4 h-4 animate-pulse" />
                                            <span>Clocked in — {activeSession.project_name}</span>
                                            <span className="opacity-70">({formatDuration(activeSession.duration_minutes)})</span>
                                        </div>
                                        <button
                                            onClick={handleClockOut}
                                            disabled={clockOut.isPending}
                                            className="px-5 py-3 bg-red-700 hover:bg-red-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            {clockOut.isPending ? 'Clocking out...' : 'Clock Out'}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleClockIn}
                                        disabled={clockIn.isPending}
                                        className="px-5 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        <LogIn className="w-4 h-4" />
                                        {clockIn.isPending ? 'Clocking in...' : 'Clock In'}
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                    <Scan className="absolute -right-10 -bottom-10 w-96 h-96 opacity-10" />
                </div>

                <div className="grid grid-cols-2 gap-6 flex-1">
                    <button
                        onClick={() => navigate('/scanning/warehouse')}
                        className="bg-slate-900 border border-slate-800 rounded-3xl p-8 hover:border-brass-500/50 transition-all group text-left"
                    >
                        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                            <Package className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-200 mb-2">Warehouse Ops</h2>
                        <p className="text-slate-500">Check boxes in/out and manage inventory.</p>
                    </button>

                    <button
                        onClick={() => navigate('/scanning/operator')}
                        className="bg-slate-900 border border-slate-800 rounded-3xl p-8 hover:border-brass-500/50 transition-all group text-left"
                    >
                        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-500/20 group-hover:text-purple-400 transition-colors">
                            <User className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-200 mb-2">My Stats</h2>
                        <p className="text-slate-500">View your performance history and certifications.</p>
                    </button>
                </div>
            </div>

            {/* Right Column: Gamification */}
            <div className="col-span-4 flex flex-col gap-6">
                <Scoreboard />

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Trophy className="w-32 h-32" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-200 uppercase tracking-wider mb-4">
                        Daily Challenge
                    </h3>
                    <div className="space-y-6 relative z-10">
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-yellow-500">Speed Demon</span>
                                <span className="text-xs bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded">500 XP</span>
                            </div>
                            <p className="text-sm text-slate-400 mb-3">
                                Reach your shift target of {Math.max(targetPages, 500).toLocaleString()} pages.
                            </p>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-yellow-500 transition-all duration-500"
                                    style={{ width: `${speedDemonProgress}%` }}
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{pagesScanned.toLocaleString()} / {Math.max(targetPages, 500).toLocaleString()} pages</p>
                        </div>

                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-green-500">Perfectionist</span>
                                <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded">300 XP</span>
                            </div>
                            <p className="text-sm text-slate-400 mb-3">Achieve 100% quality score.</p>
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
