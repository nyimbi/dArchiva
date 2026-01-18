// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { useScanningProjects } from '../hooks';
import { ProjectCard, CreateProjectDialog } from '../components';

export function ScanningProjects() {
	const { data: projects, isLoading, error } = useScanningProjects();
	const [showCreate, setShowCreate] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState<string>('all');

	const filteredProjects = projects?.filter((project) => {
		const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
		return matchesSearch && matchesStatus;
	});

	if (isLoading) {
		return (
			<div className="p-8">
				<div className="animate-pulse space-y-4">
					{[1, 2, 3].map((i) => (
						<div key={i} className="h-48 bg-slate-800 rounded-lg" />
					))}
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
		<div className="p-8">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-semibold text-slate-100">Scanning Projects</h1>
					<p className="text-slate-400 mt-1">Manage large-scale digitization projects</p>
				</div>
				<button
					onClick={() => setShowCreate(true)}
					className="inline-flex items-center gap-2 px-4 py-2 bg-brass-500 text-slate-900 rounded-lg font-medium hover:bg-brass-400 transition-colors"
				>
					<Plus className="w-5 h-5" />
					New Project
				</button>
			</div>

			<div className="flex items-center gap-4 mb-6">
				<div className="flex-1 relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-brass-500"
						placeholder="Search projects..."
					/>
				</div>
				<select
					value={statusFilter}
					onChange={(e) => setStatusFilter(e.target.value)}
					className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-brass-500"
				>
					<option value="all">All Status</option>
					<option value="planning">Planning</option>
					<option value="in_progress">In Progress</option>
					<option value="quality_review">Quality Review</option>
					<option value="completed">Completed</option>
					<option value="on_hold">On Hold</option>
				</select>
			</div>

			{filteredProjects?.length === 0 ? (
				<div className="text-center py-12">
					<div className="text-slate-500 mb-4">No scanning projects found</div>
					<button
						onClick={() => setShowCreate(true)}
						className="text-brass-400 hover:text-brass-300"
					>
						Create your first project
					</button>
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
