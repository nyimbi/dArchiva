// (c) Copyright Datacraft, 2026
/**
 * Email detail view component.
 */
import { format } from 'date-fns';
import {
	Mail,
	Paperclip,
	Download,
	Trash2,
	FileText,
	Image,
	File,
	ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { useEmailImport, useDeleteEmailImport } from '../api';
import type { EmailImport, EmailAttachment, AttachmentStatus } from '../types';

interface EmailDetailProps {
	emailId: string;
	onDelete?: () => void;
}

const statusColors: Record<AttachmentStatus, string> = {
	pending: 'bg-yellow-500/10 text-yellow-500',
	imported: 'bg-green-500/10 text-green-500',
	skipped: 'bg-gray-500/10 text-gray-500',
	failed: 'bg-red-500/10 text-red-500',
};

function getFileIcon(contentType: string) {
	if (contentType.startsWith('image/')) return Image;
	if (contentType === 'application/pdf') return FileText;
	return File;
}

export function EmailDetail({ emailId, onDelete }: EmailDetailProps) {
	const { data: email, isLoading } = useEmailImport(emailId);
	const deleteMutation = useDeleteEmailImport();

	if (isLoading || !email) {
		return (
			<div className="flex items-center justify-center h-full text-muted-foreground">
				<p>Loading email...</p>
			</div>
		);
	}

	const handleDelete = async () => {
		await deleteMutation.mutateAsync(emailId);
		onDelete?.();
	};

	const sentDate = email.sent_date ? new Date(email.sent_date) : null;

	return (
		<div className="h-full flex flex-col">
			{/* Header */}
			<div className="p-6 border-b border-border/50">
				<div className="flex items-start justify-between mb-4">
					<h2 className="text-xl font-semibold">{email.subject || '(no subject)'}</h2>

					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button variant="ghost" size="icon" className="text-destructive">
								<Trash2 className="h-4 w-4" />
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Delete Email</AlertDialogTitle>
								<AlertDialogDescription>
									Are you sure you want to delete this email? This action cannot be undone.
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

				<div className="space-y-2 text-sm">
					<div className="flex items-center gap-2">
						<span className="text-muted-foreground w-16">From:</span>
						<span className="font-medium">
							{email.from_name ? `${email.from_name} <${email.from_address}>` : email.from_address}
						</span>
					</div>

					{email.to_addresses.length > 0 && (
						<div className="flex items-center gap-2">
							<span className="text-muted-foreground w-16">To:</span>
							<span>{email.to_addresses.join(', ')}</span>
						</div>
					)}

					{email.cc_addresses.length > 0 && (
						<div className="flex items-center gap-2">
							<span className="text-muted-foreground w-16">Cc:</span>
							<span>{email.cc_addresses.join(', ')}</span>
						</div>
					)}

					{sentDate && (
						<div className="flex items-center gap-2">
							<span className="text-muted-foreground w-16">Date:</span>
							<span>{format(sentDate, 'PPpp')}</span>
						</div>
					)}
				</div>
			</div>

			{/* Attachments */}
			{email.attachments.length > 0 && (
				<div className="p-4 border-b border-border/50 bg-muted/30">
					<div className="flex items-center gap-2 mb-3">
						<Paperclip className="h-4 w-4 text-muted-foreground" />
						<span className="text-sm font-medium">
							{email.attachments.length} Attachment{email.attachments.length !== 1 ? 's' : ''}
						</span>
					</div>

					<div className="grid grid-cols-2 gap-2">
						{email.attachments.map((attachment) => (
							<AttachmentCard key={attachment.id} attachment={attachment} />
						))}
					</div>
				</div>
			)}

			{/* Body */}
			<div className="flex-1 p-6 overflow-auto">
				<div className="prose prose-sm dark:prose-invert max-w-none">
					{email.body_html ? (
						<div
							className="email-body"
							dangerouslySetInnerHTML={{ __html: email.body_html }}
						/>
					) : email.body_text ? (
						<pre className="whitespace-pre-wrap font-sans text-sm">
							{email.body_text}
						</pre>
					) : (
						<p className="text-muted-foreground italic">
							No email body content available.
						</p>
					)}
				</div>
			</div>

			{/* Footer */}
			<div className="p-4 border-t border-border/50 flex items-center gap-2">
				<Badge variant="outline">{email.source}</Badge>
				<Badge variant="outline">{email.import_status}</Badge>

				{email.document_id && (
					<Button variant="outline" size="sm" className="ml-auto" asChild>
						<a href={`/documents/${email.document_id}`}>
							<ExternalLink className="h-4 w-4 mr-2" />
							View Document
						</a>
					</Button>
				)}
			</div>
		</div>
	);
}

interface AttachmentCardProps {
	attachment: EmailAttachment;
}

function AttachmentCard({ attachment }: AttachmentCardProps) {
	const Icon = getFileIcon(attachment.content_type);
	const sizeKB = Math.round(attachment.size_bytes / 1024);

	return (
		<div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background hover:bg-accent/50 transition-colors">
			<div className="flex-shrink-0">
				<Icon className="h-8 w-8 text-muted-foreground" />
			</div>

			<div className="flex-1 min-w-0">
				<p className="font-medium text-sm truncate">{attachment.filename}</p>
				<div className="flex items-center gap-2 mt-0.5">
					<span className="text-xs text-muted-foreground">{sizeKB} KB</span>
					<Badge variant="secondary" className={cn('text-xs', statusColors[attachment.import_status])}>
						{attachment.import_status}
					</Badge>
				</div>
			</div>

			{attachment.document_id && (
				<Button variant="ghost" size="icon" asChild>
					<a href={`/documents/${attachment.document_id}`}>
						<ExternalLink className="h-4 w-4" />
					</a>
				</Button>
			)}
		</div>
	);
}
