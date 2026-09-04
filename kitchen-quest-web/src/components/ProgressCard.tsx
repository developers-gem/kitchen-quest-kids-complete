interface ProgressCardProps {
  label: string;
  value: string | number;
  accentClassName?: string;
}

export function ProgressCard({ label, value, accentClassName = "bg-primary" }: ProgressCardProps) {
  return (
    <div className="rounded-3xl bg-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40">{label}</p>
      <p className="mt-2 text-3xl font-black text-foreground">{value}</p>
      <div className={`mt-3 h-1.5 w-10 rounded-full ${accentClassName}`} aria-hidden="true" />
    </div>
  );
}
