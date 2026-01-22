// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { Plus, FileType } from 'lucide-react';
import { DocumentTypeList } from '@/features/document-types/components/DocumentTypeList';
import { DocumentTypeForm } from '@/features/document-types/components/DocumentTypeForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { DocumentType } from '@/features/document-types/types';

export function DocumentTypesSettings() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingType, setEditingType] = useState<DocumentType | undefined>();

    const handleCreate = () => {
        setEditingType(undefined);
        setIsFormOpen(true);
    };

    const handleEdit = (type: DocumentType) => {
        setEditingType(type);
        setIsFormOpen(true);
    };

    const handleSuccess = () => {
        setIsFormOpen(false);
        setEditingType(undefined);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-display font-semibold text-slate-100">
                        Document Types
                    </h3>
                    <p className="text-sm text-slate-500">
                        Define document categories and their associated metadata and workflows
                    </p>
                </div>
                <button onClick={handleCreate} className="btn-primary">
                    <Plus className="w-4 h-4" />
                    Add Type
                </button>
            </div>

            <div className="glass-card overflow-hidden">
                <DocumentTypeList onEdit={handleEdit} hideHeader />
            </div>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingType ? 'Edit Document Type' : 'Create Document Type'}
                        </DialogTitle>
                    </DialogHeader>
                    <DocumentTypeForm
                        documentType={editingType}
                        onSuccess={handleSuccess}
                        onCancel={() => setIsFormOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
