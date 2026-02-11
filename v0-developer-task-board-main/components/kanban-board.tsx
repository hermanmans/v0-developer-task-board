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
import { Loader2 } from "lucide-react";
import type {
  Task,
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
      return true;
    });
  }, [tasks, searchQuery, filterPriority, filterType]);

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
    };
    for (const task of filteredTasks) {
      map[task.status].push(task);
    }
    return map;
  }, [filteredTasks]);

  const handleCreateTask = useCallback(
    async (data: {
      title: string;
      description: string;
      status: TaskStatus;
      priority: TaskPriority;
      type: TaskType;
      labels: string[];
      assignee: string;
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
      } catch {
        toast.error("Failed to move task");
        mutate();
      }
    },
    [authFetch, tasks, mutate]
  );

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
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
      <div className="flex h-screen items-center justify-center bg-background">
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
    <div className="flex h-screen flex-col bg-background">
      <BoardHeader
        onCreateTask={() => openCreateDialog()}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterPriority={filterPriority}
        onFilterPriority={setFilterPriority}
        filterType={filterType}
        onFilterType={setFilterType}
        statusCounts={statusCounts}
      />

      <div className="flex flex-1 gap-4 overflow-x-auto p-4 lg:gap-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {STATUS_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.label}
              info={column.info}
              tasks={tasksByStatus[column.id]}
              onCreateTask={openCreateDialog}
              onEditTask={openEditDialog}
              onDeleteTask={openDeleteDialog}
              onViewTask={openViewDialog}
            />
          ))}

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
