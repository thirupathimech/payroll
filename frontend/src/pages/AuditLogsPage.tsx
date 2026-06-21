import { useEffect, useState } from "react";
import { auditApi } from "../api/payroll";
import { Card } from "../components/ui/Card";
import { DataTable, type Column } from "../components/ui/DataTable";
import { formatDate } from "../lib/format";
import type { AuditLog, PageResponse } from "../types";

const emptyPage: PageResponse<AuditLog> = {
  content: [],
  page: 0,
  size: 10,
  totalElements: 0,
  totalPages: 0,
  last: true,
};

export function AuditLogsPage() {
  const [logs, setLogs] = useState(emptyPage);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    auditApi
      .list({ page, size: 10 })
      .then(setLogs)
      .catch(() => setError("Only admins can view audit logs."))
      .finally(() => setLoading(false));
  }, [page]);

  const columns: Column<AuditLog>[] = [
    { header: "When", cell: (log) => formatDate(log.createdAt) },
    { header: "Actor", cell: (log) => log.actorEmail || "system" },
    { header: "Action", cell: (log) => log.action },
    { header: "Entity", cell: (log) => `${log.entityName ?? "-"} ${log.entityId ?? ""}` },
    { header: "Details", cell: (log) => log.details || "-" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-fern">Governance</p>
        <h2 className="mt-2 font-display text-3xl font-extrabold text-ink">Audit Logs</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/60">
          Important create, update, login, and approval events are recorded here for traceability.
        </p>
      </Card>

      {error && <Card className="text-sm font-semibold text-red-700">{error}</Card>}

      <DataTable
        rows={logs.content}
        columns={columns}
        loading={loading}
        page={page}
        totalPages={logs.totalPages}
        totalElements={logs.totalElements}
        onPageChange={setPage}
        getRowKey={(log) => log.id}
      />
    </div>
  );
}
