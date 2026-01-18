// DateTimeField Component
// GitHub Issue #631: Datetime custom fields support
// GitHub Issue #700: Allow manual entry in date custom field
import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Calendar, Clock, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DateTimeFieldProps {
	value?: string | null;
	onChange: (value: string | null) => void;
	includeTime?: boolean;
	allowManualEntry?: boolean; // #700
	minDate?: string;
	maxDate?: string;
	dateFormat?: string;
	timeFormat?: '12h' | '24h';
	disabled?: boolean;
	placeholder?: string;
	className?: string;
	error?: string;
}

export function DateTimeField({
	value,
	onChange,
	includeTime = false,
	allowManualEntry = true, // Default to allow manual entry per #700
	minDate,
	maxDate,
	dateFormat = 'yyyy-MM-dd',
	timeFormat = '24h',
	disabled,
	placeholder,
	className,
	error,
}: DateTimeFieldProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [inputValue, setInputValue] = useState('');
	const [viewDate, setViewDate] = useState(() => {
		if (value) return new Date(value);
		return new Date();
	});
	const inputRef = useRef<HTMLInputElement>(null);

	// Parse value to display
	useEffect(() => {
		if (value) {
			const date = new Date(value);
			if (!isNaN(date.getTime())) {
				setInputValue(formatDateForDisplay(date, includeTime, timeFormat));
			}
		} else {
			setInputValue('');
		}
	}, [value, includeTime, timeFormat]);

	// Handle manual input (#700)
	const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		if (!allowManualEntry) return;

		const text = e.target.value;
		setInputValue(text);

		// Try to parse the input
		const parsed = parseFlexibleDate(text, includeTime);
		if (parsed) {
			// Validate against min/max
			if (minDate && parsed < new Date(minDate)) return;
			if (maxDate && parsed > new Date(maxDate)) return;

			onChange(parsed.toISOString());
			setViewDate(parsed);
		}
	}, [allowManualEntry, includeTime, minDate, maxDate, onChange]);

	const handleInputBlur = useCallback(() => {
		// Re-format on blur if valid
		if (value) {
			const date = new Date(value);
			if (!isNaN(date.getTime())) {
				setInputValue(formatDateForDisplay(date, includeTime, timeFormat));
			}
		} else if (inputValue) {
			// Try one more parse on blur
			const parsed = parseFlexibleDate(inputValue, includeTime);
			if (parsed) {
				onChange(parsed.toISOString());
				setInputValue(formatDateForDisplay(parsed, includeTime, timeFormat));
			} else {
				setInputValue('');
			}
		}
	}, [value, inputValue, includeTime, timeFormat, onChange]);

	const handleSelectDate = useCallback((date: Date) => {
		if (includeTime && value) {
			// Preserve existing time
			const existing = new Date(value);
			date.setHours(existing.getHours(), existing.getMinutes());
		}

		// Validate
		if (minDate && date < new Date(minDate)) return;
		if (maxDate && date > new Date(maxDate)) return;

		onChange(date.toISOString());
		if (!includeTime) {
			setIsOpen(false);
		}
	}, [includeTime, value, minDate, maxDate, onChange]);

	const handleTimeChange = useCallback((hours: number, minutes: number) => {
		const date = value ? new Date(value) : new Date();
		date.setHours(hours, minutes);
		onChange(date.toISOString());
	}, [value, onChange]);

	const handleClear = useCallback(() => {
		onChange(null);
		setInputValue('');
		inputRef.current?.focus();
	}, [onChange]);

	const goToPreviousMonth = () => {
		setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
	};

	const goToNextMonth = () => {
		setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
	};

	const currentValue = value ? new Date(value) : null;
	const displayPlaceholder = placeholder || (includeTime ? 'Select date and time' : 'Select date');

	return (
		<div className={cn('relative', className)}>
			<Popover open={isOpen} onOpenChange={setIsOpen}>
				<PopoverTrigger asChild>
					<div className="relative">
						<Input
							ref={inputRef}
							type="text"
							value={inputValue}
							onChange={handleInputChange}
							onBlur={handleInputBlur}
							placeholder={displayPlaceholder}
							disabled={disabled}
							readOnly={!allowManualEntry}
							className={cn(
								'pr-20',
								error && 'border-destructive',
								!allowManualEntry && 'cursor-pointer'
							)}
							onClick={() => !allowManualEntry && setIsOpen(true)}
						/>
						<div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
							{value && !disabled && (
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										handleClear();
									}}
									className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
								>
									<X className="w-3.5 h-3.5" />
								</button>
							)}
							<button
								type="button"
								onClick={() => setIsOpen(true)}
								disabled={disabled}
								className="p-1.5 rounded hover:bg-accent text-muted-foreground"
							>
								<Calendar className="w-4 h-4" />
							</button>
						</div>
					</div>
				</PopoverTrigger>

				<PopoverContent className="w-auto p-0" align="start">
					<div className="p-3">
						{/* Month navigation */}
						<div className="flex items-center justify-between mb-3">
							<button
								onClick={goToPreviousMonth}
								className="p-1 rounded hover:bg-accent"
							>
								<ChevronLeft className="w-4 h-4" />
							</button>
							<span className="text-sm font-medium">
								{viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
							</span>
							<button
								onClick={goToNextMonth}
								className="p-1 rounded hover:bg-accent"
							>
								<ChevronRight className="w-4 h-4" />
							</button>
						</div>

						{/* Calendar grid */}
						<CalendarGrid
							viewDate={viewDate}
							selectedDate={currentValue}
							minDate={minDate ? new Date(minDate) : undefined}
							maxDate={maxDate ? new Date(maxDate) : undefined}
							onSelect={handleSelectDate}
						/>

						{/* Time picker for datetime */}
						{includeTime && (
							<div className="border-t mt-3 pt-3">
								<TimePicker
									value={currentValue}
									format={timeFormat}
									onChange={handleTimeChange}
								/>
							</div>
						)}

						{/* Quick actions */}
						<div className="flex gap-2 mt-3 pt-3 border-t">
							<Button
								variant="outline"
								size="sm"
								onClick={() => handleSelectDate(new Date())}
							>
								Today
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => onChange(null)}
							>
								Clear
							</Button>
						</div>
					</div>
				</PopoverContent>
			</Popover>

			{error && (
				<p className="mt-1 text-xs text-destructive">{error}</p>
			)}
		</div>
	);
}

