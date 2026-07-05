// (c) Copyright Datacraft, 2026
/**
 * Physical inventory management — item tracking, checkout/checkin, and reconciliation tools.
 */
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Archive,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileSearch,
  Info,
  Loader2,
  MapPin,
  Package,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Upload,
  XCircle,
} from 'lucide-react';
import { type ElementType, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCheckinContainer,
  useCheckoutContainer,
  useContainers,
  useCreateContainer,
  useInventorySummary,
  useLocations,
  useReconcileInventory,
  useResolveDiscrepancy,
  type PhysicalContainer,
  type WarehouseLocation,
} from '../api';
import type {
  Discrepancy,
  DiscrepancySeverity,
  PhysicalRecordInput,
  ReconciliationResult,
} from '../types';

// ── Constants ──────────────────────────────────────────────────────

const CONTAINER_TYPES = [
  'box', 'folder', 'crate', 'shelf', 'cabinet', 'pallet', 'room', 'building',
] as const;

const STATUS_LABELS: Record<string, string> = {
  in_storage: 'In Storage',
  checked_out: 'Checked Out',
  in_transit: 'In Transit',
  missing: 'Missing',
  destroyed: 'Destroyed',
  transferred: 'Transferred',
  pending_review: 'Pending Review',
};

const STATUS_CLASSES: Record<string, string> = {
  in_storage: 'bg-green-100 text-green-700',
  checked_out: 'bg-blue-100 text-blue-700',
  in_transit: 'bg-amber-100 text-amber-700',
  missing: 'bg-red-100 text-red-700',
  destroyed: 'bg-gray-100 text-gray-500',
  transferred: 'bg-gray-100 text-gray-500',
  pending_review: 'bg-amber-100 text-amber-700',
};

function deriveCondition(status: PhysicalContainer['status']): string {
  if (status === 'missing') return 'Unknown';
  if (status === 'destroyed') return 'Destroyed';
  if (status === 'pending_review') return 'Under Review';
  return 'Good';
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ── Severity config for reconciliation ─────────────────────────────

const severityConfig: Record<
  DiscrepancySeverity,
  { icon: ElementType; color: string; bg: string }
> = {
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-100' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' },
  error: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
  critical: { icon: AlertTriangle, color: 'text-red-700', bg: 'bg-red-200' },
};

// ── DiscrepancyCard ─────────────────────────────────────────────────

