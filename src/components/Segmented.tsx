interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}

export function Segmented<T extends string>({ label, value, options, onChange, size = 'md' }: SegmentedProps<T>) {
  return (
    <div className={`segmented segmented--${size}`} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="segmented__item"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          <span className="segmented__label">{option.label}</span>
          {option.count !== undefined && <span className="segmented__count">{option.count}</span>}
        </button>
      ))}
    </div>
  );
}
