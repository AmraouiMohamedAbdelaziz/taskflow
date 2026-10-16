import { CheckCheck, Layers3 } from 'lucide-react';
export function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-5">
          <span className="rounded-xl bg-indigo-600 p-2 text-white"><CheckCheck aria-hidden="true" size={22} /></span>
          <span className="text-xl font-semibold tracking-tight">TaskFlow</span>
          <span className="ml-auto rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">Foundation preview</span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-indigo-600">Checkpoint 01 / 04</p>
        <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">A clear space for what comes next.</h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">TaskFlow’s foundation is ready. Task management arrives in the next checkpoints.</p>
        <section aria-labelledby="foundation-title" className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <Layers3 aria-hidden="true" className="mb-4 text-indigo-600" size={28} />
          <h2 id="foundation-title" className="text-lg font-semibold">Built to grow, one checkpoint at a time</h2>
          <p className="mt-2 max-w-2xl leading-relaxed text-slate-600">React and TypeScript on the frontend. Express on the backend. Separate workspaces, shared quality standards.</p>
        </section>
      </main>
    </div>
  );
}
