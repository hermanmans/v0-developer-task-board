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

export async function GET(request: Request) {
  const authUser = await authenticateRequest(request);
  if (!authUser) {
    return jsonWithCors({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const boardOwnerUserId = await resolveBoardOwnerUserId(authUser);

  const { data, error } = await supabase
    .from("tasks")
    .select("*, comments:comments(count)")
    .eq("user_id", boardOwnerUserId)
    .order("created_at", { ascending: false });

  if (error) {
    return jsonWithCors({ error: error.message }, { status: 500 });
  }

  const tasksWithCounts =
    data?.map((task: any) => {
      const commentCount =
        Array.isArray(task.comments) && typeof task.comments[0]?.count === "number"
          ? task.comments[0].count
          : 0;
      const { comments, ...rest } = task;
      return { ...rest, comments_count: commentCount };
    }) ?? [];

  return jsonWithCors(tasksWithCounts);
}

export async function POST(request: Request) {
  const authUser = await authenticateRequest(request);
  if (!authUser) {
    return jsonWithCors({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const body = await request.json();
  const boardOwnerUserId = await resolveBoardOwnerUserId(authUser);

  // Get or create counter for the resolved board owner.
  const { data: counterData } = await supabase
    .from("task_counters")
    .select("counter")
    .eq("user_id", boardOwnerUserId)
    .single();

  let nextCounter = 1;
  if (counterData) {
    nextCounter = counterData.counter + 1;
    await supabase
      .from("task_counters")
      .update({ counter: nextCounter })
      .eq("user_id", boardOwnerUserId);
  } else {
    await supabase
      .from("task_counters")
      .insert({ user_id: boardOwnerUserId, counter: 1 });
  }

  const taskKey = `BUG-${nextCounter}`;

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: body.title,
      description: body.description || "",
      status: body.status || "backlog",
      priority: body.priority || "medium",
      type: body.type || "task",
      labels: body.labels || [],
      assignee: body.assignee || "",
      task_key: taskKey,
      user_id: boardOwnerUserId,
      report_id: body.report_id || null,
    })
    .select()
    .single();

  if (error) {
    return jsonWithCors({ error: error.message }, { status: 500 });
  }

  return jsonWithCors(data, { status: 201 });
}
