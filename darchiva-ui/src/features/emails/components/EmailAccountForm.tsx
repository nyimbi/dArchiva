// (c) Copyright Datacraft, 2026
/**
 * Email account configuration form.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Server, Lock, FolderSync, Settings, TestTube, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useCreateEmailAccount, useUpdateEmailAccount, useTestEmailAccount } from '../api';
import type { EmailAccount, EmailAccountCreate, EmailAccountType } from '../types';

const accountSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	account_type: z.enum(['imap', 'graph_api', 'gmail_api']),
	email_address: z.string().email('Valid email required'),
	// IMAP
	imap_host: z.string().optional(),
	imap_port: z.coerce.number().min(1).max(65535).optional(),
	imap_use_ssl: z.boolean().default(true),
	imap_username: z.string().optional(),
	imap_password: z.string().optional(),
	// OAuth
	oauth_tenant_id: z.string().optional(),
	oauth_client_id: z.string().optional(),
	oauth_client_secret: z.string().optional(),
	// Sync
	sync_enabled: z.boolean().default(false),
	sync_folders: z.string().optional(), // Comma-separated
	sync_interval_minutes: z.coerce.number().min(5).max(1440).default(15),
	// Target
	target_folder_id: z.string().optional(),
	auto_process: z.boolean().default(true),
	import_attachments: z.boolean().default(true),
});

type AccountFormData = z.infer<typeof accountSchema>;

interface EmailAccountFormProps {
	account?: EmailAccount;
	onSuccess?: () => void;
	onCancel?: () => void;
}

export function EmailAccountForm({ account, onSuccess, onCancel }: EmailAccountFormProps) {
	const { toast } = useToast();
	const [testing, setTesting] = useState(false);

	const createMutation = useCreateEmailAccount();
	const updateMutation = useUpdateEmailAccount();
	const testMutation = useTestEmailAccount();

	const form = useForm<AccountFormData>({
		resolver: zodResolver(accountSchema),
		defaultValues: {
			name: account?.name ?? '',
			account_type: (account?.account_type as EmailAccountType) ?? 'imap',
			email_address: account?.email_address ?? '',
			imap_port: 993,
			imap_use_ssl: true,
			sync_enabled: account?.sync_enabled ?? false,
			sync_folders: account?.sync_folders?.join(', ') ?? 'INBOX',
			sync_interval_minutes: account?.sync_interval_minutes ?? 15,
			target_folder_id: account?.target_folder_id ?? '',
			auto_process: account?.auto_process ?? true,
			import_attachments: account?.import_attachments ?? true,
		},
	});

	const accountType = form.watch('account_type');

	const onSubmit = async (data: AccountFormData) => {
		const payload: EmailAccountCreate = {
			...data,
			sync_folders: data.sync_folders?.split(',').map((f) => f.trim()).filter(Boolean),
		};

		try {
			if (account) {
				await updateMutation.mutateAsync({ accountId: account.id, data: payload });
				toast({ title: 'Account updated successfully' });
			} else {
				await createMutation.mutateAsync(payload);
				toast({ title: 'Account created successfully' });
			}
			onSuccess?.();
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to save account',
				variant: 'destructive',
			});
		}
	};

	const handleTest = async () => {
		if (!account) return;

		setTesting(true);
		try {
			const result = await testMutation.mutateAsync(account.id);
			toast({
				title: result.success ? 'Connection successful' : 'Connection failed',
				description: result.message,
				variant: result.success ? 'default' : 'destructive',
			});
		} catch (error) {
			toast({
				title: 'Test failed',
				description: 'Could not test connection',
				variant: 'destructive',
			});
		} finally {
			setTesting(false);
		}
	};

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				<Tabs defaultValue="general" className="w-full">
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="general">
							<Mail className="h-4 w-4 mr-2" />
							General
						</TabsTrigger>
						<TabsTrigger value="connection">
							<Server className="h-4 w-4 mr-2" />
							Connection
						</TabsTrigger>
						<TabsTrigger value="sync">
							<FolderSync className="h-4 w-4 mr-2" />
							Sync
						</TabsTrigger>
					</TabsList>

					{/* General Tab */}
					<TabsContent value="general" className="mt-4">
						<Card>
							<CardHeader>
								<CardTitle>Account Details</CardTitle>
								<CardDescription>Basic account information</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Account Name</FormLabel>
											<FormControl>
												<Input placeholder="Work Email" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="email_address"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Email Address</FormLabel>
											<FormControl>
												<Input placeholder="user@example.com" type="email" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="account_type"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Account Type</FormLabel>
											<Select onValueChange={field.onChange} defaultValue={field.value}>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select account type" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="imap">IMAP</SelectItem>
													<SelectItem value="graph_api">Microsoft Graph API (Outlook)</SelectItem>
													<SelectItem value="gmail_api">Gmail API</SelectItem>
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
							</CardContent>
						</Card>
					</TabsContent>

					{/* Connection Tab */}
					<TabsContent value="connection" className="mt-4">
						<Card>
							<CardHeader>
								<CardTitle>Connection Settings</CardTitle>
								<CardDescription>
									{accountType === 'imap' ? 'IMAP server configuration' : 'OAuth configuration'}
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								{accountType === 'imap' ? (
									<>
										<div className="grid grid-cols-2 gap-4">
											<FormField
												control={form.control}
												name="imap_host"
												render={({ field }) => (
													<FormItem>
														<FormLabel>IMAP Server</FormLabel>
														<FormControl>
															<Input placeholder="imap.example.com" {...field} />
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>

											<FormField
												control={form.control}
												name="imap_port"
												render={({ field }) => (
													<FormItem>
														<FormLabel>Port</FormLabel>
														<FormControl>
															<Input type="number" placeholder="993" {...field} />
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
										</div>

										<FormField
											control={form.control}
											name="imap_use_ssl"
											render={({ field }) => (
												<FormItem className="flex items-center justify-between rounded-lg border p-3">
													<div>
														<FormLabel>Use SSL/TLS</FormLabel>
														<FormDescription>Encrypt connection to server</FormDescription>
													</div>
													<FormControl>
														<Switch checked={field.value} onCheckedChange={field.onChange} />
													</FormControl>
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="imap_username"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Username</FormLabel>
													<FormControl>
														<Input placeholder="user@example.com" {...field} />
													</FormControl>
													<FormDescription>Leave blank to use email address</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="imap_password"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Password</FormLabel>
													<FormControl>
														<Input type="password" placeholder="••••••••" {...field} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</>
								) : (
									<>
										{accountType === 'graph_api' && (
											<FormField
												control={form.control}
												name="oauth_tenant_id"
												render={({ field }) => (
													<FormItem>
														<FormLabel>Tenant ID</FormLabel>
														<FormControl>
															<Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" {...field} />
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
										)}

										<FormField
											control={form.control}
											name="oauth_client_id"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Client ID</FormLabel>
													<FormControl>
														<Input placeholder="OAuth client ID" {...field} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="oauth_client_secret"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Client Secret</FormLabel>
													<FormControl>
														<Input type="password" placeholder="OAuth client secret" {...field} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</>
								)}
							</CardContent>
						</Card>
					</TabsContent>

					{/* Sync Tab */}
					<TabsContent value="sync" className="mt-4">
						<Card>
							<CardHeader>
								<CardTitle>Sync Settings</CardTitle>
								<CardDescription>Configure automatic email synchronization</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<FormField
									control={form.control}
									name="sync_enabled"
									render={({ field }) => (
										<FormItem className="flex items-center justify-between rounded-lg border p-3">
											<div>
												<FormLabel>Enable Automatic Sync</FormLabel>
												<FormDescription>Automatically fetch new emails</FormDescription>
											</div>
											<FormControl>
												<Switch checked={field.value} onCheckedChange={field.onChange} />
											</FormControl>
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="sync_folders"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Folders to Sync</FormLabel>
											<FormControl>
												<Input placeholder="INBOX, Sent, Archive" {...field} />
											</FormControl>
											<FormDescription>Comma-separated folder names</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="sync_interval_minutes"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Sync Interval (minutes)</FormLabel>
											<FormControl>
												<Input type="number" min={5} max={1440} {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="auto_process"
									render={({ field }) => (
										<FormItem className="flex items-center justify-between rounded-lg border p-3">
											<div>
												<FormLabel>Auto-Process Emails</FormLabel>
												<FormDescription>Automatically run OCR on imported documents</FormDescription>
											</div>
											<FormControl>
												<Switch checked={field.value} onCheckedChange={field.onChange} />
											</FormControl>
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="import_attachments"
									render={({ field }) => (
										<FormItem className="flex items-center justify-between rounded-lg border p-3">
											<div>
												<FormLabel>Import Attachments</FormLabel>
												<FormDescription>Save email attachments as documents</FormDescription>
											</div>
											<FormControl>
												<Switch checked={field.value} onCheckedChange={field.onChange} />
											</FormControl>
										</FormItem>
									)}
								/>
							</CardContent>
						</Card>
					</TabsContent>
				</Tabs>

				{/* Actions */}
				<div className="flex items-center justify-between">
					{account && (
						<Button type="button" variant="outline" onClick={handleTest} disabled={testing}>
							{testing ? (
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							) : (
								<TestTube className="h-4 w-4 mr-2" />
							)}
							Test Connection
						</Button>
					)}

					<div className="flex items-center gap-2 ml-auto">
						<Button type="button" variant="outline" onClick={onCancel}>
							Cancel
						</Button>
						<Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
							{createMutation.isPending || updateMutation.isPending ? (
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							) : null}
							{account ? 'Save Changes' : 'Create Account'}
						</Button>
					</div>
				</div>
			</form>
		</Form>
	);
}
