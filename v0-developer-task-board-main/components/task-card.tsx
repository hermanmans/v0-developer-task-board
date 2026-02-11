"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Pencil,
  Trash2,
  MessageSquare,
  Github,
  GitBranch,
  Handshake,
} from "lucide-react";
import type { Task, TaskPriority } from "@/lib/types";
import { TYPE_CONFIG } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onView: (task: Task) => void;
}

function formatAssigneeName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}.${parts[parts.length - 1]}`;
  }
  return parts[0] ?? "";
}

const PRIORITY_BORDER_CLASS: Record<TaskPriority, string> = {
  critical: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-yellow-500",
  low: "border-l-slate-400",
};

const PRIORITY_HOVER_BORDER_CLASS: Record<TaskPriority, string> = {
  critical: "hover:border-red-500/60",
  high: "hover:border-orange-500/60",
  medium: "hover:border-yellow-500/60",
  low: "hover:border-slate-400/60",
};

export function TaskCard({ task, onEdit, onDelete, onView }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const typeConfig = TYPE_CONFIG[task.type];
  const priorityBorderClass = PRIORITY_BORDER_CLASS[task.priority];
  const hoverInteractionClass =
    task.status === "done"
      ? "hover:shadow-sm"
      : `${PRIORITY_HOVER_BORDER_CLASS[task.priority]} hover:shadow-sm`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-lg border border-border border-l-4 bg-card p-3 transition-all cursor-pointer",
        task.status === "done" && "border-2 border-double border-emerald-500/40",
        priorityBorderClass,
        hoverInteractionClass,
        isDragging
          ? "z-50 rotate-2 shadow-xl opacity-90 scale-105"
          : ""
      )}
      onClick={() => onView(task)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onView(task);
      }}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 flex-shrink-0 cursor-grab text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          aria-label="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex-shrink-0 font-mono text-[11px] text-muted-foreground">
              {task.task_key}
            </span>
            <span
              className={cn(
                "flex-shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium leading-none",
                typeConfig.color
              )}
            >
              {typeConfig.label}
            </span>
          </div>

          <p className="text-sm font-medium leading-snug text-foreground line-clamp-2">
            {task.title}
          </p>

          {task.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="mt-2 flex items-center gap-2 flex-wrap">
              {typeof task.comments_count === "number" && task.comments_count > 0 && (
                <div
                  className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300"
                  title={`${task.comments_count} comment${
                    task.comments_count === 1 ? "" : "s"
                  }`}
                >
                  <MessageSquare className="h-3 w-3" />
                  <span>{task.comments_count}</span>
                </div>
              )}

              {(task.github_issue_url ||
                task.github_issue_number ||
                task.github_branch) && (
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  {(task.github_issue_url || task.github_issue_number) &&
                    (task.github_issue_url ? (
                      <a
                        href={task.github_issue_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground transition-colors hover:bg-secondary/80"
                        title={
                          task.github_repo && task.github_issue_number
                            ? `${task.github_repo}#${task.github_issue_number}`
                            : "GitHub issue"
                        }
                      >
                        <Github className="h-3 w-3" />
                        <span>
                          {task.github_issue_number
                            ? `#${task.github_issue_number}`
                            : "Issue"}
                        </span>
                      </a>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground"
                        title={
                          task.github_repo && task.github_issue_number
                            ? `${task.github_repo}#${task.github_issue_number}`
                            : "GitHub issue"
                        }
                      >
                        <Github className="h-3 w-3" />
                        <span>
                          {task.github_issue_number
                            ? `#${task.github_issue_number}`
                            : "Issue"}
                        </span>
                      </span>
                    ))}
                  {task.github_branch && (
                    <span
                      className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground"
                      title={`Branch: ${task.github_branch}`}
                    >
                      <GitBranch className="h-3 w-3" />
                      <span className="max-w-[120px] truncate">
                        {task.github_branch}
                      </span>
                    </span>
                  )}
                </div>
              )}

              {task.labels.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {task.labels.slice(0, 3).map((label) => (
                    <span
                      key={label}
                      className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground"
                    >
                      {label}
                    </span>
                  ))}
                  {task.labels.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{task.labels.length - 3}
                    </span>
                  )}
                </div>
              )}

              {task.assignee && (
                <div
                  className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300"
                  title={task.assignee}
                >
                  <Handshake className="h-3 w-3" />
                  <span>{formatAssigneeName(task.assignee)}</span>
                </div>
              )}

          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Edit task"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete task"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
