// (c) Copyright Datacraft, 2026
/**
 * ExpiryPanel — view and manage document expiry settings.
 * Embed in a DocumentDetail sidebar; does NOT modify DocumentDetail.tsx itself.
 */
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon, Clock, Trash2, Pencil, Loader2, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import {
	useDocumentExpiry,
	useSetDocumentExpiry,
	useRemoveDocumentExpiry,
} from '../api/expiry';

// ---------------------------------------------------------------------------
// Types / constants
// ---------------------------------------------------------------------------

interface Props {
	documentId: string;
}

const REMINDER_OPTIONS: { days: number; label: string }[] = [
	{ days: 30, label: '30 days before' },
	{ days: 7,  label: '7 days before' },
	{ days: 1,  label: '1 day before' },
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

// ---------------------------------------------------------------------------
// Set-expiry form
// ---------------------------------------------------------------------------

function SetExpiryForm({
	documentId,
	initialDate,
	initialReminderDays,
	onCancel,
}: {
	documentId: string;
	initialDate: Date | undefined;
	initialReminderDays: number[];
	onCancel?: () => void;
}) {
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);
	const [reminderDays, setReminderDays] = useState<number[]>(
		initialReminderDays.length > 0 ? initialReminderDays : [30, 7, 1],
	);
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

			{/* Reminder checkboxes */}
			<div className="space-y-1.5">
				<Label className="text-xs font-medium text-muted-foreground">Reminders</Label>
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
					initialReminderDays={[30, 7, 1]}
				/>
			</div>
		);
	}

	// Expiry exists — show summary or edit form
	const expiresAt = parseISO(expiry.expires_at);
	const daysUntil = Math.max(
		0,
		Math.ceil((expiresAt.getTime() - Date.now()) / 86_400_000),
	);

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
					initialReminderDays={expiry.reminder_days}
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

			{/* Reminder schedule */}
			<div className="space-y-1">
				<p className="text-xs font-medium text-muted-foreground">Reminders scheduled</p>
				<div className="flex flex-wrap gap-1">
					{expiry.reminder_days.length === 0 ? (
						<span className="text-xs text-muted-foreground">None</span>
					) : (
						expiry.reminder_days.map((d) => {
							const fired = expiry.notified_milestones.includes(d);
							return (
								<Badge
									key={d}
									variant={fired ? 'secondary' : 'outline'}
									className="text-xs"
								>
									{d}d {fired ? '(sent)' : ''}
								</Badge>
							);
						})
					)}
				</div>
			</div>

			{/* Actions */}
			<div className="flex gap-2 pt-1">
				<Button
					size="sm"
					variant="outline"
					onClick={() => setEditMode(true)}
					className="flex-1"
				>
					<Pencil className="mr-1.5 h-3.5 w-3.5" />
					Edit
				</Button>
				<Button
					size="sm"
					variant="ghost"
					onClick={() => removeExpiry.mutate()}
					disabled={removeExpiry.isPending}
					className="flex-1 text-destructive hover:text-destructive"
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
