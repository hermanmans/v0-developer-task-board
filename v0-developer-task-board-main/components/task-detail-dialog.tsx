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
  Bell,
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

export function TaskDetailDialog({
  task,
  open,
  onClose,
  onEdit,
}: TaskDetailDialogProps) {
  const { authFetch } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGithubForm, setShowGithubForm] = useState(false);
  const [githubRepo, setGithubRepo] = useState("");
  const [githubProjectId, setGithubProjectId] = useState("");
  const [issueTitle, setIssueTitle] = useState("");
  const [issueBody, setIssueBody] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [createBranch, setCreateBranch] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [isGithubSubmitting, setIsGithubSubmitting] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const projectsFetcher = useCallback(
    async (url: string) => {
      const res = await authFetch(url);
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
    [authFetch]
  );

  const { data: projectsData } = useSWR(
    open ? "/api/github/projects" : null,
    projectsFetcher
  );

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

  useEffect(() => {
    if (task && open) {
      setIssueTitle(task.title || "");
      setIssueBody(task.description || "");
      setGithubRepo(task.github_repo || "");
      setGithubProjectId("");
      setGithubUsername("");
      setBranchName(task.github_branch || `issue-${task.task_key || task.id}`);
      setCreateBranch(false);
      setShowGithubForm(false);
    }
  }, [task, open]);

  const handleCreateGithubIssue = useCallback(async () => {
    if (task?.github_issue_url || task?.github_issue_number || task?.github_branch) {
      alert("This task already has a GitHub issue or branch linked.");
      return;
    }
    if (!githubRepo || !issueTitle || !task) {
      alert("Please provide repository and title");
      return;
    }
    setIsGithubSubmitting(true);
    try {
      // Strip .git from repo name if present
      const cleanRepo = githubRepo.replace(/\.git$/, "");
      const [owner, repo] = cleanRepo.split("/");
      
      if (!owner || !repo) {
        alert('Invalid repository format. Use "owner/repo"');
        setIsGithubSubmitting(false);
        return;
      }

      const res = await authFetch("/api/github/create-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          owner, 
          repo, 
          title: issueTitle, 
          issueBody, 
          labels: task.labels || [], 
          assignees: githubUsername ? [githubUsername] : [] 
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert("Failed to create issue: " + JSON.stringify(err));
        setIsGithubSubmitting(false);
        return;
      }
      const json = await res.json();
      const issue = json.issue;
      let branchResult = null;
      let finalBranchName: string | null = null;
      if (createBranch) {
        const normalizedBranchName =
          branchName.trim() || `issue-${issue?.number || task.task_key || task.id}`;
        finalBranchName = normalizedBranchName;
        const bres = await authFetch("/api/github/create-branch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner, repo, branchName: normalizedBranchName }),
        });
        if (!bres.ok) {
          const berr = await bres.json();
          alert("Issue created but failed to create branch: " + JSON.stringify(berr));
        } else {
          branchResult = await bres.json();
          const refName = branchResult?.branch?.ref;
          if (typeof refName === "string" && refName.startsWith("refs/heads/")) {
            finalBranchName = refName.replace("refs/heads/", "");
          }
        }
      }
      try {
        const issueUrl = issue?.html_url || issue?.url || null;
        const issueNumber =
          typeof issue?.number === "number" ? issue.number : null;
        await authFetch(`/api/tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            github_repo: cleanRepo,
            github_issue_url: issueUrl,
            github_issue_number: issueNumber,
            github_branch: finalBranchName,
          }),
        });
        window.dispatchEvent(new CustomEvent("tasks:changed"));
      } catch {
        alert("Issue created, but failed to link it to this task.");
      }
      alert("Issue created: " + (issue.html_url || issue.url));
      if (branchResult) alert("Branch created: " + (branchResult.branch?.ref || JSON.stringify(branchResult.branch)));
      setShowGithubForm(false);
    } catch (err: any) {
      alert("Error creating GitHub issue: " + String(err));
    } finally {
      setIsGithubSubmitting(false);
    }
  }, [githubRepo, issueTitle, issueBody, githubUsername, createBranch, branchName, task, authFetch]);

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
      window.dispatchEvent(new CustomEvent("tasks:changed"));
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

  const handleNotifyAssignee = () => {
    if (!task?.assignee) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      alert("Notifications are not supported in this browser.");
      return;
    }

    const sendNotification = () => {
      try {
        new Notification(`Notify ${task.assignee}`, {
          body: `${task.task_key}: ${task.title}`,
        });
      } catch {
        alert("Notification permission is blocked.");
      }
    };

    if (Notification.permission === "granted") {
      sendNotification();
      return;
    }

    if (Notification.permission !== "denied") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") sendNotification();
      });
      return;
    }

    alert("Notifications are blocked for this site.");
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
            {(task.github_issue_url || task.github_issue_number || task.github_branch) && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                {(task.github_issue_url || task.github_issue_number) && (
                  task.github_issue_url ? (
                    <a
                      href={task.github_issue_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground transition-colors hover:bg-secondary/80"
                    >
                      Issue {task.github_issue_number ? `#${task.github_issue_number}` : ""}
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">
                      Issue {task.github_issue_number ? `#${task.github_issue_number}` : ""}
                    </span>
                  )
                )}
                {task.github_branch && (
                  <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">
                    Branch {task.github_branch}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(task)}
              className="flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Edit
            </button>
            <button
              onClick={() => setShowGithubForm((s) => !s)}
              disabled={Boolean(task.github_issue_url || task.github_issue_number || task.github_branch)}
              className="flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              GitHub
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {showGithubForm && (
          <div className="border-b border-border px-6 py-4">
            <div className="grid grid-cols-1 gap-3 max-w-2xl">
              {projectsData?.projects && projectsData.projects.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Project
                  </label>
                  <select
                    value={githubProjectId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setGithubProjectId(nextId);
                      const project = projectsData.projects.find(
                        (p: any) => p.id === nextId
                      );
                      if (project?.owner && project?.repo) {
                        setGithubRepo(`${project.owner}/${project.repo}`);
                      }
                    }}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  >
                    <option value="">Select a project</option>
                    {projectsData.projects.map((project: any) => (
                      <option key={project.id} value={project.id}>
                        {project.display_name || `${project.owner}/${project.repo}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Repository (owner/repo)</label>
                <input
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  placeholder="owner/repo"
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Issue Title</label>
                <input
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Issue Body</label>
                <textarea
                  value={issueBody}
                  onChange={(e) => setIssueBody(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Assign to GitHub user (optional)</label>
                <input
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  placeholder="GitHub username"
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="create-branch"
                  type="checkbox"
                  checked={createBranch}
                  onChange={(e) => setCreateBranch(e.target.checked)}
                />
                <label htmlFor="create-branch" className="text-sm text-foreground">Create branch from repo default</label>
              </div>

              {createBranch && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Branch name</label>
                  <input
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGithubForm(false)}
                  className="h-9 rounded-lg border border-border bg-transparent px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGithubIssue}
                  disabled={isGithubSubmitting || Boolean(task.github_issue_url || task.github_issue_number || task.github_branch)}
                  className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGithubSubmitting ? "Creating..." : "Create on GitHub"}
                </button>
              </div>
            </div>
          </div>
        )}

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
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  {task.assignee || "Unassigned"}
                </span>
                {task.assignee && (
                  <button
                    type="button"
                    onClick={handleNotifyAssignee}
                    className="ml-1 inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground transition-colors hover:bg-secondary"
                  >
                    <Bell className="h-3 w-3" />
                    Notify
                  </button>
                )}
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
          <div className="border-t border-border bg-muted/30 px-6 py-4">
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
