import { useEffect, useMemo, useState } from "react";
import { UserRound } from "lucide-react";
import { employeeApi } from "../../api/payroll";
import type { EmployeeHierarchy, EmployeeHierarchyNode } from "../../types";

function flattenNodes(nodes: EmployeeHierarchyNode[]): EmployeeHierarchyNode[] {
  return nodes.flatMap((node) => [node, ...flattenNodes(node.children)]);
}

function NodeAvatar({
  node,
  photoUrl,
  emphasized = false,
}: {
  node: EmployeeHierarchyNode;
  photoUrl?: string;
  emphasized?: boolean;
}) {
  if (photoUrl) {
    return <img src={photoUrl} alt={node.fullName} className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white/50" />;
  }

  return (
    <div
      className={`grid h-12 w-12 place-items-center rounded-2xl ${emphasized ? "bg-white/15 text-white" : "bg-oat text-ink"}`}
    >
      <UserRound size={18} />
    </div>
  );
}

function TreeCard({
  node,
  photoUrls,
  emphasized = false,
}: {
  node: EmployeeHierarchyNode;
  photoUrls: Record<number, string>;
  emphasized?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-4 ${
        emphasized ? "border-moss/25 bg-moss text-white shadow-glow" : "border-moss/10 bg-white/85"
      }`}
    >
      <div className="flex items-center gap-3">
        <NodeAvatar node={node} photoUrl={photoUrls[node.id]} emphasized={emphasized} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{node.fullName}</p>
          <p className={`truncate text-xs font-semibold uppercase tracking-[0.16em] ${emphasized ? "text-white/70" : "text-ink/45"}`}>
            {node.employeeCode}
          </p>
          <p className={`mt-1 truncate text-sm ${emphasized ? "text-white/85" : "text-ink/60"}`}>
            {node.designationTitle} · {node.departmentName}
          </p>
        </div>
        <div className="ml-auto rounded-full bg-black/5 px-3 py-1 text-xs font-bold text-current/75">
          {node.directReportsCount} reports
        </div>
      </div>
    </div>
  );
}

function DescendantTree({
  node,
  photoUrls,
}: {
  node: EmployeeHierarchyNode;
  photoUrls: Record<number, string>;
}) {
  return (
    <div className="relative pl-8">
      <div className="absolute left-3 top-0 h-full w-px bg-moss/20" />
      <div className="absolute left-[10px] top-7 h-3 w-3 rounded-full border-2 border-moss bg-shell" />
      <TreeCard node={node} photoUrls={photoUrls} />
      {node.children.length > 0 && (
        <div className="mt-3 space-y-3">
          {node.children.map((child) => (
            <DescendantTree key={child.id} node={child} photoUrls={photoUrls} />
          ))}
        </div>
      )}
    </div>
  );
}

export function HierarchyChart({ hierarchy }: { hierarchy: EmployeeHierarchy }) {
  const [photoUrls, setPhotoUrls] = useState<Record<number, string>>({});
  const allNodes = useMemo(
    () => [...hierarchy.ancestors, hierarchy.current, ...flattenNodes(hierarchy.descendants)],
    [hierarchy],
  );

  useEffect(() => {
    let cancelled = false;
    const urlsToRevoke: string[] = [];
    const nodesWithPhotos = allNodes.filter((node) => node.hasProfilePhoto);

    if (nodesWithPhotos.length === 0) {
      setPhotoUrls({});
      return () => undefined;
    }

    Promise.all(
      nodesWithPhotos.map(async (node) => {
        try {
          const blob = await employeeApi.getProfilePhoto(node.id);
          const url = URL.createObjectURL(blob);
          urlsToRevoke.push(url);
          return [node.id, url] as const;
        } catch {
          return null;
        }
      }),
    ).then((entries) => {
      if (cancelled) {
        urlsToRevoke.forEach((url) => URL.revokeObjectURL(url));
        return;
      }
      setPhotoUrls(
        Object.fromEntries(entries.filter((entry): entry is readonly [number, string] => entry !== null)),
      );
    });

    return () => {
      cancelled = true;
      urlsToRevoke.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [allNodes]);

  const ancestorChain = [...hierarchy.ancestors, hierarchy.current];

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {ancestorChain.map((node, index) => {
          const isCurrent = index === ancestorChain.length - 1;
          return (
            <div key={node.id} className="relative">
              {index < ancestorChain.length - 1 && <div className="absolute left-6 top-full h-4 w-px bg-moss/20" />}
              <TreeCard node={node} photoUrls={photoUrls} emphasized={isCurrent} />
            </div>
          );
        })}
      </div>

      <div className="rounded-3xl border border-moss/10 bg-white/75 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-fern">Hierarchy Chart</p>
        <div className="mt-4">
          {hierarchy.descendants.length === 0 ? (
            <p className="rounded-3xl bg-oat/60 p-4 text-sm font-semibold text-ink/55">No subordinate branches yet.</p>
          ) : (
            <div className="space-y-3">
              {hierarchy.descendants.map((node) => (
                <DescendantTree key={node.id} node={node} photoUrls={photoUrls} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
