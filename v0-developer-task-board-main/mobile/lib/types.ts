export type TaskStatus =
  | "backlog"
  | "todo"
  | "in_progress"
  | "in_review"
  | "done";

export type TaskPriority = "critical" | "high" | "medium" | "low";
export type TaskType = "bug" | "feature" | "improvement" | "task";
export type ReportStatus = "open" | "reviewing" | "promoted" | "dismissed";

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

export interface Profile {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  company_logo_url: string | null;
  invite_emails: string[] | null;
  contact_number: string | null;
  disclaimer_accepted: boolean | null;
  popia_accepted: boolean | null;
  has_github_token?: boolean;
}

export interface GithubProject {
  id: string;
  owner: string;
  repo: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export const STATUS_COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "backlog", label: "Backlog" },
  { id: "todo", label: "Todo" },
  { id: "in_progress", label: "In Progress" },
  { id: "in_review", label: "In Review" },
  { id: "done", label: "Done" },
];
