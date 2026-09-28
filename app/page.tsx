// Platform root. Deliberately neutral: it never lists operators, so tenants cannot be enumerated here.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-3 p-6">
      <h1 className="text-2xl font-semibold">Applicant intake</h1>
      <p className="text-muted">
        Open the link your property manager gave you to start or continue an application.
      </p>
    </main>
  );
}
