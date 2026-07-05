// (c) Copyright Datacraft, 2026
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronUp,
  MapPin,
  Monitor,
  Plus,
  RefreshCw,
  ScrollText,
  Settings,
  Trash2,
  Wifi,
  WifiOff,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import {
  type Agent,
  type AgentConfigUpdate,
  type MaintenanceLog,
  type RegisterAgentInput,
  useAgentMaintenanceLogs,
  useAgents,
  useDeleteAgent,
  usePingAgent,
  usePushAgentConfig,
  useRegisterAgent,
  useRestartAgent,
  useSetMaintenanceMode,
} from "../api/hooks";

// ── constants ────────────────────────────────────────────────────────────────

const SCANNER_MODELS = [
  "Fujitsu fi-7600",
  "Fujitsu fi-7160",
  "Fujitsu fi-800R",
  "Kodak i3450",
  "Kodak i4850",
  "Canon DR-G1130",
  "Canon DR-C240",
  "Epson DS-870",
  "Epson DS-32000",
  "Brother ADS-4900W",
  "HP ScanJet Pro 3600 f1",
];

const DRIVER_VERSIONS = ["2.7.0", "2.6.3", "2.5.1", "2.4.8", "2.3.2"];

const LOG_TYPE_STYLES: Record<string, string> = {
  maintenance_start:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  maintenance_end:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  restart: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  firmware_update:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  config_push:
    "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300",
};

// ── helpers ──────────────────────────────────────────────────────────────────

function agentStatus(
  agent: Agent
): "online" | "offline" | "maintenance" | "error" {
  if (agent.status) return agent.status;
  return agent.online ? "online" : "offline";
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── sub-components ───────────────────────────────────────────────────────────

function StatusBadge({
  status,
}: {
  status: ReturnType<typeof agentStatus>;
}) {
  if (status === "online") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 gap-1">
        <CheckCircle2 className="w-3 h-3" />
        Online
      </Badge>
    );
  }
  if (status === "maintenance") {
    return (
      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-0 gap-1">
        <Wrench className="w-3 h-3" />
        Maintenance
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-0 gap-1">
        <AlertCircle className="w-3 h-3" />
        Error
      </Badge>
    );
  }
  return (
    <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-0 gap-1">
      <WifiOff className="w-3 h-3" />
      Offline
    </Badge>
  );
}

