import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, GitBranch, Minus, Plus, UserRound, Users } from "lucide-react";
import type { EmployeeHierarchyNode } from "../../types";

function flattenNodes(nodes: EmployeeHierarchyNode[]): EmployeeHierarchyNode[] {
  return nodes.flatMap((node) => [node, ...flattenNodes(node.children)]);
}

function nodeTone(depth: number) {
  return [
    "border-moss bg-moss text-white",
    "border-lagoon bg-lagoon text-white",
    "border-fern bg-fern text-white",
    "border-ember bg-ember text-ink",
  ][Math.min(depth, 3)];
}

function OrganizationChartNode({
  node,
  depth,
  collapsedIds,
  onToggle,
  onEmployeeContextMenu,
}: {
  node: EmployeeHierarchyNode;
  depth: number;
  collapsedIds: Set<number>;
  onToggle: (id: number) => void;
  onEmployeeContextMenu: (node: EmployeeHierarchyNode, position: { x: number; y: number }, triggerElement: HTMLElement) => void;
}) {
  const hasReports = node.children.length > 0;
  const collapsed = collapsedIds.has(node.id);

  return (
    <div className="flex min-w-[13.5rem] flex-col items-center">
      <div
        tabIndex={0}
        aria-haspopup="dialog"
        aria-label={`Open quick details for ${node.fullName}`}
        title="Click, right-click, or press Enter for employee details"
        className={`w-[13.5rem] rounded-2xl border p-4 shadow-card outline-none transition focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 ${nodeTone(depth)}`}
        onClick={(event) => {
          event.stopPropagation();
          const bounds = event.currentTarget.getBoundingClientRect();
          onEmployeeContextMenu(node, { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }, event.currentTarget);
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          onEmployeeContextMenu(node, { x: event.clientX, y: event.clientY }, event.currentTarget);
        }}
        onKeyDown={(event) => {
          const opensQuickInfo = event.key === "ContextMenu" || (event.shiftKey && event.key === "F10") || event.key === "Enter" || event.key === " ";
          if (event.target !== event.currentTarget || !opensQuickInfo) {
            return;
          }
          event.preventDefault();
          const bounds = event.currentTarget.getBoundingClientRect();
          onEmployeeContextMenu(node, { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }, event.currentTarget);
        }}
      >
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15">
            <UserRound size={17} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold">{node.fullName}</p>
            <p className="mt-1 truncate text-[11px] font-bold uppercase tracking-[0.12em] opacity-75">{node.employeeCode}</p>
          </div>
          {hasReports && (
            <button
              type="button"
              aria-label={`${collapsed ? "Expand" : "Collapse"} ${node.fullName}'s reporting branch`}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-black/10 transition hover:bg-black/20"
              onClick={(event) => {
                event.stopPropagation();
                onToggle(node.id);
              }}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>
        <p className="mt-3 truncate text-xs font-semibold opacity-85">{node.designationTitle}</p>
        <p className="mt-1 truncate text-[11px] font-medium opacity-70">{node.departmentName}</p>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] font-bold opacity-85">
          <Users size={13} /> {node.directReportsCount} direct report{node.directReportsCount === 1 ? "" : "s"}
        </p>
      </div>

      {hasReports && !collapsed && (
        <div className="relative mt-10 flex min-w-max items-start justify-center gap-6 before:absolute before:left-1/2 before:top-[-24px] before:h-6 before:w-px before:bg-moss/25">
          {node.children.map((child, index) => (
            <div key={child.id} className="relative flex flex-col items-center">
              <div className="absolute -top-6 left-1/2 h-6 w-px bg-moss/25" />
              {node.children.length > 1 && (
                <div
                  className={`absolute -top-6 h-px bg-moss/25 ${
                    index === 0
                      ? "left-1/2 right-0"
                      : index === node.children.length - 1
                        ? "left-0 right-1/2"
                        : "left-0 right-0"
                  }`}
                />
              )}
              <OrganizationChartNode node={child} depth={depth + 1} collapsedIds={collapsedIds} onToggle={onToggle} onEmployeeContextMenu={onEmployeeContextMenu} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function OrganizationChart({
  roots,
  onEmployeeContextMenu,
}: {
  roots: EmployeeHierarchyNode[];
  onEmployeeContextMenu: (node: EmployeeHierarchyNode, position: { x: number; y: number }, triggerElement: HTMLElement) => void;
}) {
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(() => new Set());
  const [zoom, setZoom] = useState(1);
  const allNodes = useMemo(() => flattenNodes(roots), [roots]);
  const parentNodeIds = useMemo(() => allNodes.filter((node) => node.children.length > 0).map((node) => node.id), [allNodes]);
  const zoomPercent = Math.round(zoom * 100);
  const canZoomIn = zoom < 1.5;
  const canZoomOut = zoom > 0.5;

  function toggleNode(id: number) {
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="rounded-[2rem] border border-moss/10 bg-white/70 p-5 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Organization Chart</p>
          <h3 className="mt-2 font-display text-2xl font-extrabold text-ink">Reporting structure</h3>
          <p className="mt-1 text-sm text-ink/55">{allNodes.length} employee{allNodes.length === 1 ? "" : "s"} across {roots.length} top-level branch{roots.length === 1 ? "" : "es"}.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex items-center rounded-xl border border-moss/15 bg-white p-1" aria-label={`Chart zoom: ${zoomPercent}%`}>
            <button
              type="button"
              aria-label="Zoom out"
              title="Zoom out"
              disabled={!canZoomOut}
              className="grid h-7 w-7 place-items-center rounded-lg text-moss transition hover:bg-moss/5 disabled:cursor-not-allowed disabled:opacity-35"
              onClick={() => setZoom((current) => Math.max(0.5, Number((current - 0.1).toFixed(1))))}
            >
              <Minus size={15} />
            </button>
            <span className="min-w-11 text-center text-[11px] font-bold tabular-nums text-ink/65" aria-live="polite">{zoomPercent}%</span>
            <button
              type="button"
              aria-label="Zoom in"
              title="Zoom in"
              disabled={!canZoomIn}
              className="grid h-7 w-7 place-items-center rounded-lg text-moss transition hover:bg-moss/5 disabled:cursor-not-allowed disabled:opacity-35"
              onClick={() => setZoom((current) => Math.min(1.5, Number((current + 0.1).toFixed(1))))}
            >
              <Plus size={15} />
            </button>
          </div>
          <button type="button" className="rounded-xl border border-moss/15 bg-white px-3 py-2 text-xs font-bold text-moss transition hover:bg-moss/5" onClick={() => setCollapsedIds(new Set())}>
            Expand all
          </button>
          <button type="button" className="rounded-xl border border-moss/15 bg-white px-3 py-2 text-xs font-bold text-moss transition hover:bg-moss/5" onClick={() => setCollapsedIds(new Set(parentNodeIds))}>
            Collapse all
          </button>
        </div>
      </div>

      <div className="mt-8 overflow-auto pb-4">
        <div className="flex min-w-max items-start justify-center gap-12 px-8 py-2" style={{ zoom }}>
          {roots.map((root) => (
            <OrganizationChartNode key={root.id} node={root} depth={0} collapsedIds={collapsedIds} onToggle={toggleNode} onEmployeeContextMenu={onEmployeeContextMenu} />
          ))}
        </div>
      </div>
      <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-ink/45"><GitBranch size={14} /> Use each arrow to expand or collapse a reporting branch.</p>
    </div>
  );
}
