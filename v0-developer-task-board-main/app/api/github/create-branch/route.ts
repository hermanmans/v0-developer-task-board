import { NextResponse } from "next/server";

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

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "GITHUB_TOKEN not configured" }, { status: 500 });
    }

    if (!owner || !repo || !branchName) {
      return NextResponse.json({ error: "owner, repo and branchName are required" }, { status: 400 });
    }

    // Determine base branch
    let base = baseBranch;
    if (!base) {
      const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
      });
      if (!metaRes.ok) {
        const json = await getJson(metaRes);
        return NextResponse.json({ error: json }, { status: metaRes.status });
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
      return NextResponse.json({ error: json }, { status: refRes.status });
    }
    const refJson = await refRes.json();
    const sha = refJson.object?.sha;
    if (!sha) {
      return NextResponse.json({ error: "Failed to determine base commit SHA" }, { status: 500 });
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
      return NextResponse.json({ error: createJson }, { status: createRes.status });
    }

    return NextResponse.json({ branch: createJson });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
