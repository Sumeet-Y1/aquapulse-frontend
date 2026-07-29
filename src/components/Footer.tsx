export function Footer({ className = "" }: { className?: string }) {
  return (
    <footer className={`page-footer ${className}`}>
      <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-5 text-center text-xs text-[#5B6B85] sm:flex-row sm:items-center sm:justify-between sm:text-left md:px-8">
        <p className="font-semibold text-[#22314A]">© 2026 AquaPulse.</p>
        <p>Built for R-2026 S.Y B.Tech Information Technology.</p>
      </div>
    </footer>
  );
}
