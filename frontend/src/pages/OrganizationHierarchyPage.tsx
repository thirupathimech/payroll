import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, BriefcaseBusiness, Building2, GitBranch, MapPin, RefreshCw, UserRound, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { employeeApi } from "../api/payroll";
import { getErrorMessage } from "../api/client";
import { OrganizationChart } from "../components/employee/OrganizationChart";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import type { EmployeeHierarchyNode } from "../types";

interface EmployeeQuickInfo {
  node: EmployeeHierarchyNode;
  x: number;
  y: number;
  compact: boolean;
  triggerElement: HTMLElement;
}

export function OrganizationHierarchyPage() {
  const [roots, setRoots] = useState<EmployeeHierarchyNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quickInfo, setQuickInfo] = useState<EmployeeQuickInfo | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const quickInfoRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const loadHierarchy = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRoots(await employeeApi.organizationHierarchy());
    } catch (apiError) {
      setError(getErrorMessage(apiError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHierarchy();
  }, [loadHierarchy]);

  const closeQuickInfo = useCallback((restoreFocus = true) => {
    const triggerElement = quickInfo?.triggerElement;
    setQuickInfo(null);
    if (restoreFocus && triggerElement) {
      window.requestAnimationFrame(() => triggerElement.focus());
    }
  }, [quickInfo]);

  useEffect(() => {
    if (!quickInfo) {
      return undefined;
    }

    quickInfoRef.current?.focus();

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeQuickInfo();
      }
    }

    function closeOnOutsideClick() {
      closeQuickInfo(false);
    }

    window.addEventListener("click", closeOnOutsideClick);
    window.addEventListener("resize", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("click", closeOnOutsideClick);
      window.removeEventListener("resize", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeQuickInfo, quickInfo]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";
    if (!quickInfo?.node.hasProfilePhoto) {
      setProfilePhotoUrl("");
      return () => undefined;
    }

    setProfilePhotoUrl("");
    employeeApi
      .getProfilePhoto(quickInfo.node.id)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setProfilePhotoUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setProfilePhotoUrl("");
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [quickInfo?.node.hasProfilePhoto, quickInfo?.node.id]);

  function openQuickInfo(node: EmployeeHierarchyNode, position: { x: number; y: number }, triggerElement: HTMLElement) {
    const margin = 16;
    const compact = window.innerWidth < 640;
    const popupWidth = Math.min(368, window.innerWidth - margin * 2);
    const popupHeight = Math.min(500, window.innerHeight - margin * 2);
    setQuickInfo({
      node,
      x: compact ? margin : Math.max(margin, Math.min(position.x, window.innerWidth - popupWidth - margin)),
      y: compact ? margin : Math.max(margin, Math.min(position.y, window.innerHeight - popupHeight - margin)),
      compact,
      triggerElement,
    });
  }

  function viewEmployee(employeeId: number) {
    setQuickInfo(null);
    navigate(`/employees?employeeId=${employeeId}`);
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Organization</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-ink">Organization hierarchy</h2>
            <p className="mt-2 text-sm text-ink/60">View every current employee and their reporting structure across the organization.</p>
          </div>
          <Button type="button" variant="secondary" onClick={loadHierarchy} disabled={loading}>
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            {loading ? "Loading..." : "Refresh chart"}
          </Button>
        </div>
      </Card>

      {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

      <Card>
        {loading ? (
          <div className="grid min-h-64 place-items-center text-sm font-semibold text-ink/55">Loading organization hierarchy…</div>
        ) : roots.length > 0 ? (
          <OrganizationChart roots={roots} onEmployeeContextMenu={openQuickInfo} />
        ) : error ? (
          <div className="grid min-h-64 place-items-center rounded-3xl bg-red-50 p-8 text-center">
            <div>
              <GitBranch className="mx-auto text-red-700" size={30} />
              <p className="mt-3 font-display text-xl font-extrabold text-ink">Organization chart could not load</p>
              <p className="mt-1 text-sm text-ink/55">Try refreshing the chart in a moment.</p>
            </div>
          </div>
        ) : (
          <div className="grid min-h-64 place-items-center rounded-3xl bg-oat/60 p-8 text-center">
            <div>
              <GitBranch className="mx-auto text-fern" size={30} />
              <p className="mt-3 font-display text-xl font-extrabold text-ink">No employees to display yet</p>
              <p className="mt-1 text-sm text-ink/55">Add employees, then assign reporting managers to show reporting lines.</p>
            </div>
          </div>
        )}
      </Card>

      {quickInfo && (
        <div
          ref={quickInfoRef}
          role="dialog"
          tabIndex={-1}
          aria-label={`${quickInfo.node.fullName} details`}
          className={`fixed z-[70] max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl border border-moss/10 bg-white shadow-card ${
            quickInfo.compact ? "inset-x-4 bottom-4 max-w-none p-4" : "w-[calc(100vw-2rem)] max-w-[23rem] p-5"
          }`}
          style={quickInfo.compact ? undefined : { left: quickInfo.x, top: quickInfo.y }}
          onClick={(event) => event.stopPropagation()}
          onBlur={(event) => {
            if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
              closeQuickInfo(false);
            }
          }}
        >
          <div className="flex items-start gap-3">
            {profilePhotoUrl ? (
              <img src={profilePhotoUrl} alt={quickInfo.node.fullName} className="h-14 w-14 rounded-2xl object-cover ring-2 ring-moss/15 sm:h-16 sm:w-16" />
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-moss text-white sm:h-16 sm:w-16">
                <UserRound size={25} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="break-words font-display text-base font-extrabold text-ink sm:text-lg">{quickInfo.node.fullName}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-fern">{quickInfo.node.employeeCode}</p>
            </div>
            <button
              type="button"
              aria-label="Close employee details"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-ink/45 transition hover:bg-oat hover:text-ink"
              onClick={() => closeQuickInfo()}
            >
              <X size={17} />
            </button>
          </div>

          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <div className="rounded-2xl bg-oat/60 p-3">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink/45"><BriefcaseBusiness size={12} /> Designation</p>
              <p className="mt-1 break-words text-xs font-bold text-ink">{quickInfo.node.designationTitle}</p>
            </div>
            <div className="rounded-2xl bg-oat/60 p-3">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink/45"><Building2 size={12} /> Department</p>
              <p className="mt-1 break-words text-xs font-bold text-ink">{quickInfo.node.departmentName}</p>
            </div>
            <div className="rounded-2xl bg-oat/60 p-3 sm:col-span-2">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink/45"><MapPin size={12} /> Branch</p>
              <p className="mt-1 break-words text-xs font-bold text-ink">{quickInfo.node.branchName || "Not assigned"}</p>
            </div>
            <div className="rounded-2xl bg-oat/60 p-3 sm:col-span-2">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink/45"><GitBranch size={12} /> Reporting manager</p>
              <p className="mt-1 break-words text-xs font-bold text-ink">{quickInfo.node.managerName || "Top-level employee"}</p>
            </div>
            <div className="rounded-2xl bg-oat/60 p-3 sm:col-span-2">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ink/45"><Users size={12} /> Direct reports</p>
              <p className="mt-1 text-xs font-bold text-ink">{quickInfo.node.directReportsCount} employee{quickInfo.node.directReportsCount === 1 ? "" : "s"}</p>
            </div>
          </div>

          <div className="sticky bottom-0 -mx-4 mt-4 border-t border-moss/10 bg-white/95 px-4 pb-1 pt-3 backdrop-blur-sm sm:-mx-5 sm:px-5">
            <Button type="button" className="w-full" onClick={() => viewEmployee(quickInfo.node.id)}>
              View Employee <ArrowUpRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
