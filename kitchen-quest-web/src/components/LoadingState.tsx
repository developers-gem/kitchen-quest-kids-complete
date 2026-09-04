interface LoadingStateProps {
  label?: string;
}

/** Consistent loading placeholder used everywhere a query is pending.
 * `role="status"` + `aria-live="polite"` so screen readers announce it
 * once rather than spamming on every re-render. Uses a static pulse, not
 * a spinning animation, so it respects reduced-motion by default (the
 * global CSS rule collapses the pulse duration too, but a pulse reads
 * fine even fully static). */
export function LoadingState({ label = "Loading..." }: LoadingStateProps) {
  return (
    <div role="status" aria-live="polite" className="animate-pulse space-y-4 py-6">
      <span className="sr-only">{label}</span>
      <div className="h-24 rounded-3xl bg-foreground/5" />
      <div className="h-24 rounded-3xl bg-foreground/5" />
    </div>
  );
}
