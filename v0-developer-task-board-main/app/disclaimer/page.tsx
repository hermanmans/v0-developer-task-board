export default function DisclaimerPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-foreground">
      <h1 className="text-2xl font-semibold">Disclaimer</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Last updated: February 16, 2026
      </p>

      <section className="mt-8 space-y-3 text-sm leading-6">
        <h2 className="text-lg font-semibold">Service Use</h2>
        <p>
          The service is provided on an as-available basis for task tracking and team collaboration.
          We aim for reliability but do not guarantee uninterrupted or error-free operation.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-6">
        <h2 className="text-lg font-semibold">User Responsibility</h2>
        <p>
          Users are responsible for safeguarding credentials, ensuring lawful data entry, and
          reviewing workflow outputs before operational use.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-6">
        <h2 className="text-lg font-semibold">Third-Party Services</h2>
        <p>
          Integrations (for example GitHub) depend on third-party platforms and terms. Availability,
          data handling, and performance of those services are outside this application’s direct
          control.
        </p>
      </section>

      <section className="mt-8 space-y-3 text-sm leading-6">
        <h2 className="text-lg font-semibold">Limitation of Liability</h2>
        <p>
          To the extent permitted by law, liability is limited for indirect, incidental, or
          consequential losses resulting from service use or service interruption.
        </p>
      </section>
    </main>
  );
}
