// (c) Copyright Datacraft, 2026
/**
 * Unified Hierarchy View - Master-detail navigation for
 * Portfolio > Case > Bundle > Document hierarchy.
 */
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { apiClient } from '@/lib/api-client';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import { Fragment,useCallback,useMemo,useState,type FormEvent } from 'react';
import { toast } from 'sonner';
import {
  getBundles,
  getCases,
  getDocuments,
  getPortfolios,
  type AnyHierarchyNode,
  type Case,
  type Document,
  type Portfolio,
} from './api';
import { useHierarchySearch } from './hooks';
import styles from './UnifiedHierarchyView.module.css';

type NodeType = 'portfolio' | 'case' | 'bundle' | 'document';

interface BreadcrumbItem {
	id: string;
	name: string;
	type: NodeType;
	node: AnyHierarchyNode;
}

type NodeApiResponse = Partial<AnyHierarchyNode> & {
	title?: string;
	createdAt?: string;
	updatedAt?: string;
	childrenCount?: number;
	caseNumber?: string;
	pageCount?: number;
};

function getNodeLabel(node: { name?: string; title?: string }) {
	return node.name ?? node.title ?? '';
}

function matchesSearch(node: AnyHierarchyNode, query: string) {
	if (!query) return true;
	return getNodeLabel(node).toLowerCase().includes(query);
}

function toBreadcrumbItem(node: AnyHierarchyNode): BreadcrumbItem {
	return {
		id: node.id,
		name: getNodeLabel(node),
		type: node.type,
		node,
	};
}

function normalizeNode(data: NodeApiResponse, type: NodeType, fallback?: AnyHierarchyNode): AnyHierarchyNode {
	const now = new Date().toISOString();
	return {
		...fallback,
		...data,
		id: String(data.id ?? fallback?.id ?? ''),
		name: getNodeLabel(data) || getNodeLabel(fallback ?? data),
		type,
		children_count: data.children_count ?? data.childrenCount ?? fallback?.children_count ?? 0,
		created_at: data.created_at ?? data.createdAt ?? fallback?.created_at ?? now,
		updated_at: data.updated_at ?? data.updatedAt ?? fallback?.updated_at ?? now,
	} as AnyHierarchyNode;
}

function updateNodeName(node: AnyHierarchyNode, name: string) {
	switch (node.type) {
		case 'portfolio':
			return apiClient.patch<NodeApiResponse>(`/portfolios/${node.id}`, { name });
		case 'case':
			return apiClient.patch<NodeApiResponse>(`/cases/${node.id}`, { title: name });
		case 'bundle':
			return apiClient.patch<NodeApiResponse>(`/bundles/${node.id}`, { name });
		case 'document':
			return apiClient.patch<NodeApiResponse>(`/nodes/${node.id}`, { title: name });
	}
}

function createChildNode(parent: AnyHierarchyNode, type: NodeType, name: string) {
	switch (type) {
		case 'portfolio':
			return apiClient.post<NodeApiResponse>('/portfolios/', { name });
		case 'case':
			return apiClient.post<NodeApiResponse>('/cases/', {
				title: name,
				caseNumber: `CASE-${Date.now()}`,
				portfolioId: parent.id,
			});
		case 'bundle':
			return apiClient.post<NodeApiResponse>('/bundles/', { name, caseId: parent.id });
		case 'document':
			return apiClient.post<NodeApiResponse>('/nodes/', {
				title: name,
				ctype: 'folder',
				parentId: parent.id,
			});
	}
}

