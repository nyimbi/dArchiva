// (c) Copyright Datacraft, 2026
import { AuditLog } from '@/features/audit/components/AuditLog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

/**
 * AuditLogs page.
 *
 * The page header has a quick "Export CSV" button that downloads all logs
 * (no filters applied). Filtered exports are available inside the AuditLog
 * component's filter bar.
 */
export function AuditLogs() {
    function handleQuickExport() {
        const token = localStorage.getItem('darchiva_token');
        const url = '/api/v1/audit-logs/export?format=csv';
        // Fetch with auth header so the bearer token is included
        fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
            .then((res) => {
                if (!res.ok) throw new Error(`Export failed: ${res.status}`);
                return res.blob();
            })
            .then((blob) => {
                const date = new Date().toISOString().slice(0, 10);
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `audit-${date}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            })
            .catch(console.error);
    }

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

                <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleQuickExport}
                >
                    <Download className="h-4 w-4" />
                    Export CSV
                </Button>
            </div>

            <div className="glass-card p-6">
                <AuditLog />
            </div>
        </div>
    );
}

export default AuditLogs;