function ScannerStatCard({
  label,
  value,
  accent,
  sub,
}: {
  label: string;
  value: number;
  accent?: "green" | "red" | "amber";
  sub?: string;
}) {
  const valueColor =
    accent === "green"
      ? "text-emerald-500"
      : accent === "red"
        ? "text-red-500"
        : accent === "amber"
          ? "text-amber-500"
          : undefined;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${valueColor ?? ""}`}>{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

/** Expandable maintenance-log panel — own hook call so it only fetches when open. */
function MaintenanceLogsPanel({ agentId }: { agentId: string }) {
  const { data: logs = [], isLoading } = useAgentMaintenanceLogs(agentId);

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={10} className="bg-muted/20 px-6 py-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Maintenance Log — last 10 events
        </p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No maintenance events recorded.
          </p>
        ) : (
          <div className="space-y-1.5">
            {logs.slice(0, 10).map((log: MaintenanceLog) => (
              <div key={log.id} className="flex items-start gap-3 text-xs">
                <span
                  className={`px-1.5 py-0.5 rounded text-[11px] font-medium whitespace-nowrap ${LOG_TYPE_STYLES[log.type] ?? LOG_TYPE_STYLES.config_push}`}
                >
                  {log.type.replace(/_/g, " ")}
                </span>
                <span className="text-muted-foreground whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
                <span>{log.notes}</span>
              </div>
            ))}
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

function RegisterScannerDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const register = useRegisterAgent();
  const [form, setForm] = useState<RegisterAgentInput>({
    name: "",
    model: SCANNER_MODELS[0],
    ipAddress: "",
    location: "",
    driverVersion: DRIVER_VERSIONS[0],
  });

  function handleChange(field: keyof RegisterAgentInput, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.ipAddress.trim() || !form.location.trim()) {
      toast.error("Name, IP address and location are required.");
      return;
    }
    register.mutate(form, {
      onSuccess: () => {
        toast.success(`Scanner "${form.name}" registered.`);
        setForm({
          name: "",
          model: SCANNER_MODELS[0],
          ipAddress: "",
          location: "",
          driverVersion: DRIVER_VERSIONS[0],
        });
        onClose();
      },
      onError: () =>
        toast.error("Registration failed — check server connection."),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Register Scanner
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Scanner Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Scan-Station-01"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Scanner Model *</Label>
            <select
              value={form.model}
              onChange={(e) => handleChange("model", e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {SCANNER_MODELS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              <option value="other">Other / Custom</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>IP Address *</Label>
            <Input
              value={form.ipAddress}
              onChange={(e) => handleChange("ipAddress", e.target.value)}
              placeholder="192.168.1.50"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Location *</Label>
            <Input
              value={form.location}
              onChange={(e) => handleChange("location", e.target.value)}
              placeholder="Room 4B — Floor 2"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Driver Version</Label>
            <select
              value={form.driverVersion}
              onChange={(e) => handleChange("driverVersion", e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {DRIVER_VERSIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={register.isPending}>
            {register.isPending ? "Registering…" : "Register Scanner"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AgentConfigDialog({
  agent,
  onClose,
}: {
  agent: Agent;
  onClose: () => void;
}) {
  const push = usePushAgentConfig();
  const [serverUrl, setServerUrl] = useState(
    agent.pushedConfig?.serverUrl ?? ""
  );
  const [defaultProject, setDefaultProject] = useState(
    agent.pushedConfig?.defaultProjectId ?? ""
  );

  function save() {
    const config: AgentConfigUpdate = {};
    if (serverUrl) config.serverUrl = serverUrl;
    if (defaultProject) config.defaultProjectId = defaultProject;
    push.mutate(
      { agentId: agent.id, config },
      {
        onSuccess: () => {
          toast.success(
            "Config pushed — agent will apply on next heartbeat (≤60 s)."
          );
          onClose();
        },
        onError: () => toast.error("Failed to push config."),
      }
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Push Config — {agent.name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Applied on the agent's next heartbeat. Leave blank to keep the
          existing value.
        </p>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>dArchiva Server URL</Label>
            <Input
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://192.168.1.50:8000"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Default Project ID</Label>
            <Input
              value={defaultProject}
              onChange={(e) => setDefaultProject(e.target.value)}
              placeholder="proj-abc123"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={push.isPending}>
            {push.isPending ? "Pushing…" : "Push Config"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AgentTableRow({
  agent,
  expanded,
  onToggleExpand,
  pingResult,
  onPing,
  onRestart,
  onMaintenanceToggle,
  onConfig,
  onRetire,
}: {
  agent: Agent;
  expanded: boolean;
  onToggleExpand: () => void;
  pingResult: number | "error" | "pending" | undefined;
  onPing: () => void;
  onRestart: () => void;
  onMaintenanceToggle: () => void;
  onConfig: () => void;
  onRetire: () => void;
}) {
  const status = agentStatus(agent);

  return (
    <>
      <TableRow>
        {/* Scanner name */}
        <TableCell>
          <div className="font-medium text-sm">{agent.name}</div>
          <div className="text-xs text-muted-foreground font-mono">
            {agent.hostname}
          </div>
        </TableCell>

        {/* Model */}
        <TableCell className="text-sm text-muted-foreground">
          {agent.model ?? "—"}
        </TableCell>

        {/* Location */}
        <TableCell>
          {agent.location ? (
            <div className="flex items-center gap-1.5 text-sm">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="truncate max-w-[120px]">{agent.location}</span>
            </div>
          ) : (
            "—"
          )}
        </TableCell>

        {/* Status */}
        <TableCell>
          <StatusBadge status={status} />
        </TableCell>

        {/* Last heartbeat */}
        <TableCell className="text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3 h-3" />
            {timeAgo(agent.lastHeartbeat ?? agent.lastSeen)}
          </div>
        </TableCell>

        {/* IP:Port */}
        <TableCell>
          {agent.ipAddress ? (
            <a
              href={`http://${agent.ipAddress}:${agent.port}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs hover:underline text-muted-foreground"
            >
              {agent.ipAddress}:{agent.port}
            </a>
          ) : (
            "—"
          )}
        </TableCell>

        {/* Driver version */}
        <TableCell className="text-xs text-muted-foreground font-mono">
          {agent.driverVersion ?? agent.version ?? "—"}
        </TableCell>

        {/* Queue length */}
        <TableCell className="text-sm text-center">
          {agent.queueLength !== undefined ? agent.queueLength : "—"}
        </TableCell>

        {/* Current operator */}
        <TableCell className="text-sm text-muted-foreground">
          {agent.currentOperator ?? "—"}
        </TableCell>

        {/* Actions */}
        <TableCell>
          <div className="flex items-center gap-0.5">
            {/* Ping */}
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                title="Ping scanner"
                disabled={pingResult === "pending"}
                onClick={onPing}
              >
                <Wifi className="w-3.5 h-3.5" />
              </Button>
              {pingResult !== undefined && pingResult !== "pending" && (
                <span
                  className={`text-[10px] font-mono min-w-[28px] ${pingResult === "error" ? "text-red-500" : "text-emerald-500"}`}
                >
                  {pingResult === "error" ? "err" : `${pingResult}ms`}
                </span>
              )}
            </div>

            {/* Restart */}
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              title="Restart agent"
              onClick={onRestart}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>

            {/* Maintenance toggle */}
            <Button
              size="icon"
              variant={status === "maintenance" ? "secondary" : "ghost"}
              className="h-7 w-7"
              title={
                status === "maintenance"
                  ? "Exit maintenance mode"
                  : "Enter maintenance mode"
              }
              onClick={onMaintenanceToggle}
            >
              <Wrench className="w-3.5 h-3.5" />
            </Button>

            {/* Push config */}
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              title="Push config"
              onClick={onConfig}
            >
              <Settings className="w-3.5 h-3.5" />
            </Button>

            {/* View logs */}
            <Button
              size="icon"
              variant={expanded ? "secondary" : "ghost"}
              className="h-7 w-7"
              title="View maintenance logs"
              onClick={onToggleExpand}
            >
              {expanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ScrollText className="w-3.5 h-3.5" />
              )}
            </Button>

            {/* Retire */}
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
              title="Retire scanner"
              onClick={onRetire}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {expanded && <MaintenanceLogsPanel agentId={agent.id} />}
    </>
  );
}

