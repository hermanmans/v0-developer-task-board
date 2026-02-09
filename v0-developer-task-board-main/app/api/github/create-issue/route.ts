import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { owner, repo, title, issueBody, labels, assignees } = body;

    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "GITHUB_TOKEN not configured" }, { status: 500 });
    }

    if (!owner || !repo || !title) {
      return NextResponse.json({ error: "owner, repo and title are required" }, { status: 400 });
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
      return NextResponse.json({ error: json }, { status: res.status });
    }

    return NextResponse.json({ issue: json });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
