"use client";

import React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import useSWR from "swr";
import { useAuth } from "@/lib/auth-provider";
import {
  X,
  MessageSquare,
  Send,
  Clock,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  User,
  Loader2,
} from "lucide-react";
import type { Task, Comment, TaskPriority } from "@/lib/types";
import { TYPE_CONFIG, PRIORITY_CONFIG } from "@/lib/types";
import { cn } from "@/lib/utils";


interface TaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onEdit: (task: Task) => void;
}

// commentsFetcher is now defined inside the component to access authFetch

function PriorityIcon({ priority }: { priority: TaskPriority }) {
  switch (priority) {
    case "critical":
      return <AlertTriangle className="h-4 w-4 text-red-400" />;
    case "high":
      return <ArrowUp className="h-4 w-4 text-orange-400" />;
    case "medium":
      return <Minus className="h-4 w-4 text-yellow-400" />;
    case "low":
      return <ArrowDown className="h-4 w-4 text-muted-foreground" />;
  }
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateTime(dateString);
}

function getUserInitial(email: string) {
  return email.charAt(0).toUpperCase();
}

function getUserColor(email: string) {
  const colors = [
    "bg-blue-600",
    "bg-emerald-600",
    "bg-amber-600",
    "bg-rose-600",
    "bg-indigo-600",
    "bg-teal-600",
    "bg-orange-600",
    "bg-cyan-600",
  ];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const commentsFetcher = (url: string) => authFetch(url); // Declare commentsFetcher

export function TaskDetailDialog({
  task,
  open,
  onClose,
  onEdit,
}: TaskDetailDialogProps) {
  const { authFetch } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const commentsFetcher = useCallback(
    async (url: string): Promise<Comment[]> => {
      const res = await authFetch(url);
      if (!res.ok) throw new Error("Failed to fetch comments");
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
    [authFetch]
  );

  const {
    data: comments,
    mutate: mutateComments,
  } = useSWR<Comment[]>(
    task && open ? `/api/tasks/${task.id}/comments` : null,
    commentsFetcher,
    { fallbackData: [] }
  );

  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments]);

  if (!open || !task) return null;

  const typeConfig = TYPE_CONFIG[task.type];
  const priorityConfig = PRIORITY_CONFIG[task.priority];

  const handleSubmitComment = async () => {
    if (!newComment.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await authFetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      if (!res.ok) throw new Error("Failed to post comment");
      setNewComment("");
      mutateComments();
    } catch {
      // Error handled silently
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmitComment();
    }
  };

  const statusLabels: Record<string, string> = {
    backlog: "Backlog",
    todo: "Todo",
    in_progress: "In Progress",
    in_review: "In Review",
    done: "Done",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 flex w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl max-h-[80vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs text-muted-foreground">
                {task.task_key}
              </span>
              <span
                className={cn(
                  "rounded border px-1.5 py-0.5 text-[10px] font-medium leading-none",
                  typeConfig.color
                )}
              >
                {typeConfig.label}
              </span>
              <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                {statusLabels[task.status]}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-foreground text-balance">
              {task.title}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(task)}
              className="flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Edit
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Details */}
          <div className="grid grid-cols-2 gap-4 border-b border-border px-6 py-4">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Priority
              </span>
              <div className="flex items-center gap-1.5">
                <PriorityIcon priority={task.priority} />
                <span className={cn("text-sm", priorityConfig.color)}>
                  {priorityConfig.label}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Assignee
              </span>
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  {task.assignee || "Unassigned"}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Created
              </span>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  {formatDateTime(task.created_at)}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Labels
              </span>
              <div className="flex flex-wrap gap-1">
                {task.labels.length > 0 ? (
                  task.labels.map((label) => (
                    <span
                      key={label}
                      className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-secondary-foreground"
                    >
                      {label}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">None</span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div className="border-b border-border px-6 py-4">
              <span className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Description
              </span>
              <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          {/* Comments Section */}
          <div className="px-6 py-4">
            <div className="mb-4 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                Comments
              </span>
              {comments && comments.length > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-secondary px-1.5 text-[11px] font-medium text-secondary-foreground">
                  {comments.length}
                </span>
              )}
            </div>

            {/* Comment List */}
            <div className="flex flex-col gap-4 mb-4">
              {(!comments || comments.length === 0) && (
                <p className="py-6 text-center text-sm text-muted-foreground/60">
                  No comments yet. Be the first to comment.
                </p>
              )}
              {comments?.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div
                    className={cn(
                      "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium text-white",
                      getUserColor(comment.user_email)
                    )}
                  >
                    {getUserInitial(comment.user_email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground truncate">
                        {comment.user_email}
                      </span>
                      <span
                        className="flex-shrink-0 text-[11px] text-muted-foreground"
                        title={formatDateTime(comment.created_at)}
                      >
                        {formatRelativeTime(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={commentsEndRef} />
            </div>

            {/* Add Comment */}
            <div className="flex gap-2 items-end">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write a comment..."
                rows={2}
                className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Post comment"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {"Press Ctrl+Enter to send"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
