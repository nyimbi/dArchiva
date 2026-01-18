// (c) Copyright Datacraft, 2026
import { create } from 'zustand';
import type { User, Tenant, TreeNode, PendingTask } from '@/types';

interface AppState {
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

	// Document browser
	selectedFolderId: string | null;
	setSelectedFolderId: (id: string | null) => void;
	folderTree: TreeNode[];
	setFolderTree: (tree: TreeNode[]) => void;
	expandedFolders: Set<string>;
	toggleFolder: (id: string) => void;

	// Selected items
	selectedDocuments: Set<string>;
	toggleDocumentSelection: (id: string) => void;
	clearSelection: () => void;
	selectAll: (ids: string[]) => void;

	// Pending tasks
	pendingTasks: PendingTask[];
	setPendingTasks: (tasks: PendingTask[]) => void;

	// Modals
	activeModal: string | null;
	modalData: unknown;
	openModal: (modal: string, data?: unknown) => void;
	closeModal: () => void;
}

export const useStore = create<AppState>((set) => ({
	// Theme
	theme: 'dark',
	setTheme: (theme) => {
		document.documentElement.classList.toggle('dark', theme === 'dark');
		set({ theme });
	},
	toggleTheme: () =>
		set((state) => {
			const newTheme = state.theme === 'dark' ? 'light' : 'dark';
			document.documentElement.classList.toggle('dark', newTheme === 'dark');
			return { theme: newTheme };
		}),

	// User
	user: null,
	setUser: (user) => set({ user }),

	// Tenant
	tenant: null,
	setTenant: (tenant) => set({ tenant }),

	// Sidebar
	sidebarCollapsed: false,
	setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
	toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

	// Active navigation
	activeNav: 'dashboard',
	setActiveNav: (activeNav) => set({ activeNav }),

	// Document browser
	selectedFolderId: null,
	setSelectedFolderId: (selectedFolderId) => set({ selectedFolderId }),
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

	// Selected items
	selectedDocuments: new Set(),
	toggleDocumentSelection: (id) =>
		set((state) => {
			const newSelected = new Set(state.selectedDocuments);
			if (newSelected.has(id)) {
				newSelected.delete(id);
			} else {
				newSelected.add(id);
			}
			return { selectedDocuments: newSelected };
		}),
	clearSelection: () => set({ selectedDocuments: new Set() }),
	selectAll: (ids) => set({ selectedDocuments: new Set(ids) }),

	// Pending tasks
	pendingTasks: [],
	setPendingTasks: (pendingTasks) => set({ pendingTasks }),

	// Modals
	activeModal: null,
	modalData: null,
	openModal: (activeModal, modalData = null) => set({ activeModal, modalData }),
	closeModal: () => set({ activeModal: null, modalData: null }),
}));
