// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { X, FolderPlus, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCreateProject } from '../../api/hooks';
import { toast } from 'sonner';

interface CreateProjectModalProps {
    onClose: () => void;
}

export function CreateProjectModal({ onClose }: CreateProjectModalProps) {
    const [title, setTitle] = useState('');
    const [clientName, setClientName] = useState('');
    const createProjectMutation = useCreateProject();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !clientName.trim()) return;

        try {
            await createProjectMutation.mutateAsync({
                name: title.trim(),
                client_name: clientName.trim(),
                status: 'planning',
                start_date: new Date().toISOString(),
            });
            toast.success('Project created successfully');
            onClose();
        } catch (error) {
            toast.error('Failed to create project');
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
                            <FolderPlus className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-display font-semibold text-slate-100">New Project</h2>
                            <p className="text-sm text-slate-500 mt-0.5">Start a new scanning project</p>
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
                            <label htmlFor="project-name" className="text-sm font-medium text-slate-400">
                                Project Name
                            </label>
                            <input
                                id="project-name"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Q1 Archival"
                                className="input-field w-full"
                                autoFocus
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="client-name" className="text-sm font-medium text-slate-400">
                                Client Name
                            </label>
                            <input
                                id="client-name"
                                type="text"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                placeholder="e.g. Acme Corp"
                                className="input-field w-full"
                                required
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-slate-800/50 flex items-center justify-end gap-3 bg-slate-900/50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-ghost"
                            disabled={createProjectMutation.isPending}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary min-w-[120px]"
                            disabled={!title.trim() || !clientName.trim() || createProjectMutation.isPending}
                        >
                            {createProjectMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Project'
                            )}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
