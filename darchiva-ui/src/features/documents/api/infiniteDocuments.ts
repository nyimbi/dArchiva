// (c) Copyright Datacraft, 2026
import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Document } from '../api';

const PAGE_SIZE = 50;

interface DocumentPage {
	items: Document[];
	total: number;
	page: number;
	page_size: number;
	has_next: boolean;
}

export type DocumentListItem = Document;

export const infiniteDocumentKeys = {
	infinite: (folderId?: string, searchQuery?: string, filters?: Record<string, unknown>) =>
		['documents', 'infinite', folderId, searchQuery, filters] as const,
};

export function useInfiniteDocuments(
	folderId?: string,
	searchQuery?: string,
	filters?: Record<string, unknown>,
) {
	const query = useInfiniteQuery({
		queryKey: infiniteDocumentKeys.infinite(folderId, searchQuery, filters),
		initialPageParam: 1,
		queryFn: async ({ pageParam }) => {
			const params: Record<string, unknown> = {
				page: pageParam,
				page_size: PAGE_SIZE,
			};
			if (folderId) params.parent_id = folderId;
			if (searchQuery) params.search = searchQuery;
			if (filters) Object.assign(params, filters);

			const { data } = await apiClient.get<DocumentPage>('/nodes/', { params });

			// Normalise: if backend does not return has_next, derive it
			const hasNext =
				typeof data.has_next === 'boolean'
					? data.has_next
					: data.total > (data.page ?? (pageParam as number)) * data.page_size;

			return { ...data, has_next: hasNext };
		},
		getNextPageParam: (lastPage, _allPages, lastPageParam) => {
			return lastPage.has_next ? (lastPageParam as number) + 1 : undefined;
		},
	});

	const documents: DocumentListItem[] = query.data
		? query.data.pages.flatMap((p) => p.items.filter((d) => d.ctype === 'document'))
		: [];

	return {
		documents,
		hasNextPage: query.hasNextPage,
		isFetchingNextPage: query.isFetchingNextPage,
		fetchNextPage: query.fetchNextPage,
		isLoading: query.isLoading,
		isError: query.isError,
		error: query.error,
	};
}
