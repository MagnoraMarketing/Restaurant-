import Link from "next/link";

export function Logo({ href = "/", sub = true }: { href?: string; sub?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="AIbooking Restaurant – forside">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-ember-400 to-ember-600 shadow-lg shadow-ember-600/30">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 18 12 5l6 13M8.3 13.5h7.4" />
        </svg>
      </span>
      <span className="leading-none">
        <span className="block text-[15px] font-bold tracking-tight">
          AIbooking <span className="text-ember-400">Restaurant</span>
        </span>
        {sub && <span className="mt-0.5 block text-[10.5px] font-medium tracking-wide text-ink-400">AI-receptionist til restauranter</span>}
      </span>
    </Link>
  );
}
