// (c) Copyright Datacraft, 2026
/**
 * Email account list component.
 */
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
	Server,
	Mail,
	RefreshCw,
	Settings,
	Trash2,
	CheckCircle,
	XCircle,
	Clock,
	Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { EmailAccountForm } from './EmailAccountForm';
import {
	useEmailAccounts,
	useUpdateEmailAccount,
	useDeleteEmailAccount,
	useSyncEmailAccount,
} from '../api';
import type { EmailAccount, ConnectionStatus } from '../types';

const statusConfig: Record<ConnectionStatus, { icon: typeof CheckCircle; color: string; label: string }> = {
	connected: { icon: CheckCircle, color: 'text-green-500', label: 'Connected' },
	error: { icon: XCircle, color: 'text-red-500', label: 'Error' },
	unknown: { icon: Clock, color: 'text-yellow-500', label: 'Unknown' },
};

const accountTypeLabels: Record<string, string> = {
	imap: 'IMAP',
	graph_api: 'Microsoft 365',
	gmail_api: 'Gmail',
};

export function EmailAccountList() {
	const { data, isLoading } = useEmailAccounts();
	const [editingAccount, setEditingAccount] = useState<EmailAccount | null>(null);

	if (isLoading) {
		return (
			<div className="space-y-4">
				{Array.from({ length: 3 }).map((_, i) => (
					<Card key={i}>
						<CardHeader>
							<Skeleton className="h-5 w-1/3" />
							<Skeleton className="h-4 w-1/2" />
						</CardHeader>
					</Card>
				))}
			</div>
		);
	}

	const accounts = data?.items ?? [];

	if (accounts.length === 0) {
		return (
			<Card>
				<CardContent className="flex flex-col items-center justify-center py-12">
					<Server className="h-12 w-12 text-muted-foreground/50 mb-4" />
					<h3 className="text-lg font-medium">No email accounts configured</h3>
					<p className="text-sm text-muted-foreground">
						Add an email account to start importing emails automatically
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<>
			<div className="space-y-4">
				{accounts.map((account) => (
					<AccountCard
						key={account.id}
						account={account}
						onEdit={() => setEditingAccount(account)}
					/>
				))}
			</div>

			<Dialog open={!!editingAccount} onOpenChange={() => setEditingAccount(null)}>
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Edit Email Account</DialogTitle>
					</DialogHeader>
					{editingAccount && (
						<EmailAccountForm
							account={editingAccount}
							onSuccess={() => setEditingAccount(null)}
							onCancel={() => setEditingAccount(null)}
						/>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}

interface AccountCardProps {
	account: EmailAccount;
	onEdit: () => void;
}

function AccountCard({ account, onEdit }: AccountCardProps) {
	const { toast } = useToast();
	const [syncing, setSyncing] = useState(false);

	const updateMutation = useUpdateEmailAccount();
	const deleteMutation = useDeleteEmailAccount();
	const syncMutation = useSyncEmailAccount();

	const status = statusConfig[account.connection_status];
	const StatusIcon = status.icon;

	const handleToggleActive = async () => {
		try {
			await updateMutation.mutateAsync({
				accountId: account.id,
				data: { is_active: !account.is_active },
			});
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to update account',
				variant: 'destructive',
			});
		}
	};

	const handleSync = async () => {
		setSyncing(true);
		try {
			await syncMutation.mutateAsync(account.id);
			toast({ title: 'Sync started' });
		} catch (error) {
			toast({
				title: 'Sync failed',
				description: 'Could not start sync',
				variant: 'destructive',
			});
		} finally {
			setSyncing(false);
		}
	};

	const handleDelete = async () => {
		try {
			await deleteMutation.mutateAsync(account.id);
			toast({ title: 'Account deleted' });
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to delete account',
				variant: 'destructive',
			});
		}
	};

	return (
		<Card className={cn(!account.is_active && 'opacity-60')}>
			<CardHeader>
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
							<Mail className="h-5 w-5 text-primary" />
						</div>
						<div>
							<CardTitle className="text-base">{account.name}</CardTitle>
							<CardDescription>{account.email_address}</CardDescription>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<Switch checked={account.is_active} onCheckedChange={handleToggleActive} />
					</div>
				</div>
			</CardHeader>

			<CardContent>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<Badge variant="secondary">{accountTypeLabels[account.account_type]}</Badge>

						<div className={cn('flex items-center gap-1.5 text-sm', status.color)}>
							<StatusIcon className="h-4 w-4" />
							<span>{status.label}</span>
						</div>

						{account.sync_enabled && account.last_sync_at && (
							<span className="text-sm text-muted-foreground">
								Last sync: {formatDistanceToNow(new Date(account.last_sync_at), { addSuffix: true })}
							</span>
						)}
					</div>

					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={handleSync}
							disabled={!account.is_active || syncing}
						>
							{syncing ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<RefreshCw className="h-4 w-4" />
							)}
						</Button>

						<Button variant="outline" size="sm" onClick={onEdit}>
							<Settings className="h-4 w-4" />
						</Button>

						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant="outline" size="sm" className="text-destructive">
									<Trash2 className="h-4 w-4" />
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Delete Account</AlertDialogTitle>
									<AlertDialogDescription>
										Are you sure you want to delete this email account? Imported emails will not be affected.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
										Delete
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				</div>

				{account.connection_error && (
					<p className="mt-3 text-sm text-red-500">{account.connection_error}</p>
				)}
			</CardContent>
		</Card>
	);
}
