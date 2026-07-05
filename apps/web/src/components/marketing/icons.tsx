type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Chat({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12Z" />
      <path d="M8.5 10.5h7M8.5 14h4" />
    </svg>
  );
}
function Frame({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4" />
    </svg>
  );
}
function Timeline({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <rect x="3" y="6" width="9" height="4" rx="1" />
      <rect x="8" y="14" width="11" height="4" rx="1" />
      <path d="M3 3v18" />
    </svg>
  );
}
function Export({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
    </svg>
  );
}
function Type({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M4 7V5h16v2M9 19h6M12 5v14" />
    </svg>
  );
}
function Mic({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}
function Palette({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M12 3a9 9 0 1 0 0 18c1 0 1.6-.8 1.6-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.1 0-.9.8-1.6 1.7-1.6H16a5 5 0 0 0 5-5c0-3.9-4-7.4-9-7.4Z" />
      <circle cx="7.5" cy="10.5" r="1" />
      <circle cx="12" cy="7.5" r="1" />
      <circle cx="16.5" cy="10.5" r="1" />
    </svg>
  );
}
function Sparkles({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.4 2.4M15.3 15.3l2.4 2.4M17.7 6.3l-2.4 2.4M8.7 15.3l-2.4 2.4" />
    </svg>
  );
}
function Wrench({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M15 6a4 4 0 0 0-5.3 5.3L4 17v3h3l5.7-5.7A4 4 0 0 0 18 9l-2 2-3-3 2-2Z" />
    </svg>
  );
}
function Rocket({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.9 12.9 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    </svg>
  );
}
function ProductHunt({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M10.3 16.5V7.5h3.2a2.75 2.75 0 0 1 0 5.5H10.3" />
    </svg>
  );
}
function Stars({ className }: IconProps) {
  return (
    <svg className={className} {...base}>
      <path d="M13 3l1.9 4.3 4.6.5-3.4 3.1.9 4.6L13 13.4 8.9 15.5l.9-4.6L6.4 7.8l4.6-.5z" />
      <path d="M6.5 15.5l.7 1.7 1.8.2-1.4 1.2.4 1.8-1.5-.9-1.5.9.4-1.8-1.4-1.2 1.8-.2z" />
    </svg>
  );
}

export const ICONS = {
  chat: Chat,
  frame: Frame,
  timeline: Timeline,
  export: Export,
  type: Type,
  mic: Mic,
  palette: Palette,
  sparkles: Sparkles,
  wrench: Wrench,
  rocket: Rocket,
  producthunt: ProductHunt,
  stars: Stars,
} as const;

export type IconKey = keyof typeof ICONS;

export function FeatureIcon({
  name,
  className,
}: {
  name: IconKey;
  className?: string;
}) {
  const Cmp = ICONS[name];
  return <Cmp className={className} />;
}

/** A FeatureIcon in a rounded tile tinted with `color`: the icon in full color,
 *  a semi-transparent fill of the same color, and a matching border. Pass layout
 *  (size, rounding) via `className`; `iconClassName` sizes the glyph. */
export function ColorIcon({
  name,
  color,
  className,
  iconClassName,
}: {
  name: IconKey;
  color: string;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span
      className={className}
      style={{ color, backgroundColor: `${color}1f`, borderColor: `${color}59` }}
    >
      <FeatureIcon name={name} className={iconClassName} />
    </span>
  );
}
