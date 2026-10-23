const circle = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0`;

const paths = {
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  trash: 'M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13',
  play: 'M8 5.5v13l10.5-6.5z',
  pause: 'M9 5.5v13M15 5.5v13',
  reset: 'M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4',
  skip: 'M6 6l8 6-8 6zM18 6v12',
  target: `${circle(12, 12, 9)}${circle(12, 12, 5)}M12 12h.01`,
  scan: 'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M12 12h.01',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  chevronLeft: 'M15 6l-6 6 6 6',
  chevronDown: 'M6 9l6 6 6-6',
  chevronUp: 'M6 15l6-6 6 6',
  sun: `${circle(12, 12, 4)}M12 2.5v2M12 19.5v2M4.6 4.6L6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4`,
  later: `${circle(12, 12, 9)}M12 7v5l3 2`,
  pencil: 'M16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1 1-4z',
  pin: 'M9 4h6l-1 5 3 3v2H7v-2l3-3zM12 14v6',
  note: 'M6 3.5h9l4 4v13H6zM14.5 3.5V8H19M9 12h6M9 16h4',
  bookmark: 'M7 4h10v16l-5-3.5L7 20z',
  list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  timer: `${circle(12, 13, 8)}M12 9v4l2.5 1.5M9.5 2.5h5`,
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  upload: 'M12 15V4M7 9l5-5 5 5M5 20h14',
  search: `${circle(11, 11, 7)}M20 20l-4-4`,
  signal: 'M6 18v-3M10 18v-6M14 18v-9M18 18V6',
  sparkle: 'M12 3l2.1 6.9L21 12l-6.9 2.1L12 21l-2.1-6.9L3 12l6.9-2.1z',
  palette: `${circle(12, 12, 9)}M8 10.5h.01M12 7.5h.01M16 10.5h.01M12 21c-1.5-1.5-1.5-3.5 0-4.5s4 0 6-1`,
} as const;

export type IconName = keyof typeof paths;

interface IconProps {
  name: IconName;
  size?: number;
  filled?: boolean;
  className?: string;
}

export function Icon({ name, size = 18, filled, className }: IconProps) {
  return (
    <svg
      className={`ic${filled ? ' ic--fill' : ''}${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
