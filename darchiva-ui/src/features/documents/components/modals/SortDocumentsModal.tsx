// (c) Copyright Datacraft, 2026
import { X, SortAsc, Clock, FileText, HardDrive } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/hooks/useStore';
import { cn } from '@/lib/utils';

interface SortDocumentsModalProps {
    onClose: () => void;
}

export function SortDocumentsModal({ onClose }: SortDocumentsModalProps) {
    const { sortBy, sortOrder, setSorting } = useStore();

    const sortOptions = [
        { id: 'title', label: 'Name', icon: FileText },
        { id: 'updated_at', label: 'Last Modified', icon: Clock },
        { id: 'created_at', label: 'Date Created', icon: Clock },
        { id: 'size', label: 'File Size', icon: HardDrive },
    ];

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card w-full max-w-sm overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-brass-500/10 flex items-center justify-center text-brass-400">
                            <SortAsc className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-display font-semibold text-slate-100">Sort By</h2>
                            <p className="text-sm text-slate-500 mt-0.5">Change document order</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-1">
                    {sortOptions.map(option => {
                        const Icon = option.icon;
                        const isActive = sortBy === option.id;

                        return (
                            <button
                                key={option.id}
                                onClick={() => {
                                    const newOrder = isActive ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'desc';
                                    setSorting(option.id as any, newOrder);
                                }}
                                className={cn(
                                    "w-full flex items-center justify-between p-4 rounded-xl transition-all",
                                    isActive ? "bg-brass-500/10 border border-brass-500/20 text-brass-400" : "hover:bg-slate-800/50 text-slate-400"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon className="w-4 h-4" />
                                    <span className="text-sm font-medium">{option.label}</span>
                                </div>
                                {isActive && (
                                    <span className="text-[10px] font-bold uppercase tracking-widest">
                                        {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800/50 flex justify-center bg-slate-900/50">
                    <button onClick={onClose} className="btn-primary w-full">
                        Done
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
