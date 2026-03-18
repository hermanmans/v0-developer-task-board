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

  const storyPoints =
    body.storyPoints === null || body.storyPoints === undefined || body.storyPoints === ""
      ? null
      : Number(body.storyPoints);

  if (
    storyPoints !== null &&
    (!Number.isInteger(storyPoints) ||
      !STORY_POINTS_SCALE.includes(storyPoints as (typeof STORY_POINTS_SCALE)[number]))
  ) {
    return NextResponse.json(
      { error: "storyPoints must be one of 1, 2, 3, 5, 8, 13, 21 or null" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("tasks")
    .update({ story_points: storyPoints })
    .eq("id", id)
    .eq("user_id", boardOwnerUserId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
