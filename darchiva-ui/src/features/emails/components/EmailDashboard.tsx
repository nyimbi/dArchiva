// (c) Copyright Datacraft, 2026
/**
 * Email management dashboard.
 */
import { useState } from 'react';
import {
	Mail,
	Upload,
	Settings,
	Filter,
	Plus,
	Server,
	RefreshCw,
	Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { EmailList } from './EmailList';
import { EmailDetail } from './EmailDetail';
import { EmailAccountForm } from './EmailAccountForm';
import { EmailRuleForm } from './EmailRuleForm';
import { EmailAccountList } from './EmailAccountList';
import { EmailRuleList } from './EmailRuleList';
import { useImportEmail } from '../api';
import type { EmailImport } from '../types';

interface EmailDashboardProps {
	folderId?: string;
}

export function EmailDashboard({ folderId }: EmailDashboardProps) {
	const { toast } = useToast();
	const [selectedEmail, setSelectedEmail] = useState<EmailImport | null>(null);
	const [accountDialogOpen, setAccountDialogOpen] = useState(false);
	const [ruleDialogOpen, setRuleDialogOpen] = useState(false);

	const importMutation = useImportEmail();

	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		try {
			await importMutation.mutateAsync({ file, folderId });
			toast({ title: 'Email imported successfully' });
		} catch (error) {
			toast({
				title: 'Import failed',
				description: 'Could not import email file',
				variant: 'destructive',
			});
		}

		// Reset input
		e.target.value = '';
	};

	return (
		<div className="h-full flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b border-border/50">
				<div className="flex items-center gap-2">
					<Mail className="h-5 w-5 text-primary" />
					<h1 className="text-lg font-semibold">Email Management</h1>
				</div>

				<div className="flex items-center gap-2">
					{/* Import button */}
					<label>
						<input
							type="file"
							accept=".eml,.msg"
							className="hidden"
							onChange={handleFileUpload}
							disabled={importMutation.isPending}
						/>
						<Button variant="outline" asChild disabled={importMutation.isPending}>
							<span className="cursor-pointer">
								{importMutation.isPending ? (
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								) : (
									<Upload className="h-4 w-4 mr-2" />
								)}
								Import Email
							</span>
						</Button>
					</label>

					{/* Settings dropdown */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="icon">
								<Settings className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={() => setAccountDialogOpen(true)}>
								<Server className="h-4 w-4 mr-2" />
								Add Email Account
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => setRuleDialogOpen(true)}>
								<Filter className="h-4 w-4 mr-2" />
								Create Rule
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			{/* Main content */}
			<Tabs defaultValue="emails" className="flex-1 flex flex-col">
				<div className="px-4 border-b border-border/50">
					<TabsList className="h-10">
						<TabsTrigger value="emails">
							<Mail className="h-4 w-4 mr-2" />
							Emails
						</TabsTrigger>
						<TabsTrigger value="accounts">
							<Server className="h-4 w-4 mr-2" />
							Accounts
						</TabsTrigger>
						<TabsTrigger value="rules">
							<Filter className="h-4 w-4 mr-2" />
							Rules
						</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent value="emails" className="flex-1 mt-0">
					<div className="h-full flex">
						{/* Email list */}
						<div className="w-96 border-r border-border/50">
							<EmailList
								folderId={folderId}
								selectedId={selectedEmail?.id}
								onSelect={setSelectedEmail}
							/>
						</div>

						{/* Email detail */}
						<div className="flex-1">
							{selectedEmail ? (
								<EmailDetail
									emailId={selectedEmail.id}
									onDelete={() => setSelectedEmail(null)}
								/>
							) : (
								<div className="flex flex-col items-center justify-center h-full text-muted-foreground">
									<Mail className="h-16 w-16 mb-4 opacity-30" />
									<p className="text-lg font-medium">Select an email</p>
									<p className="text-sm">Choose an email from the list to view details</p>
								</div>
							)}
						</div>
					</div>
				</TabsContent>

				<TabsContent value="accounts" className="flex-1 mt-0 p-4">
					<div className="max-w-4xl mx-auto">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h2 className="text-xl font-semibold">Email Accounts</h2>
								<p className="text-sm text-muted-foreground">
									Configure accounts for automatic email import
								</p>
							</div>
							<Button onClick={() => setAccountDialogOpen(true)}>
								<Plus className="h-4 w-4 mr-2" />
								Add Account
							</Button>
						</div>

						<EmailAccountList />
					</div>
				</TabsContent>

				<TabsContent value="rules" className="flex-1 mt-0 p-4">
					<div className="max-w-4xl mx-auto">
						<div className="flex items-center justify-between mb-6">
							<div>
								<h2 className="text-xl font-semibold">Email Rules</h2>
								<p className="text-sm text-muted-foreground">
									Automate email processing with rules
								</p>
							</div>
							<Button onClick={() => setRuleDialogOpen(true)}>
								<Plus className="h-4 w-4 mr-2" />
								Create Rule
							</Button>
						</div>

						<EmailRuleList />
					</div>
				</TabsContent>
			</Tabs>

			{/* Account Dialog */}
			<Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Add Email Account</DialogTitle>
					</DialogHeader>
					<EmailAccountForm
						onSuccess={() => setAccountDialogOpen(false)}
						onCancel={() => setAccountDialogOpen(false)}
					/>
				</DialogContent>
			</Dialog>

			{/* Rule Dialog */}
			<Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Create Email Rule</DialogTitle>
					</DialogHeader>
					<EmailRuleForm
						onSuccess={() => setRuleDialogOpen(false)}
						onCancel={() => setRuleDialogOpen(false)}
					/>
				</DialogContent>
			</Dialog>
		</div>
	);
}
