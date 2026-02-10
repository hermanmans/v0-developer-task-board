"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useAuth } from "@/lib/auth-provider";
import { toast } from "sonner";
import { Save, ShieldCheck, Users, Building2, KeyRound, Trash2, Plus } from "lucide-react";

type ProfileResponse = {
  profile: {
    user_id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    company: string | null;
    company_logo_url: string | null;
    invite_emails: string[] | null;
    contact_number: string | null;
    disclaimer_accepted: boolean | null;
    popia_accepted: boolean | null;
    has_github_token?: boolean;
  } | null;
};

export function ProfileSection() {
  const { authFetch, user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [githubToken, setGithubToken] = useState("");
  const [isProjectSaving, setIsProjectSaving] = useState(false);
  const [projectOwner, setProjectOwner] = useState("");
  const [projectRepo, setProjectRepo] = useState("");
  const [projectLabel, setProjectLabel] = useState("");
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    company: "",
    company_logo_url: "",
    invite_emails: "",
    contact_number: "",
    disclaimer_accepted: false,
    popia_accepted: false,
  });

  const fetcher = async (url: string): Promise<ProfileResponse> => {
    const res = await authFetch(url);
    if (!res.ok) throw new Error("Failed to load profile");
    return res.json();
  };

  const { data, error, mutate, isLoading } = useSWR<ProfileResponse>(
    "/api/profile",
    fetcher
  );

  const projectsFetcher = async (url: string) => {
    const res = await authFetch(url);
    if (!res.ok) throw new Error("Failed to load GitHub projects");
    return res.json();
  };
  const {
    data: projectsData,
    mutate: mutateProjects,
  } = useSWR("/api/github/projects", projectsFetcher);

  const hasGithubToken = useMemo(
    () => Boolean(data?.profile?.has_github_token),
    [data]
  );

  useEffect(() => {
    const profile = data?.profile;
    if (!profile) return;
    setForm({
      first_name: profile.first_name ?? "",
      last_name: profile.last_name ?? "",
      company: profile.company ?? "",
      company_logo_url: profile.company_logo_url ?? "",
      invite_emails: (profile.invite_emails ?? []).join(", "),
      contact_number: profile.contact_number ?? "",
      disclaimer_accepted: Boolean(profile.disclaimer_accepted),
      popia_accepted: Boolean(profile.popia_accepted),
    });
  }, [data]);

  const handleSave = async () => {
    if (!form.disclaimer_accepted || !form.popia_accepted) {
      toast.error("Please accept Disclaimer and POPIA consent.");
      return;
    }

    setIsSaving(true);
    try {
      const inviteList = form.invite_emails
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      const payload: Record<string, unknown> = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        company: form.company.trim(),
        company_logo_url: form.company_logo_url.trim(),
        invite_emails: inviteList,
        contact_number: form.contact_number.trim(),
        disclaimer_accepted: form.disclaimer_accepted,
        popia_accepted: form.popia_accepted,
      };
      if (githubToken.trim().length > 0) {
        payload.githubToken = githubToken;
      }

      const res = await authFetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to update profile");
      setGithubToken("");
      toast.success("Profile updated");
      mutate();
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddProject = async () => {
    if (!projectOwner.trim() || !projectRepo.trim()) {
      toast.error("Owner and repo are required.");
      return;
    }
    setIsProjectSaving(true);
    try {
      const res = await authFetch("/api/github/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: projectOwner.trim(),
          repo: projectRepo.trim(),
          display_name: projectLabel.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to add project");
      setProjectOwner("");
      setProjectRepo("");
      setProjectLabel("");
      mutateProjects();
      toast.success("Project added");
    } catch {
      toast.error("Failed to add project");
    } finally {
      setIsProjectSaving(false);
    }
  };

  const handleRemoveProject = async (id: string) => {
    try {
      const res = await authFetch("/api/github/projects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to remove project");
      mutateProjects();
      toast.success("Project removed");
    } catch {
      toast.error("Failed to remove project");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-sm text-destructive">Failed to load profile.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Profile Settings
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage your personal details, company info, and integrations.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save changes"}
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Users className="h-4 w-4 text-muted-foreground" />
          Personal Info
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Name</label>
            <input
              value={form.first_name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, first_name: e.target.value }))
              }
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">
              Surname
            </label>
            <input
              value={form.last_name}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, last_name: e.target.value }))
              }
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Email</label>
            <input
              value={user?.email ?? data?.profile?.email ?? ""}
              disabled
              className="h-10 rounded-lg border border-input bg-muted/40 px-3 text-sm text-muted-foreground"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">
              Contact Number
            </label>
            <input
              value={form.contact_number}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  contact_number: e.target.value,
                }))
              }
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          Company
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Company</label>
            <input
              value={form.company}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, company: e.target.value }))
              }
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">
              Company Logo URL
            </label>
            <input
              value={form.company_logo_url}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  company_logo_url: e.target.value,
                }))
              }
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          GitHub Connection
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">
              GitHub Token
            </label>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder={hasGithubToken ? "Token saved" : "ghp_..."}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-[11px] text-muted-foreground">
              Token is sent only when you enter one. Stored encrypted.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">
              Invite Team Members
            </label>
            <textarea
              value={form.invite_emails}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, invite_emails: e.target.value }))
              }
              rows={2}
              placeholder="name@company.com, teammate@company.com"
              className="resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-[11px] text-muted-foreground">
              Separate multiple emails with commas.
            </p>
          </div>
        </div>
        <div className="mt-4 border-t border-border pt-4">
          <div className="mb-3 text-sm font-semibold text-foreground">
            GitHub Projects
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              value={projectOwner}
              onChange={(e) => setProjectOwner(e.target.value)}
              placeholder="owner"
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              value={projectRepo}
              onChange={(e) => setProjectRepo(e.target.value)}
              placeholder="repo"
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              value={projectLabel}
              onChange={(e) => setProjectLabel(e.target.value)}
              placeholder="label (optional)"
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="mt-3">
            <button
              onClick={handleAddProject}
              disabled={isProjectSaving}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-secondary px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {isProjectSaving ? "Adding..." : "Add Project"}
            </button>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            {(projectsData?.projects ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">
                No projects saved yet.
              </p>
            )}
            {(projectsData?.projects ?? []).map((project: any) => (
              <div
                key={project.id}
                className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">
                    {project.display_name || `${project.owner}/${project.repo}`}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {project.owner}/{project.repo}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveProject(project.id)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
                  aria-label="Remove project"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          Compliance
        </div>
        <div className="flex flex-col gap-3">
          <label className="flex items-start gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.disclaimer_accepted}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  disclaimer_accepted: e.target.checked,
                }))
              }
              className="mt-0.5"
            />
            <span>I acknowledge the Disclaimer and accept the terms.</span>
          </label>
          <label className="flex items-start gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.popia_accepted}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  popia_accepted: e.target.checked,
                }))
              }
              className="mt-0.5"
            />
            <span>
              I consent to the POPIA Act requirements for data processing.
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