// Calendar grid component
function CalendarGrid({
	viewDate,
	selectedDate,
	minDate,
	maxDate,
	onSelect,
}: {
	viewDate: Date;
	selectedDate: Date | null;
	minDate?: Date;
	maxDate?: Date;
	onSelect: (date: Date) => void;
}) {
	const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

	const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
	const lastDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
	const startDay = firstDayOfMonth.getDay();
	const totalDays = lastDayOfMonth.getDate();

	const cells: (Date | null)[] = [];

	// Padding before first day
	for (let i = 0; i < startDay; i++) {
		cells.push(null);
	}

	// Days of month
	for (let day = 1; day <= totalDays; day++) {
		cells.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
	}

	const isToday = (date: Date) => {
		const today = new Date();
		return date.toDateString() === today.toDateString();
	};

	const isSelected = (date: Date) => {
		return selectedDate && date.toDateString() === selectedDate.toDateString();
	};

	const isDisabled = (date: Date) => {
		if (minDate && date < minDate) return true;
		if (maxDate && date > maxDate) return true;
		return false;
	};

	return (
		<div>
			{/* Day headers */}
			<div className="grid grid-cols-7 gap-1 mb-1">
				{days.map(day => (
					<div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
						{day}
					</div>
				))}
			</div>

			{/* Day cells */}
			<div className="grid grid-cols-7 gap-1">
				{cells.map((date, i) => (
					<div key={i} className="aspect-square">
						{date ? (
							<button
								type="button"
								onClick={() => !isDisabled(date) && onSelect(date)}
								disabled={isDisabled(date)}
								className={cn(
									'w-full h-full rounded-md text-sm transition-colors',
									isSelected(date) && 'bg-primary text-primary-foreground',
									!isSelected(date) && isToday(date) && 'bg-accent',
									!isSelected(date) && !isToday(date) && 'hover:bg-accent',
									isDisabled(date) && 'opacity-30 cursor-not-allowed'
								)}
							>
								{date.getDate()}
							</button>
						) : null}
					</div>
				))}
			</div>
		</div>
	);
}

