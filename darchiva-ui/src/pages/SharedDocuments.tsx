// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { SharedNodesList } from '@/features/shared-nodes/components/SharedNodesList';
import { ShareDialog } from '@/features/shared-nodes/components/ShareDialog';
import type { SharedNode } from '@/features/shared-nodes/types';

export function SharedDocuments() {
    const [editingShare, setEditingShare] = useState<SharedNode | null>(null);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-display font-semibold text-slate-100">
                        Shared Documents
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Manage documents shared with you and by you
                    </p>
                </div>
            </div>

            <div className="glass-card p-6">
                <SharedNodesList onEditShare={setEditingShare} />
            </div>

            {editingShare && (
                <ShareDialog
                    nodeId={editingShare.node_id}
                    nodeTitle={editingShare.node_title}
                    nodeType={editingShare.node_type}
                    open={!!editingShare}
                    onOpenChange={(open) => !open && setEditingShare(null)}
                />
            )}
        </div>
    );
}

export default SharedDocuments;
