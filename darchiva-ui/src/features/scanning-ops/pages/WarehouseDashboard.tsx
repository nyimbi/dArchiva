import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Package, ArrowRight, ArrowLeft, History } from 'lucide-react';
import { useWarehouseActivity, useWarehouseScan } from '../api/hooks';

export function WarehouseDashboard() {
    const [activeTab, setActiveTab] = useState<'check-out' | 'check-in'>('check-out');
    const [scanInput, setScanInput] = useState('');

    const { data: recentActivity = [], isLoading } = useWarehouseActivity(10);
    const warehouseScan = useWarehouseScan();

    const handleScan = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && scanInput.trim()) {
            warehouseScan.mutate({
                barcode: scanInput.trim().toUpperCase(),
                action: activeTab
            });
            setScanInput('');
        }
    };

    return (
        <div className="h-full flex flex-col gap-6">
            {/* Tabs */}
            <div className="flex gap-4">
                <button
                    onClick={() => setActiveTab('check-out')}
                    className={`px-6 py-3 rounded-xl font-bold text-lg transition-colors flex items-center gap-2
            ${activeTab === 'check-out' ? 'bg-brass-500 text-slate-900' : 'bg-slate-900 text-slate-500 hover:bg-slate-800'}
          `}
                >
                    <ArrowRight className="w-5 h-5" /> Check Out (To Operator)
                </button>
                <button
                    onClick={() => setActiveTab('check-in')}
                    className={`px-6 py-3 rounded-xl font-bold text-lg transition-colors flex items-center gap-2
            ${activeTab === 'check-in' ? 'bg-green-500 text-slate-900' : 'bg-slate-900 text-slate-500 hover:bg-slate-800'}
          `}
                >
                    <ArrowLeft className="w-5 h-5" /> Check In (Return)
                </button>
            </div>

            <div className="flex-1 grid grid-cols-12 gap-6">
                {/* Main Scanner Area */}
                <div className="col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                    <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mb-6 animate-pulse">
                        <Package className="w-10 h-10 text-slate-500" />
                    </div>
                    <h2 className="text-3xl font-bold mb-2">
                        {activeTab === 'check-out' ? 'Scan Box to Issue' : 'Scan Box to Return'}
                    </h2>
                    <p className="text-slate-400 mb-8">Waiting for barcode scan...</p>

                    <input
                        type="text"
                        value={scanInput}
                        onChange={(e) => setScanInput(e.target.value)}
                        onKeyDown={handleScan}
                        placeholder="Manual Entry..."
                        className="bg-slate-950 border-2 border-slate-700 rounded-xl px-6 py-4 w-96 text-center text-xl focus:border-brass-500 outline-none transition-colors"
                        autoFocus
                    />
                </div>

                {/* Recent Activity */}
                <div className="col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-hidden flex flex-col">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                        <History className="w-4 h-4" /> Recent Activity
                    </h3>

                    <div className="flex-1 overflow-y-auto space-y-4">
                        {isLoading ? (
                            <div className="text-center text-slate-500 py-4">Loading...</div>
                        ) : recentActivity.length === 0 ? (
                            <div className="text-center text-slate-500 py-4">No recent activity</div>
                        ) : (
                            recentActivity.map((log, i) => (
                                <div key={log.id} className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                                    <div>
                                        <div className="font-bold text-slate-200">{log.box_id}</div>
                                        <div className="text-xs text-slate-500">{log.action}</div>
                                    </div>
                                    <span className="text-xs font-mono text-slate-600">
                                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
