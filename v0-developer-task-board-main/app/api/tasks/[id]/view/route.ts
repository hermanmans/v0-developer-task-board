import { authenticateRequest } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveBoardOwnerUserId } from "@/lib/team-board";
import { NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization,Content-Type,apikey,x-client-info",
};

function jsonWithCors(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  Object.entries(corsHeaders).forEach(([key, value]) =>
    response.headers.set(key, value)
  );
  return response;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await authenticateRequest(request);
  if (!authUser) {
    return jsonWithCors({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();
  const boardOwnerUserId = await resolveBoardOwnerUserId(authUser);

  const { data: task } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", id)
    .eq("user_id", boardOwnerUserId)
    .maybeSingle();

  if (!task) {
    return jsonWithCors({ error: "Task not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("task_views")
    .upsert(
      {
        task_id: id,
        user_id: authUser.userId,
        viewed_at: new Date().toISOString(),
      },
      { onConflict: "task_id,user_id" }
    );

  if (error) {
    return jsonWithCors({ error: error.message }, { status: 500 });
  }

  return jsonWithCors({ success: true });
}
