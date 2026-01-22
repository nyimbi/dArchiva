// (c) Copyright Datacraft, 2026
/**
 * Document type management list.
 */
import { useState } from 'react';
import { FileType, Plus, Edit, Trash2, Settings, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useDocumentTypes, useDeleteDocumentType } from '../api';
import { DocumentTypeForm } from './DocumentTypeForm';
import type { DocumentType } from '../types';

interface DocumentTypeListProps {
	onEdit?: (type: DocumentType) => void;
	hideHeader?: boolean;
}

export function DocumentTypeList({ onEdit, hideHeader = false }: DocumentTypeListProps) {
	const { data, isLoading } = useDocumentTypes();
	const deleteMutation = useDeleteDocumentType();
	const [editingType, setEditingType] = useState<DocumentType | null>(null);
	const [showCreateDialog, setShowCreateDialog] = useState(false);

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

	const types = data?.items ?? [];

	return (
		<>
			<div className="space-y-4">
				{!hideHeader && (
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-xl font-semibold">Document Types</h2>
							<p className="text-sm text-muted-foreground">
								Configure document classification and processing rules
							</p>
						</div>
						<Button onClick={() => setShowCreateDialog(true)}>
							<Plus className="h-4 w-4 mr-2" />
							Add Type
						</Button>
					</div>
				)}

				{types.length === 0 ? (
					<Card>
						<CardContent className="flex flex-col items-center justify-center py-12">
							<FileType className="h-12 w-12 text-muted-foreground/50 mb-4" />
							<h3 className="text-lg font-medium">No document types</h3>
							<p className="text-sm text-muted-foreground">
								Create document types to organize and process documents
							</p>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{types.map((type) => (
							<Card key={type.id}>
								<CardHeader>
									<div className="flex items-start justify-between">
										<div className="flex items-center gap-3">
											<div
												className="h-10 w-10 rounded-lg flex items-center justify-center"
												style={{ backgroundColor: `${type.color || '#64748b'}20` }}
											>
												<FileType className="h-5 w-5" style={{ color: type.color || '#64748b' }} />
											</div>
											<div>
												<CardTitle className="text-base">{type.name}</CardTitle>
												{type.description && (
													<CardDescription className="line-clamp-1">{type.description}</CardDescription>
												)}
											</div>
										</div>
									</div>
								</CardHeader>
								<CardContent>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2 text-sm text-muted-foreground">
											<FileText className="h-4 w-4" />
											{type.document_count} documents
										</div>

										<div className="flex items-center gap-2">
											<Button variant="outline" size="sm" onClick={() => onEdit ? onEdit(type) : setEditingType(type)}>
												<Edit className="h-4 w-4" />
											</Button>

											<AlertDialog>
												<AlertDialogTrigger asChild>
													<Button variant="outline" size="sm" className="text-destructive">
														<Trash2 className="h-4 w-4" />
													</Button>
												</AlertDialogTrigger>
												<AlertDialogContent>
													<AlertDialogHeader>
														<AlertDialogTitle>Delete Document Type</AlertDialogTitle>
														<AlertDialogDescription>
															Are you sure? Documents won't be deleted but will lose their type.
														</AlertDialogDescription>
													</AlertDialogHeader>
													<AlertDialogFooter>
														<AlertDialogCancel>Cancel</AlertDialogCancel>
														<AlertDialogAction
															onClick={() => deleteMutation.mutate(type.id)}
															className="bg-destructive text-destructive-foreground"
														>
															Delete
														</AlertDialogAction>
													</AlertDialogFooter>
												</AlertDialogContent>
											</AlertDialog>
										</div>
									</div>

									<div className="flex flex-wrap gap-1 mt-3">
										{type.custom_field_ids.length > 0 && (
											<Badge variant="outline">{type.custom_field_ids.length} fields</Badge>
										)}
										{type.workflow_id && <Badge variant="outline">Workflow</Badge>}
										{type.retention_days && (
											<Badge variant="outline">{type.retention_days}d retention</Badge>
										)}
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>

			<Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Create Document Type</DialogTitle>
					</DialogHeader>
					<DocumentTypeForm
						onSuccess={() => setShowCreateDialog(false)}
						onCancel={() => setShowCreateDialog(false)}
					/>
				</DialogContent>
			</Dialog>

			<Dialog open={!!editingType} onOpenChange={() => setEditingType(null)}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Edit Document Type</DialogTitle>
					</DialogHeader>
					{editingType && (
						<DocumentTypeForm
							documentType={editingType}
							onSuccess={() => setEditingType(null)}
							onCancel={() => setEditingType(null)}
						/>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
