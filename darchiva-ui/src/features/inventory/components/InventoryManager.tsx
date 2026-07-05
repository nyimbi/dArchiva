// (c) Copyright Datacraft, 2026
import { useMemo, useState } from 'react';
import {
	AlertTriangle,
	Archive,
	ChevronDown,
	ChevronRight,
	ClipboardCheck,
	LogIn,
	LogOut,
	MapPin,
	Package,
	Printer,
	Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type LocationType = 'Building' | 'Floor' | 'Room' | 'Cabinet' | 'Shelf' | 'Box';
type Condition = 'Excellent' | 'Good' | 'Fair' | 'Fragile';
type MovementKind = 'Check-out' | 'Check-in' | 'Transfer' | 'Audit';

interface InventoryLocation {
	id: string;
	name: string;
	type: LocationType;
	capacity: number;
	used: number;
	children?: InventoryLocation[];
}

interface InventoryItem {
	id: string;
	locationId: string;
	label: string;
	docId: string;
	condition: Condition;
	dateAdded: string;
	status: 'Available' | 'Checked out' | 'In transit';
	holder?: string;
}

interface MovementLog {
	id: string;
	kind: MovementKind;
	item: string;
	from: string;
	to: string;
	actor: string;
	timestamp: string;
}

const locations: InventoryLocation[] = [
	{
		id: 'bld-a',
		name: 'Archives Building A',
		type: 'Building',
		capacity: 7200,
		used: 6380,
		children: [
			{
				id: 'a-f2',
				name: 'Floor 2',
				type: 'Floor',
				capacity: 3200,
				used: 2985,
				children: [
					{
						id: 'a-f2-r214',
						name: 'Room 214',
						type: 'Room',
						capacity: 1800,
						used: 1684,
						children: [
							{
								id: 'cab-2a',
								name: 'Cabinet 2A',
								type: 'Cabinet',
								capacity: 540,
								used: 491,
								children: [
									{ id: 'shelf-2a-03', name: 'Shelf 03', type: 'Shelf', capacity: 160, used: 151, children: [{ id: 'box-2a-03-11', name: 'Box 11', type: 'Box', capacity: 48, used: 45 }] },
									{ id: 'shelf-2a-04', name: 'Shelf 04', type: 'Shelf', capacity: 160, used: 132 },
								],
							},
							{ id: 'cab-2b', name: 'Cabinet 2B', type: 'Cabinet', capacity: 540, used: 412 },
						],
					},
				],
			},
			{ id: 'a-f3', name: 'Floor 3', type: 'Floor', capacity: 2800, used: 2110 },
		],
	},
	{ id: 'bld-b', name: 'Offsite Vault B', type: 'Building', capacity: 12400, used: 7020 },
];

const items: InventoryItem[] = [
	{ id: 'PHY-000814', locationId: 'box-2a-03-11', label: 'Box 11 / Vendor invoices Q2', docId: 'DOC-INV-2026-88412', condition: 'Good', dateAdded: '2026-07-01', status: 'Available' },
	{ id: 'PHY-000815', locationId: 'box-2a-03-11', label: 'Contract packet - Meridian lease', docId: 'DOC-CON-2026-21903', condition: 'Excellent', dateAdded: '2026-06-28', status: 'Checked out', holder: 'Amina Patel' },
	{ id: 'PHY-000816', locationId: 'shelf-2a-03', label: 'Claims evidence bundle C-4412', docId: 'DOC-CLM-2026-4412', condition: 'Fair', dateAdded: '2026-06-25', status: 'Available' },
	{ id: 'PHY-000817', locationId: 'cab-2a', label: 'Board minutes sealed set', docId: 'DOC-GOV-2026-0307', condition: 'Fragile', dateAdded: '2026-06-18', status: 'In transit', holder: 'Records Van 03' },
];

const movements: MovementLog[] = [
	{ id: 'MOV-9912', kind: 'Check-out', item: 'PHY-000815', from: 'Box 11', to: 'Amina Patel', actor: 'Brian Otieno', timestamp: '2026-07-05 10:42' },
	{ id: 'MOV-9911', kind: 'Audit', item: 'PHY-000814', from: 'Box 11', to: 'Box 11', actor: 'Ruth Njeri', timestamp: '2026-07-05 09:15' },
	{ id: 'MOV-9909', kind: 'Transfer', item: 'PHY-000817', from: 'Cabinet 2A', to: 'Conservation Desk', actor: 'Samuel Mwangi', timestamp: '2026-07-04 16:20' },
	{ id: 'MOV-9905', kind: 'Check-in', item: 'PHY-000816', from: 'Legal Review', to: 'Shelf 03', actor: 'Lilian Wekesa', timestamp: '2026-07-04 13:08' },
];

function flattenLocations(nodes: InventoryLocation[]): InventoryLocation[] {
	return nodes.flatMap((node) => [node, ...flattenLocations(node.children ?? [])]);
}

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
	return (
		<section className={cn('rounded-xl border border-slate-800/50 bg-slate-900 p-5', className)}>
			<h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-100">{title}</h2>
			{children}
		</section>
	);
}

