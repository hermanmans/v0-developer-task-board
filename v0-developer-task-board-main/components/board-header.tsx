"use client";

import React from "react"

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useAuth } from "@/lib/auth-provider";
import {
  Bug,
  LogOut,
  Plus,
  Search,
  Filter,
  X,
  Inbox,
  ListTodo,
  Code2,
  GitPullRequest,
  CheckCircle2,
} from "lucide-react";
import type { TaskPriority, TaskType, TaskStatus } from "@/lib/types";
import { PRIORITY_CONFIG, TYPE_CONFIG } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StatusCounts {
  backlog: number;
  todo: number;
  in_progress: number;
  in_review: number;
  done: number;
}

interface BoardHeaderProps {
  onCreateTask: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterPriority: TaskPriority | "all";
  onFilterPriority: (value: TaskPriority | "all") => void;
  filterType: TaskType | "all";
  onFilterType: (value: TaskType | "all") => void;
  statusCounts: StatusCounts;
}

const KPI_ITEMS: {
  status: TaskStatus;
  label: string;
  icon: React.ElementType;
  dotColor: string;
}[] = [
  {
    status: "backlog",
    label: "Backlog",
    icon: Inbox,
    dotColor: "bg-muted-foreground",
  },
  {
    status: "todo",
    label: "Todo",
    icon: ListTodo,
    dotColor: "bg-primary",
  },
  {
    status: "in_progress",
    label: "Active",
    icon: Code2,
    dotColor: "bg-yellow-400",
  },
  {
    status: "in_review",
    label: "Review",
    icon: GitPullRequest,
    dotColor: "bg-purple-400",
  },
  {
    status: "done",
    label: "Done",
    icon: CheckCircle2,
    dotColor: "bg-emerald-400",
  },
];

const PRIORITY_LEGEND_DOT_CLASS: Record<TaskPriority, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-slate-400",
};

export function BoardHeader({
  onCreateTask,
  searchQuery,
  onSearchChange,
  filterPriority,
  onFilterPriority,
  filterType,
  onFilterType,
  statusCounts,
}: BoardHeaderProps) {
  const router = useRouter();
  const { authFetch } = useAuth();

  const fetcher = async (url: string) => {
    const res = await authFetch(url);
    if (!res.ok) throw new Error("Failed to load profile");
    return res.json();
  };
  const { data } = useSWR("/api/profile", fetcher);
  const logoUrl = data?.profile?.company_logo_url as string | undefined;

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const hasActiveFilters =
    filterPriority !== "all" || filterType !== "all" || searchQuery !== "";

  const totalTasks = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  return (
    <header className="flex flex-col gap-4 border-b border-border bg-card px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Company logo"
                className="h-6 w-6 rounded-md object-contain"
              />
            ) : (
              <Bug className="h-5 w-5 text-primary-foreground" />
            )}
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-none tracking-tight text-foreground">
              Task Board
            </h1>
            <p className="text-xs text-muted-foreground">Task Tracker</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCreateTask}
            className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Task
          </button>
          <button
            onClick={handleLogout}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="mr-1 text-xs font-medium text-foreground/80">
          Priority Legend
        </span>
        {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((priority) => (
          <div
            key={priority}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary/40 px-2 py-1"
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                PRIORITY_LEGEND_DOT_CLASS[priority]
              )}
            />
            <span>{PRIORITY_CONFIG[priority].label}</span>
          </div>
        ))}
      </div>

      {/* Search/Filters + KPI Cards Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search + Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] max-w-[240px]">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-8 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <select
              value={filterPriority}
              onChange={(e) =>
                onFilterPriority(e.target.value as TaskPriority | "all")
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

            <select
              value={filterType}
              onChange={(e) =>
                onFilterType(e.target.value as TaskType | "all")
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

            {hasActiveFilters && (
              <button
                onClick={() => {
                  onSearchChange("");
                  onFilterPriority("all");
                  onFilterType("all");
                }}
                className="flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* KPI Cards */}
        <div className="flex items-center gap-2">
          {KPI_ITEMS.map(({ status, label, icon: Icon, dotColor }) => (
            <div
              key={status}
              className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-1.5"
            >
              <div className="flex items-center gap-1.5">
                <div className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {statusCounts[status]}
                </span>
                <span className="text-[11px] text-muted-foreground hidden sm:inline">
                  {label}
                </span>
              </div>
            </div>
          ))}
          <div className="mx-1 h-6 w-px bg-border" />
          <div className="flex items-baseline gap-1 px-1">
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {totalTasks}
            </span>
            <span className="text-[11px] text-muted-foreground">Total</span>
          </div>
        </div>
      </div>
    </header>
  );
}
