import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { useLeaderboard } from '../api/hooks';

export function Scoreboard() {
    const { data: scores = [], isLoading } = useLeaderboard();

    if (isLoading) {
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-full flex items-center justify-center">
                <div className="animate-pulse text-slate-500">Loading leaderboard...</div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" /> Leaderboard
                </h3>
                <span className="text-xs font-mono text-slate-500">LIVE UPDATES</span>
            </div>

            <div className="space-y-4">
                {scores.map((operator, index) => {
                    const rank = index + 1;
                    return (
                        <motion.div
                            key={operator.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: rank * 0.1 }}
                            className={`
              flex items-center justify-between p-3 rounded-xl border transition-colors
              ${rank === 1 ? 'bg-yellow-500/10 border-yellow-500/50' :
                                    rank === 2 ? 'bg-slate-800/50 border-slate-700' :
                                        rank === 3 ? 'bg-amber-700/10 border-amber-700/30' :
                                            'bg-slate-950 border-slate-800'}
            `}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`
                w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm
                ${rank === 1 ? 'bg-yellow-500 text-slate-900' :
                                        rank === 2 ? 'bg-slate-400 text-slate-900' :
                                            rank === 3 ? 'bg-amber-700 text-slate-200' :
                                                'bg-slate-800 text-slate-500'}
              `}>
                                    {rank}
                                </div>
                                <div className="flex flex-col">
                                    <span className={`font-bold ${rank === 1 ? 'text-yellow-500' : 'text-slate-300'}`}>
                                        {operator.operator_name || 'Unknown Operator'}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        Quality: {operator.quality_score ? `${operator.quality_score}%` : 'N/A'}
                                    </span>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="font-mono font-bold text-lg text-slate-200">{operator.pages_scanned}</div>
                                <div className="text-xs text-slate-500">pages</div>
                            </div>
                        </motion.div>
                    );
                })}

                {scores.length === 0 && (
                    <div className="text-center text-slate-500 py-4">
                        No active operators today.
                    </div>
                )}
            </div>
        </div>
    );
}
