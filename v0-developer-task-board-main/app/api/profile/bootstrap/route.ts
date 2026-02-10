import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptSecret } from "@/lib/crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      email,
      firstName,
      lastName,
      company,
      companyLogoUrl,
      inviteEmails,
      contactNumber,
      disclaimerAccepted,
      popiaAccepted,
      githubToken,
    } = body ?? {};

    if (!userId || !email) {
      return NextResponse.json(
        { error: "userId and email are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data: userResult, error: userError } =
      await supabase.auth.admin.getUserById(userId);
    if (userError || !userResult?.user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (userResult.user.email !== email) {
      return NextResponse.json({ error: "Email mismatch" }, { status: 400 });
    }

    const githubTokenEnc =
      typeof githubToken === "string" && githubToken.trim().length > 0
        ? encryptSecret(githubToken.trim())
        : null;

    const { error } = await supabase.from("profiles").upsert(
      {
        user_id: userId,
        email,
        first_name: typeof firstName === "string" ? firstName.trim() : null,
        last_name: typeof lastName === "string" ? lastName.trim() : null,
        company: typeof company === "string" ? company.trim() : null,
        company_logo_url:
          typeof companyLogoUrl === "string" ? companyLogoUrl.trim() : null,
        invite_emails: Array.isArray(inviteEmails) ? inviteEmails : [],
        contact_number:
          typeof contactNumber === "string" ? contactNumber.trim() : null,
        disclaimer_accepted: Boolean(disclaimerAccepted),
        popia_accepted: Boolean(popiaAccepted),
        github_token_enc: githubTokenEnc,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
