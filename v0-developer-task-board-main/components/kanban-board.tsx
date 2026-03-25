"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-provider";
import useSWR from "swr";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type {
  Sprint,
  Task,
  StoryPointValue,
  TaskStatus,
  TaskPriority,
  TaskType,
} from "@/lib/types";
import { STATUS_COLUMNS } from "@/lib/types";
import { BoardHeader } from "./board-header";
import { KanbanColumn } from "./kanban-column";
import { TaskCard } from "./task-card";
import { TaskDialog } from "./task-dialog";
import { TaskDetailDialog } from "./task-detail-dialog";
import { SprintBurndownChart } from "./sprint-burndown-chart";
import { SprintManagementDialog } from "./sprint-management-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

export function KanbanBoard() {
  const { authFetch } = useAuth();

  const fetcher = useCallback(
    async (url: string): Promise<Task[]> => {
      const res = await authFetch(url);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const json = await res.json();
      if (Array.isArray(json)) return json as Task[];
      if (json && Array.isArray(json.data)) return json.data as Task[];
      return [];
    },
    [authFetch]
  );

  const {
    data: tasks,
    error,
    isLoading,
    mutate,
  } = useSWR<Task[]>("/api/tasks", fetcher, { fallbackData: [] });

  const sprintFetcher = useCallback(
    async (url: string): Promise<Sprint[]> => {
      const res = await authFetch(url);
      if (!res.ok) throw new Error("Failed to fetch sprints");
      const json = await res.json();
      return Array.isArray(json) ? (json as Sprint[]) : [];
    },
    [authFetch]
  );

  const {
    data: sprints,
    mutate: mutateSprints,
  } = useSWR<Sprint[]>("/api/sprints", sprintFetcher, { fallbackData: [] });

  useEffect(() => {
    const handleTasksChanged = () => {
      mutate();
    };
    window.addEventListener("tasks:changed", handleTasksChanged);
    return () => window.removeEventListener("tasks:changed", handleTasksChanged);
  }, [mutate]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("backlog");
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [sprintDialogOpen, setSprintDialogOpen] = useState(false);
  const [isBurndownMinimized, setIsBurndownMinimized] = useState(false);
  const [pendingDeleteTaskId, setPendingDeleteTaskId] = useState<string | null>(
    null
  );
  const activeTaskRef = useRef<Task | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState<TaskPriority | "all">(
    "all"
  );
  const [filterType, setFilterType] = useState<TaskType | "all">("all");
  const [sprintFilter, setSprintFilter] = useState<"all" | "active" | "backlog">(
    "all"
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("burndown:minimized");
    if (saved === "1") {
      setIsBurndownMinimized(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("burndown:minimized", isBurndownMinimized ? "1" : "0");
  }, [isBurndownMinimized]);

  const activeSprint = useMemo(
    () => sprints?.find((sprint) => sprint.status === "active") ?? null,
    [sprints]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Status counts from ALL tasks (unfiltered) for KPI cards
  const statusCounts = useMemo(() => {
    const allTasks = tasks && Array.isArray(tasks) ? tasks : [];
    return {
      backlog: allTasks.filter((t) => t.status === "backlog").length,
      todo: allTasks.filter((t) => t.status === "todo").length,
      in_progress: allTasks.filter((t) => t.status === "in_progress").length,
      in_review: allTasks.filter((t) => t.status === "in_review").length,
      done: allTasks.filter((t) => t.status === "done").length,
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) return [];
    return tasks.filter((task) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query) ||
          task.task_key.toLowerCase().includes(query) ||
          task.labels.some((l) => l.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }
      if (filterPriority !== "all" && task.priority !== filterPriority)
        return false;
      if (filterType !== "all" && task.type !== filterType) return false;

      if (sprintFilter === "backlog") {
        return task.sprint_id === null;
      }

      if (sprintFilter === "active" && activeSprint) {
        return task.sprint_id === activeSprint.id || task.sprint_id === null;
      }

      if (sprintFilter === "active" && !activeSprint) {
        return task.sprint_id === null;
      }

      return true;
    });
  }, [tasks, searchQuery, filterPriority, filterType, sprintFilter, activeSprint]);

  const activeSprintTasks = useMemo(() => {
    if (!activeSprint) return filteredTasks;
    if (sprintFilter !== "active") return filteredTasks;
    return filteredTasks.filter((task) => task.sprint_id === activeSprint.id);
  }, [filteredTasks, activeSprint, sprintFilter]);

  const backlogTasks = useMemo(() => {
    if (sprintFilter !== "active" || !activeSprint) return [];
    return filteredTasks.filter((task) => task.sprint_id === null);
  }, [filteredTasks, sprintFilter, activeSprint]);

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
    };
    for (const task of activeSprintTasks) {
      map[task.status].push(task);
    }
    return map;
  }, [activeSprintTasks]);

  const backlogByStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
    };
    for (const task of backlogTasks) {
      map[task.status].push(task);
    }
    return map;
  }, [backlogTasks]);

  const storyPointsByStatus = useMemo(() => {
    const sums: Record<TaskStatus, number> = {
      backlog: 0,
      todo: 0,
      in_progress: 0,
      in_review: 0,
      done: 0,
    };

    Object.entries(tasksByStatus).forEach(([status, statusTasks]) => {
      sums[status as TaskStatus] = statusTasks.reduce(
        (sum, task) => sum + (task.story_points || 0),
        0
      );
    });

    return sums;
  }, [tasksByStatus]);

  const backlogStoryPointsByStatus = useMemo(() => {
    const sums: Record<TaskStatus, number> = {
      backlog: 0,
      todo: 0,
      in_progress: 0,
      in_review: 0,
      done: 0,
    };

    Object.entries(backlogByStatus).forEach(([status, statusTasks]) => {
      sums[status as TaskStatus] = statusTasks.reduce(
        (sum, task) => sum + (task.story_points || 0),
        0
      );
    });

    return sums;
  }, [backlogByStatus]);

  const handleCreateTask = useCallback(
    async (data: {
      title: string;
      description: string;
      status: TaskStatus;
      priority: TaskPriority;
      type: TaskType;
      labels: string[];
      assignee: string;
      sprintId: string | null;
      storyPoints: StoryPointValue | null;
    }) => {
      try {
        const res = await authFetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to create task");
        toast.success("Task created");
        mutate();
        window.dispatchEvent(new CustomEvent("tasks:changed"));
        setDialogOpen(false);
      } catch {
        toast.error("Failed to create task");
      }
    },
    [authFetch, mutate]
  );

  const handleUpdateTask = useCallback(
    async (data: {
      title: string;
      description: string;
      status: TaskStatus;
      priority: TaskPriority;
      type: TaskType;
      labels: string[];
      assignee: string;
      sprintId: string | null;
      storyPoints: StoryPointValue | null;
    }) => {
      if (!editingTask) return;
      try {
        const res = await authFetch(`/api/tasks/${editingTask.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to update task");
        toast.success("Task updated");
        mutate();
        window.dispatchEvent(new CustomEvent("tasks:changed"));
        setDialogOpen(false);
        setEditingTask(null);
      } catch {
        toast.error("Failed to update task");
      }
    },
    [authFetch, editingTask, mutate]
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      try {
        const currentTasks = tasks ?? [];
        // Optimistic update: remove immediately from UI
        const previousTasks = currentTasks;
        const optimistic = currentTasks.filter((t) => t.id !== taskId);
        mutate(optimistic, false);

        const res = await authFetch(`/api/tasks/${taskId}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          // Rollback on error
          mutate(previousTasks, false);
          toast.error("Failed to delete task");
        } else {
          toast.success("Task deleted");
          // Revalidate in background to ensure consistency
          mutate();
          window.dispatchEvent(new CustomEvent("tasks:changed"));
        }
      } catch {
        toast.error("Failed to delete task");
      }
    },
    [authFetch, mutate, tasks]
  );

  const openCreateDialog = useCallback((status: TaskStatus = "backlog") => {
    setEditingTask(null);
    setDefaultStatus(status);
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((task: Task) => {
    setViewingTask(null);
    setEditingTask(task);
    setDialogOpen(true);
  }, []);

  const openViewDialog = useCallback((task: Task) => {
    setViewingTask(task);
  }, []);

  const openDeleteDialog = useCallback((taskId: string) => {
    setPendingDeleteTaskId(taskId);
  }, []);

  const handleActivateSprint = useCallback(
    async (sprintId: string) => {
      try {
        if (activeSprint && activeSprint.id !== sprintId) {
          const clearRes = await authFetch(`/api/sprints/${activeSprint.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "planned" }),
          });
          if (!clearRes.ok) {
            throw new Error("Failed to clear previous active sprint");
          }
        }

        if (sprintId) {
          const res = await authFetch(`/api/sprints/${sprintId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "active" }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.error || "Failed to activate sprint");
          }
          toast.success("Sprint activated");
        } else if (activeSprint) {
          toast.success("Active sprint cleared");
        }

        mutateSprints();
        window.dispatchEvent(new CustomEvent("tasks:changed"));
      } catch (err: any) {
        toast.error(err?.message || "Failed to update active sprint");
      }
    },
    [activeSprint, authFetch, mutateSprints]
  );

  const pendingDeleteTask = useMemo(() => {
    if (!pendingDeleteTaskId || !tasks) return null;
    return tasks.find((task) => task.id === pendingDeleteTaskId) ?? null;
  }, [pendingDeleteTaskId, tasks]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const taskFromEvent = event.active.data.current?.task as Task | undefined;
      const task = taskFromEvent ?? tasks?.find((t) => t.id === event.active.id);
      if (task) {
        setActiveTask(task);
        activeTaskRef.current = task;
      } else {
        setActiveTask(null);
        activeTaskRef.current = null;
      }
    },
    [tasks]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over || !tasks) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const isOverColumn = STATUS_COLUMNS.some((col) => col.id === overId);
      if (isOverColumn) {
        const newStatus = overId as TaskStatus;
        const task = tasks.find((t) => t.id === activeId);
        if (task && task.status !== newStatus) {
          mutate(
            tasks.map((t) =>
              t.id === activeId ? { ...t, status: newStatus } : t
            ),
            false
          );
        }
      } else {
        const overTask = tasks.find((t) => t.id === overId);
        const activeTaskItem = tasks.find((t) => t.id === activeId);
        if (
          overTask &&
          activeTaskItem &&
          overTask.status !== activeTaskItem.status
        ) {
          mutate(
            tasks.map((t) =>
              t.id === activeId ? { ...t, status: overTask.status } : t
            ),
            false
          );
        }
      }
    },
    [tasks, mutate]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);
      const dragStartStatus = activeTaskRef.current?.status ?? null;
      activeTaskRef.current = null;

      if (!over || !tasks) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      let newStatus: TaskStatus | null = null;
      const isOverColumn = STATUS_COLUMNS.some((col) => col.id === overId);
      if (isOverColumn) {
        newStatus = overId as TaskStatus;
      } else {
        const overTask = tasks.find((t) => t.id === overId);
        if (overTask) {
          newStatus = overTask.status;
        }
      }

      if (!newStatus) return;

      const task = tasks.find((t) => t.id === activeId);
      const originalStatus = dragStartStatus ?? task?.status ?? null;
      if (originalStatus === newStatus) return;

      try {
        const res = await authFetch(`/api/tasks/${activeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) throw new Error("Failed to move task");
        mutate();
        window.dispatchEvent(new CustomEvent("tasks:changed"));
      } catch {
        toast.error("Failed to move task");
        mutate();
      }
    },
    [authFetch, tasks, mutate]
  );

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background/50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading your board...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background/50">
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <p className="text-sm text-destructive">
            Failed to load tasks. Please try refreshing.
          </p>
          <button
            onClick={() => mutate()}
            className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background/50">
      <BoardHeader
        onCreateTask={() => openCreateDialog()}
        onManageSprints={() => setSprintDialogOpen(true)}
        onActivateSprint={handleActivateSprint}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterPriority={filterPriority}
        onFilterPriority={setFilterPriority}
        filterType={filterType}
        onFilterType={setFilterType}
        sprintFilter={sprintFilter}
        onSprintFilterChange={setSprintFilter}
        sprints={sprints ?? []}
        activeSprint={activeSprint}
        statusCounts={statusCounts}
      />

      <div className="space-y-3 p-4 pb-0">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sprint Analytics
          </p>
          <button
            type="button"
            onClick={() => setIsBurndownMinimized((prev) => !prev)}
            className="glass-input inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/80"
            aria-label={isBurndownMinimized ? "Expand burndown chart" : "Minimize burndown chart"}
          >
            {isBurndownMinimized ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            {isBurndownMinimized ? "Show Burndown" : "Hide Burndown"}
          </button>
        </div>
        {!isBurndownMinimized && <SprintBurndownChart />}
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 lg:gap-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto lg:gap-3">
            {STATUS_COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                id={column.id}
                title={column.label}
                info={column.info}
                tasks={tasksByStatus[column.id]}
                totalStoryPoints={storyPointsByStatus[column.id]}
                onCreateTask={openCreateDialog}
                onEditTask={openEditDialog}
                onDeleteTask={openDeleteDialog}
                onViewTask={openViewDialog}
              />
            ))}
          </div>

          {sprintFilter === "active" && activeSprint && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Product Backlog (No Sprint)
                </h3>
                <span className="text-xs text-muted-foreground">
                  {backlogTasks.length} task(s)
                </span>
              </div>
              <div className="flex gap-4 overflow-x-auto lg:gap-3">
                {STATUS_COLUMNS.map((column) => (
                  <KanbanColumn
                    key={`backlog-${column.id}`}
                    id={column.id}
                    droppableId={`backlog-${column.id}`}
                    title={column.label}
                    info={column.info}
                    tasks={backlogByStatus[column.id]}
                    totalStoryPoints={backlogStoryPointsByStatus[column.id]}
                    onCreateTask={openCreateDialog}
                    onEditTask={openEditDialog}
                    onDeleteTask={openDeleteDialog}
                    onViewTask={openViewDialog}
                  />
                ))}
              </div>
            </div>
          )}

          <DragOverlay>
            {activeTask && (
              <div className="w-72 lg:w-64">
                <TaskCard
                  task={activeTask}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  onView={() => {}}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      <TaskDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingTask(null);
        }}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        initialData={editingTask}
        defaultStatus={defaultStatus}
        availableSprints={sprints ?? []}
        defaultSprintId={activeSprint?.id ?? null}
      />

      <SprintManagementDialog
        open={sprintDialogOpen}
        onClose={() => setSprintDialogOpen(false)}
        sprints={sprints ?? []}
        onChanged={() => {
          mutateSprints();
          mutate();
          window.dispatchEvent(new CustomEvent("tasks:changed"));
        }}
      />

      <TaskDetailDialog
        task={viewingTask}
        open={!!viewingTask}
        onClose={() => setViewingTask(null)}
        onEdit={openEditDialog}
      />

      <AlertDialog
        open={Boolean(pendingDeleteTaskId)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteTaskId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
              {pendingDeleteTask ? ` "${pendingDeleteTask.title}" will be permanently removed.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!pendingDeleteTaskId) return;
                const taskId = pendingDeleteTaskId;
                setPendingDeleteTaskId(null);
                await handleDeleteTask(taskId);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
