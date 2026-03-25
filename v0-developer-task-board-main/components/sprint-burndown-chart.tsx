"use client";

import { useCallback, useEffect } from "react";
import useSWR from "swr";
import { useAuth } from "@/lib/auth-provider";
import type { Sprint } from "@/lib/types";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type BurndownDatum = {
  date: string;
  idealRemaining: number;
  actualRemaining: number;
};

type BurndownResponse = {
  sprint: Sprint | null;
  totalStoryPoints: number;
  completedStoryPoints: number;
  velocity: number;
  data: BurndownDatum[];
};

export function SprintBurndownChart() {
  const { authFetch } = useAuth();
  const fetcher = useCallback(
    async (url: string): Promise<BurndownResponse> => {
      const res = await authFetch(url);
      if (!res.ok) throw new Error("Failed to fetch burndown data");
      return res.json();
    },
    [authFetch]
  );

  const { data, error, mutate } = useSWR<BurndownResponse>(
    "/api/sprints/active/burndown",
    fetcher
  );

  useEffect(() => {
    const handleBoardChanged = () => {
      mutate();
    };
    window.addEventListener("tasks:changed", handleBoardChanged);
    return () => window.removeEventListener("tasks:changed", handleBoardChanged);
  }, [mutate]);

  if (error) {
    return (
      <div className="glass-panel rounded-xl p-4">
        <p className="text-sm text-destructive">Failed to load burndown chart.</p>
      </div>
    );
  }

  if (!data?.sprint) {
    return (
      <div className="glass-panel rounded-xl p-4">
        <h3 className="text-sm font-semibold text-foreground">Sprint Burndown</h3>
        <p className="mt-2 text-xs text-muted-foreground">
          No active sprint. Activate a sprint to view burndown.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-xl p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Sprint Burndown</h3>
          <p className="text-xs text-muted-foreground">{data.sprint.name}</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-muted-foreground">
            Total: <strong className="text-foreground">{data.totalStoryPoints}</strong>
          </span>
          <span className="text-muted-foreground">
            Completed:{" "}
            <strong className="text-foreground">{data.completedStoryPoints}</strong>
          </span>
          <span className="text-muted-foreground">
            Velocity: <strong className="text-foreground">{data.velocity}</strong>
          </span>
        </div>
      </div>

      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => value.slice(5)}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="idealRemaining"
              name="Ideal"
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="actualRemaining"
              name="Actual"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
