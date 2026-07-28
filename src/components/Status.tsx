export function LoadingState({ label = "Loading AquaPulse data..." }: { label?: string }) {
  return <div className="glass-card p-6 text-sm text-white/75">{label}</div>;
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-red-200/25 bg-red-950/40 p-5 text-sm text-red-50">
      {message}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 p-8 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-white/60">{body}</p>
    </div>
  );
}
