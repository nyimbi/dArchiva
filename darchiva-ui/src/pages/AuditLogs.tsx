// (c) Copyright Datacraft, 2026
import { Activity } from 'lucide-react';
import { AuditLog } from '@/features/audit/components/AuditLog';

export function AuditLogs() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-display font-semibold text-slate-100">
                        Audit Logs
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Track system activity and document changes
                    </p>
                </div>
            </div>

            <div className="glass-card p-6">
                <AuditLog />
            </div>
        </div>
    );
}

export default AuditLogs;
