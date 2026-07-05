// (c) Copyright Datacraft, 2026
/**
 * ExpiryPanel — view and manage document expiry settings.
 * Embed in a DocumentDetail sidebar; does NOT modify DocumentDetail.tsx itself.
 */
import { useState } from 'react';
import { addYears, format, parseISO } from 'date-fns';
import { CalendarIcon, Clock, Trash2, Pencil, Loader2, AlertCircle, CalendarPlus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

import {
	useDocumentExpiry,
	useSetDocumentExpiry,
	useRemoveDocumentExpiry,
	type DocumentExpiryRecord,
	type ExpiryAction,
} from '../api/expiry';

// ---------------------------------------------------------------------------
// Types / constants
// ---------------------------------------------------------------------------

interface Props {
	documentId: string;
}

const REMINDER_OPTIONS: { days: number; label: string }[] = [
	{ days: 30, label: 'Notify me 30 days before' },
	{ days: 7,  label: 'Notify me 7 days before' },
	{ days: 0,  label: 'On expiry' },
];

const EXPIRY_ACTIONS: { value: ExpiryAction; label: string }[] = [
	{ value: 'archive', label: 'Archive' },
	{ value: 'delete', label: 'Delete' },
	{ value: 'notify_only', label: 'Notify only' },
	{ value: 'extend_automatically', label: 'Extend automatically' },
];

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

function urgencyBadgeVariant(days: number): 'default' | 'secondary' | 'destructive' {
	if (days < 7) return 'destructive';
	if (days <= 30) return 'secondary';
	return 'default';
}

function urgencyColorClass(days: number): string {
	if (days < 7) return 'text-red-600 dark:text-red-400';
	if (days <= 30) return 'text-amber-600 dark:text-amber-400';
	return 'text-green-600 dark:text-green-500';
}

function expiryDate(record: DocumentExpiryRecord): string {
	return record.expiresAt ?? record.expires_at;
}

function reminderDays(record: DocumentExpiryRecord | null | undefined): number[] {
	return record?.reminderDays ?? record?.reminder_days ?? [];
}

function notifiedMilestones(record: DocumentExpiryRecord): number[] {
	return record.notifiedMilestones ?? record.notified_milestones ?? [];
}

function actionOnExpiry(record: DocumentExpiryRecord | null | undefined): ExpiryAction {
	return record?.actionOnExpiry ?? record?.action_on_expiry ?? 'notify_only';
}

// ---------------------------------------------------------------------------
// Set-expiry form
// ---------------------------------------------------------------------------

function SetExpiryForm({
	documentId,
	initialDate,
	initialReminderDays,
	initialAction,
	onCancel,
}: {
	documentId: string;
	initialDate: Date | undefined;
	initialReminderDays: number[];
	initialAction: ExpiryAction;
	onCancel?: () => void;
}) {
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);
	const [reminderDays, setReminderDays] = useState<number[]>(
		initialReminderDays.length > 0 ? initialReminderDays : [30, 7, 0],
	);
	const [action, setAction] = useState<ExpiryAction>(initialAction);
	const [calOpen, setCalOpen] = useState(false);

	const setExpiry = useSetDocumentExpiry(documentId);

	function toggleReminder(days: number) {
		setReminderDays((prev) =>
			prev.includes(days) ? prev.filter((d) => d !== days) : [...prev, days],
		);
	}

	async function handleSave() {
		if (!selectedDate) return;
		await setExpiry.mutateAsync({
			expires_at: selectedDate.toISOString(),
			reminder_days: reminderDays,
			action_on_expiry: action,
		});
		onCancel?.();
	}

	return (
		<div className="space-y-4">
			{/* Date picker */}
			<div className="space-y-1.5">
				<Label className="text-xs font-medium text-muted-foreground">Expiry date</Label>
				<Popover open={calOpen} onOpenChange={setCalOpen}>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							className={cn(
								'w-full justify-start text-left font-normal',
								!selectedDate && 'text-muted-foreground',
							)}
						>
							<CalendarIcon className="mr-2 h-4 w-4" />
							{selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="start">
						<Calendar
							mode="single"
							selected={selectedDate}
							onSelect={(d) => {
								setSelectedDate(d);
								setCalOpen(false);
							}}
							disabled={(d) => d < new Date()}
							initialFocus
						/>
					</PopoverContent>
				</Popover>
			</div>

			{/* Notification checkboxes */}
			<div className="space-y-1.5">
				<Label className="text-xs font-medium text-muted-foreground">Notification settings</Label>
				<div className="space-y-2">
					{REMINDER_OPTIONS.map(({ days, label }) => (
						<div key={days} className="flex items-center gap-2">
							<Checkbox
								id={`reminder-${days}`}
								checked={reminderDays.includes(days)}
								onCheckedChange={() => toggleReminder(days)}
							/>
							<Label
								htmlFor={`reminder-${days}`}
								className="text-sm font-normal cursor-pointer"
							>
								{label}
							</Label>
						</div>
					))}
				</div>
			</div>

			<div className="space-y-1.5">
				<Label htmlFor="expiry-action" className="text-xs font-medium text-muted-foreground">
					Action on expiry
				</Label>
				<Select value={action} onValueChange={(value) => setAction(value as ExpiryAction)}>
					<SelectTrigger id="expiry-action">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{EXPIRY_ACTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Actions */}
			<div className="flex gap-2 pt-1">
				<Button
					size="sm"
					onClick={handleSave}
					disabled={!selectedDate || setExpiry.isPending}
					className="flex-1"
				>
					{setExpiry.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
					Save
				</Button>
				{onCancel && (
					<Button size="sm" variant="ghost" onClick={onCancel} className="flex-1">
						Cancel
					</Button>
				)}
			</div>

			{setExpiry.isError && (
				<p className="text-xs text-destructive flex items-center gap-1">
					<AlertCircle className="h-3.5 w-3.5" />
					Failed to save expiry. Please try again.
				</p>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export function ExpiryPanel({ documentId }: Props) {
	const [editMode, setEditMode] = useState(false);
	const { data: expiry, isLoading, isError } = useDocumentExpiry(documentId);
	const removeExpiry = useRemoveDocumentExpiry(documentId);
	const setExpiry = useSetDocumentExpiry(documentId);

	if (isLoading) {
		return (
			<div className="space-y-2 p-4">
				<Skeleton className="h-4 w-24" />
				<Skeleton className="h-8 w-full" />
			</div>
		);
	}

	if (isError) {
		return (
			<div className="flex items-center gap-2 p-4 text-sm text-destructive">
				<AlertCircle className="h-4 w-4" />
				Failed to load expiry settings.
			</div>
		);
	}

	// No expiry set — show form directly
	if (!expiry) {
		return (
			<div className="p-4 space-y-3">
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Clock className="h-4 w-4" />
					<span>No expiry set</span>
				</div>
				<Separator />
				<SetExpiryForm
					documentId={documentId}
					initialDate={undefined}
					initialReminderDays={[30, 7, 0]}
					initialAction="notify_only"
				/>
			</div>
		);
	}

	// Expiry exists — show summary or edit form
	const expiresAt = parseISO(expiryDate(expiry));
	const daysUntil = Math.max(
		0,
		Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000),
	);
	const currentReminderDays = reminderDays(expiry);
	const currentAction = actionOnExpiry(expiry);

	async function handleExtendOneYear() {
		await setExpiry.mutateAsync({
			expires_at: addYears(expiresAt, 1).toISOString(),
			reminder_days: currentReminderDays,
			action_on_expiry: currentAction,
		});
	}

	if (editMode) {
		return (
			<div className="p-4 space-y-3">
				<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
					Edit expiry
				</p>
				<Separator />
				<SetExpiryForm
					documentId={documentId}
					initialDate={expiresAt}
					initialReminderDays={currentReminderDays}
					initialAction={currentAction}
					onCancel={() => setEditMode(false)}
				/>
			</div>
		);
	}

	return (
		<div className="p-4 space-y-3">
			{/* Expiry date + urgency */}
			<div className="flex items-start justify-between gap-2">
				<div className="space-y-0.5">
					<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
						Expires
					</p>
					<p className="text-sm font-semibold">{format(expiresAt, 'PPP')}</p>
					<p className={cn('text-xs font-medium', urgencyColorClass(daysUntil))}>
						{daysUntil === 0
							? 'Expires today'
							: daysUntil === 1
							? 'Expires tomorrow'
							: `${daysUntil} days remaining`}
					</p>
				</div>
				<Badge variant={urgencyBadgeVariant(daysUntil)} className="shrink-0">
					{daysUntil < 7 ? 'Urgent' : daysUntil <= 30 ? 'Soon' : 'OK'}
				</Badge>
			</div>

			<Separator />

			{/* Notification schedule */}
			<div className="space-y-1">
				<p className="text-xs font-medium text-muted-foreground">Notification settings</p>
				<div className="space-y-2">
					{REMINDER_OPTIONS.map(({ days, label }) => {
						const enabled = currentReminderDays.includes(days);
						const fired = notifiedMilestones(expiry).includes(days);
						return (
							<div key={days} className="flex items-center justify-between gap-2 text-sm">
								<span className={enabled ? 'text-foreground' : 'text-muted-foreground'}>
									{label}
								</span>
								<Badge variant={enabled ? (fired ? 'secondary' : 'outline') : 'secondary'} className="text-xs">
									{enabled ? (fired ? 'Sent' : 'Enabled') : 'Off'}
								</Badge>
							</div>
						);
					})}
				</div>
			</div>

			<div className="space-y-1">
				<p className="text-xs font-medium text-muted-foreground">Action on expiry</p>
				<Badge variant="outline">
					{EXPIRY_ACTIONS.find((option) => option.value === currentAction)?.label ?? 'Notify only'}
				</Badge>
			</div>

			{/* Actions */}
			<div className="grid grid-cols-2 gap-2 pt-1">
				<Button
					size="sm"
					variant="outline"
					onClick={() => setEditMode(true)}
				>
					<Pencil className="mr-1.5 h-3.5 w-3.5" />
					Edit
				</Button>
				<Button
					size="sm"
					variant="outline"
					onClick={handleExtendOneYear}
					disabled={setExpiry.isPending}
				>
					{setExpiry.isPending ? (
						<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
					) : (
						<CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
					)}
					Extend
				</Button>
				<Button
					size="sm"
					variant="ghost"
					onClick={() => removeExpiry.mutate()}
					disabled={removeExpiry.isPending}
					className="col-span-2 text-destructive hover:text-destructive"
				>
					{removeExpiry.isPending ? (
						<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
					) : (
						<Trash2 className="mr-1.5 h-3.5 w-3.5" />
					)}
					Remove
				</Button>
			</div>
		</div>
	);
}
