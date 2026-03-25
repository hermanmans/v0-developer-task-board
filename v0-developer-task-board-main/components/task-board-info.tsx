"use client";

import type { ElementType } from "react";
import {
  Activity,
  ChartNoAxesCombined,
  CalendarDays,
  Bell,
  Bug,
  Filter,
  Github,
  GripVertical,
  Sigma,
  MessageSquare,
  ShieldCheck,
  Users,
} from "lucide-react";

const SECTIONS: {
  title: string;
  icon: ElementType;
  points: string[];
}[] = [
  {
    title: "Board Basics",
    icon: Bug,
    points: [
      "Tasks are grouped by status columns: Backlog, Todo, In Progress, In Review, and Done.",
      "Priority is shown as a colored left border on each card.",
      "Use the priority legend at the top of the board to quickly read color meaning.",
    ],
  },
  {
    title: "Task Actions",
    icon: Activity,
    points: [
      "Create tasks from the New Task button or from a specific column.",
      "Open a card to view full details, comments, and GitHub links.",
      "Edit task title, description, type, labels, assignee, status, and priority.",
      "Delete actions use a warning confirmation modal before removal.",
    ],
  },
  {
    title: "Workflow",
    icon: GripVertical,
    points: [
      "Drag and drop cards between columns to update status.",
      "Card ordering and status updates are saved to the backend.",
      "Done cards are visually marked and separated from active work.",
    ],
  },
  {
    title: "Search & Filters",
    icon: Filter,
    points: [
      "Search by task title, description, task key, and labels.",
      "Filter by priority and type from the board header controls.",
      "Use Clear to reset all filters quickly.",
    ],
  },
  {
    title: "Comments & Collaboration",
    icon: MessageSquare,
    points: [
      "Comments can be posted inside task details for discussion and handover.",
      "Comment counters are shown directly on cards when comments exist.",
      "Team members invited via Profile -> Invite Team Members can work on the same board.",
    ],
  },
  {
    title: "GitHub Integration",
    icon: Github,
    points: [
      "Save encrypted GitHub token and project mappings in Profile settings.",
      "Create GitHub issues and branches directly from task details.",
      "Issue numbers and branch names appear on the task card for quick context.",
    ],
  },
  {
    title: "Scrum Extensions",
    icon: CalendarDays,
    points: [
      "Create, edit, and delete sprints with dates and status (planned, active, completed).",
      "Only one sprint can be active at a time; active sprint can be switched from the header.",
      "Tasks can be assigned to a sprint or kept in backlog (no sprint).",
      "Board supports sprint-focused filtering and a separate backlog view.",
    ],
  },
  {
    title: "Story Points & Burndown",
    icon: ChartNoAxesCombined,
    points: [
      "Estimate tasks with Fibonacci story points: 1, 2, 3, 5, 8, 13, 21.",
      "Use the Story Points helper tooltip in the task dialog for quick estimation guidance.",
      "Burndown chart shows ideal vs actual remaining points for the active sprint.",
      "Column totals include story point sums; velocity is shown from completed points.",
    ],
  },
  {
    title: "Story Point Guide",
    icon: Sigma,
    points: [
      "Fix typo -> 1 point (trivial).",
      "Simple bug fix -> 2-3 points (small effort).",
      "Medium feature -> 5 points (moderate complexity).",
      "Complex bug -> 8 points (lots of unknowns).",
      "Huge feature -> 13+ points (probably should be split).",
    ],
  },
  {
    title: "Reports & Intake",
    icon: Bell,
    points: [
      "Use Reports to capture incoming work requests before adding to the board.",
      "Reports can be reviewed and promoted into tasks for execution.",
      "Report states help track review progress separately from delivery status.",
    ],
  },
  {
    title: "Profile & Compliance",
    icon: ShieldCheck,
    points: [
      "Maintain user, company, and contact details in Profile.",
      "Manage team invite emails used for shared board access.",
      "Disclaimer and POPIA acknowledgements are stored in profile settings.",
    ],
  },
];

export function TaskBoardInfo() {
  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Task Board Info Pack</h2>
        <p className="text-sm text-muted-foreground">
          Quick reference for board functionality and team workflow.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {SECTIONS.map(({ title, icon: Icon, points }) => (
          <section
            key={title}
            className="glass-panel rounded-xl p-5"
          >
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span>{title}</span>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {points.map((point) => (
                <li key={point} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-muted-foreground/60" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="glass-panel-soft mt-6 rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Users className="h-4 w-4 text-muted-foreground" />
          Team Tip
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep `Invite Team Members` updated with valid email addresses so teammates
          can access the same board context.
        </p>
      </div>
    </div>
  );
}
