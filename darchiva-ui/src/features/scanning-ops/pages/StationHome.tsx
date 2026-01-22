import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Scan, Package, User, Trophy } from 'lucide-react';
import { Scoreboard } from '../components/Scoreboard';

export function StationHome() {
    const navigate = useNavigate();

    return (
        <div className="h-full grid grid-cols-12 gap-8">
            {/* Left Column: Actions */}
            <div className="col-span-8 flex flex-col gap-8">
                <div className="bg-gradient-to-br from-brass-600 to-brass-800 rounded-3xl p-10 text-slate-900 relative overflow-hidden">
                    <div className="relative z-10">
                        <h1 className="text-5xl font-bold mb-4">Station 01 Ready</h1>
                        <p className="text-xl font-medium opacity-80 mb-8">
                            Welcome back, Sarah. Your shift target is 2,000 pages today.
                        </p>
                        <button
                            onClick={() => navigate('/scanning/operator')}
                            className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:scale-105 transition-transform flex items-center gap-3"
                        >
                            <Scan className="w-6 h-6" /> Start Scanning
                        </button>
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
                            <p className="text-sm text-slate-400 mb-3">Scan 500 pages in one hour.</p>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-500 w-[80%]" />
                            </div>
                        </div>

                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-green-500">Perfectionist</span>
                                <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded">300 XP</span>
                            </div>
                            <p className="text-sm text-slate-400 mb-3">Complete 5 batches with 100% quality.</p>
                            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 w-[40%]" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
