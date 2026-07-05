# Analytics, Dashboards, and Reporting Audit

## Executive Summary

- HIGH: Most audited workspaces use real API hooks, but several views collapse missing/error data into empty states or zero-like values, especially `PipelineCharts`, `SupervisorDashboard`, `CostDashboard`, and `SystemHealth`.
- HIGH: Trend coverage is incomplete for a DMS: cost trends, OCR accuracy over time by source/operator, workflow bottlenecks, queue aging, and SLA breach trends are either missing or only shown as point-in-time cards.
- HIGH: Filter UX is inconsistent. `Analytics` has preset/custom ranges and export, `SupervisorDashboard` has project/range/export for operator KPIs, but most other dashboards have no date range, no export, and no persisted filter state.
- HIGH: Supervisor coverage is directionally useful, but all-project SLA alerts are disabled by the selected-project hook behavior, and loading/error states for core supervisor datasets are not surfaced.
- MEDIUM: Responsiveness is uneven. Several dashboards use responsive grids, but `UserHomePage` and `BatchDashboard` contain fixed multi-column layouts that will degrade on mobile.

## Per-Component Findings

### `src/pages/Analytics.tsx`

| Severity | Reference | Finding |
| --- | --- | --- |
| LOW | `src/pages/Analytics.tsx:379-382`, `src/features/analytics/api.ts:118-148` | Uses real analytics API hooks for throughput, quality trend, operator performance, and capacity. No mock analytics datasets were observed in this file. |
| MEDIUM | `src/pages/Analytics.tsx:357-373`, `src/pages/Analytics.tsx:456-504` | Date range controls exist, including presets and a custom calendar, but the state is local only; no preference/localStorage persistence is used in the component. |
| MEDIUM | `src/pages/Analytics.tsx:159-164`, `src/pages/Analytics.tsx:665` | Export date range is independent from the page range. `ExportPanel` only receives `days`, then keeps separate `useDateRange`, `dateFrom`, and `dateTo` state, so exported reports can diverge from the charts. |
| HIGH | `src/features/analytics/api.ts:40-46`, `src/pages/Analytics.tsx:401`, `src/pages/Analytics.tsx:532-538` | Capacity data exposes queue depth, processing time, estimated throughput, and backlog hours, but the page only displays active workers. Key operational DMS capacity KPIs are not visualized. |
| MEDIUM | `src/pages/Analytics.tsx:423-430`, `src/pages/Analytics.tsx:624-661` | "Page Count Growth" is computed as a cumulative sum inside the selected throughput window, not actual repository/page inventory growth. This can mislead users about total archive growth. |
| MEDIUM | `src/pages/Analytics.tsx:303-311`, `src/pages/Analytics.tsx:322-331` | `DocTypeDistribution` uses real `/search/facets` data, but it handles loading and empty states only; query errors fall through to the empty-state path. |
| MEDIUM | `src/pages/Analytics.tsx:556-563`, `src/pages/Analytics.tsx:581-595`, `src/pages/Analytics.tsx:612-619` | Charts render static Recharts views with tooltips only. No drill-down handlers are wired from bars/lines to document lists, operators, or source batches. |

### `src/pages/Dashboard.tsx`

| Severity | Reference | Finding |
| --- | --- | --- |
| LOW | `src/pages/Dashboard.tsx:315-365`, `src/features/dashboard/api.ts:16-48` | Uses real API hooks for dashboard stats, pending tasks, activity, health, workers, OCR stats, and capacity. No synthetic dashboard arrays were observed beyond static widget/action configuration. |
| HIGH | `src/pages/Dashboard.tsx:65-71`, `src/pages/Dashboard.tsx:123-130`, `src/pages/Dashboard.tsx:786-792` | The widget model only supports stats, pending tasks, recent activity, quick actions, system status, and a throughput chart. DMS KPIs such as OCR accuracy trend, SLA breaches, operator performance, workflow bottlenecks, and cost trends are absent from the main dashboard. |
| MEDIUM | `src/pages/Dashboard.tsx:329-337`, `src/pages/Dashboard.tsx:681-692` | Worker status has loading handling but no `isError` branch. If `/system/workers` fails, the system-status widget can show `0 active` instead of an explicit error. |
| MEDIUM | `src/pages/Dashboard.tsx:357-365`, `src/pages/Dashboard.tsx:554-568` | Capacity query failures are not surfaced on the "Avg Processing Time" card because only `data` and `isLoading` are captured. |
| MEDIUM | `src/pages/Dashboard.tsx:811-826` | The header offers dashboard customization but no date range, export, or dashboard-level filters. Widget layout is persisted, but analytical filters are not present. |
| LOW | `src/pages/Dashboard.tsx:492-583` | Stats row is responsive, but it renders seven cards into a four-column large-screen grid, producing an uneven final row and making scan order less predictable. |

