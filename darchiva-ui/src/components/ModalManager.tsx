// (c) Copyright Datacraft, 2026
import { useStore } from '@/hooks/useStore';
import { AnimatePresence } from 'framer-motion';
import { UploadModal } from '@/features/documents/components/modals/UploadModal';
import { CreateFolderModal } from '@/features/documents/components/modals/CreateFolderModal';
import { CreateCaseModal } from '@/features/cases/components/CreateCaseModal';
import { NotificationsModal } from '@/features/notifications/components/NotificationsModal';
import { UserProfileModal } from '@/features/users/components/UserProfileModal';
import { FilterDocumentsModal } from '@/features/documents/components/modals/FilterDocumentsModal';
import { SortDocumentsModal } from '@/features/documents/components/modals/SortDocumentsModal';
import { CreateProjectModal } from '@/features/scanning-projects/components/modals/CreateProjectModal';

export function ModalManager() {
    const { activeModal, modalData, closeModal } = useStore();

    if (!activeModal) return null;

    // Check for real components
    if (activeModal === 'upload') {
        return <UploadModal onClose={closeModal} parentId={modalData as string} />;
    }
    if (activeModal === 'create-folder') {
        return <CreateFolderModal onClose={closeModal} parentId={modalData as string} />;
    }
    if (activeModal === 'create-case') {
        return <CreateCaseModal onClose={closeModal} />;
    }
    if (activeModal === 'notifications') {
        return <NotificationsModal onClose={closeModal} />;
    }
    if (activeModal === 'user-profile') {
        return <UserProfileModal onClose={closeModal} />;
    }
    if (activeModal === 'filter-documents') {
        return <FilterDocumentsModal onClose={closeModal} />;
    }
    if (activeModal === 'sort-documents') {
        return <SortDocumentsModal onClose={closeModal} />;
    }
    if (activeModal === 'create-project') {
        return <CreateProjectModal onClose={closeModal} />;
    }

    console.warn(`No modal component found for: ${activeModal}`);
    return null;
}
