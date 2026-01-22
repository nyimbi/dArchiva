import { useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, Box, Play, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Scoreboard } from '../components/Scoreboard';
import { PerformanceChart } from '../components/PerformanceChart';
import { useAssignedBatches, useShiftStats } from '../api/hooks';

export function OperatorDashboard() {
    const navigate = useNavigate();
    const [shiftStarted, setShiftStarted] = useState(false);

    const { data: batches = [], isLoading: batchesLoading } = useAssignedBatches();
    const { data: stats, isLoading: statsLoading } = useShiftStats();

    if (!shiftStarted) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="max-w-6xl w-full grid grid-cols-12 gap-8">
                    {/* Left: Start Shift */}
                    <div className="col-span-7">
                        <h2 className="text-4xl font-bold mb-8 text-slate-100">Start Your Shift</h2>

                        <div className="grid grid-cols-2 gap-6 mb-8">
                            <button className="p-8 bg-slate-900 border-2 border-slate-700 rounded-2xl hover:border-brass-500 hover:bg-slate-800 transition-all group text-left h-64 flex flex-col justify-between">
                                <div className="w-14 h-14 bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-brass-500/20 group-hover:text-brass-400">
                                    <ClipboardCheck className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold mb-2">Safety Check</h3>
                                    <p className="text-slate-400">Verify PPE and equipment status before starting.</p>
                                </div>
                            </button>

                            <button
                                onClick={() => setShiftStarted(true)}
                                className="p-8 bg-brass-600 border-2 border-brass-500 rounded-2xl hover:bg-brass-500 transition-all text-slate-900 text-left h-64 flex flex-col justify-between"
                            >
                                <div className="w-14 h-14 bg-slate-900/20 rounded-xl flex items-center justify-center">
                                    <Play className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold mb-2">Start Scanning</h3>
                                    <p className="text-slate-900/70">I am wearing my PPE and ready to work.</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Right: Leaderboard Preview */}
                    <div className="col-span-5">
                        <Scoreboard />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full grid grid-cols-12 gap-6">
            {/* Left Column: Batches & Charts */}
            <div className="col-span-8 flex flex-col gap-6">
                {/* Performance Chart */}
                <div className="h-64">
                    <PerformanceChart />
                </div>

                {/* Assigned Batches */}
                <div className="flex-1">
                    <h2 className="text-xl font-bold text-slate-400 uppercase tracking-wider mb-4">Assigned Batches</h2>
                    <div className="grid grid-cols-2 gap-4">
                        {batchesLoading ? (
                            <div className="col-span-2 text-center text-slate-500 py-8">Loading batches...</div>
                        ) : batches.length === 0 ? (
                            <div className="col-span-2 text-center text-slate-500 py-8">No batches assigned</div>
                        ) : (
                            batches.slice(0, 3).map((batch) => (
                                <motion.div
                                    key={batch.id}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => navigate('/scanning/interface')}
                                    className="bg-slate-900 border border-slate-800 p-6 rounded-xl cursor-pointer hover:border-brass-500/50 transition-colors"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-bold uppercase">
                                            {batch.batch_number}
                                        </div>
                                        <span className="text-slate-500 text-sm">{batch.status}</span>
                                    </div>
                                    <h3 className="text-2xl font-bold mb-2">{batch.type}</h3>
                                    <div className="flex items-center gap-4 text-slate-400 text-sm">
                                        <span className="flex items-center gap-1"><Box className="w-4 h-4" /> {batch.estimated_pages} Pages</span>
                                        <span className="text-xs">{batch.physical_location}</span>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column: Scoreboard & Stats */}
            <div className="col-span-4 flex flex-col gap-6">
                <Scoreboard />

                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex-1">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">Shift Performance</h3>
                    <div className="space-y-6">
                        {statsLoading ? (
                            <div className="text-center text-slate-500 py-4">Loading stats...</div>
                        ) : stats ? (
                            <>
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-slate-400">Pages Scanned</span>
                                        <span className="font-bold text-brass-400 text-lg">{stats.pages_scanned}</span>
                                    </div>
                                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-brass-500" style={{ width: `${(stats.pages_scanned / stats.target_pages) * 100}%` }} />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Target: {stats.target_pages}</p>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-slate-400">Quality Score</span>
                                        <span className="font-bold text-green-400 text-lg">{stats.quality_score.toFixed(1)}%</span>
                                    </div>
                                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500" style={{ width: `${stats.quality_score}%` }} />
                                    </div>
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>

                <button className="w-full p-4 bg-slate-800 border border-slate-700 rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 font-bold text-slate-300">
                    <AlertTriangle className="w-5 h-5" />
                    Report Issue
                </button>
            </div>
        </div>
    );
}
