export default function SignupDisabledPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mb-6 text-6xl">🚧</div>
        <h1 className="text-3xl font-semibold tracking-tight mb-4">
          We&apos;re currently building
        </h1>
        <p className="text-zinc-400 mb-8">
          Thank you for your interest in ReferenceAudit. We&apos;re working hard to bring you the best reference verification experience. Sign-ups will be available soon.
        </p>
        <a
          href="/"
          className="inline-block rounded-full bg-indigo-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400"
        >
          Back to home
        </a>
      </div>
    </main>
  );
}
