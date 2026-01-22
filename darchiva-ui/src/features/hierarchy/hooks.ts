// (c) Copyright Datacraft, 2026
import { useQuery } from '@tanstack/react-query';
import {
	getPortfolios,
	getPortfolio,
	getCases,
	getCase,
	getBundles,
	getBundle,
	getDocuments,
	getDocument,
	searchHierarchy,
	type AnyHierarchyNode,
} from './api';

export function usePortfolios() {
	return useQuery({
		queryKey: ['portfolios'],
		queryFn: () => getPortfolios(),
	});
}

export function usePortfolio(id: string | null) {
	return useQuery({
		queryKey: ['portfolio', id],
		queryFn: () => getPortfolio(id!),
		enabled: !!id,
	});
}

export function useCases(portfolioId: string | null) {
	return useQuery({
		queryKey: ['cases', portfolioId],
		queryFn: () => getCases(portfolioId!),
		enabled: !!portfolioId,
	});
}

export function useCase(id: string | null) {
	return useQuery({
		queryKey: ['case', id],
		queryFn: () => getCase(id!),
		enabled: !!id,
	});
}

export function useBundles(caseId: string | null) {
	return useQuery({
		queryKey: ['bundles', caseId],
		queryFn: () => getBundles(caseId!),
		enabled: !!caseId,
	});
}

export function useBundle(id: string | null) {
	return useQuery({
		queryKey: ['bundle', id],
		queryFn: () => getBundle(id!),
		enabled: !!id,
	});
}

export function useDocuments(bundleId: string | null) {
	return useQuery({
		queryKey: ['documents', bundleId],
		queryFn: () => getDocuments(bundleId!),
		enabled: !!bundleId,
	});
}

export function useDocument(id: string | null) {
	return useQuery({
		queryKey: ['document', id],
		queryFn: () => getDocument(id!),
		enabled: !!id,
	});
}

export function useHierarchySearch(query: string) {
	return useQuery({
		queryKey: ['hierarchy-search', query],
		queryFn: () => searchHierarchy(query),
		enabled: query.length >= 2,
	});
}

export function useNodeDetails(node: AnyHierarchyNode | null) {
	const portfolioQuery = usePortfolio(node?.type === 'portfolio' ? node.id : null);
	const caseQuery = useCase(node?.type === 'case' ? node.id : null);
	const bundleQuery = useBundle(node?.type === 'bundle' ? node.id : null);
	const documentQuery = useDocument(node?.type === 'document' ? node.id : null);

	if (!node) return { data: null, isLoading: false };

	switch (node.type) {
		case 'portfolio': return portfolioQuery;
		case 'case': return caseQuery;
		case 'bundle': return bundleQuery;
		case 'document': return documentQuery;
		default: return { data: null, isLoading: false };
	}
}
