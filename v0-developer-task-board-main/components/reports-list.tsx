"use client";

import React, { useState, useCallback, useEffect } from "react"
import useSWR from "swr";
import { useAuth } from "@/lib/auth-provider";
import {
  TYPE_CONFIG,
  PRIORITY_CONFIG,
  REPORT_STATUS_CONFIG,
} from "@/lib/types";
import type { Report, TaskType, TaskPriority, ReportStatus } from "@/lib/types";
import { ReportDialog } from "./report-dialog";
import { Button } from "@/components/ui/button";
import {
  Plus,
  AlertCircle,
  ArrowUpRight,
  Clock,
  Loader2,
  Search,
  Filter,
  X,
  Trash2,
  ExternalLink,
  AlertTriangle,
  ArrowUp,
  Minus,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRIORITY_ICONS: Record<TaskPriority, React.ElementType> = {
  critical: AlertCircle,
  high: ArrowUp,
  medium: Minus,
  low: ArrowDown,
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function ReportsList() {
  const { authFetch } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<TaskType | "all">("all");
  const [filterPriority, setFilterPriority] = useState<TaskPriority | "all">(
    "all"
  );
  const [filterStatus, setFilterStatus] = useState<ReportStatus | "all">("all");
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const fetcher = useCallback(
    async (url: string): Promise<Report[]> => {
      const res = await authFetch(url);
      if (!res.ok) throw new Error("Failed to fetch reports");
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
    [authFetch]
  );

    useEffect(() => {
      try {
        const raw = localStorage.getItem("hidden_promoted_reports");
        if (raw) {
          const arr: string[] = JSON.parse(raw);
          setHiddenIds(new Set(arr));
        }
      } catch {
        // ignore
      }
    }, []);

  const {
    data: reports = [],
    mutate,
    isLoading,
  } = useSWR<Report[]>("/api/reports", fetcher, { fallbackData: [] });

  const handlePromote = async (report: Report) => {
    setPromotingId(report.id);
    const previous = reports;
    const optimistic = reports.filter((r) => r.id !== report.id);
    // Add to persistent hidden set so it stays hidden across navigations
    const newHidden = new Set(hiddenIds);
    newHidden.add(report.id);
    setHiddenIds(newHidden);
    try {
      localStorage.setItem(
        "hidden_promoted_reports",
        JSON.stringify(Array.from(newHidden))
      );
    } catch {
      // ignore
    }

    // Update cache immediately so the report disappears across navigations
    mutate(optimistic, false);

    try {
      const res = await authFetch(`/api/reports/${report.id}/promote`, {
        method: "POST",
      });
      if (!res.ok) {
        // rollback
        mutate(previous, false);
        // remove from hidden set
        const rollbackHidden = new Set(hiddenIds);
        rollbackHidden.delete(report.id);
        setHiddenIds(rollbackHidden);
        try {
          localStorage.setItem(
            "hidden_promoted_reports",
            JSON.stringify(Array.from(rollbackHidden))
          );
        } catch {
          // ignore
        }
      } else {
        // revalidate in background to get authoritative data
        mutate();
      }
    } catch (e) {
      mutate(previous, false);
      const rollbackHidden = new Set(hiddenIds);
      rollbackHidden.delete(report.id);
      setHiddenIds(rollbackHidden);
      try {
        localStorage.setItem(
          "hidden_promoted_reports",
          JSON.stringify(Array.from(rollbackHidden))
        );
      } catch {
        // ignore
      }
    } finally {
      setPromotingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await authFetch(`/api/reports/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        mutate();
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleDismiss = async (id: string) => {
    await authFetch(`/api/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "dismissed" }),
    });
    mutate();
  };

  const hasActiveFilters =
    searchQuery ||
    filterType !== "all" ||
    filterPriority !== "all" ||
    filterStatus !== "all";

  const filteredReports = reports.filter((r) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !r.title.toLowerCase().includes(q) &&
        !r.description.toLowerCase().includes(q) &&
        !r.reporter_name.toLowerCase().includes(q)
      )
        return false;
    }
    if (filterType !== "all" && r.type !== filterType) return false;
    if (filterPriority !== "all" && r.priority !== filterPriority) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    return true;
  });

  const statusCounts = reports.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground font-sans">
              Reports
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="rounded-md bg-secondary/60 px-2 py-0.5 tabular-nums">
                {statusCounts.open || 0} open
              </span>
              <span className="rounded-md bg-secondary/60 px-2 py-0.5 tabular-nums">
                {statusCounts.promoted || 0} on board
              </span>
            </div>
          </div>
          <Button size="sm" onClick={() => setShowDialog(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New Report
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] max-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as ReportStatus | "all")
              }
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Statuses</option>
              {Object.entries(REPORT_STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={(e) =>
                setFilterType(e.target.value as TaskType | "all")
              }
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Types</option>
              {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
            <select
              value={filterPriority}
              onChange={(e) =>
                setFilterPriority(e.target.value as TaskPriority | "all")
              }
              className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Priorities</option>
              {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterType("all");
                  setFilterPriority("all");
                  setFilterStatus("all");
                }}
                className="flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-border">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 opacity-40" />
            <p className="text-sm">
              {hasActiveFilters
                ? "No reports match your filters"
                : "No reports yet"}
            </p>
            {!hasActiveFilters && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowDialog(true)}
                className="mt-2 gap-1.5 border-border text-muted-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                Submit the first report
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredReports.map((report) => {
              const PriorityIcon = PRIORITY_ICONS[report.priority];
              const priorityConfig = PRIORITY_CONFIG[report.priority];
              const typeConfig = TYPE_CONFIG[report.type];
              const statusConfig = REPORT_STATUS_CONFIG[report.status];
              const isPromoted = report.status === "promoted";
              const isDismissed = report.status === "dismissed";

              return (
                <div
                  key={report.id}
                  className={cn(
                    "flex items-start gap-4 px-4 py-3 transition-colors hover:bg-secondary/30",
                    isDismissed && "opacity-50"
                  )}
                >
                  {/* Priority icon */}
                  <div className="mt-0.5 flex-shrink-0">
                    <PriorityIcon
                      className={cn("h-4 w-4", priorityConfig.color)}
                    />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <h3
                        className={cn(
                          "text-sm font-medium text-foreground",
                          isDismissed && "line-through"
                        )}
                      >
                        {report.title}
                      </h3>
                      <span
                        className={cn(
                          "inline-flex flex-shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          typeConfig.color
                        )}
                      >
                        {typeConfig.label}
                      </span>
                      <span
                        className={cn(
                          "inline-flex flex-shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          statusConfig.color
                        )}
                      >
                        {statusConfig.label}
                      </span>
                    </div>
                    {report.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {report.description}
                      </p>
                    )}
                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="font-medium">
                        {report.reporter_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <time
                          dateTime={report.created_at}
                          title={new Date(report.created_at).toLocaleString()}
                        >
                          {timeAgo(report.created_at)}
                        </time>
                      </span>
                      {isPromoted && report.promoted_task_id && (
                        <a
                          href={`/board?highlight=${report.promoted_task_id}`}
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View on Board
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-shrink-0 items-center gap-1">
                    {!isPromoted && !isDismissed && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 border-border px-2 text-[11px] text-primary hover:bg-primary/10 bg-transparent"
                          onClick={() => handlePromote(report)}
                          disabled={promotingId === report.id}
                        >
                          {promotingId === report.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3" />
                          )}
                          Add to Board
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-1.5 text-muted-foreground hover:text-foreground"
                          onClick={() => handleDismiss(report.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                          <span className="sr-only">Dismiss</span>
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-1.5 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(report.id)}
                      disabled={deletingId === report.id}
                    >
                      {deletingId === report.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ReportDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onCreated={() => mutate()}
      />
    </div>
  );
}
