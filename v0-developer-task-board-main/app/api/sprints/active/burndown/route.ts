import { authenticateRequest } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveBoardOwnerUserId } from "@/lib/team-board";
import { NextResponse } from "next/server";

function parseDayStartUtc(dateValue: string) {
  return new Date(`${dateValue}T00:00:00.000Z`);
}

function parseDayEndUtc(dateValue: string) {
  return new Date(`${dateValue}T23:59:59.999Z`);
}

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addUtcDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export async function GET(request: Request) {
  const authUser = await authenticateRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const boardOwnerUserId = await resolveBoardOwnerUserId(authUser);

  const { data: sprint, error: sprintError } = await supabase
    .from("sprints")
    .select("*")
    .eq("user_id", boardOwnerUserId)
    .eq("status", "active")
    .maybeSingle();

  if (sprintError) {
    return NextResponse.json({ error: sprintError.message }, { status: 500 });
  }

  if (!sprint) {
    return NextResponse.json({
      sprint: null,
      totalStoryPoints: 0,
      completedStoryPoints: 0,
      velocity: 0,
      data: [],
    });
  }

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("story_points, status, completed_at, updated_at")
    .eq("user_id", boardOwnerUserId)
    .eq("sprint_id", sprint.id);

  if (tasksError) {
    return NextResponse.json({ error: tasksError.message }, { status: 500 });
  }

  const sprintTasks = tasks ?? [];
  const totalStoryPoints = sprintTasks.reduce((sum, task) => {
    return sum + (typeof task.story_points === "number" ? task.story_points : 0);
  }, 0);

  const startDate = parseDayStartUtc(sprint.start_date);
  const endDate = parseDayStartUtc(sprint.end_date);
  const dayCount =
    Math.max(
      1,
      Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1
    );

  const data = Array.from({ length: dayCount }, (_, index) => {
    const day = addUtcDays(startDate, index);
    const dayEnd = parseDayEndUtc(toIsoDate(day));
    const completedByDay = sprintTasks.reduce((sum, task) => {
      if (typeof task.story_points !== "number") return sum;
      const completionTimestamp = task.completed_at || (task.status === "done" ? task.updated_at : null);
      if (!completionTimestamp) return sum;
      if (new Date(completionTimestamp).getTime() <= dayEnd.getTime()) {
        return sum + task.story_points;
      }
      return sum;
    }, 0);

    const actualRemaining = Math.max(0, totalStoryPoints - completedByDay);
    const progressFraction = dayCount === 1 ? 1 : index / (dayCount - 1);
    const idealRemaining = Math.max(
      0,
      Number((totalStoryPoints * (1 - progressFraction)).toFixed(2))
    );

    return {
      date: toIsoDate(day),
      idealRemaining,
      actualRemaining,
    };
  });

  const completedStoryPoints = Math.max(
    0,
    totalStoryPoints - (data[data.length - 1]?.actualRemaining ?? totalStoryPoints)
  );
  const velocity = completedStoryPoints;

  return NextResponse.json({
    sprint,
    totalStoryPoints,
    completedStoryPoints,
    velocity,
    data,
  });
}
