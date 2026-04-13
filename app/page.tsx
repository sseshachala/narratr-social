import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Narratr Social</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">Connect social accounts, publish media-rich posts, and review recent activity.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            The app now separates connected-account setup from the posts workspace, so teams can move from OAuth to review to publishing without getting stuck in the integrations screen.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/integrations" className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800">
              Open Integrations
            </Link>
            <Link href="/posts" className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              Open Posts
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">What changed</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <li>Separate <strong className="text-slate-900">Posts</strong> and <strong className="text-slate-900">Create Post</strong> pages.</li>
            <li>Recent X posts for the last 7 or 30 days.</li>
            <li>Post composer with optional image or video upload.</li>
            <li>Shared workspace navigation for faster movement between flows.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
