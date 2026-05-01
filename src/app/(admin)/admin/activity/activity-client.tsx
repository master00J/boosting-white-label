"use client";

import { useState } from "react";
import { CheckCircle, AlertCircle, AlertTriangle, Clock, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";

type CronLog = {
  id: string;
  job_name: string;
  status: string;
  processed: number;
  errors: number;
  message: string;
  details: Record<string, unknown> | null;
  ran_at: string;
};

const JOB_LABELS: Record<string, string> = {
  payouts: "Automatic payouts",
  cleanup: "Data cleanup",
  loyalty: "Loyalty points",
  "worker-tiers": "Worker tier sync",
};

const JOB_SCHEDULES: Record<string, string> = {
  payouts: "Every Monday 08:00 UTC",
  cleanup: "Daily 03:00 UTC",
  loyalty: "1st of the month 04:00 UTC",
  "worker-tiers": "Every Sunday 06:00 UTC",
};

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  success: { icon: CheckCircle, color: "text-green-400", label: "Success" },
  error: { icon: AlertCircle, color: "text-red-400", label: "Error" },
  partial: { icon: AlertTriangle, color: "text-amber-400", label: "Partial" },
};

const JOBS = ["payouts", "cleanup", "loyalty", "worker-tiers"];

export default function ActivityClient({ cronLogs }: { cronLogs: CronLog[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [running, setRunning] = useState<string | null>(null);
  const [logs, setLogs] = useState<CronLog[]>(cronLogs);

  const filtered = filter === "all" ? logs : logs.filter((l) => l.job_name === filter);

  const triggerManual = async (jobName: string) => {
    setRunning(jobName);
    try {
      const res = await fetch(`/api/admin/cron-trigger/${jobName}`, { method: "POST" });
      const data = (await res.json()) as { success?: boolean; error?: string; processed?: number; errors?: number; details?: Record<string, unknown> };
      // Prepend a synthetic log entry
      const newLog: CronLog = {
        id: `manual-${Date.now()}`,
        job_name: jobName,
        status: data.success ? "success" : "error",
        processed: data.processed ?? 0,
        errors: data.errors ?? 0,
        message: data.error ?? `Manually triggered — ${data.processed ?? 0} processed`,
        details: data.details ?? null,
        ran_at: new Date().toISOString(),
      };
      setLogs((p) => [newLog, ...p]);
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Admin</p>
        <h1 className="font-heading text-2xl font-semibold">Activity Log</h1>
      </div>

      {/* Job overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {JOBS.map((job) => {
          const lastRun = logs.find((l) => l.job_name === job);
          const cfg = lastRun ? (STATUS_CONFIG[lastRun.status] ?? STATUS_CONFIG.success) : null;
          const StatusIcon = cfg?.icon ?? Clock;
          return (
            <div key={job} className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold truncate">{JOB_LABELS[job]}</p>
                {cfg && <StatusIcon className={`h-4 w-4 flex-shrink-0 ${cfg.color}`} />}
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-3">{JOB_SCHEDULES[job]}</p>
              {lastRun ? (
                <p className="text-xs text-[var(--text-muted)]">
                  Last run: {new Date(lastRun.ran_at).toLocaleString("en-GB")}
                </p>
              ) : (
                <p className="text-xs text-[var(--text-muted)]">Never run</p>
              )}
              <button
                onClick={() => triggerManual(job)}
                disabled={running === job}
                className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:underline disabled:opacity-40"
              >
                <RefreshCw className={`h-3 w-3 ${running === job ? "animate-spin" : ""}`} />
                {running === job ? "Running..." : "Run manually"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-[var(--bg-elevated)] rounded-xl p-1 border border-[var(--border-default)] w-fit flex-wrap">
        {[["all", "All"], ...JOBS.map((j) => [j, JOB_LABELS[j]])].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === v ? "bg-primary text-white" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Log entries */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)] text-sm">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
            No logs yet
          </div>
        ) : filtered.map((log) => {
          const cfg = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.success;
          const StatusIcon = cfg.icon;
          const isExpanded = expanded === log.id;
          return (
            <div key={log.id} className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden">
              <button
                onClick={() => setExpanded(isExpanded ? null : log.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
              >
                <StatusIcon className={`h-4 w-4 flex-shrink-0 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{JOB_LABELS[log.job_name] ?? log.job_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.color} bg-current/10`}>{cfg.label}</span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] truncate">{log.message}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-[var(--text-muted)]">{new Date(log.ran_at).toLocaleString("en-GB")}</p>
                  <p className="text-xs text-[var(--text-muted)]">{log.processed} processed · {log.errors} errors</p>
                </div>
                {isExpanded ? <ChevronDown className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />}
              </button>
              {isExpanded && log.details && (
                <div className="px-4 pb-4 border-t border-[var(--border-default)]">
                  <pre className="mt-3 text-xs text-[var(--text-muted)] bg-[var(--bg-elevated)] rounded-xl p-3 overflow-x-auto">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