// Time picker component
function TimePicker({
	value,
	format,
	onChange,
}: {
	value: Date | null;
	format: '12h' | '24h';
	onChange: (hours: number, minutes: number) => void;
}) {
	const hours = value?.getHours() ?? 12;
	const minutes = value?.getMinutes() ?? 0;
	const isPM = hours >= 12;

	const displayHours = format === '12h' ? (hours % 12 || 12) : hours;

	const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		let h = parseInt(e.target.value) || 0;
		if (format === '12h') {
			h = h % 12;
			if (isPM) h += 12;
		}
		h = Math.max(0, Math.min(23, h));
		onChange(h, minutes);
	};

	const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		let m = parseInt(e.target.value) || 0;
		m = Math.max(0, Math.min(59, m));
		onChange(hours, m);
	};

	const toggleAMPM = () => {
		const newHours = isPM ? hours - 12 : hours + 12;
		onChange(newHours, minutes);
	};

	return (
		<div className="flex items-center gap-2">
			<Clock className="w-4 h-4 text-muted-foreground" />
			<Input
				type="number"
				min={format === '12h' ? 1 : 0}
				max={format === '12h' ? 12 : 23}
				value={displayHours.toString().padStart(2, '0')}
				onChange={handleHoursChange}
				className="w-14 text-center"
			/>
			<span className="text-muted-foreground">:</span>
			<Input
				type="number"
				min={0}
				max={59}
				value={minutes.toString().padStart(2, '0')}
				onChange={handleMinutesChange}
				className="w-14 text-center"
			/>
			{format === '12h' && (
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={toggleAMPM}
				>
					{isPM ? 'PM' : 'AM'}
				</Button>
			)}
		</div>
	);
}

// Flexible date parsing (#700)
function parseFlexibleDate(input: string, includeTime: boolean): Date | null {
	const trimmed = input.trim();
	if (!trimmed) return null;

	// Try various formats
	const formats = [
		// ISO
		/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/,
		// US format
		/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: (\d{1,2}):(\d{2}))?/,
		// European format
		/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?: (\d{1,2}):(\d{2}))?/,
		// Natural language
		/^(\d{1,2}) (\w+) (\d{4})(?: (\d{1,2}):(\d{2}))?/i,
	];

	// ISO format
	let match = trimmed.match(formats[0]);
	if (match) {
		const [, y, m, d, h, min] = match;
		return new Date(
			parseInt(y),
			parseInt(m) - 1,
			parseInt(d),
			h ? parseInt(h) : 0,
			min ? parseInt(min) : 0
		);
	}

	// US format (MM/DD/YYYY)
	match = trimmed.match(formats[1]);
	if (match) {
		const [, m, d, y, h, min] = match;
		return new Date(
			parseInt(y),
			parseInt(m) - 1,
			parseInt(d),
			h ? parseInt(h) : 0,
			min ? parseInt(min) : 0
		);
	}

	// European format (DD.MM.YYYY)
	match = trimmed.match(formats[2]);
	if (match) {
		const [, d, m, y, h, min] = match;
		return new Date(
			parseInt(y),
			parseInt(m) - 1,
			parseInt(d),
			h ? parseInt(h) : 0,
			min ? parseInt(min) : 0
		);
	}

	// Natural language (15 January 2024)
	match = trimmed.match(formats[3]);
	if (match) {
		const [, d, monthName, y, h, min] = match;
		const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
		const monthIndex = months.findIndex(m => monthName.toLowerCase().startsWith(m));
		if (monthIndex >= 0) {
			return new Date(
				parseInt(y),
				monthIndex,
				parseInt(d),
				h ? parseInt(h) : 0,
				min ? parseInt(min) : 0
			);
		}
	}

	// Fallback: let Date.parse try
	const parsed = Date.parse(trimmed);
	if (!isNaN(parsed)) {
		return new Date(parsed);
	}

	return null;
}

function formatDateForDisplay(date: Date, includeTime: boolean, timeFormat: '12h' | '24h'): string {
	const dateStr = date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});

	if (!includeTime) return dateStr;

	const timeStr = date.toLocaleTimeString('en-US', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: timeFormat === '12h',
	});

	return `${dateStr} ${timeStr}`;
}
