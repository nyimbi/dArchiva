// (c) Copyright Datacraft, 2026
import { Info, X } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEntityDocuments, useEntityGraph } from './api';
import type { EntityEdge, EntityNode } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type EntityType = 'person' | 'organization' | 'location' | 'date' | 'money' | 'other';

const ENTITY_TYPES: Array<{ value: EntityType | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'person', label: 'Person' },
  { value: 'organization', label: 'Organization' },
  { value: 'location', label: 'Location' },
  { value: 'date', label: 'Date' },
  { value: 'money', label: 'Money' },
  { value: 'other', label: 'Other' },
];

const COLOR_MAP: Record<EntityType, string> = {
  person: '#3b82f6',       // blue-500
  organization: '#22c55e', // green-500
  location: '#f59e0b',     // amber-500
  date: '#a855f7',         // purple-500
  money: '#10b981',        // emerald-500
  other: '#64748b',        // slate-500
};

const NODE_MIN_R = 12;
const NODE_MAX_R = 30;

// ---------------------------------------------------------------------------
// Layout: concentric circles by document_count bucket
// ---------------------------------------------------------------------------

interface PositionedNode extends EntityNode {
  x: number;
  y: number;
  r: number;
}

function computeLayout(
  nodes: EntityNode[],
  width: number,
  height: number,
): PositionedNode[] {
  if (!nodes.length) return [];

  const cx = width / 2;
  const cy = height / 2;

  const maxCount = Math.max(...nodes.map(n => n.document_count), 1);
  const minCount = Math.min(...nodes.map(n => n.document_count), 0);

  // Bucket nodes into 3 rings: high (inner), mid, low (outer)
  const sorted = [...nodes].sort((a, b) => b.document_count - a.document_count);
  const third = Math.ceil(sorted.length / 3);

  const rings: EntityNode[][] = [
    sorted.slice(0, third),
    sorted.slice(third, third * 2),
    sorted.slice(third * 2),
  ];

  const radii = [
    Math.min(cx, cy) * 0.25,
    Math.min(cx, cy) * 0.52,
    Math.min(cx, cy) * 0.82,
  ];

  const positioned: PositionedNode[] = [];

  for (let ri = 0; ri < rings.length; ri++) {
    const ring = rings[ri];
    const ringR = radii[ri];
    ring.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / (ring.length || 1) - Math.PI / 2;
      const range = maxCount - minCount || 1;
      const t = (node.document_count - minCount) / range;
      const nodeR = NODE_MIN_R + t * (NODE_MAX_R - NODE_MIN_R);
      positioned.push({
        ...node,
        x: cx + ringR * Math.cos(angle),
        y: cy + ringR * Math.sin(angle),
        r: nodeR,
      });
    });
  }

  return positioned;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="flex flex-col h-full gap-3 p-4 animate-pulse">
      <div className="h-9 w-96 bg-slate-800 rounded-lg" />
      <div className="flex-1 bg-slate-800/60 rounded-xl" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500">
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4" />
        <circle cx="20" cy="28" r="6" stroke="currentColor" strokeWidth="2" />
        <circle cx="44" cy="24" r="4" stroke="currentColor" strokeWidth="2" />
        <circle cx="38" cy="44" r="5" stroke="currentColor" strokeWidth="2" />
        <line x1="26" y1="28" x2="40" y2="24" stroke="currentColor" strokeWidth="1.5" />
        <line x1="44" y1="28" x2="40" y2="40" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <p className="text-sm font-medium text-slate-400">No entity relationships found</p>
      <p className="text-xs text-slate-500">Process some documents to extract entities</p>
    </div>
  );
}

interface SidePanelProps {
  node: PositionedNode;
  onClose: () => void;
}

