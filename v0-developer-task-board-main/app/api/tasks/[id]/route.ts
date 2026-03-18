import { authenticateRequest } from "@/lib/auth";
import { STORY_POINTS_SCALE } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveBoardOwnerUserId } from "@/lib/team-board";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await authenticateRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const supabase = createAdminClient();
  const boardOwnerUserId = await resolveBoardOwnerUserId(authUser);
  const updates = { ...body } as Record<string, unknown>;

  if (Object.prototype.hasOwnProperty.call(updates, "storyPoints")) {
    const storyPoints = updates.storyPoints;
    if (storyPoints === null || storyPoints === undefined || storyPoints === "") {
      updates.story_points = null;
    } else {
      const parsed = Number(storyPoints);
      if (
        !Number.isInteger(parsed) ||
        !STORY_POINTS_SCALE.includes(parsed as (typeof STORY_POINTS_SCALE)[number])
      ) {
        return NextResponse.json(
          { error: "storyPoints must be one of 1, 2, 3, 5, 8, 13, 21 or null" },
          { status: 400 }
        );
      }
      updates.story_points = parsed;
    }
    delete updates.storyPoints;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "sprintId")) {
    updates.sprint_id = updates.sprintId || null;
    delete updates.sprintId;
  }

  if (Object.prototype.hasOwnProperty.call(updates, "completedAt")) {
    updates.completed_at = updates.completedAt || null;
    delete updates.completedAt;
  }

  const hasStatusUpdate = typeof updates.status === "string";

  if (hasStatusUpdate && !Object.prototype.hasOwnProperty.call(updates, "completed_at")) {
    const { data: currentTask, error: currentTaskError } = await supabase
      .from("tasks")
      .select("status, completed_at")
      .eq("id", id)
      .eq("user_id", boardOwnerUserId)
      .single();

    if (currentTaskError) {
      return NextResponse.json({ error: currentTaskError.message }, { status: 500 });
    }

    if (updates.status === "done" && currentTask?.status !== "done") {
      updates.completed_at = new Date().toISOString();
    }

    if (updates.status !== "done" && currentTask?.status === "done") {
      updates.completed_at = null;
    }
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .eq("user_id", boardOwnerUserId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await authenticateRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();
  const boardOwnerUserId = await resolveBoardOwnerUserId(authUser);

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", boardOwnerUserId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
