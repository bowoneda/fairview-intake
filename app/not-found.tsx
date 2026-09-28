// Platform neutral: no tenant colors (there is no tenant) and never a list of operators.
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-[40rem] flex-1 flex-col justify-center gap-3 px-4 py-6 sm:px-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">We could not find that page</h1>
      <p>Check the link you were given by your property manager.</p>
    </main>
  );
}
