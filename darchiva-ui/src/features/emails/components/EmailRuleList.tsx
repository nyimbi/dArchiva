// (c) Copyright Datacraft, 2026
/**
 * Email rule list component.
 */
import { useState } from 'react';
import {
	Filter,
	Settings,
	Trash2,
	GripVertical,
	ChevronRight,
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
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { EmailRuleForm } from './EmailRuleForm';
import { useEmailRules, useUpdateEmailRule, useDeleteEmailRule } from '../api';
import type { EmailRule, RuleCondition, RuleAction } from '../types';

const FIELD_LABELS: Record<string, string> = {
	from: 'From',
	to: 'To',
	cc: 'CC',
	subject: 'Subject',
	body: 'Body',
	attachment_name: 'Attachment Name',
	attachment_type: 'Attachment Type',
};

const OPERATOR_LABELS: Record<string, string> = {
	equals: 'equals',
	contains: 'contains',
	starts_with: 'starts with',
	ends_with: 'ends with',
	matches: 'matches',
	exists: 'exists',
};

const ACTION_LABELS: Record<string, string> = {
	move_to_folder: 'Move to folder',
	add_tag: 'Add tag',
	set_document_type: 'Set document type',
	skip_import: 'Skip import',
	extract_attachments_only: 'Extract attachments only',
	notify: 'Send notification',
	run_workflow: 'Run workflow',
	set_custom_field: 'Set custom field',
};

export function EmailRuleList() {
	const { data, isLoading } = useEmailRules();
	const [editingRule, setEditingRule] = useState<EmailRule | null>(null);

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

	const rules = data?.items ?? [];

	if (rules.length === 0) {
		return (
			<Card>
				<CardContent className="flex flex-col items-center justify-center py-12">
					<Filter className="h-12 w-12 text-muted-foreground/50 mb-4" />
					<h3 className="text-lg font-medium">No rules configured</h3>
					<p className="text-sm text-muted-foreground">
						Create rules to automatically process incoming emails
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<>
			<div className="space-y-4">
				{rules.map((rule) => (
					<RuleCard
						key={rule.id}
						rule={rule}
						onEdit={() => setEditingRule(rule)}
					/>
				))}
			</div>

			<Dialog open={!!editingRule} onOpenChange={() => setEditingRule(null)}>
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Edit Rule</DialogTitle>
					</DialogHeader>
					{editingRule && (
						<EmailRuleForm
							rule={editingRule}
							onSuccess={() => setEditingRule(null)}
							onCancel={() => setEditingRule(null)}
						/>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}

interface RuleCardProps {
	rule: EmailRule;
	onEdit: () => void;
}

function RuleCard({ rule, onEdit }: RuleCardProps) {
	const { toast } = useToast();
	const [expanded, setExpanded] = useState(false);

	const updateMutation = useUpdateEmailRule();
	const deleteMutation = useDeleteEmailRule();

	const handleToggleActive = async () => {
		try {
			await updateMutation.mutateAsync({
				ruleId: rule.id,
				data: { is_active: !rule.is_active },
			});
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to update rule',
				variant: 'destructive',
			});
		}
	};

	const handleDelete = async () => {
		try {
			await deleteMutation.mutateAsync(rule.id);
			toast({ title: 'Rule deleted' });
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to delete rule',
				variant: 'destructive',
			});
		}
	};

	return (
		<Collapsible open={expanded} onOpenChange={setExpanded}>
			<Card className={cn(!rule.is_active && 'opacity-60')}>
				<CardHeader>
					<div className="flex items-start justify-between">
						<div className="flex items-center gap-3">
							<GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
							<div>
								<CardTitle className="text-base flex items-center gap-2">
									{rule.name}
									<Badge variant="outline" className="text-xs font-normal">
										Priority: {rule.priority}
									</Badge>
								</CardTitle>
								{rule.description && (
									<CardDescription>{rule.description}</CardDescription>
								)}
							</div>
						</div>

						<div className="flex items-center gap-2">
							<Switch checked={rule.is_active} onCheckedChange={handleToggleActive} />
						</div>
					</div>
				</CardHeader>

				<CardContent>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4 text-sm text-muted-foreground">
							<span>{rule.conditions.length} condition{rule.conditions.length !== 1 ? 's' : ''}</span>
							<span>{rule.actions.length} action{rule.actions.length !== 1 ? 's' : ''}</span>
						</div>

						<div className="flex items-center gap-2">
							<CollapsibleTrigger asChild>
								<Button variant="ghost" size="sm">
									<ChevronRight className={cn('h-4 w-4 transition-transform', expanded && 'rotate-90')} />
									Details
								</Button>
							</CollapsibleTrigger>

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
										<AlertDialogTitle>Delete Rule</AlertDialogTitle>
										<AlertDialogDescription>
											Are you sure you want to delete this rule? This action cannot be undone.
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

					<CollapsibleContent className="mt-4">
						<div className="space-y-4">
							{/* Conditions */}
							<div>
								<h4 className="text-sm font-medium mb-2">Conditions</h4>
								<div className="space-y-1">
									{rule.conditions.map((condition, i) => (
										<ConditionDisplay key={i} condition={condition} />
									))}
								</div>
							</div>

							{/* Actions */}
							<div>
								<h4 className="text-sm font-medium mb-2">Actions</h4>
								<div className="space-y-1">
									{rule.actions.map((action, i) => (
										<ActionDisplay key={i} action={action} />
									))}
								</div>
							</div>
						</div>
					</CollapsibleContent>
				</CardContent>
			</Card>
		</Collapsible>
	);
}

function ConditionDisplay({ condition }: { condition: RuleCondition }) {
	return (
		<div className="text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded">
			<span className="font-medium text-foreground">{FIELD_LABELS[condition.field]}</span>
			{' '}
			<span>{OPERATOR_LABELS[condition.operator]}</span>
			{condition.value && (
				<>
					{' '}
					<span className="text-foreground">"{condition.value}"</span>
				</>
			)}
		</div>
	);
}

function ActionDisplay({ action }: { action: RuleAction }) {
	return (
		<div className="text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded">
			<span className="font-medium text-foreground">{ACTION_LABELS[action.action]}</span>
			{action.value && (
				<>
					{': '}
					<span className="text-foreground">{action.value}</span>
				</>
			)}
		</div>
	);
}
