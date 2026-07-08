// (c) Copyright Datacraft, 2026
/**
 * Per-operator shift analytics — pages/hour, rescan rate, first-pass yield.
 * Reads from GET /supervisor/operator-kpis and /supervisor/live-ops.
 */
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import { Activity, AlertCircle, Award, Clock, TrendingDown, TrendingUp, Users, Loader2 } from 'lucide-react';

interface OperatorKPI {
  operatorId: string;
  operatorName: string;
  projectName: string;
  shiftHours: number;
  pagesScanned: number;
  pagesAccepted: number;
  pagesRescanned: number;
  pagesPerHour: number;
  rescanRate: number;
  firstPassYield: number;
  idleTimeMin: number;
  slaComplianceRate: number;
}

interface LiveOperator {
  operatorId: string;
  operatorName: string;
  status: 'scanning' | 'idle' | 'break' | 'offline';
  currentBatch: string | null;
  pagesThisSession: number;
  lastActivityAt: string;
}

type Period = 'today' | 'week' | 'month';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Today',
  week: 'This week',
  month: 'This month',
};

function KpiBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / Math.max(max, 1)) * 100));
  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function StatusDot({ status }: { status: LiveOperator['status'] }) {
  const colors: Record<LiveOperator['status'], string> = {
    scanning: 'bg-green-500',
    idle: 'bg-amber-400',
    break: 'bg-blue-400',
    offline: 'bg-muted-foreground/40',
  };
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${colors[status]} flex-shrink-0`} />
  );
}

export function OperatorAnalytics() {
  const [period, setPeriod] = useState<Period>('today');

  const { data: kpis, isLoading: loadingKpis, isError: kpisError } = useQuery<OperatorKPI[]>({
    queryKey: ['operator-kpis', period],
    queryFn: async () => {
      const { data } = await apiClient.get<OperatorKPI[]>(
        `/scanning-projects/supervisor/operator-kpis?period=${period}`
      );
      return data;
    },
    refetchInterval: 60_000,
  });

  const { data: liveOps, isLoading: loadingLive, isError: liveOpsError } = useQuery<{ operators: LiveOperator[] }>({
    queryKey: ['live-ops'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ operators: LiveOperator[] }>(
        '/scanning-projects/supervisor/live-ops'
      );
      return data;
    },
    refetchInterval: 15_000,
  });

  const maxPph = Math.max(...(kpis?.map((k) => k.pagesPerHour) ?? [1]));

  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5" /> Operator Analytics
          </h2>
          <p className="text-sm text-muted-foreground">Per-operator throughput and quality metrics.</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-36 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <SelectItem key={p} value={p}>{PERIOD_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Live status strip */}
      {loadingLive ? null : liveOpsError ? (
        <div className="flex items-center gap-2 rounded-md border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Failed to load live operator status. Check your connection and try refreshing.
        </div>
      ) : (liveOps?.operators ?? []).length > 0 && (
        <>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Users className="w-3 h-3" /> LIVE NOW
            </p>
            <div className="flex flex-wrap gap-2">
              {(liveOps?.operators ?? []).map((op) => (
                <div
                  key={op.operatorId}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-card text-xs"
                >
                  <StatusDot status={op.status} />
                  <span className="font-medium">{op.operatorName}</span>
                  <span className="text-muted-foreground">
                    {op.pagesThisSession}p
                  </span>
                </div>
              ))}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* KPI leaderboard */}
      {loadingKpis ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
        </div>
      ) : kpisError ? (
        <div className="flex items-center gap-2 rounded-md border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Failed to load operator analytics. Check your connection and try refreshing.
        </div>
      ) : (kpis ?? []).length === 0 ? (
        <p className="text-center text-muted-foreground py-10">No operator data for this period.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {(kpis ?? [])
            .slice()
            .sort((a, b) => b.pagesPerHour - a.pagesPerHour)
            .map((op, rank) => (
              <Card key={op.operatorId}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    {/* Rank badge */}
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {rank === 0 ? <Award className="w-4 h-4 text-amber-500" /> : rank + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{op.operatorName}</span>
                        <span className="text-xs text-muted-foreground">{op.projectName}</span>
                      </div>

                      {/* Pages/hour bar */}
                      <div className="mt-2 flex flex-col gap-0.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Pages/hr</span>
                          <span className="font-medium">{op.pagesPerHour.toFixed(1)}</span>
                        </div>
                        <KpiBar value={op.pagesPerHour} max={maxPph} color="bg-primary" />
                      </div>

                      {/* KPI badges */}
                      <div className="flex flex-wrap gap-2 mt-2.5">
                        <Badge variant="outline" className="text-xs gap-1">
                          <Clock className="w-3 h-3" />
                          {op.shiftHours.toFixed(1)}h shift
                        </Badge>
                        <Badge
                          variant={op.firstPassYield > 0.9 ? 'default' : 'secondary'}
                          className="text-xs gap-1"
                        >
                          {op.firstPassYield > 0.9 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          FPY {Math.round(op.firstPassYield * 100)}%
                        </Badge>
                        <Badge
                          variant={op.rescanRate < 0.05 ? 'default' : op.rescanRate < 0.1 ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          Rescan {Math.round(op.rescanRate * 100)}%
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          SLA {Math.round(op.slaComplianceRate * 100)}%
                        </Badge>
                        {op.idleTimeMin > 15 && (
                          <Badge variant="destructive" className="text-xs">
                            Idle {op.idleTimeMin}m
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Total pages */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-2xl font-bold leading-none">{op.pagesAccepted.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">pages</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
