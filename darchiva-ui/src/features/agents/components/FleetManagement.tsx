import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
  Agent,
  AgentConfigUpdate,
  useAgents,
  useDeleteAgent,
  usePushAgentConfig,
} from "../api/hooks";

const PLATFORM_ICONS: Record<string, string> = {
  linux: "🐧",
  darwin: "🍎",
  windows: "🪟",
};

function OnlineBadge({ online }: { online: boolean }) {
  return online ? (
    <Badge variant="default" className="bg-green-600 text-white">
      Online
    </Badge>
  ) : (
    <Badge variant="secondary">Offline</Badge>
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
      { onSuccess: onClose }
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Push Config — {agent.name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          Changes will be applied on the agent's next heartbeat (within 60 s).
          Only the fields you fill in are updated; leave blank to keep the
          current value.
        </p>
        <div className="space-y-4">
          <div>
            <Label>dArchiva Server URL</Label>
            <Input
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://192.168.1.50:8000"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Default Project ID</Label>
            <Input
              value={defaultProject}
              onChange={(e) => setDefaultProject(e.target.value)}
              placeholder="proj-abc123"
              className="mt-1"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={push.isPending}>
            {push.isPending ? "Pushing…" : "Push Config"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AgentRow({ agent }: { agent: Agent }) {
  const [configOpen, setConfigOpen] = useState(false);
  const deleteAgent = useDeleteAgent();

  return (
    <>
      <TableRow>
        <TableCell>
          <div className="font-medium">{agent.name}</div>
          <div className="text-xs text-muted-foreground font-mono">
            {agent.hostname}
          </div>
        </TableCell>
        <TableCell>
          <span title={agent.platform}>
            {PLATFORM_ICONS[agent.platform] ?? "💻"} {agent.platform}
          </span>
        </TableCell>
        <TableCell>
          <OnlineBadge online={agent.online} />
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {agent.ipAddress ? (
            <a
              href={`http://${agent.ipAddress}:${agent.port}`}
              target="_blank"
              rel="noreferrer"
              className="hover:underline font-mono text-xs"
            >
              {agent.ipAddress}:{agent.port}
            </a>
          ) : (
            "—"
          )}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {agent.lastSeen
            ? new Date(agent.lastSeen).toLocaleString()
            : "Never"}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {agent.version}
        </TableCell>
        <TableCell>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfigOpen(true)}
            >
              Push Config
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={deleteAgent.isPending}
              onClick={() => deleteAgent.mutate(agent.id)}
            >
              Remove
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {configOpen && (
        <AgentConfigDialog
          agent={agent}
          onClose={() => setConfigOpen(false)}
        />
      )}
    </>
  );
}

export function FleetManagement() {
  const { data: agents = [], isLoading, refetch } = useAgents();
  const online = agents.filter((a) => a.online).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scan Agent Fleet</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registered scan workstations. Agents check in every 60 s and pick
            up pushed configuration changes automatically.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          ↺ Refresh
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Agents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{agents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Online
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{online}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Offline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-muted-foreground">
              {agents.length - online}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading agents…
            </div>
          ) : agents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p className="font-medium">No agents registered yet</p>
              <p className="text-sm mt-1">
                Install the scan agent on a workstation and configure it with
                this server's URL and an API token.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <AgentRow key={agent.id} agent={agent} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
