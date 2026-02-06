import { authenticateRequest } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authUser = await authenticateRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", authUser.userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const authUser = await authenticateRequest(request);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const body = await request.json();

  // Get or create counter for this user
  const { data: counterData } = await supabase
    .from("task_counters")
    .select("counter")
    .eq("user_id", authUser.userId)
    .single();

  let nextCounter = 1;
  if (counterData) {
    nextCounter = counterData.counter + 1;
    await supabase
      .from("task_counters")
      .update({ counter: nextCounter })
      .eq("user_id", authUser.userId);
  } else {
    await supabase
      .from("task_counters")
      .insert({ user_id: authUser.userId, counter: 1 });
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
      user_id: authUser.userId,
      report_id: body.report_id || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
