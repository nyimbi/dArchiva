// Copy Button - Copy text to clipboard with feedback
import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
	text: string;
	className?: string;
	size?: 'sm' | 'md' | 'lg';
	variant?: 'ghost' | 'outline' | 'filled';
	label?: string;
	successLabel?: string;
	onCopy?: () => void;
}

const SIZES = {
	sm: 'p-1 [&_svg]:w-3 [&_svg]:h-3',
	md: 'p-1.5 [&_svg]:w-4 [&_svg]:h-4',
	lg: 'p-2 [&_svg]:w-5 [&_svg]:h-5',
};

const VARIANTS = {
	ghost: 'hover:bg-black/5 dark:hover:bg-white/5',
	outline: 'border border-current/20 hover:border-current/40',
	filled: 'bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10',
};

export function CopyButton({
	text,
	className,
	size = 'md',
	variant = 'ghost',
	label,
	successLabel = 'Copied!',
	onCopy,
}: Props) {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			onCopy?.();
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}, [text, onCopy]);

	return (
		<button
			onClick={handleCopy}
			className={cn(
				'inline-flex items-center gap-1.5 rounded-md transition-all duration-150',
				'text-[var(--copy-muted)] hover:text-[var(--copy-text)]',
				copied && 'text-[var(--copy-success)]',
				SIZES[size],
				VARIANTS[variant],
				className
			)}
			title={copied ? successLabel : `Copy ${label || 'to clipboard'}`}
		>
			{copied ? <Check /> : <Copy />}
			{label && (
				<span className="text-sm font-medium">
					{copied ? successLabel : label}
				</span>
			)}
		</button>
	);
}

// Inline variant for code blocks
export function CopyInline({ text, className }: { text: string; className?: string }) {
	return (
		<span className={cn('inline-flex items-center gap-1', className)}>
			<code className="copy-code">{text}</code>
			<CopyButton text={text} size="sm" />
		</span>
	);
}
