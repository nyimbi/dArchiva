// (c) Copyright Datacraft, 2026
import { Dialog,DialogContent,DialogHeader,DialogTitle } from '@/components/ui/dialog';
import { TagForm } from '@/features/tags/components/TagForm';
import { TagList } from '@/features/tags/components/TagList';
import type { Tag } from '@/features/tags/types';
import { Plus } from 'lucide-react';
import { useState } from 'react';

export function TagsSettings() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingTag, setEditingTag] = useState<Tag | undefined>();

    const handleCreate = () => {
        setEditingTag(undefined);
        setIsFormOpen(true);
    };

    const handleEdit = (tag: Tag) => {
        setEditingTag(tag);
        setIsFormOpen(true);
    };

    const handleSuccess = () => {
        setIsFormOpen(false);
        setEditingTag(undefined);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-display font-semibold text-slate-100">
                        Tags Management
                    </h3>
                    <p className="text-sm text-slate-500">
                        Create and organize tags to categorize your documents
                    </p>
                </div>
                <button onClick={handleCreate} className="btn-primary">
                    <Plus className="w-4 h-4" />
                    Create Tag
                </button>
            </div>

            <div className="glass-card overflow-hidden">
                <TagList onEdit={handleEdit} />
            </div>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingTag ? 'Edit Tag' : 'Create New Tag'}
                        </DialogTitle>
                    </DialogHeader>
                    <TagForm
                        tag={editingTag}
                        onSuccess={handleSuccess}
                        onCancel={() => setIsFormOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
