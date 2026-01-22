// (c) Copyright Datacraft, 2026
import { RoleForm } from './RoleForm';

interface CreateRoleModalProps {
	onClose: () => void;
}

export function CreateRoleModal({ onClose }: CreateRoleModalProps) {
	return <RoleForm open={true} onOpenChange={(open) => !open && onClose()} />;
}
