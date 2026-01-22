// (c) Copyright Datacraft, 2026
import { UserForm } from './UserForm';

interface CreateUserModalProps {
	onClose: () => void;
}

export function CreateUserModal({ onClose }: CreateUserModalProps) {
	return <UserForm open={true} onOpenChange={(open) => !open && onClose()} />;
}
