import UploadForm from '@/components/UploadForm';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-slate-900 flex flex-col items-center justify-center">
      <div className="w-full max-w-xl px-4">
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight mb-3">
            Verify references
          </h1>
          <p className="text-sm sm:text-base text-slate-500">
            Upload a PDF and check its reference list in seconds.
          </p>
        </div>

        {/* Card with upload + button */}
        <div className="border border-slate-200 rounded-2xl shadow-sm px-4 sm:px-6 py-6 sm:py-8">
          <UploadForm />
        </div>

        {/* Tiny footer note */}
        <p className="mt-6 text-center text-xs text-slate-400">
          No signup. Just upload a document and verify its references.
        </p>
      </div>
    </main>
  );
}
