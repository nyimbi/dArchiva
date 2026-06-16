// (c) Copyright Datacraft, 2026
import { AddDocumentsToCaseModal } from '@/features/cases/components/modals/AddDocumentsToCaseModal';
import { CaseFiltersModal } from '@/features/cases/components/modals/CaseFiltersModal';
import { CaseOptionsModal } from '@/features/cases/components/modals/CaseOptionsModal';
import { CreateBundleModal } from '@/features/cases/components/modals/CreateBundleModal';
import { EditCaseTagsModal } from '@/features/cases/components/modals/EditCaseTagsModal';
import { ManageCaseAccessModal } from '@/features/cases/components/modals/ManageCaseAccessModal';
import { ViewCaseModal } from '@/features/cases/components/modals/ViewCaseModal';
import { CreateCaseModal } from '@/features/cases/components/CreateCaseModal';
import type { Case } from '@/features/cases/api';
import { ViewEncryptedDocumentModal } from '@/features/documents/components/modals/ViewEncryptedDocumentModal';
import { CreateFolderModal } from '@/features/documents/components/modals/CreateFolderModal';
import { FilterDocumentsModal } from '@/features/documents/components/modals/FilterDocumentsModal';
import { SortDocumentsModal } from '@/features/documents/components/modals/SortDocumentsModal';
import { UploadModal } from '@/features/documents/components/modals/UploadModal';
import type { EncryptedDocument } from '@/features/encryption/api';
import { GroupForm } from '@/features/groups/components/GroupForm';
import { GroupMembers } from '@/features/groups/components/GroupMembers';
import type { Group } from '@/features/groups/types';
import { ActivityHistoryModal } from '@/features/users/components/ActivityHistoryModal';
import { ManageFavoritesModal } from '@/features/users/components/ManageFavoritesModal';
import { AddIngestionSourceModal } from '@/features/ingestion/components/AddIngestionSourceModal';
import { IngestionSourceOptionsModal } from '@/features/ingestion/components/IngestionSourceOptionsModal';
import { IngestionSourceSettingsModal } from '@/features/ingestion/components/IngestionSourceSettingsModal';
import type { IngestionSource } from '@/features/ingestion/api';
import { NotificationsModal } from '@/features/notifications/components/NotificationsModal';
import { CreatePortfolioModal } from '@/features/portfolios/components/CreatePortfolioModal';
import { PortfolioOptionsModal } from '@/features/portfolios/components/PortfolioOptionsModal';
import { ViewPortfolioModal } from '@/features/portfolios/components/ViewPortfolioModal';
import type { Portfolio } from '@/features/portfolios/api';
import { RoleForm } from '@/features/roles/components/RoleForm';
import type { Role } from '@/features/roles/types';
import { CreateRoutingRuleModal } from '@/features/routing/components/CreateRoutingRuleModal';
import { DeleteRoutingRuleModal } from '@/features/routing/components/DeleteRoutingRuleModal';
import { EditRoutingRuleModal } from '@/features/routing/components/EditRoutingRuleModal';
import { RoutingRuleOptionsModal } from '@/features/routing/components/RoutingRuleOptionsModal';
import { TestRoutingRuleModal } from '@/features/routing/components/TestRoutingRuleModal';
import { CreateProjectModal } from '@/features/scanning-projects/components/modals/CreateProjectModal';
import { CreateGroupModal } from '@/features/groups/components/CreateGroupModal';
import { CreateRoleModal } from '@/features/roles/components/CreateRoleModal';
import { CreateUserModal } from '@/features/users/components/CreateUserModal';
import { UserForm } from '@/features/users/components/UserForm';
import { UserProfileModal } from '@/features/users/components/UserProfileModal';
import type { User } from '@/features/users/types';
import type { RoutingRule } from '@/types';
import { useStore } from '@/hooks/useStore';

