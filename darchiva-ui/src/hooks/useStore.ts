// (c) Copyright Datacraft, 2026
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Tenant, TreeNode, PendingTask, NodeItem, ViewerPage } from '@/types';

// Panel types for DualPanel layout
type PanelMode = 'main' | 'secondary';
type PanelContent = 'commander' | 'viewer' | 'search' | 'details' | null;

interface DualPanelState {
	// Panel visibility
	secondaryPanelVisible: boolean;
	setSecondaryPanelVisible: (visible: boolean) => void;
	toggleSecondaryPanel: () => void;

	// Panel widths (percentage)
	mainPanelWidth: number;
	setMainPanelWidth: (width: number) => void;

	// Panel content
	mainPanelContent: PanelContent;
	secondaryPanelContent: PanelContent;
	setMainPanelContent: (content: PanelContent) => void;
	setSecondaryPanelContent: (content: PanelContent) => void;

	// Panel node IDs (for commander)
	mainPanelNodeId: string | null;
	secondaryPanelNodeId: string | null;
	setMainPanelNodeId: (id: string | null) => void;
	setSecondaryPanelNodeId: (id: string | null) => void;

	// Swap panels
	swapPanels: () => void;
}

interface ViewerState {
	// Current document
	currentDocumentId: string | null;
	setCurrentDocumentId: (id: string | null) => void;

	// Pages
	pages: ViewerPage[];
	setPages: (pages: ViewerPage[]) => void;
	currentPageIndex: number;
	setCurrentPageIndex: (index: number) => void;

	// Zoom
	zoom: number;
	setZoom: (zoom: number) => void;
	zoomIn: () => void;
	zoomOut: () => void;
	fitToWidth: boolean;
	setFitToWidth: (fit: boolean) => void;

	// Rotation
	rotation: number;
	setRotation: (degrees: number) => void;
	rotateClockwise: () => void;
	rotateCounterClockwise: () => void;

	// Selection
	selectedPages: Set<number>;
	togglePageSelection: (pageIndex: number) => void;
	selectPageRange: (start: number, end: number) => void;
	clearPageSelection: () => void;

	// Viewer mode
	viewerMode: 'single' | 'continuous' | 'thumbnails';
	setViewerMode: (mode: 'single' | 'continuous' | 'thumbnails') => void;
}

interface NodesState {
	// Current folder
	currentFolderId: string | null;
	setCurrentFolderId: (id: string | null) => void;

	// Folder tree
	folderTree: TreeNode[];
	setFolderTree: (tree: TreeNode[]) => void;

	// Expanded folders
	expandedFolders: Set<string>;
	toggleFolder: (id: string) => void;
	expandFolder: (id: string) => void;
	collapseFolder: (id: string) => void;

	// Current folder contents
	nodes: NodeItem[];
	setNodes: (nodes: NodeItem[]) => void;

	// Selection
	selectedNodeIds: Set<string>;
	toggleNodeSelection: (id: string) => void;
	selectNodes: (ids: string[]) => void;
	clearNodeSelection: () => void;

	// Sorting
	sortBy: 'title' | 'created_at' | 'updated_at' | 'size';
	sortOrder: 'asc' | 'desc';
	setSorting: (by: 'title' | 'created_at' | 'updated_at' | 'size', order: 'asc' | 'desc') => void;

	// View mode
	viewMode: 'list' | 'grid';
	setViewMode: (mode: 'list' | 'grid') => void;
}

interface SearchState {
	// Query
	searchQuery: string;
	setSearchQuery: (query: string) => void;

	// Results
	searchResults: NodeItem[];
	setSearchResults: (results: NodeItem[]) => void;
	isSearching: boolean;
	setIsSearching: (searching: boolean) => void;

	// Filters
	searchFilters: {
		documentTypes: string[];
		tags: string[];
		dateRange: { start: string | null; end: string | null };
		owner: string | null;
	};
	setSearchFilters: (filters: Partial<SearchState['searchFilters']>) => void;
	clearSearchFilters: () => void;
}

