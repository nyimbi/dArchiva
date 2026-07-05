// (c) Copyright Datacraft, 2026
import {
  useRoutingRules,
  useRoutingStats,
  useTestRoutingRules,
  useToggleRoutingRule,
} from '@/features/routing';
import { useStore } from '@/hooks/useStore';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { RoutingRule } from '@/types';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  FolderOpen,
  GitBranch,
  GripVertical,
  Loader2,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  Plus,
  Route,
  Tag,
  TestTube,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';

type RoutingMode = 'operational' | 'archival';

const destinationIcons = {
  folder:     FolderOpen,
  workflow:   GitBranch,
  user_inbox: User,
};

// ── RuleCard ──────────────────────────────────────────────────────────────────

function RuleCard({
  rule,
  index,
  onEdit,
  onTest,
  onDelete,
  onOptions,
}: {
  rule: RoutingRule;
  index: number;
  onEdit: (r: RoutingRule) => void;
  onTest: (r: RoutingRule) => void;
  onDelete: (r: RoutingRule) => void;
  onOptions: (r: RoutingRule) => void;
}) {
  const DestIcon =
    destinationIcons[rule.destinationType as keyof typeof destinationIcons] || FolderOpen;
  const toggleRule = useToggleRoutingRule();

  const handleToggle = () => {
    toggleRule.mutate({ id: rule.id, isActive: !rule.isActive });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="doc-card group"
    >
      <div className="flex items-start gap-3">
        <button className="mt-1 p-1 text-slate-600 hover:text-slate-400 cursor-grab">
          <GripVertical className="w-4 h-4" />
        </button>

        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-600">#{rule.priority}</span>
                <h3 className="font-medium text-slate-200">{rule.name}</h3>
              </div>
              {rule.description && (
                <p className="mt-1 text-sm text-slate-500">{rule.description}</p>
              )}
            </div>
            <button
              onClick={() => onOptions(rule)}
              className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          {/* Condition and destination */}
          <div className="mt-4 flex items-center gap-4">
            {/* Conditions */}
            <div className="flex-1">
              <p className="text-2xs text-slate-600 uppercase tracking-wider mb-1">When</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(rule.conditions || {}).map(([key, value]) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-300"
                  >
                    <Tag className="w-3 h-3 text-slate-500" />
                    {key}:{' '}
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                ))}
              </div>
            </div>

            <ArrowRight className="w-5 h-5 text-slate-600 flex-shrink-0" />

            {/* Destination */}
            <div className="flex-shrink-0">
              <p className="text-2xs text-slate-600 uppercase tracking-wider mb-1">Then</p>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-brass-500/10 border border-brass-500/20 rounded-lg">
                <DestIcon className="w-4 h-4 text-brass-400" />
                <span className="text-sm text-brass-300">
                  {rule.destinationType.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-700/50">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'badge text-2xs',
                  rule.mode === 'operational' ? 'badge-brass'
                  : rule.mode === 'archival'  ? 'badge-blue'
                  :                             'badge-gray',
                )}
              >
                {rule.mode}
              </span>
              <span
                className={cn(
                  'flex items-center gap-1 text-xs',
                  rule.isActive ? 'text-emerald-400' : 'text-slate-500',
                )}
              >
                <div
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    rule.isActive ? 'bg-emerald-400' : 'bg-slate-600',
                  )}
                />
                {rule.isActive ? 'Active' : 'Paused'}
              </span>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onTest(rule)}
                className="p-1.5 text-slate-500 hover:text-brass-400 hover:bg-slate-800 rounded"
                title="Test this rule"
              >
                <TestTube className="w-4 h-4" />
              </button>
              <button
                onClick={() => onEdit(rule)}
                className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded"
                title="Edit rule"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={handleToggle}
                disabled={toggleRule.isPending}
                className={cn(
                  'p-1.5 rounded',
                  rule.isActive
                    ? 'text-slate-500 hover:text-orange-400 hover:bg-orange-500/10'
                    : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10',
                )}
                title={rule.isActive ? 'Pause rule' : 'Activate rule'}
              >
                {toggleRule.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : rule.isActive ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => onDelete(rule)}
                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded"
                title="Delete rule"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Routing (main page) ───────────────────────────────────────────────────────