function OfficeGrid({ agents }: { agents: Agent[] }) {
  const byLocation = useMemo(() => {
    const map = new Map<string, Agent[]>();
    for (const agent of agents) {
      const loc = agent.location ?? "Unassigned";
      if (!map.has(loc)) map.set(loc, []);
      map.get(loc)!.push(agent);
    }
    return map;
  }, [agents]);

  const statusDot: Record<ReturnType<typeof agentStatus>, string> = {
    online: "bg-emerald-500",
    offline: "bg-slate-400",
    maintenance: "bg-amber-500",
    error: "bg-red-500",
  };

  if (byLocation.size === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-16">
        <Monitor className="w-10 h-10 mx-auto mb-3 opacity-20" />
        No scanners registered. Use <strong>Register Scanner</strong> to add
        workstations.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from(byLocation.entries()).map(([location, locationAgents]) => {
        const onlineCount = locationAgents.filter(
          (a) => agentStatus(a) === "online"
        ).length;
        return (
          <Card key={location}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <CardTitle className="text-sm truncate">{location}</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground">
                {onlineCount}/{locationAgents.length} online
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {locationAgents.map((agent) => (
                  <div
                    key={agent.id}
                    title={`${agent.name} — ${agentStatus(agent)}`}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white ${statusDot[agentStatus(agent)]}`}
                  >
                    {agent.name.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Online
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  Maintenance
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                  Offline
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export function FleetManagement() {
  const { data: agents = [], isLoading, refetch } = useAgents();
  const pingAgent = usePingAgent();
  const restartAgent = useRestartAgent();
  const setMaintenance = useSetMaintenanceMode();
  const deleteAgent = useDeleteAgent();

  const [tab, setTab] = useState<"list" | "grid">("list");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pingResults, setPingResults] = useState<
    Record<string, number | "error" | "pending">
  >({});
  const [registerOpen, setRegisterOpen] = useState(false);
  const [configAgent, setConfigAgent] = useState<Agent | null>(null);

  const online = agents.filter((a) => agentStatus(a) === "online").length;
  const offline = agents.filter((a) => agentStatus(a) === "offline").length;
  const maintenance = agents.filter(
    (a) => agentStatus(a) === "maintenance"
  ).length;

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handlePing(agent: Agent) {
    setPingResults((p) => ({ ...p, [agent.id]: "pending" }));
    pingAgent.mutate(agent.id, {
      onSuccess: (data) => {
        const ms = data?.latencyMs ?? 0;
        setPingResults((p) => ({ ...p, [agent.id]: ms }));
        toast.success(`${agent.name} responded in ${ms} ms`);
      },
      onError: () => {
        setPingResults((p) => ({ ...p, [agent.id]: "error" }));
        toast.error(`${agent.name} did not respond`);
      },
    });
  }

  function handleRestart(agent: Agent) {
    restartAgent.mutate(agent.id, {
      onSuccess: () =>
        toast.success(`Restart command sent to ${agent.name}`),
      onError: () => toast.error(`Failed to restart ${agent.name}`),
    });
  }

  function handleMaintenanceToggle(agent: Agent) {
    const enabling = agentStatus(agent) !== "maintenance";
    setMaintenance.mutate(
      { agentId: agent.id, enabled: enabling },
      {
        onSuccess: () =>
          toast.success(
            `${agent.name} ${enabling ? "entered" : "exited"} maintenance mode`
          ),
        onError: () => toast.error("Failed to update maintenance mode"),
      }
    );
  }

  function handleRetire(agent: Agent) {
    if (!window.confirm(`Retire "${agent.name}"? This cannot be undone.`))
      return;
    deleteAgent.mutate(agent.id, {
      onSuccess: () => toast.success(`${agent.name} retired`),
      onError: () => toast.error("Failed to retire scanner"),
    });
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Monitor className="w-6 h-6" />
            Scanner Fleet
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registered scan workstations. Agents check in every 60 s and apply
            pushed config automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setRegisterOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Register Scanner
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <ScannerStatCard label="Total Scanners" value={agents.length} />
        <ScannerStatCard
          label="Online"
          value={online}
          accent="green"
          sub={
            agents.length > 0
              ? `${Math.round((online / agents.length) * 100)}% available`
              : undefined
          }
        />
        <ScannerStatCard
          label="Offline"
          value={offline}
          accent={offline > 0 ? "red" : undefined}
        />
        <ScannerStatCard
          label="Maintenance"
          value={maintenance}
          accent={maintenance > 0 ? "amber" : undefined}
        />
      </div>

      {/* View tabs */}
      <div className="flex gap-1 border-b">
        {(["list", "grid"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "grid" ? "Office Map" : "List"}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "grid" ? (
        <OfficeGrid agents={agents} />
      ) : (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                Loading scanners…
              </div>
            ) : agents.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Monitor className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No scanners registered</p>
                <p className="text-sm mt-1">
                  Click{" "}
                  <strong>Register Scanner</strong> to add a scan workstation to
                  the fleet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Scanner</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Heartbeat</TableHead>
                      <TableHead>IP : Port</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead className="text-center">Queue</TableHead>
                      <TableHead>Operator</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.map((agent) => (
                      <AgentTableRow
                        key={agent.id}
                        agent={agent}
                        expanded={expanded.has(agent.id)}
                        onToggleExpand={() => toggleExpand(agent.id)}
                        pingResult={pingResults[agent.id]}
                        onPing={() => handlePing(agent)}
                        onRestart={() => handleRestart(agent)}
                        onMaintenanceToggle={() =>
                          handleMaintenanceToggle(agent)
                        }
                        onConfig={() => setConfigAgent(agent)}
                        onRetire={() => handleRetire(agent)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <RegisterScannerDialog
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
      />
      {configAgent && (
        <AgentConfigDialog
          agent={configAgent}
          onClose={() => setConfigAgent(null)}
        />
      )}
    </div>
  );
}