interface AppState extends DualPanelState, ViewerState, NodesState, SearchState {
	// Theme
	theme: 'light' | 'dark';
	setTheme: (theme: 'light' | 'dark') => void;
	toggleTheme: () => void;

	// User
	user: User | null;
	setUser: (user: User | null) => void;

	// Tenant
	tenant: Tenant | null;
	setTenant: (tenant: Tenant | null) => void;

	// Sidebar
	sidebarCollapsed: boolean;
	setSidebarCollapsed: (collapsed: boolean) => void;
	toggleSidebar: () => void;

	// Active navigation
	activeNav: string;
	setActiveNav: (nav: string) => void;

	// Pending tasks
	pendingTasks: PendingTask[];
	setPendingTasks: (tasks: PendingTask[]) => void;

	// Modals
	activeModal: string | null;
	modalData: unknown;
	openModal: (modal: string, data?: unknown) => void;
	closeModal: () => void;
}

export const useStore = create<AppState>()(
	persist(
		(set) => ({
			// =====================
			// Theme
			// =====================
			theme: 'dark',
			setTheme: (theme) => {
				document.documentElement.classList.toggle('dark', theme === 'dark');
				localStorage.setItem('darchiva-theme', theme);
				set({ theme });
			},
			toggleTheme: () =>
				set((state) => {
					const newTheme = state.theme === 'dark' ? 'light' : 'dark';
					document.documentElement.classList.toggle('dark', newTheme === 'dark');
					localStorage.setItem('darchiva-theme', newTheme);
					return { theme: newTheme };
				}),

			// =====================
			// User
			// =====================
			user: null,
			setUser: (user) => set({ user }),

			// =====================
			// Tenant
			// =====================
			tenant: null,
			setTenant: (tenant) => set({ tenant }),

			// =====================
			// Sidebar
			// =====================
			sidebarCollapsed: false,
			setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
			toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

			// =====================
			// Active navigation
			// =====================
			activeNav: 'dashboard',
			setActiveNav: (activeNav) => set({ activeNav }),

			// =====================
			// Pending tasks
			// =====================
			pendingTasks: [],
			setPendingTasks: (pendingTasks) => set({ pendingTasks }),

			// =====================
			// Modals
			// =====================
			activeModal: null,
			modalData: null,
			openModal: (activeModal, modalData = null) => set({ activeModal, modalData }),
			closeModal: () => set({ activeModal: null, modalData: null }),

			// =====================
			// DualPanel State
			// =====================
			secondaryPanelVisible: false,
			setSecondaryPanelVisible: (visible) => set({ secondaryPanelVisible: visible }),
			toggleSecondaryPanel: () => set((state) => ({ secondaryPanelVisible: !state.secondaryPanelVisible })),

			mainPanelWidth: 50,
			setMainPanelWidth: (width) => set({ mainPanelWidth: Math.max(20, Math.min(80, width)) }),

			mainPanelContent: 'commander',
			secondaryPanelContent: null,
			setMainPanelContent: (content) => set({ mainPanelContent: content }),
			setSecondaryPanelContent: (content) => set({ secondaryPanelContent: content }),

			mainPanelNodeId: null,
			secondaryPanelNodeId: null,
			setMainPanelNodeId: (id) => set({ mainPanelNodeId: id }),
			setSecondaryPanelNodeId: (id) => set({ secondaryPanelNodeId: id }),

			swapPanels: () =>
				set((state) => ({
					mainPanelContent: state.secondaryPanelContent,
					secondaryPanelContent: state.mainPanelContent,
					mainPanelNodeId: state.secondaryPanelNodeId,
					secondaryPanelNodeId: state.mainPanelNodeId,
				})),

			// =====================
			// Viewer State
			// =====================
			currentDocumentId: null,
			setCurrentDocumentId: (id) => set({ currentDocumentId: id }),

			pages: [],
			setPages: (pages) => set({ pages }),
			currentPageIndex: 0,
			setCurrentPageIndex: (index) => set({ currentPageIndex: index }),

			zoom: 100,
			setZoom: (zoom) => set({ zoom: Math.max(25, Math.min(400, zoom)) }),
			zoomIn: () => set((state) => ({ zoom: Math.min(400, state.zoom + 25) })),
			zoomOut: () => set((state) => ({ zoom: Math.max(25, state.zoom - 25) })),
			fitToWidth: true,
			setFitToWidth: (fit) => set({ fitToWidth: fit }),

			rotation: 0,
			setRotation: (degrees) => set({ rotation: degrees % 360 }),
			rotateClockwise: () => set((state) => ({ rotation: (state.rotation + 90) % 360 })),
			rotateCounterClockwise: () => set((state) => ({ rotation: (state.rotation - 90 + 360) % 360 })),

			selectedPages: new Set(),
			togglePageSelection: (pageIndex) =>
				set((state) => {
					const newSelected = new Set(state.selectedPages);
					if (newSelected.has(pageIndex)) {
						newSelected.delete(pageIndex);
					} else {
						newSelected.add(pageIndex);
					}
					return { selectedPages: newSelected };
				}),
			selectPageRange: (start, end) =>
				set(() => {
					const newSelected = new Set<number>();
					for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
						newSelected.add(i);
					}
					return { selectedPages: newSelected };
				}),
			clearPageSelection: () => set({ selectedPages: new Set() }),

			viewerMode: 'single',
			setViewerMode: (mode) => set({ viewerMode: mode }),

			// =====================
			// Nodes State
			// =====================
			currentFolderId: null,
			setCurrentFolderId: (id) => set({ currentFolderId: id }),

			folderTree: [],
			setFolderTree: (folderTree) => set({ folderTree }),

			expandedFolders: new Set(),
			toggleFolder: (id) =>
				set((state) => {
					const newExpanded = new Set(state.expandedFolders);
					if (newExpanded.has(id)) {
						newExpanded.delete(id);
					} else {
						newExpanded.add(id);
					}
					return { expandedFolders: newExpanded };
				}),
			expandFolder: (id) =>
				set((state) => {
					const newExpanded = new Set(state.expandedFolders);
					newExpanded.add(id);
					return { expandedFolders: newExpanded };
				}),
			collapseFolder: (id) =>
				set((state) => {
					const newExpanded = new Set(state.expandedFolders);
					newExpanded.delete(id);
					return { expandedFolders: newExpanded };
				}),

			nodes: [],
			setNodes: (nodes) => set({ nodes }),

			selectedNodeIds: new Set(),
			toggleNodeSelection: (id) =>
				set((state) => {
					const newSelected = new Set(state.selectedNodeIds);
					if (newSelected.has(id)) {
						newSelected.delete(id);
					} else {
						newSelected.add(id);
					}
					return { selectedNodeIds: newSelected };
				}),
			selectNodes: (ids) => set({ selectedNodeIds: new Set(ids) }),
			clearNodeSelection: () => set({ selectedNodeIds: new Set() }),

			sortBy: 'title',
			sortOrder: 'asc',
			setSorting: (by, order) => set({ sortBy: by, sortOrder: order }),

			viewMode: 'list',
			setViewMode: (mode) => set({ viewMode: mode }),

			// =====================
			// Search State
			// =====================
			searchQuery: '',
			setSearchQuery: (query) => set({ searchQuery: query }),

			searchResults: [],
			setSearchResults: (results) => set({ searchResults: results }),
			isSearching: false,
			setIsSearching: (searching) => set({ isSearching: searching }),

			searchFilters: {
				documentTypes: [],
				tags: [],
				dateRange: { start: null, end: null },
				owner: null,
			},
			setSearchFilters: (filters) =>
				set((state) => ({
					searchFilters: { ...state.searchFilters, ...filters },
				})),
			clearSearchFilters: () =>
				set({
					searchFilters: {
						documentTypes: [],
						tags: [],
						dateRange: { start: null, end: null },
						owner: null,
					},
				}),
		}),
		{
			name: 'darchiva-storage',
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({
				theme: state.theme,
				sidebarCollapsed: state.sidebarCollapsed,
				viewMode: state.viewMode,
				sortBy: state.sortBy,
				sortOrder: state.sortOrder,
				mainPanelWidth: state.mainPanelWidth,
			}),
		}
	)
);
