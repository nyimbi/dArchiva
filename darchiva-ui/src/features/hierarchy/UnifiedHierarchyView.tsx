// (c) Copyright Datacraft, 2026
/**
 * Unified Hierarchy View - Master-detail navigation for
 * Portfolio > Case > Bundle > Document hierarchy.
 */
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
	getPortfolios,
	getCases,
	getBundles,
	getDocuments,
	type AnyHierarchyNode,
	type Portfolio,
	type Case,
	type Bundle,
	type Document,
} from './api';
import styles from './UnifiedHierarchyView.module.css';

type NodeType = 'portfolio' | 'case' | 'bundle' | 'document';

interface BreadcrumbItem {
	id: string;
	name: string;
	type: NodeType;
}

export function UnifiedHierarchyView() {
	const [selectedNode, setSelectedNode] = useState<AnyHierarchyNode | null>(null);
	const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
	const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
	const [searchQuery, setSearchQuery] = useState('');

	const { data: portfolios, isLoading } = useQuery({
		queryKey: ['portfolios'],
		queryFn: () => getPortfolios(),
	});

	const handleSelectNode = useCallback((node: AnyHierarchyNode, parents: BreadcrumbItem[] = []) => {
		setSelectedNode(node);
		setBreadcrumbs([...parents, { id: node.id, name: node.name, type: node.type }]);
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
		const item = breadcrumbs[index];
		setBreadcrumbs(breadcrumbs.slice(0, index + 1));
		// Would re-fetch and select the node
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
					) : (
						portfolios?.items.map(portfolio => (
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
							/>
						))
					)}
				</div>
			</div>

			<div className={styles.detailPanel}>
				{breadcrumbs.length > 0 && (
					<div className={styles.breadcrumbBar}>
						{breadcrumbs.map((item, idx) => (
							<>
								{idx > 0 && <span key={`sep-${idx}`} className={styles.breadcrumbSeparator}>›</span>}
								<span
									key={item.id}
									className={`${styles.breadcrumbItem} ${idx === breadcrumbs.length - 1 ? styles.active : ''}`}
									onClick={() => idx < breadcrumbs.length - 1 && handleBreadcrumbClick(idx)}
								>
									{item.name}
								</span>
							</>
						))}
					</div>
				)}

				{selectedNode ? (
					<DetailPanel node={selectedNode} onNavigate={handleSelectNode} />
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
}

function TreeNode({ node, isExpanded, isSelected, onSelect, onToggleExpand, expandedNodes, selectedId, parents }: TreeNodeProps) {
	const hasChildren = node.children_count > 0;
	const currentParents = [...parents, { id: node.id, name: node.name, type: node.type }];

	const { data: children } = useQuery({
		queryKey: ['children', node.type, node.id],
		queryFn: async () => {
			if (node.type === 'portfolio') return (await getCases(node.id)).items;
			if (node.type === 'case') return (await getBundles(node.id)).items;
			if (node.type === 'bundle') return (await getDocuments(node.id)).items;
			return [];
		},
		enabled: isExpanded && hasChildren,
	});

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
				<span className={styles.nodeName}>{node.name}</span>
				{hasChildren && <span className={styles.nodeCount}>{node.children_count}</span>}
			</div>
			{isExpanded && children && (
				<div className={styles.treeChildren}>
					{children.map(child => (
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
	onNavigate: (node: AnyHierarchyNode, parents: BreadcrumbItem[]) => void;
}

function DetailPanel({ node, onNavigate }: DetailPanelProps) {
	const { data: children, isLoading } = useQuery({
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
					<h2>{node.name}</h2>
					<span className={`${styles.detailTypeBadge} ${styles[node.type]}`}>{node.type}</span>
				</div>
				<div className={styles.detailActions}>
					<button className={styles.actionBtn}>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
							<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
						</svg>
						Edit
					</button>
					<button className={`${styles.actionBtn} ${styles.primary}`}>
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<line x1="12" y1="5" x2="12" y2="19" />
							<line x1="5" y1="12" x2="19" y2="12" />
						</svg>
						Add {childType[node.type]}
					</button>
				</div>
			</div>

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
						) : children?.length ? (
							<div className={styles.childrenGrid}>
								{children.map(child => (
									<div
										key={child.id}
										className={styles.childCard}
										onClick={() => onNavigate(child, [])}
									>
										<div className={`${styles.childIcon} ${styles[child.type]}`}>
											{childIcons[child.type]}
										</div>
										<div className={styles.childInfo}>
											<div className={styles.childName}>{child.name}</div>
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