export function Routing() {
  const [testMode, setTestMode] = useState(false);
  const [testForm, setTestForm] = useState<{
    documentType: string;
    tags: string;
    content: string;
    metadata: string;
    mode: RoutingMode;
  }>({
    documentType: '',
    tags: '',
    content: '',
    metadata: '',
    mode: 'operational',
  });

  const { openModal } = useStore();

  const { data: rulesData, isLoading: rulesLoading } = useRoutingRules();
  const { data: stats, isLoading: statsLoading } = useRoutingStats();
  const testRules = useTestRoutingRules();

  const handleAddRule    = () => openModal('add-routing-rule');
  const handleEditRule   = (r: RoutingRule) => openModal('edit-routing-rule', r);
  const handleTestRule   = (r: RoutingRule) => openModal('test-routing-rule', r);
  const handleDeleteRule = (r: RoutingRule) => openModal('delete-routing-rule', r);
  const handleRuleOptions = (r: RoutingRule) => openModal('routing-rule-options', r);

  const rules = rulesData?.items || [];

  const displayStats = stats || {
    total:       rules.length,
    active:      rules.filter((r: RoutingRule) => r.isActive).length,
    operational: rules.filter((r: RoutingRule) => r.mode === 'operational' || r.mode === 'both').length,
    archival:    rules.filter((r: RoutingRule) => r.mode === 'archival' || r.mode === 'both').length,
  };

  const handleTestRules = () => {
    // Parse metadata, merge document content as metadata.content if provided
    let parsedMetadata: Record<string, unknown> = {};
    if (testForm.metadata.trim()) {
      try {
        parsedMetadata = JSON.parse(testForm.metadata);
      } catch {
        // ignore parse errors; backend will get empty metadata
      }
    }
    if (testForm.content.trim()) {
      parsedMetadata.content = testForm.content.trim();
    }

    testRules.mutate({
      documentType: testForm.documentType || undefined,
      tags: testForm.tags ? testForm.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      metadata: Object.keys(parsedMetadata).length > 0 ? parsedMetadata : undefined,
      mode: testForm.mode,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold text-slate-100">Auto-Routing Rules</h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure automatic document routing based on metadata and content
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTestMode(!testMode)}
            className={cn(
              'btn-secondary',
              testMode && 'bg-brass-500/20 border-brass-500/50 text-brass-400',
            )}
          >
            <TestTube className="w-4 h-4" />
            Test Mode
          </button>
          <button onClick={handleAddRule} className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Rule
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-sm text-slate-500">Total Rules</p>
          <p className="mt-1 text-2xl font-display font-semibold text-slate-100">
            {statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : displayStats.total}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-slate-500">Active</p>
          <p className="mt-1 text-2xl font-display font-semibold text-emerald-400">
            {statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : displayStats.active}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-slate-500">Operational</p>
          <p className="mt-1 text-2xl font-display font-semibold text-brass-400">
            {statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : displayStats.operational}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-slate-500">Archival</p>
          <p className="mt-1 text-2xl font-display font-semibold text-blue-400">
            {statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : displayStats.archival}
          </p>
        </div>
      </div>

      {/* Test Mode Panel */}
      {testMode && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="glass-card p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-slate-200 flex items-center gap-2">
              <TestTube className="w-4 h-4 text-brass-400" />
              Test Routing Rules
            </h3>
            <p className="text-xs text-slate-500">
              Simulate how rules would match an incoming document
            </p>
          </div>

          <Separator className="bg-slate-700/50" />

          {/* Paste document text */}
          <div>
            <label className="text-sm text-slate-400 mb-1 block">
              Document Text Content
              <span className="ml-1 text-slate-600 text-xs">(paste text to match content-based rules)</span>
            </label>
            <textarea
              placeholder="Paste document content here — e.g. 'INVOICE #1234 from Acme Corp...'"
              value={testForm.content}
              onChange={(e) => setTestForm({ ...testForm, content: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brass-500/50 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Document Type</label>
              <input
                type="text"
                placeholder="e.g., invoice, contract"
                value={testForm.documentType}
                onChange={(e) => setTestForm({ ...testForm, documentType: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">
                Tags
                <span className="ml-1 text-slate-600 text-xs">(comma-separated)</span>
              </label>
              <input
                type="text"
                placeholder="e.g., urgent, needs_review"
                value={testForm.tags}
                onChange={(e) => setTestForm({ ...testForm, tags: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">
                Extra Metadata
                <span className="ml-1 text-slate-600 text-xs">(JSON)</span>
              </label>
              <input
                type="text"
                placeholder='{"department": "hr"}'
                value={testForm.metadata}
                onChange={(e) => setTestForm({ ...testForm, metadata: e.target.value })}
                className="input-field font-mono text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Mode</label>
              <select
                value={testForm.mode}
                onChange={(e) => setTestForm({ ...testForm, mode: e.target.value as RoutingMode })}
                className="input-field"
              >
                <option value="operational">Operational</option>
                <option value="archival">Archival</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleTestRules}
            disabled={testRules.isPending}
            className="btn-primary"
          >
            {testRules.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <TestTube className="w-4 h-4" />
            )}
            Test Rules
          </button>

          {/* Results */}
          {testRules.data && (
            <div className="space-y-3 pt-1">
              <Separator className="bg-slate-700/50" />

              {testRules.data.matchedRules.length === 0 ? (
                <div className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-lg">
                  <XCircle className="w-5 h-5 text-slate-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-300">No rules matched</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      The document attributes did not satisfy any active routing rule conditions.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    {testRules.data.matchedRules.length} rule{testRules.data.matchedRules.length !== 1 ? 's' : ''} matched
                  </p>

                  {/* Destination */}
                  {testRules.data.destination && (
                    <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-emerald-300">
                          Document will be routed to:
                        </p>
                        <p className="text-xs text-emerald-400/80 mt-0.5">
                          {testRules.data.destination.type} — {testRules.data.destination.name}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Matched rule list */}
                  <div className="space-y-1">
                    {testRules.data.matchedRules.map((matched, i) => (
                      <div
                        key={matched.id}
                        className="flex items-center gap-3 px-3 py-2 bg-slate-800/40 rounded-lg"
                      >
                        <span className="text-xs font-mono text-slate-600 w-5 text-right flex-shrink-0">
                          #{matched.priority}
                        </span>
                        <span className="text-sm text-slate-300 flex-1">{matched.name}</span>
                        <span className={cn(
                          'badge text-2xs',
                          matched.mode === 'operational' ? 'badge-brass'
                          : matched.mode === 'archival'  ? 'badge-blue'
                          :                                'badge-gray',
                        )}>
                          {matched.mode}
                        </span>
                        {i === 0 && (
                          <span className="badge badge-green text-2xs">applied</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Rules list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider">
            Rules (ordered by priority)
          </p>
        </div>

        {rulesLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Route className="w-12 h-12 mx-auto mb-4" />
            <p className="font-medium">No routing rules configured</p>
            <p className="text-sm mt-1 text-slate-600">
              Add a rule to automatically route documents to the right destination.
            </p>
            <button onClick={handleAddRule} className="btn-primary mt-4">
              <Plus className="w-4 h-4" />
              Add First Rule
            </button>
          </div>
        ) : (
          rules
            .sort((a: RoutingRule, b: RoutingRule) => a.priority - b.priority)
            .map((rule: RoutingRule, index: number) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                index={index}
                onEdit={handleEditRule}
                onTest={handleTestRule}
                onDelete={handleDeleteRule}
                onOptions={handleRuleOptions}
              />
            ))
        )}
      </div>
    </div>
  );
}
