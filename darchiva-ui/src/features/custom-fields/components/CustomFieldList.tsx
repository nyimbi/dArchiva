// (c) Copyright Datacraft, 2026
/**
 * Custom field management list.
 */
import { useState } from 'react';
import { Settings, Plus, Edit, Trash2, Hash, Calendar, ToggleLeft, List } from 'lucide-react';
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
import { useCustomFields, useDeleteCustomField } from '../api';
import { CustomFieldForm } from './CustomFieldForm';
import type { CustomField, CustomFieldType, FIELD_TYPE_LABELS } from '../types';

const typeIcons: Record<CustomFieldType, typeof Hash> = {
	text: Settings,
	number: Hash,
	date: Calendar,
	datetime: Calendar,
	boolean: ToggleLeft,
	select: List,
	url: Settings,
	email: Settings,
	monetary: Hash,
};

const typeLabels: Record<CustomFieldType, string> = {
	text: 'Text',
	number: 'Number',
	date: 'Date',
	datetime: 'Date & Time',
	boolean: 'Yes/No',
	select: 'Dropdown',
	url: 'URL',
	email: 'Email',
	monetary: 'Currency',
};

interface CustomFieldListProps {
	onEdit?: (field: CustomField) => void;
	hideHeader?: boolean;
}

export function CustomFieldList({ onEdit, hideHeader = false }: CustomFieldListProps) {
	const { data, isLoading } = useCustomFields();
	const deleteMutation = useDeleteCustomField();
	const [editingField, setEditingField] = useState<CustomField | null>(null);
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

	const fields = data?.items ?? [];

	return (
		<>
			<div className="space-y-4">
				{!hideHeader && (
					<div className="flex items-center justify-between">
						<div>
							<h2 className="text-xl font-semibold">Custom Fields</h2>
							<p className="text-sm text-muted-foreground">
								Define custom metadata fields for your documents
							</p>
						</div>
						<Button onClick={() => setShowCreateDialog(true)}>
							<Plus className="h-4 w-4 mr-2" />
							Add Field
						</Button>
					</div>
				)}

				{fields.length === 0 ? (
					<Card>
						<CardContent className="flex flex-col items-center justify-center py-12">
							<Settings className="h-12 w-12 text-muted-foreground/50 mb-4" />
							<h3 className="text-lg font-medium">No custom fields</h3>
							<p className="text-sm text-muted-foreground">
								Create custom fields to capture additional document metadata
							</p>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-4 md:grid-cols-2">
						{fields.map((field) => {
							const Icon = typeIcons[field.type];
							return (
								<Card key={field.id}>
									<CardHeader>
										<div className="flex items-start justify-between">
											<div className="flex items-center gap-3">
												<div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
													<Icon className="h-5 w-5 text-primary" />
												</div>
												<div>
													<CardTitle className="text-base">{field.name}</CardTitle>
													{field.description && (
														<CardDescription>{field.description}</CardDescription>
													)}
												</div>
											</div>
										</div>
									</CardHeader>
									<CardContent>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<Badge variant="secondary">{typeLabels[field.type]}</Badge>
												{field.required && <Badge variant="outline">Required</Badge>}
											</div>

											<div className="flex items-center gap-2">
												<Button variant="outline" size="sm" onClick={() => onEdit ? onEdit(field) : setEditingField(field)}>
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
															<AlertDialogTitle>Delete Field</AlertDialogTitle>
															<AlertDialogDescription>
																Are you sure? This will remove the field from all documents.
															</AlertDialogDescription>
														</AlertDialogHeader>
														<AlertDialogFooter>
															<AlertDialogCancel>Cancel</AlertDialogCancel>
															<AlertDialogAction
																onClick={() => deleteMutation.mutate(field.id)}
																className="bg-destructive text-destructive-foreground"
															>
																Delete
															</AlertDialogAction>
														</AlertDialogFooter>
													</AlertDialogContent>
												</AlertDialog>
											</div>
										</div>
									</CardContent>
								</Card>
							);
						})}
					</div>
				)}
			</div>

			<Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create Custom Field</DialogTitle>
					</DialogHeader>
					<CustomFieldForm
						onSuccess={() => setShowCreateDialog(false)}
						onCancel={() => setShowCreateDialog(false)}
					/>
				</DialogContent>
			</Dialog>

			<Dialog open={!!editingField} onOpenChange={() => setEditingField(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Custom Field</DialogTitle>
					</DialogHeader>
					{editingField && (
						<CustomFieldForm
							field={editingField}
							onSuccess={() => setEditingField(null)}
							onCancel={() => setEditingField(null)}
						/>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