export function ModalManager() {
    const { activeModal, modalData, closeModal } = useStore();

    if (!activeModal) return null;

    // ── Documents ──────────────────────────────────────────────────
    if (activeModal === 'upload')
        return <UploadModal onClose={closeModal} parentId={modalData as string} />;
    if (activeModal === 'create-folder')
        return <CreateFolderModal onClose={closeModal} parentId={modalData as string} />;
    if (activeModal === 'filter-documents')
        return <FilterDocumentsModal onClose={closeModal} />;
    if (activeModal === 'sort-documents')
        return <SortDocumentsModal onClose={closeModal} />;
    if (activeModal === 'view-encrypted-document')
        return <ViewEncryptedDocumentModal onClose={closeModal} doc={modalData as EncryptedDocument} />;

    // ── Cases ──────────────────────────────────────────────────────
    if (activeModal === 'create-case')
        return <CreateCaseModal onClose={closeModal} />;
    if (activeModal === 'view-case')
        return <ViewCaseModal onClose={closeModal} case_={modalData as Case} />;
    if (activeModal === 'create-bundle')
        return <CreateBundleModal onClose={closeModal} case_={modalData as Case} />;
    if (activeModal === 'add-documents-to-case')
        return <AddDocumentsToCaseModal onClose={closeModal} case_={modalData as Case} />;
    if (activeModal === 'manage-case-access')
        return <ManageCaseAccessModal onClose={closeModal} case_={modalData as Case} />;
    if (activeModal === 'edit-case-tags')
        return <EditCaseTagsModal onClose={closeModal} case_={modalData as Case} />;
    if (activeModal === 'case-filters')
        return <CaseFiltersModal onClose={closeModal} />;
    if (activeModal === 'case-options')
        return <CaseOptionsModal onClose={closeModal} case_={modalData as Case} />;

    // ── Portfolios ─────────────────────────────────────────────────
    if (activeModal === 'create-portfolio')
        return <CreatePortfolioModal onClose={closeModal} />;
    if (activeModal === 'view-portfolio')
        return <ViewPortfolioModal onClose={closeModal} portfolio={modalData as Portfolio} />;
    if (activeModal === 'portfolio-options')
        return <PortfolioOptionsModal onClose={closeModal} portfolio={modalData as Portfolio} />;

    // ── Routing ────────────────────────────────────────────────────
    if (activeModal === 'add-routing-rule')
        return <CreateRoutingRuleModal onClose={closeModal} />;
    if (activeModal === 'edit-routing-rule')
        return <EditRoutingRuleModal onClose={closeModal} rule={modalData as RoutingRule} />;
    if (activeModal === 'delete-routing-rule')
        return <DeleteRoutingRuleModal onClose={closeModal} rule={modalData as RoutingRule} />;
    if (activeModal === 'test-routing-rule')
        return <TestRoutingRuleModal onClose={closeModal} rule={modalData as RoutingRule} />;
    if (activeModal === 'routing-rule-options')
        return <RoutingRuleOptionsModal onClose={closeModal} rule={modalData as RoutingRule} />;

    // ── Ingestion ──────────────────────────────────────────────────
    if (activeModal === 'add-ingestion-source')
        return <AddIngestionSourceModal onClose={closeModal} />;
    if (activeModal === 'ingestion-source-settings')
        return <IngestionSourceSettingsModal onClose={closeModal} source={modalData as IngestionSource} />;
    if (activeModal === 'ingestion-source-options')
        return <IngestionSourceOptionsModal onClose={closeModal} source={modalData as IngestionSource} />;

    // ── Scanning ───────────────────────────────────────────────────
    if (activeModal === 'create-project')
        return <CreateProjectModal onClose={closeModal} />;

    // ── Users / IAM ────────────────────────────────────────────────
    if (activeModal === 'create-user')
        return <CreateUserModal onClose={closeModal} />;
    if (activeModal === 'edit-user')
        return <UserForm open={true} onOpenChange={(open) => { if (!open) closeModal(); }} user={modalData as User} />;
    if (activeModal === 'create-group')
        return <CreateGroupModal onClose={closeModal} />;
    if (activeModal === 'edit-group')
        return <GroupForm open={true} onOpenChange={(open) => { if (!open) closeModal(); }} group={modalData as Group} />;
    if (activeModal === 'view-group-members')
        return <GroupMembers open={true} onOpenChange={(open) => { if (!open) closeModal(); }} group={modalData as Group} />;
    if (activeModal === 'create-role')
        return <CreateRoleModal onClose={closeModal} />;
    if (activeModal === 'edit-role')
        return <RoleForm open={true} onOpenChange={(open) => { if (!open) closeModal(); }} role={modalData as Role} />;

    // ── Notifications / Activity / Favorites ───────────────────────
    if (activeModal === 'notifications')
        return <NotificationsModal onClose={closeModal} />;
    if (activeModal === 'user-profile')
        return <UserProfileModal onClose={closeModal} />;
    if (activeModal === 'activity-history')
        return <ActivityHistoryModal onClose={closeModal} />;
    if (activeModal === 'manage-favorites')
        return <ManageFavoritesModal onClose={closeModal} />;

    return null;
}