function DiscrepancyCard({
  discrepancy,
  onResolve,
}: {
  discrepancy: Discrepancy;
  onResolve: (id: string, notes: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const config = severityConfig[discrepancy.severity];
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 rounded-lg overflow-hidden"
    >
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.bg}`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          <div>
            <p className="font-medium text-gray-900">{discrepancy.type.replace(/_/g, ' ')}</p>
            <p className="text-sm text-gray-500">{discrepancy.description}</p>
          </div>
        </div>
        <button className="text-gray-400">
          {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-200"
          >
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {discrepancy.physicalBarcode && (
                  <div>
                    <span className="text-gray-500">Physical Barcode:</span>{' '}
                    <span className="font-mono">{discrepancy.physicalBarcode}</span>
                  </div>
                )}
                {discrepancy.digitalId && (
                  <div>
                    <span className="text-gray-500">Digital ID:</span>{' '}
                    <span className="font-mono">{discrepancy.digitalId.slice(0, 12)}…</span>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  <strong>Suggested Action:</strong> {discrepancy.suggestedAction}
                </p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Resolution Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="Describe how this was resolved…"
                />
                <button
                  onClick={() => onResolve(discrepancy.id, notes)}
                  disabled={!notes.trim()}
                  className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Mark as Resolved
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── ReconciliationSummary ───────────────────────────────────────────

function ReconciliationSummary({ result }: { result: ReconciliationResult }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
        <p className="text-3xl font-bold text-gray-900">{result.matched}</p>
        <p className="text-sm text-gray-500 mt-1">Matched</p>
      </div>
      <div className="bg-white border border-red-200 rounded-lg p-4 text-center">
        <p className="text-3xl font-bold text-red-600">{result.missingDigitalCount}</p>
        <p className="text-sm text-gray-500 mt-1">Missing Digital</p>
      </div>
      <div className="bg-white border border-amber-200 rounded-lg p-4 text-center">
        <p className="text-3xl font-bold text-amber-600">{result.missingPhysicalCount}</p>
        <p className="text-sm text-gray-500 mt-1">Missing Physical</p>
      </div>
      <div className="bg-white border border-purple-200 rounded-lg p-4 text-center">
        <p className="text-3xl font-bold text-purple-600">{result.otherIssuesCount}</p>
        <p className="text-sm text-gray-500 mt-1">Other Issues</p>
      </div>
    </div>
  );
}

// ── StatCard ────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  accentClass = 'border-gray-200',
}: {
  label: string;
  value: number;
  accentClass?: string;
}) {
  return (
    <div className={`bg-white border ${accentClass} rounded-lg p-4 text-center`}>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

// ── AddItemDialog ───────────────────────────────────────────────────

function AddItemDialog({
  open,
  onClose,
  locations,
}: {
  open: boolean;
  onClose: () => void;
  locations: WarehouseLocation[];
}) {
  const [barcode, setBarcode] = useState('');
  const [label, setLabel] = useState('');
  const [containerType, setContainerType] = useState('box');
  const [locationId, setLocationId] = useState('');
  const [description, setDescription] = useState('');
  const create = useCreateContainer();

  function reset() {
    setBarcode('');
    setLabel('');
    setContainerType('box');
    setLocationId('');
    setDescription('');
  }

  async function handleSubmit() {
    await create.mutateAsync({
      barcode,
      containerType,
      label: label || undefined,
      description: description || undefined,
      locationId: locationId || undefined,
    });
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Inventory Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>
              Barcode / ID <span className="text-destructive">*</span>
            </Label>
            <Input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Scan or enter barcode"
            />
          </div>
          <div className="space-y-1">
            <Label>Label / Title</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Contract Files 2024"
            />
          </div>
          <div className="space-y-1">
            <Label>Container Type</Label>
            <Select value={containerType} onValueChange={setContainerType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTAINER_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Physical Location</Label>
            <Select
              value={locationId || '__none__'}
              onValueChange={(v) => setLocationId(v === '__none__' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="No location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No location</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name} ({loc.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>
        </div>
        {create.error && (
          <p className="text-sm text-destructive mt-2">
            {(create.error as Error).message ?? 'An error occurred'}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!barcode.trim() || create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── CheckoutDialog ──────────────────────────────────────────────────

function CheckoutDialog({
  container,
  open,
  onClose,
}: {
  container: PhysicalContainer | null;
  open: boolean;
  onClose: () => void;
}) {
  const [userId, setUserId] = useState('');
  const [reason, setReason] = useState('');
  const [dueDate, setDueDate] = useState('');
  const checkout = useCheckoutContainer();

  function reset() {
    setUserId('');
    setReason('');
    setDueDate('');
  }

  async function handleSubmit() {
    if (!container) return;
    await checkout.mutateAsync({
      containerId: container.id,
      toUserId: userId,
      reason,
      expectedReturnDate: dueDate || undefined,
    });
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Check Out Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
            <span className="font-mono font-medium">{container?.barcode}</span>
            {container?.label && (
              <span className="text-muted-foreground ml-2">— {container.label}</span>
            )}
          </div>
          <div className="space-y-1">
            <Label>
              User ID <span className="text-destructive">*</span>
            </Label>
            <Input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID or username"
            />
          </div>
          <div className="space-y-1">
            <Label>
              Reason <span className="text-destructive">*</span>
            </Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for checkout"
            />
          </div>
          <div className="space-y-1">
            <Label>Due Date</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        {checkout.error && (
          <p className="text-sm text-destructive mt-2">
            {(checkout.error as Error).message ?? 'An error occurred'}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!userId.trim() || !reason.trim() || checkout.isPending}
          >
            {checkout.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Check Out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── CheckinDialog ───────────────────────────────────────────────────

function CheckinDialog({
  container,
  open,
  onClose,
  locations,
}: {
  container: PhysicalContainer | null;
  open: boolean;
  onClose: () => void;
  locations: WarehouseLocation[];
}) {
  const [locationId, setLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const checkin = useCheckinContainer();

  function reset() {
    setLocationId('');
    setNotes('');
  }

  async function handleSubmit() {
    if (!container) return;
    await checkin.mutateAsync({
      containerId: container.id,
      toLocationId: locationId,
      notes: notes || undefined,
    });
    reset();
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Check In Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
            <span className="font-mono font-medium">{container?.barcode}</span>
            {container?.label && (
              <span className="text-muted-foreground ml-2">— {container.label}</span>
            )}
          </div>
          <div className="space-y-1">
            <Label>
              Return Location <span className="text-destructive">*</span>
            </Label>
            <Select
              value={locationId || undefined}
              onValueChange={setLocationId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name} ({loc.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
            />
          </div>
        </div>
        {checkin.error && (
          <p className="text-sm text-destructive mt-2">
            {(checkin.error as Error).message ?? 'An error occurred'}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!locationId || checkin.isPending}
          >
            {checkin.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Check In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Items Table ─────────────────────────────────────────────────────

function ItemsTable({
  containers,
  locationMap,
  onCheckout,
  onCheckin,
  isLoading = false,
}: {
  containers: PhysicalContainer[];
  locationMap: Map<string, WarehouseLocation>;
  onCheckout: (c: PhysicalContainer) => void;
  onCheckin: (c: PhysicalContainer) => void;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (containers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Archive className="w-12 h-12 mb-3 opacity-40" />
        <p className="text-sm">No items found</p>
      </div>
    );
  }

  const COL_HEADS = [
    'Item ID', 'Title / Label', 'Location', 'Condition',
    'Status', 'Last Seen', 'Custodian', 'Due Date', 'Actions',
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {COL_HEADS.map((h) => (
              <th
                key={h}
                className="text-left py-3 px-4 font-medium text-gray-500 text-xs uppercase tracking-wide whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {containers.map((c) => {
            const loc = c.locationId ? locationMap.get(c.locationId) : undefined;
            return (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4 font-mono text-xs text-gray-600 whitespace-nowrap">
                  {c.barcode}
                </td>
                <td className="py-3 px-4 max-w-[180px]">
                  <p className="font-medium text-gray-900 truncate">
                    {c.label || c.description || '—'}
                  </p>
                  <p className="text-xs text-gray-400 capitalize">{c.containerType}</p>
                </td>
                <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                  {loc ? (
                    <span className="flex items-center gap-1 text-xs">
                      <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      {loc.name}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-gray-600 text-xs">
                  {deriveCondition(c.status)}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      STATUS_CLASSES[c.status] ?? 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {STATUS_LABELS[c.status] ?? c.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">
                  {fmtDate(c.lastVerifiedAt)}
                </td>
                <td className="py-3 px-4 text-gray-500 font-mono text-xs">
                  {c.currentCustodianId
                    ? `${c.currentCustodianId.slice(0, 8)}…`
                    : '—'}
                </td>
                <td className="py-3 px-4 text-gray-400 text-xs">—</td>
                <td className="py-3 px-4">
                  {c.status === 'checked_out' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => onCheckin(c)}
                    >
                      Check In
                    </Button>
                  ) : c.status === 'in_storage' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => onCheckout(c)}
                    >
                      Check Out
                    </Button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main InventoryManager ───────────────────────────────────────────

type TabId =
  | 'all'
  | 'checked_out'
  | 'overdue'
  | 'by_location'
  | 'qr'
  | 'duplicates'
  | 'reconcile';

export function InventoryManager() {
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('__all__');
  const [locationFilter, setLocationFilter] = useState('__all__');
  const [checkoutTarget, setCheckoutTarget] = useState<PhysicalContainer | null>(null);
  const [checkinTarget, setCheckinTarget] = useState<PhysicalContainer | null>(null);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<ReconciliationResult | null>(null);
  const [physicalRecords] = useState<PhysicalRecordInput[]>([]);

  const { data: summary } = useInventorySummary();
  const { data: allContainers = [], isLoading } = useContainers({ limit: 500 });
  const { data: locations = [] } = useLocations();

  const reconcileMutation = useReconcileInventory();
  const resolveMutation = useResolveDiscrepancy();

  const locationMap = useMemo(() => {
    const m = new Map<string, WarehouseLocation>();
    locations.forEach((loc) => m.set(loc.id, loc));
    return m;
  }, [locations]);

  const stats = useMemo(() => ({
    total: allContainers.length,
    checkedOut:
      summary?.containersByStatus?.['checked_out'] ??
      allContainers.filter((c) => c.status === 'checked_out').length,
    overdue: summary?.overdueForRetention ?? 0,
    inStorage:
      summary?.containersByStatus?.['in_storage'] ??
      allContainers.filter((c) => c.status === 'in_storage').length,
  }), [allContainers, summary]);

  const filteredContainers = useMemo(() => {
    let items = allContainers;

    if (activeTab === 'checked_out' || activeTab === 'overdue') {
      items = items.filter((c) => c.status === 'checked_out');
    }
    if (activeTab === 'all' && statusFilter !== '__all__') {
      items = items.filter((c) => c.status === statusFilter);
    }
    if (locationFilter !== '__all__') {
      items = items.filter((c) => c.locationId === locationFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (c) =>
          c.barcode.toLowerCase().includes(q) ||
          (c.label ?? '').toLowerCase().includes(q) ||
          (c.description ?? '').toLowerCase().includes(q),
      );
    }

    return items;
  }, [allContainers, activeTab, statusFilter, locationFilter, search]);

  const byLocation = useMemo(() => {
    const groups = new Map<string, PhysicalContainer[]>();
    filteredContainers.forEach((c) => {
      const key = c.locationId ?? '__unassigned__';
      groups.set(key, [...(groups.get(key) ?? []), c]);
    });
    return groups;
  }, [filteredContainers]);

  async function handleReconcile() {
    const result = await reconcileMutation.mutateAsync({
      physicalRecords,
      matchBy: ['barcode'],
      pageCountTolerance: 0,
    });
    setReconcileResult(result);
  }

  async function handleResolve(id: string, notes: string) {
    await resolveMutation.mutateAsync({ discrepancyId: id, resolutionNotes: notes });
    if (reconcileResult) {
      setReconcileResult({
        ...reconcileResult,
        discrepancies: reconcileResult.discrepancies.filter((d) => d.id !== id),
      });
    }
  }

  const isItemTab = ['all', 'checked_out', 'overdue', 'by_location'].includes(activeTab);

  const ITEM_TABS: { id: TabId; label: string; icon: ElementType }[] = [
    { id: 'all', label: 'All Items', icon: Package },
    { id: 'checked_out', label: 'Checked Out', icon: Archive },
    { id: 'overdue', label: 'Overdue', icon: AlertTriangle },
    { id: 'by_location', label: 'By Location', icon: MapPin },
  ];

  const TOOL_TABS: { id: TabId; label: string; icon: ElementType }[] = [
    { id: 'qr', label: 'QR Labels', icon: QrCode },
    { id: 'duplicates', label: 'Duplicates', icon: FileSearch },
    { id: 'reconcile', label: 'Reconciliation', icon: ClipboardCheck },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Physical Inventory</h1>
          <p className="text-gray-500 mt-1">
            Track physical containers, checkout status, and run reconciliation
          </p>
        </div>
        {isItemTab && (
          <Button onClick={() => setAddItemOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Items" value={stats.total} />
        <StatCard label="Checked Out" value={stats.checkedOut} accentClass="border-blue-200" />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          accentClass={stats.overdue > 0 ? 'border-red-200' : 'border-gray-200'}
        />
        <StatCard label="In Storage" value={stats.inStorage} accentClass="border-green-200" />
      </div>

      {/* Overdue Alert Banner */}
      {stats.overdue > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-red-700">
            <strong>{stats.overdue}</strong> item
            {stats.overdue !== 1 ? 's' : ''} overdue for retention review.
          </span>
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex items-center gap-0.5 border-b border-gray-200 overflow-x-auto">
        {ITEM_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
        <div className="w-px h-5 bg-gray-200 mx-3 self-center flex-shrink-0" />
        {TOOL_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Item Tracking Content ── */}
      {isItemTab && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search barcode or label…"
                className="pl-9"
              />
            </div>
            {activeTab === 'all' && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All statuses</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([val, lbl]) => (
                    <SelectItem key={val} value={val}>
                      {lbl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="All locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All locations</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name} ({loc.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Overdue tab info note */}
          {activeTab === 'overdue' && (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <Info className="w-4 h-4 flex-shrink-0" />
              Showing all checked-out items. Checkout due dates are recorded at time of checkout and are not returned in the container list.
            </div>
          )}

          {/* By Location grouped view */}
          {activeTab === 'by_location' ? (
            <div className="space-y-6">
              {isLoading && (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              )}
              {!isLoading && byLocation.size === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Archive className="w-12 h-12 mb-3 opacity-40" />
                  <p className="text-sm">No items found</p>
                </div>
              )}
              {Array.from(byLocation.entries()).map(([locId, containers]) => {
                const loc = locId !== '__unassigned__' ? locationMap.get(locId) : undefined;
                return (
                  <div key={locId} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <h3 className="font-medium text-gray-700 text-sm">
                        {loc ? `${loc.name} (${loc.code})` : 'Unassigned'}
                      </h3>
                      <span className="text-xs text-gray-400">
                        — {containers.length} item{containers.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <ItemsTable
                      containers={containers}
                      locationMap={locationMap}
                      onCheckout={setCheckoutTarget}
                      onCheckin={setCheckinTarget}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <ItemsTable
              containers={filteredContainers}
              locationMap={locationMap}
              onCheckout={setCheckoutTarget}
              onCheckin={setCheckinTarget}
              isLoading={isLoading}
            />
          )}
        </div>
      )}

      {/* ── QR Labels Tab ── */}
      {activeTab === 'qr' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Generate QR Labels</h2>
          <p className="text-gray-500 mb-6">
            Create QR codes or Data Matrix labels for physical documents. Labels can be printed on standard label sheets.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-3 p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors">
              <QrCode className="w-8 h-8 text-gray-400" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Single QR Code</p>
                <p className="text-sm text-gray-500">Generate for one document</p>
              </div>
            </button>
            <button className="flex items-center justify-center gap-3 p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors">
              <Printer className="w-8 h-8 text-gray-400" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Label Sheet</p>
                <p className="text-sm text-gray-500">Print multiple labels</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ── Duplicate Check Tab ── */}
      {activeTab === 'duplicates' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Duplicate Detection</h2>
          <p className="text-gray-500 mb-6">
            Upload documents to check for duplicates using perceptual hashing. Identifies visually similar documents even if not byte-identical.
          </p>
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Drag and drop files here, or click to select</p>
            <p className="text-sm text-gray-400">Supports PDF, PNG, JPG, TIFF</p>
            <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Select Files
            </button>
          </div>
        </div>
      )}

      {/* ── Reconciliation Tab ── */}
      {activeTab === 'reconcile' && (
        <div className="space-y-6">
          {reconcileResult ? (
            <>
              <ReconciliationSummary result={reconcileResult} />
              {reconcileResult.discrepancies.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Discrepancies ({reconcileResult.discrepancies.length})
                    </h2>
                    <button
                      onClick={() => setReconcileResult(null)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      New Reconciliation
                    </button>
                  </div>
                  <div className="space-y-3">
                    {reconcileResult.discrepancies.map((d) => (
                      <DiscrepancyCard key={d.id} discrepancy={d} onResolve={handleResolve} />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-emerald-50 rounded-xl">
                  <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-emerald-700">All Records Match!</h3>
                  <p className="text-emerald-600 mt-2">
                    No discrepancies found between physical and digital records.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Inventory Reconciliation
              </h2>
              <p className="text-gray-500 mb-6">
                Compare physical inventory records with digital documents to identify discrepancies
                and missing items.
              </p>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                <Download className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Upload physical inventory CSV or Excel file</p>
                <p className="text-sm text-gray-400 mb-4">Required columns: barcode, location_code</p>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Upload Inventory
                </button>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleReconcile}
                  disabled={physicalRecords.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Run Reconciliation
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <AddItemDialog
        open={addItemOpen}
        onClose={() => setAddItemOpen(false)}
        locations={locations}
      />
      <CheckoutDialog
        container={checkoutTarget}
        open={!!checkoutTarget}
        onClose={() => setCheckoutTarget(null)}
      />
      <CheckinDialog
        container={checkinTarget}
        open={!!checkinTarget}
        onClose={() => setCheckinTarget(null)}
        locations={locations}
      />
    </div>
  );
}
