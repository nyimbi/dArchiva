// (c) Copyright Datacraft, 2026
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, CheckCircle2, FolderOpen, Plus, ScanLine, Search } from 'lucide-react';
import { useState } from 'react';
import { CreateProjectDialog, ProjectCard } from '../components';
import { useScanningProjects } from '../hooks';

function StatCard({ label, value, icon: Icon, accent }: {
	label: string;
	value: number | string;
	icon: typeof FolderOpen;
	accent?: string;
}) {
	return (
		<Card>
			<CardContent className="p-4 flex items-center gap-4">
				<div className={`p-2.5 rounded-lg ${accent ?? 'bg-slate-800'}`}>
					<Icon className="w-5 h-5 text-slate-300" />
				</div>
				<div>
					<div className="text-2xl font-semibold text-slate-100">{value}</div>
					<div className="text-xs text-slate-400">{label}</div>
				</div>
			</CardContent>
		</Card>
	);
}

export function ScanningProjects() {
	const { data: projects, isLoading, error } = useScanningProjects();
	const [showCreate, setShowCreate] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState<string>('all');
	const [fromDate, setFromDate] = useState('');
	const [toDate, setToDate] = useState('');

	// ── Derived stats ──────────────────────────────────────────────────────────
	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

	const totalProjects = projects?.length ?? 0;
	const activeProjects = projects?.filter((p) => p.status === 'in_progress').length ?? 0;
	const completedThisMonth = projects?.filter(
		(p) => p.status === 'completed' && p.updatedAt >= startOfMonth,
	).length ?? 0;
	const totalDocsScanned = projects?.reduce((sum, p) => sum + (p.scannedPages ?? 0), 0) ?? 0;

	// ── Filtered list ──────────────────────────────────────────────────────────
	const filteredProjects = projects?.filter((project) => {
		const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			project.code.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
		const createdAt = project.createdAt;
		const matchesFrom = !fromDate || createdAt >= fromDate;
		const matchesTo = !toDate || createdAt <= toDate + 'T23:59:59';
		return matchesSearch && matchesStatus && matchesFrom && matchesTo;
	});

	if (isLoading) {
		return (
			<div className="p-8 space-y-6">
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
				</div>
				<div className="space-y-4">
					{[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-8">
				<div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400">
					Failed to load scanning projects. Please try again.
				</div>
			</div>
		);
	}

	return (
		<div className="p-8 space-y-6">
			{/* Page header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold text-slate-100">Scanning Projects</h1>
					<p className="text-slate-400 mt-1">Manage large-scale digitization projects</p>
				</div>
				<Button onClick={() => setShowCreate(true)} className="gap-2">
					<Plus className="w-4 h-4" />
					New Project
				</Button>
			</div>

			{/* Stats row */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<StatCard
					label="Total Projects"
					value={totalProjects}
					icon={FolderOpen}
					accent="bg-slate-700"
				/>
				<StatCard
					label="Active"
					value={activeProjects}
					icon={ScanLine}
					accent="bg-blue-500/20"
				/>
				<StatCard
					label="Completed this month"
					value={completedThisMonth}
					icon={CheckCircle2}
					accent="bg-emerald-500/20"
				/>
				<StatCard
					label="Total pages scanned"
					value={totalDocsScanned.toLocaleString()}
					icon={CalendarDays}
					accent="bg-brass-500/20"
				/>
			</div>

			{/* Filter bar */}
			<div className="flex flex-wrap items-center gap-3">
				<div className="flex-1 min-w-48 relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
					<Input
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Search by name or code…"
						className="pl-9"
					/>
				</div>

				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-44">
						<SelectValue placeholder="All Status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Status</SelectItem>
						<SelectItem value="planning">Planning</SelectItem>
						<SelectItem value="in_progress">In Progress</SelectItem>
						<SelectItem value="quality_review">Quality Review</SelectItem>
						<SelectItem value="completed">Completed</SelectItem>
						<SelectItem value="on_hold">On Hold</SelectItem>
					</SelectContent>
				</Select>

				<div className="flex items-center gap-2 text-sm text-slate-400">
					<span>From</span>
					<Input
						type="date"
						value={fromDate}
						onChange={(e) => setFromDate(e.target.value)}
						className="w-36"
					/>
					<span>to</span>
					<Input
						type="date"
						value={toDate}
						onChange={(e) => setToDate(e.target.value)}
						className="w-36"
					/>
				</div>

				{(searchQuery || statusFilter !== 'all' || fromDate || toDate) && (
					<Badge
						variant="secondary"
						className="cursor-pointer hover:bg-slate-700"
						onClick={() => {
							setSearchQuery('');
							setStatusFilter('all');
							setFromDate('');
							setToDate('');
						}}
					>
						Clear filters
					</Badge>
				)}
			</div>

			{/* Project grid */}
			{filteredProjects?.length === 0 ? (
				<div className="text-center py-16 border border-dashed border-slate-700 rounded-xl">
					<FolderOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
					<div className="text-slate-400 mb-3">No scanning projects found</div>
					<Button variant="ghost" size="sm" onClick={() => setShowCreate(true)}>
						Create your first project
					</Button>
				</div>
			) : (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					{filteredProjects?.map((project) => (
						<ProjectCard key={project.id} project={project} />
					))}
				</div>
			)}

			<CreateProjectDialog open={showCreate} onOpenChange={setShowCreate} />
		</div>
	);
}
