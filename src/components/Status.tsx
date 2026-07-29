export function LoadingState({ label = "Loading AquaPulse data..." }: { label?: string }) {
  return <div className="glass-card p-6 text-sm text-[#5B6B85]">{label}</div>;
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-red-200/70 bg-red-50/90 p-5 text-sm text-red-700">
      {message}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-[#BFD7EC] bg-white/80 p-8 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-[#5B6B85]">{body}</p>
    </div>
  );
}
