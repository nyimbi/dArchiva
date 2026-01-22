// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { X, Briefcase, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCreateCase } from '../api';
import { toast } from 'sonner';

interface CreateCaseModalProps {
    onClose: () => void;
}

export function CreateCaseModal({ onClose }: CreateCaseModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const createCaseMutation = useCreateCase();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        try {
            await createCaseMutation.mutateAsync({
                caseNumber: `CASE-${Date.now()}`,
                title: title.trim(),
                description: description.trim() || undefined
            });
            toast.success('Case created successfully');
            onClose();
        } catch (error) {
            toast.error('Failed to create case');
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card w-full max-w-md overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-brass-500/10 flex items-center justify-center text-brass-400">
                            <Briefcase className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-display font-semibold text-slate-100">New Case</h2>
                            <p className="text-sm text-slate-500 mt-0.5">Create a container for related documents</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="case-title" className="text-sm font-medium text-slate-400">
                                Case Title
                            </label>
                            <input
                                id="case-title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Legal Review - Project X"
                                className="input-field w-full"
                                autoFocus
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="case-description" className="text-sm font-medium text-slate-400">
                                Description (Optional)
                            </label>
                            <textarea
                                id="case-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Briefly describe the purpose of this case..."
                                className="input-field w-full h-24 resize-none"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-slate-800/50 flex items-center justify-end gap-3 bg-slate-900/50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-ghost"
                            disabled={createCaseMutation.isPending}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary min-w-[120px]"
                            disabled={!title.trim() || createCaseMutation.isPending}
                        >
                            {createCaseMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Case'
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