### `src/pages/SupervisorDashboard.tsx`

| Severity | Reference | Finding |
| --- | --- | --- |
| LOW | `src/pages/SupervisorDashboard.tsx:730-735`, `src/features/scanning-projects/api/hooks.ts:510-549` | Uses real supervisor APIs for live ops, operator KPIs, team summary, projects, SLA alerts, and KPI export. No mock supervisor data arrays were observed. |
| HIGH | `src/pages/SupervisorDashboard.tsx:730-735`, `src/pages/SupervisorDashboard.tsx:893-896`, `src/pages/SupervisorDashboard.tsx:957` | Core supervisor queries destructure only `data`, not `isLoading`/`isError`. Live ops and KPI failures can render as "No operator data available" or an empty KPI table. |
| HIGH | `src/pages/SupervisorDashboard.tsx:735`, `src/features/scanning-projects/api/hooks.ts:367-375`, `src/pages/SupervisorDashboard.tsx:790`, `src/pages/SupervisorDashboard.tsx:916-919` | SLA alerts are fetched with `enabled: !!projectId`, but the dashboard default is "All projects". In the default all-project view, alert panels receive no SLA data. |
| MEDIUM | `src/pages/SupervisorDashboard.tsx:134-197`, `src/pages/SupervisorDashboard.tsx:867-868` | Throughput is visualized for only the last 8 hours. The page lacks longer trend views for SLA breach rate, rescan rate, first-pass yield, and operator productivity. |
| MEDIUM | `src/pages/SupervisorDashboard.tsx:429-441`, `src/pages/SupervisorDashboard.tsx:477-549` | Operator KPIs cover pages/hour, rescan rate, first-pass yield, SLA compliance, and idle minutes, with sorting and persistence. They are tabular only; no comparative trend chart or drill-down is present. |
| MEDIUM | `src/pages/SupervisorDashboard.tsx:924-957`, `src/features/scanning-projects/api/hooks.ts:567-580` | Operator KPI export exists for CSV/PDF and range presets exist for 7/30/90 days, but the selected range is not persisted across visits. |
| LOW | `src/pages/SupervisorDashboard.tsx:765-805`, `src/pages/SupervisorDashboard.tsx:840-858` | Header controls and tab navigation are fixed horizontal flex layouts; the controls can crowd on narrow screens. |

### `src/pages/UserHomePage.tsx` and `src/features/home/`

| Severity | Reference | Finding |
| --- | --- | --- |
| LOW | `src/pages/UserHomePage.tsx:1`, `src/features/home/components/UserHomePage.tsx:59-60`, `src/features/home/api/hooks.ts:17-26` | `src/pages/UserHomePage.tsx` re-exports the real implementation. The home page uses the real `/users/me/home` aggregate API hook. |
| MEDIUM | `src/features/home/components/UserHomePage.tsx:113-119`, `src/features/home/types/index.ts:104-128` | The home page shows useful personal work stats, tasks, recent documents, favorites, activity, notifications, calendar events, and recent searches, but it is not an analytics/reporting dashboard and has no charts, date ranges, exports, or KPI trends. |
| HIGH | `src/features/home/components/UserHomePage.tsx:114`, `src/features/home/components/UserHomePage.tsx:140-169`, `src/features/home/components/UserHomePage.tsx:936-980` | Mobile responsiveness is weak: the main stats row is fixed `grid-cols-4`, the content uses fixed `grid-cols-12` with `col-span-8`/`col-span-4`, and the skeleton repeats the same desktop structure. |
| MEDIUM | `src/features/home/components/UserHomePage.tsx:248-304` | Search UI is local state plus recent-search selection. No submit/drill-down behavior is wired from this component to a results route or API call. |
| LOW | `src/features/home/components/UserHomePage.tsx:643-752` | The mini calendar uses real `calendar_events` from home data, but the calendar grid itself is locally generated from `Date` and `Array.from`; this is UI scaffolding, not synthetic dashboard data. |

### `src/features/analytics/PipelineCharts.tsx`