function CapacityBar({ used, capacity }: { used: number; capacity: number }) {
	const pct = Math.round((used / capacity) * 100);
	return (
		<div>
			<div className="mb-1 flex justify-between text-xs text-slate-500">
				<span>{used.toLocaleString()} / {capacity.toLocaleString()}</span>
				<span className={pct >= 90 ? 'text-red-400' : pct >= 80 ? 'text-amber-400' : 'text-emerald-400'}>{pct}%</span>
			</div>
			<div className="h-2 rounded-full bg-slate-800">
				<div className={cn('h-2 rounded-full', pct >= 90 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${pct}%` }} />
			</div>
		</div>
	);
}

function LocationNode({
	location,
	selectedId,
	expanded,
	onSelect,
	onToggle,
	level = 0,
}: {
	location: InventoryLocation;
	selectedId: string;
	expanded: Set<string>;
	onSelect: (id: string) => void;
	onToggle: (id: string) => void;
	level?: number;
}) {
	const hasChildren = Boolean(location.children?.length);
	const isOpen = expanded.has(location.id);
	const pct = Math.round((location.used / location.capacity) * 100);
	return (
		<div>
			<button
				type="button"
				onClick={() => onSelect(location.id)}
				className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-800/70', selectedId === location.id && 'bg-brass-500/10 text-brass-300')}
				style={{ paddingLeft: 8 + level * 18 }}
			>
				<span
					onClick={(event) => {
						event.stopPropagation();
						if (hasChildren) onToggle(location.id);
					}}
					className="flex h-5 w-5 items-center justify-center text-slate-500"
				>
					{hasChildren ? isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" /> : null}
				</span>
				<MapPin className="h-4 w-4 text-slate-500" />
				<span className="min-w-0 flex-1 truncate">{location.name}</span>
				<span className={cn('rounded-full px-2 py-0.5 text-[11px]', pct >= 90 ? 'bg-red-500/10 text-red-400' : 'bg-slate-800 text-slate-400')}>{pct}%</span>
			</button>
			{hasChildren && isOpen ? location.children?.map((child) => (
				<LocationNode key={child.id} location={child} selectedId={selectedId} expanded={expanded} onSelect={onSelect} onToggle={onToggle} level={level + 1} />
			)) : null}
		</div>
	);
}

export function InventoryManager() {
	const allLocations = useMemo(() => flattenLocations(locations), []);
	const [selectedId, setSelectedId] = useState('box-2a-03-11');
	const [expanded, setExpanded] = useState<Set<string>>(new Set(['bld-a', 'a-f2', 'a-f2-r214', 'cab-2a', 'shelf-2a-03']));
	const [search, setSearch] = useState('');
	const selected = allLocations.find((location) => location.id === selectedId) ?? allLocations[0];
	const matchingItems = items.filter((item) => item.locationId === selectedId || item.label.toLowerCase().includes(search.toLowerCase()) || item.docId.toLowerCase().includes(search.toLowerCase()));
	const lowCapacityLocations = allLocations.filter((location) => location.used / location.capacity >= 0.9);

	return (
		<div className="min-h-screen bg-slate-950 p-6 text-slate-100">
			<div className="mx-auto max-w-[1500px] space-y-6">
				<header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<div className="flex items-center gap-2 text-sm font-medium text-brass-500">
							<Archive className="h-4 w-4" />
							Physical inventory
						</div>
						<h1 className="mt-2 text-3xl font-semibold tracking-tight">Inventory Manager</h1>
						<p className="mt-2 text-sm text-slate-400">Location tree, capacity, physical labels, check-in/out status, movements, and audit readiness.</p>
					</div>
					<button type="button" className="inline-flex items-center gap-2 rounded-xl bg-brass-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-brass-400">
						<Printer className="h-4 w-4" />
						Print location label
					</button>
				</header>

				{lowCapacityLocations.length ? (
					<div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200">
						<AlertTriangle className="mr-2 inline h-4 w-4 text-amber-400" />
						Low capacity alert: {lowCapacityLocations.map((location) => location.name).join(', ')} are above 90% capacity.
					</div>
				) : null}

				<div className="grid gap-6 xl:grid-cols-[390px_1fr]">
					<Panel title="Location Tree" className="xl:min-h-[720px]">
						<div className="relative mb-4">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
							<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search location or document..." className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pl-10 pr-3 text-sm outline-none focus:border-brass-500/70" />
						</div>
						<div className="space-y-1">
							{locations.map((location) => (
								<LocationNode
									key={location.id}
									location={location}
									selectedId={selectedId}
									expanded={expanded}
									onSelect={setSelectedId}
									onToggle={(id) =>
										setExpanded((current) => {
											const next = new Set(current);
											if (next.has(id)) next.delete(id);
											else next.add(id);
											return next;
										})
									}
								/>
							))}
						</div>
					</Panel>

					<div className="space-y-6">
						<Panel title={`${selected.type}: ${selected.name}`}>
							<div className="grid gap-4 md:grid-cols-3">
								<div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
									<p className="text-xs uppercase tracking-[0.16em] text-slate-500">Capacity</p>
									<div className="mt-4"><CapacityBar used={selected.used} capacity={selected.capacity} /></div>
								</div>
								<div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
									<p className="text-xs uppercase tracking-[0.16em] text-slate-500">Items here</p>
									<p className="mt-3 text-3xl font-semibold text-slate-100">{matchingItems.length}</p>
								</div>
								<div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
									<p className="text-xs uppercase tracking-[0.16em] text-slate-500">Utilization</p>
									<p className="mt-3 text-3xl font-semibold text-brass-400">{Math.round((selected.used / selected.capacity) * 100)}%</p>
								</div>
							</div>
						</Panel>

						<Panel title="Items in Location">
							<div className="space-y-3">
								{matchingItems.length ? matchingItems.map((item) => (
									<div key={item.id} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 md:grid-cols-[1fr_auto] md:items-center">
										<div className="flex items-start gap-3">
											<div className="rounded-lg bg-slate-800 p-2 text-brass-500"><Package className="h-5 w-5" /></div>
											<div className="min-w-0">
												<p className="truncate font-medium text-slate-100">{item.label}</p>
												<p className="mt-1 text-xs text-slate-500">{item.id} · {item.docId} · Added {item.dateAdded}</p>
												<p className="mt-1 text-xs text-slate-400">Condition: {item.condition}{item.holder ? ` · Holder: ${item.holder}` : ''}</p>
											</div>
										</div>
										<div className="flex flex-wrap items-center gap-2">
											<span className={cn('rounded-full px-2 py-1 text-xs font-medium', item.status === 'Available' ? 'bg-emerald-500/10 text-emerald-400' : item.status === 'Checked out' ? 'bg-sky-500/10 text-sky-400' : 'bg-amber-500/10 text-amber-400')}>{item.status}</span>
											<button type="button" className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-brass-500/70">
												{item.status === 'Checked out' ? <LogIn className="h-3.5 w-3.5" /> : <LogOut className="h-3.5 w-3.5" />}
												{item.status === 'Checked out' ? 'Check in' : 'Check out'}
											</button>
										</div>
									</div>
								)) : (
									<div className="rounded-xl border border-dashed border-slate-800 py-12 text-center text-sm text-slate-500">
										No physical items match this location or search.
									</div>
								)}
							</div>
						</Panel>
					</div>
				</div>

				<Panel title="Audit Trail for Movements">
					<div className="overflow-hidden rounded-xl border border-slate-800/50">
						<table className="w-full text-sm">
							<thead className="bg-slate-800/60 text-xs uppercase tracking-wide text-slate-500">
								<tr>
									<th className="px-4 py-3 text-left">Movement</th>
									<th className="px-4 py-3 text-left">Item</th>
									<th className="px-4 py-3 text-left">From</th>
									<th className="px-4 py-3 text-left">To</th>
									<th className="px-4 py-3 text-left">Actor</th>
									<th className="px-4 py-3 text-left">Time</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-800/50">
								{movements.map((movement) => (
									<tr key={movement.id}>
										<td className="px-4 py-3"><span className="inline-flex items-center gap-2 text-slate-200"><ClipboardCheck className="h-4 w-4 text-brass-500" />{movement.kind}</span></td>
										<td className="px-4 py-3 font-mono text-brass-300">{movement.item}</td>
										<td className="px-4 py-3 text-slate-400">{movement.from}</td>
										<td className="px-4 py-3 text-slate-300">{movement.to}</td>
										<td className="px-4 py-3 text-slate-300">{movement.actor}</td>
										<td className="px-4 py-3 text-slate-500">{movement.timestamp}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</Panel>
			</div>
		</div>
	);
}

export default InventoryManager;
