import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Box, User, LogOut } from 'lucide-react';
import { useStore } from '@/hooks/useStore';

export function ScanningLayout() {
    const { user, setUser } = useStore();

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-brass-500/30">
            {/* High-Contrast Header */}
            <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-brass-500 rounded-lg flex items-center justify-center">
                        <Box className="w-6 h-6 text-slate-900" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold tracking-wide text-slate-100">SCANNING OPS</h1>
                        <p className="text-xs text-slate-400 font-mono">STATION-01 • {user?.firstName} {user?.lastName}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                        <Shield className="w-4 h-4 text-green-400" />
                        <span className="text-xs font-bold text-green-400 uppercase">Safety Verified</span>
                    </div>

                    <button
                        onClick={() => setUser(null)}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                    >
                        <LogOut className="w-6 h-6" />
                    </button>
                </div>
            </header>

            {/* Main Content Area - Optimized for Touch */}
            <main className="p-6 h-[calc(100vh-4rem)] overflow-hidden">
                <Outlet />
            </main>
        </div>
    );
}
