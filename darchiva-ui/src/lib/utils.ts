// (c) Copyright Datacraft, 2026
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2): string {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(dateString: string): string {
	const date = new Date(dateString);
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	}).format(date);
}

export function formatDateTime(dateString: string): string {
	const date = new Date(dateString);
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	}).format(date);
}

export function formatRelativeTime(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffMins < 1) return 'Just now';
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;
	return formatDate(dateString);
}

export function getFileIcon(fileType: string): string {
	const type = fileType.toLowerCase();
	if (type.includes('pdf')) return 'file-text';
	if (type.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type)) return 'image';
	if (type.includes('spreadsheet') || ['xlsx', 'xls', 'csv'].includes(type)) return 'table';
	if (type.includes('document') || ['docx', 'doc'].includes(type)) return 'file-text';
	if (type.includes('presentation') || ['pptx', 'ppt'].includes(type)) return 'presentation';
	return 'file';
}

export function getStatusColor(status: string): string {
	switch (status.toLowerCase()) {
		case 'active':
		case 'completed':
		case 'ready':
		case 'approved':
		case 'open':
			return 'green';
		case 'pending':
		case 'processing':
		case 'in_progress':
			return 'brass';
		case 'failed':
		case 'error':
		case 'rejected':
		case 'cancelled':
			return 'red';
		case 'needs_review':
		case 'draft':
			return 'blue';
		default:
			return 'gray';
	}
}

export function truncate(str: string, length: number): string {
	if (str.length <= length) return str;
	return `${str.slice(0, length)}...`;
}

export function generateId(): string {
	return Math.random().toString(36).substring(2, 15);
}

// Convert snake_case string to camelCase
export function snakeToCamelStr(str: string): string {
	return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Convert camelCase string to snake_case
export function camelToSnakeStr(str: string): string {
	return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

// Recursively convert object keys from snake_case to camelCase
export function snakeToCamel<T>(obj: unknown): T {
	if (Array.isArray(obj)) {
		return obj.map((item) => snakeToCamel(item)) as T;
	}
	if (obj !== null && typeof obj === 'object') {
		return Object.entries(obj as Record<string, unknown>).reduce(
			(acc, [key, value]) => {
				const camelKey = snakeToCamelStr(key);
				acc[camelKey] = snakeToCamel(value);
				return acc;
			},
			{} as Record<string, unknown>
		) as T;
	}
	return obj as T;
}

// Recursively convert object keys from camelCase to snake_case
export function camelToSnake<T>(obj: unknown): T {
	if (Array.isArray(obj)) {
		return obj.map((item) => camelToSnake(item)) as T;
	}
	if (obj !== null && typeof obj === 'object') {
		return Object.entries(obj as Record<string, unknown>).reduce(
			(acc, [key, value]) => {
				const snakeKey = camelToSnakeStr(key);
				acc[snakeKey] = camelToSnake(value);
				return acc;
			},
			{} as Record<string, unknown>
		) as T;
	}
	return obj as T;
}
