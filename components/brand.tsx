/** The AutoPro mark: a car roofline on the amber tile, with the two-tone wordmark */
export function BrandMark({ withName = true }: { withName?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-accent" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a1300" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 16l1.6-5.2A2 2 0 0 1 8.5 9.4h7a2 2 0 0 1 1.9 1.4L19 16" />
          <path d="M4 16h16v3H4z" />
        </svg>
      </span>
      {withName && (
        <span className="font-display text-[22px] font-bold">
          Auto<span className="text-accent">Pro</span>
        </span>
      )}
    </span>
  );
}
