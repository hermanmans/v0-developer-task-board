import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization,Content-Type,apikey,x-client-info",
};

function withCors(body: unknown, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  Object.entries(corsHeaders).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { owner, repo, title, issueBody, labels, assignees } = body;

    let token = process.env.GITHUB_TOKEN || null;
    const authUser = await authenticateRequest(req);
    if (authUser) {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("profiles")
        .select("github_token_enc")
        .eq("user_id", authUser.userId)
        .single();
      if (data?.github_token_enc) {
        token = decryptSecret(data.github_token_enc);
      }
    }
    if (!token) {
      return withCors(
        { error: "GitHub token not configured. Add it in Profile settings." },
        { status: 500 }
      );
    }

    if (!owner || !repo || !title) {
      return withCors({ error: "owner, repo and title are required" }, { status: 400 });
    }

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        title, 
        body: issueBody, 
        labels: labels && labels.length > 0 ? labels : undefined,
        assignees: assignees && assignees.length > 0 ? assignees : undefined,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      return withCors({ error: json }, { status: res.status });
    }

    return withCors({ issue: json });
  } catch (err: any) {
    return withCors({ error: err.message || String(err) }, { status: 500 });
  }
}
