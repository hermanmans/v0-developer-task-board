"use client";

import React from "react"

import { useState, useEffect, useCallback } from "react";
import { X, Plus, CircleHelp } from "lucide-react";
import type {
  Task,
  Sprint,
  StoryPointValue,
  TaskStatus,
  TaskPriority,
  TaskType,
} from "@/lib/types";
import {
  STORY_POINTS_SCALE,
  STATUS_COLUMNS,
  PRIORITY_CONFIG,
  TYPE_CONFIG,
  LABEL_PRESETS,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface TaskDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    type: TaskType;
    labels: string[];
    assignee: string;
    sprintId: string | null;
    storyPoints: StoryPointValue | null;
  }) => void;
  initialData?: Task | null;
  defaultStatus?: TaskStatus;
  availableSprints: Sprint[];
  defaultSprintId?: string | null;
}

export function TaskDialog({
  open,
  onClose,
  onSubmit,
  initialData,
  defaultStatus = "backlog",
  availableSprints,
  defaultSprintId = null,
}: TaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [type, setType] = useState<TaskType>("task");
  const [labels, setLabels] = useState<string[]>([]);
  const [assignee, setAssignee] = useState("");
  const [sprintId, setSprintId] = useState<string | null>(defaultSprintId);
  const [storyPoints, setStoryPoints] = useState<StoryPointValue | null>(null);
  const [customLabel, setCustomLabel] = useState("");

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDescription(initialData.description);
      setStatus(initialData.status);
      setPriority(initialData.priority);
      setType(initialData.type);
      setLabels(initialData.labels);
      setAssignee(initialData.assignee);
      setSprintId(initialData.sprint_id);
      setStoryPoints(initialData.story_points);
    } else {
      setTitle("");
      setDescription("");
      setStatus(defaultStatus);
      setPriority("medium");
      setType("task");
      setLabels([]);
      setAssignee("");
      setSprintId(defaultSprintId);
      setStoryPoints(null);
    }
  }, [initialData, defaultStatus, open, defaultSprintId]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim()) return;
      onSubmit({
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        type,
        labels,
        assignee: assignee.trim(),
        sprintId,
        storyPoints,
      });
    },
    [
      title,
      description,
      status,
      priority,
      type,
      labels,
      assignee,
      sprintId,
      storyPoints,
      onSubmit,
    ]
  );

  const toggleLabel = (label: string) => {
    setLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const addCustomLabel = () => {
    const trimmed = customLabel.trim().toLowerCase();
    if (trimmed && !labels.includes(trimmed)) {
      setLabels((prev) => [...prev, trimmed]);
    }
    setCustomLabel("");
  };

  if (!open) return null;

  return (
    <TooltipProvider>
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">
            {initialData ? "Edit Task" : "New Task"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="task-title"
              className="text-sm font-medium text-foreground"
            >
              Title <span className="text-destructive">*</span>
            </label>
            <input
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Fix login redirect loop"
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="task-description"
              className="text-sm font-medium text-foreground"
            >
              Description
            </label>
            <textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the task..."
              rows={3}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="task-status"
                className="text-sm font-medium text-foreground"
              >
                Status
              </label>
              <select
                id="task-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="h-10 rounded-lg border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {STATUS_COLUMNS.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="task-priority"
                className="text-sm font-medium text-foreground"
              >
                Priority
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="h-10 rounded-lg border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="task-type"
                className="text-sm font-medium text-foreground"
              >
                Type
              </label>
              <select
                id="task-type"
                value={type}
                onChange={(e) => setType(e.target.value as TaskType)}
                className="h-10 rounded-lg border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Sprint</label>
              <select
                value={sprintId || ""}
                onChange={(e) => setSprintId(e.target.value || null)}
                className="h-10 rounded-lg border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Backlog (No Sprint)</option>
                {availableSprints.map((sprint) => (
                  <option key={sprint.id} value={sprint.id}>
                    {sprint.name} ({sprint.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <label className="text-sm font-medium text-foreground">Story Points</label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground transition-colors hover:text-foreground"
                      aria-label="Story points estimation guide"
                    >
                      <CircleHelp className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[360px] p-3" side="left">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold">Story Point Guide</p>
                      <div className="overflow-hidden rounded-md border border-border">
                        <div className="grid grid-cols-[1.2fr_.7fr_1fr] bg-secondary/70 px-2 py-1 text-[10px] font-semibold">
                          <span>Task</span>
                          <span>Points</span>
                          <span>Why</span>
                        </div>
                        <div className="grid grid-cols-[1.2fr_.7fr_1fr] px-2 py-1 text-[10px]">
                          <span>Fix typo</span>
                          <span>1</span>
                          <span>trivial</span>
                        </div>
                        <div className="grid grid-cols-[1.2fr_.7fr_1fr] border-t border-border px-2 py-1 text-[10px]">
                          <span>Simple bug fix</span>
                          <span>2-3</span>
                          <span>small effort</span>
                        </div>
                        <div className="grid grid-cols-[1.2fr_.7fr_1fr] border-t border-border px-2 py-1 text-[10px]">
                          <span>Medium feature</span>
                          <span>5</span>
                          <span>moderate complexity</span>
                        </div>
                        <div className="grid grid-cols-[1.2fr_.7fr_1fr] border-t border-border px-2 py-1 text-[10px]">
                          <span>Complex bug</span>
                          <span>8</span>
                          <span>lots of unknowns</span>
                        </div>
                        <div className="grid grid-cols-[1.2fr_.7fr_1fr] border-t border-border px-2 py-1 text-[10px]">
                          <span>Huge feature</span>
                          <span>13+</span>
                          <span>probably should be split</span>
                        </div>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex flex-wrap gap-1.5 rounded-lg border border-input bg-background px-2 py-2">
                <button
                  type="button"
                  onClick={() => setStoryPoints(null)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-xs transition-colors",
                    storyPoints === null
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-background text-muted-foreground"
                  )}
                >
                  None
                </button>
                {STORY_POINTS_SCALE.map((points) => (
                  <button
                    key={points}
                    type="button"
                    onClick={() => setStoryPoints(points)}
                    className={cn(
                      "rounded-md border px-2 py-1 text-xs transition-colors",
                      storyPoints === points
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-background text-muted-foreground"
                    )}
                  >
                    {points}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">
              Labels
            </label>
            <div className="flex flex-wrap gap-1.5">
              {LABEL_PRESETS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => toggleLabel(label)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-xs transition-colors",
                    labels.includes(label)
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomLabel();
                  }
                }}
                placeholder="Custom label..."
                className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={addCustomLabel}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="task-assignee"
              className="text-sm font-medium text-foreground"
            >
              Assignee
            </label>
            <input
              id="task-assignee"
              type="text"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="e.g. john@example.com"
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-border bg-transparent px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {initialData ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </TooltipProvider>
  );
}
