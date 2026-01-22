// (c) Copyright Datacraft, 2026
import { GroupForm } from './GroupForm';

interface CreateGroupModalProps {
	onClose: () => void;
}

export function CreateGroupModal({ onClose }: CreateGroupModalProps) {
	return <GroupForm open={true} onOpenChange={(open) => !open && onClose()} />;
}
