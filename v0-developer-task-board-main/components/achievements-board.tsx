"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { useAuth } from "@/lib/auth-provider";
import type { Sprint, Task } from "@/lib/types";
import {
  Award,
  Bug,
  CheckCircle2,
  Crown,
  Loader2,
  Sparkles,
  Star,
  Target,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MemberAchievementStats {
  assignee: string;
  storyPointsCompleted: number;
  tasksCompleted: number;
  featuresCompleted: number;
  bugsSmashed: number;
}

interface RankedMember extends MemberAchievementStats {
  rank: number;
}

const SCOPE_ACTIVE = "__active_sprint__";
const SCOPE_ALL = "__all_sprints__";

function normalizeAssignee(value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  return normalized.length > 0 ? normalized : "Unassigned";
}

function formatSprintRange(sprint: Sprint) {
  const start = new Date(sprint.start_date);
  const end = new Date(sprint.end_date);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${sprint.start_date} to ${sprint.end_date}`;
  }
  return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
}

function getElapsedMonthsFromStart(startDate: string) {
  const start = new Date(startDate);
  const now = new Date();
  if (Number.isNaN(start.getTime()) || start > now) return 0;

  let months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());

  if (now.getDate() < start.getDate()) {
    months -= 1;
  }

  return Math.max(0, months);
}

function getRanks(members: MemberAchievementStats[]): RankedMember[] {
  let previous: MemberAchievementStats | null = null;
  let currentRank = 0;

  return members.map((member, index) => {
    if (
      !previous ||
      previous.storyPointsCompleted !== member.storyPointsCompleted ||
      previous.tasksCompleted !== member.tasksCompleted ||
      previous.bugsSmashed !== member.bugsSmashed ||
      previous.featuresCompleted !== member.featuresCompleted
    ) {
      currentRank = index + 1;
    }
    previous = member;
    return { ...member, rank: currentRank };
  });
}

export function AchievementsBoard() {
  const { authFetch } = useAuth();
  const [scope, setScope] = useState<string>(SCOPE_ACTIVE);

  const taskFetcher = useCallback(
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

  const sprintFetcher = useCallback(
    async (url: string): Promise<Sprint[]> => {
      const res = await authFetch(url);
      if (!res.ok) throw new Error("Failed to fetch sprints");
      const json = await res.json();
      return Array.isArray(json) ? (json as Sprint[]) : [];
    },
    [authFetch]
  );

  const { data: tasks = [], isLoading: tasksLoading, error: tasksError } = useSWR<Task[]>(
    "/api/tasks",
    taskFetcher,
    { fallbackData: [] }
  );
  const {
    data: sprints = [],
    isLoading: sprintsLoading,
    error: sprintsError,
  } = useSWR<Sprint[]>("/api/sprints", sprintFetcher, { fallbackData: [] });

  const activeSprint = useMemo(
    () => sprints.find((sprint) => sprint.status === "active") ?? null,
    [sprints]
  );

  const selectedSprint = useMemo(() => {
    if (scope === SCOPE_ACTIVE) return activeSprint;
    if (scope === SCOPE_ALL) return null;
    return sprints.find((sprint) => sprint.id === scope) ?? null;
  }, [scope, activeSprint, sprints]);

  const filteredCompletedTasks = useMemo(() => {
    const completed = tasks.filter((task) => task.status === "done");

    if (scope === SCOPE_ALL) {
      return completed.filter((task) => task.sprint_id !== null);
    }

    if (scope === SCOPE_ACTIVE) {
      if (!activeSprint) return [];
      return completed.filter((task) => task.sprint_id === activeSprint.id);
    }

    return completed.filter((task) => task.sprint_id === scope);
  }, [tasks, scope, activeSprint]);

  const rankedMembers = useMemo(() => {
    const statsByMember = new Map<string, MemberAchievementStats>();

    for (const task of filteredCompletedTasks) {
      const assignee = normalizeAssignee(task.assignee);
      const current = statsByMember.get(assignee) ?? {
        assignee,
        storyPointsCompleted: 0,
        tasksCompleted: 0,
        featuresCompleted: 0,
        bugsSmashed: 0,
      };

      current.tasksCompleted += 1;
      current.storyPointsCompleted += task.story_points ?? 0;

      if (task.type === "feature") current.featuresCompleted += 1;
      if (task.type === "bug") current.bugsSmashed += 1;

      statsByMember.set(assignee, current);
    }

    const sorted = Array.from(statsByMember.values()).sort((a, b) => {
      if (b.storyPointsCompleted !== a.storyPointsCompleted) {
        return b.storyPointsCompleted - a.storyPointsCompleted;
      }
      if (b.tasksCompleted !== a.tasksCompleted) {
        return b.tasksCompleted - a.tasksCompleted;
      }
      if (b.bugsSmashed !== a.bugsSmashed) {
        return b.bugsSmashed - a.bugsSmashed;
      }
      if (b.featuresCompleted !== a.featuresCompleted) {
        return b.featuresCompleted - a.featuresCompleted;
      }
      return a.assignee.localeCompare(b.assignee);
    });

    return getRanks(sorted);
  }, [filteredCompletedTasks]);

  const topThree = useMemo(() => rankedMembers.slice(0, 3), [rankedMembers]);

  const highlightWinners = useMemo(() => {
    const getWinners = (
      key: keyof Pick<
        MemberAchievementStats,
        "storyPointsCompleted" | "bugsSmashed" | "featuresCompleted" | "tasksCompleted"
      >
    ) => {
      if (rankedMembers.length === 0) return [];
      const topValue = Math.max(...rankedMembers.map((member) => member[key]));
      if (topValue <= 0) return [];
      return rankedMembers.filter((member) => member[key] === topValue);
    };

    return {
      champion: getWinners("storyPointsCompleted"),
      bugHunter: getWinners("bugsSmashed"),
      featureBuilder: getWinners("featuresCompleted"),
      momentumMaker: getWinners("tasksCompleted"),
    };
  }, [rankedMembers]);

  const summary = useMemo(() => {
    return {
      completedTasks: filteredCompletedTasks.length,
      totalStoryPoints: filteredCompletedTasks.reduce(
        (sum, task) => sum + (task.story_points ?? 0),
        0
      ),
      contributors: rankedMembers.length,
    };
  }, [filteredCompletedTasks, rankedMembers]);

  const scopeLabel = useMemo(() => {
    if (scope === SCOPE_ALL) return "All Sprint Work";
    if (scope === SCOPE_ACTIVE) {
      return activeSprint ? `${activeSprint.name} (Active)` : "Active Sprint";
    }
    return selectedSprint ? selectedSprint.name : "Selected Sprint";
  }, [scope, activeSprint, selectedSprint]);

  const durationMonths = useMemo(() => {
    if (scope === SCOPE_ALL) {
      if (sprints.length === 0) return 0;
      const earliestStart = sprints
        .map((sprint) => sprint.start_date)
        .filter(Boolean)
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
      return earliestStart ? getElapsedMonthsFromStart(earliestStart) : 0;
    }

    if (selectedSprint?.start_date) {
      return getElapsedMonthsFromStart(selectedSprint.start_date);
    }

    return 0;
  }, [scope, sprints, selectedSprint]);

  if (tasksLoading || sprintsLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading achievements...
        </div>
      </div>
    );
  }

  if (tasksError || sprintsError) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-sm text-destructive">
          Unable to load achievements right now.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="glass-panel rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-400" />
              <h2 className="text-lg font-semibold text-foreground">Achievements</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Rank team members by completed story points across sprint work.
            </p>
          </div>

          <div className="glass-panel-soft rounded-lg px-3 py-2">
            <label className="mb-1 block text-[11px] uppercase tracking-wide text-muted-foreground">
              Scope
            </label>
            <select
              value={scope}
              onChange={(event) => setScope(event.target.value)}
              className="glass-input h-8 rounded-md px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value={SCOPE_ACTIVE}>Active Sprint</option>
              <option value={SCOPE_ALL}>All Sprints</option>
              {sprints.map((sprint) => (
                <option key={sprint.id} value={sprint.id}>
                  {sprint.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="glass-panel-soft rounded-lg p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Sprint Scope</p>
            <p className="mt-1 text-sm font-medium text-foreground">{scopeLabel}</p>
            {selectedSprint && (
              <p className="mt-1 text-xs text-muted-foreground">{formatSprintRange(selectedSprint)}</p>
            )}
          </div>
          <div className="glass-panel-soft rounded-lg p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Completed Tasks</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
              {summary.completedTasks}
            </p>
          </div>
          <div className="glass-panel-soft rounded-lg p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Story Points Done</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
              {summary.totalStoryPoints}
            </p>
          </div>
        </div>
      </div>

      {rankedMembers.length === 0 ? (
        <div className="glass-panel flex flex-1 items-center justify-center rounded-xl p-6 text-center">
          <div>
            <Target className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-3 text-sm text-foreground">
              No completed sprint tasks found for this scope yet.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Move sprint tasks to Done to unlock the leaderboard.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-3">
            {topThree.map((member, index) => (
              <div key={member.assignee} className="glass-panel rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Rank #{member.rank}
                    </p>
                    <p className="mt-1 text-base font-semibold text-foreground">
                      {member.assignee}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "rounded-full p-2",
                      index === 0 && "bg-yellow-500/20 text-yellow-300",
                      index === 1 && "bg-slate-500/20 text-slate-300",
                      index === 2 && "bg-amber-700/20 text-amber-300"
                    )}
                  >
                    {index === 0 ? (
                      <Crown className="h-4 w-4" />
                    ) : (
                      <Award className="h-4 w-4" />
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-5 text-xs text-muted-foreground">
                  <div>
                    <p className="text-[11px] uppercase">Points</p>
                    <p className="text-lg font-semibold tabular-nums text-foreground">
                      {member.storyPointsCompleted}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase">Tasks</p>
                    <p className="text-lg font-semibold tabular-nums text-foreground">
                      {member.tasksCompleted}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="glass-panel rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground">Highlight Badges</h3>
            <div className="mt-3 grid gap-2 lg:grid-cols-2">
              <div className="glass-panel-soft rounded-lg p-3">
                <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <Star className="h-3.5 w-3.5 text-yellow-400" />
                  Sprint Champion
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {highlightWinners.champion.map((member) => member.assignee).join(", ") || "None"}
                </p>
              </div>
              <div className="glass-panel-soft rounded-lg p-3">
                <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <Bug className="h-3.5 w-3.5 text-red-400" />
                  Bug Hunter
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {highlightWinners.bugHunter.map((member) => member.assignee).join(", ") || "None"}
                </p>
              </div>
              <div className="glass-panel-soft rounded-lg p-3">
                <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Feature Builder
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {highlightWinners.featureBuilder
                    .map((member) => member.assignee)
                    .join(", ") || "None"}
                </p>
              </div>
              <div className="glass-panel-soft rounded-lg p-3">
                <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Momentum Maker
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {highlightWinners.momentumMaker
                    .map((member) => member.assignee)
                    .join(", ") || "None"}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground">Team Leaderboard</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.contributors} contributor(s) in this sprint scope.
            </p>
            <p className="text-xs text-muted-foreground">
              Duration from start: {durationMonths} month{durationMonths === 1 ? "" : "s"}.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="border-b border-border pb-2">Rank</th>
                    <th className="border-b border-border pb-2">Member</th>
                    <th className="border-b border-border pb-2">Story Points</th>
                    <th className="border-b border-border pb-2">Tasks Completed</th>
                    <th className="border-b border-border pb-2">Features Completed</th>
                    <th className="border-b border-border pb-2">Bugs Smashed</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedMembers.map((member) => (
                    <tr key={member.assignee} className="text-foreground">
                      <td className="border-b border-border/70 py-2 tabular-nums">{member.rank}</td>
                      <td className="border-b border-border/70 py-2 font-medium">
                        {member.assignee}
                      </td>
                      <td className="border-b border-border/70 py-2 tabular-nums">
                        {member.storyPointsCompleted}
                      </td>
                      <td className="border-b border-border/70 py-2 tabular-nums">
                        {member.tasksCompleted}
                      </td>
                      <td className="border-b border-border/70 py-2 tabular-nums">
                        {member.featuresCompleted}
                      </td>
                      <td className="border-b border-border/70 py-2 tabular-nums">
                        {member.bugsSmashed}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