export function UnifiedHierarchyView() {
	const [selectedNode, setSelectedNode] = useState<AnyHierarchyNode | null>(null);
	const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
	const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
	const [searchQuery, setSearchQuery] = useState('');
	const normalizedSearch = searchQuery.trim().toLowerCase();

	const { data: portfolios, isLoading, isError, refetch } = useQuery({
		queryKey: ['portfolios'],
		queryFn: () => getPortfolios(),
	});
	const { data: searchResults } = useHierarchySearch(searchQuery.trim());

	const visibleRootNodes = useMemo(() => {
		const roots = normalizedSearch && searchResults ? searchResults : portfolios?.items ?? [];
		return roots.filter(node => matchesSearch(node, normalizedSearch));
	}, [normalizedSearch, portfolios?.items, searchResults]);

	const handleSelectNode = useCallback((node: AnyHierarchyNode, parents: BreadcrumbItem[] = []) => {
		setSelectedNode(node);
		setBreadcrumbs([...parents, toBreadcrumbItem(node)]);
	}, []);

	const handleNodeUpdated = useCallback((node: AnyHierarchyNode) => {
		setSelectedNode(node);
		setBreadcrumbs(prev => prev.map(item => (
			item.id === node.id ? toBreadcrumbItem(node) : item
		)));
	}, []);

	const handleToggleExpand = useCallback((id: string) => {
		setExpandedNodes(prev => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	const handleBreadcrumbClick = (index: number) => {
		const nextBreadcrumbs = breadcrumbs.slice(0, index + 1);
		const selectedBreadcrumb = nextBreadcrumbs[index];
		setBreadcrumbs(nextBreadcrumbs);
		setSelectedNode(selectedBreadcrumb.node);
	};

	return (
		<div className={styles.container}>
			<div className={styles.navPanel}>
				<div className={styles.navHeader}>
					<h3 className={styles.navTitle}>Records</h3>
				</div>

				<div className={styles.searchBox}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
						<circle cx="11" cy="11" r="8" />
						<line x1="21" y1="21" x2="16.65" y2="16.65" />
					</svg>
					<input
						type="text"
						placeholder="Search records..."
						value={searchQuery}
						onChange={e => setSearchQuery(e.target.value)}
					/>
				</div>

				<div className={styles.tree}>
					{isLoading ? (
						<div className={styles.loading}>
							<span className={styles.spinner} />
							Loading...
						</div>
					) : isError ? (
						<div className={styles.errorState}>
							<p>Could not load records.</p>
							<button type="button" onClick={() => refetch()}>
								Retry
							</button>
						</div>
					) : visibleRootNodes.length ? (
						visibleRootNodes.map(portfolio => (
							<TreeNode
								key={portfolio.id}
								node={portfolio}
								isExpanded={expandedNodes.has(portfolio.id)}
								isSelected={selectedNode?.id === portfolio.id}
								onSelect={handleSelectNode}
								onToggleExpand={handleToggleExpand}
								expandedNodes={expandedNodes}
								selectedId={selectedNode?.id}
								parents={[]}
								searchQuery={normalizedSearch}
							/>
						))
					) : (
						<div className={styles.emptyState}>
							<p>No matching records</p>
						</div>
					)}
				</div>
			</div>

			<div className={styles.detailPanel}>
				{breadcrumbs.length > 0 && (
					<div className={styles.breadcrumbBar}>
						{breadcrumbs.map((item, idx) => (
							<Fragment key={item.id}>
								{idx > 0 && <span key={`sep-${idx}`} className={styles.breadcrumbSeparator}>›</span>}
								<span
									className={`${styles.breadcrumbItem} ${idx === breadcrumbs.length - 1 ? styles.active : ''}`}
									onClick={() => idx < breadcrumbs.length - 1 && handleBreadcrumbClick(idx)}
								>
									{item.name}
								</span>
							</Fragment>
						))}
					</div>
				)}

				{selectedNode ? (
					<DetailPanel
						node={selectedNode}
						parentBreadcrumbs={breadcrumbs.slice(0, -1)}
						onNavigate={handleSelectNode}
						onNodeUpdated={handleNodeUpdated}
					/>
				) : (
					<div className={styles.emptyState}>
						<svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
							<path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
						</svg>
						<p>Select a record to view details</p>
					</div>
				)}
			</div>
		</div>
	);
}

// Tree Node Component
interface TreeNodeProps {
	node: AnyHierarchyNode;
	isExpanded: boolean;
	isSelected: boolean;
	onSelect: (node: AnyHierarchyNode, parents: BreadcrumbItem[]) => void;
	onToggleExpand: (id: string) => void;
	expandedNodes: Set<string>;
	selectedId?: string;
	parents: BreadcrumbItem[];
	searchQuery: string;
}

function TreeNode({ node, isExpanded, isSelected, onSelect, onToggleExpand, expandedNodes, selectedId, parents, searchQuery }: TreeNodeProps) {
	const hasChildren = node.children_count > 0;
	const currentParents = [...parents, toBreadcrumbItem(node)];

	const { data: children, isLoading, isError, refetch } = useQuery({
		queryKey: ['children', node.type, node.id],
		queryFn: async () => {
			if (node.type === 'portfolio') return (await getCases(node.id)).items;
			if (node.type === 'case') return (await getBundles(node.id)).items;
			if (node.type === 'bundle') return (await getDocuments(node.id)).items;
			return [];
		},
		enabled: isExpanded && hasChildren,
	});
	const visibleChildren = useMemo(
		() => children?.filter(child => matchesSearch(child, searchQuery)) ?? [],
		[children, searchQuery]
	);

	const icons: Record<NodeType, JSX.Element> = {
		portfolio: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" /></svg>,
		case: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
		bundle: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>,
		document: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
	};

	return (
		<div className={styles.treeNode}>
			<div
				className={`${styles.treeNodeContent} ${isSelected ? styles.selected : ''}`}
				onClick={() => onSelect(node, parents)}
			>
				<span
					className={`${styles.expandIcon} ${isExpanded ? styles.expanded : ''} ${!hasChildren ? styles.placeholder : ''}`}
					onClick={e => { e.stopPropagation(); if (hasChildren) onToggleExpand(node.id); }}
				>
					{hasChildren && (
						<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<polyline points="9 18 15 12 9 6" />
						</svg>
					)}
				</span>
				<span className={`${styles.nodeIcon} ${styles[node.type]}`}>{icons[node.type]}</span>
				<span className={styles.nodeName}>{getNodeLabel(node)}</span>
				{hasChildren && <span className={styles.nodeCount}>{node.children_count}</span>}
			</div>
			{isExpanded && isLoading && (
				<div className={styles.treeChildrenStatus}>Loading children...</div>
			)}
			{isExpanded && isError && (
				<div className={styles.treeChildrenStatus}>
					<span>Could not load children.</span>
					<button type="button" onClick={() => refetch()}>
						Retry
					</button>
				</div>
			)}
			{isExpanded && children && (
				<div className={styles.treeChildren}>
					{visibleChildren.map(child => (
						<TreeNode
							key={child.id}
							node={child}
							isExpanded={expandedNodes.has(child.id)}
							isSelected={selectedId === child.id}
							onSelect={onSelect}
							onToggleExpand={onToggleExpand}
							expandedNodes={expandedNodes}
							selectedId={selectedId}
							parents={currentParents}
							searchQuery={searchQuery}
						/>
					))}
				</div>
			)}
		</div>
	);
}

// Detail Panel Component
interface DetailPanelProps {
	node: AnyHierarchyNode;
	parentBreadcrumbs: BreadcrumbItem[];
	onNavigate: (node: AnyHierarchyNode, parents: BreadcrumbItem[]) => void;
	onNodeUpdated: (node: AnyHierarchyNode) => void;
}

function DetailPanel({ node, parentBreadcrumbs, onNavigate, onNodeUpdated }: DetailPanelProps) {
	const queryClient = useQueryClient();
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [isAddOpen, setIsAddOpen] = useState(false);
	const [editName, setEditName] = useState(getNodeLabel(node));
	const [childName, setChildName] = useState('');
	const { data: children, isLoading, isError, refetch } = useQuery({
		queryKey: ['children', node.type, node.id],
		queryFn: async () => {
			if (node.type === 'portfolio') return (await getCases(node.id)).items;
			if (node.type === 'case') return (await getBundles(node.id)).items;
			if (node.type === 'bundle') return (await getDocuments(node.id)).items;
			return [];
		},
		enabled: node.type !== 'document',
	});

	const childType: Record<NodeType, NodeType | null> = {
		portfolio: 'case',
		case: 'bundle',
		bundle: 'document',
		document: null,
	};
	const nextChildType = childType[node.type];
	const currentBreadcrumbs = [...parentBreadcrumbs, toBreadcrumbItem(node)];

	const invalidateHierarchy = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ['portfolios'] });
		queryClient.invalidateQueries({ queryKey: ['children'] });
		queryClient.invalidateQueries({ queryKey: ['hierarchy-search'] });
		queryClient.invalidateQueries({ queryKey: ['cases'] });
		queryClient.invalidateQueries({ queryKey: ['bundles'] });
		queryClient.invalidateQueries({ queryKey: ['documents'] });
	}, [queryClient]);

	const updateMutation = useMutation({
		mutationFn: async (name: string) => {
			const { data } = await updateNodeName(node, name);
			return normalizeNode(data, node.type, node);
		},
		onSuccess: updatedNode => {
			onNodeUpdated(updatedNode);
			invalidateHierarchy();
			setIsEditOpen(false);
		},
		onError: () => {
			toast.error('Failed to update record');
		},
	});

	const createMutation = useMutation({
		mutationFn: async ({ name, type }: { name: string; type: NodeType }) => {
			const { data } = await createChildNode(node, type, name);
			return normalizeNode(data, type);
		},
		onSuccess: createdNode => {
			invalidateHierarchy();
			setIsAddOpen(false);
			setChildName('');
			onNavigate(createdNode, currentBreadcrumbs);
		},
		onError: () => {
			toast.error('Failed to add child record');
		},
	});

	const openEditDialog = () => {
		setEditName(getNodeLabel(node));
		setIsEditOpen(true);
	};

	const openAddDialog = () => {
		setChildName('');
		setIsAddOpen(true);
	};

	const handleEditSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const name = editName.trim();
		if (!name) return;
		updateMutation.mutate(name);
	};

	const handleAddSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const name = childName.trim();
		if (!name || !nextChildType) return;
		createMutation.mutate({ name, type: nextChildType });
	};

	const childIcons: Record<NodeType, JSX.Element> = {
		portfolio: <></>,
		case: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
		bundle: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>,
		document: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
	};

	return (
		<>
			<div className={styles.detailHeader}>
				<div className={styles.detailTitle}>
					<h2>{getNodeLabel(node)}</h2>
					<span className={`${styles.detailTypeBadge} ${styles[node.type]}`}>{node.type}</span>
				</div>
				<div className={styles.detailActions}>
					<button type="button" className={styles.actionBtn} onClick={openEditDialog}>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
							<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
						</svg>
						Edit
					</button>
					{nextChildType && (
						<button type="button" className={`${styles.actionBtn} ${styles.primary}`} onClick={openAddDialog}>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<line x1="12" y1="5" x2="12" y2="19" />
								<line x1="5" y1="12" x2="19" y2="12" />
							</svg>
							Add {nextChildType}
						</button>
					)}
				</div>
			</div>

			<Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
				<DialogContent className={styles.dialogContent}>
					<form onSubmit={handleEditSubmit}>
						<DialogHeader>
							<DialogTitle>Edit record</DialogTitle>
							<DialogDescription>Update the selected record name.</DialogDescription>
						</DialogHeader>
						<div className={styles.dialogForm}>
							<label className={styles.fieldLabel} htmlFor="hierarchy-edit-name">Name</label>
							<input
								id="hierarchy-edit-name"
								className={styles.textInput}
								value={editName}
								onChange={event => setEditName(event.target.value)}
								autoFocus
							/>
						</div>
						<DialogFooter>
							<button type="button" className={styles.secondaryBtn} onClick={() => setIsEditOpen(false)}>
								Cancel
							</button>
							<button type="submit" className={`${styles.actionBtn} ${styles.primary}`} disabled={updateMutation.isPending}>
								{updateMutation.isPending ? 'Saving...' : 'Save'}
							</button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			{nextChildType && (
				<Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
					<DialogContent className={styles.dialogContent}>
						<form onSubmit={handleAddSubmit}>
							<DialogHeader>
								<DialogTitle>Add child record</DialogTitle>
								<DialogDescription>Create a new child under this record.</DialogDescription>
							</DialogHeader>
							<div className={styles.dialogForm}>
								<label className={styles.fieldLabel} htmlFor="hierarchy-child-name">Name</label>
								<input
									id="hierarchy-child-name"
									className={styles.textInput}
									value={childName}
									onChange={event => setChildName(event.target.value)}
									autoFocus
								/>
								<label className={styles.fieldLabel} htmlFor="hierarchy-child-type">Type</label>
								<select id="hierarchy-child-type" className={styles.textInput} value={nextChildType} disabled>
									<option value={nextChildType}>{nextChildType}</option>
								</select>
							</div>
							<DialogFooter>
								<button type="button" className={styles.secondaryBtn} onClick={() => setIsAddOpen(false)}>
									Cancel
								</button>
								<button type="submit" className={`${styles.actionBtn} ${styles.primary}`} disabled={createMutation.isPending}>
									{createMutation.isPending ? 'Adding...' : 'Add'}
								</button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			)}

			<div className={styles.detailContent}>
				<div className={styles.detailSection}>
					<h4 className={styles.sectionTitle}>Properties</h4>
					<div className={styles.propsGrid}>
						<div className={styles.propItem}>
							<div className={styles.propLabel}>Created</div>
							<div className={styles.propValue}>{new Date(node.created_at).toLocaleDateString()}</div>
						</div>
						<div className={styles.propItem}>
							<div className={styles.propLabel}>Updated</div>
							<div className={styles.propValue}>{new Date(node.updated_at).toLocaleDateString()}</div>
						</div>
						{'status' in node && (
							<div className={styles.propItem}>
								<div className={styles.propLabel}>Status</div>
								<div className={styles.propValue}>{(node as Portfolio | Case).status}</div>
							</div>
						)}
						{node.type === 'document' && (
							<>
								<div className={styles.propItem}>
									<div className={styles.propLabel}>File Type</div>
									<div className={styles.propValue}>{(node as Document).file_type}</div>
								</div>
								<div className={styles.propItem}>
									<div className={styles.propLabel}>Pages</div>
									<div className={styles.propValue}>{(node as Document).page_count}</div>
								</div>
							</>
						)}
					</div>
				</div>

				{node.type !== 'document' && (
					<div className={styles.detailSection}>
						<h4 className={styles.sectionTitle}>
							{childType[node.type]}s ({children?.length || 0})
						</h4>
						{isLoading ? (
							<div className={styles.loading}><span className={styles.spinner} />Loading...</div>
						) : isError ? (
							<div className={styles.errorState}>
								<p>Could not load related {childType[node.type]}s.</p>
								<button type="button" onClick={() => refetch()}>
									Retry
								</button>
							</div>
						) : children?.length ? (
							<div className={styles.childrenGrid}>
								{children.map(child => (
									<div
										key={child.id}
										className={styles.childCard}
										onClick={() => onNavigate(child, currentBreadcrumbs)}
									>
										<div className={`${styles.childIcon} ${styles[child.type]}`}>
											{childIcons[child.type]}
										</div>
										<div className={styles.childInfo}>
											<div className={styles.childName}>{getNodeLabel(child)}</div>
											<div className={styles.childMeta}>
												{child.children_count} items
											</div>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className={styles.emptyState}>
								<p>No {childType[node.type]}s yet</p>
							</div>
						)}
					</div>
				)}

				{node.type === 'document' && (
					<div className={styles.detailSection}>
						<h4 className={styles.sectionTitle}>Preview</h4>
						<div className={styles.documentPreview}>
							Document preview would render here
						</div>
					</div>
				)}
			</div>
		</>
	);
}

export default UnifiedHierarchyView;
