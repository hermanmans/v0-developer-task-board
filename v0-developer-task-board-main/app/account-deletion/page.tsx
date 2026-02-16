export default function AccountDeletionPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-foreground">
      <h1 className="text-2xl font-semibold">Account Deletion Method</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Last updated: February 16, 2026
      </p>

      <section className="mt-8 space-y-3 text-sm leading-6">
        <h2 className="text-lg font-semibold">How to Request Deletion</h2>
        <p>
          You can now delete your account directly in the app from Profile &gt; Danger Zone by
          typing <strong>DELETE</strong> and confirming the action.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-6">
        <h2 className="text-lg font-semibold">What Is Deleted</h2>
        <p>
          Your account profile and associated application data are removed or anonymized according
          to operational and legal retention requirements.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-6">
        <h2 className="text-lg font-semibold">Retention</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Immediate deletion target: profile, tasks, reports, comments, and linked projects.</li>
          <li>Security logs: retained for up to 12 months where required for abuse prevention.</li>
          <li>Support/audit records: retained for up to 24 months where legally required.</li>
        </ul>
      </section>
    </main>
  );
}
