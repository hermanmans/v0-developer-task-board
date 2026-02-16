export default function PopiaPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-foreground">
      <h1 className="text-2xl font-semibold">POPIA Notice</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Last updated: February 16, 2026
      </p>

      <section className="mt-8 space-y-3 text-sm leading-6">
        <h2 className="text-lg font-semibold">Purpose of Processing</h2>
        <p>
          Personal information is processed only for legitimate product operations, including
          account management, collaboration, support, and security.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-6">
        <h2 className="text-lg font-semibold">POPIA Principles</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Accountability: responsible parties are assigned for personal data handling.</li>
          <li>Processing Limitation: only necessary data is processed.</li>
          <li>Purpose Specification: data use is tied to explicit product purposes.</li>
          <li>Further Processing Limitation: secondary use is controlled.</li>
          <li>Information Quality: reasonable steps are taken to keep data accurate.</li>
          <li>Openness: this notice explains processing and retention practices.</li>
          <li>Security Safeguards: access controls and encryption are used where appropriate.</li>
          <li>Data Subject Participation: users can request corrections and deletion.</li>
        </ul>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-6">
        <h2 className="text-lg font-semibold">Retention and Deletion</h2>
        <p>
          Data retention follows operational and legal needs. Users can initiate deletion through
          the in-app account deletion method.
        </p>
      </section>
    </main>
  );
}