| Severity | Reference | Finding |
| --- | --- | --- |
| LOW | `src/features/analytics/PipelineCharts.tsx:39`, `src/features/analytics/PipelineCharts.tsx:82`, `src/features/analytics/PipelineCharts.tsx:147`, `src/features/analytics/pipelineHooks.ts:41-76` | Uses real analytics API hooks for ingest rate, classification accuracy, and storage by type. No mock pipeline datasets were observed. |
| HIGH | `src/features/analytics/PipelineCharts.tsx:54-57`, `src/features/analytics/PipelineCharts.tsx:97-100`, `src/features/analytics/PipelineCharts.tsx:168-171` | Empty arrays are truthy, so charts render with empty datasets instead of explicit empty states. Only `!data` is handled. |
| HIGH | `src/features/analytics/PipelineCharts.tsx:108-135` | Classification accuracy and `total` counts share the same 0-100 Y axis. Count values above 100 will distort or clip the secondary line. |
| MEDIUM | `src/features/analytics/PipelineCharts.tsx:39`, `src/features/analytics/PipelineCharts.tsx:82` | Ingest and classification charts are hardcoded to 30 days. There is no date picker, preset selector, or filter persistence. |
| MEDIUM | `src/features/analytics/PipelineCharts.tsx:18-21`, `src/features/analytics/PipelineCharts.tsx:149-153`, `src/features/analytics/PipelineCharts.tsx:189-193` | Storage data includes both `size_bytes` and `count`, but the chart visualizes size only. Document count by type is not surfaced. |
| MEDIUM | `src/features/analytics/PipelineCharts.tsx:204-211` | The composite has no export or drill-down affordances for any chart. |

### `src/features/batches/components/BatchDashboard.tsx`

| Severity | Reference | Finding |
| --- | --- | --- |
| LOW | `src/features/batches/components/BatchDashboard.tsx:264-278`, `src/features/batches/api.ts:25-54` | Uses real batch stats and batch list APIs. No synthetic batch datasets were observed. |
| HIGH | `src/features/batches/components/BatchDashboard.tsx:356-389` | "Batches by Status" is a row of filter buttons, not a chart. There are no throughput, completion-time, aging, SLA, rescan, or quality trend visuals for batch operations. |
| MEDIUM | `src/features/batches/components/BatchDashboard.tsx:275-278` | Batch list is capped at `limit: 20` with status filtering only. There is no pagination, search, date range, operator/project filter, or filter persistence. |
| MEDIUM | `src/features/batches/components/BatchDashboard.tsx:251-253` | The row chevron has no click handler or link, so there is no drill-down from a batch row to batch details. |
| MEDIUM | `src/features/batches/components/BatchDashboard.tsx:306-309` | "New Batch" renders as a button without a click handler, making the primary creation action non-functional in this component. |
| MEDIUM | `src/features/batches/components/BatchDashboard.tsx:322-331`, `src/features/batches/components/BatchDashboard.tsx:331-353` | Stats grids use fixed `grid-cols-4`, which is not mobile-safe. |

### `src/features/billing/components/CostDashboard.tsx`

| Severity | Reference | Finding |
| --- | --- | --- |
| LOW | `src/features/billing/components/CostDashboard.tsx:99-106`, `src/features/billing/api.ts:25-32`, `src/features/billing/api.ts:170-179` | Uses real billing dashboard and invoice APIs. No mock billing datasets were observed. |
| HIGH | `src/features/billing/components/CostDashboard.tsx:74-82`, `src/features/billing/components/CostDashboard.tsx:181-225`, `src/features/billing/components/CostDashboard.tsx:261-319` | Cost reporting is point-in-time. Projected monthly spend is computed client-side from current month spend, and there is no time-series cost trend, service trend, or forecast-confidence visualization. |
| HIGH | `src/features/billing/components/CostDashboard.tsx:405-410` | API call usage is a placeholder dash even when API call cost exists. This is a concrete data-quality gap in the usage table. |
| MEDIUM | `src/features/billing/components/CostDashboard.tsx:106`, `src/features/billing/components/CostDashboard.tsx:174-175`, `src/features/billing/components/CostDashboard.tsx:484-492` | Invoice loading/error states are not captured. `invoices ?? []` can show "No invoices yet" during loading or failure. |
| MEDIUM | `src/features/billing/components/CostDashboard.tsx:120-127`, `src/features/billing/components/CostDashboard.tsx:530-536` | The page supports refresh and per-invoice PDF links, but no date range, cost export, billing-period selector, or persisted filter state. |
| LOW | `src/features/billing/components/CostDashboard.tsx:140-150`, `src/features/billing/components/CostDashboard.tsx:188-224` | Responsive layout is mostly adequate via `grid-cols-2 md:grid-cols-4` and `grid-cols-1 lg:grid-cols-3`. |

### `src/pages/SystemHealth.tsx`

