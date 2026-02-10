"use client";

import React from "react"

import { createClient } from "@/lib/supabase/client";
import { Bug } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [company, setCompany] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");
  const [inviteEmails, setInviteEmails] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [popiaAccepted, setPopiaAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }
    if (!disclaimerAccepted || !popiaAccepted) {
      setError("Please accept the Disclaimer and POPIA consent.");
      setIsLoading(false);
      return;
    }

    try {
      const inviteList = inviteEmails
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
            `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;

      try {
        if (data?.user?.id && data?.user?.email) {
          await fetch("/api/profile/bootstrap", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: data.user.id,
              email: data.user.email,
              firstName,
              lastName: surname,
              company,
              companyLogoUrl,
              inviteEmails: inviteList,
              contactNumber,
              disclaimerAccepted,
              popiaAccepted,
              githubToken,
            }),
          });
        }
      } catch {
        // Profile bootstrap is best-effort; account creation still succeeds.
      }
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Bug className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold text-foreground">BugBoard</h1>
          <p className="text-sm text-muted-foreground">
            Create your account
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <form onSubmit={handleSignUp} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="first-name"
                  className="text-sm font-medium text-foreground"
                >
                  Name
                </label>
                <input
                  id="first-name"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="surname"
                  className="text-sm font-medium text-foreground"
                >
                  Surname
                </label>
                <input
                  id="surname"
                  type="text"
                  required
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="company"
                className="text-sm font-medium text-foreground"
              >
                Company
              </label>
              <input
                id="company"
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="repeat-password"
                className="text-sm font-medium text-foreground"
              >
                Confirm Password
              </label>
              <input
                id="repeat-password"
                type="password"
                required
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Profile Details
              </p>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="github-token"
                    className="text-sm font-medium text-foreground"
                  >
                    Connect GitHub (token)
                  </label>
                  <input
                    id="github-token"
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_..."
                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Token is stored securely in your profile settings.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="company-logo"
                    className="text-sm font-medium text-foreground"
                  >
                    Company Logo URL
                  </label>
                  <input
                    id="company-logo"
                    type="url"
                    value={companyLogoUrl}
                    onChange={(e) => setCompanyLogoUrl(e.target.value)}
                    placeholder="https://..."
                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="invite-emails"
                    className="text-sm font-medium text-foreground"
                  >
                    Invite Team Members
                  </label>
                  <textarea
                    id="invite-emails"
                    value={inviteEmails}
                    onChange={(e) => setInviteEmails(e.target.value)}
                    placeholder="name@company.com, teammate@company.com"
                    rows={2}
                    className="resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Separate multiple emails with commas.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="contact-number"
                    className="text-sm font-medium text-foreground"
                  >
                    Contact Number
                  </label>
                  <input
                    id="contact-number"
                    type="tel"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="+27 ..."
                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/10 p-3">
              <label className="flex items-start gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={disclaimerAccepted}
                  onChange={(e) => setDisclaimerAccepted(e.target.checked)}
                  className="mt-0.5"
                  required
                />
                <span>
                  I acknowledge the Disclaimer and accept the terms.
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={popiaAccepted}
                  onChange={(e) => setPopiaAccepted(e.target.checked)}
                  className="mt-0.5"
                  required
                />
                <span>
                  I consent to the POPIA Act requirements for data processing.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="h-10 rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? "Creating account..." : "Sign up"}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
