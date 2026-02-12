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

async function getJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { owner, repo, branchName, baseBranch } = body;

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

    if (!owner || !repo || !branchName) {
      return withCors({ error: "owner, repo and branchName are required" }, { status: 400 });
    }

    // Determine base branch
    let base = baseBranch;
    if (!base) {
      const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
      });
      if (!metaRes.ok) {
        const json = await getJson(metaRes);
        return withCors({ error: json }, { status: metaRes.status });
      }
      const meta = await metaRes.json();
      base = meta.default_branch;
    }

    // Get ref for base branch
    const refRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(base)}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } }
    );
    if (!refRes.ok) {
      const json = await getJson(refRes);
      return withCors({ error: json }, { status: refRes.status });
    }
    const refJson = await refRes.json();
    const sha = refJson.object?.sha;
    if (!sha) {
      return withCors({ error: "Failed to determine base commit SHA" }, { status: 500 });
    }

    // Create new branch ref
    const createRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha }),
    });

    const createJson = await getJson(createRes);
    if (!createRes.ok) {
      return withCors({ error: createJson }, { status: createRes.status });
    }

    return withCors({ branch: createJson });
  } catch (err: any) {
    return withCors({ error: err.message || String(err) }, { status: 500 });
  }
}
