export type TaskStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done";

export type TaskPriority = "critical" | "high" | "medium" | "low";

export type TaskType = "bug" | "feature" | "improvement" | "task";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  labels: string[];
  assignee: string;
  comments_count?: number;
  task_key: string;
  user_id: string;
  report_id: string | null;
  github_repo: string | null;
  github_issue_url: string | null;
  github_issue_number: number | null;
  github_branch: string | null;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  user_email: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export type ReportStatus = "open" | "reviewing" | "promoted" | "dismissed";

export interface Report {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  reporter_name: string;
  reporter_email: string;
  status: ReportStatus;
  user_id: string;
  promoted_task_id: string | null;
  created_at: string;
  updated_at: string;
}

export const REPORT_STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; color: string }
> = {
  open: {
    label: "Open",
    color: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  },
  reviewing: {
    label: "Reviewing",
    color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  },
  promoted: {
    label: "On Board",
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  },
  dismissed: {
    label: "Dismissed",
    color: "bg-muted text-muted-foreground border-border",
  },
};

export const STATUS_COLUMNS: {
  id: TaskStatus;
  label: string;
  info: string;
}[] = [
  { id: "backlog", label: "Backlog", info: "Triaged and waiting to be picked up" },
  { id: "todo", label: "Todo", info: "Ready to be worked on this sprint" },
  { id: "in_progress", label: "In Progress", info: "Actively being developed" },
  { id: "in_review", label: "In Review", info: "Pull request to dev made" },
  { id: "done", label: "Done", info: "Pushed to production" },
];

export const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; color: string }
> = {
  critical: { label: "Critical", color: "text-red-400" },
  high: { label: "High", color: "text-orange-400" },
  medium: { label: "Medium", color: "text-yellow-400" },
  low: { label: "Low", color: "text-muted-foreground" },
};

export const TYPE_CONFIG: Record<TaskType, { label: string; color: string }> = {
  bug: { label: "Bug", color: "bg-red-500/15 text-red-400 border-red-500/20" },
  feature: {
    label: "Feature",
    color: "bg-primary/15 text-primary border-primary/20",
  },
  improvement: {
    label: "Improvement",
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  },
  task: {
    label: "Task",
    color: "bg-muted text-muted-foreground border-border",
  },
};

export const LABEL_PRESETS = [
  "frontend",
  "backend",
  "api",
  "database",
  "ui",
  "performance",
  "security",
  "documentation",
  "testing",
  "devops",
];