| Severity | Reference | Finding |
| --- | --- | --- |
| LOW | `src/pages/SystemHealth.tsx:682-693`, `src/features/system/api.ts:101-111`, `src/features/system/api.ts:178-199` | Uses real system health, service health, and health metrics APIs with 30-second refresh. No mock system-health datasets were observed. |
| HIGH | `src/pages/SystemHealth.tsx:183-195`, `src/pages/SystemHealth.tsx:203-219`, `src/features/system/api.ts:157-162` | Metrics include a `trend` field, but `MetricTile` only displays current value and unit. Document/OCR trend direction is not visualized. |
| MEDIUM | `src/pages/SystemHealth.tsx:686-693`, `src/pages/SystemHealth.tsx:730-769` | Service and metrics queries expose loading only in the component. Errors are collapsed into "unavailable" copy rather than explicit retry/error states. |
| MEDIUM | `src/pages/SystemHealth.tsx:344-361`, `src/pages/SystemHealth.tsx:858-871` | Queue gauges scale each queue against the current maximum queue depth, not SLA thresholds or worker capacity. This can hide operational severity when all queues are large. |
| MEDIUM | `src/pages/SystemHealth.tsx:839-885` | Health sections are operationally useful, but there are no historical charts for queue depth, worker uptime, service latency, storage growth, or search-index lag. |
| LOW | `src/pages/SystemHealth.tsx:734-744`, `src/pages/SystemHealth.tsx:800-850`, `src/pages/SystemHealth.tsx:866-880` | Most health sections use responsive grids and explicit empty states for workers and queues. |

## Recommended Additions

### `src/pages/Analytics.tsx`

- Add capacity visualizations from the existing capacity API: queue depth, projected backlog hours, estimated pages/hour, and average processing time.
- Replace the cumulative in-window "Page Count Growth" with true archive inventory growth, or rename it to "Cumulative Pages in Selected Range".
- Bind exports to the active chart range and persist range selection.
- Add drill-down from throughput bars to documents/batches processed in that bucket, from operator bars to operator detail, and from document type bars to filtered search.
- Add error handling for `DocTypeDistribution`.

### `src/pages/Dashboard.tsx`

- Add widgets for OCR accuracy trend, SLA breach count/rate, operator performance, workflow bottlenecks, and cost trend summary.
- Surface worker/capacity query errors in the relevant cards.
- Add dashboard-level date range and export controls for visible KPI summaries.
- Consider a compact KPI section that separates operational health from document/business KPIs.

### `src/pages/SupervisorDashboard.tsx`

- Add explicit loading/error states for live ops, operator KPIs, team summary, projects, and SLA alerts.
- Support all-project SLA alerts or require a project before showing the SLA alert panel.
- Add trend charts for first-pass yield, rescan rate, SLA compliance, pages/hour, idle time, and breach counts.
- Persist project, tab, and KPI date range selections.
- Add operator/batch drill-down from KPI rows and operator cards.

### `src/pages/UserHomePage.tsx` and `src/features/home/`

- Make the home layout responsive with single-column mobile fallbacks for stats and main/right columns.
- Wire search submission to the search route or API, preserving selected query and filters.
- Add optional personal trend widgets only if this page is intended to be analytical; otherwise keep it as a work queue/home surface.

### `src/features/analytics/PipelineCharts.tsx`

- Add explicit empty states for empty arrays in all three charts.
- Split classification `accuracy` and `total` onto separate axes or move `total` into tooltip/summary.
- Add date range controls and persisted range selection.
- Add document count by type alongside storage size by type.
- Add export and drill-down actions per chart.

### `src/features/batches/components/BatchDashboard.tsx`

- Add batch throughput over time, completion time distribution, batch aging, quality/rescan trend, and SLA risk charts.
- Add pagination, search, date range, operator/project filters, and persisted filter state.
- Wire row drill-down and the "New Batch" action.
- Make stats grids responsive with mobile-safe column counts.

### `src/features/billing/components/CostDashboard.tsx`

- Add cost trend over time by service, projected month-end spend trend, budget burn-down, and anomaly markers.
- Replace API call usage placeholder with real usage if available, or remove the row until the API provides usage volume.
- Add loading/error states for invoices.
- Add billing period/date range controls and export for cost reports.

### `src/pages/SystemHealth.tsx`

- Display metric `trend` values and add trend sparklines for document totals, indexed today, OCR queue depth, and failed OCR.
- Add historical queue depth, worker uptime, service latency, storage growth, and search-index lag charts.
- Use queue severity thresholds/capacity targets instead of relative-to-current-maximum scaling only.
- Add explicit error/retry states for service and metrics calls.
