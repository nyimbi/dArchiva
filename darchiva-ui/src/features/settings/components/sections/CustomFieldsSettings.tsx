// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { Plus, List as ListIcon } from 'lucide-react';
import { CustomFieldList } from '@/features/custom-fields/components/CustomFieldList';
import { CustomFieldForm } from '@/features/custom-fields/components/CustomFieldForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CustomField } from '@/features/custom-fields/types';

export function CustomFieldsSettings() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingField, setEditingField] = useState<CustomField | undefined>();

    const handleCreate = () => {
        setEditingField(undefined);
        setIsFormOpen(true);
    };

    const handleEdit = (field: CustomField) => {
        setEditingField(field);
        setIsFormOpen(true);
    };

    const handleSuccess = () => {
        setIsFormOpen(false);
        setEditingField(undefined);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-display font-semibold text-slate-100">
                        Custom Fields
                    </h3>
                    <p className="text-sm text-slate-500">
                        Define additional metadata fields for your documents
                    </p>
                </div>
                <button onClick={handleCreate} className="btn-primary">
                    <Plus className="w-4 h-4" />
                    Add Field
                </button>
            </div>

            <div className="glass-card overflow-hidden">
                <CustomFieldList onEdit={handleEdit} hideHeader />
            </div>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingField ? 'Edit Custom Field' : 'Create Custom Field'}
                        </DialogTitle>
                    </DialogHeader>
                    <CustomFieldForm
                        field={editingField}
                        onSuccess={handleSuccess}
                        onCancel={() => setIsFormOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
