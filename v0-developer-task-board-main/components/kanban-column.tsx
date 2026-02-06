"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, Info } from "lucide-react";
import type { Task, TaskStatus } from "@/lib/types";
import { TaskCard } from "./task-card";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  id: TaskStatus;
  title: string;
  info: string;
  tasks: Task[];
  onCreateTask: (status: TaskStatus) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onViewTask: (task: Task) => void;
}

const STATUS_BADGE_COLORS: Record<TaskStatus, string> = {
  backlog: "bg-muted-foreground/20 text-muted-foreground",
  todo: "bg-primary/20 text-primary",
  in_progress: "bg-yellow-500/20 text-yellow-400",
  in_review: "bg-purple-500/20 text-purple-400",
  done: "bg-emerald-500/20 text-emerald-400",
};

const STATUS_DOT_COLORS: Record<TaskStatus, string> = {
  backlog: "bg-muted-foreground",
  todo: "bg-primary",
  in_progress: "bg-yellow-400",
  in_review: "bg-purple-400",
  done: "bg-emerald-400",
};

export function KanbanColumn({
  id,
  title,
  info,
  tasks,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  onViewTask,
}: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id });
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className={cn(
        "flex w-72 flex-shrink-0 flex-col rounded-xl border border-border bg-secondary/30 transition-colors lg:w-auto lg:flex-1",
        isOver && "border-primary/40 bg-primary/5"
      )}
    >
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <div
            className={cn("h-2 w-2 rounded-full", STATUS_DOT_COLORS[id])}
          />
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/50 transition-colors hover:text-muted-foreground"
              aria-label={`Info: ${info}`}
            >
              <Info className="h-3.5 w-3.5" />
            </button>
            {showTooltip && (
              <div className="absolute left-1/2 top-full z-50 mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2.5 py-1.5 text-[11px] text-popover-foreground shadow-md">
                {info}
                <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-l border-t border-border bg-popover" />
              </div>
            )}
          </div>
          <span
            className={cn(
              "flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-medium",
              STATUS_BADGE_COLORS[id]
            )}
          >
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onCreateTask(id)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label={`Add task to ${title}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2"
        style={{ minHeight: "120px" }}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onView={onViewTask}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-xs text-muted-foreground/60">No tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}
