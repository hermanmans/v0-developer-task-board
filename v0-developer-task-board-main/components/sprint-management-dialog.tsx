"use client";

import { useMemo, useState } from "react";
import { X, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth-provider";
import type { Sprint, SprintStatus } from "@/lib/types";
import { toast } from "sonner";

interface SprintManagementDialogProps {
  open: boolean;
  onClose: () => void;
  sprints: Sprint[];
  onChanged: () => void;
}

const STATUS_OPTIONS: SprintStatus[] = ["planned", "active", "completed"];

export function SprintManagementDialog({
  open,
  onClose,
  sprints,
  onChanged,
}: SprintManagementDialogProps) {
  const { authFetch } = useAuth();
  const [editingSprintId, setEditingSprintId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<SprintStatus>("planned");

  const editingSprint = useMemo(
    () => sprints.find((sprint) => sprint.id === editingSprintId) ?? null,
    [editingSprintId, sprints]
  );

  const resetForm = () => {
    setEditingSprintId(null);
    setName("");
    setStartDate("");
    setEndDate("");
    setStatus("planned");
  };

  const beginEdit = (sprint: Sprint) => {
    setEditingSprintId(sprint.id);
    setName(sprint.name);
    setStartDate(sprint.start_date);
    setEndDate(sprint.end_date);
    setStatus(sprint.status);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !startDate || !endDate) return;

    const payload = {
      name: name.trim(),
      startDate,
      endDate,
      status,
    };

    const url = editingSprint ? `/api/sprints/${editingSprint.id}` : "/api/sprints";
    const method = editingSprint ? "PATCH" : "POST";

    const res = await authFetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err?.error || "Failed to save sprint");
      return;
    }

    toast.success(editingSprint ? "Sprint updated" : "Sprint created");
    resetForm();
    onChanged();
  };

  const handleDelete = async (sprintId: string) => {
    const res = await authFetch(`/api/sprints/${sprintId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Failed to delete sprint");
      return;
    }
    if (editingSprintId === sprintId) resetForm();
    toast.success("Sprint deleted");
    onChanged();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mx-4 w-full max-w-3xl rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Sprint Management</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <form onSubmit={handleSave} className="space-y-3 rounded-lg border border-border p-4">
            <h3 className="text-sm font-medium text-foreground">
              {editingSprint ? "Edit Sprint" : "Create Sprint"}
            </h3>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Sprint name"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                required
              />
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
                required
              />
            </div>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as SprintStatus)}
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground"
            >
              {STATUS_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
              >
                {editingSprint ? "Save Sprint" : "Create Sprint"}
              </button>
              {editingSprint && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="h-9 rounded-lg border border-border px-3 text-sm text-foreground"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          <div className="rounded-lg border border-border p-4">
            <h3 className="mb-3 text-sm font-medium text-foreground">Sprints</h3>
            <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
              {sprints.length === 0 && (
                <p className="text-xs text-muted-foreground">No sprints yet.</p>
              )}
              {sprints.map((sprint) => (
                <div
                  key={sprint.id}
                  className="rounded-lg border border-border bg-secondary/20 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{sprint.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {sprint.start_date} to {sprint.end_date}
                      </p>
                      <p className="mt-1 text-[11px] uppercase text-muted-foreground">
                        {sprint.status}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => beginEdit(sprint)}
                        className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(sprint.id)}
                        className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
