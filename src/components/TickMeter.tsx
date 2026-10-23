interface TickMeterProps {
  value: number;
  total: number;
  /** More units than this are scaled down to `max` bars */
  max?: number;
  tone?: 'default' | 'accent' | 'danger';
}

/** Row of thin bars, e.g. ||||||░░ for 6 of 8 */
export function TickMeter({ value, total, max = 10, tone = 'default' }: TickMeterProps) {
  const bars = Math.max(1, Math.min(total, max));
  const filled = total > 0 ? Math.round((Math.min(value, total) / total) * bars) : 0;
  return (
    <span className={`ticks ticks--${tone}`} aria-hidden="true">
      {Array.from({ length: bars }, (_, index) => (
        <i key={index} className={index < filled ? 'on' : undefined} />
      ))}
    </span>
  );
}