function SidePanel({ node, onClose }: SidePanelProps) {
  const { data, isLoading } = useEntityDocuments(node.id);
  const color = COLOR_MAP[node.type as EntityType] ?? COLOR_MAP.other;

  return (
    <div className="w-72 shrink-0 border-l border-slate-800 bg-slate-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
        <span
          className="inline-block w-3 h-3 rounded-full shrink-0"
          style={{ background: color }}
        />
        <span className="font-semibold text-slate-100 truncate flex-1">{node.label}</span>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-300 transition-colors ml-1"
          aria-label="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Meta */}
      <div className="px-4 py-2 text-xs text-slate-500 border-b border-slate-800/60 flex gap-4">
        <span className="capitalize">{node.type}</span>
        <span>{node.document_count} document{node.document_count !== 1 ? 's' : ''}</span>
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-2 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-slate-800 rounded" />
            ))}
          </div>
        ) : !data?.documents.length ? (
          <p className="p-4 text-xs text-slate-500">No documents linked.</p>
        ) : (
          <ul className="divide-y divide-slate-800">
            {data.documents.map(doc => (
              <li key={doc.id} className="px-4 py-2.5 hover:bg-slate-800/50 transition-colors">
                <p className="text-sm font-medium text-slate-200 truncate">{doc.title || doc.id}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(doc.created_at).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main graph SVG renderer
// ---------------------------------------------------------------------------

interface GraphCanvasProps {
  nodes: PositionedNode[];
  edges: EntityEdge[];
  selectedId: string | null;
  onNodeClick: (node: PositionedNode) => void;
}

function GraphCanvas({ nodes, edges, selectedId, onNodeClick }: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dims, setDims] = useState({ width: 800, height: 600 });
  const [transform, setTransform] = useState({ scale: 1, tx: 0, ty: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  // Observe container size
  useEffect(() => {
    const el = svgRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDims({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const positioned = useMemo(
    () => computeLayout(nodes, dims.width, dims.height),
    [nodes, dims.width, dims.height],
  );

  const nodeById = useMemo(() => {
    const m = new Map<string, PositionedNode>();
    positioned.forEach(n => m.set(n.id, n));
    return m;
  }, [positioned]);

  const maxWeight = useMemo(
    () => Math.max(...edges.map(e => e.weight), 1),
    [edges],
  );

  // Wheel: zoom
  const onWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setTransform(t => ({
      ...t,
      scale: Math.min(4, Math.max(0.2, t.scale * factor)),
    }));
  }, []);

  // Pan
  const onMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as SVGElement).closest('circle')) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY, tx: transform.tx, ty: transform.ty };
  }, [transform]);

  const onMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    setTransform(t => ({ ...t, tx: panStart.current.tx + dx, ty: panStart.current.ty + dy }));
  }, []);

  const onMouseUp = useCallback(() => { isPanning.current = false; }, []);

  const { scale, tx, ty } = transform;

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      style={{ display: 'block', background: '#0f172a', cursor: 'grab', userSelect: 'none' }}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <g transform={`translate(${tx},${ty}) scale(${scale})`}>
        {/* Edges */}
        {edges.map((edge, i) => {
          const src = nodeById.get(edge.source);
          const tgt = nodeById.get(edge.target);
          if (!src || !tgt) return null;
          const opacity = 0.15 + 0.65 * (edge.weight / maxWeight);
          return (
            <line
              key={i}
              x1={src.x}
              y1={src.y}
              x2={tgt.x}
              y2={tgt.y}
              stroke="#475569"
              strokeWidth={1 + 2 * (edge.weight / maxWeight)}
              strokeOpacity={opacity}
            />
          );
        })}

        {/* Nodes */}
        {positioned.map(node => {
          const color = COLOR_MAP[node.type as EntityType] ?? COLOR_MAP.other;
          const isSelected = node.id === selectedId;
          return (
            <g
              key={node.id}
              transform={`translate(${node.x},${node.y})`}
              style={{ cursor: 'pointer' }}
              onClick={() => onNodeClick(node)}
            >
              {isSelected && (
                <circle
                  r={node.r + 5}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeOpacity={0.5}
                />
              )}
              <circle
                r={node.r}
                fill={color}
                fillOpacity={isSelected ? 1 : 0.8}
                stroke={isSelected ? '#f1f5f9' : '#1e293b'}
                strokeWidth={isSelected ? 2 : 1.5}
              />
              <text
                textAnchor="middle"
                dominantBaseline="hanging"
                y={node.r + 4}
                fontSize={10}
                fill="#cbd5e1"
                style={{ pointerEvents: 'none' }}
              >
                {node.label.length > 18 ? node.label.slice(0, 17) + '…' : node.label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Description banner (dismissible)
// ---------------------------------------------------------------------------

function DescriptionBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mx-4 mt-4 mb-0 shrink-0 flex items-start gap-3 px-4 py-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sm">
      <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
      <p className="flex-1 text-slate-400 leading-relaxed">
        <span className="text-sky-300 font-medium">Entity Graph</span>
        {' '}— entities (people, organizations, locations, dates, amounts) are automatically
        extracted from your documents via NLP. Node size reflects mention frequency; edges
        connect co-occurring entities. Scroll to zoom, drag to pan, click a node to see
        which documents reference it.
      </p>
      <button
        onClick={onDismiss}
        className="text-slate-600 hover:text-slate-400 transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function EntityGraphPage() {
  const [activeType, setActiveType] = useState<EntityType | 'all'>('all');
  const [selectedNode, setSelectedNode] = useState<PositionedNode | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const { data, isLoading, isError, refetch } = useEntityGraph(
    activeType === 'all' ? undefined : activeType,
  );

  const nodes = data?.nodes ?? [];
  const edges = data?.edges ?? [];

  // Placeholder dims for layout (canvas will self-size via ResizeObserver)
  const [dims] = useState({ width: 800, height: 600 });
  const positioned = useMemo(
    () => computeLayout(nodes, dims.width, dims.height),
    [nodes, dims.width, dims.height],
  );

  const handleNodeClick = useCallback((node: PositionedNode) => {
    setSelectedNode(prev => (prev?.id === node.id ? null : node));
  }, []);

  const selectedPositioned = useMemo(
    () => positioned.find(n => n.id === selectedNode?.id) ?? null,
    [positioned, selectedNode],
  );

  if (isLoading) return <LoadingSkeleton />;
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-red-400 text-sm">Failed to load entity graph.</p>
        <button
          onClick={() => void refetch()}
          className="px-3 py-1.5 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-950">
      {/* Description banner */}
      {!bannerDismissed && (
        <DescriptionBanner onDismiss={() => setBannerDismissed(true)} />
      )}

      {/* Filter bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 shrink-0 flex-wrap">
        <span className="text-xs font-medium text-slate-500 mr-1">Entity type:</span>
        {ENTITY_TYPES.map(et => (
          <button
            key={et.value}
            onClick={() => setActiveType(et.value)}
            className={[
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              activeType === et.value
                ? 'bg-slate-100 text-slate-900'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300',
            ].join(' ')}
          >
            {et.label}
          </button>
        ))}

        {/* Stats */}
        <span className="ml-auto text-xs text-slate-500">
          {nodes.length} entities · {edges.length} connections
        </span>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          {nodes.length === 0 ? (
            <EmptyState />
          ) : (
            <GraphCanvas
              nodes={positioned}
              edges={edges}
              selectedId={selectedNode?.id ?? null}
              onNodeClick={handleNodeClick}
            />
          )}

          {/* Zoom hint */}
          <div className="absolute bottom-3 left-3 text-xs text-slate-500 bg-slate-900/80 px-2 py-1 rounded shadow-sm pointer-events-none">
            Scroll to zoom · Drag to pan · Click node for details
          </div>
        </div>

        {/* Side panel */}
        {selectedPositioned && (
          <SidePanel
            node={selectedPositioned}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
}
