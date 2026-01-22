// (c) Copyright Datacraft, 2026
import { X, User, Mail, Shield, Calendar, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStore } from '@/hooks/useStore';
import { formatRelativeTime } from '@/lib/utils';

interface UserProfileModalProps {
    onClose: () => void;
}

export function UserProfileModal({ onClose }: UserProfileModalProps) {
    const { user } = useStore();

    if (!user) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card w-full max-w-md overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header/Cover */}
                <div className="h-24 bg-gradient-to-r from-brass-600/20 via-brass-500/10 to-brass-600/20 relative">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-slate-800/50 rounded-lg text-slate-400 hover:text-slate-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Profile Info */}
                <div className="px-6 pb-6 -mt-10 relative">
                    <div className="w-20 h-20 rounded-2xl bg-slate-900 border-4 border-slate-950 flex items-center justify-center text-brass-400 shadow-xl mb-4">
                        <User className="w-10 h-10" />
                    </div>

                    <div className="space-y-1">
                        <h2 className="text-xl font-display font-semibold text-slate-100">{user.username}</h2>
                        <p className="text-sm text-slate-500 flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5" />
                            {user.email}
                        </p>
                    </div>

                    <div className="mt-8 grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                Role
                            </p>
                            <p className="text-sm font-medium text-slate-200 capitalize">
                                {user.is_superuser ? 'Administrator' : 'User'}
                            </p>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Joined
                            </p>
                            <p className="text-sm font-medium text-slate-200">
                                {formatRelativeTime(user.date_joined)}
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 space-y-3">
                        <button className="w-full btn-ghost justify-start text-slate-300">
                            <User className="w-4 h-4" />
                            Account Settings
                        </button>
                        <button className="w-full btn-ghost justify-start text-slate-300">
                            <Shield className="w-4 h-4" />
                            Security & Privacy
                        </button>
                        <div className="pt-3 border-t border-slate-800/50">
                            <button className="w-full btn-ghost justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10">
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800/50 flex justify-center bg-slate-900/50">
                    <button onClick={onClose} className="btn-ghost text-sm">
                        Close
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
