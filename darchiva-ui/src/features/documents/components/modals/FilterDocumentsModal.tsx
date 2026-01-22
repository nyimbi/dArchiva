// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { X, Filter, Tag, Calendar, FileText, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/hooks/useStore';

interface FilterDocumentsModalProps {
    onClose: () => void;
}

export function FilterDocumentsModal({ onClose }: FilterDocumentsModalProps) {
    const { searchFilters, setSearchFilters, clearSearchFilters } = useStore();
    const [localFilters, setLocalFilters] = useState(searchFilters);

    const handleApply = () => {
        setSearchFilters(localFilters);
        onClose();
    };

    const handleClear = () => {
        clearSearchFilters();
        setLocalFilters({
            documentTypes: [],
            tags: [],
            dateRange: { start: null, end: null },
            owner: null,
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card w-full max-w-md overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-brass-500/10 flex items-center justify-center text-brass-400">
                            <Filter className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-display font-semibold text-slate-100">Filter Documents</h2>
                            <p className="text-sm text-slate-500 mt-0.5">Refine your document view</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                    {/* Date Range */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5" />
                            Date Range
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500">From</label>
                                <input
                                    type="date"
                                    value={localFilters.dateRange.start || ''}
                                    onChange={e => setLocalFilters(prev => ({
                                        ...prev,
                                        dateRange: { ...prev.dateRange, start: e.target.value || null }
                                    }))}
                                    className="input-field w-full text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-slate-500">To</label>
                                <input
                                    type="date"
                                    value={localFilters.dateRange.end || ''}
                                    onChange={e => setLocalFilters(prev => ({
                                        ...prev,
                                        dateRange: { ...prev.dateRange, end: e.target.value || null }
                                    }))}
                                    className="input-field w-full text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Document Type Placeholder */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5" />
                            Document Type
                        </h3>
                        <select className="input-field w-full text-sm">
                            <option value="">All Types</option>
                            <option value="invoice">Invoice</option>
                            <option value="contract">Contract</option>
                            <option value="report">Report</option>
                        </select>
                    </div>

                    {/* Tags Placeholder */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5" />
                            Tags
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {['Urgent', 'Review', 'Draft', 'Final'].map(tag => (
                                <button
                                    key={tag}
                                    className="px-3 py-1 rounded-full border border-slate-700 text-xs text-slate-400 hover:border-brass-500/50 hover:text-brass-400 transition-colors"
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800/50 flex items-center justify-between bg-slate-900/50">
                    <button
                        onClick={handleClear}
                        className="text-sm text-slate-500 hover:text-slate-300 underline"
                    >
                        Clear all
                    </button>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="btn-ghost"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleApply}
                            className="btn-primary min-w-[100px]"
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
