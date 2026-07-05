// (c) Copyright Datacraft, 2026
export function PageSkeleton() {
	return (
		<div className="min-h-full space-y-6">
			<div className="h-16 w-full animate-pulse rounded bg-slate-800" />
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{Array.from({ length: 6 }).map((_, index) => (
					<div
						key={index}
						className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/70 p-5"
					>
						<div className="h-6 w-2/3 animate-pulse rounded bg-slate-800" />
						<div className="space-y-3">
							<div className="h-4 w-full animate-pulse rounded bg-slate-800" />
							<div className="h-4 w-5/6 animate-pulse rounded bg-slate-800" />
							<div className="h-4 w-3/5 animate-pulse rounded bg-slate-800" />
						</div>
						<div className="flex gap-3">
							<div className="h-8 w-20 animate-pulse rounded bg-slate-800" />
							<div className="h-8 w-16 animate-pulse rounded bg-slate-800" />
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
